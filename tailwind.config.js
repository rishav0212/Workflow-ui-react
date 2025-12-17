/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "serif"], // Optional for headings
      },
      colors: {
        // SEMANTIC PALETTE
        // The Canvas: Warm, paper-like backgrounds
        canvas: {
          DEFAULT: "#fafaf9", // stone-50
          subtle: "#f5f5f4", // stone-100
          active: "#e7e5e4", // stone-200
        },
        // The Surface: Clean white for cards to pop against the canvas
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f5f5f4",
        },
        // The Brand: Bronze/Earth accents instead of generic Blue
        brand: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#d97706", // Base Bronze
          600: "#b45309", // Darker Bronze (Primary Actions)
          700: "#92400e",
          800: "#78350f",
          900: "#451a03",
        },
        // Text Levels
        ink: {
          primary: "#1c1917", // stone-900
          secondary: "#57534e", // stone-600
          muted: "#a8a29e", // stone-400
          inverted: "#ffffff",
        },
        // Status Indicators (Desaturated for professionalism)
        status: {
          success: "#059669", // emerald-600
          warning: "#d97706", // amber-600
          error: "#dc2626", // red-600
        },
      },
      boxShadow: {
        premium: "0 4px 20px -2px rgba(28, 25, 23, 0.08)", // Warm shadow
        floating: "0 10px 40px -10px rgba(28, 25, 23, 0.15)",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
      },
    },
  },
  plugins: [
    // require("@tailwindcss/forms")
  ],
  corePlugins: {
    preflight: false,
  },
};
