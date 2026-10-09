import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { safeNext, supabaseConfig } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const response = NextResponse.redirect(
    new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url),
  );
  response.headers.set("Cache-Control", "private, no-store");
  if (code) {
    const { url, key } = supabaseConfig();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values, headers) {
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          if (headers)
            Object.entries(headers).forEach(([name, value]) =>
              response.headers.set(name, value),
            );
        },
      },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return response;
  }
  const failure = NextResponse.redirect(
    new URL("/login?error=oauth", request.url),
  );
  response.cookies.getAll().forEach((cookie) => failure.cookies.set(cookie));
  failure.headers.set("Cache-Control", "private, no-store");
  return failure;
}
