/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-red': 'pulseRed 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(99,102,241,0.4), 0 0 30px rgba(99,102,241,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(99,102,241,0.7), 0 0 50px rgba(99,102,241,0.35)' },
        },
        pulseRed: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(239,68,68,0.5), 0 0 30px rgba(239,68,68,0.25)' },
          '50%': { boxShadow: '0 0 30px rgba(239,68,68,0.8), 0 0 60px rgba(239,68,68,0.4)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
