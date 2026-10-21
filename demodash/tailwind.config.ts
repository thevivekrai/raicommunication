import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f1ff",
          100: "#e9e3ff",
          200: "#d3c7ff",
          300: "#b3a0ff",
          400: "#8f72ff",
          500: "#6d47f5",
          600: "#5a2fe0",
          700: "#4a24bd",
          800: "#3d2096",
          900: "#2c1870",
        },
        lime: { 400: "#c6f432", 500: "#b0e01c" },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,16,50,.06), 0 4px 16px rgba(20,16,50,.06)",
      },
      keyframes: {
        "slide-up": { from: { transform: "translateY(12px)", opacity: "0" }, to: { transform: "none", opacity: "1" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { "slide-up": "slide-up .2s ease-out", shimmer: "shimmer 1.4s infinite" },
    },
  },
  plugins: [],
};

export default config;
