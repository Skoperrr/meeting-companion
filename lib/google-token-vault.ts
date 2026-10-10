import "server-only";
import type { User } from "@supabase/supabase-js";
import { createGoogleOAuthClient } from "./google-workspace";
import { integrationAdmin } from "./google-integration-store";
import { encryptGoogleSecret } from "./google-token-crypto";
import { validateGoogleGrant } from "./google-oauth-policy";
export async function saveGoogleProviderTokens(
  user: User,
  accessToken: string,
  refreshToken: string | null,
) {
  const identity = user.identities?.find(
    (identity) => identity.provider === "google",
  );
  const sub = identity?.identity_data?.sub;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (typeof sub !== "string" || !clientId)
    throw new Error(
      "Verified Google identity and OAuth configuration are required.",
    );
  const info = await createGoogleOAuthClient().getTokenInfo(accessToken);
  validateGoogleGrant(info, clientId, sub);
  const { error } = await integrationAdmin().rpc("save_user_google_tokens", {
    p_user_id: user.id,
    p_google_sub: sub,
    p_google_client_id: clientId,
    p_access_token: encryptGoogleSecret(accessToken, user.id),
    p_refresh_token: refreshToken
      ? encryptGoogleSecret(refreshToken, user.id)
      : null,
    p_expires_at: Math.floor(info.expiry_date / 1000),
    p_scopes: info.scopes,
  });
  if (error)
    throw new Error(
      "Could not securely save Google Workspace authorization. Sign in again and grant offline access.",
    );
}
