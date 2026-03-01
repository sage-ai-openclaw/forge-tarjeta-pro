/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bank: {
          itau: '#FF6B00',
          basa: '#0066CC',
          continental: '#00A651',
          Vision: '#E31937',
          familiar: '#FFD700',
        }
      }
    },
  },
  plugins: [],
}
