import { config } from "../config.js";
import type { SeatRecord } from "../game/types.js";
import { planBlocVote } from "./blocVote.js";
import { computeCadence, makeRng, type Rng } from "./cadence.js";
import type { LlmClient, TranscriptLine } from "./llm.js";
import { type Persona, personaByKey } from "./persona.js";

/**
 * AgentRunner — schedules AI chat turns into the discussion timeline and casts
 * the AI bloc's votes during the vote window.
 *
 * Realism (HARD invariant §6): for each AI turn it GENERATES the message text
 * FIRST (LLM latency absorbed), then waits a think-delay, shows typing, waits a
 * length-proportional typing duration, then posts — so Claude latency never
 * leaks as a tell.
 *
 * The runner is decoupled from the Game via the GameBridge interface and a
 * `scheduler` (real setTimeout in prod; a synchronous fake in tests). Votes go
 * through the SAME castVote path humans use (bridge.castVote), preserving
 * secret-ballot handling and the one-vote-per-round lock.
 */

export interface RosterView {
  seatId: string;
  codename: string;
  isAI: boolean;
  alive: boolean;
}

/** What the runner needs from the owning Game. Implemented by Game.ts. */
export interface GameBridge {
  /** Current living roster (codename + isAI for the runner's own use). */
  roster(): RosterView[];
  /** Append an AI chat message (goes through moderation + broadcast). */
  postAiMessage(seatId: string, text: string): void;
  /** Toggle a seat's typing indicator (broadcast). */
  setTyping(seatId: string, isTyping: boolean): void;
  /** Cast a vote for an AI seat (same path as humans). */
  castVote(seatId: string, targetSeatId: string, round: number): void;
  /** The growing transcript as TranscriptLines (system prompt + chat). */
  transcript(): TranscriptLine[];
  /** Stable cached system prefix for a given AI seat (rules+persona+teammates).*/
  systemPrefixFor(seatId: string): string;
  /** Whether the discussion phase for `round` is still open. */
  isDiscussionOpen(round: number): boolean;
}

/** Pluggable timer so tests can run deterministically without wall-clock. */
export interface Scheduler {
  /** Schedule `fn` after `ms`. Returns a cancel handle. */
  setTimeout(fn: () => void, ms: number): { cancel(): void };
  /** Sleep helper for async flows. */
  sleep(ms: number): Promise<void>;
}

/** Real scheduler backed by Node timers. */
export class RealScheduler implements Scheduler {
  setTimeout(fn: () => void, ms: number): { cancel(): void } {
    const h = setTimeout(fn, ms);
    return { cancel: () => clearTimeout(h) };
  }
  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

/**
 * ManualScheduler — a virtual-clock scheduler for the headless sim/test. Timers
 * and sleeps are queued against a virtual `now` and only fire when the test
 * advances the clock. This preserves RELATIVE ordering (e.g. a vote scheduled
 * at +1s fires before a resolve scheduled at +VOTE_MS) without real wall-clock
 * time and without the tight-loop OOM that a zero-delay microtask scheduler
 * causes. The owning code is unaware it's virtual.
 */
interface ScheduledItem {
  at: number;
  seq: number;
  fn: () => void;
  cancelled: boolean;
}

export class ManualScheduler implements Scheduler {
  private now = 0;
  private seqCounter = 0;
  private queue: ScheduledItem[] = [];

  setTimeout(fn: () => void, ms: number): { cancel(): void } {
    const item: ScheduledItem = {
      at: this.now + Math.max(0, ms),
      seq: this.seqCounter++,
      fn,
      cancelled: false,
    };
    this.queue.push(item);
    return {
      cancel: () => {
        item.cancelled = true;
      },
    };
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.setTimeout(() => resolve(), ms);
    });
  }

  /** Are there any live timers left? */
  hasPending(): boolean {
    return this.queue.some((i) => !i.cancelled);
  }

  /**
   * Advance the virtual clock, firing all due timers in (time, insertion)
   * order. After firing each batch we yield to the real microtask queue so any
   * awaited continuations run before processing the next due item. Bounded by
   * `maxSteps` to fail loudly on a runaway loop instead of OOMing.
   */
  async advanceAll(maxSteps = 5000): Promise<void> {
    let steps = 0;
    while (this.hasPending()) {
      if (steps++ > maxSteps) {
        throw new Error("ManualScheduler.advanceAll exceeded maxSteps (loop?)");
      }
      // Find the earliest live item.
      let next: ScheduledItem | null = null;
      for (const i of this.queue) {
        if (i.cancelled) continue;
        if (!next || i.at < next.at || (i.at === next.at && i.seq < next.seq)) {
          next = i;
        }
      }
      if (!next) break;
      this.now = Math.max(this.now, next.at);
      next.cancelled = true; // consume
      next.fn();
      // Let awaited continuations (sleeps resolving) flush before the next item.
      await Promise.resolve();
      await Promise.resolve();
    }
  }
}

export class AgentRunner {
  private rng: Rng;

  constructor(
    private bridge: GameBridge,
    private llm: LlmClient,
    private scheduler: Scheduler = new RealScheduler(),
    seed = 1,
  ) {
    this.rng = makeRng(seed);
  }

  private personaFor(seat: SeatRecord | RosterView): Persona | undefined {
    const key = (seat as Partial<SeatRecord>).personaKey;
    return key ? personaByKey(key) : undefined;
  }

  /**
   * Run one AI seat's discussion turn for `round`: generate FIRST, then think,
   * type, post. Aborts silently if the discussion closed or the seat died.
   */
  async runChatTurn(
    seatId: string,
    codename: string,
    personaKey: string | null,
    round: number,
  ): Promise<void> {
    if (!this.bridge.isDiscussionOpen(round)) return;

    // 1. GENERATE FIRST — absorbs Claude latency before we show typing.
    const persona = personaKey ? personaByKey(personaKey) : undefined;
    const { text } = await this.llm.generateMessage({
      systemPrefix: this.bridge.systemPrefixFor(seatId),
      transcript: this.bridge.transcript(),
      selfCodename: codename,
      maxChars: config.MSG_MAX_LEN,
    });
    if (!text) return;

    // 2. Compute think + typing cadence.
    const cad = computeCadence(text.length, persona?.wpm ?? 60, this.rng);

    // 3. Think delay, then show typing.
    await this.scheduler.sleep(cad.thinkMs);
    if (!this.bridge.isDiscussionOpen(round)) return;
    this.bridge.setTyping(seatId, true);

    // 4. Length-proportional typing duration.
    await this.scheduler.sleep(cad.typingMs);

    // 5. Post + clear typing (if still open + alive).
    this.bridge.setTyping(seatId, false);
    if (!this.bridge.isDiscussionOpen(round)) return;
    const stillAlive = this.bridge
      .roster()
      .some((r) => r.seatId === seatId && r.alive);
    if (!stillAlive) return;
    this.bridge.postAiMessage(seatId, text);
  }

  /**
   * GUEST DEMO voting: each living AI casts ONE INDEPENDENT vote (no bloc, no
   * collusion). Each AI asks the LLM for its own read over all OTHER living
   * seats (humans AND other AI are fair game — there are no teammates in the
   * demo). Casts go through the same castVote path humans use and are staggered
   * within the vote window. Falls back to a deterministic pick if the LLM's
   * choice doesn't map to an eligible seat.
   */
  async runIndependentVotes(round: number): Promise<void> {
    const roster = this.bridge.roster();
    const aiSeats = roster.filter((r) => r.isAI && r.alive);
    if (aiSeats.length === 0) return;

    let i = 0;
    for (const ai of aiSeats) {
      const others = roster.filter((r) => r.alive && r.seatId !== ai.seatId);
      if (others.length === 0) continue;
      const eligibleCodenames = others.map((r) => r.codename);
      let targetSeatId: string | null = null;
      try {
        const vote = await this.llm.chooseVote({
          systemPrefix: this.bridge.systemPrefixFor(ai.seatId),
          transcript: this.bridge.transcript(),
          selfCodename: ai.codename,
          eligibleTargets: eligibleCodenames,
        });
        const match = others.find((r) => r.codename === vote.targetCodename);
        targetSeatId = match?.seatId ?? null;
      } catch {
        targetSeatId = null;
      }
      // Fallback: deterministic eligible pick so every AI always casts a vote.
      if (!targetSeatId) {
        const sorted = [...others].sort((a, b) => a.seatId.localeCompare(b.seatId));
        targetSeatId = sorted[0]!.seatId;
      }
      const delay = Math.round(this.rng.next() * 1500) + i * 200;
      await this.scheduler.sleep(delay);
      this.bridge.castVote(ai.seatId, targetSeatId, round);
      i++;
    }
  }

  /**
   * Cast the AI bloc's votes for `round` via the same path humans use. The bloc
   * sees each other's intended votes and piles onto one human (BLOC_COHESION).
   * Casts are staggered slightly so they don't all land on the same tick.
   */
  async runBlocVote(round: number): Promise<void> {
    const roster = this.bridge.roster();
    const aiSeats = roster.filter((r) => r.isAI && r.alive).map((r) => r.seatId);
    const humanTargets = roster
      .filter((r) => !r.isAI && r.alive)
      .map((r) => r.seatId);
    if (aiSeats.length === 0 || humanTargets.length === 0) return;

    // Ask one AI for the bloc's preferred (most-suspicious) human, mapping
    // codenames → seatIds. Falls back to deterministic first if it can't map.
    let preferred: string | null = null;
    const leadAi = roster.find((r) => r.seatId === aiSeats[0]);
    if (leadAi) {
      const targetCodenames = roster
        .filter((r) => !r.isAI && r.alive)
        .map((r) => r.codename);
      const vote = await this.llm.chooseVote({
        systemPrefix: this.bridge.systemPrefixFor(leadAi.seatId),
        transcript: this.bridge.transcript(),
        selfCodename: leadAi.codename,
        eligibleTargets: targetCodenames,
      });
      const match = roster.find(
        (r) => !r.isAI && r.alive && r.codename === vote.targetCodename,
      );
      preferred = match?.seatId ?? null;
    }

    const plan = planBlocVote(aiSeats, humanTargets, preferred, this.rng);

    // Stagger casts a touch (still all within the vote window).
    let i = 0;
    for (const [ai, target] of plan.assignments) {
      const delay = Math.round(this.rng.next() * 1500) + i * 200;
      await this.scheduler.sleep(delay);
      this.bridge.castVote(ai, target, round);
      i++;
    }
  }
}
