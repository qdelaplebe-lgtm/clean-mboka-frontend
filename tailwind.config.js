/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Palette Marron Doré - Basée sur votre image
        'golden-brown': {
          50: '#fdf8f0',
          100: '#faebd7',
          200: '#f0d9b5',
          300: '#e6c7a8',
          400: '#d4b483',  // Tonalité moyenne
          500: '#c19a6b',  // VOTRE COULEUR PRINCIPALE - Marron-doré
          600: '#b08d5a',
          700: '#9c7c4b',
          800: '#8a6d3b',
          900: '#765c2e',
        },
        // Gris chauds pour harmonie avec le marron
        'warm-gray': {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        // Couleurs d'accent qui vont bien avec le marron
        'amber': {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        'emerald': {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        'rust': {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#450a0a',
        }
      },
      backgroundImage: {
        // Dégradés prédéfinis
        'golden-gradient': 'linear-gradient(135deg, #c19a6b 0%, #9c7c4b 50%, #8a6d3b 100%)',
        'golden-subtle': 'linear-gradient(to bottom right, #fdf8f0, #faebd7/30)',
        'golden-horizontal': 'linear-gradient(90deg, #c19a6b, #b08d5a, #9c7c4b)',
        'golden-vertical': 'linear-gradient(180deg, #fdf8f0, #faebd7)',
        
        // Dégradés pour les cartes
        'card-golden': 'linear-gradient(135deg, #ffffff 0%, #fdf8f0 100%)',
        'card-golden-hover': 'linear-gradient(135deg, #ffffff 0%, #faebd7 100%)',
      },
      boxShadow: {
        'golden': '0 10px 25px -5px rgba(193, 154, 107, 0.1), 0 10px 10px -5px rgba(193, 154, 107, 0.04)',
        'golden-lg': '0 20px 40px -10px rgba(193, 154, 107, 0.15), 0 10px 10px -5px rgba(193, 154, 107, 0.06)',
        'golden-xl': '0 25px 50px -12px rgba(193, 154, 107, 0.25)',
        'golden-inner': 'inset 0 2px 4px 0 rgba(193, 154, 107, 0.06)',
      },
      borderColor: {
        'golden-light': 'rgba(193, 154, 107, 0.2)',
        'golden-medium': 'rgba(193, 154, 107, 0.4)',
        'golden-dark': 'rgba(154, 124, 75, 0.6)',
      },
      animation: {
        'pulse-golden': 'pulse-golden 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-golden': 'slide-in-golden 0.3s ease-out',
        'fade-in-golden': 'fade-in-golden 0.5s ease-in',
      },
      keyframes: {
        'pulse-golden': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)',
          },
        },
        'slide-in-golden': {
          '0%': {
            transform: 'translateY(-10px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'fade-in-golden': {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        '4xl': '3rem',
      },
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke',
        'transform': 'transform',
        'shadow': 'box-shadow',
      },
    },
  },
  plugins: [],
}
