/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        energy: {
          50: '#edfcf2',
          100: '#d3f9e0',
          200: '#aaf0c6',
          300: '#73e3a5',
          400: '#3acd7e',
          500: '#16b364',
          600: '#0a9150',
          700: '#087342',
          800: '#095b37',
          900: '#084b2f',
          950: '#032a1a',
        },
        electric: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      backgroundImage: {
        'gradient-energy': 'linear-gradient(135deg, #0a9150 0%, #1d4ed8 100%)',
        'gradient-dark': 'linear-gradient(135deg, #064e3b 0%, #1e3a8a 100%)',
        'gradient-card': 'linear-gradient(135deg, #ecfdf5 0%, #eff6ff 100%)',
        'gradient-card-dark': 'linear-gradient(135deg, #064e3b 0%, #172554 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(22, 179, 100, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 179, 100, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
