/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        xs:   ['0.82rem',  { lineHeight: '1.25rem' }],
        sm:   ['0.925rem', { lineHeight: '1.4rem' }],
        base: ['1.05rem',  { lineHeight: '1.65rem' }],
        lg:   ['1.15rem',  { lineHeight: '1.75rem' }],
        xl:   ['1.3rem',   { lineHeight: '1.85rem' }],
        '2xl':['1.55rem',  { lineHeight: '2rem' }],
        '3xl':['1.9rem',   { lineHeight: '2.25rem' }],
        '4xl':['2.3rem',   { lineHeight: '2.6rem' }],
        '5xl':['3rem',     { lineHeight: '1.1' }],
      },
    },
  },
  plugins: [],
}
