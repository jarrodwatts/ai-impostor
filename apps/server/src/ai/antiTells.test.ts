import { describe, expect, it } from "vitest";
import { stripAiTells } from "./antiTells.js";

/**
 * Anti-tell sanitizer tests. The function is the last line of defense before
 * an AI message is broadcast — it MUST be idempotent, MUST never throw, and
 * MUST strip the specific tells we list without mangling adjacent text.
 */
describe("stripAiTells", () => {
  it("strips em dashes and the spaces around them", () => {
    expect(stripAiTells("nah—this is mid")).toBe("nah this is mid");
    expect(stripAiTells("nah — this is mid")).toBe("nah this is mid");
    expect(stripAiTells("nah  —  this is mid")).toBe("nah this is mid");
  });

  it("converts en dashes to hyphens", () => {
    expect(stripAiTells("monad–lisbon offsite")).toBe("monad-lisbon offsite");
  });

  it("converts smart quotes to ascii", () => {
    expect(stripAiTells("\u201cmid\u201d")).toBe('"mid"');
    expect(stripAiTells("don\u2019t")).toBe("don't");
  });

  it("converts unicode ellipsis to three dots", () => {
    expect(stripAiTells("idk\u2026")).toBe("idk...");
  });

  it("converts semicolons to commas (no human uses ; in chat)", () => {
    expect(stripAiTells("its mid; everyone knows")).toBe("its mid, everyone knows");
    // Spaces around the semicolon are absorbed by the regex + double-space
    // collapse — "a ; b" becomes "a, b" (clean comma, single space).
    expect(stripAiTells("a ; b")).toBe("a, b");
  });

  it("strips essay-opener words at the start", () => {
    expect(stripAiTells("However, I disagree")).toBe("I disagree");
    expect(stripAiTells("Moreover, this is mid")).toBe("this is mid");
    expect(stripAiTells("Furthermore: ratio")).toBe("ratio");
    expect(stripAiTells("Indeed it slaps")).toBe("it slaps");
  });

  it("strips STACKED openers (loops up to 3 times)", () => {
    expect(stripAiTells("However, Moreover, that's mid")).toBe("that's mid");
    expect(stripAiTells("Indeed, Furthermore, Additionally, ngmi")).toBe("ngmi");
  });

  it("preserves winky/wink emoticons (the negative-lookahead spares them)", () => {
    expect(stripAiTells("lol ;)")).toBe("lol ;)");
    expect(stripAiTells("nice ;P")).toBe("nice ;P");
    expect(stripAiTells("cope ;D")).toBe("cope ;D");
    // But a true semicolon still gets stripped.
    expect(stripAiTells("a; b")).toBe("a, b");
  });

  it("does NOT strip 'however' mid-sentence (only opener)", () => {
    expect(stripAiTells("its mid however you slice it")).toBe(
      "its mid however you slice it",
    );
  });

  it("is idempotent (running twice gives the same result)", () => {
    const inputs = [
      "nah — this is mid",
      "However, I disagree",
      "don\u2019t cope; ratio",
      "fr it slaps",
      "",
    ];
    for (const s of inputs) {
      const once = stripAiTells(s);
      const twice = stripAiTells(once);
      expect(twice).toBe(once);
    }
  });

  it("leaves clean crypto-twitter text untouched", () => {
    const inputs = [
      "ratio + cope + ngmi",
      "this is so mid",
      "lmao what is happening rn",
      "nah dune is right",
      "ser this is a wendys",
      "",
      "gm",
    ];
    for (const s of inputs) {
      expect(stripAiTells(s)).toBe(s);
    }
  });

  it("collapses double-spaces created by em-dash replacement", () => {
    expect(stripAiTells("a  —  b")).toBe("a b");
    expect(stripAiTells("hello  world")).toBe("hello world");
  });

  it("never throws on edge inputs", () => {
    expect(() => stripAiTells("")).not.toThrow();
    expect(() => stripAiTells("—".repeat(50))).not.toThrow();
    expect(() => stripAiTells(";;;;")).not.toThrow();
  });
});
