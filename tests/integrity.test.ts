import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  analysisSchema,
  validateEvidence,
  ingestionSchema,
  statuses,
} from "../lib/schemas.ts";
const transcript = readFileSync(
  new URL("../test-data/meeting.txt", import.meta.url),
  "utf8",
).trimEnd();
const fixture = JSON.parse(
  readFileSync(new URL("../test-data/expected.json", import.meta.url), "utf8"),
);
test("reference has three evidence-backed tasks, two owners and one exact deadline", () => {
  const a = analysisSchema.parse(fixture);
  validateEvidence(a, transcript);
  assert.equal(a.proposed_tasks.length, 3);
  assert.deepEqual(
    a.proposed_tasks.map((t) => t.assigned_to),
    ["Maya", "Thabo", "Unassigned"],
  );
  assert.equal(
    a.proposed_tasks.filter((t) => t.due_date !== "Not specified").length,
    1,
  );
  assert.equal(a.proposed_tasks[0].due_date, "by Friday");
  assert.equal(a.decisions.length, 1);
});
for (const [key, value] of [
  ["transcript_quote", "A fabricated quote"],
  ["assigned_to", "Alex"],
  ["due_date", "2026-10-16"],
] as const) {
  test(`rejects invented ${key}`, () => {
    const a = structuredClone(fixture);
    a.proposed_tasks[0][key] = value;
    assert.throws(() => validateEvidence(analysisSchema.parse(a), transcript));
  });
}
test("closed schema rejects unknown fields and invalid priority", () => {
  assert.equal(
    analysisSchema.safeParse({ ...fixture, secret: "ignored" }).success,
    false,
  );
  const a = structuredClone(fixture);
  a.proposed_tasks[0].priority = "Urgent";
  assert.equal(analysisSchema.safeParse(a).success, false);
});
test("ingestion rejects invalid calendar dates", () => {
  assert.equal(
    ingestionSchema.safeParse({
      title: "Meeting",
      meeting_date: "2026-02-31",
      transcript,
      request_id: "12345678-1234-4234-8234-123456789abc",
    }).success,
    false,
  );
  assert.equal(statuses.length, 5);
});
