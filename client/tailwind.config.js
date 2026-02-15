/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#f9f7f2',
        surface: '#ffffff',
        charcoal: '#2d2926',
        taupe: '#6b5e51',
        clay: '#a69076',
        divider: '#e8e4db',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
