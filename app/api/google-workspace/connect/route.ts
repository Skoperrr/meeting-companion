import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { apiAuth } from "@/lib/auth";
import {
  createGoogleOAuthClient,
  GOOGLE_WORKSPACE_SCOPES,
} from "@/lib/google-workspace";
import { encryptGoogleSecret } from "@/lib/google-token-crypto";
import { integrationAdmin } from "@/lib/google-integration-store";
import { failure, mutationGuard } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try {
    const { user } = await apiAuth();
    const nonce = randomBytes(32).toString("hex");
    const cookie = encryptGoogleSecret(
      JSON.stringify({
        userId: user.id,
        nonce,
        expiresAt: Date.now() + 600000,
      }),
      "google-workspace-oauth",
    );
    const url = createGoogleOAuthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: GOOGLE_WORKSPACE_SCOPES,
      state: nonce,
    });
    const response = NextResponse.redirect(url);
    response.cookies.set("google-workspace-state", cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/google-workspace",
      maxAge: 600,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    mutationGuard(request);
    const { user } = await apiAuth();
    const { error } = await integrationAdmin()
      .from("google_workspace_connections")
      .delete()
      .eq("user_id", user.id);
    if (error) throw new Error("Could not disconnect Google Workspace.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
