import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMeetSyncInput,
  readMeetSyncResponse,
} from "../lib/meet-sync-client.ts";
const meetingId = "33333333-3333-4333-8333-333333333333";
test("meeting inputs distinguish exact Meet URLs from Calendar IDs", () => {
  assert.deepEqual(parseMeetSyncInput(" event123 "), {
    calendarEventId: "event123",
  });
  assert.deepEqual(parseMeetSyncInput("https://meet.google.com/abc-defg-hij"), {
    meetUrl: "https://meet.google.com/abc-defg-hij",
  });
  assert.deepEqual(parseMeetSyncInput("meet.google.com/abc-defg-hij"), {
    meetUrl: "https://meet.google.com/abc-defg-hij",
  });
  for (const value of [
    "",
    "https://evil.example.com/abc-defg-hij",
    "http://meet.google.com/abc-defg-hij",
    "https://calendar.google.com/event",
    "some event",
  ])
    assert.throws(() => parseMeetSyncInput(value));
});
test("fragmented progress stream preserves stage order and confirms success", async () => {
  const text = [
    { type: "progress", step: "fetching" },
    { type: "progress", step: "analyzing" },
    { type: "progress", step: "dispatching" },
    { type: "result", status: 200, result: { ok: true, meetingId } },
  ]
    .map((p) => JSON.stringify(p))
    .join("\n");
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream({
    start(c) {
      for (let i = 0; i < bytes.length; i += 7)
        c.enqueue(bytes.slice(i, i + 7));
      c.close();
    },
  });
  const stages: string[] = [];
  const result = await readMeetSyncResponse(
    new Response(stream, {
      headers: { "Content-Type": "application/x-ndjson" },
    }),
    (step) => stages.push(step),
  );
  assert.deepEqual(stages, ["fetching", "analyzing", "dispatching"]);
  assert.equal(result.result.meetingId, meetingId);
});
test("partial success errors preserve draft metadata", async () => {
  const payload = {
    type: "result",
    status: 502,
    result: {
      ok: false,
      meetingId,
      proposalsSaved: true,
      error: "Email not accepted",
    },
  };
  const result = await readMeetSyncResponse(
    new Response(JSON.stringify(payload) + "\n", {
      headers: { "Content-Type": "application/x-ndjson" },
    }),
    () => {},
  );
  assert.equal(result.status, 502);
  assert.equal(result.result.proposalsSaved, true);
});
test("JSON clients remain compatible and HTML deployment errors are readable", async () => {
  const result = await readMeetSyncResponse(
    Response.json({ error: "Sign in" }, { status: 401 }),
    () => {},
  );
  assert.equal(result.status, 401);
  await assert.rejects(
    readMeetSyncResponse(
      new Response("<html>404</html>", { status: 404 }),
      () => {},
    ),
    /not available/,
  );
});
test("interrupted streams never produce false success", async () => {
  await assert.rejects(
    readMeetSyncResponse(
      new Response('{"type":"progress","step":"fetching"}\n', {
        headers: { "Content-Type": "application/x-ndjson" },
      }),
      () => {},
    ),
    /before completion/,
  );
  await assert.rejects(
    readMeetSyncResponse(
      new Response('{"type":"progress","step":"invented"}\n', {
        headers: { "Content-Type": "application/x-ndjson" },
      }),
      () => {},
    ),
  );
});
