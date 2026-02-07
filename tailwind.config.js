/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DC2626', // Red-600
          dark: '#991B1B',    // Red-800
          glow: '#EF4444',    // Red-500
        },
        surface: '#09090b',   // Zinc-950 (Almost Black)
        card: '#18181b',      // Zinc-900
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
