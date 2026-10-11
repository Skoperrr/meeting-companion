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
        canvas: "#0B0C0E",
        surface: { base: "#121317", elevated: "#16181D" },
        border: {
          subtle: "rgba(255,255,255,0.08)",
          focus: "rgba(255,255,255,0.2)",
        },
        text: { primary: "#FFFFFF", secondary: "#9DA0A8", tertiary: "#858892" },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "Arial", "sans-serif"],
      },
      backgroundImage: {
        "ambient-glow": "none",
      },
    },
  },
} satisfies Config;
