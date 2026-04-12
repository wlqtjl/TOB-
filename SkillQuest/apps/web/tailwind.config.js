/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans CJK SC"', '"Noto Sans SC"', '"PingFang SC"', '"SF Pro Display"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        /* ─── Minimalist Design System ─── */
        base: {
          DEFAULT: '#0D1117',  /* 深海军蓝底色 */
          50:  '#f0f6fc',
          100: '#c9d1d9',
          200: '#b1bac4',
          300: '#8b949e',      /* 中性灰 — 辅助信息 */
          400: '#6e7681',
          500: '#484f58',
          600: '#30363d',      /* 卡片边框 */
          700: '#21262d',      /* 卡片背景 */
          800: '#161b22',      /* 次级背景 */
          900: '#0D1117',      /* 主背景 */
        },
        accent: {
          DEFAULT: '#58A6FF',  /* 电光蓝 — 唯一主题色 */
          50:  '#f0f7ff',
          100: '#cce5ff',
          200: '#a5d6ff',
          300: '#79c0ff',
          400: '#58A6FF',      /* 主行动点 */
          500: '#388bfd',
          600: '#1f6feb',
          700: '#1158c7',
          800: '#0d419d',
          900: '#0a3069',
        },
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
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
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
