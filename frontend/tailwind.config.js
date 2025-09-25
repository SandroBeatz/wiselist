/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        'primary': '#1C1C1C',
        'primary-shade': '#101010',
        'primary-tint': '#6E6E6E',

        'text': '#1C1C1C',
        'text-mute': '#6E6E6E',
        'text-quite': '#c3c3c3',
      },
      backgroundImage: {
        'brand': 'bg-gradient-to-tl from-primary to-primary-tint',
      }
    },

    fontFamily: {
      nunito: ['Nunito', 'sans-serif'],
    },
  },
  plugins: [],
}

