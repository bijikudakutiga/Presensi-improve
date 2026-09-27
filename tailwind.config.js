/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5FB",
        ink: "#241C35",
        line: "#E4DEF0",
        primary: {
          DEFAULT: "#6C4FC4",
          dark: "#4F3899",
          soft: "#ECE6FA",
        },
        lilac: {
          DEFAULT: "#9B87D9",
          soft: "#F1ECFB",
        },
        amber: {
          DEFAULT: "#C7862E",
          soft: "#F7EEDC",
        },
        rust: {
          DEFAULT: "#B14357",
          soft: "#F6E1E6",
        },
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        lg: "10px",
        xl: "16px",
      },
      boxShadow: {
        soft: "0 8px 24px -12px rgba(76, 45, 153, 0.25)",
      },
      keyframes: {
        slideup: {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        fadein: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        popin: {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { opacity: "1", transform: "scale(1.03)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        slideup: "slideup 0.2s ease-out",
        marquee: "marquee 20s linear infinite",
        fadein: "fadein 0.35s ease-out",
        popin: "popin 0.45s cubic-bezier(0.34,1.56,0.64,1)",
      },
    },
  },
  plugins: [],
};
