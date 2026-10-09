# Google authentication and productivity upgrade

## Files

- `components/GoogleSignInButton.tsx`: Google logo, loading/error state and PKCE sign-in.
- `app/auth/callback/route.ts`: authorization-code exchange, session cookies and safe internal redirect.
- `lib/supabase/{config,browser,server}.ts`: publishable-key clients. No service-role key is used by the app.
- `lib/auth.ts`: verified server identity and API authentication guard.
- `proxy.ts`: session refresh and protected-route redirects with private/no-store responses.
- `app/(workspace)/{dashboard,tracker,meetings}/page.tsx`: authenticated App Router pages.
- `components/Workspace.tsx`: existing meeting flow, signed-in account and recap export.
- `components/ExportMarkdownButton.tsx`: clipboard export with success/error feedback.
- `components/TaskBoard.tsx`: combined assignee, priority and status filters; updates still persist.
- `lib/productivity.ts`: Markdown formatting and filter logic.
- `sql/001_google_auth.sql`: existing-database migration.
- `sql/schema.sql`: complete fresh-database schema. Do not run both SQL files.

## Enable Google sign-in

1. In Google Cloud, create a Web application OAuth client. Configure branding, consent audience, and `openid`, `email`, `profile` scopes. Add your account to the test-user audience while the consent screen is in testing.
2. In Supabase → Authentication → Sign In / Providers → Google, copy the provider callback URL. Add that exact URL to Google's **Authorized redirect URIs**. This callback belongs to Supabase, not your Next.js app.
3. Paste the Google Client ID and Client Secret into Supabase's Google provider settings and enable it. Disable the Email/password provider if Google should be the only accepted sign-in provider.
4. In Supabase Authentication URL Configuration, set Site URL to your stable production origin. Add your application's `/auth/callback` URL to the allowed redirect URLs, plus `http://localhost:3000/auth/callback` for development. Add preview callback URLs explicitly if using Vercel previews. The app includes a `next` query parameter; ensure the redirect allow-list permits that callback and its query string.
5. Add the public Supabase project URL as `NEXT_PUBLIC_SUPABASE_URL` and its **publishable key** as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel. Keep `GEMINI_API_KEY` and your existing `GEMINI_MODEL`. After switching to the upgraded deployment, remove `APP_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` from the app configuration. Never put a service-role key into a NEXT_PUBLIC variable. Rebuild after changing public variables.
6. For the existing database, run `sql/001_google_auth.sql` once in Supabase SQL Editor. For a new empty database, run `sql/schema.sql` instead.
7. Deploy this branch after configuring Supabase, then sign in using Google. Smoke-test ingestion, review/approval, status persistence after refresh, Markdown clipboard export, and combined filters.

Official references:

- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs

## Existing records

The migration keeps existing records with `user_id = NULL`. RLS hides them from all ordinary users. It does not assign shared historical records to the first person who logs in.

After the intended owner signs in once, an administrator can assign specific historical meetings in SQL Editor. Use the actual UUID from Authentication → Users and only the meeting IDs that person owns. In one transaction, update `meetings.user_id` first, then set the corresponding `tasks.user_id` to the same UUID. The composite foreign key rejects tasks attached to a meeting owned by someone else. Existing tasks must be assigned too; changing only their meeting's owner leaves those tasks hidden.

For a verified single-user installation, the following runnable administrative helper claims all remaining unowned records for the existing Google account identified by its email. It refuses to run unless exactly one matching Google-authenticated user exists. Create/run this helper only in SQL Editor, not through the app; call it with your verified Google email. Shared installations should assign individual meetings instead.

```sql
CREATE OR REPLACE FUNCTION public.claim_legacy_workspace(owner_email text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE owner_id uuid; owner_count integer;
BEGIN
 SELECT count(*), min(u.id::text)::uuid INTO owner_count,owner_id
 FROM auth.users u WHERE lower(u.email)=lower(owner_email)
 AND EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google');
 IF owner_count<>1 THEN RAISE EXCEPTION 'Expected one verified Google account'; END IF;
 UPDATE public.meetings SET user_id=owner_id WHERE user_id IS NULL;
 UPDATE public.tasks t SET user_id=owner_id FROM public.meetings m
 WHERE t.meeting_id=m.id AND t.user_id IS NULL AND m.user_id=owner_id;
END; $$;
REVOKE ALL ON FUNCTION public.claim_legacy_workspace(text) FROM PUBLIC,anon,authenticated,service_role;
```

## Security and persistence

All API database calls use the authenticated user's Supabase session. Server checks use `getUser()`, not unverified session data. RLS also limits reads and mutations by owner. New inserts require a non-null owner. Task evidence, ownership and source cannot be changed through the task PATCH endpoint or authenticated column grants.

Approval runs as one database transaction with an ownership check and row lock. It preserves proposal evidence, saves only the selected proposals, and is idempotent after successful approval. Authenticated clients cannot directly insert persistent tasks or change meeting review state; the approval function is the permitted path. A task's `(meeting_id,user_id)` must match its source meeting.

Filters use AND matching and stay local to the board. Status updates persist through the existing PATCH API and refresh the board. Exports include only persistent tasks belonging to that meeting, including status and evidence.
