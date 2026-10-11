"use client";
import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
export default function VirtualTaskList<T>({
  items,
  getKey,
  renderItem,
  label,
  height = 640,
  estimate = 160,
}: {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  label: string;
  height?: number;
  estimate?: number;
}) {
  "use no memo"; // TanStack Virtual manages mutable measurements; opt out of React Compiler.
  const parent = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- intentionally excluded from compiler memoization above.
  const virtual = useVirtualizer({
    count: items.length,
    getScrollElement: () => parent.current,
    estimateSize: () => estimate,
    getItemKey: (index) => getKey(items[index]),
    overscan: 5,
  });
  return (
    <div
      ref={parent}
      tabIndex={0}
      role="region"
      aria-label={label}
      style={{
        height,
        maxHeight: "70vh",
        overflow: "auto",
        overflowAnchor: "none",
      }}
    >
      <div
        style={{
          height: virtual.getTotalSize(),
          position: "relative",
          width: "100%",
        }}
      >
        {virtual.getVirtualItems().map((row) => (
          <div
            key={row.key}
            data-index={row.index}
            ref={virtual.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${row.start}px)`,
            }}
            className="pb-4"
          >
            {renderItem(items[row.index], row.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
