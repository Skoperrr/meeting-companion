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
