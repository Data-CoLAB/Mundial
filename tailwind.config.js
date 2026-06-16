/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dourado do troféu — cor primária (pontos, CTAs). Tom rico p/ contraste em fundo claro
        gold: {
          DEFAULT: '#D98324',
          dark: '#B86A12',
          light: '#F0A93A',
        },
        // Vermelho de Portugal
        pt: {
          DEFAULT: '#D4163C',
          dark: '#B01230',
          light: '#F03355',
        },
        // Paleta vibrante oficial do Mundial 2026
        electric: { DEFAULT: '#7A2BF5', light: '#A77BFF', dark: '#5E18D0' }, // roxo — Oracle
        royal: { DEFAULT: '#2F6BFF', light: '#5B8DFF' },                     // azul
        pitch: { DEFAULT: '#18C76F', light: '#4FE39A' },                     // verde
        magenta: { DEFAULT: '#F2306E' },                                     // rosa
        aqua: { DEFAULT: '#22E0C4' },                                        // turquesa
        lime: { DEFAULT: '#A8E024' },                                        // lima
        // Superfícies — base clara (modo claro)
        surface: {
          DEFAULT: '#F4F6FB',
          card: '#FFFFFF',
          hover: '#EEF2FB',
          border: '#E2E7F2',
          deep: '#EEF1F8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        // Faixa multicolor — assinatura visual do Mundial 2026
        'wc-stripe': 'linear-gradient(90deg, #7A2BF5, #2F6BFF, #22E0C4, #18C76F, #A8E024, #FBB03B, #F2306E)',
        'wc-glow': 'radial-gradient(circle at 50% 0%, rgba(122,43,245,0.18), transparent 70%)',
      },
    },
  },
  plugins: [],
}
