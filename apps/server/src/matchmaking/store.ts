/**
 * Queue backing-store interface. Production uses Redis (ioredis) so the FIFO
 * survives a server restart and can be shared across instances; tests + local
 * boot use the in-memory default so no live Redis is required.
 *
 * The interface is intentionally a small ordered-list abstraction — the
 * matchmaking policy (countdown, aiCount, rollover) lives in queue.ts and is
 * storage-agnostic.
 */
export interface QueueStore {
  /** Append a member to the tail if not already present. Returns new length. */
  enqueue(member: string): Promise<number>;
  /** Remove a member if present. Returns true if it was removed. */
  remove(member: string): Promise<boolean>;
  /** 0-based position of a member, or -1 if absent. */
  position(member: string): Promise<number>;
  /** Pop up to `n` members from the head, in FIFO order. */
  popFront(n: number): Promise<string[]>;
  /** Current length. */
  length(): Promise<number>;
  /** Snapshot of members in FIFO order (for tests/inspection). */
  snapshot(): Promise<string[]>;
}

/** In-memory FIFO. Default impl; no external services. */
export class InMemoryQueueStore implements QueueStore {
  private list: string[] = [];
  private set = new Set<string>();

  async enqueue(member: string): Promise<number> {
    if (!this.set.has(member)) {
      this.list.push(member);
      this.set.add(member);
    }
    return this.list.length;
  }
  async remove(member: string): Promise<boolean> {
    if (!this.set.has(member)) return false;
    this.set.delete(member);
    const i = this.list.indexOf(member);
    if (i >= 0) this.list.splice(i, 1);
    return true;
  }
  async position(member: string): Promise<number> {
    return this.list.indexOf(member);
  }
  async popFront(n: number): Promise<string[]> {
    const taken = this.list.splice(0, Math.max(0, n));
    for (const m of taken) this.set.delete(m);
    return taken;
  }
  async length(): Promise<number> {
    return this.list.length;
  }
  async snapshot(): Promise<string[]> {
    return [...this.list];
  }
}
