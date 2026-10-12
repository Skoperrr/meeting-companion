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
        canvas: "#0A0915",
        surface: { base: "#121124", card: "#121124", elevated: "#1A1833" },
        border: {
          subtle: "rgba(168,85,247,0.12)",
          active: "rgba(168,85,247,0.35)",
          focus: "rgba(168,85,247,0.35)",
        },
        primary: {
          neon: "#8B5CF6",
          deep: "#7C3AED",
          glow: "rgba(139,92,246,0.25)",
        },
        secondary: { accent: "#06B6D4", ice: "#38BDF8" },
        success: { emerald: "#10B981" },
        alert: { rose: "#F43F5E" },
        text: {
          primary: "#F8FAFC",
          secondary: "#94A3B8",
          tertiary: "#94A3B8",
          accent: "#C084FC",
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "Arial", "sans-serif"],
      },
      backgroundImage: {
        "ambient-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,0.22), transparent 70%)",
        "brand-button": "linear-gradient(135deg,#7C3AED 0%,#6366F1 100%)",
        "brand-progress": "linear-gradient(90deg,#8B5CF6 0%,#06B6D4 100%)",
      },
      boxShadow: { brand: "0 0 20px rgba(124,58,237,0.35)" },
    },
  },
} satisfies Config;
