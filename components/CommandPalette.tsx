"use client";
import { Command } from "cmdk";
import { useEffect, useRef, useState } from "react";
import {
  Columns3,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
  UserRound,
  Video,
  X,
} from "lucide-react";
type Props = {
  assignees: string[];
  onDashboard: () => void;
  onMeetings: () => void;
  onCreate: () => void;
  onSync: () => void;
  onAssignee: (name: string) => void;
};
export default function CommandPalette(props: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k" &&
        !event.repeat
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!open) return;
    const dialog = ref.current;
    dialog?.showModal();
    input.current?.focus();
    return () => dialog?.close();
  }, [open]);
  const run = (action: () => void) => {
    setOpen(false);
    action();
  };
  const itemClass =
    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm text-zinc-300 data-[selected=true]:bg-indigo-500/20 data-[selected=true]:text-white";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        aria-keyshortcuts="Meta+K Control+K"
        className="cobalt-command-dock inline-flex items-center gap-3 rounded-full border border-white/10 bg-surface-base px-5 py-3 text-sm text-text-secondary hover:border-blue-500/30"
      >
        <Search size={16} />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden text-[10px] opacity-60 sm:inline">⌘/Ctrl K</kbd>
      </button>
      {open && (
        <dialog
          ref={ref}
          aria-label="Command palette"
          onCancel={() => setOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
          className="m-auto w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-2xl"
        >
          <Command label="Workspace commands">
            <div className="flex items-center gap-3 border-b border-white/10 px-4">
              <Search className="shrink-0 text-zinc-500" size={19} />
              <Command.Input
                ref={input}
                placeholder="Search pages, actions or assignees..."
                className="h-14 w-full !border-0 !bg-transparent px-0 !text-white !outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close command palette"
                className="p-2 text-zinc-500"
              >
                <X size={18} />
              </button>
            </div>
            <Command.List className="max-h-96 overflow-y-auto p-3">
              <Command.Empty className="py-10 text-center text-sm text-zinc-500">
                No matching commands.
              </Command.Empty>
              <Command.Group
                heading="Navigate"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-zinc-500"
              >
                <Command.Item
                  value="Dashboard overview home"
                  onSelect={() => run(props.onDashboard)}
                  className={itemClass}
                >
                  <LayoutDashboard size={18} />
                  Jump to Dashboard
                </Command.Item>
                <Command.Item
                  value="Meetings history transcripts"
                  onSelect={() => run(props.onMeetings)}
                  className={itemClass}
                >
                  <FileText size={18} />
                  View Meetings
                </Command.Item>
              </Command.Group>
              <Command.Group
                heading="Meeting actions"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-zinc-500"
              >
                <Command.Item
                  value="Create new meeting upload transcript"
                  onSelect={() => run(props.onCreate)}
                  className={itemClass}
                >
                  <Plus size={18} />
                  Create Meeting
                </Command.Item>
                <Command.Item
                  value="Sync Google Meet Calendar Drive"
                  onSelect={() => run(props.onSync)}
                  className={itemClass}
                >
                  <Video size={18} />
                  Sync Google Meet
                </Command.Item>
              </Command.Group>
              <Command.Group
                heading="Filter action board by assignee"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-zinc-500"
              >
                <Command.Item
                  value="All assignees clear filter board"
                  onSelect={() => run(() => props.onAssignee(""))}
                  className={itemClass}
                >
                  <Columns3 size={18} />
                  All assignees
                </Command.Item>
                {props.assignees.map((name) => (
                  <Command.Item
                    key={name}
                    value={`Assignee ${name}`}
                    onSelect={() => run(() => props.onAssignee(name))}
                    className={itemClass}
                  >
                    <UserRound size={18} />
                    {name}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
          </Command>
        </dialog>
      )}
    </>
  );
}
