/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // «ink» — светлая шкала для текста и контуров на ночном фоне
        ink: {
          900: '#f2f4fc',
          800: '#e3e7f5',
          700: '#c4cade',
          600: '#99a1bf',
          500: '#828bab',
          400: '#6a7290',
          300: '#4d5473',
          200: '#2f3552',
          100: '#1d2239',
          50: '#12162a',
        },
        paper: '#151a2e',
        canvas: '#090d1a',
        neon: {
          pink: '#e8368f',
          violet: '#7b46e0',
          cyan: '#0891b2',
          gold: '#dc8a0c',
          lime: '#16a34a',
        },
        flame: '#ff6b4a',
        tide: '#4fb8ff',
        verdant: '#68e08a',
        lumen: '#ffe07a',
        umbra: '#b57cff',
      },
      fontFamily: {
        display: ['"Rajdhani"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        body: ['"Manrope"', '"Segoe UI"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 30px -12px rgba(150,120,255,0.5)',
        'glow-sm': '0 6px 16px -8px rgba(150,120,255,0.45)',
        card: '0 18px 40px -24px rgba(0,0,0,0.9), 0 2px 8px -4px rgba(0,0,0,0.6)',
        soft: '0 6px 18px -10px rgba(0,0,0,0.8)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        popup: { '0%': { transform: 'translateY(0) scale(0.85)', opacity: '0' }, '25%': { opacity: '1' }, '100%': { transform: 'translateY(-42px) scale(1)', opacity: '0' } },
        shake: { '0%,100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
        sheen: { '0%': { backgroundPosition: '-140% 0' }, '100%': { backgroundPosition: '240% 0' } },
        pulseRing: { '0%': { transform: 'scale(0.85)', opacity: '0.9' }, '100%': { transform: 'scale(1.5)', opacity: '0' } },
        slideUp: { '0%': { transform: 'translateY(24px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        spinSlow: { '0%': { transform: 'rotate(0)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        floaty: 'floaty 3.2s ease-in-out infinite',
        popup: 'popup 0.9s ease-out forwards',
        shake: 'shake 0.22s ease-in-out',
        sheen: 'sheen 2.4s linear infinite',
        pulseRing: 'pulseRing 1.4s ease-out infinite',
        slideUp: 'slideUp 0.28s ease-out',
        spinSlow: 'spinSlow 14s linear infinite',
      },
    },
  },
  plugins: [],
};
