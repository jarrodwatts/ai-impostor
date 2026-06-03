// screens-game.jsx — Discussion + Vote + Elimination
// Depends on screens-shared.jsx globals.

// round-3 transcript (casual, lowercase, plausibly human / plausibly not)
const CHAT = [
  { p: 4, text: "i called my teacher 'mom' in grade 4 and genuinely wanted to evaporate" },
  { p: 9, text: 'walked face-first into a glass door at an apple store. the staff clapped' },
  { p: 1, text: 'tripped going UP the stairs at a wedding. going UP', you: true },
  { p: 6, text: "i'd rather not get into it honestly" },
  { p: 8, text: 'texted a rant about my manager… to my manager. read receipt and everything' },
];

function alive(idx) { return ![7, 10].includes(idx); } // RUST HARE(7) + ASH VOLE(10) out

// ── Roster row ──────────────────────────────────────────────────────
function RosterRow({ p, dead, you, dim }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 12,
      background: you ? C.purpleSoft : 'transparent',
      border: `1px solid ${you ? 'rgba(131,110,249,0.3)' : 'transparent'}`,
      opacity: dead ? 0.45 : 1,
    }}>
      <Avatar p={p} size={34} dead={dead} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ font: `500 12px/1.2 ${MONO}`, letterSpacing: '0.04em', color: dead ? C.faint : C.text, textDecoration: dead ? 'line-through' : 'none' }}>
          {p.name}{you ? ' · YOU' : ''}
        </div>
      </div>
      {dead
        ? <Eyebrow color={C.faint} style={{ fontSize: 8 }}>OUT</Eyebrow>
        : <span style={{ width: 7, height: 7, borderRadius: 9999, background: C.green, boxShadow: `0 0 0 3px rgba(22,163,74,0.18)` }} />}
    </div>
  );
}

// ════════════════════════════ DISCUSSION — DESKTOP ════════════════════════
function GameDesktop() {
  return (
    <Screen>
      {/* top bar */}
      <div style={{ height: 60, flex: '0 0 60px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 28px', borderBottom: `1px solid ${C.lineSoft}`, background: C.bg }}>
        <Brand size={16} sub={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <RoundPill round={3} phase="DISCUSSION" />
          <Timer t="1:43" label="DISCUSSION ENDS" />
        </div>
        <div style={{ justifySelf: 'end' }}><PotHealth pct={90} compact /></div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '288px 1fr', minHeight: 0 }}>
        {/* roster */}
        <div style={{ borderRight: `1px solid ${C.lineSoft}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 2, background: '#0C0E0D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px 12px' }}>
            <Eyebrow color={C.faint}>TABLE</Eyebrow>
            <Eyebrow color={C.faint}>8 ALIVE · 2 OUT</Eyebrow>
          </div>
          {PLAYERS.map((p, i) => <RosterRow key={p.id} p={p} dead={!alive(i + 1)} you={p.you} />)}
          <div style={{ marginTop: 'auto', padding: 12, font: `400 11px/1.45 ${SANS}`, color: C.faint, borderTop: `1px solid ${C.lineSoft}` }}>
            Everyone is shown the same way — no wallet, no history, no badges. The only tell is how they talk.
          </div>
        </div>
        {/* chat */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          <div className="ai-scrollcol" style={{ flex: 1, overflow: 'hidden', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ChatMsg system text="Describe a time you genuinely embarrassed yourself." />
            {CHAT.map((m, i) => <ChatMsg key={i} p={PLAYERS[m.p - 1]} text={m.text} you={m.you} />)}
            <TypingRow p={PLAYERS[2]} />
          </div>
          {/* composer */}
          <div style={{ flex: '0 0 auto', padding: '16px 32px 22px', borderTop: `1px solid ${C.lineSoft}` }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1, height: 48, borderRadius: 12, background: C.bgRaise, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 16px', font: `400 14px/1 ${SANS}`, color: C.faint }}>
                Say something human…
              </div>
              <Btn variant="primary">SEND</Btn>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, padding: '0 2px' }}>
              <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint }}>0 / 240</span>
              <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint }}>Plain text · slow down between messages</span>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ ROUND PROMPT — MOBILE ═══════════════════════
function PromptMobile() {
  return (
    <Phone>
      <GridBG opacity={0.7} fade="ellipse 80% 60% at 50% 40%, black 0%, transparent 72%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 26px 30px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <RoundPill round={3} phase="STARTING" />
          <Timer t="2:00" label="" />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
          <Eyebrow color={C.purple}>ROUND 3 · PROMPT</Eyebrow>
          <h1 style={{ margin: 0, font: `500 34px/1.15 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>
            “Describe a time you genuinely embarrassed yourself.”
          </h1>
          <p style={{ margin: 0, font: `400 14px/1.5 ${SANS}`, color: C.muted, maxWidth: 280 }}>
            The prompts get more revealing each round. You have two minutes. Watch who dodges.
          </p>
          <div style={{ display: 'flex', gap: -8 }}>
            {[1, 5, 9, 4, 8].map((n, i) => (
              <div key={n} style={{ marginLeft: i ? -10 : 0 }}><Avatar p={PLAYERS[n - 1]} size={36} ring={C.bg} /></div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', font: `400 12px/1.4 ${SANS}`, color: C.faint }}>
          Chat unlocks now · typing indicators are on for everyone
        </div>
      </div>
    </Phone>
  );
}

// ════════════════════════════ DISCUSSION — MOBILE ═════════════════════════
function GameMobile() {
  return (
    <Phone>
      {/* sticky header */}
      <div style={{ flex: '0 0 auto', padding: '8px 18px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundPill round={3} phase="DISCUSSION" />
          <Timer t="1:43" label="" />
        </div>
        {/* roster strip */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflow: 'hidden' }}>
          {PLAYERS.slice(0, 8).map((p, i) => (
            <div key={p.id} style={{ position: 'relative', opacity: alive(i + 1) ? 1 : 0.4 }}>
              <Avatar p={p} size={32} dead={!alive(i + 1)} ring={p.you ? C.purple : undefined} />
            </div>
          ))}
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`, display: 'grid', placeItems: 'center', font: `500 11px/1 ${MONO}`, color: C.faint, flex: '0 0 auto' }}>+2</div>
        </div>
      </div>
      {/* chat */}
      <div className="ai-scrollcol" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 16px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <ChatMsg system text="Describe a time you genuinely embarrassed yourself." />
        {CHAT.slice(0, 4).map((m, i) => <ChatMsg key={i} p={PLAYERS[m.p - 1]} text={m.text} you={m.you} />)}
        <TypingRow p={PLAYERS[2]} />
      </div>
      {/* composer + pot health */}
      <div style={{ flex: '0 0 auto', borderTop: `1px solid ${C.lineSoft}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', borderBottom: `1px solid ${C.lineSoft}` }}>
          <Eyebrow color={C.faint} style={{ fontSize: 9 }}>POT HEALTH</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} style={{ width: 5, height: 12, borderRadius: 1, background: i < 9 ? C.purple : 'rgba(255,255,255,0.1)' }} />
              ))}
            </div>
            <span style={{ font: `500 15px/1 ${DISP}`, color: C.purple }}>90%</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px 18px' }}>
          <div style={{ flex: 1, height: 44, borderRadius: 12, background: C.bgRaise, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', font: `400 14px/1 ${SANS}`, color: C.faint }}>
            Say something human…
          </div>
          <Btn variant="primary" style={{ height: 44, padding: '0 18px' }}>SEND</Btn>
        </div>
      </div>
    </Phone>
  );
}

// ── selectable vote target ──────────────────────────────────────────
function VoteTarget({ p, selected }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px',
      borderRadius: 14, cursor: 'pointer', position: 'relative',
      background: selected ? C.berrySoft : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${selected ? C.berryHi : C.line}`,
    }}>
      <Avatar p={p} size={44} ring={selected ? C.berryHi : undefined} />
      <span style={{ font: `500 10px/1.1 ${MONO}`, letterSpacing: '0.04em', color: selected ? C.berryHi : C.muted, textAlign: 'center' }}>{p.name}</span>
      {selected && (
        <div style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9999, background: C.berryHi, display: 'grid', placeItems: 'center' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════ VOTE — MOBILE ═══════════════════════════════
function VoteMobile() {
  const aliveP = PLAYERS.filter((_, i) => alive(i + 1) && !PLAYERS[i].you);
  return (
    <Phone>
      <div style={{ flex: '0 0 auto', padding: '10px 18px 14px', borderBottom: `1px solid ${C.lineSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <RoundPill round={3} phase="VOTE" tone={C.berryHi} />
        <Timer t="0:18" label="" danger />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '18px 18px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, font: `500 26px/1.1 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>Who is the AI?</h2>
          <p style={{ margin: '6px 0 0', font: `400 12px/1.4 ${SANS}`, color: C.faint }}>Chat is locked. One vote — it can't be changed.</p>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, alignContent: 'start' }}>
          {aliveP.map((p, i) => <VoteTarget key={p.id} p={p} selected={p.name === 'SLATE OWL'} />)}
        </div>
      </div>
      <div style={{ flex: '0 0 auto', padding: '14px 18px 20px', borderTop: `1px solid ${C.lineSoft}` }}>
        <Btn variant="berry" full>LOCK VOTE · SLATE OWL</Btn>
        <div style={{ textAlign: 'center', marginTop: 10, font: `400 11px/1.4 ${MONO}`, color: C.faint, letterSpacing: '0.02em' }}>
          SECRET BALLOT · LOCKED ON FIRST CAST · NO ABSTAIN
        </div>
      </div>
    </Phone>
  );
}

// ════════════════════════════ VOTE — DESKTOP ══════════════════════════════
function VoteDesktop() {
  const aliveP = PLAYERS.filter((_, i) => alive(i + 1) && !PLAYERS[i].you);
  return (
    <Screen>
      <div style={{ height: 60, flex: '0 0 60px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 28px', borderBottom: `1px solid ${C.lineSoft}` }}>
        <Brand size={16} sub={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <RoundPill round={3} phase="VOTE" tone={C.berryHi} />
          <Timer t="0:18" label="VOTE CLOSES" danger />
        </div>
        <div style={{ justifySelf: 'end' }}><PotHealth pct={90} compact /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 40 }}>
        {/* locked chat ghost */}
        <div style={{ position: 'absolute', top: 24, left: 28, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 9999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}` }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" stroke={C.faint} strokeWidth="1.8"/><path d="M8 11V8a4 4 0 018 0v3" stroke={C.faint} strokeWidth="1.8"/></svg>
          <Eyebrow color={C.faint} style={{ fontSize: 9 }}>CHAT LOCKED FOR VOTING</Eyebrow>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <Eyebrow color={C.berryHi}>CAST YOUR VOTE</Eyebrow>
          <h1 style={{ margin: '12px 0 6px', font: `500 44px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>Who is the AI?</h1>
          <p style={{ margin: 0, font: `400 14px/1.5 ${SANS}`, color: C.muted }}>One vote each. Most votes is eliminated — ties send everyone tied home.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 96px)', gap: 12, marginBottom: 28 }}>
          {aliveP.map((p) => <VoteTarget key={p.id} p={p} selected={p.name === 'SLATE OWL'} />)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Btn variant="berry" style={{ height: 52, padding: '0 32px' }}>LOCK VOTE · SLATE OWL</Btn>
        </div>
        <div style={{ marginTop: 14, font: `400 11px/1 ${MONO}`, color: C.faint, letterSpacing: '0.06em' }}>
          SECRET BALLOT · LOCKED ON FIRST CAST · NO RECAST · NO ABSTAIN
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ VOTE LOCKED (waiting) — MOBILE ══════════════
function VoteLockedMobile() {
  return (
    <Phone>
      <GridBG opacity={0.4} fade="ellipse 70% 50% at 50% 40%, black 0%, transparent 72%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 26px 30px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundPill round={3} phase="VOTE" tone={C.berryHi} />
          <Timer t="0:06" label="" danger />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.4)`, display: 'grid', placeItems: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" stroke={C.berryHi} strokeWidth="1.8"/><path d="M7.5 10.5V8a4.5 4.5 0 019 0v2.5" stroke={C.berryHi} strokeWidth="1.8"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, font: `500 28px/1.1 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>Vote locked.</h2>
            <p style={{ margin: '10px 0 0', font: `400 14px/1.5 ${SANS}`, color: C.muted, maxWidth: 250 }}>
              Your ballot is in and can't be changed. Waiting on the rest of the table.
            </p>
          </div>
          <div style={{ width: '100%', maxWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Eyebrow color={C.faint} style={{ fontSize: 9 }}>VOTES IN</Eyebrow>
              <span style={{ font: `500 11px/1 ${MONO}`, color: C.text }}>6 / 8</span>
            </div>
            <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ width: '75%', height: '100%', background: C.berryHi, borderRadius: 9999 }} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', font: `400 11px/1.4 ${MONO}`, color: C.faint, letterSpacing: '0.02em' }}>
          NOBODY SEES WHO YOU VOTED FOR — ONLY THE OUTCOME
        </div>
      </div>
    </Phone>
  );
}

// ════════════════════════════ ELIMINATION RESULT — MOBILE ═════════════════
function EliminationMobile() {
  const fox = PLAYERS[3]; // CRIMSON FOX
  return (
    <Phone>
      <GridBG opacity={0.5} fade="ellipse 80% 60% at 50% 38%, black 0%, transparent 70%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 26px 28px', position: 'relative' }}>
        <div style={{ textAlign: 'center' }}><Eyebrow color={C.faint}>ROUND 3 · RESULT</Eyebrow></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Avatar p={fox} size={92} dead />
          </div>
          <div>
            <h2 style={{ margin: 0, font: `500 30px/1.1 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>
              {fox.name}<br />was voted out.
            </h2>
            <p style={{ margin: '10px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted }}>The table reached the most votes. They're gone for good.</p>
          </div>
          {/* pot health verdict — the ONLY signal of human vs AI */}
          <div style={{ width: '100%', background: C.berrySoft, border: `1px solid rgba(224,58,139,0.35)`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow color={C.berryHi}>POT HEALTH</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ font: `400 15px/1 ${DISP}`, color: C.faint, textDecoration: 'line-through' }}>90%</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ font: `500 24px/1 ${DISP}`, color: C.berryHi }}>80%</span>
              </div>
            </div>
            <p style={{ margin: '10px 0 0', font: `400 12px/1.45 ${SANS}`, color: C.muted, textAlign: 'left' }}>
              <span style={{ color: C.berryHi, fontWeight: 600 }}>−10%.</span> The pool took a hit — that means you sent a <span style={{ color: C.text }}>human</span> home. The AI is still at the table.
            </p>
          </div>
        </div>
        <Btn variant="primary" full>CONTINUE TO ROUND 4</Btn>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  GameDesktop, GameMobile, PromptMobile, VoteMobile, VoteDesktop, VoteLockedMobile, EliminationMobile,
  RosterRow, alive, CHAT,
});
