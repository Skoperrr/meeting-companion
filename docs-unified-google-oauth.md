# Unified Google identity and Workspace consent

The existing Google button now requests Calendar, Drive and Meet read scopes plus offline consent through Supabase Auth. Google redirects to Supabase's provider callback; Supabase redirects to the application's `/auth/callback` with a PKCE code. The application exchanges that code, validates the user with getUser, verifies the Google access token's audience, subject, scopes and expiry, and stores both provider tokens in an encrypted server-only vault. The default redirect is the dashboard; existing safe protected-page next links remain supported.

Supabase access_token/refresh_token authenticate the application session. Google provider_token/provider_refresh_token authorize Workspace APIs. These pairs are not interchangeable. The callback buffers provider-bearing cookie writes, then rewrites the browser session using only Supabase credentials so Google tokens are not retained in browser session cookies. Callback errors never expose token values and fail closed with a login message.

## Deployment

1. Apply `sql/005_unified_google_oauth.sql` once after migrations 001–004. New databases use the complete schema once instead. If you manually created user_google_tokens from an earlier plaintext example, do not run this migration over that table: migrate/re-encrypt or recreate that existing token table deliberately before rollout; signing in again reacquires the grant.
2. In Supabase Authentication → Sign In / Providers → Google, configure the same Google Web OAuth client ID and secret as Vercel's GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. A token's refresh grant is bound to its OAuth client.
3. In Google Cloud, authorize the Supabase provider callback URL shown in its Google-provider settings (normally `https://PROJECT_REF.supabase.co/auth/v1/callback`). The app's `/auth/callback` belongs in Supabase's redirect allowlist. It is not the Google provider redirect URI for this Supabase flow.
4. In Supabase Authentication → URL Configuration, set the canonical Site URL and allow `https://YOUR_APP_ORIGIN/auth/callback` and any safe next-query callback URLs your deployment uses. Local development can allow `http://localhost:3000/auth/callback` similarly.
5. Keep Google consent scopes calendar.readonly, drive.readonly and meetings.space.readonly enabled; in Testing, add each intended Google account as a test user. Drive public production access may require Google verification.
6. Keep GOOGLE_TOKEN_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY, existing Supabase public variables and the sync Gemini/Resend settings on the server. Redeploy and sign out/in once through the unified Google button. Grant all requested Workspace permissions.

Google Workspace tokens use AES-256-GCM encryption with user_id as associated data. `access_token` and `refresh_token` column names are retained, but their values are ciphertext. expires_at is the Google access token's Unix expiry in seconds, not the Supabase session expiry. The vault has RLS and an owner policy, yet authenticated browser roles receive no table privileges. Only the service role can access vault rows or invoke write/disconnect RPCs; application calls derive user_id from verified Supabase identity.

An omitted refresh token preserves an existing encrypted refresh token only for the same Google identity and client. A new user without an offline refresh token fails closed. Old separately connected accounts remain usable via the legacy encrypted connection table until their next unified login. Workspace disconnect deletes both credential stores atomically. The old `/api/google-workspace/connect` URL now opens the unified sign-in flow rather than a second direct Google consent flow.

No automatic meeting-end subscription is introduced. After one sign-in the dashboard's on-demand sync button can use the saved refresh grant. An actual transcript and the user's Drive/Calendar permissions are still required. Google determines whether multiple consent/account-selection screens appear; the application initiates one OAuth flow.

## Verification

Use a signed-out browser and click Google sign-in. Confirm one application-initiated OAuth flow requests Workspace access, returns to the dashboard and allows syncing without a separate connect step. Check the vault via an administrator SQL session: token values should start `v1.`, and expires_at should be plausible Unix seconds. Never copy token values into logs or screenshots. Denying a required scope should return a clear sign-in error. Re-login should update access expiry and preserve or rotate the refresh token. Browser table access should fail.

Automated tests cover identity/client/scope/expiry validation, table/RPC privilege isolation, preservation and rotation of refresh grants, client changes and atomic disconnect. Live Google consent requires configured accounts and is not exercised by tests.
