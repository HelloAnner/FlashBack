/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1337ec",
        "primary-hover": "#0f2cc2",
        "background-light": "#f8fafc",
        "background-dark": "#101322",
        surface: "#ffffff",
        border: "#e2e8f0",
        "text-main": "#0f172a",
        "text-muted": "#64748b",
        "text-subtle": "#94a3b8",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-hover': '0 8px 32px 0 rgba(31, 38, 135, 0.12)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'spin 4s linear infinite',
      },
    },
  },
  plugins: [],
}
