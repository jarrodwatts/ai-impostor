import type {
  GameRow,
  GamesRepo,
  MessageRow,
  MessagesRepo,
  Repositories,
  SeatRow,
  SeatsRepo,
  SettlementRow,
  SettlementsRepo,
  VoteRow,
  VotesRepo,
} from "./types.js";

/**
 * In-memory repository implementations. The default for tests, `pnpm build`,
 * and `pnpm start` — no live Postgres required. Everything is kept in plain
 * Maps/arrays; nothing persists across a restart.
 */

class InMemoryGames implements GamesRepo {
  private rows = new Map<string, GameRow>();
  async createGame(row: GameRow): Promise<void> {
    this.rows.set(row.gameId, { ...row });
  }
  async finalizeGame(
    gameId: string,
    outcome: string,
    finalPoolWei: string,
    houseWei: string,
  ): Promise<void> {
    const r = this.rows.get(gameId);
    if (r) {
      r.outcome = outcome;
      r.finalPoolWei = finalPoolWei;
      r.houseWei = houseWei;
    }
  }
  async getGame(gameId: string): Promise<GameRow | null> {
    return this.rows.get(gameId) ?? null;
  }
}

class InMemorySeats implements SeatsRepo {
  private rows: SeatRow[] = [];
  async addSeat(row: SeatRow): Promise<void> {
    this.rows.push({ ...row });
  }
  async updateAlive(
    gameId: string,
    seatId: string,
    _alive: boolean,
  ): Promise<void> {
    // append-only audit keeps original seat rows; alive transitions are
    // reconstructable from the vote/elimination log. No-op for the in-memory
    // impl beyond existence (kept for interface parity).
    void gameId;
    void seatId;
  }
}

class InMemoryMessages implements MessagesRepo {
  private rows: MessageRow[] = [];
  async appendMessage(row: MessageRow): Promise<void> {
    this.rows.push({ ...row });
  }
  async listMessages(gameId: string): Promise<MessageRow[]> {
    return this.rows.filter((r) => r.gameId === gameId);
  }
}

class InMemoryVotes implements VotesRepo {
  private rows: VoteRow[] = [];
  async appendVote(row: VoteRow): Promise<void> {
    this.rows.push({ ...row });
  }
}

class InMemorySettlements implements SettlementsRepo {
  private rows = new Map<string, SettlementRow>();
  async saveSettlement(row: SettlementRow): Promise<void> {
    this.rows.set(row.gameId, { ...row });
  }
  async getSettlement(gameId: string): Promise<SettlementRow | null> {
    return this.rows.get(gameId) ?? null;
  }
}

export function createInMemoryRepositories(): Repositories {
  return {
    games: new InMemoryGames(),
    seats: new InMemorySeats(),
    messages: new InMemoryMessages(),
    votes: new InMemoryVotes(),
    settlements: new InMemorySettlements(),
  };
}
