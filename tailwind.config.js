/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme status colors are mapped to Tailwind defaults: success=green, warning=amber, danger=red, neutral=gray
      },
    },
  },
  plugins: [],
}
