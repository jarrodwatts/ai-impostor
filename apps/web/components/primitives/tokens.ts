/**
 * Raw Monad palette + per-game player identities.
 * Mirrors `C`, `PLAYERS`, and font stacks from
 * design-reference/project/screens-shared.jsx. The hex/rgba here are the
 * exact source-of-truth values; CSS-token-driven components prefer the
 * `var(--mon-*)` custom properties (see app/colors_and_type.css), but
 * primitives that need inline gradients/swatches read these constants.
 */
export const C = {
  bg: "#0E100F",
  bgRaise: "#121212",
  card: "#161616",
  cardHi: "#1C1C1E",
  line: "rgba(255,255,255,0.08)",
  lineSoft: "rgba(255,255,255,0.05)",
  text: "#FBFAF9",
  muted: "rgba(255,255,255,0.62)",
  faint: "rgba(255,255,255,0.40)",
  purple: "#836EF9",
  purplePri: "#6E54FF",
  purpleSoft: "rgba(131,110,249,0.14)",
  berry: "#A0055D",
  berryHi: "#E03A8B",
  berrySoft: "rgba(224,58,139,0.14)",
  green: "#16a34a",
  amber: "#ca8a04",
  red: "#dc2626",

  // Radial pill button gradients (exact from screens-shared.jsx `Btn`)
  radialPrimary:
    "radial-gradient(50% 50% at 50% 50%, rgba(110,84,255,0) 0%, rgba(255,255,255,0.14) 100%), #6E54FF",
  radialSecondary:
    "radial-gradient(50% 50% at 50% 50%, rgba(250,250,250,0.33) 0%, rgba(115,115,115,0.04) 100%), #FBFAF9",
  radialBerry:
    "radial-gradient(50% 50% at 50% 50%, rgba(224,58,139,0) 0%, rgba(255,255,255,0.16) 100%), #A0055D",

  // Button shadows (exact from screens-shared.jsx `Btn`)
  shadowPrimary:
    "0 0 0 1px rgba(79,71,235,0.9), inset 0 1px 0.5px rgba(255,255,255,0.25), inset 0 -1px 0.5px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.3)",
  shadowSecondary:
    "inset 0 1px 0.5px #fff, inset 0 -1px 0.5px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.25)",
  shadowBerry:
    "0 0 0 1px rgba(224,58,139,0.6), inset 0 1px 0.5px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.3)",
} as const;

export const MONO = "var(--font-roboto-mono), ui-monospace, Menlo, monospace";
export const DISP =
  "var(--font-britti-sans), var(--font-inter), system-ui, sans-serif";
export const SANS = "var(--font-inter), system-ui, sans-serif";

export type Player = {
  id: string;
  name: string;
  /** swatch color */
  c: string;
  you?: boolean;
};

/** 10 per-game player identities (color swatch + codename). */
export const PLAYERS: Player[] = [
  { id: "p1", name: "VIOLET HERON", c: "#836EF9", you: true },
  { id: "p2", name: "AMBER LYNX", c: "#D1884F" },
  { id: "p3", name: "COBALT WREN", c: "#2E8BEA" },
  { id: "p4", name: "CRIMSON FOX", c: "#E03A8B" },
  { id: "p5", name: "JADE MOTH", c: "#1FB573" },
  { id: "p6", name: "SLATE OWL", c: "#7C8AA0" },
  { id: "p7", name: "RUST HARE", c: "#F0653A" },
  { id: "p8", name: "PEARL DOE", c: "#C9C2E6" },
  { id: "p9", name: "TEAL STAG", c: "#13A8A0" },
  { id: "p10", name: "ASH VOLE", c: "#9489FC" },
];

/** Two-letter monogram from a codename, e.g. "VIOLET HERON" -> "VH". */
export const initials = (name: string): string =>
  name
    .split(" ")
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2);
