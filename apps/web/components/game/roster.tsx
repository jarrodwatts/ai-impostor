"use client";

/**
 * Table roster sidebar. Recreates `RosterRow` + the desktop roster column from
 * screens-game.jsx. Shows codename + alive/dead only — NO human/AI labels (those
 * exist only at settlement). The "N ALIVE · M OUT" header counts seat liveness,
 * which is public, not a human/AI split.
 */
import { Avatar, Eyebrow, C, MONO, SANS } from "@/components/primitives";
import { useGameStore } from "@/lib/game/store";
import { seatToPlayer } from "@/lib/game/seat";

function RosterRow({
  seatId,
  codename,
  avatarColor,
  alive,
  you,
}: {
  seatId: string;
  codename: string;
  avatarColor: string;
  alive: boolean;
  you: boolean;
}) {
  const dead = !alive;
  return (
    <div
      className="flex items-center gap-[11px] rounded-xl px-3 py-[9px]"
      style={{
        background: you ? C.purpleSoft : "transparent",
        border: `1px solid ${you ? "rgba(131,110,249,0.3)" : "transparent"}`,
        opacity: dead ? 0.45 : 1,
      }}
    >
      <Avatar p={{ id: seatId, name: codename, c: avatarColor }} size={34} dead={dead} />
      <div className="min-w-0 flex-1">
        <div
          style={{
            font: `500 12px/1.2 ${MONO}`,
            letterSpacing: "0.04em",
            color: dead ? C.faint : C.text,
            textDecoration: dead ? "line-through" : "none",
          }}
        >
          {codename}
          {you ? " · YOU" : ""}
        </div>
      </div>
      {dead ? (
        <Eyebrow color={C.faint} style={{ fontSize: 8 }}>
          OUT
        </Eyebrow>
      ) : (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 9999,
            background: C.green,
            boxShadow: "0 0 0 3px rgba(22,163,74,0.18)",
          }}
        />
      )}
    </div>
  );
}

export function Roster({ className }: { className?: string }) {
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const aliveCount = roster.filter((s) => s.alive).length;
  const outCount = roster.length - aliveCount;

  return (
    <div
      className={`flex flex-col gap-[2px] border-r p-4 ${className ?? ""}`}
      style={{ borderColor: C.lineSoft, background: "#0C0E0D" }}
    >
      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <Eyebrow color={C.faint}>TABLE</Eyebrow>
        <Eyebrow color={C.faint}>
          {aliveCount} ALIVE · {outCount} OUT
        </Eyebrow>
      </div>
      {roster.map((s) => {
        const p = seatToPlayer(s, mySeatId);
        return (
          <RosterRow
            key={s.seatId}
            seatId={s.seatId}
            codename={s.codename}
            avatarColor={s.avatarColor}
            alive={s.alive}
            you={p.you ?? false}
          />
        );
      })}
      <div
        className="mt-auto border-t p-3"
        style={{ borderColor: C.lineSoft, font: `400 11px/1.45 ${SANS}`, color: C.faint }}
      >
        Everyone is shown the same way — no wallet, no history, no badges. The
        only tell is how they talk.
      </div>
    </div>
  );
}

/** Horizontal avatar strip for the mobile discussion header. */
export function RosterStrip() {
  const roster = useGameStore((s) => s.roster);
  const mySeatId = useGameStore((s) => s.mySeatId);
  const shown = roster.slice(0, 8);
  const extra = roster.length - shown.length;

  return (
    <div className="mt-3 flex gap-2 overflow-hidden">
      {shown.map((s) => {
        const p = seatToPlayer(s, mySeatId);
        return (
          <div key={s.seatId} style={{ opacity: s.alive ? 1 : 0.4 }}>
            <Avatar
              p={p}
              size={32}
              dead={!s.alive}
              ring={p.you ? C.purple : undefined}
            />
          </div>
        );
      })}
      {extra > 0 && (
        <div
          className="grid flex-none place-items-center"
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${C.line}`,
            font: `500 11px/1 ${MONO}`,
            color: C.faint,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
