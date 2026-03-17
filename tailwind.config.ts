/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./client/src/**/*.{ts,tsx}", "./client/index.html"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#ffffff",
        card: { DEFAULT: "#141414", foreground: "#ffffff" },
        border: "#2a2a2a",
        primary: { DEFAULT: "#D4A53E", foreground: "#000000" },
        muted: { DEFAULT: "#1e1e1e", foreground: "#888877" },
        profit: "#22c55e",
        loss: "#ef4444",
      },
    },
  },
  plugins: [],
};
