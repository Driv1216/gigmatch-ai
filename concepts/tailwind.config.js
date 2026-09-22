/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          900: '#0f172a',
        },
        workbench: {
          bg: '#0b0f17',
          surface: '#111827',
          border: '#1f293d',
          accent: '#38bdf8',
          subtle: '#94a3b8',
        },
        editorial: {
          bg: '#faf9f6',
          surface: '#ffffff',
          ink: '#1c1917',
          accent: '#c96f38',
          muted: '#78716c',
        },
        matrix: {
          bg: '#080d1a',
          surface: '#0f172a',
          cyan: '#06b6d4',
          emerald: '#10b981',
          rose: '#f43f5e',
        },
        canvas: {
          bg: '#f8fafc',
          card: '#ffffff',
          sidebar: '#f1f5f9',
          primary: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
