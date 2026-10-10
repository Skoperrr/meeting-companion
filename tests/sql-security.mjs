import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url).pathname;
const schema = readFileSync(root + "sql/schema.sql", "utf8");
const fixture = JSON.parse(
  readFileSync(root + "test-data/expected.json", "utf8"),
);
const transcript = readFileSync(root + "test-data/meeting.txt", "utf8");
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const id = "33333333-3333-4333-8333-333333333333";
const nextId = "44444444-4444-4444-8444-444444444444";
async function bootstrap(db) {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  GRANT USAGE ON SCHEMA auth TO authenticated;`);
}
const db = new PGlite();
await bootstrap(db);
await db.exec(schema);
await db.query("INSERT INTO auth.users VALUES ($1),($2)", [a, b]);
await db.exec("SET ROLE authenticated");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
async function save(
  requestId,
  title,
  analysis,
  upsert = false,
  meetingId = null,
  version = null,
  text = transcript,
) {
  const result = await db.query(
    "SELECT public.save_processed_meeting($1,$2,$3,$4,$5,$6,$7,$8,$9) AS meeting",
    [
      requestId,
      title,
      "2026-10-09",
      text,
      JSON.stringify(analysis),
      "Fixture",
      upsert,
      meetingId,
      version,
    ],
  );
  return result.rows[0].meeting;
}
async function approve(meetingId, tasks, version) {
  return db.query("SELECT public.approve_meeting($1,$2,$3)", [
    meetingId,
    JSON.stringify(tasks),
    version,
  ]);
}
let meeting = await save(id, "Review", fixture);
assert.equal(meeting.version, 1);
assert.equal((await save(id, "Review", fixture)).id, id);
await assert.rejects(
  save(id, "Changed title", fixture),
  /Request ID already used/,
);
assert.equal(
  (
    await db.query("SELECT * FROM public.check_meeting_duplicate($1,$2)", [
      "Different title",
      transcript,
    ])
  ).rows[0].matched_by,
  "transcript",
);
assert.equal(
  (
    await db.query("SELECT * FROM public.check_meeting_duplicate($1,$2)", [
      "Review",
      transcript + " Changed discussion.",
    ])
  ).rows[0].matched_by,
  "title",
);
await assert.rejects(
  save(nextId, "Review", fixture),
  /Duplicate meeting requires confirmation/,
);
await assert.rejects(
  db.query("UPDATE public.meetings SET review_state='approved'"),
  /permission denied/,
);
await assert.rejects(
  db.query(
    "INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source,user_id) VALUES($1,'Forged','2026-10-09',$2,$3,'Fixture',$4)",
    [b, transcript, JSON.stringify(fixture), b],
  ),
  /row-level security|owner does not match/,
);
await assert.rejects(
  db.query(
    "INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source,user_id) VALUES($1,'Review','2026-10-09',$2,$3,'Fixture',$4)",
    [nextId, transcript, JSON.stringify(fixture), a],
  ),
  /Duplicate meeting requires confirmation/,
);
const proposals = fixture.proposed_tasks.map((t, i) => ({
  ...t,
  proposal_index: i,
}));
await assert.rejects(
  approve(
    id,
    [proposals[0], { ...proposals[1], transcript_quote: "Forged evidence" }],
    1,
  ),
  /Invalid proposal evidence/,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  0,
);
await approve(id, proposals, 1);
await db.query("SELECT public.approve_meeting($1,$2)", [
  id,
  JSON.stringify(proposals),
]);
await approve(id, proposals, 1);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  3,
);
const originalId = (
  await db.query("SELECT id FROM public.tasks WHERE proposal_index=0")
).rows[0].id;
await db.query("UPDATE public.tasks SET status='Completed' WHERE id=$1", [
  originalId,
]);
await assert.rejects(
  db.query("UPDATE public.tasks SET user_id=$1", [b]),
  /permission denied/,
);
await assert.rejects(
  db.query("UPDATE public.tasks SET transcript_quote='forged'"),
  /permission denied/,
);
await assert.rejects(
  db.query("UPDATE public.tasks SET archived=true"),
  /permission denied/,
);
const revised = structuredClone(fixture);
revised.proposed_tasks = [
  fixture.proposed_tasks[1],
  { ...fixture.proposed_tasks[0], title: "Refined prototype" },
];
meeting = await save(nextId, "Review", revised, true, id, 1);
assert.equal(meeting.id, id);
assert.equal(meeting.version, 2);
assert.equal(meeting.review_state, "pending");
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.meetings")).rows[0].n,
  1,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.meeting_revisions"))
    .rows[0].n,
  2,
);
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.tasks WHERE archived=false",
    )
  ).rows[0].n,
  3,
);
await assert.rejects(approve(id, proposals, 1), /Meeting changed/);
await assert.rejects(
  db.query("SELECT public.approve_meeting($1,$2)", [
    id,
    JSON.stringify(proposals),
  ]),
  /Meeting changed/,
);
const newProposals = revised.proposed_tasks.map((t, i) => ({
  ...t,
  proposal_index: i,
}));
await assert.rejects(
  approve(
    id,
    [newProposals[0], { ...newProposals[1], transcript_quote: "Forged" }],
    2,
  ),
  /Invalid proposal evidence/,
);
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.tasks WHERE archived=false",
    )
  ).rows[0].n,
  3,
);
await approve(id, newProposals, 2);
await approve(id, newProposals, 2);
const retained = (
  await db.query("SELECT * FROM public.tasks WHERE id=$1", [originalId])
).rows[0];
assert.equal(retained.title, "Refined prototype");
assert.equal(retained.status, "Completed");
assert.equal(retained.proposal_index, 1);
assert.equal(retained.meeting_version, 2);
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.tasks WHERE archived=false",
    )
  ).rows[0].n,
  2,
);
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.tasks WHERE archived=true AND meeting_version=1",
    )
  ).rows[0].n,
  1,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  3,
);
await assert.rejects(
  save("55555555-5555-4555-8555-555555555555", "Review", fixture, true, id, 1),
  /Meeting changed/,
);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [b]);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.meetings")).rows[0].n,
  0,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  0,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.meeting_revisions"))
    .rows[0].n,
  0,
);
assert.equal(
  (
    await db.query("SELECT * FROM public.check_meeting_duplicate($1,$2)", [
      "Review",
      transcript,
    ])
  ).rows.length,
  0,
);
await assert.rejects(approve(id, newProposals, 2), /Meeting not found/);
await assert.rejects(
  save("66666666-6666-4666-8666-666666666666", "Review", fixture, true, id, 2),
  /Meeting not found/,
);
await db.exec("UPDATE public.tasks SET status='Blocked'");
await save(b, "Review", fixture); // identical meetings are allowed in separate private workspaces
await db.exec("RESET ROLE");
assert.equal(
  (await db.query("SELECT status FROM public.tasks WHERE id=$1", [originalId]))
    .rows[0].status,
  "Completed",
);
await assert.rejects(
  db.query("UPDATE public.tasks SET user_id=$1 WHERE id=$2", [b, originalId]),
  /foreign key/,
);
console.log(
  "PASS: owner isolation, duplicate detection, request retries, revision checks, atomic rollback, status-preserving reconciliation and evidence archival.",
);

// Workspace integration RPCs remain server-only and checkpoint retries atomically.
await db.exec("SET ROLE authenticated");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
await assert.rejects(
  db.query("SELECT * FROM public.google_workspace_connections"),
  /permission denied/,
);
await assert.rejects(
  db.query("SELECT public.claim_meet_sync($1,$2,$3)", [
    a,
    "a".repeat(64),
    "{}",
  ]),
  /permission denied/,
);
await assert.rejects(
  db.query("SELECT public.approve_meeting_core($1,$2,1)", [id, "[]"]),
  /permission denied/,
);
await db.exec("RESET ROLE; SET ROLE service_role");
const source = {
  calendarId: "primary",
  eventId: "event",
  title: "Google sync · 2026-10-09",
  meetingDate: "2026-10-09",
  meetUrl: "https://meet.google.com/abc-defg-hij",
  documentId: "document",
  documentUrl: "https://drive.google.com/file/d/document/view",
  transcript: transcript + " Additional general discussion.",
  attendees: [
    { name: "Maya", email: "maya@example.com" },
    { name: "Thabo", email: "thabo@example.com" },
  ],
};
const fingerprint = "a".repeat(64);
const claim = async () =>
  (
    await db.query("SELECT public.claim_meet_sync($1,$2,$3) AS job", [
      a,
      fingerprint,
      JSON.stringify(source),
    ])
  ).rows[0].job;
let job = await claim();
await assert.rejects(claim(), /busy/);
const workspaceAnalysis = {
  ...fixture,
  proposed_tasks: fixture.proposed_tasks.map((t) => ({
    ...t,
    assigned_email:
      t.assigned_to === "Maya"
        ? "maya@example.com"
        : t.assigned_to === "Thabo"
          ? "thabo@example.com"
          : null,
  })),
};
const saveJob = async () =>
  (
    await db.query("SELECT public.save_meet_sync_result($1,$2,$3,$4) AS job", [
      a,
      job.id,
      job.lease_token,
      JSON.stringify(workspaceAnalysis),
    ])
  ).rows[0].job;
await assert.rejects(
  db.query("SELECT public.save_meet_sync_result($1,$2,$3,$4)", [
    b,
    job.id,
    job.lease_token,
    JSON.stringify(workspaceAnalysis),
  ]),
  /lease expired/,
);
job = await saveJob();
const savedMeetingId = job.meeting_id;
assert.equal((await saveJob()).meeting_id, savedMeetingId);
const payload = {
  from: "recap@example.com",
  subject: "Recap",
  html: "<p>Draft</p>",
  text: "Draft",
};
const stage = async (p) =>
  (
    await db.query("SELECT public.stage_meet_email($1,$2,$3,$4) AS job", [
      a,
      job.id,
      job.lease_token,
      JSON.stringify(p),
    ])
  ).rows[0].job;
job = await stage(payload);
await db.query(
  "UPDATE public.google_meet_sync_jobs SET status='failed',lease_until=NULL,lease_token=NULL WHERE id=$1",
  [job.id],
);
job = await claim();
assert.equal(job.meeting_id, savedMeetingId);
job = await stage({ ...payload, subject: "Changed" });
assert.equal(job.email_payload.subject, "Recap");
await assert.rejects(
  db.query("SELECT public.finish_meet_sync($1,$2,$3,$4)", [
    a,
    job.id,
    job.lease_token,
    '["email-1"]',
  ]),
  /Incomplete email batch/,
);
await db.query("SELECT public.finish_meet_sync($1,$2,$3,$4)", [
  a,
  job.id,
  job.lease_token,
  '["email-1","email-2"]',
]);
assert.equal((await claim()).status, "sent");
await db.exec("RESET ROLE; SET ROLE authenticated");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
assert.equal(
  (
    await db.query("SELECT review_state FROM public.meetings WHERE id=$1", [
      savedMeetingId,
    ])
  ).rows[0].review_state,
  "pending",
);
const workspaceProposals = workspaceAnalysis.proposed_tasks.map((t, i) => ({
  ...t,
  proposal_index: i,
}));
await assert.rejects(
  approve(
    savedMeetingId,
    [{ ...workspaceProposals[0], assigned_email: "impostor@example.com" }],
    1,
  ),
  /Invalid attendee email mapping/,
);
await approve(savedMeetingId, workspaceProposals, 1);
assert.equal(
  (
    await db.query(
      "SELECT assigned_email FROM public.tasks WHERE meeting_id=$1 AND proposal_index=0",
      [savedMeetingId],
    )
  ).rows[0].assigned_email,
  workspaceProposals[0].assigned_email,
);
await db.query(
  "UPDATE public.tasks SET assigned_to='Unassigned' WHERE meeting_id=$1 AND proposal_index=0",
  [savedMeetingId],
);
assert.equal(
  (
    await db.query(
      "SELECT assigned_email FROM public.tasks WHERE meeting_id=$1 AND proposal_index=0",
      [savedMeetingId],
    )
  ).rows[0].assigned_email,
  null,
);
console.log(
  "PASS: integration privilege isolation, leases, draft checkpointing, frozen email retries, dispatch completion and attendee email approval.",
);

await db.close();
const legacy = new PGlite();
await bootstrap(legacy);
await legacy.exec(schema.split("BEGIN;")[0]);
await legacy.query(
  "INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source) VALUES($1,'Legacy','2026-10-09',$2,$3,'Fixture')",
  [id, transcript, JSON.stringify(fixture)],
);
await legacy.exec(readFileSync(root + "sql/001_google_auth.sql", "utf8"));
await legacy.exec(
  readFileSync(root + "sql/002_duplicate_reprocessing.sql", "utf8"),
);
await legacy.exec(readFileSync(root + "sql/003_google_meet_sync.sql", "utf8"));
assert.equal(
  (await legacy.query("SELECT user_id FROM public.meetings")).rows[0].user_id,
  null,
);
assert.equal(
  (
    await legacy.query(
      "SELECT count(*)::int AS n FROM public.meeting_revisions",
    )
  ).rows[0].n,
  1,
);
console.log(
  "PASS: existing-database migrations preserve legacy records and evidence without assigning ownership.",
);
await legacy.close();
