import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ccff",
          300: "#80abff",
          400: "#4d82ff",
          500: "#2a5cf0",
          600: "#1c42c9",
          700: "#1833a0",
          800: "#152a7d",
          900: "#132464",
        },
      },
    },
  },
  plugins: [],
};

export default config;
