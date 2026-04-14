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
                    DEFAULT: '#020617',
                    card: '#0f172a',
                    raised: '#1e293b',
                    border: '#334155',
                },
                // Bio-Punk palette — Cyberpunk + Biodiversidad colombiana
                muzo: {
                    DEFAULT: '#10b981',  // Esmeralda de Muzo
                    glow: '#34d399',
                },
                morpho: {
                    DEFAULT: '#06b6d4',  // Mariposa Morpho
                    glow: '#22d3ee',
                },
                orchid: {
                    DEFAULT: '#d946ef',  // Orquídea Cattleya
                    glow: '#e879f9',
                },
                frog: {
                    DEFAULT: '#eab308',  // Rana Dorada
                    glow: '#facc15',
                },
            },
            boxShadow: {
                'neon-muzo': '0 0 15px rgba(16, 185, 129, 0.4)',
                'neon-morpho': '0 0 15px rgba(6, 182, 212, 0.4)',
                'neon-orchid': '0 0 15px rgba(217, 70, 239, 0.4)',
                'neon-frog': '0 0 15px rgba(234, 179, 8, 0.3)',
            },
        },
    },
    plugins: [],
}
