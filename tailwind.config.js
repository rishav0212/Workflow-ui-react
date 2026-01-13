/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Crimson Pro", "Georgia", "serif"],
      },
      colors: {
        // Warm, sophisticated palette inspired by natural materials
        canvas: {
          DEFAULT: "#fafaf8", // Softer warm off-white
          subtle: "#f5f4f0",
          active: "#eae8e1",
        },
        surface: {
          DEFAULT: "#ffffff",
          elevated: "#fefefe",
          muted: "#f8f7f4",
        },
        // Primary: Terracotta & Clay accents (warm, professional) - UNCHANGED
        brand: {
          50: "#fef8f4",
          100: "#fdeee5",
          200: "#fad8c3",
          300: "#f6bc9a",
          400: "#f19a6b",
          500: "#e87548", // Primary terracotta
          600: "#d4593a",
          700: "#b24230",
          800: "#8f362c",
          900: "#742f27",
        },
        // Refined ink colors - ENHANCED contrast
        ink: {
          primary: "#1a1715", // Deeper, richer black
          secondary: "#4a443f",
          tertiary: "#736d66",
          muted: "#a8a199",
          inverted: "#ffffff",
        },
        // Neutral Grays (warm stone tones)
        neutral: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
        // Status colors - WARMED UP to match theme
        status: {
          success: "#16a34a", // Vibrant green
          warning: "#ea580c", // Warm orange (closer to brand)
          error: "#dc2626", // Clean red
          info: "#0284c7", // Clear blue
        },
        // 🆕 ACCENT: Deep Plum/Eggplant (Sophisticated complement to terracotta!)
        accent: {
          50: "#faf5fa",
          100: "#f4ebf3",
          200: "#e9d5e8",
          300: "#d9b3d6",
          400: "#c389be",
          500: "#a855a6", // Rich plum - perfect for sort buttons
          600: "#8b3f89",
          700: "#6f326f",
          800: "#5c2a5b",
          900: "#4d254c",
        },
      },
      boxShadow: {
        // Softer, warmer shadows
        soft: "0 1px 3px 0 rgba(26, 23, 21, 0.04), 0 1px 2px -1px rgba(26, 23, 21, 0.02)",
        lifted:
          "0 4px 6px -1px rgba(26, 23, 21, 0.06), 0 2px 4px -2px rgba(26, 23, 21, 0.03)",
        floating:
          "0 10px 15px -3px rgba(26, 23, 21, 0.08), 0 4px 6px -4px rgba(26, 23, 21, 0.04)",
        premium:
          "0 20px 25px -5px rgba(26, 23, 21, 0.1), 0 8px 10px -6px rgba(26, 23, 21, 0.04)",
        // Colored shadows for brand elements
        "brand-sm": "0 2px 8px -2px rgba(232, 117, 72, 0.2)",
        "brand-md": "0 4px 16px -4px rgba(232, 117, 72, 0.25)",
        "brand-lg": "0 8px 24px -6px rgba(232, 117, 72, 0.3)",
        // 🆕 NEW: Plum shadows for accent elements (subtle & sophisticated)
        "accent-sm": "0 2px 8px -2px rgba(168, 85, 166, 0.15)",
        "accent-md": "0 4px 16px -4px rgba(168, 85, 166, 0.2)",
        "accent-lg": "0 8px 24px -6px rgba(168, 85, 166, 0.25)",
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        slideUp: "slideUp 0.4s ease-out",
        slideDown: "slideDown 0.2s ease-out",
        slideInRight: "slideInRight 0.3s ease-out",
        "bounce-slow": "bounce 3s infinite",
        "pulse-soft": "pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      // Backdrop blur utilities
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
