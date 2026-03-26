/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // A4 paper dimensions
      width: {
        'a4': '210mm',
      },
      minHeight: {
        'a4': '297mm',
      },
    },
  },
  plugins: [],
}

