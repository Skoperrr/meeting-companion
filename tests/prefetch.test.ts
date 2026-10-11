import test from "node:test";
import assert from "node:assert/strict";
import {
  prefetchMeeting,
  cachedMeeting,
  clearMeetingCache,
} from "../lib/prefetch.ts";
test("meeting hover cache deduplicates requests, populates details and invalidates after mutations", async () => {
  const original = globalThis.fetch;
  let calls = 0;
  const routes: string[] = [];
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ id: "meeting", version: 2, title: "Meeting" });
  };
  try {
    clearMeetingCache();
    const first = prefetchMeeting("meeting", (href) => routes.push(href));
    const second = prefetchMeeting("meeting", (href) => routes.push(href));
    assert.equal(first, second);
    await first;
    assert.equal(calls, 1);
    assert.equal(cachedMeeting("meeting")?.version, 2);
    assert.ok(routes.every((href) => href === "/meetings"));
    clearMeetingCache();
    assert.equal(cachedMeeting("meeting"), undefined);
    await prefetchMeeting("meeting", () => {});
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = original;
    clearMeetingCache();
  }
});
test("failed prefetch is silent and never exposes a cached meeting", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 403 });
  try {
    clearMeetingCache();
    assert.equal(await prefetchMeeting("private", () => {}), null);
    assert.equal(cachedMeeting("private"), undefined);
  } finally {
    globalThis.fetch = original;
    clearMeetingCache();
  }
});
