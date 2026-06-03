import type { Pool } from "pg";
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
 * Postgres-backed repositories (SPEC §6 append-only log). THIN SKELETON for
 * M3 — the SQL is sketched and the wiring is correct, but the production path
 * (migrations, connection pooling, retries) lands in M5/M6 integration. Tests
 * and local boot use the in-memory impl (persistence/memory.ts); this file is
 * not exercised without a live `pg.Pool`.
 *
 * Schema (illustrative):
 *   games(game_id pk, game_id_num, buy_in_wei, start_pool_wei, created_at,
 *         outcome, final_pool_wei, house_wei)
 *   seats(game_id, seat_id, codename, avatar_color, is_ai, funder_address,
 *         persona_key, primary key(game_id, seat_id))
 *   messages(game_id, msg_id, round, seat_id, text, ts)
 *   votes(game_id, round, voter_seat_id, target_seat_id, ts)
 *   settlements(game_id pk, game_id_num, survivors jsonb, payouts_wei jsonb,
 *               house_wei, result_root, signature, tx_hash, created_at)
 */

class PgGames implements GamesRepo {
  constructor(private pool: Pool) {}
  async createGame(r: GameRow): Promise<void> {
    await this.pool.query(
      `insert into games (game_id, game_id_num, buy_in_wei, start_pool_wei, created_at, outcome, final_pool_wei, house_wei)
       values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (game_id) do nothing`,
      [
        r.gameId,
        r.gameIdNum,
        r.buyInWei,
        r.startPoolWei,
        r.createdAt,
        r.outcome,
        r.finalPoolWei,
        r.houseWei,
      ],
    );
  }
  async finalizeGame(
    gameId: string,
    outcome: string,
    finalPoolWei: string,
    houseWei: string,
  ): Promise<void> {
    await this.pool.query(
      `update games set outcome=$2, final_pool_wei=$3, house_wei=$4 where game_id=$1`,
      [gameId, outcome, finalPoolWei, houseWei],
    );
  }
  async getGame(gameId: string): Promise<GameRow | null> {
    const res = await this.pool.query(`select * from games where game_id=$1`, [
      gameId,
    ]);
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      gameId: String(row.game_id),
      gameIdNum: String(row.game_id_num),
      buyInWei: String(row.buy_in_wei),
      startPoolWei: String(row.start_pool_wei),
      createdAt: Number(row.created_at),
      outcome: row.outcome == null ? null : String(row.outcome),
      finalPoolWei: row.final_pool_wei == null ? null : String(row.final_pool_wei),
      houseWei: row.house_wei == null ? null : String(row.house_wei),
    };
  }
}

class PgSeats implements SeatsRepo {
  constructor(private pool: Pool) {}
  async addSeat(r: SeatRow): Promise<void> {
    await this.pool.query(
      `insert into seats (game_id, seat_id, codename, avatar_color, is_ai, funder_address, persona_key)
       values ($1,$2,$3,$4,$5,$6,$7) on conflict (game_id, seat_id) do nothing`,
      [
        r.gameId,
        r.seatId,
        r.codename,
        r.avatarColor,
        r.isAI,
        r.funderAddress,
        r.personaKey,
      ],
    );
  }
}

class PgMessages implements MessagesRepo {
  constructor(private pool: Pool) {}
  async appendMessage(r: MessageRow): Promise<void> {
    await this.pool.query(
      `insert into messages (game_id, msg_id, round, seat_id, text, ts)
       values ($1,$2,$3,$4,$5,$6) on conflict (game_id, msg_id) do nothing`,
      [r.gameId, r.msgId, r.round, r.seatId, r.text, r.ts],
    );
  }
  async listMessages(gameId: string): Promise<MessageRow[]> {
    const res = await this.pool.query(
      `select * from messages where game_id=$1 order by ts asc`,
      [gameId],
    );
    return res.rows.map((row: Record<string, unknown>) => ({
      gameId: String(row.game_id),
      msgId: String(row.msg_id),
      round: Number(row.round),
      seatId: String(row.seat_id),
      text: String(row.text),
      ts: Number(row.ts),
    }));
  }
}

class PgVotes implements VotesRepo {
  constructor(private pool: Pool) {}
  async appendVote(r: VoteRow): Promise<void> {
    await this.pool.query(
      `insert into votes (game_id, round, voter_seat_id, target_seat_id, ts)
       values ($1,$2,$3,$4,$5)`,
      [r.gameId, r.round, r.voterSeatId, r.targetSeatId, r.ts],
    );
  }
}

class PgSettlements implements SettlementsRepo {
  constructor(private pool: Pool) {}
  async saveSettlement(r: SettlementRow): Promise<void> {
    await this.pool.query(
      `insert into settlements (game_id, game_id_num, survivors, payouts_wei, house_wei, result_root, signature, tx_hash, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (game_id) do update set signature=excluded.signature, tx_hash=excluded.tx_hash`,
      [
        r.gameId,
        r.gameIdNum,
        JSON.stringify(r.survivors),
        JSON.stringify(r.payoutsWei),
        r.houseWei,
        r.resultRoot,
        r.signature,
        r.txHash,
        r.createdAt,
      ],
    );
  }
  async getSettlement(gameId: string): Promise<SettlementRow | null> {
    const res = await this.pool.query(
      `select * from settlements where game_id=$1`,
      [gameId],
    );
    const row = res.rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      gameId: String(row.game_id),
      gameIdNum: String(row.game_id_num),
      survivors: row.survivors as string[],
      payoutsWei: row.payouts_wei as string[],
      houseWei: String(row.house_wei),
      resultRoot: String(row.result_root),
      signature: row.signature == null ? null : String(row.signature),
      txHash: row.tx_hash == null ? null : String(row.tx_hash),
      createdAt: Number(row.created_at),
    };
  }
}

export function createPostgresRepositories(pool: Pool): Repositories {
  return {
    games: new PgGames(pool),
    seats: new PgSeats(pool),
    messages: new PgMessages(pool),
    votes: new PgVotes(pool),
    settlements: new PgSettlements(pool),
  };
}
