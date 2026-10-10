import { z } from "zod";
import { deleteMeeting } from "@/lib/db";
import { failure, mutationGuard } from "@/lib/http";
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    mutationGuard(request);
    await deleteMeeting(
      z
        .string()
        .uuid()
        .parse((await params).id),
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return failure(error);
  }
}
