import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { integrationAdmin } from "@/lib/google-integration-store";
import { failure, mutationGuard } from "@/lib/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));
}
export async function DELETE(request: Request) {
  try {
    mutationGuard(request);
    const { user } = await apiAuth();
    const { error } = await integrationAdmin().rpc(
      "disconnect_google_workspace",
      { p_user_id: user.id },
    );
    if (error) throw new Error("Could not disconnect Google Workspace.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
