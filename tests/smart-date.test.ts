import test from "node:test";
import assert from "node:assert/strict";
import { spokenDeadline } from "../lib/smart-date.ts";
test("spoken weekdays and times use the source meeting as their reference", () => {
  const reference = new Date(2026, 9, 11, 12);
  const result = spokenDeadline("this Wednesday at 4 PM", reference);
  assert.ok(result);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 9);
  assert.equal(result.getDate(), 14);
  assert.equal(result.getHours(), 16);
  assert.equal(spokenDeadline("by Friday", reference)?.getDate(), 16);
});
test("explicit dates survive refresh and missing or nonsensical dates stay unset", () => {
  const reference = new Date(2026, 9, 11);
  assert.equal(spokenDeadline("2026-10-14", reference)?.getDate(), 14);
  assert.equal(spokenDeadline("Not specified", reference), null);
  assert.equal(spokenDeadline("Unassigned", reference), null);
  assert.equal(spokenDeadline("not a date at all", reference), null);
});
