import test from "node:test";
import assert from "node:assert/strict";
import {
  sourceQuote,
  restoreSourceQuotes,
} from "../lib/transcript-evidence.ts";
test("line breaks, CRLF, tabs and NBSP restore the exact source substring", () => {
  const transcript =
    "Elena: I will\r\n\t send the\u00a0report by Friday.\nMarcus: Thanks.";
  assert.equal(
    sourceQuote(transcript, "Elena: I will send the report by Friday."),
    transcript.slice(0, transcript.indexOf("\nMarcus")),
  );
});
test("literal quotes remain unchanged, including repeated exact occurrences", () => {
  assert.equal(sourceQuote("yes yes", "yes"), "yes");
});
test("paraphrases, punctuation edits, combined spans and fabricated speaker labels are rejected", () => {
  for (const quote of [
    "Elena: I shall send the report.",
    "Elena: I will send the report!",
    "Elena: I will send the report. Marcus: Done.",
    "Victor: I will send the report.",
    "  ",
  ])
    assert.throws(() =>
      sourceQuote(
        "Elena: I will send the report.\nDiscussion here.\nMarcus: Done.",
        quote,
      ),
    );
});
test("ambiguous whitespace-only matches are rejected and Unicode source offsets stay intact", () => {
  assert.throws(() => sourceQuote("I\nwill go. I\twill go.", "I will go."));
  assert.equal(
    sourceQuote("😊 Elena: I\nwill go.", "Elena: I will go."),
    "Elena: I\nwill go.",
  );
});
test("restoration clones output and preserves owners, deadlines and every final quote verbatim", () => {
  const transcript = "Elena: I\nwill send it by Friday.";
  const input = {
    summary: "Summary",
    proposed_tasks: [
      {
        title: "Send",
        assigned_to: "Elena",
        due_date: "by Friday",
        transcript_quote: "Elena: I will send it by Friday.",
      },
    ],
  };
  const result = restoreSourceQuotes(input, transcript);
  assert.ok(transcript.includes(result.proposed_tasks[0].transcript_quote));
  assert.equal(result.proposed_tasks[0].assigned_to, "Elena");
  assert.equal(result.proposed_tasks[0].due_date, "by Friday");
  assert.notEqual(
    input.proposed_tasks[0].transcript_quote,
    result.proposed_tasks[0].transcript_quote,
  );
});
