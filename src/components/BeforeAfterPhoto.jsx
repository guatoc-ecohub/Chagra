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
 *   - Captions en cada esquina: etiqueta Antes/Ahora + fecha relativa
 *     ("hace 3 sem") + fecha absoluta es-CO ("12 mar"). Chip superior con los
 *     días transcurridos entre ambas fotos.
 *   - Touch (48px hitbox ≥ --tap-min), keyboard (←→/Home/End con focus),
 *     mouse (drag). Handle con role="slider". Movimiento gateado por
 *     prefers-reduced-motion (motion-safe) y tokens de tokens.css.
 *
 * Props:
 *   - before: { url, taken_at?, caption? } — foto vieja
 *   - after:  { url, taken_at?, caption? } — foto nueva
 *   - className: extra clases para wrapper
 */

function toMs(isoOrEpoch) {
    if (!isoOrEpoch) return null;
    const ts = typeof isoOrEpoch === 'string' ? new Date(isoOrEpoch).getTime() : Number(isoOrEpoch);
    return isFinite(ts) ? ts : null;
}

// Fecha absoluta corta es-CO ("12 mar" / "12 mar 2024" si es otro año) — el
// productor necesita la fecha real de cada foto, no solo "hace 3 sem".
function formatAbsoluteDate(isoOrEpoch) {
    const ts = toMs(isoOrEpoch);
    if (ts == null) return null;
    const d = new Date(ts);
    const opts = { day: '2-digit', month: 'short' };
    if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
    return d.toLocaleDateString('es-CO', opts);
}

// Días transcurridos entre las dos fotos — enmarca el progreso ("34 días de
// diferencia") sin que el productor tenga que restar fechas mentalmente.
function daysBetween(a, b) {
    const tsA = toMs(a);
    const tsB = toMs(b);
    if (tsA == null || tsB == null) return null;
    const days = Math.round(Math.abs(tsB - tsA) / (24 * 60 * 60 * 1000));
    return days >= 1 ? days : null;
}

function formatRelativeTime(isoOrEpoch) {
    const ts = toMs(isoOrEpoch);
    if (ts == null) return null;
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
    // Tras la primera interacción (drag/teclado) el hint "Deslice para
    // comparar" se desvanece — ya cumplió su función de enseñar el gesto.
    const [hasInteracted, setHasInteracted] = useState(false);
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
        setHasInteracted(true);
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
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            setHasInteracted(true);
        }
        if (e.key === 'ArrowLeft') {
            setSplitPct((p) => Math.max(0, p - 5));
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            setSplitPct((p) => Math.min(100, p + 5));
            e.preventDefault();
        } else if (e.key === 'Home') {
            setSplitPct(0);
            e.preventDefault();
        } else if (e.key === 'End') {
            setSplitPct(100);
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
    const beforeDate = formatAbsoluteDate(before.taken_at);
    const afterDate = formatAbsoluteDate(after.taken_at);
    const elapsedDays = daysBetween(before.taken_at, after.taken_at);

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-[4/3] overflow-hidden rounded-[var(--r-lg,20px)] border border-slate-700/60 bg-slate-900 shadow-[var(--sombra-1,0_1px_2px_rgb(8_30_22/0.18))] select-none touch-none ${className}`}
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

            {/* Caption BEFORE — esquina inferior izquierda: etiqueta + fecha
                relativa + fecha absoluta (el productor necesita saber CUÁNDO
                fue cada foto, no solo "hace 3 sem"). */}
            <div
                className="absolute bottom-2 left-2 px-2 py-1 rounded-[var(--r-xs,8px)] bg-black/60 backdrop-blur pointer-events-none motion-safe:transition-opacity motion-safe:duration-[var(--dur-estado,0.18s)]"
                style={{ opacity: splitPct > 8 ? 1 : 0 }}
            >
                <span className="block text-[9px] font-black text-amber-300 uppercase tracking-widest leading-tight">
                    Antes
                </span>
                <span className="block text-[10px] font-medium text-slate-100 leading-tight">
                    {beforeLabel}{beforeDate && beforeLabel !== beforeDate ? ` · ${beforeDate}` : ''}
                </span>
            </div>
            {/* Caption AFTER — esquina inferior derecha */}
            <div
                className="absolute bottom-2 right-2 px-2 py-1 rounded-[var(--r-xs,8px)] bg-black/60 backdrop-blur text-right pointer-events-none motion-safe:transition-opacity motion-safe:duration-[var(--dur-estado,0.18s)]"
                style={{ opacity: splitPct < 92 ? 1 : 0 }}
            >
                <span className="block text-[9px] font-black text-emerald-300 uppercase tracking-widest leading-tight">
                    Ahora
                </span>
                <span className="block text-[10px] font-medium text-slate-100 leading-tight">
                    {afterLabel}{afterDate && afterLabel !== afterDate ? ` · ${afterDate}` : ''}
                </span>
            </div>

            {/* Chip de días transcurridos — enmarca el progreso entre las dos
                fotos sin obligar a restar fechas. */}
            {elapsedDays != null && (
                <span className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-[var(--r-pill,999px)] bg-emerald-900/70 border border-emerald-600/50 backdrop-blur text-[10px] font-bold text-emerald-200 tabular-nums pointer-events-none whitespace-nowrap">
                    {elapsedDays === 1 ? '1 día después' : `${elapsedDays} días después`}
                </span>
            )}

            {/* Línea vertical en la posición del split */}
            <div
                className="absolute top-0 bottom-0 w-px bg-white/80 pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                style={{ left: `${splitPct}%` }}
            />

            {/* Handle visible — circular con icono ↔. 48px touch hitbox (≥ --tap-min) */}
            <button
                type="button"
                role="slider"
                aria-label="Mover comparación antes/después"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(splitPct)}
                aria-valuetext={`${Math.round(splitPct)} % de la foto de antes visible`}
                onKeyDown={onKey}
                className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 min-w-[var(--tap-min,44px)] min-h-[var(--tap-min,44px)] rounded-full bg-white/95 shadow-[var(--sombra-2,0_6px_18px_rgb(8_30_22/0.22))] flex items-center justify-center cursor-ew-resize text-slate-900 motion-safe:hover:scale-110 motion-safe:focus:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 motion-safe:transition-transform motion-safe:duration-[var(--dur-tap,0.12s)]"
                style={{ left: `${splitPct}%` }}
            >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 7 5 12 9 17" />
                    <polyline points="15 7 19 12 15 17" />
                </svg>
            </button>

            {/* Hint — tono usted; se desvanece tras la primera interacción
                para no tapar la foto una vez el productor ya entendió el gesto. */}
            <p
                className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-[var(--r-xs,8px)] bg-black/55 backdrop-blur text-[10px] font-medium text-slate-200 pointer-events-none whitespace-nowrap motion-safe:transition-opacity motion-safe:duration-[var(--dur-estado,0.18s)]"
                style={{ opacity: hasInteracted ? 0 : 1 }}
                aria-hidden={hasInteracted}
            >
                Deslice para comparar
            </p>
        </div>
    );
}
