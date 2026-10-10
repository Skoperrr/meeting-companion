BEGIN;
CREATE TABLE public.user_google_tokens (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 access_token text NOT NULL CHECK(access_token LIKE 'v1.%'),
 refresh_token text CHECK(refresh_token IS NULL OR refresh_token LIKE 'v1.%'),
 expires_at bigint,updated_at timestamptz NOT NULL DEFAULT now(),
 google_sub text NOT NULL,google_client_id text NOT NULL,scopes text[] NOT NULL
);
COMMENT ON COLUMN public.user_google_tokens.access_token IS 'AES-256-GCM ciphertext; never a plaintext provider credential';
COMMENT ON COLUMN public.user_google_tokens.refresh_token IS 'AES-256-GCM ciphertext with user_id bound as associated data';
ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_google_tokens_owner ON public.user_google_tokens FOR ALL TO authenticated USING (user_id=(SELECT auth.uid())) WITH CHECK (user_id=(SELECT auth.uid()));
REVOKE ALL ON public.user_google_tokens FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.user_google_tokens TO service_role;
CREATE FUNCTION public.save_user_google_tokens(p_user_id uuid,p_google_sub text,p_google_client_id text,p_access_token text,p_refresh_token text,p_expires_at bigint,p_scopes text[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing public.user_google_tokens;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
 IF p_scopes IS NULL OR p_expires_at IS NULL OR p_expires_at<=extract(epoch from now()) THEN RAISE EXCEPTION 'Invalid or expired Google grant'; END IF;
 SELECT * INTO existing FROM public.user_google_tokens WHERE user_id=p_user_id FOR UPDATE;
 IF FOUND AND existing.google_sub<>p_google_sub THEN RAISE EXCEPTION 'Google identity mismatch'; END IF;
 IF p_refresh_token IS NULL AND (existing.refresh_token IS NULL OR existing.google_client_id<>p_google_client_id) THEN RAISE EXCEPTION 'Offline Google refresh token is required'; END IF;
 IF NOT ARRAY['https://www.googleapis.com/auth/calendar.readonly','https://www.googleapis.com/auth/drive.readonly','https://www.googleapis.com/auth/meetings.space.readonly']::text[] <@ p_scopes THEN RAISE EXCEPTION 'Missing Google Workspace permissions'; END IF;
 INSERT INTO public.user_google_tokens(user_id,access_token,refresh_token,expires_at,google_sub,google_client_id,scopes)
 VALUES(p_user_id,p_access_token,p_refresh_token,p_expires_at,p_google_sub,p_google_client_id,p_scopes)
 ON CONFLICT(user_id) DO UPDATE SET access_token=excluded.access_token,refresh_token=coalesce(excluded.refresh_token,public.user_google_tokens.refresh_token),expires_at=excluded.expires_at,updated_at=now(),google_sub=excluded.google_sub,google_client_id=excluded.google_client_id,scopes=excluded.scopes;
END; $$;
CREATE FUNCTION public.disconnect_google_workspace(p_user_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN DELETE FROM public.user_google_tokens WHERE user_id=p_user_id; DELETE FROM public.google_workspace_connections WHERE user_id=p_user_id; END; $$;
REVOKE ALL ON FUNCTION public.save_user_google_tokens(uuid,text,text,text,text,bigint,text[]),public.disconnect_google_workspace(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_user_google_tokens(uuid,text,text,text,text,bigint,text[]),public.disconnect_google_workspace(uuid) TO service_role;
COMMIT;
