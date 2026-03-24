import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/app/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fffaf5",
          100: "#fbe9d6",
          200: "#f0c8a3",
          300: "#e4a56c",
          400: "#cf7d3a",
          500: "#b86527",
          600: "#974d1e",
          700: "#783c1a",
          800: "#5d3017",
          900: "#4b2814"
        }
      }
    }
  },
  plugins: []
};

export default config;
