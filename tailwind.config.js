/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-once': 'pulse 0.5s ease-in-out',
      },
      keyframes: {
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      },
      colors: {
        primary: {
          light: '#7765DA', // Light purple
          DEFAULT: '#5767D0', // Medium blue-purple
          dark: '#4F0DCE', // Dark purple
        },
        gray: {
          light: '#F2F2F2', // Light gray/white
          DEFAULT: '#373737', // Dark gray
          dark: '#6E6E6E', // Medium gray
          placeholder: '#D9D9D9', // Placeholder gray
        },
      },
      fontFamily: {
        'sora': ['Sora', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
