import { apiAuth } from "@/lib/auth";
import { ingestionSchema } from "@/lib/schemas";
import { extract } from "@/lib/ai";
import {
  findDuplicate,
  getRequestMeeting,
  saveProcessedMeeting,
  getMeeting,
} from "@/lib/db";
import { sampleAnalysis, sampleTranscript } from "@/lib/sample";
import { ApiError, failure, jsonBody, mutationGuard } from "@/lib/http";
export async function POST(request: Request) {
  try {
    mutationGuard(request);
    await apiAuth();
    const data = ingestionSchema.parse(await jsonBody(request));
    const prior = await getRequestMeeting(data.request_id);
    if (prior) {
      if (
        prior.title !== data.title ||
        prior.transcript !== data.transcript ||
        prior.meeting_date !== data.meeting_date
      )
        throw new ApiError(
          409,
          "Request ID already used for different content.",
        );
      return Response.json(prior);
    }
    const duplicate = await findDuplicate(data.title, data.transcript);
    if (!data.upsert && duplicate)
      return Response.json(
        { error: "Duplicate meeting requires confirmation.", match: duplicate },
        { status: 409 },
      );
    if (data.upsert) {
      if (!data.meeting_id || !data.expected_version)
        throw new ApiError(422, "Provide the existing meeting and version.");
      const meeting = await getMeeting(data.meeting_id);
      if (!meeting) throw new ApiError(404, "Meeting not found.");
      if (meeting.version !== data.expected_version)
        throw new ApiError(
          409,
          "Meeting changed. Check duplicates again before updating.",
        );
      if (
        meeting.title !== data.title &&
        meeting.transcript !== data.transcript
      )
        throw new ApiError(409, "Meeting no longer matches this submission.");
      if (duplicate && duplicate.id !== meeting.id)
        throw new ApiError(
          409,
          "This submission matches another meeting. Check duplicates again.",
        );
    }
    if (data.demo && data.transcript !== sampleTranscript)
      throw new ApiError(
        400,
        "Sample walkthrough only supports the bundled test transcript.",
      );
    const analysis = data.demo
      ? sampleAnalysis
      : await extract(data.transcript, data.meeting_date);
    const meeting = await saveProcessedMeeting({
      id: data.request_id,
      title: data.title,
      meeting_date: data.meeting_date,
      transcript: data.transcript,
      analysis,
      analysis_source: data.demo ? "Sample fixture" : "Gemini",
      upsert: data.upsert,
      meeting_id: data.meeting_id,
      expected_version: data.expected_version,
    });
    return Response.json(meeting, { status: data.upsert ? 200 : 201 });
  } catch (error) {
    return failure(error);
  }
}
