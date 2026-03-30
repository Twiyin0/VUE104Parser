/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      fontFamily: { mono: ["'JetBrains Mono'", "'Fira Code'", 'monospace'] }
    }
  },
  plugins: []
}
