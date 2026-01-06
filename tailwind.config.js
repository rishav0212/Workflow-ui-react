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
          DEFAULT: "#f7f6f3", // Warm off-white
          subtle: "#efeee9",
          active: "#e5e3dc",
        },
        surface: {
          DEFAULT: "#ffffff",
          elevated: "#fafaf8",
          muted: "#f0efea",
        },
        // Terracotta & Clay accents (warm, professional)
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
        // Refined ink colors
        ink: {
          primary: "#2c2825", // Deep warm gray
          secondary: "#5c5550",
          tertiary: "#8a837c",
          muted: "#b3aca5",
          inverted: "#ffffff",
        },
        // Sage & Earth accents
        sage: {
          50: "#f6f7f4",
          100: "#e8ebe3",
          200: "#d4dac9",
          300: "#b5c0a6",
          400: "#93a47e",
          500: "#778a60", // Sage green
          600: "#5e6f4c",
          700: "#4a573d",
          800: "#3c4733",
          900: "#333c2d",
        },
        // Status with warmth
        status: {
          success: "#5e8a4f",
          warning: "#d97b2e",
          error: "#c74538",
          info: "#6b8aa3",
        },
      },
      boxShadow: {
        soft: "0 2px 8px -1px rgba(44, 40, 37, 0.06), 0 1px 3px -1px rgba(44, 40, 37, 0.04)",
        lifted:
          "0 4px 16px -2px rgba(44, 40, 37, 0.08), 0 2px 6px -1px rgba(44, 40, 37, 0.04)",
        floating:
          "0 12px 32px -4px rgba(44, 40, 37, 0.12), 0 4px 12px -2px rgba(44, 40, 37, 0.06)",
        premium: "0 20px 50px -12px rgba(44, 40, 37, 0.15)",
      },
      borderRadius: {
        card: "12px",
        panel: "16px",
      },
animation: {
        fadeIn: 'fadeIn 0.3s ease-out',
        slideUp: 'slideUp 0.4s ease-out',
        slideDown: 'slideDown 0.2s ease-out',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
};