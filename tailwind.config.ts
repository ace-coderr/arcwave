import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        mono: ["'DM Mono'", "monospace"],
      },
      colors: {
        base:      "#060810",
        surface:   "#0d0f1a",
        elevated:  "#131626",
        hover:     "#1a1d2e",
        border:    "#1e2235",
        "border-bright": "#2a2f4a",
        brand: {
          blue:    "#3b82f6",
          bright:  "#60a5fa",
          purple:  "#8b5cf6",
          cyan:    "#06b6d4",
        },
        status: {
          green:   "#10b981",
          yellow:  "#f59e0b",
          red:     "#ef4444",
        },
        text: {
          primary:   "#f0f2ff",
          secondary: "#8b90b0",
          muted:     "#4a4f6a",
        },
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
        "gradient-glow":  "linear-gradient(135deg, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.15) 100%)",
        "gradient-card":  "linear-gradient(160deg, #0d0f1a 0%, #131626 100%)",
      },
      boxShadow: {
        "glow-blue":   "0 0 30px rgba(59,130,246,0.15)",
        "glow-purple": "0 0 30px rgba(139,92,246,0.12)",
        "card":        "0 4px 24px rgba(0,0,0,0.4)",
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out forwards",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
