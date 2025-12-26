import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1337ec',
        'primary-hover': '#0f2cc2',
        'background-light': '#f6f6f8',
        'background-dark': '#101322',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0 }
        }
      },
      animation: {
        'cursor-blink': 'blink 1.2s step-start infinite'
      }
    },
  },
  plugins: [],
} satisfies Config
