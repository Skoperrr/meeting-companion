import { z } from "zod";
import { proposalSchema, statuses } from "@/lib/schemas";
import { updateTask, deleteTask } from "@/lib/db";
import { failure, jsonBody, mutationGuard } from "@/lib/http";
const patchSchema = proposalSchema
  .omit({ transcript_quote: true, assigned_email: true })
  .partial()
  .extend({ status: z.enum(statuses).optional() })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Provide at least one field.");
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationGuard(request);
    return Response.json(
      await updateTask(
        (await params).id,
        patchSchema.parse(await jsonBody(request)),
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationGuard(request);
    await deleteTask((await params).id);
    return new Response(null, { status: 204 });
  } catch (e) {
    return failure(e);
  }
}
