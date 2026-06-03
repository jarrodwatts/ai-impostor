/**
 * Mock WebSocket game server — scripts a believable full game so every screen
 * is demoable without the real server (which lands in M5). It implements the
 * exact same `GameSocket` interface as the real transport, emits only validated
 * `ServerEvent`s, and honors the protocol's anti-leak shape (no AI identities or
 * MON until the final `settlement` event).
 *
 * The script follows the design reference's worked example:
 *   - 10 seats (codenames/colors from PLAYERS), viewer = seat p1 ("VIOLET HERON")
 *   - round prompt → discussion (chat + typing) → vote → resolve (elimination)
 *   - a misvote (human eliminated → pot −10%) then the AI are caught
 *   - terminal `settlement` reveal: HUMAN_WIN, AI = SLATE OWL + ASH VOLE
 *
 * Timings are compressed for demo (a few seconds per phase) but every phase is
 * driven by a real `phaseEndsAt` the client counts down from.
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

const GAME_ID = "demo-4471";
const MY_SEAT = "p1";

// Compressed demo timings (ms).
const PROMPT_MS = 3_500;
const DISCUSSION_MS = 9_000;
const VOTE_MS = 6_000;
const RESOLVE_MS = 4_500;

// Final truth — revealed ONLY in the settlement payload (mirrors design TRUTH).
const AI_SEATS = ["p6", "p10"]; // SLATE OWL, ASH VOLE

const roster: PublicSeat[] = PLAYERS.map((p) => ({
  seatId: p.id,
  codename: p.name,
  avatarColor: p.c,
  alive: true,
}));

type ScriptedMessage = { seat: string; text: string; typingMs: number };

type Round = {
  prompt: string;
  chat: ScriptedMessage[];
  /** seat eliminated this round (the table's most-voted) */
  eliminated: string;
  /** pot health AFTER this round resolves */
  potAfter: number;
  /** does resolving this round end the game? */
  gameOver: boolean;
};

// Scripted arc: R1 catches an AI (no penalty), R2 misvotes a human (−10%),
// R3 catches the last AI → human win.
const ROUNDS: Round[] = [
  {
    prompt: "What's a hot take you'd defend to the death?",
    chat: [
      { seat: "p2", text: "pineapple on pizza is correct and you all know it", typingMs: 1200 },
      { seat: "p8", text: "cereal before milk, every time. no exceptions", typingMs: 1100 },
      { seat: "p10", text: "objectively, breakfast foods are optimal at all hours.", typingMs: 900 },
      { seat: "p5", text: "ash you sound like a press release lol", typingMs: 1000 },
    ],
    eliminated: "p10", // ASH VOLE (AI) — caught, no penalty
    potAfter: 100,
    gameOver: false,
  },
  {
    prompt: "Describe a time you genuinely embarrassed yourself.",
    chat: [
      { seat: "p4", text: "i called my teacher 'mom' in grade 4 and wanted to evaporate", typingMs: 1400 },
      { seat: "p9", text: "walked face-first into a glass door at an apple store", typingMs: 1300 },
      { seat: "p1", text: "tripped going UP the stairs at a wedding. going UP", typingMs: 1200 },
      { seat: "p6", text: "i'd rather not get into it honestly", typingMs: 800 },
    ],
    eliminated: "p4", // CRIMSON FOX (human) — misvote, −10%
    potAfter: 90,
    gameOver: false,
  },
  {
    prompt: "If you had to lie convincingly right now, what would you say?",
    chat: [
      { seat: "p2", text: "slate is still dodging every prompt btw", typingMs: 1100 },
      { seat: "p9", text: "agreed. one of them types too clean", typingMs: 1000 },
      { seat: "p6", text: "I would simply state a plausible falsehood.", typingMs: 700 },
      { seat: "p8", text: "...slate that is the most ai sentence ever written", typingMs: 1200 },
    ],
    eliminated: "p6", // SLATE OWL (AI) — caught → human win
    potAfter: 90,
    gameOver: true,
  },
];

function settlementReveal(): SettlementReveal {
  return {
    outcome: "HUMAN_WIN",
    roster: PLAYERS.map((p) => ({
      seatId: p.id,
      codename: p.name,
      avatarColor: p.c,
      wasAI: AI_SEATS.includes(p.id),
      // survived = still alive at end (eliminated: p10, p4, p6)
      survived: !["p10", "p4", "p6"].includes(p.id),
    })),
    aiReveal: AI_SEATS,
    pool: {
      buyIn: "5000000000000000000", // 5 MON
      startPool: "50000000000000000000", // 10 seats * 5 (illustrative)
      houseTake: "7600000000000000000", // misvote cut
      finalPool: "32400000000000000000",
    },
    myPayout: "5400000000000000000", // 5.4 MON to this surviving human
    txHash: "0x9c4adf201aa00bb11cc22dd33ee44ff556677889900aabbccddeeff0011220201",
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

  connect(): void {
    if (this.started) return;
    this.started = true;
    this.emitter.emitConnection(true);
    this.runScript();
  }

  disconnect(): void {
    this.started = false;
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

  /** Schedule the entire scripted game as a chain of timed steps. */
  private runScript(): void {
    const steps: Step[] = [];

    // game_started
    steps.push({
      delayMs: 200,
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

    ROUNDS.forEach((rnd, i) => {
      const roundNo = i + 1;

      // round_started → ROUND_PROMPT
      steps.push({
        delayMs: 400,
        run: (emit) =>
          emit({
            t: "round_started",
            seq: this.next(),
            round: roundNo,
            promptText: rnd.prompt,
            phaseEndsAt: Date.now() + PROMPT_MS,
          }),
      });

      // phase → ROUND_DISCUSSION
      steps.push({
        delayMs: PROMPT_MS,
        run: (emit) =>
          emit({
            t: "phase_changed",
            seq: this.next(),
            round: roundNo,
            phase: "ROUND_DISCUSSION",
            phaseEndsAt: Date.now() + DISCUSSION_MS,
          }),
      });

      // discussion chat with typing indicators (AI realism = timing)
      const perMsg = Math.max(1, Math.floor(DISCUSSION_MS / (rnd.chat.length + 1)));
      rnd.chat.forEach((m) => {
        // typing on
        steps.push({
          delayMs: Math.max(300, perMsg - m.typingMs),
          run: (emit) =>
            emit({ t: "typing", seq: this.next(), seatId: m.seat, isTyping: true }),
        });
        // message (clears typing in the reducer)
        steps.push({
          delayMs: m.typingMs,
          run: (emit) =>
            emit({
              t: "chat_message",
              seq: this.next(),
              msgId: `r${roundNo}-${m.seat}-${this.seq}`,
              seatId: m.seat,
              text: m.text,
              ts: Date.now(),
            }),
        });
      });

      // phase → VOTE_WINDOW + vote_open (eligible = alive, not me)
      steps.push({
        delayMs: 600,
        run: (emit) => {
          const eligible = roster
            .filter((s) => s.alive && s.seatId !== MY_SEAT)
            .map((s) => s.seatId);
          this.hasVoted = false; // fresh ballot each round (secret ballot)
          emit({
            t: "vote_open",
            seq: this.next(),
            round: roundNo,
            phaseEndsAt: Date.now() + VOTE_MS,
            eligibleTargets: eligible,
          });
        },
      });

      // resolve → round_resolved (eliminate seat, update pot, flip alive flag)
      steps.push({
        delayMs: VOTE_MS,
        run: (emit) => {
          const seat = roster.find((s) => s.seatId === rnd.eliminated);
          if (seat) seat.alive = false;
          // if the viewer was the one eliminated, send you_eliminated too
          if (rnd.eliminated === MY_SEAT) {
            emit({ t: "you_eliminated", seq: this.next(), round: roundNo });
          }
          emit({
            t: "round_resolved",
            seq: this.next(),
            round: roundNo,
            eliminatedSeatIds: [rnd.eliminated],
            potHealthPct: rnd.potAfter,
            gameOver: rnd.gameOver,
          });
        },
      });

      // settlement reveal at the end of the final round
      if (rnd.gameOver) {
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
      }
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
    // The mock only needs to react to votes (secret ballot): ack the first cast,
    // reject any recast. It never echoes the target to anyone.
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
    // send_message / set_typing / heartbeat are no-ops in the mock.
  }

  onEvent(handler: ServerEventHandler): () => void {
    return this.emitter.onEvent(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    return this.emitter.onConnection(handler);
  }
}

/** Reset per-round vote lock between games (the provider creates a fresh mock). */
export function createMockGameSocket(): GameSocket {
  return new MockGameSocket();
}
