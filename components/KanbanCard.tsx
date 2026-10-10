"use client";
import { Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Task } from "@/lib/schemas";
import AssigneeAvatar from "./AssigneeAvatar";
import TaskCard from "./TaskCard";
import TaskPeekDrawer from "./TaskPeekDrawer";
export default function KanbanCard({
  task,
  index,
  disabled,
  onStatusChange,
  onDelete,
  onMeeting,
  onAssignee,
}: {
  task: Task;
  index: number;
  disabled: boolean;
  onStatusChange: (status: Task["status"]) => Promise<void>;
  onDelete: () => Promise<void>;
  onMeeting: (id: string) => void;
  onAssignee: (name: string) => void;
}) {
  const [evidence, setEvidence] = useState(false);
  const hovered = useRef(false);
  const card = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const peek = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.defaultPrevented ||
        evidence ||
        document.querySelector("dialog[open]") ||
        (!hovered.current && !card.current?.contains(document.activeElement))
      )
        return;
      if (
        target instanceof Element &&
        target.closest(
          'button,input,textarea,select,a,[contenteditable="true"],[role="button"]',
        )
      )
        return;
      event.preventDefault();
      setEvidence(true);
    };
    window.addEventListener("keydown", peek);
    return () => window.removeEventListener("keydown", peek);
  }, [evidence]);
  return (
    <Draggable
      draggableId={task.id}
      index={index}
      isDragDisabled={disabled || evidence}
    >
      {(provided, snapshot) => (
        <div
          ref={(node) => {
            provided.innerRef(node);
            card.current = node;
          }}
          tabIndex={0}
          aria-label={`${task.title}. Press Space for quick peek.`}
          onMouseEnter={() => {
            hovered.current = true;
          }}
          onMouseLeave={() => {
            hovered.current = false;
          }}
          {...provided.draggableProps}
          style={provided.draggableProps.style}
        >
          <div
            className={`rounded-xl border bg-white transition-shadow duration-200 ${snapshot.isDragging ? "border-indigo-400 shadow-2xl ring-2 ring-indigo-300/50" : "border-transparent"}`}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <AssigneeAvatar
                name={task.assigned_to}
                disabled={disabled}
                onClick={() => onAssignee(task.assigned_to)}
              />
              <button
                type="button"
                {...provided.dragHandleProps}
                disabled={disabled}
                aria-label={`Drag ${task.title}; press Space to lift, arrows to move, Space to drop`}
                className="cursor-grab rounded-md p-1 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 active:cursor-grabbing disabled:cursor-not-allowed"
              >
                <GripVertical size={18} />
              </button>
            </div>
            <div
              className={
                snapshot.isDragging
                  ? "relative z-10 scale-105 motion-reduce:scale-100"
                  : ""
              }
            >
              <TaskCard
                task={task}
                saving={disabled}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onMeeting={onMeeting}
                onEvidence={() => setEvidence(true)}
              />
            </div>
          </div>
          {evidence && (
            <TaskPeekDrawer
              task={task}
              saving={disabled}
              onStatusChange={onStatusChange}
              onMeeting={onMeeting}
              onClose={() => setEvidence(false)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}
