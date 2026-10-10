import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext, supabaseConfig } from "@/lib/supabase/config";
import { saveGoogleProviderTokens } from "@/lib/google-token-vault";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const response = NextResponse.redirect(
    new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");
  const { url, key } = supabaseConfig();
  let persistCookies = false;
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          if (persistCookies || value === "")
            response.cookies.set(name, value, options);
        });
        if (headers)
          Object.entries(headers).forEach(([name, value]) =>
            response.headers.set(name, value),
          );
      },
    },
  });
  let reason = "oauth";
  try {
    if (!code) throw new Error("Missing authorization code.");
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session)
      throw new Error("Supabase code exchange failed.");
    const session = data.session;
    const verified = await supabase.auth.getUser();
    if (
      verified.error ||
      !verified.data.user ||
      verified.data.user.id !== session.user.id
    )
      throw new Error("Google sign-in could not be verified.");
    // Rewrite the browser session without Google provider tokens; retain Supabase session credentials.
    persistCookies = true;
    const sanitized = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (sanitized.error) throw new Error("Could not finalize session.");
    reason = "workspace";
    if (!session.provider_token)
      throw new Error("Google did not return a Workspace access token.");
    await saveGoogleProviderTokens(
      verified.data.user,
      session.provider_token,
      session.provider_refresh_token ?? null,
    );
    return response;
  } catch {
    persistCookies = true;
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* The error response never contains provider tokens. */
    }
    const failed = NextResponse.redirect(
      new URL(`/login?error=${reason}`, request.url),
    );
    response.cookies.getAll().forEach((cookie) => failed.cookies.set(cookie));
    failed.headers.set("Cache-Control", "private, no-store");
    return failed;
  }
}
