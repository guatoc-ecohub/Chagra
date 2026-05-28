import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * BeforeAfterPhoto — slider horizontal que reveal/oculta dos fotos para
 * comparar evolución de un cultivo (siembra → cosecha, antes-tratamiento →
 * después-tratamiento, etc).
 *
 * FEAT-C #294 (operator 2026-05-28 autopiloto): caso longitudinal — el
 * campesino documenta la evolución de su planta a lo largo de semanas.
 * Diferencial vs apps gringas que solo muestran fotos sueltas en grid.
 *
 * Diseño:
 *   - Imagen `before` (más vieja) ocupa todo el contenedor.
 *   - Imagen `after` (más nueva) está clip-path inset desde la derecha,
 *     controlado por `splitPct` (0..100). Default 50.
 *   - Handle vertical en `splitPct%` con icono ↔ centrado, drag horizontal.
 *   - Captions de timestamp legible en cada esquina ("Hace 3 sem" / "Hoy").
 *   - Touch (50px hitbox), keyboard (←→ con focus), mouse (drag).
 *
 * Props:
 *   - before: { url, taken_at?, caption? } — foto vieja
 *   - after:  { url, taken_at?, caption? } — foto nueva
 *   - className: extra clases para wrapper
 */

function formatRelativeTime(isoOrEpoch) {
    if (!isoOrEpoch) return null;
    const ts = typeof isoOrEpoch === 'string' ? new Date(isoOrEpoch).getTime() : Number(isoOrEpoch);
    if (!isFinite(ts)) return null;
    const diffMs = Date.now() - ts;
    if (diffMs < 0) return 'hoy';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days === 0) return 'hoy';
    if (days === 1) return 'ayer';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) {
        const w = Math.floor(days / 7);
        return `hace ${w} sem`;
    }
    if (days < 365) {
        const m = Math.floor(days / 30);
        return `hace ${m} ${m === 1 ? 'mes' : 'meses'}`;
    }
    const y = Math.floor(days / 365);
    return `hace ${y} ${y === 1 ? 'año' : 'años'}`;
}

export default function BeforeAfterPhoto({ before, after, className = '' }) {
    const [splitPct, setSplitPct] = useState(50);
    const containerRef = useRef(null);
    const draggingRef = useRef(false);

    const updateFromPointer = useCallback((clientX) => {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
        const pct = (x / rect.width) * 100;
        setSplitPct(pct);
    }, []);

    const onPointerDown = useCallback((e) => {
        draggingRef.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        updateFromPointer(e.clientX);
    }, [updateFromPointer]);

    const onPointerMove = useCallback((e) => {
        if (!draggingRef.current) return;
        updateFromPointer(e.clientX);
    }, [updateFromPointer]);

    const onPointerUp = useCallback((e) => {
        draggingRef.current = false;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
    }, []);

    const onKey = useCallback((e) => {
        if (e.key === 'ArrowLeft') {
            setSplitPct((p) => Math.max(0, p - 5));
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            setSplitPct((p) => Math.min(100, p + 5));
            e.preventDefault();
        }
    }, []);

    // Cleanup pointer state si unmount durante drag
    useEffect(() => {
        return () => { draggingRef.current = false; };
    }, []);

    if (!before?.url || !after?.url) return null;

    const beforeLabel = before.caption || formatRelativeTime(before.taken_at) || 'antes';
    const afterLabel = after.caption || formatRelativeTime(after.taken_at) || 'ahora';

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-900 select-none touch-none ${className}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
        >
            {/* Foto BEFORE — capa de fondo */}
            <img
                src={before.url}
                alt={`Antes — ${beforeLabel}`}
                draggable="false"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            />
            {/* Foto AFTER — clip-path inset desde la derecha */}
            <img
                src={after.url}
                alt={`Después — ${afterLabel}`}
                draggable="false"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
            />

            {/* Caption BEFORE — esquina inferior izquierda */}
            <div
                className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] font-medium text-amber-200 uppercase tracking-wide pointer-events-none transition-opacity"
                style={{ opacity: splitPct > 8 ? 1 : 0 }}
            >
                {beforeLabel}
            </div>
            {/* Caption AFTER — esquina inferior derecha */}
            <div
                className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] font-medium text-emerald-200 uppercase tracking-wide pointer-events-none transition-opacity"
                style={{ opacity: splitPct < 92 ? 1 : 0 }}
            >
                {afterLabel}
            </div>

            {/* Línea vertical en la posición del split */}
            <div
                className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{ left: `${splitPct}%` }}
            />

            {/* Handle visible — circular con icono ↔. 50px touch hitbox */}
            <button
                type="button"
                aria-label="Mover comparación antes/después"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(splitPct)}
                onKeyDown={onKey}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/95 shadow-xl flex items-center justify-center cursor-ew-resize text-slate-900 hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-transform"
                style={{ left: `${splitPct}%` }}
            >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 7 5 12 9 17" />
                    <polyline points="15 7 19 12 15 17" />
                </svg>
            </button>

            {/* Hint inferior — visible primer use */}
            <p className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur text-[10px] font-medium text-slate-300 pointer-events-none">
                Desliza para comparar
            </p>
        </div>
    );
}
