import { duplicateCheckSchema } from "@/lib/schemas";
import { findDuplicate } from "@/lib/db";
import { apiAuth } from "@/lib/auth";
import { failure, jsonBody, mutationGuard } from "@/lib/http";
export async function POST(request: Request) {
  try {
    mutationGuard(request);
    await apiAuth();
    const data = duplicateCheckSchema.parse(await jsonBody(request));
    return Response.json(
      { match: await findDuplicate(data.title, data.transcript) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return failure(error);
  }
}
