import test from "node:test";
import assert from "node:assert/strict";
import { taskCalendarEvent } from "../lib/calendar.ts";
const base = {
  title: "Prototype & review #1",
  description: "Keep A + B / C",
  assigned_to: "Maya",
  transcript_quote: "Maya: I'll deliver by Friday.",
  due_date: "by Friday",
};
const now = new Date("2026-10-09T10:00:00Z");
function params(deadline: string, reference = "2026-10-05") {
  const event = taskCalendarEvent(
    { ...base, due_date: deadline },
    reference,
    now,
  );
  assert.ok(event);
  return { event, params: new URL(event.url).searchParams };
}
test("relative weekday resolves from source meeting with exclusive all-day end", () => {
  assert.equal(params("by Friday").params.get("dates"), "20261009/20261010");
  assert.equal(
    params("next Friday", "2026-10-09").params.get("dates"),
    "20261016/20261017",
  );
  assert.equal(params("tomorrow").params.get("dates"), "20261006/20261007");
});
test("explicit timezone becomes a UTC event with one-hour duration", () => {
  assert.equal(
    params("2026-10-16T15:30:00+02:00").params.get("dates"),
    "20261016T133000Z/20261016T143000Z",
  );
});
test("unspecified deadlines have no link and unresolved dates are labeled suggestions", () => {
  for (const due_date of ["Not specified", "Unassigned", ""])
    assert.equal(
      taskCalendarEvent({ ...base, due_date }, undefined, now),
      null,
    );
  const result = params("sometime soon");
  assert.equal(result.params.get("dates"), "20261012/20261013");
  assert.equal(result.event.usedFallback, true);
  assert.ok(
    result.params.get("details")?.includes("review this date before saving"),
  );
});
test("calendar fields round-trip without URL injection and retain exact evidence", () => {
  const result = params("2026-10-16");
  assert.equal(result.params.get("text"), base.title);
  assert.ok(result.params.get("details")?.includes(base.description));
  assert.ok(result.params.get("details")?.includes(base.transcript_quote));
  assert.ok(result.params.get("details")?.includes("Assigned owner: Maya"));
  assert.equal(new URL(result.event.url).origin, "https://calendar.google.com");
});
test("invalid calendar dates use safe fallback and local times remain all-day", () => {
  assert.equal(params("2026-02-31").event.usedFallback, true);
  assert.equal(
    params("2026-10-16 15:00").params.get("dates"),
    "20261016/20261017",
  );
});

test("named month deadlines parse without locale ambiguity", () => {
  assert.equal(
    params("by October 16, 2026").params.get("dates"),
    "20261016/20261017",
  );
  assert.equal(params("16 Oct 2026").params.get("dates"), "20261016/20261017");
  assert.equal(
    params("January 5", "2026-12-20").params.get("dates"),
    "20270105/20270106",
  );
});
