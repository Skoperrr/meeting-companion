BEGIN;
GRANT DELETE ON public.meetings TO authenticated;
CREATE POLICY meetings_delete_own ON public.meetings FOR DELETE TO authenticated USING (user_id=(SELECT auth.uid()));
-- Remove the durable transcript/recap copy when its source meeting is deleted.
ALTER TABLE public.google_meet_sync_jobs DROP CONSTRAINT google_meet_sync_jobs_meeting_id_fkey;
ALTER TABLE public.google_meet_sync_jobs ADD CONSTRAINT google_meet_sync_jobs_meeting_id_fkey FOREIGN KEY(meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;
COMMIT;
