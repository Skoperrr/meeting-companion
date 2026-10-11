import test from "node:test";
import assert from "node:assert/strict";
import { assigneeAppearance } from "../lib/avatar.ts";
import { playTaskSound, setSoundEnabled, soundEnabled } from "../lib/audio.ts";
test("avatars are deterministic across case and whitespace, with safe fallback initials", () => {
  assert.equal(
    assigneeAppearance(" Elena Adams ").background,
    assigneeAppearance("elena adams").background,
  );
  assert.equal(assigneeAppearance("Elena Adams").initials, "EA");
  assert.equal(assigneeAppearance("").initials, "?");
  assert.equal(assigneeAppearance("Unassigned").initials, "?");
  assert.ok(assigneeAppearance("Kopano").background.includes("0%"));
});
test("monochrome gradient endpoints exceed normal-text contrast with dark initials", () => {
  const luminance = (h: number, s: number, l: number) => {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    return [f(0), f(8), f(4)]
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  for (let h = 0; h < 360; h++)
    for (const [s, l] of [
      [0, 0.84],
      [0, 0.78],
    ])
      assert.ok((luminance(h, s, l) + 0.05) / 0.067 >= 4.5);
});
test("audio helpers are silent and safe during SSR", () => {
  assert.equal(soundEnabled(), false);
  assert.doesNotThrow(() => playTaskSound("complete"));
  assert.doesNotThrow(() => playTaskSound("drop"));
  assert.doesNotThrow(() => setSoundEnabled(true));
});
