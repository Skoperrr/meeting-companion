import { ingestionSchema } from "@/lib/schemas";
import { extract } from "@/lib/ai";
import { getMeeting, saveMeeting } from "@/lib/db";
import { sampleAnalysis, sampleTranscript } from "@/lib/sample";
import { ApiError, failure, jsonBody, mutationGuard } from "@/lib/http";
export async function POST(request: Request) {
  try {
    mutationGuard(request);
    const data = ingestionSchema.parse(await jsonBody(request));
    const existing = await getMeeting(data.request_id);
    if (existing) {
      if (
        existing.title !== data.title ||
        existing.meeting_date !== data.meeting_date ||
        existing.transcript !== data.transcript
      )
        throw new ApiError(
          409,
          "Request ID already used for different content.",
        );
      return Response.json(existing);
    }
    if (data.demo && data.transcript !== sampleTranscript)
      throw new ApiError(
        400,
        "Sample walkthrough only supports the bundled test transcript.",
      );
    const analysis = data.demo
      ? sampleAnalysis
      : await extract(data.transcript, data.meeting_date);
    const meeting = await saveMeeting({
      id: data.request_id,
      title: data.title,
      meeting_date: data.meeting_date,
      transcript: data.transcript,
      analysis,
      analysis_source: data.demo ? "Sample fixture" : "Gemini",
    });
    return Response.json(meeting, { status: 201 });
  } catch (e) {
    return failure(e);
  }
}
