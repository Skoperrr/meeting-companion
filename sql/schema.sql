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
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meetings,public.tasks FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.meetings,public.tasks TO service_role;
CREATE FUNCTION public.touch_task() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_task();
CREATE FUNCTION public.approve_meeting(p_meeting_id uuid,p_tasks jsonb) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE m public.meetings; t jsonb; idx integer;
BEGIN
 SELECT * INTO m FROM public.meetings WHERE id=p_meeting_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Meeting not found'; END IF;
 IF m.review_state='approved' THEN RETURN; END IF;
 IF jsonb_typeof(p_tasks)<>'array' OR jsonb_array_length(p_tasks)>50 THEN RAISE EXCEPTION 'Invalid tasks'; END IF;
 FOR t IN SELECT value FROM jsonb_array_elements(p_tasks) LOOP
  idx=(t->>'proposal_index')::integer;
  IF idx<0 OR idx>=jsonb_array_length(m.analysis->'proposed_tasks') OR
    t->>'transcript_quote' IS DISTINCT FROM (m.analysis->'proposed_tasks'->idx->>'transcript_quote') THEN
    RAISE EXCEPTION 'Invalid proposal evidence';
  END IF;
  INSERT INTO public.tasks(id,meeting_id,proposal_index,title,description,assigned_to,due_date,priority,transcript_quote)
   VALUES(p_meeting_id::text||':'||idx,p_meeting_id,idx,t->>'title',t->>'description',t->>'assigned_to',t->>'due_date',(t->>'priority')::public.task_priority,t->>'transcript_quote');
 END LOOP;
 UPDATE public.meetings SET review_state='approved' WHERE id=p_meeting_id;
END; $$;
REVOKE ALL ON FUNCTION public.approve_meeting(uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.approve_meeting(uuid,jsonb) TO service_role;
