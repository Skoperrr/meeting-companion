import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  check,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
export const meetings = sqliteTable(
  "meetings",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    meeting_date: text("meeting_date").notNull(),
    transcript: text("transcript").notNull(),
    analysis: text("analysis").notNull(),
    review_state: text("review_state", { enum: ["pending", "approved"] })
      .notNull()
      .default("pending"),
    analysis_source: text("analysis_source").notNull(),
    created_at: text("created_at").notNull(),
  },
  (t) => [
    check(
      "meetings_review_valid",
      sql`${t.review_state} IN ('pending','approved')`,
    ),
    index("meetings_created_idx").on(t.created_at),
  ],
);
export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    meeting_id: text("meeting_id")
      .notNull()
      .references(() => meetings.id, { onDelete: "cascade" }),
    proposal_index: integer("proposal_index").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    assigned_to: text("assigned_to").notNull(),
    due_date: text("due_date").notNull(),
    priority: text("priority", { enum: ["Low", "Med", "High"] }).notNull(),
    status: text("status", {
      enum: ["To Do", "In Progress", "Blocked", "In Review", "Completed"],
    })
      .notNull()
      .default("To Do"),
    transcript_quote: text("transcript_quote").notNull(),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("tasks_proposal_unique").on(t.meeting_id, t.proposal_index),
    index("tasks_meeting_idx").on(t.meeting_id),
    index("tasks_status_idx").on(t.status),
    check(
      "tasks_status_valid",
      sql`${t.status} IN ('To Do','In Progress','Blocked','In Review','Completed')`,
    ),
    check("tasks_priority_valid", sql`${t.priority} IN ('Low','Med','High')`),
  ],
);
