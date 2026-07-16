import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "fill-subtle": "rgb(var(--fill-subtle) / <alpha-value>)",
        overlay: "rgb(var(--overlay) / <alpha-value>)",
        neon: {
          green: "rgb(var(--neon-green) / <alpha-value>)",
          blue: "rgb(var(--neon-blue) / <alpha-value>)",
          yellow: "rgb(var(--neon-yellow) / <alpha-value>)",
        },
      },
      boxShadow: {
        neon: "0 0 20px rgb(var(--neon-green) / 0.45)",
        neonBlue: "0 0 24px rgb(var(--neon-blue) / 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
