export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontSize: {
                '2xs': ['0.6875rem', { lineHeight: '1rem' }],
            },
            colors: {
                surface: {
                    DEFAULT: '#020617',  // slate-950
                    card: '#0f172a',     // slate-900
                    raised: '#1e293b',   // slate-800
                    border: '#334155',   // slate-700
                },
            },
        },
    },
    plugins: [],
}
