import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const root = new URL("../", import.meta.url).pathname;
const db = new PGlite();
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;`);
await db.exec(readFileSync(root + "/sql/schema.sql", "utf8"));
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  id = "33333333-3333-4333-8333-333333333333";
await db.query("INSERT INTO auth.users VALUES ($1),($2)", [a, b]);
await db.exec("SET ROLE authenticated");
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [a]);
const analysis = JSON.parse(
  readFileSync(root + "/test-data/expected.json", "utf8"),
);
const transcript = readFileSync(root + "/test-data/meeting.txt", "utf8");
await db.query(
  `INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source,user_id) VALUES($1,'Review','2026-10-09',$2,$3,'Fixture',$4)`,
  [id, transcript, JSON.stringify(analysis), a],
);
const tasks = analysis.proposed_tasks.map((t, i) => ({
  ...t,
  proposal_index: i,
}));
await assert.rejects(
  db.query(`UPDATE public.meetings SET review_state='approved' WHERE id=$1`, [
    id,
  ]),
  /permission denied/,
);
await assert.rejects(
  db.query(
    `INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source,user_id) VALUES($1,'Review','2026-10-09',$2,$3,'Fixture',$4)`,
    [b, transcript, JSON.stringify(analysis), b],
  ),
  /row-level security/,
);
await assert.rejects(
  db.query("SELECT public.approve_meeting($1,$2)", [
    id,
    JSON.stringify([
      tasks[0],
      { ...tasks[1], transcript_quote: "Forged evidence" },
    ]),
  ]),
  /Invalid proposal evidence/,
);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  0,
);
await db.query("SELECT public.approve_meeting($1,$2)", [
  id,
  JSON.stringify(tasks),
]);
await db.query("SELECT public.approve_meeting($1,$2)", [
  id,
  JSON.stringify(tasks),
]);
assert.equal(
  (await db.query("SELECT count(*)::int AS n FROM public.tasks")).rows[0].n,
  3,
);
await assert.rejects(
  db.query("UPDATE public.tasks SET user_id=$1", [b]),
  /permission denied/,
);
await assert.rejects(
  db.query("UPDATE public.tasks SET transcript_quote='forged'"),
  /permission denied/,
);
await db.exec(
  "UPDATE public.tasks SET status='Completed' WHERE proposal_index=0",
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
await assert.rejects(
  db.query("SELECT public.approve_meeting($1,$2)", [id, JSON.stringify(tasks)]),
  /Meeting not found/,
);
await db.exec("UPDATE public.tasks SET status='Blocked'");
await db.exec("RESET ROLE");
assert.equal(
  (await db.query("SELECT status FROM public.tasks WHERE proposal_index=0"))
    .rows[0].status,
  "Completed",
);
await assert.rejects(
  db.query("UPDATE public.tasks SET user_id=$1", [b]),
  /tasks_meeting_owner_fk/,
);
console.log(
  "PASS: RLS isolation, forged ownership/evidence prevention, owner status updates, atomic/idempotent approval and composite source ownership.",
);
await db.close();
const legacy = new PGlite();
await legacy.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
await legacy.exec(
  readFileSync(root + "/sql/schema.sql", "utf8").split("BEGIN;")[0],
);
await legacy.query(
  `INSERT INTO public.meetings(id,title,meeting_date,transcript,analysis,analysis_source) VALUES($1,'Legacy','2026-10-09',$2,$3,'Fixture')`,
  [id, transcript, JSON.stringify(analysis)],
);
await legacy.exec(readFileSync(root + "/sql/001_google_auth.sql", "utf8"));
assert.equal(
  (await legacy.query("SELECT user_id FROM public.meetings")).rows[0].user_id,
  null,
);
console.log(
  "PASS: existing-database migration preserves legacy records without assigning ownership.",
);
await legacy.close();
