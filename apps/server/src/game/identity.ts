/**
 * Per-game uniform identity assignment (SPEC §8.1). The app assigns every
 * player — human AND AI alike — a random codename + avatar color at game start.
 * Nothing a player chose is ever shown; identities are per-game (no cross-game
 * reputation). Uniform rendering is what makes AI and humans indistinguishable.
 */

const CODENAMES: readonly string[] = [
  "Amber",
  "Basil",
  "Cobalt",
  "Dune",
  "Ember",
  "Flint",
  "Glade",
  "Hazel",
  "Indigo",
  "Juniper",
  "Koa",
  "Lark",
  "Marlow",
  "Nox",
  "Onyx",
  "Pike",
  "Quill",
  "Reed",
  "Sage",
  "Tansy",
] as const;

// Distinct, accessible swatch colors (purple = "you/safe" tones; berry kept for
// AI/danger but identity colors are uniform & unrelated to AI status).
const AVATAR_COLORS: readonly string[] = [
  "#836EF9",
  "#6E54FF",
  "#E03A8B",
  "#A0055D",
  "#3AA0E0",
  "#3AE0A0",
  "#E0B43A",
  "#E0653A",
  "#9B8CFF",
  "#5AD1C4",
] as const;

export interface AssignedIdentity {
  codename: string;
  avatarColor: string;
}

/**
 * Assign `n` unique identities. `pick` is an index source in [0,1) (e.g. an
 * RNG.next) so assignment is deterministic under a seeded RNG for sims/tests.
 */
export function assignIdentities(
  n: number,
  pick: () => number,
): AssignedIdentity[] {
  const names = [...CODENAMES];
  const colors = [...AVATAR_COLORS];
  // Fisher–Yates with the supplied source.
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(pick() * (i + 1));
    [names[i], names[j]] = [names[j]!, names[i]!];
  }
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(pick() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }
  const out: AssignedIdentity[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      codename: names[i % names.length]!,
      avatarColor: colors[i % colors.length]!,
    });
  }
  return out;
}
