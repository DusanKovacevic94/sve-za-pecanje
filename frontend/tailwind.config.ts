import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        river: {
          50: "#f1fbf8",
          100: "#d3f4ec",
          200: "#a9e4d7",
          300: "#76d0c0",
          400: "#3fb7a2",
          500: "#1f9d85",
          600: "#147d6b",
          700: "#126557",
          800: "#114e46",
          900: "#0f352f"
        },
        reed: {
          DEFAULT: "#dca542",
          50: "#fff8e8",
          100: "#f9edc4",
          300: "#efcf7b",
          500: "#dca542",
          700: "#a66c24"
        },
        sand: {
          50: "#fbfaf6",
          100: "#f1ede3",
          200: "#ded6c7"
        },
        ink: {
          DEFAULT: "#101a2c",
          700: "#24354f",
          800: "#18263d",
          900: "#101a2c"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 10px 30px rgba(16, 26, 44, 0.08)",
        lift: "0 18px 48px rgba(16, 26, 44, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
