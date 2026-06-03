// screens-onboarding-lobby.jsx — Onboarding + Matchmaking
// Depends on screens-shared.jsx globals.

// ── Anonymous lobby seat (identities NOT yet assigned → anti-leak) ──
function LobbySeat({ filled, you, idx }) {
  return (
    <div style={{
      aspectRatio: '1', borderRadius: 14,
      background: filled ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: filled ? `1px solid ${C.line}` : `1px dashed rgba(255,255,255,0.14)`,
      display: 'grid', placeItems: 'center', position: 'relative',
    }}>
      {filled ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8.5" r="3.6" fill={you ? C.purple : 'rgba(255,255,255,0.5)'} />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" fill={you ? C.purple : 'rgba(255,255,255,0.5)'} />
        </svg>
      ) : (
        <span style={{ font: `400 10px/1 ${MONO}`, color: 'rgba(255,255,255,0.22)' }}>{idx}</span>
      )}
      {you && (
        <div style={{ position: 'absolute', bottom: 5, font: `600 7px/1 ${MONO}`, letterSpacing: '0.1em', color: C.purple }}>YOU</div>
      )}
    </div>
  );
}

// ════════════════════════════ CONNECT — MOBILE ════════════════════════════
function ConnectMobile() {
  return (
    <Phone>
      <GridBG opacity={0.8} fade="ellipse 80% 50% at 50% 22%, black 0%, transparent 75%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 26px 30px', position: 'relative' }}>
        <Brand size={17} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9999, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.02)', marginBottom: 22 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.6s infinite' }} />
              <Eyebrow color={C.muted}>SOCIAL DEDUCTION · LIVE</Eyebrow>
            </div>
            <h1 style={{ margin: 0, font: `500 46px/1.02 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
              Some of you<br />aren't <span style={{ color: C.berryHi }}>human.</span>
            </h1>
            <p style={{ margin: '16px 0 0', font: `400 15px/1.5 ${SANS}`, color: C.muted, maxWidth: 300 }}>
              Ten players. A handful are hidden AI. Talk, read the room, and vote them out before they reach parity — winners split the pool in MON.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn variant="secondary" full icon={<WalletGlyph />}>CONNECT MONAD WALLET</Btn>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ font: `400 12px/1 ${SANS}`, color: C.faint }}>No test MON?</span>
            <span style={{ font: `500 12px/1 ${SANS}`, color: C.purple, textDecoration: 'underline', textUnderlineOffset: 2 }}>Get some from the faucet</span>
          </div>
        </div>
      </div>
    </Phone>
  );
}

function WalletGlyph() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="2.5" y="5.5" width="19" height="14" rx="3" stroke="currentColor" strokeWidth="1.7"/><path d="M2.5 9h19" stroke="currentColor" strokeWidth="1.7"/><circle cx="17" cy="14" r="1.4" fill="currentColor"/></svg>;
}

// ════════════════════════════ FAUCET HINT — MOBILE ════════════════════════
function FaucetMobile() {
  return (
    <Phone>
      <GridBG opacity={0.5} fade="ellipse 80% 50% at 50% 30%, black 0%, transparent 75%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 26px 30px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Brand size={17} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px', borderRadius: 9999, background: 'rgba(22,163,74,0.14)', border: '1px solid rgba(22,163,74,0.35)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#4ade80' }} />
            <span style={{ font: `500 10px/1 ${MONO}`, color: '#4ade80', letterSpacing: '0.06em' }}>0x7a…3F9c</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.4)`, display: 'grid', placeItems: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z" stroke={C.berryHi} strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 8v4M12 15.5v.5" stroke={C.berryHi} strokeWidth="1.7" strokeLinecap="round"/></svg>
          </div>
          <div>
            <h2 style={{ margin: 0, font: `500 30px/1.08 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>You need test MON to sit down.</h2>
            <p style={{ margin: '12px 0 0', font: `400 15px/1.5 ${SANS}`, color: C.muted }}>
              This table runs on Monad testnet. Grab free test MON from the faucet — it takes a few seconds — then jump back into the queue.
            </p>
          </div>
          <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Eyebrow color={C.faint} style={{ fontSize: 9 }}>YOUR BALANCE</Eyebrow>
              <div style={{ font: `500 26px/1 ${DISP}`, color: C.text, marginTop: 8 }}>0.00 <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>MON</span></div>
            </div>
            <div>
              <Eyebrow color={C.faint} style={{ fontSize: 9 }}>BUY-IN</Eyebrow>
              <div style={{ font: `500 26px/1 ${DISP}`, color: C.text, marginTop: 8 }}>5.00 <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>MON</span></div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn variant="primary" full>OPEN TESTNET FAUCET</Btn>
          <Btn variant="tertiary" full>I ALREADY HAVE MON — REFRESH</Btn>
        </div>
      </div>
    </Phone>
  );
}

// ════════════════════════════ QUEUE — MOBILE ══════════════════════════════
function QueueMobile() {
  return (
    <Phone>
      <GridBG opacity={0.6} fade="ellipse 70% 50% at 50% 42%, black 0%, transparent 72%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 26px 30px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Brand size={16} sub={false} />
          <Eyebrow color={C.faint}>QUICK MATCH</Eyebrow>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
          {/* radar */}
          <div style={{ position: 'relative', width: 170, height: 170, display: 'grid', placeItems: 'center' }}>
            {[170, 124, 78].map((d, i) => (
              <div key={i} style={{ position: 'absolute', width: d, height: d, borderRadius: 9999, border: `1px solid rgba(131,110,249,${0.28 - i * 0.06})` }} />
            ))}
            <div style={{ position: 'absolute', width: 170, height: 170, borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: `conic-gradient(from 0deg, transparent 0deg, rgba(131,110,249,0.35) 60deg, transparent 90deg)`, animation: 'spin 2.6s linear infinite' }} />
            </div>
            <div style={{ width: 54, height: 54, borderRadius: 16, background: C.purpleSoft, border: `1px solid rgba(131,110,249,0.5)`, display: 'grid', placeItems: 'center' }}>
              <span style={{ font: `500 22px/1 ${DISP}`, color: C.purple }}>10</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: 0, font: `500 26px/1.1 ${DISP}`, letterSpacing: '-0.02em', color: C.text }}>Finding your table…</h2>
            <p style={{ margin: '10px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted, maxWidth: 250 }}>
              You'll join up to 9 others. <span style={{ color: C.text }}>1–4 are AI</span> — you won't be told how many.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            {[['BUY-IN', '5 MON'], ['EST. WAIT', '~12s'], ['SEATS', '10']].map(([k, v]) => (
              <div key={k} style={{ flex: 1, background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                <div style={{ font: `500 16px/1 ${DISP}`, color: C.text }}>{v}</div>
                <Eyebrow color={C.faint} style={{ fontSize: 8, marginTop: 5, display: 'block' }}>{k}</Eyebrow>
              </div>
            ))}
          </div>
        </div>
        <Btn variant="tertiary" full>LEAVE QUEUE</Btn>
      </div>
    </Phone>
  );
}

// ════════════════════════════ LOBBY FILL — MOBILE ═════════════════════════
function LobbyMobile() {
  const filled = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0]; // intentionally vague — no human/AI split
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 24px 28px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Brand size={16} sub={false} />
          <Eyebrow color={C.faint}>TABLE #4471</Eyebrow>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <Eyebrow color={C.purple}>TABLE FORMING</Eyebrow>
            <div style={{ font: `500 64px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text, margin: '14px 0 6px', fontVariantNumeric: 'tabular-nums' }}>0:24</div>
            <p style={{ margin: 0, font: `400 13px/1.4 ${SANS}`, color: C.muted }}>Starting soon. Late players seated until the clock runs out.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {filled.map((f, i) => <LobbySeat key={i} filled={f} you={i === 0} idx={i + 1} />)}
          </div>
          <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flex: '0 0 auto', marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke={C.purple} strokeWidth="1.6"/><path d="M12 11v5M12 8v.5" stroke={C.purple} strokeWidth="1.7" strokeLinecap="round"/></svg>
            <span style={{ font: `400 12px/1.45 ${SANS}`, color: C.muted }}>
              Avatars and names are assigned <span style={{ color: C.text }}>when the round begins</span> — to everyone, AI included. Nobody picks their own.
            </span>
          </div>
        </div>
        <Btn variant="tertiary" full>LEAVE TABLE</Btn>
      </div>
    </Phone>
  );
}

// ════════════════════════════ LOBBY — DESKTOP ═════════════════════════════
function LobbyDesktop() {
  const filled = [1, 1, 1, 1, 1, 1, 1, 0, 0, 0];
  const rules = [
    ['01', 'Talk it out', 'Each round opens with a prompt. Chat freely for ~2 minutes.'],
    ['02', 'Vote in secret', 'One vote each. Most votes is eliminated. Nobody sees who voted.'],
    ['03', 'Humans win', 'Vote out every AI before they reach parity, and split the pool.'],
  ];
  return (
    <Screen>
      <GridBG opacity={0.5} fade="ellipse 60% 60% at 30% 40%, black 0%, transparent 70%" />
      {/* top bar */}
      <div style={{ height: 64, flex: '0 0 64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 40px', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Brand size={18} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 9999, background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.3)' }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#4ade80' }} />
            <span style={{ font: `500 11px/1 ${MONO}`, color: '#4ade80' }}>0x7a…3F9c</span>
          </div>
          <Btn variant="tertiary" sm>LEAVE TABLE</Btn>
        </div>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.3fr 1fr', position: 'relative' }}>
        {/* left: forming table */}
        <div style={{ padding: '46px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${C.lineSoft}` }}>
          <Eyebrow color={C.purple}>TABLE #4471 · FORMING</Eyebrow>
          <h1 style={{ margin: '16px 0 0', font: `500 52px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
            Starts in <span style={{ fontVariantNumeric: 'tabular-nums' }}>0:24</span>
          </h1>
          <p style={{ margin: '14px 0 32px', font: `400 15px/1.5 ${SANS}`, color: C.muted, maxWidth: 380 }}>
            The clock began when the table reached enough players. Late joiners are seated until it hits zero — then identities are dealt.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 78px)', gap: 12 }}>
            {filled.map((f, i) => <LobbySeat key={i} filled={f} you={i === 0} idx={i + 1} />)}
          </div>
          <div style={{ marginTop: 30, display: 'flex', gap: 10, alignItems: 'center', font: `400 12px/1.4 ${SANS}`, color: C.faint, maxWidth: 420 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.purple, flex: '0 0 auto' }} />
            Seat fill is deliberately ambiguous — the table never reveals how many players are human or AI.
          </div>
        </div>
        {/* right: how it works */}
        <div style={{ padding: '46px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22 }}>
          <Eyebrow color={C.faint}>HOW IT WORKS</Eyebrow>
          {rules.map(([n, t, d]) => (
            <div key={n} style={{ display: 'flex', gap: 16 }}>
              <span style={{ font: `500 13px/1.2 ${MONO}`, color: C.purple, paddingTop: 2 }}>{n}</span>
              <div>
                <div style={{ font: `500 18px/1.2 ${DISP}`, color: C.text, marginBottom: 4 }}>{t}</div>
                <div style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted, maxWidth: 320 }}>{d}</div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 6, padding: 16, borderRadius: 14, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.3)` }}>
            <Eyebrow color={C.berryHi}>THE CATCH</Eyebrow>
            <p style={{ margin: '8px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted }}>
              If the AI ever reach parity with the humans, they take the entire pool. Equality is already a loss.
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}

Object.assign(window, { ConnectMobile, FaucetMobile, QueueMobile, LobbyMobile, LobbyDesktop });
