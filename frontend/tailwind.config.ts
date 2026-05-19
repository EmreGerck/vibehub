import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#c084fc',   // purple-400-ish
          500: '#a855f7',   // purple-500
          600: '#9333ea',   // purple-600 — primary CTA
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
          950: '#3b0764',
        },
        surface: {
          DEFAULT: '#070A12',
          card:    '#111827',  // gray-900
          border:  '#1f2937',  // gray-800 border
          muted:   '#374151',  // gray-700
          // numbered scale for dashboards
          900: '#070A12',
          800: '#0B1022',
          750: '#111827',
          700: '#1f2937',
          600: '#374151',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      transitionTimingFunction: {
        'out-expo':  'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        accordionDown: {
          from: { height: '0', opacity: '0' },
          to:   { height: 'var(--radix-accordion-content-height, auto)', opacity: '1' },
        },
        accordionUp: {
          from: { height: 'var(--radix-accordion-content-height, auto)', opacity: '1' },
          to:   { height: '0', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordionDown .3s cubic-bezier(0.16,1,0.3,1)',
        'accordion-up':   'accordionUp .3s cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};

export default config;
