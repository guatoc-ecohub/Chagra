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
            // Animaciones cyberpunk + CRT para bloques de generacion por IA (v0.6.2+).
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
                // Cierre del stream: rayo horizontal lento + burst expansivo.
                // Duraciones extendidas (~1.4s / 1.2s) para un efecto mas
                // satisfactorio que marque claramente el fin de la generacion.
                sparkFlash: {
                    '0%':   { opacity: '0', transform: 'translateX(-20%) scaleX(0.2)', filter: 'blur(12px)' },
                    '15%':  { opacity: '1' },
                    '70%':  { opacity: '0.7' },
                    '100%': { opacity: '0', transform: 'translateX(120%) scaleX(1.4)', filter: 'blur(6px)' },
                },
                sparkBurst: {
                    '0%':   { opacity: '0', transform: 'scale(0.5)' },
                    '20%':  { opacity: '1', transform: 'scale(1.1)' },
                    '60%':  { opacity: '0.8', transform: 'scale(1.4)' },
                    '100%': { opacity: '0', transform: 'scale(2.2)' },
                },
                // Block cursor estilo terminal IBM 3270 / VT100 (parpadeo duro).
                crtBlink: {
                    '0%, 49%':   { opacity: '1' },
                    '50%, 100%': { opacity: '0' },
                },
                // Flicker sutil del texto fosforo — tubo CRT antiguo.
                crtFlicker: {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.97' },
                    '80%':      { opacity: '0.99' },
                },
                // Flash de negativo fotografico (invert + hue-rotate). Usado
                // como transicion inicial del cierre del stream, ~1s.
                negativeFlash: {
                    '0%':   { filter: 'invert(0) hue-rotate(0deg) saturate(100%)' },
                    '20%':  { filter: 'invert(1) hue-rotate(180deg) saturate(150%)' },
                    '60%':  { filter: 'invert(1) hue-rotate(200deg) saturate(130%)' },
                    '85%':  { filter: 'invert(0.3) hue-rotate(70deg) saturate(110%)' },
                    '100%': { filter: 'invert(0) hue-rotate(0deg) saturate(100%)' },
                },
                // Latido de "IA viva" — loop de 30s con flash amplio de
                // negativo en los ultimos 9% del ciclo (~2.7s). Periodo
                // largo para no molestar, ventana amplia para que sea
                // claramente perceptible cada vez.
                negativeBreath: {
                    '0%, 91%, 100%': { filter: 'invert(0) hue-rotate(0deg) saturate(100%)' },
                    '93%':           { filter: 'invert(0.6) hue-rotate(120deg) saturate(130%)' },
                    '95.5%':         { filter: 'invert(1) hue-rotate(180deg) saturate(170%)' },
                    '98%':           { filter: 'invert(0.6) hue-rotate(120deg) saturate(130%)' },
                    '99.5%':         { filter: 'invert(0.2) hue-rotate(45deg)' },
                },
                // Destello luminoso que recorre el perimetro del panel,
                // sincronizado con negativeBreath. pathLength=1 normaliza
                // el dash-offset a 0..-1 → el destello recorre el
                // perimetro exactamente una vez por ciclo.
                borderMarch: {
                    '0%':   { strokeDashoffset: '0' },
                    '100%': { strokeDashoffset: '-1' },
                },
            },
            animation: {
                'scanline':    'scanline 2.4s linear infinite',
                'glitch-in':   'glitchIn 480ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                'neon-pulse':  'neonPulse 2.2s ease-in-out infinite',
                'spark-flash': 'sparkFlash 1400ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'spark-burst': 'sparkBurst 1200ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                'crt-blink':   'crtBlink 1.1s steps(1) infinite',
                'crt-flicker': 'crtFlicker 4s ease-in-out infinite',
                // "IA viva" — latido de 30s mientras el panel este visible.
                'negative-breath': 'negativeBreath 30s ease-in-out infinite',
                // Transicion de cierre: flash previo al rayo (1s).
                'negative-flash':  'negativeFlash 1000ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                // Destello que recorre el borde del panel, sincronizado con
                // negative-breath: 30s linear infinite.
                'border-march':    'borderMarch 30s linear infinite',
            },
        },
    },
    plugins: [],
}
