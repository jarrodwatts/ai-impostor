/**
 * Append-only persistence interfaces (SPEC §6 / plans.md M3). The server is
 * authoritative; Postgres is an append-only audit log of games, seats,
 * messages, votes and settlements. All impls implement these interfaces; tests
 * + `pnpm build`/`start` default to the in-memory impl so no live Postgres is
 * required.
 */

export interface GameRow {
  gameId: string;
  gameIdNum: string; // stringified bigint (uint256)
  buyInWei: string;
  startPoolWei: string;
  createdAt: number;
  outcome: string | null;
  finalPoolWei: string | null;
  houseWei: string | null;
}

export interface SeatRow {
  gameId: string;
  seatId: string;
  codename: string;
  avatarColor: string;
  isAI: boolean;
  funderAddress: string | null;
  personaKey: string | null;
}

export interface MessageRow {
  gameId: string;
  msgId: string;
  round: number;
  seatId: string;
  text: string;
  ts: number;
}

export interface VoteRow {
  gameId: string;
  round: number;
  voterSeatId: string;
  targetSeatId: string;
  ts: number;
}

export interface SettlementRow {
  gameId: string;
  gameIdNum: string;
  survivors: string[];
  payoutsWei: string[];
  houseWei: string;
  resultRoot: string;
  signature: string | null;
  txHash: string | null;
  createdAt: number;
}

export interface GamesRepo {
  createGame(row: GameRow): Promise<void>;
  finalizeGame(
    gameId: string,
    outcome: string,
    finalPoolWei: string,
    houseWei: string,
  ): Promise<void>;
  getGame(gameId: string): Promise<GameRow | null>;
}

export interface SeatsRepo {
  addSeat(row: SeatRow): Promise<void>;
  updateAlive?(gameId: string, seatId: string, alive: boolean): Promise<void>;
}

export interface MessagesRepo {
  appendMessage(row: MessageRow): Promise<void>;
  listMessages(gameId: string): Promise<MessageRow[]>;
}

export interface VotesRepo {
  appendVote(row: VoteRow): Promise<void>;
}

export interface SettlementsRepo {
  saveSettlement(row: SettlementRow): Promise<void>;
  getSettlement(gameId: string): Promise<SettlementRow | null>;
}

/** Bundle of all repositories the game server depends on. */
export interface Repositories {
  games: GamesRepo;
  seats: SeatsRepo;
  messages: MessagesRepo;
  votes: VotesRepo;
  settlements: SettlementsRepo;
}
