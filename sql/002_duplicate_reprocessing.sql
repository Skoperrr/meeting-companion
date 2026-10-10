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
