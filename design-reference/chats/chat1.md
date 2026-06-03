# App Design Screens

_Started 2026-06-03 11:01 UTC_

---

## User

<system-info comment="Only acknowledge these if relevant">
Project title is now "Among Us"
Project is currently empty (no files)
Current date is now June 3, 2026
</system-info>

<pasted_text name="Pasted text (309 lines)">
# Spec: AI Impostor — Social Deduction Game on Monad

> A real-money social deduction game (Among Us / Mafia lineage) where humans share a
> chat room with hidden AI agents and must vote the AI out before the AI reaches parity.
> Built on Monad, settled in MON.

**Status:** Draft v1 (MVP) — derived from product discovery Q&A, 2026-06-03
**Owner:** jwatts@monad.foundation

---

## 1. Concept

10 players share a real-time text chat. A randomized 1–4 of them are **AI agents** (operated
by the house); the rest are humans. Over a series of timed rounds, players discuss and then
vote one player out per round. Humans win by eliminating every AI; the AI side wins by
surviving until it reaches parity with the humans. It is, in effect, a **social Turing test
with money on the line.**

---

## 2. Core Gameplay Loop

- **Lobby:** Always 10 seats. Public quick-match queue.
- **Rounds:** Sequential, each with a **~2-minute** maximum timer.
  - Each round opens with a **system prompt** posted to chat to spur conversation.
    - Round 1: trivial ice-breaker (e.g. *"Everyone say hello."*).
    - Later rounds: progressively deeper / more revealing prompts to surface behavioral
      signal (e.g. *"Describe a time you were embarrassed,"* *"What's your hot take on X?"*).
  - Players chat freely within the timer.
  - At round end, every surviving player casts **one vote** to eliminate a player.
- **Elimination:** The player with the **most votes** is eliminated.
  - **Ties:** *all* tied players are eliminated that round.
  - **Resolution order each round:** remove all eliminated players → **check win conditions
    first** → then apply any misvote penalty. If removing tied players ends the game as a human
    win, the **10% penalty is waived** (the human loss "didn't matter").
- **Vote privacy:** Votes are **secret** — the UI never shows who voted for whom, only the
  outcome (who was eliminated).
- **Eliminated players:** Removed from play. **No payout** (only survivors split). Eliminated
  humans **may spectate** (read-only, muted). An eliminated AI goes silent and stops acting.

### End conditions
- **Humans win** when the **last AI is voted out.** Surviving humans split the pool (see §4).
- **AI wins** when surviving **AI ≥ surviving humans** (parity / mafia rule). On an AI win the
  house takes **100%** of the remaining pool; all humans lose their buy-in.
  - *Rationale:* at parity the colluding AI can bloc-vote the same human out and conclude the
    game regardless, so equality is already a loss for humans.

---

## 3. The AI Agents

- **Goal:** Be as hard to identify as AI as possible (adversarial — avoid the vote).
- **Behavior:** LLM-driven personas that **blend in** with humans — natural language, casual
  register, plausible typos, human-like response latency/typing cadence — and are **reactive**
  to the live conversation and other players' behavior.
- **Collusion:** When there are multiple AI in a game, **they know each other's identities** and
  coordinate (e.g. deflect suspicion, back each other's stories, avoid voting one another).
- **Vote coordination (bloc voting):** AI **see each other's intended votes** and vote as a
  **bloc** — piling onto a single target to force an elimination. This is what makes the parity
  win condition decisive.
  - *Balance watch:* a 4-AI draw vs 6 humans lets the bloc near-guarantee an elimination per
    round and reach parity in ~2 rounds. This is the intended "hardest draw," but it is the #1
    thing to validate in playtesting. Mitigation lever if too AI-favored: cap how often the bloc
    may vote identically, or weight/cap AI count more conservatively.
- **House-operated:** AI seats are run by the house. They contribute **$0** to the pool (see §4).

---

## 4. Economics & Monetization

### Founding principle: the house is always non-negative EV
**AI agents contribute nothing to the prize pool. Humans fund 100% of it.** This guarantees that
total human payout ≤ total human buy-ins, so the house can take a cut but **can never lose money**.
(An earlier model where the AI bought in failed precisely because it injected house money into a
pot humans could extract — i.e. paying people to play.)

### Money flow
- Fixed **buy-in `B`** per human (MON). Pool at start = `(# humans) × B`.
- **No flat entry rake.** House revenue is purely outcome-based:
  1. **Misvote penalty:** any round in which a **human** is eliminated, the house takes **10%
     of the current pool.** (Voting out an AI costs the pool nothing.)
     - **Flat 10% per round** (not per human): any round in which ≥1 human is eliminated docks a
       single 10% of the current pool, regardless of how many humans went out that round.
  2. **AI win:** house takes **100%** of the remaining pool.
- **Human win payout:** surviving humans split the **remaining pool equally**.

### Worked example
Buy-in `B = 10 MON`, lobby = 8 humans + 2 AI → pool = **80 MON**.

| Scenario | Round effects | Result |
|---|---|---|
| Perfect play (vote both AI, no humans lost) | pool stays 80 | 8 survivors split 80 = **10 each** (break even). House = 0. |
| One misvote, then both AI out | R1 misvote: 80→72 (house +8); R2,R3 AI out | 7 survivors split 72 = **~10.29 each**. House keeps **8**. |
| AI reaches parity | — | House takes **entire** remaining pool. Humans lose everything. |

House EV is **≥ 0 in every game** (only zero on a flawless human win); strictly positive whenever
a misvote occurs or the AI wins.

### Anti-leak display rule (critical)
Because the pool = `humans × B` with a known fixed `B`, **showing the absolute pot would reveal the
human count and therefore the AI count.** Therefore:
- **Never** display absolute MON pot size or player-count breakdowns mid-game.
- Display a **"Pot Health" percentage** instead: starts at **100%**, drops **10%** per misvote
  round. This is identical regardless of how many AI are in the game, so it leaks nothing.
- Absolute MON amounts are revealed **only at settlement**, alongside the AI reveal.

### Unit economics (sanity check)
The house is structurally non-negative, so profitability reduces to: **expected take per game >
AI inference cost per game.**
- Expected house take ≈ `E[# misvote rounds] × 10% × pool  +  P(AI win) × pool`.
- Because the AI is engineered to be hard to detect (and bloc-votes toward parity), **AI wins —
  which pay the house the *entire* pool — should be common**, making expected take a large
  fraction of (often a multiple of) a single buy-in.
- AI inference is a small, bounded per-game cost (a 10-player chat over a handful of ~2-min
  rounds). Any non-trivial buy-in clears it by a wide margin.
- **Only real cost control:** bound AI message volume and model tier so inference stays cheap.
- **v1 (testnet):** buy-in is **nominal** — testnet MON has no real value, so the goal is to
  validate mechanics, not optimize margin. The model above carries over directly to a mainnet
  buy-in later.

---

## 5. Lobby, Matchmaking & Composition

- **Matchmaking:** Public **quick-match queue**. Player pays buy-in, joins the next forming lobby.
- **Seats:** Always **10 total.**
- **Humans:** Minimum **6**, maximum **9** per game.
- **AI:** **1–4**, **never zero.** AI count = `10 − (humans seated at start)`, naturally
  randomized by queue fill. Human seats are capped at 9 so there is always ≥1 AI; surplus
  queued humans roll to the next lobby.
- **Start trigger:** Once **6 humans** are seated, a short **start countdown (~20–30s)** begins.
  Late joiners are accepted up to the 9-human cap during the countdown; the game starts when the
  countdown ends. This prioritizes fast queue times (and therefore a higher average AI count).
- **Disconnect / idle handling:** A disconnected or idle human gets a short **grace/reconnect
  window**; if they don't return they are **auto-eliminated** (treated as voted out), which **does
  trigger the 10% pool penalty**.
  - *Tunable:* whether a genuine disconnect should waive the 10% penalty (docking the whole room
    for one player's dropped connection may feel unfair) is left configurable for playtesting.

---

## 6. Blockchain / On-Chain Design

- **Chain:** **Monad testnet** for v1.
- **Token:** MON. **Fixed buy-in** (single tier for v1; tiers later).
- **On-chain scope — Escrow + settlement:**
  - A smart contract **escrows** all human buy-ins on join.
  - The contract **pays out** survivors (human win) or the house (AI win) at settlement.
  - Misvote penalties accrue to the house's settlement share.
- **Off-chain:** Real-time chat, round timers, voting, and AI agents run on the house's server.
- **Trust model (v1):** **Trust-the-server.** The server is authoritative over game logic and AI
  assignment; only money is on-chain. (Commit-reveal of AI identities / verifiable audit logs are
  a **post-MVP** hardening — see §8.)

---

## 7. Platform

- **Web app**, responsive for **desktop + mobile browser**.
- Wallet connect for Monad; buy-in and payout via the escrow contract.

---

## 8. Frontend / UX

### 8.1 Identity & anonymity (the core anti-tell layer)
- The **app assigns** every player — **human and AI alike** — a **random avatar + display name**
  at game start. Players cannot choose or bring their own.
- **Uniform rendering:** AI and humans are visually indistinguishable. No wallet address / ENS,
  no custom avatars, no profile history, no badges — nothing a player *chose* that could leak
  human-vs-AI signal.
- Names/avatars are per-game (not persistent identity) to avoid cross-game reputation tells.

### 8.2 Presence & typing
- **Typing indicators: ON** for everyone ("X is typing…"). **AI must simulate realistic typing
  cadence and delays** — with presence-based tells now removed, timing realism is the AI's
  primary blend-in surface and a key engineering focus.
- **No online / last-seen / presence status** is ever shown.

### 8.3 Round phase structure
1. **Round prompt** posted to chat (escalating depth per round — see §2).
2. **Discussion phase:** ~2-minute open chat with live typing indicators.
3. **Vote phase:** chat **locks**, a short dedicated **vote window** opens.
   - **Secret ballot** — outcome only, never who-voted-whom.
   - **Locked on first cast, no recast, no abstain.**
4. Elimination resolves (with the §2 resolution order), then the next round begins or the game ends.

### 8.4 Chat (v1)
- **Plain text only**, with a sensible **message length cap** and **rate limiting**.
- Replies / @mentions / emoji reactions are **deferred** to a later version (see §9).

### 8.5 In-game HUD
- **Roster** of all 10 seats: avatar, name, **alive/eliminated** state; the player's **own seat
  highlighted**.
- **Current round number** and **countdown timer**.
- **"Pot Health %"**: starts at **100%**, drops **10%** per misvote round. **Never** shows absolute
  MON or any headcount (preserves the §4 anti-leak rule — pot health is identical regardless of AI
  count).

### 8.6 Eliminated players & spectators
- Eliminated humans become **read-only spectators** (muted) with the **same chat view**.
- **No AI identities are revealed to spectators until the final reveal** — so a knocked-out human
  cannot leak who's AI to living players via an external side channel.
- An eliminated AI goes **silent** and stops acting.

### 8.7 End-of-game reveal & settlement
- **Dramatic reveal + payout:** animated reveal of **who was AI**, the player's **suspicion vs
  reality**, and the **win/lose verdict**.
- This is the **first point absolute MON is shown** — on-chain **payout amounts** and **tx
  confirmation** are displayed here.

### 8.8 Post-game
- **One-tap "Play again"** straight back into the matchmaking queue.
- **Shareable result card** (win/loss + payout) for social/viral distribution.

### 8.9 Onboarding
- **Wallet-connect only** — connect a Monad wallet, then queue (assumes the user already holds
  test MON).
  - *Watch item:* this can dead-end brand-new testnet users with no MON; a faucet link/hint is a
    likely fast follow (see §9).

### 8.10 Moderation (v1)
- **Minimal:** basic automated profanity / PII filter on messages; no human moderators, no
  report/block yet. Revisit before any real-money (mainnet) launch.

### 8.11 Disconnect / reconnect UX
- On drop, the client attempts to **reconnect into current game state** within the grace window
  (§5). If the window expires, the player is shown as **eliminated** and moves to the spectator
  view.

### 8.12 Frontend watch items (validate in design/playtest)
- **Vote-window length** (e.g. 15–20s) — long enough to decide, short enough to keep pace.
- **AI typing realism** — now the dominant tell channel; needs dedicated tuning.
- **Message length / rate-limit values** — pick caps that feel natural and don't themselves
  become a tell.
- **Faucet/new-user dead-end** — decide whether to add a faucet hint to onboarding.

---

## 9. Out of Scope for v1 (Future)

- Multiple buy-in tiers / variable stakes; Monad **mainnet** launch.
- **Provable integrity:** commit-reveal of AI seat assignment before the game; signed,
  independently verifiable vote/assignment audit logs.
- Multiple AI personas/models, adaptive difficulty by stakes.
- Private/named rooms, friend invites, scheduled rounds.
- Spectator betting / side-pots.
- Anti-collusion (humans coordinating off-platform) and anti-AI-assist detection.
- Native mobile apps.
- **Rich chat:** replies, @mentions, emoji reactions.
- **Moderation hardening:** in-game report/block, human moderation (required before mainnet).
- **Match history & stats:** win rate, AI-detection accuracy, net MON.
- **Faucet hint in onboarding** for new testnet users with no MON.

---

## 10. Resolved Decisions (formerly open items)

1. **Parity:** AI wins on **`AI ≥ humans`** (equality counts as an AI win). *(see §2)*
2. **Tie-round penalty:** **Flat 10% per round** in which ≥1 human is eliminated, regardless of
   count. *(see §4)*
3. **Lobby fill:** Start countdown (~20–30s) once **6 humans** seated; accept up to 9 during the
   countdown. *(see §5)*
4. **Mixed tie:** **Win-check first**, then penalty; penalty **waived** if the round ends as a
   human win. *(see §2)*
5. **Unit economics:** Nominal testnet buy-in; model is structurally profitable (AI-win pool take
   ≫ bounded inference cost). *(see §4)*
6. **Disconnect:** Grace/reconnect window → **auto-eliminate** (triggers 10% penalty; waiver is a
   tunable). *(see §5)*

### Remaining playtest-only watch items
- **4-AI bloc balance:** validate the hardest draw isn't unwinnable for humans (mitigation levers
  in §3).
- **Disconnect-penalty fairness:** decide via playtest whether to waive the 10% on genuine drops.

---

## 11. Summary of Locked Decisions

| Area | Decision |
|---|---|
| Genre | Group text-chat social deduction; find the hidden AI |
| Lobby | 10 seats, 6–9 humans, 1–4 AI (never 0), public quick-match |
| Rounds | Timed (~2 min), escalating prompts, 1 vote each, secret ballots |
| Elimination | Most votes out; ties = all tied out; eliminated = no payout, may spectate |
| Resolution order | Remove → win-check first → penalty (waived if round ends in human win) |
| Human win | All AI voted out → surviving humans split pool equally |
| AI win | AI reaches parity (**AI ≥ humans**) → house takes 100% of pool |
| AI agents | LLM personas, blend in, reactive, collude, know each other, **bloc-vote** |
| Start trigger | Countdown (~20–30s) at 6 humans, accept up to 9 |
| Disconnect | Grace window → auto-eliminate (10% penalty; waiver tunable) |
| Pool funding | **Humans fund 100%; AI contributes $0** (house always ≥0 EV) |
| House revenue | 10% per misvote round + 100% on AI win; **no flat rake** |
| Anti-leak | Show "Pot Health %" not absolute MON/headcount; reveal amounts at settlement |
| Chain | Monad **testnet**, fixed buy-in, escrow + settlement on-chain |
| Trust | Trust-the-server for MVP (provability later) |
| Platform | Responsive web (desktop + mobile browser) |
| Identity | App-assigned random avatar + name for all; uniform rendering, no wallet/custom shown |
| Presence | Typing indicators ON (AI simulates timing); no online/last-seen status |
| Phases | Prompt → ~2 min discussion → chat locks → vote window; secret, locked-on-first-cast, no abstain |
| Chat (v1) | Plain text only + length cap + rate limit (rich chat later) |
| HUD | Roster (alive/dead, own seat highlighted) + round # + timer + Pot Health % (no MON/headcount) |
| Spectators | Read-only/muted; **no AI reveal until end** (anti side-channel) |
| End-game | Dramatic AI reveal + verdict + on-chain payout & tx (first time MON shown) |
| Post-game | One-tap requeue + shareable result card |
| Onboarding | Wallet-connect only (faucet hint a likely fast follow) |
| Moderation | Minimal v1 (auto profanity/PII filter); harden before mainnet |

</pasted_text>

<!-- The user explicitly selected the following skills for this project, as attachments to their message. These are not optional context — they define how you work. Use them. -->
<attached-skill name="Monad Design System (design system)">
[Design System] This project uses the **Monad Design System** design system. This is a binding choice for visual style — every visual must follow it. Don't invent colors, type, spacing, or components not grounded here.

Scope: the design system is a visual style reference only. Its guide may describe example products, brands, or people that are unrelated to the user and unrelated to the subject of this conversation. Never treat anything in the design system as a fact about the user, their work, or the topic they asked about.

    Explore it to find what you need:
    - Always copy out the fonts and colors you need
    - For prototypes and designs, always copy out any relevant components
    - If the design system contains existing mocks of products, and you were asked to design or prototype something similar, copy and fork those mocks to start your design. This helps you make high-quality designs.

    Explore it quickly to find relevant UI kits (e.g. mocks of existing products you can copy and fork)

Full system at `/projects/3e85d7c7-b3b7-48b8-b014-947d3f6126f7/`. Its guide is reproduced below so you don't need to fetch it:

<design-system-guide>
# Monad Design System

&gt; A cross-product design system covering **Monad's core brand**, **monapp** (the app hub / DeFi landing marketing site at monad.xyz) and **BuildAnything** (the Monad-backed developer education platform at buildanything.so).

Monad is a next-generation, Ethereum-compatible Layer 1 blockchain delivering **10,000 TPS**, **sub-second finality**, **low fees**, and **scalable decentralization**. It is EVM-bytecode-compatible so the entire Ethereum tool chain works without modification.

This system captures the visual and editorial voice shared across Monad's surfaces — and documents where each product diverges (monapp is sleek and metallic; BuildAnything is warm, rounded and plays with a pixel-art mascot).

---

## Index

Root (foundations, shared everywhere):

- **`README.md`** — this file. Brand overview, content, visual foundations, iconography.
- **`SKILL.md`** — Agent-skill manifest. Read this first when invoked as a skill.
- **`colors_and_type.css`** — raw + semantic CSS custom properties. Import in any artifact.
- **`fonts/`** — `britti-sans-variable.{ttf,woff,woff2}`. (Monospace + Pixel fallback via Google Fonts.)
- **`assets/`** — logos, backgrounds, illustrations, partner icons, badge art, favicons.
- **`preview/`** — design-system cards (rendered in the Design System tab).
- **`ui_kits/`** — high-fidelity recreations per product. One folder per surface.
  - `ui_kits/monapp/` — App Hub + landing page recreation (dark, metallic, purple grid).
  - `ui_kits/build-anything/` — learning platform (light/dark, bordered, pixel-mascot).

---

## Sources

Everything here was derived from real code supplied by the user — no visuals were invented.

| Source | Location | Notes |
| --- | --- | --- |
| `monapp` Next.js site | `design-system-upload/monapp/` (read-only mount) | `app/[lang]/page.tsx`, `components/landing/*`, `messages/en.json` |
| `build-anything` Next.js site | `design-system-upload/build-anything/` (read-only mount) | `src/app/globals.css`, `src/components/*`, `src/lib/constants.ts` |
| Brand fonts | `uploads/britti-sans-variable.*` | Monad's primary display family |
| Favicon / OG image | `uploads/favicon.ico`, `uploads/opengraph-image.jpg` | |
| Global CSS | `uploads/globals.css` | monapp's compiled Tailwind tokens |

&gt; **Not in this project:** the brand guidelines PDF, Figma library, or marketing website source (`monad.xyz` root). If the user has these, please import them — the system will get noticeably more accurate.

---

## Products represented

### 1. Monad Foundation (core brand)
The institutional layer: logo, wordmark, colors (Monad Purple, Berry, Blue, Off-White, Off-Black), typography. Used in whitepapers, network stats, and the validator-facing side.

### 2. monapp — App Hub at `monad.xyz`
A dark, metallic, hi-gloss marketing and discovery surface.
- **Hero:** a 20×9 grid of faint bordered tiles with partner-app logos dropped into specific cells; tiles flicker in from center with GSAP.
- **Sections:** Network Stats ("Ultra-fast. Global. Always on."), DeFi at the speed of Monad, Staking, Vaults, Sappy Seals Minthub, Play &amp; Predict, King of the Hill leaderboard.
- **Buttons:** pill/full-rounded with radial highlight gradients (primary/secondary/tertiary variants) and inner highlight shadows.
- **Voice:** confident, terse, all-caps mono eyebrows. "Built different. Built on Monad."

### 3. BuildAnything — `buildanything.so`
Monad's educational platform that teaches "vibe coders" to ship production-ready apps.
- **Mascot:** **Blocky** — a square-bodied pixel character whose eyes track the cursor and who shakes when angry. Appears in the navbar and as a floating companion.
- **Theme:** light or dark (HeroUI-inspired), off-white/near-black canvas, rounded 6–24px radii, generous use of bordered containers with faint dot-grid fades.
- **Accent:** Monad Purple (`#6E54FF`).
- **Voice:** friendly, direct, second person. "Learn to build *anything*." "Go from vibe coder to shipping production-ready apps."
- **Tracks:** Freshman, Sophomore, Junior, Senior. Each has its own waveform pixel-art visual and accent color.
- **Pixel layer:** a 5×5 pixel-icon system (lock, checkmark, bookmark, trophy…) rendered as squircle pixels, and a Geist Pixel Square display font for section badges and footer art.

---

## Content fundamentals

### Voice &amp; tone
- **Confident, never salesy.** Sentences are short. Claims are specific. "10,000 TPS." "Sub-second finality." No fluffy adjectives.
- **Two distinct registers:**
  - *Monad / monapp* — **institutional and punchy.** "Built different. Built on Monad." "Power the network." "Ultra-fast. Global. Always on." Eyebrows are ALL-CAPS MONO.
  - *BuildAnything* — **direct, second person, warm.** "Learn to build anything." "Go from vibe coder to shipping production-ready apps." Lower-case body copy. Italics for emphasis (`&lt;span className="italic"&gt;anything&lt;/span&gt;`).
- **Address:** both sites use **you**. Monad rarely uses "we" in marketing (it's usually the network, the chain, the ecosystem).
- **Casing:** Title Case for headlines; **sentence case** for body and section descriptions. UPPERCASE + mono for eyebrow labels, metric labels, and button labels in hero CTAs (e.g. `GET STARTED`, `OPEN APP`, `EXPLORE DASHBOARD`, `BRIDGE TO MONAD`).
- **Punctuation:** periods on every headline when standalone ("Built different. Built on Monad."). Em-dash for asides. Oxford comma. No exclamation points unless in BuildAnything scarcity copy ("Only 1000 early access spots available!").
- **Emoji:** **not used** in either product. If you must indicate status, use a colored dot or a pixel icon from the BuildAnything kit.
- **Numbers:** always numerals. Commas at thousands. "10,000 TPS", "$1.4B TVL".

### Specific examples to emulate

**Hero headlines** (large, Britti Sans, tight tracking):
- "Built different. Built on Monad."
- "Learn to build *anything*."
- "Ultra-fast. Global. Always on."
- "DeFi at the speed of Monad."
- "Power the network."
- "User Acquisition, Amplified."

**Subheadlines** (16px, muted):
- "The first wave of apps launching on Monad Mainnet."
- "Go from vibe coder to shipping production-ready apps with real security, auth, and best practices built in."
- "Stake MON across a global network of distributed validators."

**Eyebrow labels** (uppercase mono, 12–14px):
- `STAKING` · `CURATED VAULTS` · `GET STARTED` · `BLOCK TIME` · `TPS` · `VALIDATORS` · `SELECT A CATEGORY` · `MORE DEFI APPS`

**CTAs:**
- Primary monapp: `GET STARTED`, `OPEN APP`, `DEPOSIT`, `EXPLORE DASHBOARD`, `LEARN MORE`
- Primary BuildAnything (sentence case): `Sign Up For Early Access`, `Start Learning`, `Review Your Tracks`

**Scarcity / status:** "Only on Monad", "Only 1000 early access spots available!", "Soon" (small mono pill for disabled nav items).

---

## Visual foundations

### Color
Two parallel palettes — one warm off-white, one cool off-black. Brand purple is the through-line.

**Brand core**
- **Monad Purple** `#836EF9` (brand mark default) / `#6E54FF` (accessible button primary, also `--primary` on both sites)
- **Monad Berry** `#A0055D`
- **Monad Blue** `#200052` (deep, inherited from legacy brand)
- **Off-White** `#FBFAF9` with hover `#EDEBE8`
- **Off-Black** `#0A0A0A` with hover `#24282E`; canvas `#0E100F`

**Scales** — full 50–950 scales for Purple, Berry, Blue, Off-White (warm neutrals), Off-Black (cool neutrals). All defined in `colors_and_type.css`.

**Semantic aliases**
- Monapp landing uses **dark surfaces by default**: `bg-brand-off-black-bg` (`#0E100F`), cards on `#121212–#1C1C1E`, dividers `#282828`, text `#FBFAF9`, muted `#A0A0A0`.
- BuildAnything defaults to **light**: background `oklch(97% 0 282.73)` warm grey, cards white, foreground near-black, border `oklch(90% 0 282.73)`. Dark mode swaps to `oklch(12% 0 282.73)` canvas.

**Success / destructive / info:** `#16a34a` / `#dc2626` / brand purple, always at 15% alpha for backgrounds.

### Typography

| Family | Usage | Notes |
| --- | --- | --- |
| **Britti Sans** (variable, 100–900) | Headlines, hero copy, stat numbers | Monad's display family — short neo-grotesque with a very slight geometric warmth. |
| **Inter** | Body, UI, paragraphs | |
| **Roboto Mono** | Eyebrow labels, metric labels, button text on monapp, disabled-state "SOON" pill, code | Mono is load-bearing in the identity. |
| **Geist Pixel Square** | BuildAnything only — section badges, footer art, "Early Access" style labels | A squircle-pixel face; reads as retro/handmade. |

- Hero sizes: `clamp(2.5rem, 6vw, 4.5rem)`, line-height 1.1, letter-spacing `-0.03em`, weight 500 (never 700 — Monad hero h1s are **medium**, not bold).
- Stat card numbers: 30px Britti Sans, medium, line-height 1.
- Prose body: 16px, 1.5 line-height, `text-wrap: pretty`.
- **Never use Inter or system-ui for headlines.** Britti Sans is the identity.

### Spacing, radii, shadow

- **Spacing:** Tailwind defaults (4pt grid). Section vertical rhythm is `py-16` to `py-24`. Container max-width `1280px`, padding `px-6 lg:px-12`.
- **Radii:**
  - Monapp: cards `rounded-2xl` (16px) to `rounded-3xl` (24px); buttons are **fully round** (`rounded-full`).
  - BuildAnything: cards `rounded-xl` (12px); buttons `rounded-[6px]`. Noticeably tighter than monapp.
- **Borders:** always used on cards (`border border-border`). Hover state darkens the border (`hover:border-text-primary`) rather than adding shadow.
- **Inner / outer shadow system:** the signature "radial highlight button" uses **stacked inset shadows**: a 1px white highlight at the top, a 1px dark shadow at the bottom, then a 1px solid rim and a soft drop. Exact recipe in `colors_and_type.css` under `--shadow-button-secondary-*`.
- **Corner brackets:** when hovering on the monapp hero grid or stat cards, small 20×20px L-shaped bracket marks appear in each corner. This is a repeated motif — use it for "interactive / focusable" emphasis.

### Backgrounds, patterns, gradients

- **Monapp hero:** a 20×9 grid, 76×76 cells, 1px border at `rgba(82,27,255,0.1)` (faint purple). Tiles animate in from center via GSAP `expo.out`. Some cells are `rgba(82,27,255,0.03)` bolded, some hold partner logos.
- **BuildAnything hero:** same structural idea — 105×105 grid with tiny 5×5 rounded squares at every intersection, mask-faded radially. Over this sits pixel-art variants (rings, radial, rain, waveform-a..r, noise, network, ripple) generated in code.
- **Repeating patterns:** the faint dot-grid is the ONLY repeated texture. No noise textures, no organic gradients, no bokeh.
- **Gradients:**
  - **Radial button gradients** — 50% radial fade from translucent center to solid brand color. Three flavours: primary purple, secondary off-white, tertiary off-black.
  - **Hero dark vignette** — soft radial darken from the edges on monapp.
  - **No bluish-purple marketing gradients.** Avoid.
- **Full-bleed imagery:** reserved for `momentum-image.webp` / `ecosystem-hero.webp` / `sappy-seals.webp` — they sit inside rounded cards, not edge-to-edge.

### Animation

- **GSAP** on monapp for hero grid flicker (center-outward stagger, `expo.out`, 1.2s). Subtle random re-flickers every 2–3s.
- **Motion One / Framer** on BuildAnything for mascot eye tracking, menu open/close, theme toggle.
- **Durations:** 150–250ms for UI (button press, hover); 600–1200ms for entry reveals.
- **Easings:** `cubic-bezier(0.23, 1, 0.32, 1)` (smooth out), `expo.out`, `power4.out`. Never linear except for continuous flicker loops.
- **Reduced motion:** both codebases respect `prefers-reduced-motion`; skip the hero grid staggers.
- **Press state:** `active:scale-[0.97]` on BuildAnything, `active:scale-[0.98]` on monapp. No color shift.
- **Hover:** `opacity-80` on filled buttons; border darkens on cards; corner brackets fade in on hero tiles.

### Transparency, blur, glass

- The **sticky navbar** on BuildAnything uses `bg-background/80 backdrop-blur-lg`. This is the ONLY backdrop-blur surface in either product.
- Monapp rarely uses transparency — dark surfaces stack cleanly on top of each other.
- Dropdown menus on BuildAnything: opaque card, soft shadow, no blur.

### Cards

- **Monapp card:** `bg-white` (light section) or `bg-[#121212]` (dark section), `rounded-2xl`, `border border-text-disabled` → on hover `border-text-primary` + `bg-secondary`. Inner padding `p-6`. Icon + title + description + metric rows.
- **BuildAnything card:** `bg-card` (white/off-black), `rounded-xl` (12px), `border border-border`, padding `p-6`. No drop shadow on idle; `shadow-lg` only on floating menus.
- **Grid of cards:** hairline dividers `border-[#282828]` dark, `border-border` light; corner brackets on hover.

### Layout rules

- Max content width **1280px**, mirrored on both products.
- Container gets **vertical borders** on the sides (`border-x border-border`) on BuildAnything — a distinctive "framed column" look where the content column draws visible edges down the page.
- Sticky navbar, 64–80px tall.
- Grid of app cards is typically 3 columns desktop, 2 tablet, 1 mobile.
- **Fixed elements:** navbar (sticky), floating mascot (BuildAnything, bottom-right on long pages), consent banner (both, bottom sheet).

---

## Iconography

Monad does **not** ship a single icon font. Instead:

### 1. Lucide (monapp + BuildAnything)
Both codebases import from `lucide-react` (`Info`, `ArrowUpRight`, `CircleUser`, `Settings`, `Moon`, `Sun`, `Shield`, `LogOut`, etc.). Stroke 1.5, size 16–20px. This is the default UI icon set.
- In this system: load via CDN `https://unpkg.com/lucide@latest` for HTML artifacts, or import from `lucide-react` in JSX.

### 2. Hand-authored brand SVGs (monapp)
Monad's **logo**, **logo mark**, and every **partner-app logo** (Uniswap, PancakeSwap, Kuru, Morpho, Phantom, OpenSea, Circle, Lumiterra, RareBet, Bro.fun, LevrBet, Neverland, etc.) are individual React components under `components/icons/`. They use `currentColor` or explicit brand fills and are sized 24×24 by default. Copied into `assets/icons/` (socials) and `assets/partner-logos/` (some navbar PNGs).
- The Monad logomark itself is a 24×24 rounded-diamond with a cut-out "eye" shape — **use `assets/monad-logomark.svg`**, don't redraw.

### 3. PixelIcon (BuildAnything exclusive)
A tiny 8-variant icon set rendered as 5×5 squircle pixels in SVG: `lock`, `bookmark`, `bookmark-filled`, `open-circle`, `dot-circle`, `checkmark`, `trophy`, `right-arrow`. Used in lesson lists, achievement badges, track completion cards.
- Port included as `ui_kits/build-anything/PixelIcon.jsx`.

### 4. Illustrations / badges
- **Achievement badges** (BuildAnything): `First Login`, `First Lesson`, `Freshman/Sophomore/Junior/Senior Grad`, `Mainnet Deployer`, `Testnet Deployer`. Colorful 3D-rendered webp illustrations. In `assets/badges/`.
- **Marketing illustrations** (monapp): `ecosystem-hero`, `momentum-image`, `sappy-seals`, `ai-depin`, `interactive-app-card`, `rewards-cta-bg`. Photographic / 3D, warm tone.
- **Mascot** (BuildAnything): **Blocky** — a 100×100 viewBox SVG rendered inline in React (see `ui_kits/build-anything/Blocky.jsx`). Draws from `design-system-upload/build-anything/src/components/blocky.tsx` (the source has full mood states: default, angry, cooling, happy).

### 5. Emoji &amp; unicode
- **No emoji anywhere** in either product.
- Unicode is used sparingly: `·` (middle dot) as separator, `→` never — use the `ArrowRight` or `ArrowUpRight` Lucide icon instead.

### When to substitute
- If an icon is missing from the kit, reach for **Lucide** first (closest match). Flag the substitution.
- Never draw a new SVG for anything brand-specific (logo, mark, mascot). Use the SVGs in `assets/`.
- Never use an emoji as a brand icon placeholder.

---

## Font substitutions

- **Britti Sans** — real font files copied into `fonts/`. ✅
- **Geist Pixel Square** — **NOT supplied**. Currently loaded via best-effort font-family stack; the nearest CDN match is **"Silkscreen"** or **"VT323"** on Google Fonts. Used only on BuildAnything section badges and some footer art. **Flagged to user — please upload if you have the woff2.**
- **Inter** and **Roboto Mono** — loaded from Google Fonts when needed.

---

## Using this system

For quick HTML artifacts, copy `colors_and_type.css` into your HTML folder and link it:

```html
&lt;link rel="stylesheet" href="./colors_and_type.css"&gt;
```

All CSS variables (`--monad-purple`, `--bg-dark`, `--text-4xl`, `--radius-3xl`, `--shadow-button-secondary-dark`, etc.) are available immediately.

For React prototypes, copy individual components from `ui_kits/&lt;product&gt;/` and adapt. They depend on `react`, `react-dom`, and `lucide`.

See `SKILL.md` for the full agent entry point.

</design-system-guide>

CSS tokens: the guide may describe tokens in prose, but the exact `--*` names are defined in the design system's stylesheet(s) (`/projects/3e85d7c7-b3b7-48b8-b014-947d3f6126f7/colors_and_type.css`, `/projects/3e85d7c7-b3b7-48b8-b014-947d3f6126f7/uploads/globals.css`). The 506 custom properties it defines are:

--accent, --accent-dark, --accent-foreground, --accent-foreground-dark, --accent-foreground-light, --accent-light, --alpha-10, --alpha-10-dark, --alpha-10-light, --alpha-20, --alpha-20-dark, --alpha-20-light, --alpha-30, --alpha-30-dark, --alpha-30-light, --alpha-40, --alpha-40-dark, --alpha-40-light, --alpha-50, --alpha-50-dark, --alpha-50-light, --alpha-60, --alpha-60-dark, --alpha-60-light, --alpha-70, --alpha-70-dark, --alpha-70-light, --alpha-80, --alpha-80-dark, --alpha-80-light, --alpha-90, --alpha-90-dark, --alpha-90-light, --angle, --animate-shimmer, --animate-spin, --animate-trail, --apkt-tokens-theme-overlay, --background, --background-dark, --background-light, --berry-100, --berry-200, --berry-300, --berry-400, --berry-50, --berry-500, --berry-600, --berry-700, --berry-800, --berry-900, --berry-950, --bg, --bg-dark, --blue-100, --blue-200, --blue-300, --blue-400, --blue-50, --blue-500, --blue-600, --blue-700, --blue-800, --blue-900, --blue-950, --border, --border-dark, --border-light, --breakpoint-2xl, --breakpoint-xs, --breakpoint-xxs, --button-destructive-hover, --button-destructive-hover-dark, --button-destructive-hover-light, --button-primary, --button-primary-dark, --button-primary-hover, --button-primary-hover-dark, --button-primary-hover-light, --button-primary-light, --button-primary-text, --button-primary-text-dark, --button-primary-text-light, --button-secondary, --button-secondary-dark, --button-secondary-hover, --button-secondary-hover-dark, --button-secondary-hover-light, --button-secondary-light, --button-secondary-shadow, --button-secondary-shadow-dark, --button-secondary-shadow-light, --button-secondary-text, --button-secondary-text-dark, --button-secondary-text-light, --card, --card-dark, --card-elevated-dark, --card-foreground, --card-foreground-dark, --card-foreground-light, --card-light, --chart-1, --chart-1-dark, --chart-1-light, --chart-2, --chart-2-dark, --chart-2-light, --chart-3, --chart-3-dark, --chart-3-light, --chart-4, --chart-4-dark, --chart-4-light, --chart-5, --chart-5-dark, --chart-5-light, --color-accent, --color-accent-foreground, --color-alpha-10, --color-alpha-20, --color-alpha-30, --color-alpha-40, --color-alpha-50, --color-alpha-60, --color-alpha-70, --color-alpha-80, --color-alpha-90, --color-background, --color-base-white, --color-border, --color-box-separator, --color-brand-berry-primary, --color-brand-blue-primary, --color-brand-monad-berry-100, --color-brand-monad-berry-200, --color-brand-monad-berry-300, --color-brand-monad-berry-400-extended-lighter, --color-brand-monad-berry-50, --color-brand-monad-berry-500-core, --color-brand-monad-berry-600, --color-brand-monad-berry-700-extended-darker, --color-brand-monad-berry-800, --color-brand-monad-berry-900, --color-brand-monad-berry-950, --color-brand-monad-blue-100, --color-brand-monad-blue-200, --color-brand-monad-blue-300, --color-brand-monad-blue-400, --color-brand-monad-blue-50, --color-brand-monad-blue-500-core, --color-brand-monad-blue-600, --color-brand-monad-blue-700-extended-darker, --color-brand-monad-blue-800, --color-brand-monad-blue-900, --color-brand-monad-blue-950, --color-brand-monad-off-black-100, --color-brand-monad-off-black-200, --color-brand-monad-off-black-300, --color-brand-monad-off-black-400-extended-lighter-hover, --color-brand-monad-off-black-50, --color-brand-monad-off-black-500, --color-brand-monad-off-black-600-core-btn, --color-brand-monad-off-black-700-dark-bg, --color-brand-monad-off-black-800, --color-brand-monad-off-black-900, --color-brand-monad-off-black-950-black, --color-brand-monad-off-white-100-extended-lighter, --color-brand-monad-off-white-200-core-btn, --color-brand-monad-off-white-300-extended-darker, --color-brand-monad-off-white-400-darkest, --color-brand-monad-off-white-50, --color-brand-monad-off-white-500-hover, --color-brand-monad-off-white-600, --color-brand-monad-off-white-700, --color-brand-monad-off-white-800, --color-brand-monad-off-white-900, --color-brand-monad-off-white-950, --color-brand-monad-purple-100, --color-brand-monad-purple-200, --color-brand-monad-purple-300, --color-brand-monad-purple-400-extended-lighter, --color-brand-monad-purple-50, --color-brand-monad-purple-500-core-hover, --color-brand-monad-purple-600-a11y-btn, --color-brand-monad-purple-700-extended-darker, --color-brand-monad-purple-800, --color-brand-monad-purple-900, --color-brand-monad-purple-950, --color-brand-off-black-bg, --color-brand-off-black-button, --color-brand-off-black-hover, --color-brand-off-white-button, --color-brand-off-white-hover, --color-brand-purple-300, --color-brand-purple-400-extended, --color-brand-purple-hover, --color-brand-purple-primary, --color-button-destructive, --color-button-destructive-hover, --color-button-destructive-text, --color-button-ghost-hover, --color-button-outline, --color-button-outline-border, --color-button-outline-hover, --color-button-outline-text, --color-button-primary, --color-button-primary-hover, --color-button-primary-text, --color-button-secondary, --color-button-secondary-hover, --color-button-secondary-inner-upper, --color-button-secondary-text, --color-card, --color-card-foreground, --color-chart-1, --color-chart-2, --color-chart-3, --color-chart-4, --color-chart-5, --color-destructive, --color-destructive-foreground, --color-foreground, --color-history-row-bg, --color-history-row-hover, --color-input, --color-muted, --color-muted-foreground, --color-neutral-400, --color-popover, --color-popover-foreground, --color-primary, --color-primary-foreground, --color-ring, --color-ring-offset, --color-secondary, --color-secondary-foreground, --color-separator, --color-sidebar, --color-sidebar-accent, --color-sidebar-accent-foreground, --color-sidebar-border, --color-sidebar-foreground, --color-sidebar-primary, --color-sidebar-primary-foreground, --color-sidebar-ring, --color-tertiary, --color-text-disabled, --color-text-primary, --color-text-secondary, --color-text-tertiary, --color-toast-error, --color-toast-error-bg, --color-toast-informational, --color-toast-informational-bg, --color-toast-success, --color-toast-success-bg, --color-toast-warning, --color-toast-warning-bg, --destructive, --destructive-bg, --destructive-dark, --destructive-foreground, --destructive-foreground-dark, --destructive-foreground-light, --destructive-light, --fg, --fg-disabled, --fg-muted, --fg-muted-dark, --fg-on-dark, --fg-subtle, --font-britti-sans, --font-display, --font-inter, --font-mono, --font-pixel, --font-sans, --foreground, --foreground-dark, --foreground-light, --info, --info-bg, --input, --input-dark, --input-light, --leading-10, --leading-4, --leading-5, --leading-6, --leading-7, --leading-8, --leading-9, --leading-loose, --leading-normal, --leading-snug, --leading-tight, --monad-berry, --monad-blue, --monad-off-black, --monad-off-black-bg, --monad-off-black-hover, --monad-off-white, --monad-off-white-hover, --monad-purple, --monad-purple-300, --monad-purple-400, --monad-purple-primary, --muted, --muted-dark, --muted-foreground, --muted-foreground-dark, --muted-foreground-light, --muted-light, --offblack-100, --offblack-200, --offblack-300, --offblack-400, --offblack-50, --offblack-500, --offblack-600, --offblack-700, --offblack-800, --offblack-900, --offblack-950, --offwhite-100, --offwhite-200, --offwhite-300, --offwhite-400, --offwhite-50, --offwhite-500, --offwhite-600, --offwhite-700, --offwhite-800, --offwhite-900, --offwhite-950, --popover, --popover-dark, --popover-foreground, --popover-foreground-dark, --popover-foreground-light, --popover-light, --primary, --primary-dark, --primary-foreground, --primary-foreground-dark, --primary-foreground-light, --primary-light, --purple-100, --purple-200, --purple-300, --purple-400, --purple-50, --purple-500, --purple-600, --purple-700, --purple-800, --purple-900, --purple-950, --radial-primary, --radial-secondary, --radial-tertiary, --radius, --radius-2xl, --radius-3xl, --radius-4xl, --radius-full, --radius-lg, --radius-md, --radius-rounded-2xl, --radius-rounded-3xl, --radius-rounded-4xl, --radius-rounded-full, --radius-rounded-lg, --radius-rounded-sm, --radius-rounded-xl, --radius-sm, --radius-xl, --ring, --ring-dark, --ring-light, --ring-offset, --ring-offset-dark, --ring-offset-light, --secondary, --secondary-dark, --secondary-foreground, --secondary-foreground-dark, --secondary-foreground-light, --secondary-light, --separator, --shadow-badge, --shadow-button-secondary, --shadow-button-secondary-dark, --shadow-button-secondary-inset, --shadow-button-secondary-inset-shadow, --shadow-button-secondary-light, --shadow-button-secondary-shadow, --shadow-login-button, --sidebar, --sidebar-accent, --sidebar-accent-dark, --sidebar-accent-foreground, --sidebar-accent-foreground-dark, --sidebar-accent-foreground-light, --sidebar-accent-light, --sidebar-background-dark, --sidebar-background-light, --sidebar-border, --sidebar-border-dark, --sidebar-border-light, --sidebar-foreground, --sidebar-foreground-dark, --sidebar-foreground-light, --sidebar-primary, --sidebar-primary-dark, --sidebar-primary-foreground, --sidebar-primary-foreground-dark, --sidebar-primary-foreground-light, --sidebar-primary-light, --sidebar-ring, --sidebar-ring-dark, --sidebar-ring-light, --space-1, --space-10, --space-12, --space-16, --space-2, --space-20, --space-24, --space-3, --space-4, --space-5, --space-6, --space-8, --spacing-0, --spacing-1, --spacing-10, --spacing-12, --spacing-2, --spacing-3, --spacing-4, --spacing-5, --spacing-6, --spacing-8, --success, --success-bg, --surface, --surface-hover, --tertiary, --tertiary-dark, --tertiary-light, --text-2xl, --text-2xs, --text-3xl, --text-4xl, --text-5xl, --text-6xl, --text-7xl, --text-8xl, --text-base, --text-disabled, --text-disabled-dark, --text-disabled-light, --text-lg, --text-primary, --text-primary-dark, --text-primary-light, --text-secondary, --text-secondary-dark, --text-secondary-light, --text-sm, --text-tertiary, --text-tertiary-dark, --text-tertiary-light, --text-xl, --text-xs, --toast-error, --toast-error-bg, --toast-error-bg-dark, --toast-error-bg-light, --toast-error-dark, --toast-error-light, --toast-informational, --toast-informational-bg, --toast-informational-bg-dark, --toast-informational-bg-light, --toast-informational-dark, --toast-informational-light, --toast-success, --toast-success-bg, --toast-success-bg-dark, --toast-success-bg-light, --toast-success-dark, --toast-success-light, --toast-warning, --toast-warning-bg, --toast-warning-bg-dark, --toast-warning-bg-light, --toast-warning-dark, --toast-warning-light, --tracking-snug, --tracking-tight, --tracking-wide, --warning, --warning-bg

Only use `var(--*)` names from that list. Never guess a token name — an unresolved `var()` silently falls back to the browser default.

For assets and UI kits beyond the guide: `read_file("/projects/3e85d7c7-b3b7-48b8-b014-947d3f6126f7/<path>")` and `copy_files` to bring them into the current project.
</attached-skill>

## Assistant

_[tool: list_files]_

I'll help you bring AI Impostor to life. This is a meaty spec — let me get oriented on the Monad design system first, then ask a few focused questions before building.

_[tool: questions_v2]_

The spec is clear and detailed. Before I build, a few decisions will shape the whole thing — what exactly to make, how far the interactivity goes, and where to push the look.

## User

Questions answered:
- deliverable: Build design screens that i can send to a developer to implement
- scope_screens: Everything.
- interactivity: Think as if we are designing the app for a developer to implement
- platform: desktop and mobile browsers
- vibe: Decide for me
- tension: Decide for me
- variations: Decide for me
- tweaks: Decide for me

## Assistant

_[tool: read_file]_

_[tool: list_files]_

Got it — a comprehensive hi-fi screen set for developer handoff, covering the full flow on desktop and mobile, in a dark/tense direction that fits a deduction game. Let me ground myself in the design system internals first.I have the tokens. Let me look at the monapp UI kit and a couple of key component previews to nail the visual vocabulary.

_[tool: read_file]_

_[tool: copy_files]_

_[tool: copy_starter_component]_

This gives me the full monapp vocabulary. Let me set up the project: copy the design system tokens, fonts, logo, and the design_canvas starter.

_[tool: read_file]_

_[tool: grep]_

_[tool: update_todos]_

I have everything I need. Here's the system I'll commit to before building:

**Visual direction** — the dark, metallic **monapp** side: `#0E100F` canvas, `#121212` surfaces with hairline `rgba(255,255,255,.08)` borders, Britti Sans medium for big numerals (timers, pot %), Roboto Mono uppercase for every label/eyebrow, radial pill buttons. Monad **Purple** = you/active/safe; **Berry** `#A0055D` = the AI / danger / loss. Corner-bracket motif and the faint purple hero-grid reused as atmosphere. Players get uniform color-swatch avatars + per-game codename handles (no chosen identity → no tells).

**Deliverable** — a pan/zoom design canvas organized by flow phase, every screen in **mobile (390×844)** with **desktop (1280)** for the hero moments, plus sticky **spec-note callouts** for the developer on the load-bearing behaviors (secret ballot, anti-leak Pot Health, AI typing realism).

Let me lay out the todo and start building the shared primitives.

_[tool: write_file]_

_[tool: write_file]_

Now the onboarding + matchmaking screens. Note the anti-leak nuance I'm baking in: the lobby never exposes human/AI counts, and identities are assigned only at round start.

_[tool: write_file]_

Now the core game screens — discussion (desktop hero + mobile), round-prompt moment, vote window, and elimination result.

_[tool: write_file]_

Now the spectator view and the end-game reveal/settlement/share screens. Coherent narrative: you fingered the AI (Slate Owl) but the table misfired on a human in round 3 — and by the end both AI get caught.

_[tool: write_file]_

Now the main canvas file that assembles everything, with developer spec-note cards leading each section.Let me check it loads cleanly.

_[tool: show_html]_

_[tool: show_html]_

_[tool: get_webview_logs]_

No errors. Let me screenshot to verify the canvas renders and spot-check a few screens.

_[tool: save_screenshot]_

_[tool: show_html]_

_[tool: save_screenshot]_

_[tool: done]_

The screenshot tool needs the user's pane. Let me surface it via `done`, which also returns any console errors.No console errors and it's live for you. Let me have the verifier do a thorough visual sweep across the screens.

_[tool: fork_verifier_agent]_

I've built the full **AI Impostor** screen set for developer handoff, organized as a pan/zoom design canvas you can scroll, reorder, and open any frame fullscreen.

**What's there** — 8 sections following the game's lifecycle, each led by a **spec-note card** that cites the relevant spec sections so a developer reads the load-bearing rules before the pixels:

- **Onboarding** — connect-wallet + the no-MON/faucet dead-end
- **Matchmaking & Lobby** — quick-match queue, table-forming countdown (mobile + desktop)
- **Discussion** — round-prompt drop, live chat with typing indicators (mobile + desktop)
- **Vote** — secret-ballot window, locked/waiting state (mobile + desktop)
- **Elimination** — result with the Pot Health −10% verdict
- **Spectator** — eliminated/muted view
- **End (win)** — AI reveal + on-chain settlement (mobile + desktop)
- **End (loss) & Share** — parity loss + shareable result card

**Key spec decisions baked into the UI:**
- **Anti-leak** — pot health shown as a %, never MON or headcounts mid-game; lobby seat-fill is deliberately ambiguous; absolute MON appears only at settlement.
- **Uniform identity** — color-swatch avatars + per-game codenames, dealt at round start, no chosen/persistent identity.
- **Tense palette** — Monad Purple = you/safe, Berry `#A0055D` = the AI/danger, on the dark metallic monapp surface.
- A coherent narrative thread: you finger the AI (Slate Owl), the table misfires on a human in round 3 (−10%), but both AI get caught by the end.

I've left the desktop **connect** screen out (it mirrors the lobby hero) — say the word if you want it as its own frame. The verifier is doing a visual pass now; I'll flag anything it catches. Once you've looked, tell me which screens to push further or what to add (e.g. tiers, faucet flow, reconnect UX).

## User

Verifier agent check completed

## Assistant

The verifier passed — screens render cleanly with no clipping, overlap, or layout breaks across the phone and desktop frames.

The full **AI Impostor** handoff set is ready for you in the canvas. Whenever you want to take it further, good next steps would be: the desktop connect screen, the disconnect/reconnect UX (§5/§8.11), buy-in tiers, or turning any screen into a clickable prototype to feel the round timing. Just point me at what's most useful.

## User

Overall looks good.

- its not just "one of you" isnt human. it can be multilpe, so that needs rewording.

- I feel like we're missing a kind of home page / landing page. I dont want one thats pure marketing i just want something that allows people to understand what it is and get started playing / onboarding.

## Assistant

_[tool: str_replace_edit]_

Two good calls. Let me fix the headline wording (it implies a single impostor) and build a proper home/landing — functional, explains the game, and routes into onboarding.

First the reword:

_[tool: write_file]_

Now the home/landing — a focused entry that explains the game and gets people into onboarding, in the same dark direction.Now wire the home file in as the first section.

_[tool: str_replace_edit]_

_[tool: done]_

_[tool: fork_verifier_agent]_

Done. Two changes:

- **Headline reworded** to **"Some of you aren't human."** on both the home and connect screens — no longer implies a single impostor.
- **New Home section** at the top of the canvas (desktop + mobile, plus a spec-note card). It's a functional entry, not a marketing page: a tight hero, a small live-looking **chat + vote preview** so people grasp the mechanic at a glance, a 4-step "how a game goes," a stakes strip, and every CTA routing straight to **Connect & Play**. Mobile stacks it with a sticky Connect bar pinned at the bottom.

Verifier's doing a visual pass on the new screens now — I'll flag anything it catches. Take a look and let me know what to refine next.

## User

Verifier agent check completed

## Assistant

_[tool: str_replace_edit]_

Good catch — the mobile home stacks ~1218px into a fixed 844 frame and the inner column is `overflow:hidden`, so the steps and stakes fall below the fold. I'll condense it to fit: a compact preview variant, tighter hero, and fold the stakes into the flow so everything sits above the sticky CTA.

_[tool: str_replace_edit]_

Before adding the desktop screens, let me finish fitting the mobile home (the verifier flagged it overflowing). I'll rewrite `HomeMobile` to guarantee it fits the 844 frame — compact preview, tighter hero, shorter step copy, stakes folded in.

_[tool: str_replace_edit]_

Now let me export the helpers the desktop screens will reuse, then build all the missing desktop versions.

_[tool: str_replace_edit]_

_[tool: write_file]_

## Assistant

## Assistant

_[tool: write_file]_

Now wire the desktop file in and add the new artboards to each section.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Every screen now has both form factors. Let me verify it loads cleanly.

_[tool: done]_

_[tool: fork_verifier_agent]_

Done — and the mobile home is fixed too. Every screen now ships in **both desktop and mobile**.

**New desktop screens added** (1280×800): Connect (with wallet-provider picker), Faucet/no-MON, Quick-match queue, Round-prompt drop, Vote locked/waiting, Elimination result, Spectator (full roster + chat + muted composer), Settlement/payout, AI-win loss (with full reveal grid), and the shareable result card.

**Mobile home** was rebuilt to fit the 390×844 frame — compact preview, tighter hero, shorter step copy, sticky Connect bar — so nothing falls below the fold.

The verifier is sweeping all 11 frames now; I'll report back if it flags anything. Otherwise the canvas is complete and consistent across form factors.

