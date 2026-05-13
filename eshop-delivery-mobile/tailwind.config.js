/** @type {import('tailwindcss').Config} */
module.exports = {
    presets: [require('nativewind/preset')],
    content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                ink: '#050505',
                mist: '#e8ece9',
                mint: '#2af0b5',
                mintSoft: '#95ffd9',
                graphite: '#232826',
                fog: '#b7c1bb',
                ember: '#ff8c7c',
            },
            fontFamily: {
                'nunito-regular': ['Nunito_400Regular'],
                'nunito-semi': ['Nunito_600SemiBold'],
                'nunito-bold': ['Nunito_700Bold'],
            },
        },
    },
    plugins: [],
}
