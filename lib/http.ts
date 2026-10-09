import { ZodError } from "zod";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function mutationGuard(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    throw new ApiError(403, "Cross-origin writes are not allowed.");
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError(415, "Send application/json.");
  const body = await request.text();
  if (body.length > 150000) throw new ApiError(413, "Request too large.");
  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(400, "Invalid JSON.");
  }
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: "Invalid request or AI output.",
        details: error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      },
      { status: 422 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return Response.json(
    {
      error:
        error instanceof Error && /AI |quote|owner|deadline/.test(error.message)
          ? error.message
          : "Service unavailable. Your input has been preserved. Please try again.",
    },
    { status: 503 },
  );
}
