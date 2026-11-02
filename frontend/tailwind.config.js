/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Avocado Health Inspired Design Tokens
        forest: {
          DEFAULT: '#14532D',
          deep: '#0B3D20',
          hover: '#0f4023',
          light: '#166534',
          50: '#F7F8EF',
          100: '#EAF9D8',
          200: '#C7FF75',
        },
        lime: {
          DEFAULT: '#C7FF75',
          fresh: '#C7FF75',
          pale: '#EAF9D8',
          dark: '#9cdd3a',
          hover: '#b8fa58',
        },
        cream: {
          DEFAULT: '#F7F8EF',
          light: '#FAFBF5',
          warm: '#F4F5E6',
        },
        ink: {
          DEFAULT: '#26352A',
          primary: '#26352A',
          secondary: '#667367',
          muted: '#8A998B',
        },
        line: {
          DEFAULT: '#E3E8DE',
          subtle: '#EDF1E8',
        },
        neutral: {
          surface: '#F5F6F2',
          card: '#FFFFFF',
        },
        brand: {
          50: '#F7F8EF',
          100: '#EAF9D8',
          200: '#C7FF75',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#14532D',
          900: '#0B3D20',
          950: '#062613',
        },
        hc: {
          forest: '#14532D',
          deep: '#0B3D20',
          lime: '#C7FF75',
          pale: '#EAF9D8',
          cream: '#F7F8EF',
          neutral: '#F5F6F2',
          ink: '#26352A',
          secondary: '#667367',
          border: '#E3E8DE',
          error: '#B42318',
          warning: '#9A6700',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        'subtle': '0 2px 10px -2px rgba(38, 53, 42, 0.06)',
        'card': '0 4px 20px -4px rgba(38, 53, 42, 0.08)',
        'elevated': '0 12px 36px -8px rgba(20, 83, 45, 0.12)',
        'forest': '0 10px 30px -6px rgba(11, 61, 32, 0.35)',
        'lime': '0 8px 24px -4px rgba(199, 255, 117, 0.45)',
      }
    },
  },
  plugins: [],
}
