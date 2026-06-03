import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatGenRequest,
  ChatGenResult,
  LlmClient,
  TranscriptLine,
  VoteGenRequest,
  VoteGenResult,
} from "./llm.js";

/**
 * Real Claude-backed LlmClient.
 *
 * Prompt-caching strategy (per the claude-api skill):
 *   - The stable RULES + this seat's PERSONA + teammate info go in the `system`
 *     array with cache_control on the last block → cached prefix, reused across
 *     every turn in the game.
 *   - The transcript is rendered as a single user message; we put a
 *     cache_control breakpoint on the transcript-so-far block so the growing
 *     history is incrementally cached (each turn reuses the prior prefix and
 *     only the newest lines are billed at full rate).
 *   - Render order is tools → system → messages; we keep `system` byte-stable
 *     within a game so the cache never invalidates.
 *
 * Model: claude-opus-4-8 with adaptive thinking and low effort (chat replies
 * are short and latency-sensitive — the AgentRunner hides API latency behind
 * the think-delay, but low effort keeps cost/latency bounded).
 */

const MODEL = "claude-opus-4-8";

/**
 * Adaptive thinking + low effort, per the claude-api skill guidance for Opus
 * 4.8. The pinned @anthropic-ai/sdk (0.39.0) predates these fields in its
 * request *types*, so we attach them via a loosely-typed extension object and
 * spread it into the create() body. The wire shape is what the API expects;
 * only the local d.ts lags. (No dependency change is permitted in this task.)
 */
const ADAPTIVE_THINKING = {
  thinking: { type: "adaptive" },
  output_config: { effort: "low" },
} as Record<string, unknown>;

export interface AnthropicLlmOptions {
  apiKey?: string;
  model?: string;
}

function renderTranscript(lines: TranscriptLine[]): string {
  return lines
    .map((l) => (l.self ? `${l.speaker} (you): ${l.text}` : `${l.speaker}: ${l.text}`))
    .join("\n");
}

function firstText(content: Anthropic.ContentBlock[]): string {
  for (const block of content) {
    if (block.type === "text") return block.text;
  }
  return "";
}

export class AnthropicLlmClient implements LlmClient {
  private client: Anthropic;
  private model: string;

  constructor(opts: AnthropicLlmOptions = {}) {
    // The SDK reads ANTHROPIC_API_KEY from env by default; allow override.
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.model = opts.model ?? MODEL;
  }

  async generateMessage(req: ChatGenRequest): Promise<ChatGenResult> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 256,
      // Adaptive thinking + low effort (see ADAPTIVE_THINKING note above).
      ...ADAPTIVE_THINKING,
      system: [
        {
          type: "text",
          text: req.systemPrefix,
          // Cache the rules+persona prefix for the whole game.
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Live chat so far:\n${renderTranscript(req.transcript)}\n\n` +
                `You are "${req.selfCodename}". Write your next single chat message, in character, ` +
                `under ${req.maxChars} characters. Output ONLY the message text — no quotes, no name prefix.`,
              // Incrementally cache the transcript-so-far prefix.
              cache_control: { type: "ephemeral" },
            },
          ],
        },
      ],
    });
    const text = firstText(res.content).trim().slice(0, req.maxChars);
    return { text };
  }

  async chooseVote(req: VoteGenRequest): Promise<VoteGenResult> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 64,
      ...ADAPTIVE_THINKING,
      system: [
        {
          type: "text",
          text: req.systemPrefix,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `Live chat so far:\n${renderTranscript(req.transcript)}\n\n` +
                `You are "${req.selfCodename}". Vote to eliminate exactly one player. ` +
                `Choose from: ${req.eligibleTargets.join(", ")}. ` +
                `Output ONLY the chosen player's name, nothing else.`,
            },
          ],
        },
      ],
    });
    const raw = firstText(res.content).trim();
    // Map the model's answer back to an eligible target (defensive).
    const match =
      req.eligibleTargets.find((t) => raw.toLowerCase() === t.toLowerCase()) ??
      req.eligibleTargets.find((t) =>
        raw.toLowerCase().includes(t.toLowerCase()),
      ) ??
      req.eligibleTargets[0] ??
      "";
    return { targetCodename: match };
  }
}
