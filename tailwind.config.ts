import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-dm-serif)", "Georgia", "serif"],
      },
      colors: {
        je: {
          white: "#ffffff",
          cream: "#f7f6f3",
          offwhite: "#f2f1ee",
          border: "#e5e3df",
          muted: "#767676",
          charcoal: "#2d2d2d",
          black: "#1a1a1a",
          sale: "#c41e3a",
        },
      },
      letterSpacing: {
        widest: "0.15em",
        wider: "0.08em",
      },
    },
  },
  plugins: [],
} satisfies Config;
