/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#080711',
          800: '#0d0b1a',
          700: '#141127',
          600: '#1c1836',
          500: '#272147',
          400: '#382f61',
        },
        neon: {
          pink: '#ff5ea8',
          violet: '#a06bff',
          cyan: '#4fe3ff',
          gold: '#ffc857',
          lime: '#7dff9c',
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
        glow: '0 0 24px -4px rgba(160,107,255,0.55)',
        'glow-sm': '0 0 12px -2px rgba(160,107,255,0.5)',
        card: '0 12px 32px -12px rgba(0,0,0,0.9)',
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
