/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans CJK SC"', '"Noto Sans SC"', '"PingFang SC"', '"SF Pro Display"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      colors: {
        /* ─── Light Minimalist Design System (Linear/Stripe) ─── */
        /* 8px grid · single accent · no heavy shadows */
        surface: '#F9FAFB',          /* 页面背景 — 极淡灰 */
        base: {
          DEFAULT: '#F9FAFB',        /* 页面背景 */
          50:  '#F9FAFB',            /* 页面背景 */
          100: '#F3F4F6',            /* 分割线 / 次级区域 */
          200: '#E5E7EB',            /* 卡片边框 / 输入框边框 */
          300: '#D1D5DB',            /* 禁用边框 */
          400: '#9CA3AF',            /* 辅助文字 — 浅灰 */
          500: '#6B7280',            /* 次要文字 */
          600: '#4B5563',            /* 正文 — 深灰 */
          700: '#374151',            /* 次级标题 */
          800: '#1F2937',            /* 主标题 */
          900: '#111827',            /* 纯黑标题 */
        },
        accent: {
          DEFAULT: '#4F46E5',        /* Deep Indigo — 唯一主题色 */
          50:  '#EEF2FF',            /* 极淡 indigo 背景 */
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',            /* 主按钮 */
          700: '#4338CA',            /* hover 状态 */
          800: '#3730A3',
          900: '#312E81',
        },
        game: {
          gold: '#B45309',           /* 勋章/金色奖励 */
          correct: '#059669',        /* 正确 — Emerald */
          wrong: '#DC2626',          /* 错误 — Red */
          combo: '#D97706',          /* 连击 — Amber */
          particle: '#6366F1',       /* 粒子效果 — Indigo */
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
        'node-shake': 'node-shake 0.6s ease-in-out',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(79, 70, 229, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(79, 70, 229, 0.5)' },
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
        'node-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '15%': { transform: 'translateX(-3px)' },
          '30%': { transform: 'translateX(3px)' },
          '45%': { transform: 'translateX(-2px)' },
          '60%': { transform: 'translateX(2px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
