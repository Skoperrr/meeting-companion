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
