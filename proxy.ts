// Standalone Next.js access boundary. Sites applies owner-only auth upstream.
import { NextRequest, NextResponse } from "next/server";
export async function proxy(request: NextRequest) {
  const { env } = await import("@/lib/platform");
  if (env.DB) return NextResponse.next();
  const password = process.env.APP_PASSWORD;
  if (!password)
    return NextResponse.json(
      { error: "Set APP_PASSWORD before using the standalone deployment." },
      { status: 503 },
    );
  let supplied = "";
  try {
    const header = request.headers.get("authorization");
    if (header?.startsWith("Basic "))
      supplied = atob(header.slice(6)).split(":").slice(1).join(":");
  } catch {}
  if (supplied !== password)
    return new NextResponse("Sign in to the meeting workspace.", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="StrideShift", charset="UTF-8"',
      },
    });
  return NextResponse.next();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
