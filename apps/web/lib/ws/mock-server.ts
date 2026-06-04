/**
 * Mock WebSocket game server — scripts the "Agents Among Us" demo flow so every
 * screen is demoable with no real server. It implements the same `GameSocket`
 * interface as the live transport, emits only validated `ServerEvent`s, and
 * honors the protocol's anti-leak shape (no agent identities until settlement).
 *
 * Demo flow (matches the live server's demo mode — NO wallet, NO chain, NO MON):
 *   - client sends `request_join {address:"guest"}`
 *   - server seats immediately → `lobby_open` → brief fill → `game_started`
 *   - ONE 90s round: round_started (prompt) → discussion (chat + typing) →
 *     vote_open → round_resolved
 *   - terminal `settlement` reveal: who-was-who (HUMAN/AGENT), NO money fields
 *     rendered (the reveal screen ignores pool/payout entirely).
 *
 * 10 seats (codenames/colors from PLAYERS), viewer = seat p1 ("VIOLET HERON").
 * The two agents are SLATE OWL (p6) + ASH VOLE (p10), revealed only at the end.
 */
import type {
  PublicSeat,
  ServerEvent,
  SettlementReveal,
} from "@ai-impostor/shared";
import { PLAYERS } from "@/components/primitives";
import {
  Emitter,
  type ConnectionHandler,
  type GameSocket,
  type ServerEventHandler,
} from "./game-socket";

const GAME_ID = "4471";
const MY_SEAT = "p1";
const MOCK_MIN_HUMANS = 6;

// Demo timings (ms). The discussion phase is the headline 90s round.
const LOBBY_FILL_MS = 1_200;
const PROMPT_MS = 4_000;
const DISCUSSION_MS = 90_000;
const VOTE_MS = 12_000;
const RESOLVE_MS = 3_500;

// The seat the table votes out in the single round (the room reads it well).
const ELIMINATED_SEAT = "p10"; // ASH VOLE (agent)
// Final truth — revealed ONLY in the settlement payload.
const AI_SEATS = ["p6", "p10"]; // SLATE OWL, ASH VOLE

const roster: PublicSeat[] = PLAYERS.map((p) => ({
  seatId: p.id,
  codename: p.name,
  avatarColor: p.c,
  alive: true,
}));

type ScriptedMessage = { seat: string; text: string; typingMs: number };

// One round's worth of chat — typing indicators on for realism. Spread across
// the 90s discussion window by the scheduler below.
const PROMPT = "What's a hot take you'd defend to the death?";
const CHAT: ScriptedMessage[] = [
  { seat: "p2", text: "pineapple on pizza is correct and you all know it", typingMs: 1400 },
  { seat: "p8", text: "cereal before milk, every time. no exceptions", typingMs: 1300 },
  { seat: "p10", text: "objectively, breakfast foods are optimal at all hours.", typingMs: 900 },
  { seat: "p5", text: "ash you sound like a press release lol", typingMs: 1200 },
  { seat: "p3", text: "hot dogs are sandwiches. i will not be taking questions", typingMs: 1500 },
  { seat: "p6", text: "I would prefer not to weigh in on this matter.", typingMs: 800 },
  { seat: "p9", text: "slate dodging every single prompt is suspicious ngl", typingMs: 1300 },
  { seat: "p8", text: "...slate that is the most ai sentence ever written", typingMs: 1400 },
  { seat: "p2", text: "ok real talk one of these two types way too clean", typingMs: 1600 },
];

// Settlement reveal — who-was-who. The money fields below are required by the
// shared schema but are NEVER rendered in the demo reveal (no pot/payout/MON/tx).
function settlementReveal(): SettlementReveal {
  return {
    outcome: "HUMAN_WIN",
    roster: PLAYERS.map((p) => ({
      seatId: p.id,
      codename: p.name,
      avatarColor: p.c,
      wasAI: AI_SEATS.includes(p.id),
      survived: p.id !== ELIMINATED_SEAT,
    })),
    aiReveal: AI_SEATS,
    // Schema-required but unused by the reveal UI (zeroed, no economics):
    pool: { buyIn: "0", startPool: "0", houseTake: "0", finalPool: "0" },
    myPayout: null,
    txHash: null,
  };
}

/** A queued emission with its delay from the previous step. */
type Step = { delayMs: number; run: (emit: (ev: ServerEvent) => void) => void };

export class MockGameSocket implements GameSocket {
  private readonly emitter = new Emitter();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private seq = 0;
  private started = false;
  private hasVoted = false;
  private gameStarted = false;

  connect(): void {
    if (this.started) return;
    this.started = true;
    this.emitter.emitConnection(true);
  }

  disconnect(): void {
    this.started = false;
    this.gameStarted = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    this.emitter.emitConnection(false);
  }

  private next(): number {
    this.seq += 1;
    return this.seq;
  }

  private emit(ev: ServerEvent): void {
    this.emitter.emitEvent(ev);
  }

  /** Schedule the entire scripted demo as a chain of timed steps. */
  private runScript(): void {
    const steps: Step[] = [];

    // lobby_open (guest seated immediately) → brief fill animation.
    steps.push({
      delayMs: 150,
      run: (emit) =>
        emit({
          t: "lobby_open",
          seq: this.next(),
          gameId: GAME_ID,
          escrowAddress: "0x0000000000000000000000000000000000000000",
          buyInWei: "0",
          minHumans: MOCK_MIN_HUMANS,
          humansSeated: MOCK_MIN_HUMANS,
        }),
    });

    // game_started
    steps.push({
      delayMs: LOBBY_FILL_MS,
      run: (emit) =>
        emit({
          t: "game_started",
          seq: this.next(),
          gameId: GAME_ID,
          roster,
          mySeatId: MY_SEAT,
          viewerStatus: "alive",
          potHealthPct: 100,
        }),
    });

    // round_started → ROUND_PROMPT
    steps.push({
      delayMs: 400,
      run: (emit) =>
        emit({
          t: "round_started",
          seq: this.next(),
          round: 1,
          promptText: PROMPT,
          phaseEndsAt: Date.now() + PROMPT_MS,
        }),
    });

    // phase → ROUND_DISCUSSION (the 90s round)
    steps.push({
      delayMs: PROMPT_MS,
      run: (emit) =>
        emit({
          t: "phase_changed",
          seq: this.next(),
          round: 1,
          phase: "ROUND_DISCUSSION",
          phaseEndsAt: Date.now() + DISCUSSION_MS,
        }),
    });

    // discussion chat with typing indicators, spread across the window.
    const perMsg = Math.max(1, Math.floor((DISCUSSION_MS * 0.85) / (CHAT.length + 1)));
    CHAT.forEach((m) => {
      steps.push({
        delayMs: Math.max(400, perMsg - m.typingMs),
        run: (emit) =>
          emit({ t: "typing", seq: this.next(), seatId: m.seat, isTyping: true }),
      });
      steps.push({
        delayMs: m.typingMs,
        run: (emit) =>
          emit({
            t: "chat_message",
            seq: this.next(),
            msgId: `r1-${m.seat}-${this.seq}`,
            seatId: m.seat,
            text: m.text,
            ts: Date.now(),
          }),
      });
    });

    // phase → VOTE_WINDOW + vote_open (eligible = alive, not me)
    steps.push({
      delayMs: 800,
      run: (emit) => {
        const eligible = roster
          .filter((s) => s.alive && s.seatId !== MY_SEAT)
          .map((s) => s.seatId);
        this.hasVoted = false;
        emit({
          t: "vote_open",
          seq: this.next(),
          round: 1,
          phaseEndsAt: Date.now() + VOTE_MS,
          eligibleTargets: eligible,
        });
      },
    });

    // resolve → round_resolved (eliminate the voted seat, end the game)
    steps.push({
      delayMs: VOTE_MS,
      run: (emit) => {
        const seat = roster.find((s) => s.seatId === ELIMINATED_SEAT);
        if (seat) seat.alive = false;
        emit({
          t: "round_resolved",
          seq: this.next(),
          round: 1,
          eliminatedSeatIds: [ELIMINATED_SEAT],
          potHealthPct: 100,
          gameOver: true,
        });
      },
    });

    // settlement reveal (who-was-who)
    steps.push({
      delayMs: RESOLVE_MS,
      run: (emit) =>
        emit({
          t: "settlement",
          seq: this.next(),
          gameId: GAME_ID,
          payload: settlementReveal(),
        }),
    });

    this.schedule(steps);
  }

  private schedule(steps: Step[]): void {
    let acc = 0;
    for (const step of steps) {
      acc += step.delayMs;
      const at = acc;
      const timer = setTimeout(() => {
        if (!this.started) return;
        step.run((ev) => this.emit(ev));
      }, at);
      this.timers.push(timer);
    }
  }

  send(ev: import("@ai-impostor/shared").ClientEvent): void {
    // Guest demo handshake (mock): on request_join, seat the player immediately
    // and kick off the scripted round. No payment step, no chain, no MON.
    if (ev.t === "request_join") {
      if (this.gameStarted) return;
      this.gameStarted = true;
      this.runScript();
      return;
    }
    // Secret ballot: ack the first cast, reject any recast. Never echo the
    // target to anyone.
    if (ev.t === "cast_vote") {
      if (this.hasVoted) {
        this.emit({
          t: "vote_ack",
          seq: this.next(),
          round: ev.round,
          accepted: false,
          reason: "Vote already locked",
        });
        return;
      }
      this.hasVoted = true;
      this.emit({
        t: "vote_ack",
        seq: this.next(),
        round: ev.round,
        accepted: true,
      });
    }
    // send_message / set_typing / heartbeat / confirm_payment are no-ops here.
  }

  onEvent(handler: ServerEventHandler): () => void {
    return this.emitter.onEvent(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    return this.emitter.onConnection(handler);
  }
}

/**
 * One mock socket per client session (created once by SocketProvider). It scripts
 * the full guest-join → 90s round → who-was-who reveal arc and persists across
 * the queue → /play navigation without re-mounting — the script is kicked off on
 * `request_join` and driven by its own timers, independent of the route.
 */
export function createMockGameSocket(): GameSocket {
  return new MockGameSocket();
}
