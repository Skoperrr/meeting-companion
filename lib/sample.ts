import type { Analysis } from "./schemas";
export const sampleTranscript =
  "StrideShift D-Lab product sync \u2014 9 October 2026\nMaya: We heard that interns lose time copying meeting notes into separate task trackers. The first version should make review simple.\nThabo: A board is useful, but we should not treat every discussion point as a task.\nMaya: We have decided to keep the current teal brand colour. No change is needed.\nMaya: I will prepare the clickable review prototype by Friday.\nThabo: I will implement the transcript upload validation.\nMaya: We need to document the approval workflow. Nobody is assigned to that yet.\nThabo: We should revisit whether calendar integration is useful in our next meeting.\nMaya: Agreed. For this sprint, accurate quotes and human approval matter more than calendar integration.";
export const sampleAnalysis: Analysis = {
  summary:
    "The team discussed reducing manual meeting administration through a simple review flow and task board. This sprint prioritises accurate transcript evidence and human approval over calendar integration.",
  key_points: [
    "Interns spend time copying meeting notes into separate trackers.",
    "Discussion points should not automatically become tasks.",
    "Accurate quotes and human approval are the sprint priorities.",
  ],
  decisions: ["Keep the current teal brand colour; no change is needed."],
  follow_ups: [
    "Revisit the usefulness of calendar integration at the next meeting.",
  ],
  proposed_tasks: [
    {
      title: "Prepare the clickable review prototype",
      description:
        "Create a clickable prototype for the human review and approval flow.",
      assigned_to: "Maya",
      due_date: "by Friday",
      priority: "Med",
      transcript_quote:
        "Maya: I will prepare the clickable review prototype by Friday.",
    },
    {
      title: "Implement transcript upload validation",
      description: "Add validation for uploaded meeting transcripts.",
      assigned_to: "Thabo",
      due_date: "Not specified",
      priority: "Med",
      transcript_quote:
        "Thabo: I will implement the transcript upload validation.",
    },
    {
      title: "Document the approval workflow",
      description: "Document how proposed tasks are reviewed and approved.",
      assigned_to: "Unassigned",
      due_date: "Not specified",
      priority: "Med",
      transcript_quote:
        "Maya: We need to document the approval workflow. Nobody is assigned to that yet.",
    },
  ],
};
