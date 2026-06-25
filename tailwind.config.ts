import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep, authoritative navy — the GovLink primary.
        navy: {
          50: "#f1f5fb",
          100: "#dde7f3",
          200: "#bccfe7",
          300: "#90add4",
          400: "#5d83bd",
          500: "#3a61a1",
          600: "#2a4a83",
          700: "#1f3a6a",
          800: "#102a56",
          900: "#0b2447",
          950: "#06152e",
        },
        // Confident civic cyan — used sparingly for CTAs, focus, status.
        accent: {
          50: "#ecfdff",
          100: "#cef6fe",
          200: "#a2ecfc",
          300: "#63ddf8",
          400: "#1fc7ef",
          500: "#06a6d4",
          600: "#0a85b2",
          700: "#106a8f",
          800: "#175874",
          900: "#174962",
          950: "#0a2f43",
        },
        ink: {
          DEFAULT: "#0b1220",
          soft: "#384256",
          muted: "#6b7689",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 36, 71, 0.04), 0 8px 24px -12px rgba(11, 36, 71, 0.18)",
        "card-hover":
          "0 2px 4px rgba(11, 36, 71, 0.06), 0 16px 40px -16px rgba(11, 36, 71, 0.28)",
        focus: "0 0 0 3px rgba(31, 199, 239, 0.45)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.7)", opacity: "0.7" },
          "80%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
        "dot-bounce": {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out both",
        "fade-in-up": "fade-in-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
