import { useEffect, useState, lazy, Suspense } from 'react';
import { Mic, Sparkles, ArrowRight } from 'lucide-react';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import useAgentAvatarType from '../../hooks/useAgentAvatarType';

// Lazy-load del modelo 3D: ~600KB extra (three + R3F + drei). Solo se
// descarga si el usuario está en home y NO seleccionó avatar maíz. El
// Service Worker lo cachea desde la primera carga. Mientras llega, el
// Suspense fallback muestra el SVG actual sin que se note.
const ChagraAgentAvatarColibri3D = lazy(() => import('../ChagraAgentAvatarColibri3D'));

/**
 * AgentHero — protagonista del dashboard. El agente Chagra como ser vivo,
 * grande, respirando. Click → AgentScreen fullscreen.
 *
 * Diseño 2026-05-28 cervezas-test:
 *  - Avatar 96-128px con halo cónico que rota lento (sensación de aura viva).
 *  - Headline: "Pregúntale a Chagra" — directo, sin jerga, niño-11-friendly.
 *  - Sub: rotación suave de tips ("Cuento de tu chagra", "Te ayudo con plagas").
 *  - Input glassmorphism con mic integrado.
 *  - 3 chips de sugerencia con iconos agro.
 *  - Toda la zona es clickable y navega a 'agente'.
 */

const TIPS = [
    'Te ayudo con tu siembra, plagas y clima.',
    'Cuéntame qué estás cultivando hoy.',
    'Tomo foto, escucho, recuerdo lo que me dices.',
    'Sé del campo colombiano y respeto tu tierra.',
    'Pregúntame en voz, te entiendo con tu acento.',
];

const QUICK_CHIPS = [
    { icon: '🌱', label: '¿Qué siembro?', prompt: '¿Qué puedo sembrar este mes en mi zona?' },
    { icon: '🐛', label: 'Plagas', prompt: '¿Cómo controlo plagas sin químicos?' },
    { icon: '🌧️', label: 'Clima', prompt: 'Dame el reporte del clima de mi zona.' },
];

export default function AgentHero({ onNavigate }) {
    const [tipIndex, setTipIndex] = useState(0);
    const [pressed, setPressed] = useState(false);
    const [avatarType] = useAgentAvatarType();
    const use3D = avatarType !== 'maiz';

    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex((i) => (i + 1) % TIPS.length);
        }, 4500);
        return () => clearInterval(interval);
    }, []);

    const goAgent = (prefill) => {
        if (prefill) {
            try { sessionStorage.setItem('chagra:agent:prefill', prefill); } catch { /* ignore */ }
        }
        onNavigate?.('agente');
    };

    return (
        <section
            aria-label="Agente Chagra"
            className="relative w-full px-4 pt-6 pb-4 select-none"
        >
            <style>{`
                @keyframes chagra-halo-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes chagra-avatar-breathe {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.025); }
                }
                .chagra-hero-halo {
                    position: absolute;
                    inset: -8px;
                    border-radius: 9999px;
                    background: conic-gradient(
                        from 0deg,
                        rgba(132, 204, 22, 0.45),
                        rgba(16, 185, 129, 0.35),
                        rgba(6, 182, 212, 0.4),
                        rgba(132, 204, 22, 0.45)
                    );
                    filter: blur(18px);
                    animation: chagra-halo-rotate 22s linear infinite;
                    pointer-events: none;
                    opacity: 0.85;
                }
                .chagra-hero-halo-inner {
                    position: absolute;
                    inset: 6px;
                    border-radius: 9999px;
                    background: radial-gradient(circle, rgba(2, 6, 23, 0) 50%, rgba(2, 6, 23, 0.9) 100%);
                    pointer-events: none;
                }
                .chagra-hero-avatar-wrap {
                    animation: chagra-avatar-breathe 4s ease-in-out infinite;
                }
                .chagra-hero-press {
                    transition: transform 200ms ease;
                }
                .chagra-hero-press:active {
                    transform: scale(0.98);
                }
            `}</style>

            <button
                type="button"
                onClick={() => goAgent()}
                onMouseDown={() => setPressed(true)}
                onMouseUp={() => setPressed(false)}
                onMouseLeave={() => setPressed(false)}
                onTouchStart={() => setPressed(true)}
                onTouchEnd={() => setPressed(false)}
                className="relative w-full flex flex-col items-center text-center chagra-hero-press focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-3xl"
                aria-label="Abrir agente Chagra"
            >
                <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center mb-3">
                    <div className="chagra-hero-halo" aria-hidden="true" />
                    <div className="chagra-hero-halo-inner" aria-hidden="true" />
                    <div className="chagra-hero-avatar-wrap relative">
                        {use3D ? (
                            <Suspense
                                fallback={
                                    <ChagraAgentAvatar
                                        state={pressed ? 'thinking' : 'idle'}
                                        size={120}
                                    />
                                }
                            >
                                <ChagraAgentAvatarColibri3D
                                    state={pressed ? 'thinking' : 'idle'}
                                    size={140}
                                />
                            </Suspense>
                        ) : (
                            <ChagraAgentAvatar
                                state={pressed ? 'thinking' : 'idle'}
                                size={120}
                            />
                        )}
                    </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none mb-1.5">
                    Pregúntale a <span className="bg-gradient-to-r from-emerald-300 to-lime-300 bg-clip-text text-transparent">Chagra</span>
                </h2>
                <p
                    key={tipIndex}
                    className="text-sm sm:text-base text-slate-400 font-medium px-2 leading-snug max-w-md transition-opacity duration-700"
                    style={{ animation: 'fade-in 0.7s ease' }}
                >
                    {TIPS[tipIndex]}
                </p>
            </button>

            {/* Input grande de entrada al agente */}
            <div className="mt-5 w-full max-w-xl mx-auto">
                <div
                    onClick={() => goAgent()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') goAgent(); }}
                    aria-label="Escribir o hablar al agente"
                    className="relative flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 hover:border-emerald-500/50 hover:bg-white/[0.08] active:bg-white/[0.04] transition-all cursor-pointer min-h-[56px]"
                >
                    <Sparkles size={18} className="text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-base text-slate-300 font-medium select-none">
                        Escribe o toca para hablar…
                    </span>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); goAgent('VOICE'); }}
                        aria-label="Hablar con el agente por voz"
                        className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 active:scale-95 flex items-center justify-center text-slate-900 shadow-lg shadow-emerald-500/30 transition-all"
                    >
                        <Mic size={18} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                    <ArrowRight size={16} className="text-slate-500 shrink-0" aria-hidden="true" />
                </div>

                {/* Chips de sugerencia rápida */}
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {QUICK_CHIPS.map((chip) => (
                        <button
                            key={chip.label}
                            type="button"
                            onClick={() => goAgent(chip.prompt)}
                            className="shrink-0 px-3.5 py-2 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 text-sm text-slate-200 font-medium transition-all flex items-center gap-2 backdrop-blur-md"
                        >
                            <span aria-hidden="true" className="text-base leading-none">{chip.icon}</span>
                            {chip.label}
                        </button>
                    ))}
                </div>
            </div>
        </section>
    );
}
