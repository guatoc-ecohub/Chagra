import { useEffect, useRef } from 'react';

/**
 * BiopunkBackground — capa de fondo viva para el DashboardLiveView.
 *
 * Capas (z-index ascendente):
 *   - Capa A: biopunk-pattern.svg tiled (ya existe) con animation
 *     `pulse-circuit` 8s ease-in-out — los circuitos PCB respiran.
 *   - Capa B: gradient-mesh conic rotating muy lento (40s/vuelta)
 *     con colores slate-950 → emerald-900 → cyan-900 → fuchsia-950.
 *   - Capa C: canvas con 60 partículas cyan/verde/violeta flotando
 *     en patrones browniano + curve-noise (vector field sinusoidal).
 *
 * Estados:
 *   - normal: capas A/B muy sutiles (opacity 0.18-0.35), C oculta.
 *   - intense (cuando user idle): A 0.5, B 0.9, C activa.
 *
 * Sin GPU dedicada en el cliente. ~60fps en mobile mid-range con 60
 * partículas. Si `prefers-reduced-motion`, todas las animaciones se
 * detienen automáticamente.
 *
 * Operator 2026-05-28: "el fondo fuera animado y tuviera una
 * transformación biopunk bien salvaje con transiciones y efectos
 * que se restauran al estado actual solo con que el usuario reactive
 * actividad en la app".
 */
export default function BiopunkBackground({ intense = false }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!intense) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const reduceMotion = typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) return;
        // Gating por tema (spec 2026-06-05): las partículas son un FX bio-punk.
        // En nature/minimalista el token --fx-particles vale 0 → NO montamos el
        // canvas (cero confeti sobre crema) y ahorramos rAF. Las capas estáticas
        // (glow/patrón/viñeta) las apaga el wrapper .bp-fx-layer vía CSS token.
        if (typeof window !== 'undefined' &&
            getComputedStyle(document.documentElement)
                .getPropertyValue('--fx-particles').trim() === '0') {
            return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let raf = 0;
        let running = true;

        // Resize handler
        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.scale(dpr, dpr);
        };
        resize();
        window.addEventListener('resize', resize);

        // Partículas — campo de polen iridiscente
        const PARTICLE_COUNT = window.innerWidth < 640 ? 32 : 60;
        const colors = ['#10b981', '#06b6d4', '#a78bfa', '#84cc16', '#22d3ee'];
        const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: Math.random() * canvas.clientWidth,
            y: Math.random() * canvas.clientHeight,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            r: 1.2 + Math.random() * 2.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.8,
        }));

        let lastT = performance.now();

        const tick = (now) => {
            if (!running) return;
            const dt = Math.min(50, now - lastT) / 16; // norm a 60fps
            lastT = now;
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            ctx.clearRect(0, 0, w, h);

            const t = now / 1000;

            particles.forEach((p) => {
                // Curve-noise — campo vectorial sinusoidal
                const fx = Math.sin(p.y * 0.008 + t * 0.5 + p.phase) * 0.4;
                const fy = Math.cos(p.x * 0.008 + t * 0.4 + p.phase) * 0.4;
                p.vx += fx * 0.02 * dt;
                p.vy += fy * 0.02 * dt;
                // Damping para que no se desboquen
                p.vx *= 0.985;
                p.vy *= 0.985;
                p.x += p.vx * p.speed * dt;
                p.y += p.vy * p.speed * dt;

                // Wrap edges
                if (p.x < -10) p.x = w + 10;
                if (p.x > w + 10) p.x = -10;
                if (p.y < -10) p.y = h + 10;
                if (p.y > h + 10) p.y = -10;

                // Render con halo
                const pulseR = p.r * (1 + Math.sin(t * p.speed + p.phase) * 0.3);
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, pulseR * 4);
                grad.addColorStop(0, p.color);
                grad.addColorStop(0.4, p.color + '88');
                grad.addColorStop(1, p.color + '00');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseR * 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, pulseR, 0, Math.PI * 2);
                ctx.fill();
            });

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            running = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', resize);
        };
    }, [intense]);

    return (
        <div
            className="absolute inset-0 pointer-events-none overflow-hidden bp-fx-layer"
            aria-hidden="true"
            data-biopunk-intense={intense ? 'on' : 'off'}
            // Gating de FX por tema (spec 2026-06-05): el lienzo neón
            // (patrón + glow conic + viñeta navy + partículas) se multiplica por
            // --fx-glow-opacity. En bio-punk = 1 (presencia plena); en nature/
            // minimalista = 0 → el lienzo desaparece por completo, sin sangrar
            // efectos oscuros sobre los temas claros. CSS puro, cero JS frágil.
            style={{ opacity: 'var(--fx-glow-opacity, 1)' }}
        >
            {/* Capa A — biopunk-pattern SVG tiled.
                BUGFIX 2026-05-28 operador: en modo screen saver (idle) este
                SVG vintage aparecía SOBRE la imagen nueva de Lili seleccionada
                desde Perfil. El operador veía dos fondos compitiendo. Quitamos
                el SVG cuando intense → solo se ve la imagen del catálogo +
                el conic gradient + partículas. En estado normal sutil (0.08)
                porque el fondo de Lili es el héroe visual. */}
            <div
                className="absolute inset-0 bg-biopunk-pattern transition-opacity duration-[1500ms] ease-out"
                style={{
                    opacity: intense ? 0 : 0.08,
                    animation: 'none',
                }}
            />
            {/* Capa B — gradient mesh conic rotating */}
            <div
                className="absolute inset-0 transition-opacity duration-[1500ms] ease-out"
                style={{
                    background: `conic-gradient(from 0deg at 50% 50%,
                        rgba(15, 23, 42, 0) 0%,
                        rgba(16, 185, 129, 0.18) 18%,
                        rgba(6, 182, 212, 0.22) 35%,
                        rgba(168, 85, 247, 0.16) 55%,
                        rgba(132, 204, 22, 0.18) 75%,
                        rgba(15, 23, 42, 0) 100%)`,
                    opacity: intense ? 0.9 : 0,
                    animation: intense ? 'biopunk-conic-rotate 40s linear infinite' : 'none',
                    filter: 'blur(20px)',
                }}
            />
            {/* Capa C — canvas partículas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full transition-opacity duration-[1200ms] ease-out"
                style={{ opacity: intense ? 0.85 : 0 }}
            />
            {/* Capa D — vignette para mantener cohesión */}
            <div
                className="absolute inset-0 transition-opacity duration-[1500ms] ease-out"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2,6,23,0.75) 95%)',
                    opacity: intense ? 0.6 : 0.3,
                }}
            />
            <style>{`
                @keyframes biopunk-pulse {
                    0%, 100% { filter: hue-rotate(0deg) saturate(1) brightness(1); }
                    50%      { filter: hue-rotate(20deg) saturate(1.4) brightness(1.15); }
                }
                @keyframes biopunk-conic-rotate {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    [data-biopunk-intense] * {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
