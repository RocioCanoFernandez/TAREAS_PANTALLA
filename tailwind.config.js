/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        seviai: {
          red: '#DA1F26',
          dark: '#b81820'
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      }
    },
  },
  plugins: [],
}
