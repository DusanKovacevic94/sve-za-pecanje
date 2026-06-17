import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        river: {
          50: "#f1fbf8",
          100: "#d3f4ec",
          500: "#1f9d85",
          600: "#147d6b",
          700: "#126557",
          900: "#0f352f"
        },
        reed: "#e4b363",
        ink: "#14213d"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(20, 33, 61, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

