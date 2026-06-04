/**
 * AudioEngine — a tiny, dependency-free client audio layer for the demo.
 *
 *  - Background music: a looped HTMLAudioElement (the mp3 in /public/audio),
 *    held at a quiet background level with a short fade in/out.
 *  - Sound effects: SYNTHESIZED on the fly with the Web Audio API (oscillator +
 *    gain envelope), so there are NO extra asset files to ship. Each cue is a
 *    short, subtle blip tuned to the game's sci-fi vibe. When real SFX files are
 *    generated later, `playSfx` can be swapped to play buffers instead — callers
 *    don't change.
 *
 * Browser autoplay policy: audio cannot start until a user gesture, so nothing
 * sounds until `unlock()` is called (wired to the first pointer/key event).
 *
 * SSR-safe: all browser APIs are touched lazily inside methods, never at import.
 */

export type SfxName =
  | "click" // generic UI tap
  | "message" // an incoming chat line
  | "voteOpen" // the vote window opens
  | "vote" // your ballot locks
  | "eliminate" // a seat is voted out
  | "reveal"; // the settlement / who-was-who reveal

const MUSIC_SRC = "/audio/airlock-afterglow.mp3";
const MUSIC_VOLUME = 0.32; // quiet background bed
const STORAGE_KEY = "aau:muted";

class AudioEngine {
  private ctx: AudioContext | null = null;
  private music: HTMLAudioElement | null = null;
  private masterMuted = false;
  private unlocked = false;
  private wantsMusic = true; // music should play once unlocked (unless muted)
  private lastSfxAt: Partial<Record<SfxName, number>> = {};
  private listeners = new Set<(muted: boolean) => void>();

  /** Read the persisted mute preference (client only). Call once on mount. */
  init(): void {
    if (typeof window === "undefined") return;
    try {
      this.masterMuted = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }
  }

  isMuted(): boolean {
    return this.masterMuted;
  }

  subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.masterMuted);
  }

  /**
   * Resume audio after the first user gesture. Idempotent. Starts the music bed
   * if not muted. Safe to call on every early gesture.
   */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    void this.ctx?.resume();
    this.unlocked = true;
    if (this.wantsMusic && !this.masterMuted) this.startMusic();
  }

  private ensureMusic(): HTMLAudioElement | null {
    if (typeof window === "undefined") return null;
    if (!this.music) {
      const el = new Audio(MUSIC_SRC);
      el.loop = true;
      el.preload = "auto";
      el.volume = 0;
      this.music = el;
    }
    return this.music;
  }

  private startMusic(): void {
    const el = this.ensureMusic();
    if (!el) return;
    el.play()
      .then(() => this.fadeMusic(MUSIC_VOLUME, 900))
      .catch(() => {
        /* autoplay still blocked; will retry on next gesture */
      });
  }

  private fadeMusic(to: number, ms: number): void {
    const el = this.music;
    if (!el) return;
    const from = el.volume;
    const start = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      el.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /** Toggle all audio. Persists the choice. */
  toggleMute(): void {
    this.setMuted(!this.masterMuted);
  }

  setMuted(muted: boolean): void {
    this.masterMuted = muted;
    try {
      window.localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (muted) {
      if (this.music) this.fadeMusic(0, 300);
    } else if (this.unlocked) {
      this.startMusic();
    }
    this.emit();
  }

  /**
   * Play a short synthesized cue. Cheap, subtle, and rate-limited per cue so a
   * burst (e.g. many chat lines) can't stack into noise.
   */
  playSfx(name: SfxName): void {
    if (this.masterMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const wallNow = typeof performance !== "undefined" ? performance.now() : 0;
    const minGap = name === "message" ? 110 : 60;
    if (wallNow - (this.lastSfxAt[name] ?? 0) < minGap) return;
    this.lastSfxAt[name] = wallNow;

    switch (name) {
      case "click":
        this.blip({ type: "sine", from: 660, to: 660, dur: 0.05, gain: 0.05 });
        break;
      case "message":
        this.blip({ type: "sine", from: 540, to: 580, dur: 0.07, gain: 0.04 });
        break;
      case "voteOpen":
        this.blip({ type: "triangle", from: 392, to: 587, dur: 0.16, gain: 0.07 });
        break;
      case "vote":
        // two-note confirm
        this.blip({ type: "sine", from: 523, to: 523, dur: 0.09, gain: 0.07 });
        this.blip({ type: "sine", from: 784, to: 784, dur: 0.12, gain: 0.07, delay: 0.09 });
        break;
      case "eliminate":
        // descending zap
        this.blip({ type: "sawtooth", from: 320, to: 90, dur: 0.32, gain: 0.09 });
        break;
      case "reveal":
        // rising sci-fi sting (stacked)
        this.blip({ type: "triangle", from: 330, to: 660, dur: 0.5, gain: 0.08 });
        this.blip({ type: "sine", from: 495, to: 990, dur: 0.5, gain: 0.05, delay: 0.04 });
        break;
    }
  }

  /** One enveloped oscillator note. */
  private blip(o: {
    type: OscillatorType;
    from: number;
    to: number;
    dur: number;
    gain: number;
    delay?: number;
  }): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.from, t0);
    if (o.to !== o.from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
    // quick attack, smooth exponential release (no click)
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }
}

/** Module singleton — shared across the app. */
export const audio = new AudioEngine();
