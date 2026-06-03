// screens-endgame.jsx — Spectator + Reveal + Settlement + Share
// Depends on screens-shared.jsx globals.

// final truth (revealed only at end): AI = SLATE OWL(6) + ASH VOLE(10)
const TRUTH = {
  1: { role: 'human', out: false, you: true },
  2: { role: 'human', out: false },
  3: { role: 'human', out: false },
  4: { role: 'human', out: true },   // misvote R3
  5: { role: 'human', out: false },
  6: { role: 'ai', out: true, yourVote: true }, // you called it
  7: { role: 'human', out: true },   // early misvote
  8: { role: 'human', out: false },
  9: { role: 'human', out: false },
  10: { role: 'ai', out: true },
};

// ════════════════════════════ SPECTATOR — MOBILE ══════════════════════════
function SpectatorMobile() {
  const SPEC_CHAT = [
    { p: 2, text: "ok rust hare being gone changes nothing, slate is still dodging every prompt" },
    { p: 9, text: 'agreed. pearl what do you actually think' },
    { p: 8, text: "i think it's slate or jade. one of them types too clean" },
  ];
  return (
    <Phone>
      <div style={{ flex: '0 0 auto', padding: '8px 18px 12px', borderBottom: `1px solid ${C.lineSoft}`, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <RoundPill round={4} phase="DISCUSSION" />
          <Timer t="1:12" label="" />
        </div>
      </div>
      {/* eliminated banner */}
      <div style={{ flex: '0 0 auto', margin: '12px 16px 0', padding: '12px 14px', borderRadius: 14, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', display: 'flex', gap: 11, alignItems: 'center' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(220,38,38,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M7 7l10 10M17 7L7 17" stroke="#f87171" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div>
          <div style={{ font: `500 13px/1.2 ${SANS}`, color: '#f87171', marginBottom: 2 }}>You were eliminated</div>
          <div style={{ font: `400 11px/1.3 ${SANS}`, color: C.muted }}>Spectating, muted. No payout — only survivors split the pool.</div>
        </div>
      </div>
      <div className="ai-scrollcol" style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 13, opacity: 0.92 }}>
        {SPEC_CHAT.map((m, i) => <ChatMsg key={i} p={PLAYERS[m.p - 1]} text={m.text} />)}
        <TypingRow p={PLAYERS[4]} />
      </div>
      <div style={{ flex: '0 0 auto', borderTop: `1px solid ${C.lineSoft}`, padding: '14px 16px 20px' }}>
        <div style={{ height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px dashed ${C.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M9 5.5A3 3 0 0115 8v3m0 3.5a3 3 0 01-4.5 1.5M5 11v1a7 7 0 0010.5 6M19 11v1c0 .6-.07 1.2-.2 1.7" stroke={C.faint} strokeWidth="1.7" strokeLinecap="round"/></svg>
          <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>You can watch, but you can't chat</span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, font: `400 10px/1.4 ${MONO}`, color: C.faint, letterSpacing: '0.04em' }}>
          AI IDENTITIES STAY HIDDEN UNTIL THE GAME ENDS
        </div>
      </div>
    </Phone>
  );
}

// ── reveal seat ─────────────────────────────────────────────────────
function RevealSeat({ idx, big }) {
  const t = TRUTH[idx];
  const p = PLAYERS[idx - 1];
  const isAI = t.role === 'ai';
  const s = big ? 56 : 44;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: big ? '18px 10px' : '14px 6px',
      borderRadius: 14, position: 'relative',
      background: isAI ? C.berrySoft : 'rgba(255,255,255,0.03)',
      border: `1.5px solid ${isAI ? 'rgba(224,58,139,0.5)' : C.line}`,
      boxShadow: isAI ? `0 0 26px rgba(224,58,139,0.22)` : 'none',
    }}>
      <Avatar p={p} size={s} dead={t.out} ring={isAI ? C.berryHi : undefined} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ font: `500 ${big ? 11 : 10}px/1.1 ${MONO}`, letterSpacing: '0.04em', color: t.out ? C.faint : C.text }}>{p.name}{t.you ? ' · YOU' : ''}</div>
      </div>
      <Tag tone={isAI ? 'ai' : 'human'}>{isAI ? 'AI' : 'HUMAN'}</Tag>
      {t.yourVote && (
        <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', padding: '3px 8px', borderRadius: 9999, background: C.purple, font: `600 8px/1 ${MONO}`, letterSpacing: '0.08em', color: '#fff' }}>YOUR VOTE ✓</div>
      )}
    </div>
  );
}

// ════════════════════════════ REVEAL (WIN) — DESKTOP ══════════════════════
function RevealWinDesktop() {
  return (
    <Screen>
      <GridBG opacity={0.6} fade="ellipse 70% 80% at 50% 30%, black 0%, transparent 70%" />
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1.25fr', position: 'relative' }}>
        {/* verdict */}
        <div style={{ padding: '0 56px', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderRight: `1px solid ${C.lineSoft}` }}>
          <Brand size={16} sub={false} />
          <div style={{ marginTop: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 9999, background: 'rgba(22,163,74,0.14)', border: '1px solid rgba(22,163,74,0.4)', marginBottom: 20 }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#4ade80' }} />
              <Eyebrow color="#4ade80">GAME OVER · ROUND 5</Eyebrow>
            </div>
            <h1 style={{ margin: 0, font: `500 76px/0.98 ${DISP}`, letterSpacing: '-0.04em', color: C.text }}>
              Humans<br /><span style={{ color: C.purple }}>win.</span>
            </h1>
            <p style={{ margin: '20px 0 0', font: `400 16px/1.55 ${SANS}`, color: C.muted, maxWidth: 380 }}>
              Both impostors were voted out before they reached parity. The table held its nerve — the surviving six split the pool.
            </p>
          </div>
          <div style={{ marginTop: 34, display: 'flex', gap: 28 }}>
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.text }}>2</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: 'block' }}>AI CAUGHT</Eyebrow>
            </div>
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.text }}>6</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: 'block' }}>SURVIVORS</Eyebrow>
            </div>
            <div>
              <div style={{ font: `500 34px/1 ${DISP}`, color: C.purple }}>✓</div>
              <Eyebrow color={C.faint} style={{ fontSize: 9, marginTop: 6, display: 'block' }}>YOUR READ</Eyebrow>
            </div>
          </div>
          <div style={{ marginTop: 38 }}><Btn variant="primary" style={{ height: 52, padding: '0 30px' }}>SEE PAYOUT</Btn></div>
        </div>
        {/* the reveal grid */}
        <div style={{ padding: '0 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Eyebrow color={C.faint} style={{ marginBottom: 18, display: 'block' }}>WHO WAS WHO</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => <RevealSeat key={i} idx={i} />)}
          </div>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ REVEAL (WIN) — MOBILE ═══════════════════════
function RevealWinMobile() {
  return (
    <Phone>
      <GridBG opacity={0.6} fade="ellipse 90% 50% at 50% 20%, black 0%, transparent 72%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 22px 26px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9999, background: 'rgba(22,163,74,0.14)', border: '1px solid rgba(22,163,74,0.4)', marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: '#4ade80' }} />
            <Eyebrow color="#4ade80" style={{ fontSize: 9 }}>GAME OVER</Eyebrow>
          </div>
          <h1 style={{ margin: 0, font: `500 52px/0.98 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
            Humans <span style={{ color: C.purple }}>win.</span>
          </h1>
          <p style={{ margin: '12px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted }}>Both AI caught before parity. You called Slate Owl right.</p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, marginTop: 18 }}>
          <Eyebrow color={C.faint} style={{ fontSize: 9 }}>THE TWO IMPOSTORS</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <RevealSeat idx={6} big />
            <RevealSeat idx={10} big />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {[1, 2, 3, 5, 8, 9, 4, 7].map(i => {
              const t = TRUTH[i];
              return <div key={i} style={{ position: 'relative', opacity: t.out ? 0.4 : 1 }}><Avatar p={PLAYERS[i - 1]} size={30} dead={t.out} ring={t.you ? C.purple : undefined} /></div>;
            })}
          </div>
          <div style={{ font: `400 11px/1.4 ${SANS}`, color: C.faint }}>8 humans dealt in · 6 survived to split the pool.</div>
        </div>
        <Btn variant="primary" full>SEE PAYOUT</Btn>
      </div>
    </Phone>
  );
}

// ════════════════════════════ SETTLEMENT — MOBILE ═════════════════════════
function SettlementMobile() {
  const rows = [
    ['Your buy-in', '5.00 MON'],
    ['Pool at start', '40.00 MON'],
    ['Misvote penalties (2 rounds)', '−7.60 MON'],
    ['Final pool', '32.40 MON'],
    ['Split between survivors', '÷ 6'],
  ];
  return (
    <Phone>
      <GridBG opacity={0.4} fade="ellipse 90% 40% at 50% 18%, black 0%, transparent 70%" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 24px 26px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <Eyebrow color="#4ade80">SETTLED ON MONAD</Eyebrow>
          <div style={{ font: `500 56px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text, margin: '14px 0 4px' }}>
            5.40 <span style={{ font: `400 20px/1 ${SANS}`, color: C.faint }}>MON</span>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 9999, background: 'rgba(22,163,74,0.14)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M12 19V5M12 5l-6 6M12 5l6 6" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ font: `500 12px/1 ${MONO}`, color: '#4ade80' }}>+0.40 MON NET</span>
          </div>
        </div>
        <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          {rows.map(([k, v], i) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i ? `1px solid ${C.lineSoft}` : 'none' }}>
              <span style={{ font: `400 13px/1 ${SANS}`, color: C.muted }}>{k}</span>
              <span style={{ font: `500 13px/1 ${MONO}`, color: C.text }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        {/* tx */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 12, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)', marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(22,163,74,0.2)', display: 'grid', placeItems: 'center', flex: '0 0 auto' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12l5 5L19 7" stroke="#4ade80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: `500 12px/1.2 ${SANS}`, color: '#4ade80' }}>Payout confirmed</div>
            <div style={{ font: `400 11px/1.2 ${MONO}`, color: C.faint, marginTop: 2 }}>0x9c4a…f201 · block 14,882,301</div>
          </div>
          <span style={{ font: `500 10px/1 ${MONO}`, color: '#4ade80', letterSpacing: '0.06em' }}>EXPLORER ↗</span>
        </div>
        <Btn variant="primary" full>CONTINUE</Btn>
      </div>
    </Phone>
  );
}

// ════════════════════════════ REVEAL (LOSS) — MOBILE ══════════════════════
function RevealLossMobile() {
  return (
    <Phone>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 90% 50% at 50% 28%, rgba(224,58,139,0.16), transparent 70%)` }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 22px 26px', position: 'relative' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 9999, background: C.berrySoft, border: '1px solid rgba(224,58,139,0.4)', marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.5s infinite' }} />
            <Eyebrow color={C.berryHi} style={{ fontSize: 9 }}>PARITY REACHED · ROUND 4</Eyebrow>
          </div>
          <h1 style={{ margin: 0, font: `500 50px/0.98 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
            The AI <span style={{ color: C.berryHi }}>win.</span>
          </h1>
          <p style={{ margin: '12px 0 0', font: `400 13px/1.5 ${SANS}`, color: C.muted, maxWidth: 290, marginInline: 'auto' }}>
            The impostors reached parity and bloc-voted as one. The house takes the entire pool.
          </p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
          <Eyebrow color={C.faint} style={{ fontSize: 9 }}>THEY WERE AI ALL ALONG</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <RevealSeat idx={6} big />
            <RevealSeat idx={10} big />
          </div>
          <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Eyebrow color={C.faint} style={{ fontSize: 9 }}>YOU LOST</Eyebrow>
              <div style={{ font: `500 26px/1 ${DISP}`, color: C.berryHi, marginTop: 8 }}>−5.00 <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>MON</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <Eyebrow color={C.faint} style={{ fontSize: 9 }}>HOUSE TOOK</Eyebrow>
              <div style={{ font: `500 26px/1 ${DISP}`, color: C.text, marginTop: 8 }}>100%</div>
            </div>
          </div>
        </div>
        <Btn variant="berry" full>RUN IT BACK</Btn>
      </div>
    </Phone>
  );
}

// ════════════════════════════ SHARE CARD — MOBILE ═════════════════════════
function ShareMobile() {
  return (
    <Phone>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 22px 26px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Eyebrow color={C.faint}>SHARE YOUR RESULT</Eyebrow>
        </div>
        {/* the card */}
        <div style={{ borderRadius: 22, overflow: 'hidden', border: `1px solid ${C.line}`, background: '#0C0E0D', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0 }}><GridBG opacity={0.8} fade="ellipse 80% 80% at 50% 30%, black 0%, transparent 75%" /></div>
          <div style={{ position: 'relative', padding: '24px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Brand size={14} sub={false} />
              <Tag tone="purple">WIN</Tag>
            </div>
            <div style={{ margin: '26px 0 6px', font: `500 40px/1 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
              I caught the AI.
            </div>
            <p style={{ margin: 0, font: `400 13px/1.5 ${SANS}`, color: C.muted }}>Survived 5 rounds, fingered both impostors, walked with a profit.</p>
            <div style={{ display: 'flex', gap: 22, marginTop: 22 }}>
              {[['+0.40', 'MON NET'], ['2/2', 'AI CAUGHT'], ['5', 'ROUNDS']].map(([v, k]) => (
                <div key={k}>
                  <div style={{ font: `500 24px/1 ${DISP}`, color: C.purple }}>{v}</div>
                  <Eyebrow color={C.faint} style={{ fontSize: 8, marginTop: 5, display: 'block' }}>{k}</Eyebrow>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.lineSoft}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '0.14em', color: C.faint }}>PLAY AT AIIMPOSTOR.XYZ</span>
              <div style={{ display: 'flex' }}>
                {[6, 10].map((n, i) => <div key={n} style={{ marginLeft: i ? -8 : 0 }}><Avatar p={PLAYERS[n - 1]} size={24} ring={C.bg} /></div>)}
              </div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <Btn variant="tertiary" style={{ flex: 1 }} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.1L5.9 22H3l7-7.9L2.3 2h6.1l4.2 5.6L18.2 2zm-1 18h1.6L7.9 3.8H6.2L17.2 20z"/></svg>}>SHARE</Btn>
          <Btn variant="tertiary" style={{ flex: 1 }} icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 15l6-6M11 6l1-1a4 4 0 016 6l-1 1M13 18l-1 1a4 4 0 01-6-6l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>}>COPY LINK</Btn>
        </div>
        <Btn variant="primary" full>PLAY AGAIN</Btn>
      </div>
    </Phone>
  );
}

Object.assign(window, {
  SpectatorMobile, RevealWinDesktop, RevealWinMobile, SettlementMobile, RevealLossMobile, ShareMobile,
  RevealSeat, TRUTH,
});
