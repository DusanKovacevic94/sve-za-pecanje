import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        river: {
          50: "#f1f7f5",
          100: "#dfece8",
          200: "#bfd7d0",
          300: "#91b9ae",
          400: "#62988a",
          500: "#40796c",
          600: "#285e53",
          700: "#173f37",
          800: "#12342e",
          900: "#0b2521"
        },
        reed: {
          DEFAULT: "#ee9835",
          50: "#fff8ef",
          100: "#fdecd7",
          200: "#fbd6ab",
          300: "#f5b86c",
          400: "#f0a34a",
          500: "#ee9835",
          600: "#d97c1f",
          700: "#ae5b18",
          800: "#8c4718",
          900: "#713a16"
        },
        sand: {
          50: "#fbfaf7",
          100: "#f7f6f1",
          200: "#e9e5dc",
          300: "#d8d1c4",
          400: "#b9b0a2"
        },
        ink: {
          DEFAULT: "#16201d",
          400: "#7b8782",
          500: "#60706a",
          600: "#46554f",
          700: "#33413d",
          800: "#24302c",
          900: "#16201d"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      },
      boxShadow: {
        soft: "0 8px 24px rgba(23, 63, 55, 0.07)",
        lift: "0 18px 44px rgba(23, 63, 55, 0.13)",
        button: "0 6px 16px rgba(23, 63, 55, 0.16)",
        header: "0 4px 18px rgba(23, 63, 55, 0.05)",
        "action-bar": "0 -8px 24px rgba(23, 63, 55, 0.10)",
        "nav-active": "inset 0 -2px 0 #ee9835"
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(circle at 86% 10%, rgba(238, 152, 53, 0.16), transparent 24rem)"
      }
    }
  },
  plugins: []
};

export default config;
