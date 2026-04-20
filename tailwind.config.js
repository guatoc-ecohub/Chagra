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
            // Animaciones cyberpunk para bloques de generacion por IA (v0.6.2).
            keyframes: {
                scanline: {
                    '0%':   { transform: 'translateY(-100%)', opacity: '0' },
                    '10%':  { opacity: '0.55' },
                    '90%':  { opacity: '0.55' },
                    '100%': { transform: 'translateY(3000%)', opacity: '0' },
                },
                glitchIn: {
                    '0%':   { opacity: '0', transform: 'translateY(8px) scale(0.985)', filter: 'blur(4px) saturate(180%)' },
                    '40%':  { opacity: '0.7', transform: 'translateY(-2px)', filter: 'blur(1px) saturate(150%)' },
                    '70%':  { opacity: '0.95', transform: 'translateY(1px)', filter: 'blur(0.5px) saturate(120%)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)', filter: 'blur(0) saturate(100%)' },
                },
                neonPulse: {
                    '0%,100%': { boxShadow: '0 0 8px rgba(217,70,239,0.35), inset 0 0 8px rgba(217,70,239,0.08)' },
                    '50%':     { boxShadow: '0 0 20px rgba(217,70,239,0.75), inset 0 0 14px rgba(217,70,239,0.22)' },
                },
                sparkFlash: {
                    '0%':   { opacity: '0', transform: 'translateX(-20%) scaleX(0.2)', filter: 'blur(10px)' },
                    '25%':  { opacity: '1' },
                    '100%': { opacity: '0', transform: 'translateX(120%) scaleX(1.2)', filter: 'blur(4px)' },
                },
                sparkBurst: {
                    '0%':   { opacity: '0', transform: 'scale(0.6)' },
                    '40%':  { opacity: '1', transform: 'scale(1.15)' },
                    '100%': { opacity: '0', transform: 'scale(1.6)' },
                },
            },
            animation: {
                'scanline':    'scanline 2.4s linear infinite',
                'glitch-in':   'glitchIn 480ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'neon-pulse':  'neonPulse 2.2s ease-in-out infinite',
                'spark-flash': 'sparkFlash 750ms ease-out forwards',
                'spark-burst': 'sparkBurst 650ms ease-out forwards',
            },
        },
    },
    plugins: [],
}
