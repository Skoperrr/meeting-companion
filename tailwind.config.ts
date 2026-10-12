import type { Config } from "tailwindcss";
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#090A0D",
        surface: { base: "#13151B", card: "#13151B", elevated: "#1A1D24" },
        accent: { blue: "#3B82F6", deep: "#2563EB", indigo: "#6366F1" },
        border: {
          subtle: "rgba(255,255,255,.08)",
          focus: "rgba(59,130,246,.3)",
          active: "rgba(59,130,246,.3)",
        },
        text: { primary: "#FFFFFF", secondary: "#A1ADBF", tertiary: "#A1ADBF" },
        success: "#10B981",
        alert: "#F43F5E",
      },
      fontFamily: {
        sans: ['"Inter"', "Arial", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
      },
      backgroundImage: {
        "ambient-glow":
          "radial-gradient(circle at 50% 0%,rgba(59,130,246,.06),transparent 65%)",
        "cobalt-button": "linear-gradient(135deg,#2563EB,#6366F1)",
        "cobalt-progress": "linear-gradient(90deg,#3B82F6,#6366F1)",
      },
    },
  },
} satisfies Config;
