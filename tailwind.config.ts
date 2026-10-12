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
        canvas: "hsl(40 30% 96%)",
        surface: { base: "hsl(40 28% 98%)", elevated: "hsl(40 22% 92%)" },
        border: {
          subtle: "hsl(40 18% 88%)",
          focus: "hsl(208 32% 48%)",
        },
        text: { primary: "hsl(212 32% 9%)", secondary: "hsl(213 12% 38%)", tertiary: "hsl(213 12% 38%)" },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Inter"', "Arial", "sans-serif"],
      },
      backgroundImage: {
        "ambient-glow":
          "none",
      },
    },
  },
} satisfies Config;
