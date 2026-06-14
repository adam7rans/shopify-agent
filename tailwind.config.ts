import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        shell: "#f6f2ea",
        sand: "#e7dcc7",
        matcha: "#667a41",
        plum: "#6f365f",
        coral: "#dd6b52",
        gold: "#d5a53a",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(17, 24, 39, 0.08)",
      },
      borderRadius: {
        xl2: "1.5rem",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
