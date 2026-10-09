CREATE TYPE public.task_status AS ENUM ('To Do','In Progress','Blocked','In Review','Completed');
CREATE TYPE public.task_priority AS ENUM ('Low','Med','High');
CREATE TYPE public.meeting_review_state AS ENUM ('pending','approved');
CREATE TABLE public.meetings (
 id uuid PRIMARY KEY, title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
 meeting_date date NOT NULL, transcript text NOT NULL CHECK (length(transcript) BETWEEN 20 AND 100000),
 analysis jsonb NOT NULL CHECK (jsonb_typeof(analysis)='object'),
 review_state public.meeting_review_state NOT NULL DEFAULT 'pending', analysis_source text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.tasks (
 id text PRIMARY KEY, meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
 proposal_index integer NOT NULL CHECK (proposal_index BETWEEN 0 AND 49),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 250), description text NOT NULL CHECK (length(description) BETWEEN 1 AND 4000),
 assigned_to text NOT NULL DEFAULT 'Unassigned' CHECK (length(assigned_to) BETWEEN 1 AND 150),
 due_date text NOT NULL DEFAULT 'Not specified' CHECK (length(due_date) BETWEEN 1 AND 150),
 priority public.task_priority NOT NULL DEFAULT 'Med', status public.task_status NOT NULL DEFAULT 'To Do',
 transcript_quote text NOT NULL CHECK (length(transcript_quote) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(meeting_id,proposal_index)
);
CREATE INDEX tasks_status_idx ON public.tasks(status);
CREATE INDEX tasks_meeting_idx ON public.tasks(meeting_id);
CREATE INDEX meetings_created_idx ON public.meetings(created_at DESC);
CREATE FUNCTION public.touch_task() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_task();
BEGIN;
-- Existing NULL-owned records are preserved and hidden by RLS until an administrator claims them.
ALTER TABLE public.meetings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.tasks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.meetings ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.meetings ADD CONSTRAINT meetings_id_user_unique UNIQUE (id,user_id);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_meeting_owner_fk FOREIGN KEY (meeting_id,user_id) REFERENCES public.meetings(id,user_id) ON DELETE CASCADE;
CREATE INDEX meetings_user_created_idx ON public.meetings(user_id,created_at DESC);
CREATE INDEX tasks_user_status_idx ON public.tasks(user_id,status);
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meetings,public.tasks FROM anon,authenticated;
GRANT SELECT,INSERT ON public.meetings TO authenticated;
GRANT SELECT,DELETE ON public.tasks TO authenticated;
GRANT UPDATE(title,description,assigned_to,due_date,priority,status) ON public.tasks TO authenticated;
CREATE POLICY meetings_read_own ON public.meetings FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY meetings_insert_own ON public.meetings FOR INSERT TO authenticated WITH CHECK (user_id=(SELECT auth.uid()) AND review_state='pending');
CREATE POLICY tasks_read_own ON public.tasks FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY tasks_update_own ON public.tasks FOR UPDATE TO authenticated USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
CREATE POLICY tasks_delete_own ON public.tasks FOR DELETE TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE FUNCTION public.require_record_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'A new record requires an owner'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER meetings_require_owner BEFORE INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.require_record_owner();
CREATE TRIGGER tasks_require_owner BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.require_record_owner();
CREATE OR REPLACE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE m public.meetings; t jsonb; idx integer; owner uuid := auth.uid();
BEGIN
 IF owner IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id AND user_id=owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
 IF m.review_state='approved' THEN RETURN; END IF;
 IF p_tasks IS NULL OR jsonb_typeof(p_tasks)<>'array' THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
 IF jsonb_array_length(p_tasks)>50 THEN RAISE EXCEPTION 'Too many tasks'; END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
  IF jsonb_typeof(t)<>'object' OR jsonb_typeof(t->'proposal_index') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid proposal'; END IF;
  idx=(t->>'proposal_index')::integer;
  IF idx IS NULL OR idx<0 OR idx>=jsonb_array_length(m.analysis->'proposed_tasks') OR
    t->>'transcript_quote' IS DISTINCT FROM (m.analysis->'proposed_tasks'->idx->>'transcript_quote') OR
    position(t->>'transcript_quote' IN m.transcript)=0 THEN RAISE EXCEPTION 'Invalid proposal evidence'; END IF;
  INSERT INTO public.tasks(id,meeting_id,user_id,proposal_index,title,description,assigned_to,due_date,priority,transcript_quote)
   VALUES(p_meeting_id::text||':'||idx,p_meeting_id,owner,idx,t->>'title',t->>'description',t->>'assigned_to',t->>'due_date',(t->>'priority')::public.task_priority,t->>'transcript_quote');
 END LOOP;
 UPDATE public.meetings SET review_state='approved' WHERE id=p_meeting_id AND user_id=owner;
END; $$;
REVOKE ALL ON FUNCTION public.approve_meeting(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.approve_meeting(uuid,jsonb) TO authenticated;
COMMIT;

BEGIN;
ALTER TABLE public.meetings ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version>0);
ALTER TABLE public.meetings ADD COLUMN last_request_id uuid;
UPDATE public.meetings SET last_request_id=id;
CREATE UNIQUE INDEX meetings_owner_request_idx ON public.meetings(user_id,last_request_id) WHERE last_request_id IS NOT NULL;
CREATE INDEX meetings_owner_title_idx ON public.meetings(user_id,title);
CREATE INDEX meetings_owner_transcript_idx ON public.meetings(user_id,md5(transcript));
CREATE TABLE public.meeting_revisions (
 meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK (version>0), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 title text NOT NULL, meeting_date date NOT NULL, transcript text NOT NULL, analysis jsonb NOT NULL,
 analysis_source text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(meeting_id,version), UNIQUE(meeting_id,version,user_id),
 FOREIGN KEY(meeting_id,user_id) REFERENCES public.meetings(id,user_id) ON DELETE CASCADE
);
INSERT INTO public.meeting_revisions(meeting_id,version,user_id,title,meeting_date,transcript,analysis,analysis_source)
 SELECT id,version,user_id,title,meeting_date,transcript,analysis,analysis_source FROM public.meetings;
ALTER TABLE public.meeting_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meeting_revisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.meeting_revisions TO authenticated;
CREATE POLICY revisions_read_own ON public.meeting_revisions FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE FUNCTION public.snapshot_meeting_revision() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 INSERT INTO public.meeting_revisions(meeting_id,version,user_id,title,meeting_date,transcript,analysis,analysis_source)
 VALUES(NEW.id,NEW.version,NEW.user_id,NEW.title,NEW.meeting_date,NEW.transcript,NEW.analysis,NEW.analysis_source)
 ON CONFLICT(meeting_id,version) DO UPDATE SET user_id=EXCLUDED.user_id;
 RETURN NEW;
END; $$;
CREATE TRIGGER meetings_snapshot AFTER INSERT OR UPDATE OF version,user_id ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.snapshot_meeting_revision();
ALTER TABLE public.tasks ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN meeting_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_revision_fk FOREIGN KEY(meeting_id,meeting_version,user_id) REFERENCES public.meeting_revisions(meeting_id,version,user_id) ON DELETE CASCADE;
ALTER TABLE public.tasks DROP CONSTRAINT tasks_meeting_id_proposal_index_key;
CREATE UNIQUE INDEX tasks_active_proposal_idx ON public.tasks(meeting_id,proposal_index) WHERE archived=false;
CREATE INDEX tasks_active_owner_idx ON public.tasks(user_id,archived,status);
-- Keep existing clients working; a trigger enforces duplicates for direct inserts too.
-- Approved tasks can only be created/reconciled through the owned, transactional RPC.
CREATE FUNCTION public.check_meeting_duplicate(p_title text,p_transcript text)
RETURNS TABLE(id uuid,title text,version integer,matched_by text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog AS $$
 SELECT m.id,m.title,m.version,CASE WHEN m.transcript=p_transcript THEN 'transcript' ELSE 'title' END
 FROM public.meetings m WHERE m.user_id=auth.uid() AND
 (m.title=p_title OR (md5(m.transcript)=md5(p_transcript) AND m.transcript=p_transcript))
 ORDER BY (m.transcript=p_transcript) DESC,m.created_at DESC,m.id LIMIT 1;
$$;
CREATE FUNCTION public.save_processed_meeting(p_request_id uuid,p_title text,p_date date,p_transcript text,p_analysis jsonb,p_source text,p_upsert boolean DEFAULT false,p_meeting_id uuid DEFAULT NULL,p_expected_version integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner uuid:=auth.uid(); m public.meetings; duplicate_id uuid;
BEGIN
 IF owner IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_request_id IS NULL OR p_upsert IS NULL THEN RAISE EXCEPTION 'Invalid request'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(owner::text,0));
 SELECT * INTO m FROM public.meetings WHERE user_id=owner AND last_request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
  IF m.title IS DISTINCT FROM p_title OR m.meeting_date IS DISTINCT FROM p_date OR m.transcript IS DISTINCT FROM p_transcript THEN RAISE EXCEPTION 'Request ID already used for different content'; END IF;
  RETURN to_jsonb(m);
 END IF;
 SELECT c.id INTO duplicate_id FROM public.check_meeting_duplicate(p_title,p_transcript) c;
 IF NOT p_upsert AND duplicate_id IS NOT NULL THEN RAISE EXCEPTION 'Duplicate meeting requires confirmation'; END IF;
 IF p_analysis IS NULL OR jsonb_typeof(p_analysis)<>'object' OR jsonb_typeof(p_analysis->'proposed_tasks') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid analysis'; END IF;
 IF jsonb_array_length(p_analysis->'proposed_tasks')>50 THEN RAISE EXCEPTION 'Too many proposals'; END IF;
 IF p_upsert THEN
  SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id AND user_id=owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
  IF p_expected_version IS NULL OR m.version<>p_expected_version THEN RAISE EXCEPTION 'Meeting changed. Check duplicates again'; END IF;
  IF m.title IS DISTINCT FROM p_title AND m.transcript IS DISTINCT FROM p_transcript THEN RAISE EXCEPTION 'Meeting no longer matches this request'; END IF;
  IF duplicate_id IS NOT NULL AND duplicate_id<>m.id THEN RAISE EXCEPTION 'Duplicate conflicts with another meeting'; END IF;
  UPDATE public.meetings SET title=p_title,meeting_date=p_date,transcript=p_transcript,analysis=p_analysis,analysis_source=p_source,review_state='pending',version=version+1,last_request_id=p_request_id WHERE id=m.id RETURNING * INTO m;
 ELSE
  INSERT INTO public.meetings(id,user_id,title,meeting_date,transcript,analysis,analysis_source,last_request_id)
  VALUES(p_request_id,owner,p_title,p_date,p_transcript,p_analysis,p_source,p_request_id) RETURNING * INTO m;
 END IF;
 RETURN to_jsonb(m);
END; $$;
CREATE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb,p_expected_version integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE owner uuid:=auth.uid(); m public.meetings; t jsonb; idx integer; matched_id text; used_ids text[]:=ARRAY[]::text[]; used_indices integer[]:=ARRAY[]::integer[];
BEGIN
 IF owner IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id AND user_id=owner FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
 IF p_expected_version IS NULL OR m.version<>p_expected_version THEN RAISE EXCEPTION 'Meeting changed. Refresh before approving'; END IF;
 IF m.review_state='approved' THEN RETURN; END IF;
 IF p_tasks IS NULL OR jsonb_typeof(p_tasks)<>'array' THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
 IF jsonb_array_length(p_tasks)>50 THEN RAISE EXCEPTION 'Too many tasks'; END IF;
 UPDATE public.tasks SET archived=true WHERE meeting_id=m.id AND user_id=owner AND archived=false;
 FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
  IF jsonb_typeof(t)<>'object' OR jsonb_typeof(t->'proposal_index') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid proposal'; END IF;
  idx=(t->>'proposal_index')::integer;
  IF idx IS NULL OR idx<0 OR idx>=jsonb_array_length(m.analysis->'proposed_tasks') OR idx=ANY(used_indices) OR
   t->>'transcript_quote' IS DISTINCT FROM (m.analysis->'proposed_tasks'->idx->>'transcript_quote') OR
   position(t->>'transcript_quote' IN m.transcript)=0 THEN RAISE EXCEPTION 'Invalid proposal evidence'; END IF;
  used_indices=array_append(used_indices,idx);
  SELECT old.id INTO matched_id FROM public.tasks old WHERE old.meeting_id=m.id AND old.user_id=owner AND old.transcript_quote=t->>'transcript_quote' AND NOT(old.id=ANY(used_ids))
   ORDER BY old.meeting_version DESC,old.created_at DESC,old.id LIMIT 1 FOR UPDATE;
  IF matched_id IS NOT NULL THEN
   UPDATE public.tasks SET proposal_index=idx,title=t->>'title',description=t->>'description',assigned_to=t->>'assigned_to',due_date=t->>'due_date',priority=(t->>'priority')::public.task_priority,meeting_version=m.version,archived=false WHERE id=matched_id;
  ELSE
   matched_id=gen_random_uuid()::text;
   INSERT INTO public.tasks(id,meeting_id,user_id,meeting_version,proposal_index,title,description,assigned_to,due_date,priority,transcript_quote)
    VALUES(matched_id,m.id,owner,m.version,idx,t->>'title',t->>'description',t->>'assigned_to',t->>'due_date',(t->>'priority')::public.task_priority,t->>'transcript_quote');
  END IF;
  used_ids=array_append(used_ids,matched_id);
 END LOOP;
 UPDATE public.meetings SET review_state='approved' WHERE id=m.id;
END; $$;
-- The deployed pre-upgrade API uses the two-argument RPC. It remains safe for
-- version-one meetings; stale clients must refresh after a reprocessing revision.
CREATE OR REPLACE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE current_version integer;
BEGIN
 SELECT version INTO current_version FROM public.meetings WHERE id=p_meeting_id AND user_id=auth.uid();
 IF current_version IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Meeting changed. Refresh before approving'; END IF;
 PERFORM public.approve_meeting(p_meeting_id,p_tasks,1);
END; $$;
CREATE FUNCTION public.guard_meeting_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.user_id IS NULL THEN RAISE EXCEPTION 'A meeting requires an owner'; END IF;
 IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Meeting owner does not match authenticated user'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,0));
 IF EXISTS(SELECT 1 FROM public.meetings m WHERE m.user_id=NEW.user_id AND
  (m.title=NEW.title OR (md5(m.transcript)=md5(NEW.transcript) AND m.transcript=NEW.transcript))) THEN
  RAISE EXCEPTION 'Duplicate meeting requires confirmation';
 END IF;
 NEW.version=1;
 NEW.last_request_id=NEW.id;
 RETURN NEW;
END; $$;
CREATE TRIGGER meetings_duplicate_guard BEFORE INSERT ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.guard_meeting_insert();
REVOKE ALL ON FUNCTION public.approve_meeting(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.approve_meeting(uuid,jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.check_meeting_duplicate(text,text),public.save_processed_meeting(uuid,text,date,text,jsonb,text,boolean,uuid,integer),public.approve_meeting(uuid,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.check_meeting_duplicate(text,text),public.save_processed_meeting(uuid,text,date,text,jsonb,text,boolean,uuid,integer),public.approve_meeting(uuid,jsonb,integer) TO authenticated;
COMMIT;
BEGIN;
CREATE TABLE public.google_workspace_connections (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 google_sub text NOT NULL,google_email text NOT NULL,refresh_token_ciphertext text NOT NULL,
 scopes text[] NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.google_meet_sync_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),source jsonb NOT NULL CHECK(jsonb_typeof(source)='object'),
 status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','sending','failed','sent')),
 lease_token uuid,lease_until timestamptz,analysis jsonb,
 meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,meeting_version integer,
 email_started_at timestamptz,email_payload jsonb,email_ids jsonb,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,fingerprint)
);
ALTER TABLE public.google_workspace_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_meet_sync_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_workspace_connections,public.google_meet_sync_jobs FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.google_workspace_connections,public.google_meet_sync_jobs TO service_role;
ALTER TABLE public.meetings ADD COLUMN workspace_attendees jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(workspace_attendees)='array');
ALTER TABLE public.meetings ADD COLUMN google_calendar_id text;
ALTER TABLE public.meetings ADD COLUMN google_event_id text;
ALTER TABLE public.meetings ADD COLUMN google_transcript_id text;
CREATE UNIQUE INDEX meetings_google_event_idx ON public.meetings(user_id,google_calendar_id,google_event_id) WHERE google_event_id IS NOT NULL;
ALTER TABLE public.tasks ADD COLUMN assigned_email text;
CREATE FUNCTION public.claim_meet_sync(p_user_id uuid,p_fingerprint text,p_source jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job public.google_meet_sync_jobs;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||p_fingerprint,0));
 SELECT * INTO job FROM public.google_meet_sync_jobs WHERE user_id=p_user_id AND fingerprint=p_fingerprint FOR UPDATE;
 IF FOUND THEN
  IF job.status='sent' THEN RETURN to_jsonb(job); END IF;
  IF job.lease_until>now() THEN RAISE EXCEPTION 'Meeting sync is busy. Retry after the active request finishes'; END IF;
  IF job.email_started_at<now()-interval '23 hours' THEN RAISE EXCEPTION 'Email retry window expired. Reconcile delivery in Resend before retrying'; END IF;
  UPDATE public.google_meet_sync_jobs SET status='processing',lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes' WHERE id=job.id RETURNING * INTO job;
 ELSE
  IF p_source IS NULL OR jsonb_typeof(p_source)<>'object' OR jsonb_typeof(p_source->'attendees') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid meeting source'; END IF;
  IF jsonb_array_length(p_source->'attendees')<1 OR jsonb_array_length(p_source->'attendees')>100 THEN RAISE EXCEPTION 'Invalid recipients'; END IF;
  INSERT INTO public.google_meet_sync_jobs(user_id,fingerprint,source,lease_token,lease_until) VALUES(p_user_id,p_fingerprint,p_source,gen_random_uuid(),now()+interval '10 minutes') RETURNING * INTO job;
 END IF;
 RETURN to_jsonb(job);
END; $$;
CREATE FUNCTION public.save_meet_sync_result(p_user_id uuid,p_job_id uuid,p_lease_token uuid,p_analysis jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job public.google_meet_sync_jobs; existing public.meetings; saved jsonb;
BEGIN
 SELECT * INTO job FROM public.google_meet_sync_jobs WHERE id=p_job_id AND user_id=p_user_id AND lease_token=p_lease_token AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting sync lease expired'; END IF;
 IF job.analysis IS NOT NULL THEN RETURN to_jsonb(job); END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 PERFORM set_config('request.jwt.claim.sub',p_user_id::text,true);
 PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user_id::text,'role','authenticated')::text,true);
 SELECT * INTO existing FROM public.meetings WHERE user_id=p_user_id AND google_calendar_id=job.source->>'calendarId' AND google_event_id=job.source->>'eventId' FOR UPDATE;
 saved=public.save_processed_meeting(job.id,job.source->>'title',(job.source->>'meetingDate')::date,job.source->>'transcript',p_analysis,'Google Meet / Gemini',existing.id IS NOT NULL,existing.id,existing.version);
 UPDATE public.meetings SET workspace_attendees=job.source->'attendees',google_calendar_id=job.source->>'calendarId',google_event_id=job.source->>'eventId',google_transcript_id=job.source->>'documentId' WHERE id=(saved->>'id')::uuid AND user_id=p_user_id;
 UPDATE public.google_meet_sync_jobs SET analysis=p_analysis,meeting_id=(saved->>'id')::uuid,meeting_version=(saved->>'version')::integer WHERE id=job.id RETURNING * INTO job;
 RETURN to_jsonb(job);
END; $$;
CREATE FUNCTION public.stage_meet_email(p_user_id uuid,p_job_id uuid,p_lease_token uuid,p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job public.google_meet_sync_jobs;
BEGIN
 SELECT * INTO job FROM public.google_meet_sync_jobs WHERE id=p_job_id AND user_id=p_user_id AND lease_token=p_lease_token AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting sync lease expired'; END IF;
 IF job.analysis IS NULL OR job.meeting_id IS NULL THEN RAISE EXCEPTION 'Meeting draft must be saved first'; END IF;
 IF job.email_started_at<now()-interval '23 hours' THEN RAISE EXCEPTION 'Email retry window expired. Reconcile delivery first'; END IF;
 UPDATE public.google_meet_sync_jobs SET status='sending',email_started_at=coalesce(email_started_at,now()),email_payload=coalesce(email_payload,p_payload) WHERE id=job.id RETURNING * INTO job;
 RETURN to_jsonb(job);
END; $$;
CREATE FUNCTION public.finish_meet_sync(p_user_id uuid,p_job_id uuid,p_lease_token uuid,p_email_ids jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE job public.google_meet_sync_jobs;
BEGIN
 SELECT * INTO job FROM public.google_meet_sync_jobs WHERE id=p_job_id AND user_id=p_user_id AND lease_token=p_lease_token AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting sync lease expired'; END IF;
 IF job.status<>'sending' OR p_email_ids IS NULL OR jsonb_typeof(p_email_ids)<>'array' THEN RAISE EXCEPTION 'Invalid email completion'; END IF;
 IF jsonb_array_length(p_email_ids)<>jsonb_array_length(job.source->'attendees') THEN RAISE EXCEPTION 'Incomplete email batch'; END IF;
 UPDATE public.google_meet_sync_jobs SET status='sent',email_ids=p_email_ids,lease_token=NULL,lease_until=NULL WHERE id=job.id;
END; $$;
REVOKE ALL ON FUNCTION public.claim_meet_sync(uuid,text,jsonb),public.save_meet_sync_result(uuid,uuid,uuid,jsonb),public.stage_meet_email(uuid,uuid,uuid,jsonb),public.finish_meet_sync(uuid,uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.claim_meet_sync(uuid,text,jsonb),public.save_meet_sync_result(uuid,uuid,uuid,jsonb),public.stage_meet_email(uuid,uuid,uuid,jsonb),public.finish_meet_sync(uuid,uuid,uuid,jsonb) TO service_role;
-- Wrap the owned approval transaction to validate and persist attendee emails.
ALTER FUNCTION public.approve_meeting(uuid,jsonb,integer) RENAME TO approve_meeting_core;
REVOKE ALL ON FUNCTION public.approve_meeting_core(uuid,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb,p_expected_version integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE m public.meetings;t jsonb;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
 IF p_tasks IS NULL OR jsonb_typeof(p_tasks)<>'array' THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
  IF t->>'assigned_email' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m.workspace_attendees) a WHERE a->>'name'=t->>'assigned_to' AND a->>'email'=t->>'assigned_email') THEN RAISE EXCEPTION 'Invalid attendee email mapping'; END IF;
 END LOOP;
 IF m.review_state='approved' THEN
  IF m.version IS DISTINCT FROM p_expected_version THEN RAISE EXCEPTION 'Meeting changed. Refresh before approving'; END IF;
  RETURN;
 END IF;
 PERFORM public.approve_meeting_core(p_meeting_id,p_tasks,p_expected_version);
 FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
  UPDATE public.tasks SET assigned_email=t->>'assigned_email' WHERE meeting_id=m.id AND user_id=auth.uid() AND archived=false AND proposal_index=(t->>'proposal_index')::integer;
 END LOOP;
END; $$;
REVOKE ALL ON FUNCTION public.approve_meeting(uuid,jsonb,integer) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.approve_meeting(uuid,jsonb,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE current_version integer;
BEGIN
 SELECT version INTO current_version FROM public.meetings WHERE id=p_meeting_id AND user_id=auth.uid();
 IF current_version IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Meeting changed. Refresh before approving'; END IF;
 PERFORM public.approve_meeting(p_meeting_id,p_tasks,1);
END; $$;
CREATE FUNCTION public.clear_task_email_on_owner_change() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN NEW.assigned_email=NULL; END IF; RETURN NEW; END; $$;
CREATE TRIGGER tasks_email_owner BEFORE UPDATE OF assigned_to ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.clear_task_email_on_owner_change();
COMMIT;
