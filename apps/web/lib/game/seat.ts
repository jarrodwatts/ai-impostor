/**
 * Adapt a server `PublicSeat` (codename + avatarColor, NO isAI) into the
 * `Player` shape the M1 primitives consume. The `you` flag is derived from the
 * viewer's own seatId — never from any AI/identity info (there is none).
 */
import type { PublicSeat } from "@ai-impostor/shared";
import type { Player } from "@/components/primitives";

export function seatToPlayer(seat: PublicSeat, mySeatId: string | null): Player {
  return {
    id: seat.seatId,
    name: seat.codename,
    c: seat.avatarColor,
    you: seat.seatId === mySeatId,
  };
}

export function findSeat(
  roster: PublicSeat[],
  seatId: string,
): PublicSeat | undefined {
  return roster.find((s) => s.seatId === seatId);
}
