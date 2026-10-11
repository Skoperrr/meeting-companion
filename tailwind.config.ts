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
        canvas: "#080809",
        surface: { base: "#101114", elevated: "#16181D" },
        border: {
          subtle: "rgba(255,255,255,0.08)",
          focus: "rgba(255,255,255,0.2)",
        },
        text: { primary: "#FFFFFF", secondary: "#8E9099", tertiary: "#52545D" },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "Arial", "sans-serif"],
      },
      backgroundImage: {
        "ambient-glow":
          "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.05) 0%, transparent 65%)",
      },
    },
  },
} satisfies Config;
