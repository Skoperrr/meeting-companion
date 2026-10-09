import { z } from "zod";
export const statuses = [
  "To Do",
  "In Progress",
  "Blocked",
  "In Review",
  "Completed",
] as const;
export const priorities = ["Low", "Med", "High"] as const;
const field = z.string().trim().min(1).max(4000);
export const proposalSchema = z
  .object({
    title: field.max(250),
    description: field,
    assigned_to: field.max(150),
    due_date: field.max(150),
    priority: z.enum(priorities),
    transcript_quote: z.string().min(1).max(4000),
  })
  .strict();
export const analysisSchema = z
  .object({
    summary: field,
    key_points: z.array(field).max(50),
    decisions: z.array(field).max(50),
    follow_ups: z.array(field).max(50),
    proposed_tasks: z.array(proposalSchema).max(50),
  })
  .strict();
export const ingestionSchema = z
  .object({
    title: field.max(200),
    meeting_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((v) => {
        const d = new Date(v);
        return !isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
      }, "Invalid meeting date"),
    transcript: z.string().min(20).max(100000),
    demo: z.boolean().default(false),
    request_id: z.string().uuid(),
    upsert: z.boolean().default(false),
    meeting_id: z.string().uuid().optional(),
    expected_version: z.number().int().positive().optional(),
  })
  .strict();
export const approvalSchema = z
  .object({
    version: z.number().int().positive(),
    tasks: z
      .array(
        proposalSchema.extend({
          proposal_index: z.number().int().min(0).max(49),
        }),
      )
      .max(50),
  })
  .strict();
export type Proposal = z.infer<typeof proposalSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Task = Proposal & {
  id: string;
  meeting_id: string;
  meeting_title: string;
  meeting_date?: string;
  meeting_version?: number;
  proposal_index: number;
  status: (typeof statuses)[number];
};
export type DuplicateMatch = {
  id: string;
  title: string;
  version: number;
  matched_by: "transcript" | "title";
};
export const duplicateCheckSchema = ingestionSchema.pick({
  title: true,
  transcript: true,
});
export type Meeting = {
  version: number;
  last_request_id?: string | null;
  id: string;
  title: string;
  meeting_date: string;
  transcript: string;
  analysis: Analysis;
  review_state: "pending" | "approved";
  analysis_source: string;
  created_at: string;
};
export type Snapshot = {
  meetings: Meeting[];
  tasks: Task[];
  ai_configured: boolean;
};
export const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "key_points",
    "decisions",
    "follow_ups",
    "proposed_tasks",
  ],
  properties: {
    summary: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
    follow_ups: { type: "array", items: { type: "string" } },
    proposed_tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "description",
          "assigned_to",
          "due_date",
          "priority",
          "transcript_quote",
        ],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          assigned_to: { type: "string" },
          due_date: { type: "string" },
          priority: { type: "string", enum: ["Low", "Med", "High"] },
          transcript_quote: { type: "string" },
        },
      },
    },
  },
};
export function validateEvidence(analysis: Analysis, transcript: string) {
  for (const task of analysis.proposed_tasks) {
    if (!transcript.includes(task.transcript_quote))
      throw new Error(
        "AI returned a quote that is not present verbatim in the transcript. Please retry.",
      );
    if (
      task.assigned_to !== "Unassigned" &&
      !transcript.includes(task.assigned_to)
    )
      throw new Error(
        "AI returned an owner not mentioned in the transcript. Please retry.",
      );
    if (
      task.due_date !== "Not specified" &&
      !transcript.toLowerCase().includes(task.due_date.toLowerCase())
    )
      throw new Error(
        "AI returned a deadline not mentioned in the transcript. Please retry.",
      );
  }
}
