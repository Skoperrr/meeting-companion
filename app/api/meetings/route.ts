import { listData } from "@/lib/db";
import { failure } from "@/lib/http";
export async function GET() {
  try {
    return Response.json(
      {
        ...(await listData()),
        ai_configured: Boolean(process.env.GEMINI_API_KEY),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
