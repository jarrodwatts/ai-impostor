import type { ReactNode } from "react";
import {
  C,
  PLAYERS,
  GridBG,
  Eyebrow,
  Btn,
  Avatar,
  RoundPill,
  Timer,
  PotHealth,
  Tag,
  ChatMsg,
  TypingRow,
  Brand,
} from "@/components/primitives";

export const metadata = { title: "AI Impostor — Styleguide" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-mon-line bg-mon-card p-6">
      <Eyebrow color={C.muted}>{title}</Eyebrow>
      <div className="flex flex-wrap items-center gap-6">{children}</div>
    </section>
  );
}

const you = PLAYERS[0];
const other = PLAYERS[3];

export default function StyleguidePage() {
  return (
    <main className="relative min-h-dvh bg-mon-bg px-6 py-10 sm:px-10">
      <GridBG opacity={0.6} />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <Brand size={22} />
          <Eyebrow>PRIMITIVE LIBRARY · M1 / B</Eyebrow>
        </header>

        <Section title="Brand">
          <Brand size={18} />
          <Brand size={28} sub={false} />
        </Section>

        <Section title="Eyebrow">
          <Eyebrow>DEFAULT FAINT</Eyebrow>
          <Eyebrow color={C.muted}>MUTED</Eyebrow>
          <Eyebrow color={C.purple}>PURPLE</Eyebrow>
          <Eyebrow color={C.berryHi}>BERRY</Eyebrow>
        </Section>

        <Section title="Buttons">
          <Btn variant="primary">Primary</Btn>
          <Btn variant="secondary">Secondary</Btn>
          <Btn variant="tertiary">Tertiary</Btn>
          <Btn variant="berry">Berry</Btn>
          <Btn variant="primary" size="sm">
            Small
          </Btn>
          <Btn variant="primary" disabled>
            Disabled
          </Btn>
          <div className="w-full">
            <Btn variant="primary" full>
              Full Width
            </Btn>
          </div>
        </Section>

        <Section title="Avatars">
          {PLAYERS.slice(0, 6).map((p) => (
            <Avatar key={p.id} p={p} />
          ))}
          <Avatar p={you} ring={C.purple} />
          <Avatar p={other} dead />
          <Avatar
            p={other}
            dead
            glyph={{ bg: C.berry, t: "AI" }}
          />
          <Avatar p={you} size={56} glyph={{ bg: C.green, t: "✓" }} />
        </Section>

        <Section title="Round pill">
          <RoundPill round={1} phase="DISCUSSION" tone={C.purple} />
          <RoundPill round={3} phase="VOTE" tone={C.amber} />
          <RoundPill round={5} phase="REVEAL" tone={C.berryHi} />
        </Section>

        <Section title="Timer">
          <Timer t="1:43" label="DISCUSSION ENDS" />
          <Timer t="0:08" label="VOTE LOCKS" danger />
          <Timer t="2:30" label="ROUND ENDS" big />
        </Section>

        <Section title="Pot health (percentage only — never MON / headcount)">
          <div className="w-72">
            <PotHealth pct={100} />
          </div>
          <div className="w-72">
            <PotHealth pct={60} />
          </div>
          <div className="w-72">
            <PotHealth pct={30} />
          </div>
          <PotHealth pct={90} compact />
          <PotHealth pct={50} compact />
          <PotHealth pct={20} compact />
        </Section>

        <Section title="Tags">
          <Tag tone="neutral">SOON</Tag>
          <Tag tone="human">HUMAN</Tag>
          <Tag tone="ai">AI</Tag>
          <Tag tone="purple">YOU</Tag>
        </Section>

        <Section title="Chat">
          <div className="flex w-full max-w-md flex-col gap-3">
            <ChatMsg system text="Describe a memory only a human would have." />
            <ChatMsg p={other} text="I burnt toast trying to multitask this morning." />
            <ChatMsg p={you} you text="Same — set off the smoke alarm twice." />
            <TypingRow p={PLAYERS[4]!} />
          </div>
        </Section>
      </div>
    </main>
  );
}
