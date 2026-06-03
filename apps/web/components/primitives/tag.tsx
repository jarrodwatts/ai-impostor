import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { C, MONO } from "./tokens";

/**
 * Tag chip (HUMAN / AI / SOON etc). Exact recreation of `Tag` from
 * screens-shared.jsx. The per-tone bg/color/border palette is preserved via
 * an inline style map (the values include alpha-composited brand colors that
 * don't map cleanly to utility classes); CVA carries the shared structure.
 */
const tagVariants = cva(
  "inline-flex items-center gap-[5px] h-5 px-2 rounded-md uppercase font-mono font-semibold text-[9px] tracking-[0.12em]",
  {
    variants: {
      tone: {
        neutral: "",
        human: "",
        ai: "",
        purple: "",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const TONE_STYLE: Record<string, { bg: string; c: string; b: string }> = {
  neutral: { bg: "rgba(255,255,255,0.06)", c: C.muted, b: C.line },
  human: { bg: "rgba(22,163,74,0.16)", c: "#4ade80", b: "rgba(22,163,74,0.4)" },
  ai: { bg: C.berrySoft, c: C.berryHi, b: "rgba(224,58,139,0.45)" },
  purple: { bg: C.purpleSoft, c: C.purple, b: "rgba(131,110,249,0.4)" },
};

export type TagProps = VariantProps<typeof tagVariants> & {
  children: ReactNode;
  className?: string;
};

export function Tag({ children, tone = "neutral", className }: TagProps) {
  const m = TONE_STYLE[tone ?? "neutral"];
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        height: 20,
        padding: "0 8px",
        borderRadius: 6,
        background: m.bg,
        border: `1px solid ${m.b}`,
        font: `600 9px/1 ${MONO}`,
        letterSpacing: "0.12em",
        color: m.c,
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

export { tagVariants };
