import test from "node:test";
import assert from "node:assert/strict";
import { transcriptSource, quoteFromLines } from "../lib/transcript-source.ts";
import { analysisSchema, validateEvidence } from "../lib/schemas.ts";
const transcript =
  "Kopano Mashaba: Hopefully, I can have that working by Monday. Yeah.\r\nKiyasha Singh: Okay.\r\nVictor Soko: It's a lot but I I'll get it fixed.\r\nKiyasha Singh: So, um I will schedule the Monday morning meeting as per our usual schedule.";
test("numbered evidence preserves disfluent speaker turns, CRLF and exact deadlines", () => {
  const lines = transcriptSource(transcript);
  assert.equal(lines.length, 4);
  const analysis = analysisSchema.parse({
    summary: "Meeting follow-ups",
    key_points: [],
    decisions: [],
    follow_ups: [],
    proposed_tasks: [
      {
        title: "Schedule Monday meeting",
        description: "Schedule the recurring meeting.",
        assigned_to: "Kiyasha Singh",
        due_date: "Not specified",
        priority: "Med",
        transcript_quote: quoteFromLines(transcript, lines, 4, 4),
      },
    ],
  });
  validateEvidence(analysis, transcript);
  assert.equal(analysis.proposed_tasks[0].transcript_quote, lines[3].text);
  assert.ok(quoteFromLines(transcript, lines, 1, 2).includes("\r\n"));
});
test("out-of-range, reversed, fractional and oversized ranges are rejected", () => {
  const lines = transcriptSource(transcript);
  for (const [a, b] of [
    [0, 1],
    [1, 99],
    [3, 1],
    [1.5, 2],
  ])
    assert.throws(() => quoteFromLines(transcript, lines, a, b));
  const long = "a".repeat(5000);
  assert.throws(() => quoteFromLines(long, transcriptSource(long), 1, 3));
});
test("long Unicode turns and blank lines retain contiguous original offsets", () => {
  const raw = "A: " + "😊".repeat(1000) + "\r\n\r\nB: Done.";
  const lines = transcriptSource(raw);
  assert.equal(
    lines.map((l) => l.text).join(""),
    "A: " + "😊".repeat(1000) + "B: Done.",
  );
  assert.ok(lines.every((l) => raw.slice(l.start, l.end) === l.text));
  assert.ok(raw.includes(quoteFromLines(raw, lines, 1, 2)));
});
