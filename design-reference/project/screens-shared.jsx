// screens-shared.jsx — primitives for AI Impostor handoff screens
// Dark monapp vocabulary. Exports to window at the bottom.

const C = {
  bg: '#0E100F',
  bgRaise: '#121212',
  card: '#161616',
  cardHi: '#1C1C1E',
  line: 'rgba(255,255,255,0.08)',
  lineSoft: 'rgba(255,255,255,0.05)',
  text: '#FBFAF9',
  muted: 'rgba(255,255,255,0.62)',
  faint: 'rgba(255,255,255,0.40)',
  purple: '#836EF9',
  purplePri: '#6E54FF',
  purpleSoft: 'rgba(131,110,249,0.14)',
  berry: '#A0055D',
  berryHi: '#E03A8B',
  berrySoft: 'rgba(224,58,139,0.14)',
  green: '#16a34a',
  amber: '#ca8a04',
  red: '#dc2626',
};

const MONO = "'Roboto Mono', ui-monospace, Menlo, monospace";
const DISP = "'Britti Sans', 'Inter', system-ui, sans-serif";
const SANS = "'Inter', system-ui, sans-serif";

// ── 10 per-game player identities (color swatch + codename) ─────────
const PLAYERS = [
  { id: 'p1', name: 'VIOLET HERON', c: '#836EF9', you: true },
  { id: 'p2', name: 'AMBER LYNX',  c: '#D1884F' },
  { id: 'p3', name: 'COBALT WREN', c: '#2E8BEA' },
  { id: 'p4', name: 'CRIMSON FOX', c: '#E03A8B' },
  { id: 'p5', name: 'JADE MOTH',   c: '#1FB573' },
  { id: 'p6', name: 'SLATE OWL',   c: '#7C8AA0' },
  { id: 'p7', name: 'RUST HARE',   c: '#F0653A' },
  { id: 'p8', name: 'PEARL DOE',   c: '#C9C2E6' },
  { id: 'p9', name: 'TEAL STAG',   c: '#13A8A0' },
  { id: 'p10', name: 'ASH VOLE',   c: '#9489FC' },
];

const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2);

// ── Faint purple grid background (hero-grid motif) ──────────────────
function GridBG({ opacity = 1, fade = 'ellipse at center, black 35%, transparent 88%' }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, opacity,
      backgroundImage:
        `linear-gradient(rgba(82,27,255,0.10) 1px, transparent 1px),
         linear-gradient(90deg, rgba(82,27,255,0.10) 1px, transparent 1px)`,
      backgroundSize: '38px 38px',
      WebkitMaskImage: `radial-gradient(${fade})`,
      maskImage: `radial-gradient(${fade})`,
      pointerEvents: 'none',
    }} />
  );
}

// ── Mono eyebrow / label ────────────────────────────────────────────
function Eyebrow({ children, color = C.faint, style = {} }) {
  return (
    <span style={{
      font: `500 11px/1 ${MONO}`, letterSpacing: '0.16em',
      textTransform: 'uppercase', color, ...style,
    }}>{children}</span>
  );
}

// ── Buttons (radial pill) ───────────────────────────────────────────
function Btn({ variant = 'primary', children, full, sm, style = {}, icon }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: sm ? 36 : 48, padding: sm ? '0 16px' : '0 24px',
    font: `500 ${sm ? 11 : 12}px/1 ${MONO}`, letterSpacing: '0.08em',
    textTransform: 'uppercase', borderRadius: 9999, border: 0, cursor: 'pointer',
    width: full ? '100%' : 'auto', whiteSpace: 'nowrap', ...style,
  };
  const v = {
    primary: {
      color: '#fff',
      background: `radial-gradient(50% 50% at 50% 50%, rgba(110,84,255,0) 0%, rgba(255,255,255,0.14) 100%), ${C.purplePri}`,
      boxShadow: `0 0 0 1px rgba(79,71,235,0.9), inset 0 1px 0.5px rgba(255,255,255,0.25), inset 0 -1px 0.5px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.3)`,
    },
    secondary: {
      color: '#0A0A0A',
      background: `radial-gradient(50% 50% at 50% 50%, rgba(250,250,250,0.33) 0%, rgba(115,115,115,0.04) 100%), ${C.text}`,
      boxShadow: `inset 0 1px 0.5px #fff, inset 0 -1px 0.5px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.25)`,
    },
    tertiary: {
      color: '#fff',
      background: 'rgba(255,255,255,0.04)',
      boxShadow: `inset 0 0 0 1px ${C.line}`,
    },
    berry: {
      color: '#fff',
      background: `radial-gradient(50% 50% at 50% 50%, rgba(224,58,139,0) 0%, rgba(255,255,255,0.16) 100%), ${C.berry}`,
      boxShadow: `0 0 0 1px rgba(224,58,139,0.6), inset 0 1px 0.5px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.3)`,
    },
  }[variant];
  return <button style={{ ...base, ...v }}>{icon}{children}</button>;
}

// ── Avatar — uniform color swatch + mono monogram ───────────────────
function Avatar({ p, size = 38, dead = false, ring, glyph }) {
  const r = Math.round(size * 0.28);
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <div style={{
        width: size, height: size, borderRadius: r,
        background: dead ? '#1a1a1a' : p.c,
        display: 'grid', placeItems: 'center',
        font: `600 ${Math.round(size * 0.34)}px/1 ${MONO}`, letterSpacing: '0.02em',
        color: dead ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.78)',
        filter: dead ? 'grayscale(1)' : 'none',
        boxShadow: ring ? `0 0 0 2px ${C.bg}, 0 0 0 4px ${ring}` : 'none',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* faint inner geometric texture so swatches read as 'generated' */}
        <div style={{
          position: 'absolute', inset: 0,
          background: dead ? 'none' : `radial-gradient(120% 120% at 18% 12%, rgba(255,255,255,0.22), transparent 55%)`,
        }} />
        <span style={{ position: 'relative' }}>{initials(p.name)}</span>
      </div>
      {dead && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
        }}>
          <div style={{ width: '128%', height: 1.5, background: C.red, transform: 'rotate(-32deg)', opacity: 0.9 }} />
        </div>
      )}
      {glyph && (
        <div style={{
          position: 'absolute', right: -4, bottom: -4, width: size * 0.5, height: size * 0.5,
          borderRadius: 6, background: glyph.bg, border: `1.5px solid ${C.bg}`,
          display: 'grid', placeItems: 'center', color: '#fff',
          font: `700 ${size * 0.26}px/1 ${MONO}`,
        }}>{glyph.t}</div>
      )}
    </div>
  );
}

// ── Round / phase pill ──────────────────────────────────────────────
function RoundPill({ round = 3, phase = 'DISCUSSION', tone = C.purple }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 12px',
      borderRadius: 9999, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.line}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 9999, background: tone }} />
      <Eyebrow color={C.muted}>ROUND {round}</Eyebrow>
      <span style={{ width: 1, height: 12, background: C.line }} />
      <Eyebrow color={tone}>{phase}</Eyebrow>
    </div>
  );
}

// ── Countdown timer (mono) ──────────────────────────────────────────
function Timer({ t = '1:43', label = 'DISCUSSION ENDS', danger = false, big = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <Eyebrow color={C.faint} style={{ fontSize: 9, letterSpacing: '0.18em' }}>{label}</Eyebrow>
      <div style={{
        font: `500 ${big ? 40 : 22}px/1 ${DISP}`, letterSpacing: '-0.02em',
        color: danger ? C.berryHi : C.text, fontVariantNumeric: 'tabular-nums',
      }}>{t}</div>
    </div>
  );
}

// ── Pot Health indicator (NEVER shows MON / headcount) ──────────────
function PotHealth({ pct = 100, compact = false }) {
  const seg = 10;
  const lit = Math.round(pct / 10);
  const tone = pct >= 80 ? C.purple : pct >= 50 ? C.amber : C.berryHi;
  if (compact) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <Eyebrow color={C.faint} style={{ fontSize: 9 }}>POT HEALTH</Eyebrow>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {Array.from({ length: seg }).map((_, i) => (
              <span key={i} style={{
                width: 5, height: 14, borderRadius: 1,
                background: i < lit ? tone : 'rgba(255,255,255,0.10)',
              }} />
            ))}
          </div>
          <span style={{ font: `500 18px/1 ${DISP}`, color: tone, fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: C.bgRaise, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Eyebrow color={C.muted}>POT HEALTH</Eyebrow>
        <span style={{ font: `500 30px/1 ${DISP}`, color: tone, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: seg }).map((_, i) => (
          <span key={i} style={{
            flex: 1, height: 8, borderRadius: 2,
            background: i < lit ? tone : 'rgba(255,255,255,0.08)',
          }} />
        ))}
      </div>
      <div style={{ marginTop: 12, font: `400 11px/1.4 ${SANS}`, color: C.faint }}>
        Real MON revealed only at settlement. −10% each round a human is voted out.
      </div>
    </div>
  );
}

// ── Chat message ────────────────────────────────────────────────────
function ChatMsg({ p, text, you = false, system = false }) {
  if (system) {
    return (
      <div style={{
        alignSelf: 'center', textAlign: 'center', maxWidth: '86%', margin: '4px 0',
        padding: '10px 16px', borderRadius: 12, background: C.purpleSoft,
        border: `1px solid rgba(131,110,249,0.3)`,
      }}>
        <Eyebrow color={C.purple} style={{ fontSize: 9 }}>ROUND PROMPT</Eyebrow>
        <div style={{ font: `400 14px/1.45 ${SANS}`, color: C.text, marginTop: 6 }}>{text}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: you ? 'row-reverse' : 'row' }}>
      <Avatar p={p} size={30} />
      <div style={{ maxWidth: '74%', display: 'flex', flexDirection: 'column', alignItems: you ? 'flex-end' : 'flex-start' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ font: `500 10px/1 ${MONO}`, letterSpacing: '0.08em', color: you ? C.purple : C.faint }}>
            {p.name}{you ? ' · YOU' : ''}
          </span>
        </div>
        <div style={{
          padding: '9px 13px', borderRadius: 13,
          borderTopLeftRadius: you ? 13 : 3, borderTopRightRadius: you ? 3 : 13,
          background: you ? C.purpleSoft : 'rgba(255,255,255,0.05)',
          border: `1px solid ${you ? 'rgba(131,110,249,0.28)' : C.line}`,
          font: `400 14px/1.4 ${SANS}`, color: C.text,
        }}>{text}</div>
      </div>
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────────────
function TypingRow({ p }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Avatar p={p} size={30} />
      <div style={{
        padding: '11px 14px', borderRadius: 13, borderTopLeftRadius: 3,
        background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.line}`,
        display: 'flex', gap: 4, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: 9999, background: C.faint,
            animation: `aiBlink 1.2s ${i * 0.18}s infinite ease-in-out`,
          }} />
        ))}
      </div>
      <span style={{ font: `400 11px/1 ${MONO}`, color: C.faint, letterSpacing: '0.04em' }}>
        {p.name} is typing…
      </span>
    </div>
  );
}

// ── Mobile device frame ─────────────────────────────────────────────
function Phone({ children, time = '9:41', dark = true }) {
  return (
    <div style={{
      width: 390, height: 844, borderRadius: 46, background: '#000',
      padding: 5, boxShadow: '0 0 0 1px rgba(255,255,255,0.06)', position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 42, overflow: 'hidden',
        background: C.bg, position: 'relative', display: 'flex', flexDirection: 'column',
      }}>
        {/* status bar */}
        <div style={{
          height: 44, flex: '0 0 44px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 26px', position: 'relative', zIndex: 5,
        }}>
          <span style={{ font: `600 14px/1 ${SANS}`, color: C.text }}>{time}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.text }}>
            <svg width="17" height="11" viewBox="0 0 17 11" fill="none"><rect x="0" y="6" width="3" height="5" rx="1" fill="currentColor"/><rect x="4.5" y="3.5" width="3" height="7.5" rx="1" fill="currentColor"/><rect x="9" y="1.5" width="3" height="9.5" rx="1" fill="currentColor"/><rect x="13.5" y="0" width="3" height="11" rx="1" fill="currentColor" opacity="0.4"/></svg>
            <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x="0.5" y="0.5" width="18" height="10" rx="2.5" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="13" height="7" rx="1.2" fill="currentColor"/><rect x="20" y="3.5" width="1.5" height="4" rx="0.75" fill="currentColor" opacity="0.6"/></svg>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Desktop browser-ish frame (top app bar lives inside screens) ────
function Screen({ children, w = 1280, h = 800 }) {
  return (
    <div style={{ width: w, height: h, background: C.bg, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
}

// ── Brand lockup ────────────────────────────────────────────────────
function Brand({ size = 18, sub = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img src="assets/monad-logo-mark.svg" alt="" style={{ height: size + 4 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1 }}>
        <span style={{ font: `600 ${size}px/1 ${DISP}`, letterSpacing: '-0.01em', color: C.text }}>AI Impostor</span>
        {sub && <span style={{ font: `500 8px/1 ${MONO}`, letterSpacing: '0.22em', color: C.faint }}>BUILT ON MONAD</span>}
      </div>
    </div>
  );
}

// ── Tag chip (HUMAN / AI / SOON etc) ────────────────────────────────
function Tag({ children, tone = 'neutral' }) {
  const m = {
    neutral: { bg: 'rgba(255,255,255,0.06)', c: C.muted, b: C.line },
    human: { bg: 'rgba(22,163,74,0.16)', c: '#4ade80', b: 'rgba(22,163,74,0.4)' },
    ai: { bg: C.berrySoft, c: C.berryHi, b: 'rgba(224,58,139,0.45)' },
    purple: { bg: C.purpleSoft, c: C.purple, b: 'rgba(131,110,249,0.4)' },
  }[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 8px',
      borderRadius: 6, background: m.bg, border: `1px solid ${m.b}`,
      font: `600 9px/1 ${MONO}`, letterSpacing: '0.12em', color: m.c, textTransform: 'uppercase',
    }}>{children}</span>
  );
}

// keyframes + base
if (!document.getElementById('ai-impostor-kf')) {
  const s = document.createElement('style');
  s.id = 'ai-impostor-kf';
  s.textContent = `
    @keyframes aiBlink { 0%,60%,100%{opacity:0.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-2px)} }
    @keyframes aiPulse { 0%,100%{opacity:0.55} 50%{opacity:1} }
    @keyframes aiScan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
    .ai-scrollcol::-webkit-scrollbar{display:none}
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  C, MONO, DISP, SANS, PLAYERS, initials,
  GridBG, Eyebrow, Btn, Avatar, RoundPill, Timer, PotHealth,
  ChatMsg, TypingRow, Phone, Screen, Brand, Tag,
});
