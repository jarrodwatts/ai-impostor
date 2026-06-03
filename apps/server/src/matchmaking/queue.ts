import { config } from "../config.js";
import { InMemoryQueueStore, type QueueStore } from "./store.js";

/**
 * FIFO matchmaking + lobby fill (SPEC §5).
 *
 * Rules:
 *  - Public quick-match FIFO.
 *  - A start countdown begins once MIN_HUMANS (6) humans are queued.
 *  - During the countdown, late joiners are accepted up to MAX_HUMANS (9).
 *  - On start, humans = clamp(seated, MIN_HUMANS, MAX_HUMANS);
 *    aiCount = clamp(SEATS - humans, 1, 4) — never zero.
 *  - Surplus queued humans roll over to the next lobby.
 *
 * The class is timer-agnostic: it exposes `shouldStartCountdown`, a
 * `deriveLobby` pure helper, and `formLobby` which pops humans from the store.
 * The owning service drives the actual countdown clock.
 */

export interface LobbyComposition {
  humanCount: number;
  aiCount: number;
}

/** clamp(x, lo, hi). */
export function clampInt(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Derive the human/AI split for a given number of seated humans. Pure.
 * Mirrors SPEC §5: humans capped at [MIN, MAX]; aiCount = clamp(10-h, 1, 4).
 */
export function deriveLobby(
  seatedHumans: number,
  opts: LobbyOpts = {
    seats: config.SEATS,
    minHumans: config.MIN_HUMANS,
    maxHumans: config.MAX_HUMANS,
  },
): LobbyComposition {
  const humanCount = clampInt(seatedHumans, opts.minHumans, opts.maxHumans);
  const aiCount = clampInt(opts.seats - humanCount, 1, 4);
  return { humanCount, aiCount };
}

export interface FormedLobby extends LobbyComposition {
  /** The human queue members assigned to this lobby (FIFO order). */
  members: string[];
}

export interface LobbyOpts {
  seats: number;
  minHumans: number;
  maxHumans: number;
}

export class MatchmakingQueue {
  private opts: LobbyOpts;
  constructor(
    private store: QueueStore = new InMemoryQueueStore(),
    opts?: LobbyOpts,
  ) {
    this.opts = opts ?? {
      seats: config.SEATS,
      minHumans: config.MIN_HUMANS,
      maxHumans: config.MAX_HUMANS,
    };
  }

  /** Add a human to the FIFO. Returns their position (0 = front). */
  async join(member: string): Promise<number> {
    await this.store.enqueue(member);
    return this.store.position(member);
  }

  async leave(member: string): Promise<boolean> {
    return this.store.remove(member);
  }

  async position(member: string): Promise<number> {
    return this.store.position(member);
  }

  async waiting(): Promise<number> {
    return this.store.length();
  }

  async snapshot(): Promise<string[]> {
    return this.store.snapshot();
  }

  /** True once enough humans are queued to begin the start countdown. */
  async shouldStartCountdown(): Promise<boolean> {
    return (await this.store.length()) >= this.opts.minHumans;
  }

  /**
   * Pop up to MAX_HUMANS members from the front to form a lobby, leaving any
   * surplus in the queue (rollover). Returns null if fewer than MIN_HUMANS are
   * available. The caller spawns AI seats per `aiCount`.
   */
  async formLobby(): Promise<FormedLobby | null> {
    const len = await this.store.length();
    if (len < this.opts.minHumans) return null;
    const take = Math.min(len, this.opts.maxHumans);
    const members = await this.store.popFront(take);
    const { humanCount, aiCount } = deriveLobby(members.length, this.opts);
    return { humanCount, aiCount, members };
  }
}
