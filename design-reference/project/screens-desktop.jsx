// screens-desktop.jsx — desktop variants for the screens that were mobile-only
// Depends on globals from screens-shared / game / endgame.

function WalletChip() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9999, background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)' }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#4ade80' }} />
      <span style={{ font: `500 11px/1 ${MONO}`, color: '#4ade80' }}>0x7a…3F9c</span>
    </div>
  );
}

// game-chrome top bar (round + timer + pot health)
function GameBar({ round = 3, phase = 'DISCUSSION', tone, t = '1:43', label = 'DISCUSSION ENDS', danger, pct = 90 }) {
  return (
    <div style={{ height: 60, flex: '0 0 60px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 28px', borderBottom: `1px solid ${C.lineSoft}`, background: C.bg, position: 'relative', zIndex: 3 }}>
      <Brand size={16} sub={false} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <RoundPill round={round} phase={phase} tone={tone} />
        <Timer t={t} label={label} danger={danger} />
      </div>
      <div style={{ justifySelf: 'end' }}><PotHealth pct={pct} compact /></div>
    </div>
  );
}

// simple top bar (brand + wallet)
function PlainBar() {
  return (
    <div style={{ height: 64, flex: '0 0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative', zIndex: 3 }}>
      <Brand size={18} />
      <WalletChip />
    </div>
  );
}

// ════════════════════════════ CONNECT — DESKTOP ═══════════════════════════
function ConnectDesktop() {
  const wallets = [
    ['Phantom', '#AB9FF2', 'Detected'],
    ['MetaMask', '#F0653A', ''],
    ['Rabby', '#7C8AA0', ''],
    ['WalletConnect', '#2E8BEA', ''],
  ];
  return (
    <Screen>
      <GridBG opacity={0.55} fade="ellipse 60% 60% at 30% 45%, black 0%, transparent 70%" />
      <div style={{ height: 64, flex: '0 0 64px', display: 'flex', alignItems: 'center', padding: '0 40px', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Brand size={18} />
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', position: 'relative' }}>
        <div style={{ padding: '0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9999, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.02)', marginBottom: 22, alignSelf: 'flex-start' }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.6s infinite' }} />
            <Eyebrow color={C.muted}>STEP 1 OF 2 · CONNECT</Eyebrow>
          </div>
          <h1 style={{ margin: 0, font: `500 56px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
            Some of you<br />aren't <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p style={{ margin: '18px 0 0', font: `400 16px/1.55 ${SANS}`, color: C.muted, maxWidth: 380 }}>
            Connect a Monad wallet to take a seat. You'll be dealt a random name and face — no profile, no history, nothing that gives you away.
          </p>
        </div>
        <div style={{ padding: '0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 400, background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 22, padding: 26 }}>
            <Eyebrow color={C.faint}>CHOOSE A WALLET</Eyebrow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
              {wallets.map(([name, c, tag]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.line}`, cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: c }} />
                  <span style={{ flex: 1, font: `500 15px/1 ${DISP}`, color: C.text }}>{name}</span>
                  {tag
                    ? <Tag tone="human">{tag}</Tag>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke={C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.lineSoft}`, font: `400 12px/1.5 ${SANS}`, color: C.faint }}>
              New to Monad testnet? You'll need a little test MON to play — <span style={{ color: C.purple }}>grab some free from the faucet</span>.
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ FAUCET — DESKTOP ════════════════════════════
function FaucetDesktop() {
  return (
    <Screen>
      <GridBG opacity={0.5} fade="ellipse 60% 60% at 50% 38%, black 0%, transparent 70%" />
      <PlainBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ width: 560, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.4)`, display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z" stroke={C.berryHi} strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 8v4M12 15.5v.5" stroke={C.berryHi} strokeWidth="1.7" strokeLinecap="round"/></svg>
          </div>
          <h1 style={{ margin: 0, font: `500 44px/1.05 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>You need test MON to sit down.</h1>
          <p style={{ margin: '16px auto 0', font: `400 16px/1.55 ${SANS}`, color: C.muted, maxWidth: 440 }}>
            This table runs on Monad testnet. Grab free test MON from the faucet — it takes a few seconds — then jump back into the queue.
          </p>
          <div style={{ display: 'flex', gap: 14, margin: '30px 0', justifyContent: 'center' }}>
            {[['YOUR BALANCE', '0.00 MON'], ['BUY-IN', '5.00 MON']].map(([k, v]) => (
              <div key={k} style={{ flex: '0 0 200px', background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 16, padding: '18px 22px', textAlign: 'left' }}>
                <Eyebrow color={C.faint} style={{ fontSize: 9 }}>{k}</Eyebrow>
                <div style={{ font: `500 28px/1 ${DISP}`, color: C.text, marginTop: 10 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Btn variant="primary" style={{ height: 50, padding: '0 28px' }}>OPEN TESTNET FAUCET</Btn>
            <Btn variant="tertiary" style={{ height: 50, padding: '0 24px' }}>I ALREADY HAVE MON — REFRESH</Btn>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ QUEUE — DESKTOP ═════════════════════════════
function QueueDesktop() {
  return (
    <Screen>
      <GridBG opacity={0.5} fade="ellipse 55% 60% at 50% 46%, black 0%, transparent 70%" />
      <div style={{ height: 64, flex: '0 0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Brand size={18} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><WalletChip /><Eyebrow color={C.faint}>QUICK MATCH</Eyebrow></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 30 }}>
        <div style={{ position: 'relative', width: 200, height: 200, display: 'grid', placeItems: 'center' }}>
          {[200, 148, 96].map((d, i) => (
            <div key={i} style={{ position: 'absolute', width: d, height: d, borderRadius: 9999, border: `1px solid rgba(131,110,249,${0.28 - i * 0.06})` }} />
          ))}
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: `conic-gradient(from 0deg, transparent 0deg, rgba(131,110,249,0.35) 60deg, transparent 90deg)`, animation: 'spin 2.6s linear infinite' }} />
          </div>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: C.purpleSoft, border: `1px solid rgba(131,110,249,0.5)`, display: 'grid', placeItems: 'center' }}>
            <span style={{ font: `500 26px/1 ${DISP}`, color: C.purple }}>10</span>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, font: `500 40px/1.05 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>Finding your table…</h1>
          <p style={{ margin: '12px 0 0', font: `400 15px/1.55 ${SANS}`, color: C.muted, maxWidth: 380 }}>
            You'll join up to 9 others. <span style={{ color: C.text }}>1–4 are AI</span> — you won't be told how many.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[['BUY-IN', '5 MON'], ['EST. WAIT', '~12s'], ['SEATS', '10']].map(([k, v]) => (
            <div key={k} style={{ width: 150, background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 14px', textAlign: 'center' }}>
              <div style={{ font: `500 22px/1 ${DISP}`, color: C.text }}>{v}</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 8, display: 'block' }}>{k}</Eyebrow>
            </div>
          ))}
        </div>
        <Btn variant="tertiary" style={{ height: 46, padding: '0 26px' }}>LEAVE QUEUE</Btn>
      </div>
    </Screen>
  );
}

// ════════════════════════════ ROUND PROMPT — DESKTOP ══════════════════════
function PromptDesktop() {
  return (
    <Screen>
      <GameBar round={3} phase="STARTING" t="2:00" label="DISCUSSION BEGINS" />
      <GridBG opacity={0.55} fade="ellipse 60% 70% at 50% 45%, black 0%, transparent 70%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 28, padding: 40 }}>
        <Eyebrow color={C.purple}>ROUND 3 · PROMPT</Eyebrow>
        <h1 style={{ margin: 0, font: `500 52px/1.12 ${DISP}`, letterSpacing: '-0.03em', color: C.text, textAlign: 'center', maxWidth: 820, textWrap: 'balance' }}>
          “Describe a time you genuinely embarrassed yourself.”
        </h1>
        <p style={{ margin: 0, font: `400 16px/1.55 ${SANS}`, color: C.muted, maxWidth: 460, textAlign: 'center' }}>
          The prompts get more revealing each round. You have two minutes. Watch who dodges.
        </p>
        <div style={{ display: 'flex' }}>
          {[1, 5, 9, 4, 8, 2, 3, 6].map((n, i) => (
            <div key={n} style={{ marginLeft: i ? -12 : 0 }}><Avatar p={PLAYERS[n - 1]} size={44} ring={C.bg} /></div>
          ))}
        </div>
        <div style={{ font: `400 13px/1.4 ${MONO}`, color: C.faint, letterSpacing: '0.04em' }}>
          CHAT UNLOCKS NOW · TYPING INDICATORS ON FOR EVERYONE
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ VOTE LOCKED — DESKTOP ═══════════════════════
function VoteLockedDesktop() {
  return (
    <Screen>
      <GameBar round={3} phase="VOTE" tone={C.berryHi} t="0:06" label="VOTE CLOSES" danger pct={90} />
      <GridBG opacity={0.4} fade="ellipse 55% 60% at 50% 46%, black 0%, transparent 70%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 24 }}>
        <div style={{ width: 86, height: 86, borderRadius: 26, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.4)`, display: 'grid', placeItems: 'center' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" stroke={C.berryHi} strokeWidth="1.8"/><path d="M7.5 10.5V8a4.5 4.5 0 019 0v2.5" stroke={C.berryHi} strokeWidth="1.8"/></svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, font: `500 44px/1.05 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>Vote locked.</h1>
          <p style={{ margin: '12px 0 0', font: `400 15px/1.55 ${SANS}`, color: C.muted, maxWidth: 380 }}>
            Your ballot is in and can't be changed. Waiting on the rest of the table.
          </p>
        </div>
        <div style={{ width: 320 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Eyebrow color={C.faint} style={{ fontSize: 9 }}>VOTES IN</Eyebrow>
            <span style={{ font: `500 11px/1 ${MONO}`, color: C.text }}>6 / 8</span>
          </div>
          <div style={{ height: 6, borderRadius: 9999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ width: '75%', height: '100%', background: C.berryHi, borderRadius: 9999 }} />
          </div>
        </div>
        <div style={{ font: `400 11px/1.4 ${MONO}`, color: C.faint, letterSpacing: '0.04em' }}>
          NOBODY SEES WHO YOU VOTED FOR — ONLY THE OUTCOME
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ ELIMINATION — DESKTOP ═══════════════════════
function EliminationDesktop() {
  const fox = PLAYERS[3];
  return (
    <Screen>
      <GridBG opacity={0.5} fade="ellipse 60% 70% at 50% 42%, black 0%, transparent 68%" />
      <div style={{ height: 60, flex: '0 0 60px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Eyebrow color={C.faint}>ROUND 3 · RESULT</Eyebrow>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 64, padding: '0 80px' }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar p={fox} size={132} dead />
          <div style={{ marginTop: 18, font: `500 12px/1 ${MONO}`, letterSpacing: '0.08em', color: C.faint, textDecoration: 'line-through' }}>{fox.name}</div>
        </div>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ margin: 0, font: `500 52px/1.04 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>{fox.name} was voted out.</h1>
          <p style={{ margin: '14px 0 26px', font: `400 16px/1.55 ${SANS}`, color: C.muted }}>The table reached the most votes. They're gone for good.</p>
          <div style={{ background: C.berrySoft, border: `1px solid rgba(224,58,139,0.35)`, borderRadius: 18, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow color={C.berryHi}>POT HEALTH</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ font: `400 18px/1 ${DISP}`, color: C.faint, textDecoration: 'line-through' }}>90%</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke={C.faint} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span style={{ font: `500 30px/1 ${DISP}`, color: C.berryHi }}>80%</span>
              </div>
            </div>
            <p style={{ margin: '12px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted }}>
              <span style={{ color: C.berryHi, fontWeight: 600 }}>−10%.</span> The pool took a hit — that means you sent a <span style={{ color: C.text }}>human</span> home. The AI is still at the table.
            </p>
          </div>
          <div style={{ marginTop: 24 }}><Btn variant="primary" style={{ height: 50, padding: '0 28px' }}>CONTINUE TO ROUND 4</Btn></div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ SPECTATOR — DESKTOP ═════════════════════════
function SpectatorDesktop() {
  const SPEC_CHAT = [
    { p: 2, text: "ok rust hare being gone changes nothing, slate is still dodging every prompt" },
    { p: 9, text: 'agreed. pearl what do you actually think' },
    { p: 8, text: "i think it's slate or jade. one of them types too clean" },
  ];
  return (
    <Screen>
      <div style={{ height: 60, flex: '0 0 60px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 28px', borderBottom: `1px solid ${C.lineSoft}`, background: C.bg }}>
        <Brand size={16} sub={false} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <RoundPill round={4} phase="DISCUSSION" />
          <Timer t="1:12" label="DISCUSSION ENDS" />
        </div>
        <div style={{ justifySelf: 'end' }}><PotHealth pct={80} compact /></div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '288px 1fr', minHeight: 0 }}>
        <div style={{ borderRight: `1px solid ${C.lineSoft}`, padding: 16, display: 'flex', flexDirection: 'column', gap: 2, background: '#0C0E0D' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 12px 12px' }}>
            <Eyebrow color={C.faint}>TABLE</Eyebrow>
            <Eyebrow color={C.faint}>6 ALIVE · 4 OUT</Eyebrow>
          </div>
          {PLAYERS.map((p, i) => <RosterRow key={p.id} p={p} dead={p.you || !alive(i + 1) || [4, 6].includes(i + 1)} you={p.you} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          {/* eliminated banner */}
          <div style={{ flex: '0 0 auto', margin: 16, padding: '14px 18px', borderRadius: 14, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(220,38,38,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7L7 17" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 14px/1.2 ${SANS}`, color: '#f87171', marginBottom: 2 }}>You were eliminated — spectating</div>
              <div style={{ font: `400 12px/1.3 ${SANS}`, color: C.muted }}>Read-only and muted. No payout — only survivors split the pool. AI identities stay hidden until the game ends.</div>
            </div>
          </div>
          <div className="ai-scrollcol" style={{ flex: 1, overflow: 'hidden', padding: '8px 32px', display: 'flex', flexDirection: 'column', gap: 16, opacity: 0.92 }}>
            {SPEC_CHAT.map((m, i) => <ChatMsg key={i} p={PLAYERS[m.p - 1]} text={m.text} />)}
            <TypingRow p={PLAYERS[4]} />
          </div>
          <div style={{ flex: '0 0 auto', padding: '16px 32px 22px', borderTop: `1px solid ${C.lineSoft}` }}>
            <div style={{ height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px dashed ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M9 5.5A3 3 0 0115 8v3m0 3.5a3 3 0 01-4.5 1.5M5 11v1a7 7 0 0010.5 6M19 11v1c0 .6-.07 1.2-.2 1.7" stroke={C.faint} strokeWidth="1.7" strokeLinecap="round"/></svg>
              <span style={{ font: `400 14px/1 ${SANS}`, color: C.faint }}>You can watch, but you can't chat</span>
            </div>
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ SETTLEMENT — DESKTOP ════════════════════════
function SettlementDesktop() {
  const rows = [
    ['Your buy-in', '5.00 MON'],
    ['Pool at start', '40.00 MON'],
    ['Misvote penalties (2 rounds)', '−7.60 MON'],
    ['Final pool', '32.40 MON'],
    ['Split between survivors', '÷ 6'],
  ];
  return (
    <Screen>
      <GridBG opacity={0.45} fade="ellipse 60% 50% at 50% 30%, black 0%, transparent 70%" />
      <PlainBar />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 48, padding: '0 80px' }}>
        <div style={{ flex: '0 0 380px' }}>
          <Eyebrow color="#4ade80">SETTLED ON MONAD</Eyebrow>
          <div style={{ font: `500 80px/1 ${DISP}`, letterSpacing: '-0.04em', color: C.text, margin: '16px 0 8px' }}>
            5.40 <span style={{ font: `400 26px/1 ${SANS}`, color: C.faint }}>MON</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 9999, background: 'rgba(22,163,74,0.14)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ font: `500 13px/1 ${MONO}`, color: '#4ade80' }}>+0.40 MON NET</span>
          </div>
          <p style={{ margin: '22px 0 0', font: `400 15px/1.55 ${SANS}`, color: C.muted, maxWidth: 320 }}>
            You survived with the AI gone. The remaining pool was split equally among the six survivors and paid out on-chain.
          </p>
        </div>
        <div style={{ flex: '0 0 420px' }}>
          <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22, marginBottom: 14 }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderTop: i ? `1px solid ${C.lineSoft}` : 'none' }}>
                <span style={{ font: `400 14px/1 ${SANS}`, color: C.muted }}>{k}</span>
                <span style={{ font: `500 14px/1 ${MONO}`, color: C.text }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 14, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(22,163,74,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ font: `500 13px/1.2 ${SANS}`, color: '#4ade80' }}>Payout confirmed</div>
              <div style={{ font: `400 11px/1.2 ${MONO}`, color: C.faint, marginTop: 2 }}>0x9c4a…f201 · block 14,882,301</div>
            </div>
            <span style={{ font: `500 10px/1 ${MONO}`, color: '#4ade80', letterSpacing: '0.06em' }}>EXPLORER ↗</span>
          </div>
          <Btn variant="primary" full style={{ height: 50 }}>CONTINUE</Btn>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ AI WIN (LOSS) — DESKTOP ═════════════════════
function RevealLossDesktop() {
  return (
    <Screen>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 70% at 30% 30%, rgba(224,58,139,0.16), transparent 65%)` }} />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.25fr', position: 'relative' }}>
        <div style={{ padding: '0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${C.lineSoft}` }}>
          <Brand size={16} sub={false} />
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 9999, background: C.berrySoft, border: '1px solid rgba(224,58,139,0.4)', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.5s infinite' }} />
              <Eyebrow color={C.berryHi}>PARITY REACHED · ROUND 4</Eyebrow>
            </div>
            <h1 style={{ margin: 0, font: `500 76px/0.98 ${DISP}`, letterSpacing: '-0.04em', color: C.text }}>
              The AI<br /><span style={{ color: C.berryHi }}>win.</span>
            </h1>
            <p style={{ margin: '20px 0 0', font: `400 16px/1.55 ${SANS}`, color: C.muted, maxWidth: 380 }}>
              The impostors reached parity and bloc-voted as one. At equality they could send any human home — so the house takes the entire pool.
            </p>
          </div>
          <div style={{ marginTop: 34, display: 'flex', gap: 36 }}>
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.berryHi }}>−5.00</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: 'block' }}>MON LOST</Eyebrow>
            </div>
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.text }}>100%</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: 'block' }}>HOUSE TOOK</Eyebrow>
            </div>
          </div>
          <div style={{ marginTop: 38 }}><Btn variant="berry" style={{ height: 52, padding: '0 30px' }}>RUN IT BACK</Btn></div>
        </div>
        <div style={{ padding: '0 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Eyebrow color={C.faint} style={{ marginBottom: 18, display: 'block' }}>THEY WERE AI ALL ALONG</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <RevealSeat key={i} idx={i} />)}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ SHARE — DESKTOP ═════════════════════════════
function ShareDesktop() {
  return (
    <Screen>
      <GridBG opacity={0.4} fade="ellipse 60% 60% at 50% 40%, black 0%, transparent 70%" />
      <PlainBar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', gap: 24 }}>
        <Eyebrow color={C.faint}>SHARE YOUR RESULT</Eyebrow>
        {/* the card */}
        <div style={{ width: 640, borderRadius: 24, overflow: 'hidden', border: `1px solid ${C.line}`, background: '#0C0E0D', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}><GridBG opacity={0.8} fade="ellipse 70% 90% at 60% 20%, black 0%, transparent 75%" /></div>
          <div style={{ position: 'relative', padding: '36px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Brand size={17} sub={false} />
              <Tag tone="purple">WIN</Tag>
            </div>
            <div style={{ margin: '30px 0 8px', font: `500 60px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>I caught the AI.</div>
            <p style={{ margin: 0, font: `400 15px/1.5 ${SANS}`, color: C.muted }}>Survived 5 rounds, fingered both impostors, walked with a profit.</p>
            <div style={{ display: 'flex', gap: 40, marginTop: 30 }}>
              {[['+0.40', 'MON NET'], ['2/2', 'AI CAUGHT'], ['5', 'ROUNDS']].map(([v, k]) => (
                <div key={k}>
                  <div style={{ font: `500 36px/1 ${DISP}`, color: C.purple }}>{v}</div>
                  <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 7, display: 'block' }}>{k}</Eyebrow>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${C.lineSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: `500 11px/1 ${MONO}`, letterSpacing: '0.14em', color: C.faint }}>PLAY AT AIIMPOSTOR.XYZ</span>
              <div style={{ display: 'flex' }}>
                {[6, 10].map((n, i) => <div key={n} style={{ marginLeft: i ? -10 : 0 }}><Avatar p={PLAYERS[n - 1]} size={30} ring={C.bg} /></div>)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, width: 640 }}>
          <Btn variant="tertiary" style={{ flex: 1, height: 50 }} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.9 22H3l7-7.9L2.3 2h6.1l4.2 5.6L18.2 2zm-1 18h1.6L7.9 3.8H6.2L17.2 20z"/></svg>}>SHARE</Btn>
          <Btn variant="tertiary" style={{ flex: 1, height: 50 }} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 15l6-6M11 6l1-1a4 4 0 016 6l-1 1M13 18l-1 1a4 4 0 01-6-6l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}>COPY LINK</Btn>
          <Btn variant="primary" style={{ flex: 1.4, height: 50 }}>PLAY AGAIN</Btn>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, {
  ConnectDesktop, FaucetDesktop, QueueDesktop, PromptDesktop, VoteLockedDesktop,
  EliminationDesktop, SpectatorDesktop, SettlementDesktop, RevealLossDesktop, ShareDesktop,
});
