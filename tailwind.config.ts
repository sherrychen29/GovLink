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
        // San Jose civic tan/bronze — official #B08861, used for CTAs, focus, status.
        accent: {
          50: "#faf5ef",
          100: "#f2e8da",
          200: "#e4d0b6",
          300: "#d2b38a",
          400: "#be9a6e",
          500: "#b08861",
          600: "#9a7250",
          700: "#7e5c42",
          800: "#684c38",
          900: "#573f30",
          950: "#2e2019",
        },
        ink: {
          DEFAULT: "#0b1220",
          soft: "#384256",
          muted: "#6b7689",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-monda)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 36, 71, 0.04), 0 8px 24px -12px rgba(11, 36, 71, 0.18)",
        "card-hover":
          "0 2px 4px rgba(11, 36, 71, 0.06), 0 16px 40px -16px rgba(11, 36, 71, 0.28)",
        focus: "0 0 0 3px rgba(176, 136, 97, 0.45)",
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
