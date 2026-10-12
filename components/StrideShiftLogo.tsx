"use client";
import { useId } from "react";
export default function StrideShiftLogo() {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-3">
      <svg
        viewBox="0 0 44 48"
        className="h-10 w-9 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={id}
            x1="0"
            y1="0"
            x2="44"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#8B5CF6" />
            <stop offset="1" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <path
          d="M34 5C23-2 5 4 5 15c0 10 27 10 27 18 0 6-11 10-20 5l-5 6c14 8 33 1 33-12C40 20 13 21 13 14c0-5 10-8 17-3z"
          fill={`url(#${id})`}
        />
        <path
          d="M10 4c14-7 29 1 29 11 0 12-27 11-27 19 0 5 8 9 16 6l5 5C20 51 4 44 4 33c0-12 27-12 27-19 0-5-8-8-16-5z"
          fill={`url(#${id})`}
          stroke="#0A0915"
          strokeWidth="2"
        />
      </svg>
      <span className="font-serif text-xl tracking-[.12em] text-text-primary">
        STRIDESHIFT
      </span>
    </span>
  );
}
