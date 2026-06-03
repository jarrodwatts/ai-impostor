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
