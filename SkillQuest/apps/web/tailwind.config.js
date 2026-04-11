/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans CJK SC"', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#92d0fd',
          400: '#5eb6fa',
          500: '#3996f6',
          600: '#2378eb',
          700: '#1b63d8',
          800: '#1c4faf',
          900: '#1c458a',
          950: '#162b54',
        },
        game: {
          gold: '#FFD700',
          correct: '#22c55e',
          wrong: '#ef4444',
          combo: '#f59e0b',
          particle: '#00BFFF',
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float-up': 'float-up 0.8s ease-out forwards',
        'shake': 'shake 0.4s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 215, 0, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.8)' },
        },
        'float-up': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-60px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
};
