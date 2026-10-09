import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { apiAuth } from "@/lib/auth";
import {
  createGoogleOAuthClient,
  GOOGLE_WORKSPACE_SCOPES,
} from "@/lib/google-workspace";
import { decryptGoogleSecret } from "@/lib/google-token-crypto";
import { storeGoogleConnection } from "@/lib/google-integration-store";
import { ApiError, failure } from "@/lib/http";
export const runtime = "nodejs";
const stateSchema = z.object({
  userId: z.string().uuid(),
  nonce: z.string().regex(/^[a-f0-9]{64}$/),
  expiresAt: z.number(),
});
export async function GET(request: NextRequest) {
  try {
    const { user } = await apiAuth();
    const code = request.nextUrl.searchParams.get("code"),
      state = request.nextUrl.searchParams.get("state"),
      cookie = request.cookies.get("google-workspace-state")?.value;
    if (!code || !state || !cookie)
      throw new ApiError(
        400,
        "Google Workspace consent was not completed. Start the connection again.",
      );
    const saved = stateSchema.parse(
      JSON.parse(decryptGoogleSecret(cookie, "google-workspace-oauth")),
    );
    if (
      saved.userId !== user.id ||
      saved.expiresAt < Date.now() ||
      state.length !== saved.nonce.length ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(saved.nonce))
    )
      throw new ApiError(403, "Invalid Google Workspace OAuth state.");
    const client = createGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token || !tokens.refresh_token)
      throw new ApiError(
        409,
        "Google did not return an offline refresh token. Reconnect and grant consent.",
      );
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const identity = ticket.getPayload();
    const expectedSub = user.identities?.find(
      (item) => item.provider === "google",
    )?.identity_data?.sub;
    if (
      !identity?.sub ||
      !identity.email ||
      !identity.email_verified ||
      (expectedSub
        ? identity.sub !== expectedSub
        : identity.email.toLowerCase() !== user.email?.toLowerCase())
    )
      throw new ApiError(
        403,
        "Connect the same Google account used to sign into this workspace.",
      );
    const scopes = (tokens.scope ?? "").split(/\s+/);
    if (
      !GOOGLE_WORKSPACE_SCOPES.filter((scope) =>
        scope.startsWith("https:"),
      ).every((scope) => scopes.includes(scope))
    )
      throw new ApiError(
        403,
        "Calendar, Drive and Meet read permissions are all required.",
      );
    await storeGoogleConnection(
      user.id,
      identity.sub,
      identity.email,
      tokens.refresh_token,
      scopes,
    );
    const response = NextResponse.redirect(
      new URL("/dashboard?google_workspace=connected", process.env.APP_URL!),
    );
    response.cookies.delete({
      name: "google-workspace-state",
      path: "/api/google-workspace",
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = failure(
      error instanceof ApiError
        ? error
        : new ApiError(
            502,
            "Google Workspace connection failed. Start the consent flow again.",
          ),
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
