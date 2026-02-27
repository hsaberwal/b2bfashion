import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Just Elegance–inspired palette: clean retail look */
        je: {
          white: "#ffffff",
          cream: "#fafaf9",
          offwhite: "#f5f5f4",
          border: "#e8e6e4",
          muted: "#6b6b6b",
          charcoal: "#2d2d2d",
          black: "#1a1a1a",
          sale: "#c41e3a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
