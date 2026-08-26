/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // «ink» — тёмная шкала для текста и контуров на светлом фоне
        ink: {
          900: '#1b1533',
          800: '#2a2247',
          700: '#3d3560',
          600: '#564e79',
          500: '#635b85',
          400: '#857daa',
          300: '#b3acc9',
          200: '#ded9eb',
          100: '#efecf7',
          50: '#f8f6fd',
        },
        paper: '#ffffff',
        canvas: '#f3f0fa',
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
        glow: '0 10px 30px -12px rgba(123,70,224,0.55)',
        'glow-sm': '0 6px 16px -8px rgba(123,70,224,0.5)',
        card: '0 10px 30px -18px rgba(27,21,51,0.45), 0 2px 6px -3px rgba(27,21,51,0.12)',
        soft: '0 2px 10px -6px rgba(27,21,51,0.3)',
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
