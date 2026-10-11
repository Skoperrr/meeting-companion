import type { SVGProps } from "react";
export default function StrideShiftLogo({
  className = "",
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <span className="inline-flex items-center gap-3 text-white">
      <svg
        viewBox="0 0 44 48"
        fill="none"
        className={`h-10 w-9 ${className}`}
        aria-hidden="true"
        {...props}
      >
        <path
          d="M34 5C23-2 5 4 5 15c0 10 27 10 27 18 0 6-11 10-20 5l-5 6c14 8 33 1 33-12C40 20 13 21 13 14c0-5 10-8 17-3z"
          fill="currentColor"
        />
        <path
          d="M10 4c14-7 29 1 29 11 0 12-27 11-27 19 0 5 8 9 16 6l5 5C20 51 4 44 4 33c0-12 27-12 27-19 0-5-8-8-16-5z"
          stroke="#080809"
          strokeWidth="2"
          fill="currentColor"
        />
      </svg>
      <span className="font-serif text-xl tracking-[.16em]">STRIDESHIFT</span>
    </span>
  );
}
