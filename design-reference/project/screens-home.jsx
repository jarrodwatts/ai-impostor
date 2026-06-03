// screens-home.jsx — Home / landing (explain + get started)
// Depends on screens-shared.jsx globals.

// small concrete product preview (chat + vote) so people "get it" instantly
function MiniPreview({ compact = false }) {
  return (
    <div style={{ width: '100%', borderRadius: compact ? 16 : 20, overflow: 'hidden', border: `1px solid ${C.line}`, background: '#0C0E0D', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0 }}><GridBG opacity={0.7} fade="ellipse 90% 90% at 60% 10%, black 0%, transparent 78%" /></div>
      <div style={{ position: 'relative', padding: compact ? 14 : 20 }}>
        {!compact && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <RoundPill round={3} phase="DISCUSSION" />
            <Timer t="1:43" label="" />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 9 : 11 }}>
          <ChatMsg system text={compact ? "What's a hot take you'd defend to the death?" : "What's a hot take you'd defend to the death?"} />
          <ChatMsg p={PLAYERS[1]} text="pineapple on pizza is correct and you all know it" />
          {!compact && <ChatMsg p={PLAYERS[7]} text="cereal before milk, every time. no exceptions" />}
          <TypingRow p={PLAYERS[5]} />
        </div>
        <div style={{ marginTop: compact ? 12 : 16, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 12, background: C.berrySoft, border: `1px solid rgba(224,58,139,0.35)` }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flex: '0 0 auto' }}><path d="M12 3l7 4v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V7l7-4z" stroke={C.berryHi} strokeWidth="1.7" strokeLinejoin="round"/></svg>
          <span style={{ font: `400 12px/1.3 ${SANS}`, color: C.muted }}><span style={{ color: C.berryHi, fontWeight: 600 }}>Vote phase next.</span> One of them types a little too clean…</span>
        </div>
      </div>
    </div>
  );
}

const STEPS = [
  ['01', 'Sit down', 'Connect a Monad wallet, pay the buy-in, and get dealt into a table of ten with a random name and face.'],
  ['02', 'Talk', "Each round opens with a prompt. Chat for two minutes. Some players are AI built to blend in — find the tells."],
  ['03', 'Vote', 'Secret ballot, one vote each. The most-voted player is out. Misfire on a human and the pool takes a hit.'],
  ['04', 'Cash out', 'Vote out every AI before they reach parity, and the survivors split the pool in MON.'],
];

// ════════════════════════════ HOME — DESKTOP ══════════════════════════════
function HomeDesktop() {
  return (
    <Screen h={1240}>
      <GridBG opacity={0.55} fade="ellipse 75% 55% at 70% 16%, black 0%, transparent 68%" />
      {/* nav */}
      <div style={{ height: 68, flex: '0 0 68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px', borderBottom: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Brand size={19} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ font: `400 13px/1 ${SANS}`, color: C.muted }}>How it works</span>
          <span style={{ font: `400 13px/1 ${SANS}`, color: C.muted }}>Stakes</span>
          <Btn variant="secondary" sm>CONNECT WALLET</Btn>
        </div>
      </div>

      {/* hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, padding: '64px 48px 56px', alignItems: 'center', position: 'relative' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 9999, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.02)', marginBottom: 26 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.6s infinite' }} />
            <Eyebrow color={C.muted}>SOCIAL DEDUCTION · ON MONAD</Eyebrow>
          </div>
          <h1 style={{ margin: 0, font: `500 78px/0.98 ${DISP}`, letterSpacing: '-0.04em', color: C.text }}>
            Some of you<br />aren't <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p style={{ margin: '24px 0 0', font: `400 17px/1.55 ${SANS}`, color: C.muted, maxWidth: 440 }}>
            Ten players share a chat. A few are hidden AI, built to pass as human. Talk, read the room, and vote them out before they take over — the survivors split the pool in MON.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <Btn variant="primary" style={{ height: 52, padding: '0 30px' }}>CONNECT &amp; PLAY</Btn>
            <Btn variant="tertiary" style={{ height: 52, padding: '0 26px' }}>HOW IT WORKS</Btn>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20 }}>
            <span style={{ font: `400 13px/1 ${SANS}`, color: C.faint }}>Free to try on Monad testnet.</span>
            <span style={{ width: 3, height: 3, borderRadius: 9999, background: C.faint }} />
            <span style={{ font: `500 13px/1 ${SANS}`, color: C.purple }}>Need test MON?</span>
          </div>
        </div>
        <MiniPreview />
      </div>

      {/* how it works */}
      <div style={{ padding: '36px 48px', borderTop: `1px solid ${C.lineSoft}`, position: 'relative' }}>
        <Eyebrow color={C.faint} style={{ marginBottom: 24, display: 'block' }}>HOW A GAME GOES</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STEPS.map(([n, t, d]) => (
            <div key={n} style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22 }}>
              <span style={{ font: `500 12px/1 ${MONO}`, color: C.purple, letterSpacing: '0.1em' }}>{n}</span>
              <div style={{ font: `500 20px/1.15 ${DISP}`, color: C.text, margin: '14px 0 8px', letterSpacing: '-0.01em' }}>{t}</div>
              <div style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* stakes */}
      <div style={{ padding: '20px 48px 48px', position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderRadius: 18, overflow: 'hidden', border: `1px solid ${C.line}`, background: C.bgRaise }}>
          {[
            ['Winners split the pool', 'Survive with the AI gone and the remaining pool is divided equally among you, in MON.', C.purple],
            ['Misfires cost the table', 'Vote out a human and the pool drops 10% that round. Vote out an AI and it costs nothing.', C.amber],
            ['Let them reach parity', 'If the AI ever equal the humans, they take everything. Equality is already a loss.', C.berryHi],
          ].map(([t, d, c], i) => (
            <div key={t} style={{ padding: 24, borderLeft: i ? `1px solid ${C.line}` : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ width: 7, height: 7, borderRadius: 9999, background: c }} />
                <div style={{ font: `500 16px/1.2 ${DISP}`, color: C.text }}>{t}</div>
              </div>
              <div style={{ font: `400 13px/1.5 ${SANS}`, color: C.muted }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, padding: '24px 28px', borderRadius: 18, background: C.purpleSoft, border: `1px solid rgba(131,110,249,0.3)` }}>
          <div>
            <div style={{ font: `500 26px/1.1 ${DISP}`, color: C.text, letterSpacing: '-0.02em' }}>Think you can spot the machine?</div>
            <div style={{ font: `400 14px/1.5 ${SANS}`, color: C.muted, marginTop: 6 }}>Connect your wallet and join the next table — it fills in seconds.</div>
          </div>
          <Btn variant="primary" style={{ height: 52, padding: '0 30px' }}>CONNECT &amp; PLAY</Btn>
        </div>
      </div>
    </Screen>
  );
}

// ════════════════════════════ HOME — MOBILE ═══════════════════════════════
const STEPS_SHORT = [
  ['01', 'Sit down', 'Connect, pay the buy-in, get dealt a random face.'],
  ['02', 'Talk', 'Two minutes of chat per round. Find the tells.'],
  ['03', 'Vote', 'Secret ballot. Misfire on a human, the pool drops 10%.'],
  ['04', 'Cash out', 'Clear every AI before parity — survivors split the pool.'],
];

function HomeMobile() {
  return (
    <Phone>
      <GridBG opacity={0.6} fade="ellipse 90% 40% at 50% 12%, black 0%, transparent 72%" />
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* nav */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 22px' }}>
          <Brand size={16} />
          <Btn variant="tertiary" sm>CONNECT</Btn>
        </div>
        {/* hero */}
        <div style={{ flex: '0 0 auto', padding: '12px 22px 0' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 9999, border: `1px solid ${C.line}`, background: 'rgba(255,255,255,0.02)', marginBottom: 14 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: C.berryHi, animation: 'aiPulse 1.6s infinite' }} />
            <Eyebrow color={C.muted} style={{ fontSize: 9 }}>SOCIAL DEDUCTION · ON MONAD</Eyebrow>
          </div>
          <h1 style={{ margin: 0, font: `500 40px/0.98 ${DISP}`, letterSpacing: '-0.03em', color: C.text }}>
            Some of you aren't <span style={{ color: C.berryHi }}>human.</span>
          </h1>
          <p style={{ margin: '12px 0 0', font: `400 13.5px/1.45 ${SANS}`, color: C.muted }}>
            Ten players, a few hidden AI. Vote them out before they take over — survivors split the pool in MON.
          </p>
        </div>
        {/* compact preview */}
        <div style={{ flex: '0 0 auto', padding: '16px 22px 0' }}><MiniPreview compact /></div>
        {/* steps condensed */}
        <div style={{ flex: '0 0 auto', padding: '16px 22px 6px' }}>
          <Eyebrow color={C.faint} style={{ fontSize: 9, display: 'block', marginBottom: 11 }}>HOW A GAME GOES</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {STEPS_SHORT.map(([n, t, d]) => (
              <div key={n} style={{ display: 'flex', gap: 11 }}>
                <span style={{ font: `500 10px/1.5 ${MONO}`, color: C.purple, flex: '0 0 auto' }}>{n}</span>
                <div style={{ lineHeight: 1.4 }}>
                  <span style={{ font: `600 13px/1.4 ${DISP}`, color: C.text }}>{t}. </span>
                  <span style={{ font: `400 12.5px/1.4 ${SANS}`, color: C.muted }}>{d}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* sticky CTA */}
      <div style={{ flex: '0 0 auto', padding: '12px 22px 18px', borderTop: `1px solid ${C.lineSoft}`, background: C.bg }}>
        <Btn variant="primary" full>CONNECT &amp; PLAY</Btn>
        <div style={{ textAlign: 'center', marginTop: 9, font: `400 11px/1 ${SANS}`, color: C.faint }}>
          Free to try on Monad testnet · <span style={{ color: C.purple }}>need test MON?</span>
        </div>
      </div>
    </Phone>
  );
}

Object.assign(window, { HomeDesktop, HomeMobile });
