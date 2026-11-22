/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          850: '#0f172a',
          900: '#0b132b',
          950: '#070b19',
        },
        status: {
          safe: {
            DEFAULT: '#10b981', // emerald-500
            light: '#d1fae5',
            dark: '#065f46',
            border: '#34d399',
          },
          warning: {
            DEFAULT: '#f59e0b', // amber-500
            light: '#fef3c7',
            dark: '#92400e',
            border: '#fbbf24',
          },
          danger: {
            DEFAULT: '#ef4444', // red-500
            light: '#fee2e2',
            dark: '#991b1b',
            border: '#f87171',
          },
          supervised: {
            DEFAULT: '#06b6d4', // cyan-500 / teal
            light: '#cffafe',
            dark: '#155e75',
            border: '#22d3ee',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
}

