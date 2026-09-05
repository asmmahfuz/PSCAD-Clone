/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        cad: {
          dark: '#0c0f17',
          panel: '#161b26',
          header: '#1c2333',
          border: '#263147',
          accent: '#1f6feb',
          highlight: '#58a6ff',
          success: '#238636',
          warning: '#d29922',
          danger: '#da3633',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace', 'Consolas'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
