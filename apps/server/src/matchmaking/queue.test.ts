import { describe, expect, it } from "vitest";
import {
  clampInt,
  deriveLobby,
  MatchmakingQueue,
} from "./queue.js";
import { InMemoryQueueStore } from "./store.js";

const OPTS = { seats: 10, minHumans: 6, maxHumans: 9 };

describe("deriveLobby — aiCount = clamp(10 - humans, 1, 4)", () => {
  it("6 humans → 4 AI", () => {
    expect(deriveLobby(6, OPTS)).toEqual({ humanCount: 6, aiCount: 4 });
  });
  it("7 humans → 3 AI", () => {
    expect(deriveLobby(7, OPTS)).toEqual({ humanCount: 7, aiCount: 3 });
  });
  it("8 humans → 2 AI", () => {
    expect(deriveLobby(8, OPTS)).toEqual({ humanCount: 8, aiCount: 2 });
  });
  it("9 humans → 1 AI", () => {
    expect(deriveLobby(9, OPTS)).toEqual({ humanCount: 9, aiCount: 1 });
  });
  it("clamps humans below the minimum up to MIN_HUMANS", () => {
    expect(deriveLobby(3, OPTS)).toEqual({ humanCount: 6, aiCount: 4 });
  });
  it("never produces zero AI even above max humans", () => {
    expect(deriveLobby(12, OPTS)).toEqual({ humanCount: 9, aiCount: 1 });
  });
});

describe("clampInt", () => {
  it("clamps to bounds", () => {
    expect(clampInt(0, 1, 4)).toBe(1);
    expect(clampInt(9, 1, 4)).toBe(4);
    expect(clampInt(3, 1, 4)).toBe(3);
  });
});

describe("MatchmakingQueue — countdown trigger + rollover", () => {
  it("does not start a countdown below MIN_HUMANS", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    for (let i = 0; i < 5; i++) await q.join(`u${i}`);
    expect(await q.shouldStartCountdown()).toBe(false);
    expect(await q.formLobby()).toBeNull();
  });

  it("starts a countdown once MIN_HUMANS are queued", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    for (let i = 0; i < 6; i++) await q.join(`u${i}`);
    expect(await q.shouldStartCountdown()).toBe(true);
  });

  it("forms a 6-human lobby (4 AI) and keeps queue order (FIFO)", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    for (let i = 0; i < 6; i++) await q.join(`u${i}`);
    const lobby = await q.formLobby();
    expect(lobby).not.toBeNull();
    expect(lobby!.humanCount).toBe(6);
    expect(lobby!.aiCount).toBe(4);
    expect(lobby!.members).toEqual(["u0", "u1", "u2", "u3", "u4", "u5"]);
    expect(await q.waiting()).toBe(0);
  });

  it("accepts up to 9 humans (1 AI) and rolls surplus to the next lobby", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    for (let i = 0; i < 13; i++) await q.join(`u${i}`);
    const lobby = await q.formLobby();
    expect(lobby!.humanCount).toBe(9);
    expect(lobby!.aiCount).toBe(1);
    expect(lobby!.members).toEqual([
      "u0", "u1", "u2", "u3", "u4", "u5", "u6", "u7", "u8",
    ]);
    // surplus (u9..u12) rolled over
    expect(await q.snapshot()).toEqual(["u9", "u10", "u11", "u12"]);
    expect(await q.waiting()).toBe(4);
  });

  it("leave removes from the queue and shifts positions", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    await q.join("a");
    await q.join("b");
    await q.join("c");
    expect(await q.position("c")).toBe(2);
    expect(await q.leave("b")).toBe(true);
    expect(await q.position("c")).toBe(1);
    expect(await q.position("b")).toBe(-1);
  });

  it("join is idempotent (no duplicate seats)", async () => {
    const q = new MatchmakingQueue(new InMemoryQueueStore(), OPTS);
    await q.join("a");
    await q.join("a");
    expect(await q.waiting()).toBe(1);
  });
});
