import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)"]
      },
      colors: {
        brand: {
          50: "#effcf6",
          100: "#d8f7e5",
          200: "#b5efcf",
          300: "#82e2af",
          400: "#47cf87",
          500: "#20b96a",
          600: "#149655",
          700: "#137746",
          800: "#145e3a",
          900: "#134d32"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(15, 23, 42, 0.28)"
      }
    }
  },
  plugins: []
};

export default config;
