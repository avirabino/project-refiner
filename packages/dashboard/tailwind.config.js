/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        v: {
          bg: {
            void: '#050507',
            base: '#0a0a0f',
            raised: '#111118',
            overlay: '#16161f',
            elevated: '#1c1c28',
            hover: '#22222f',
          },
          text: {
            primary: '#e8eaed',
            secondary: '#9ca3af',
            tertiary: '#6b7280',
            ghost: '#374151',
          },
          border: {
            subtle: '#1f2937',
            default: '#2d3748',
            strong: '#4b5563',
          },
          accent: {
            50: '#ecfeff',
            100: '#cffafe',
            200: '#a5f3fc',
            300: '#67e8f9',
            400: '#22d3ee',
            500: '#06b6d4',
            600: '#0891b2',
            700: '#0e7490',
            glow: 'rgba(34, 211, 238, 0.15)',
          },
          p0: '#ef4444',
          p1: '#f97316',
          p2: '#eab308',
          p3: '#22c55e',
        },
      },
      fontFamily: {
        ui: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'v-sm': '4px',
        'v-md': '6px',
        'v-lg': '8px',
        'v-xl': '12px',
        'v-2xl': '16px',
      },
      boxShadow: {
        'v-sm': '0 1px 2px rgba(0,0,0,0.4)',
        'v-md': '0 4px 12px rgba(0,0,0,0.5)',
        'v-lg': '0 8px 24px rgba(0,0,0,0.6)',
        'v-glow': '0 0 20px rgba(34, 211, 238, 0.2)',
      },
    },
  },
  plugins: [],
};
