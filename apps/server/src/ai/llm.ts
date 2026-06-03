/**
 * LlmClient — the seam between the AI runner and Claude. Two impls:
 *   - AnthropicLlmClient: real @anthropic-ai/sdk call w/ prompt-caching.
 *   - FakeLlmClient: deterministic, no network, no API key.
 *
 * Unit tests and `pnpm build`/`start` (without ANTHROPIC_API_KEY) use the fake,
 * so nothing here requires live infra to compile or run the headless sim.
 */

/** A single transcript line shown to the model. */
export interface TranscriptLine {
  /** Display codename of the speaker, or "SYSTEM" for round prompts. */
  speaker: string;
  text: string;
  /** True if this line is from the AI seat we're generating for. */
  self?: boolean;
}

export interface ChatGenRequest {
  /** Stable, cacheable prefix: rules + this seat's persona + teammate info. */
  systemPrefix: string;
  /** Incrementally-growing transcript (caller appends as the round evolves). */
  transcript: TranscriptLine[];
  /** This AI seat's display codename. */
  selfCodename: string;
  /** Soft upper bound on reply length in characters. */
  maxChars: number;
}

export interface ChatGenResult {
  text: string;
}

export interface VoteGenRequest {
  systemPrefix: string;
  transcript: TranscriptLine[];
  selfCodename: string;
  /** Eligible target codenames (alive, non-teammate AI excluded by caller). */
  eligibleTargets: string[];
}

export interface VoteGenResult {
  /** Chosen target codename (must be one of eligibleTargets). */
  targetCodename: string;
}

export interface LlmClient {
  /** Generate one in-character chat message. */
  generateMessage(req: ChatGenRequest): Promise<ChatGenResult>;
  /** Choose a vote target (a human, per AI strategy). */
  chooseVote(req: VoteGenRequest): Promise<VoteGenResult>;
}

/**
 * Deterministic fake. Produces plausible-but-canned chatter and a stable vote
 * pick. No randomness so sim tests are reproducible.
 */
export class FakeLlmClient implements LlmClient {
  private replies = [
    "hey all",
    "lol same",
    "idk something feels off about this round",
    "i'm just vibing tbh",
    "ok that's a weird thing to say",
    "fair point",
    "who are we even looking at rn",
    "not me i swear",
  ];
  private counter = 0;

  async generateMessage(req: ChatGenRequest): Promise<ChatGenResult> {
    const i = this.counter++ % this.replies.length;
    const text = this.replies[i]!.slice(0, req.maxChars);
    return { text };
  }

  async chooseVote(req: VoteGenRequest): Promise<VoteGenResult> {
    // Deterministic: pick the lexicographically-first eligible target so the
    // bloc converges on a single human (mimics coordinated bloc voting).
    const sorted = [...req.eligibleTargets].sort();
    const target = sorted[0] ?? req.eligibleTargets[0] ?? "";
    return { targetCodename: target };
  }
}
