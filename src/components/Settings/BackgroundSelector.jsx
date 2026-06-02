import { useState, useEffect, useCallback } from 'react';
import { Check, X, Zap } from 'lucide-react';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
  getBackgroundSrc,
} from '../../store/useThemeBackgroundStore';

/**
 * BackgroundSelector — selector visual del fondo de biodiversidad.
 *
 * El operador elige entre los fondos curados por la diseñadora (Lili)
 * desde su Perfil. Opciones en grid 2x2 (5 cards).
 *
 * Persiste vía useThemeBackgroundStore (localStorage `chagra:background:v1`).
 * El cambio aplica de inmediato (App.jsx escribe --app-bg-image en el body)
 * y se preserva el overlay/blur biopunk para legibilidad.
 *
 * UX 2026-06-02: al hacer click/tap en una miniatura se abre una VISTA
 * AMPLIADA (overlay modal) con la imagen completa (object-fit:contain) +
 * borde eléctrico neón que recorre el perímetro — estilo biopunk fina
 * coquetería, referencia visual _icon-lab.html.
 *
 * Borde eléctrico:
 *   1. Pseudo-elemento span con conic-gradient giratorio (spin) +
 *      mask-image inset para que solo se vea el borde → halo rotatorio.
 *   2. SVG <rect> superpuesto con stroke-dashoffset animado (trace) →
 *      corriente eléctrica que recorre el marco. Paleta: --neon #39ffd0 +
 *      --neon2 #7cf6ff, filter glow feGaussianBlur.
 *   Ambas capas puras CSS/SVG, sin JS por frame.
 *   prefers-reduced-motion: borde estático (animation-play-state:paused),
 *   patrón idéntico al resto del proyecto.
 *
 * CRÍTICO anti React #185: consumir solo `selected` (string) del store;
 * nunca retornar objetos inline desde selectores de useThemeBackgroundStore.
 */

// ─── CSS global para animaciones eléctricas ─────────────────────────────────
const ELECTRIC_STYLE_ID = 'chagra-electric-border-css';
const ELECTRIC_CSS = `
  :root {
    --neon:  #39ffd0;
    --neon2: #7cf6ff;
  }

  @keyframes chagra-electric-spin {
    to { transform: rotate(1turn); }
  }

  @keyframes chagra-electric-trace {
    from { stroke-dashoffset: var(--chagra-trace-perim, 1400); }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes chagra-electric-trace-b {
    from { stroke-dashoffset: var(--chagra-trace-perim, 1400); }
    to   { stroke-dashoffset: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .chagra-espin {
      animation-play-state: paused !important;
    }
    .chagra-etrace {
      animation-play-state: paused !important;
      stroke-dashoffset: 0 !important;
    }
  }
`;

function ensureElectricStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ELECTRIC_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = ELECTRIC_STYLE_ID;
  s.textContent = ELECTRIC_CSS;
  document.head.appendChild(s);
}
ensureElectricStyles();
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ElectricBorder — halo cónico + trazo SVG que recorre el borde del padre.
 * El padre debe tener position:relative y un borderRadius conocido.
 *
 * w/h: dimensiones del viewBox SVG (se escalan via preserveAspectRatio:none).
 * r: border-radius en px para rx/ry del rect y para el mask inset.
 */
function ElectricBorder({ w = 640, h = 480, r = 12 }) {
  const perim = Math.round(2 * (w + h) - 4 * r + Math.PI * 2 * r);

  return (
    <>
      {/* halo cónico que gira — solo se ve como borde gracias al mask inset */}
      <span
        aria-hidden="true"
        className="chagra-espin"
        style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: `${r + 3}px`,
          background: `conic-gradient(
            from 0deg,
            transparent 0% 62%,
            rgba(57,255,208,0.50) 74%,
            rgba(124,246,255,0.72) 86%,
            rgba(57,255,208,0.50) 93%,
            transparent 100%
          )`,
          animation: 'chagra-electric-spin 3s linear infinite',
          zIndex: 1,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      {/* máscara que cubre el interior dejando solo el anillo */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: '-3px',
          borderRadius: `${r + 3}px`,
          background: '#07111a',
          mask: `inset(3px round ${r}px)`,
          WebkitMask: `inset(3px round ${r}px)`,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />
      {/* trazo SVG que circula — dos chispas desfasadas */}
      <svg
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 3,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id="chagra-eglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* marco base tenue — siempre visible */}
        <rect
          x="2" y="2"
          width={w - 4} height={h - 4}
          rx={r} ry={r}
          fill="none"
          stroke="rgba(57,255,208,0.18)"
          strokeWidth="1.5"
        />
        {/* chispa A — neon principal */}
        <rect
          className="chagra-etrace"
          x="2" y="2"
          width={w - 4} height={h - 4}
          rx={r} ry={r}
          fill="none"
          stroke="var(--neon)"
          strokeWidth="2.6"
          strokeLinecap="round"
          filter="url(#chagra-eglow)"
          strokeDasharray={`40 ${perim}`}
          style={{
            '--chagra-trace-perim': perim,
            animation: 'chagra-electric-trace 2.8s linear infinite',
          }}
        />
        {/* chispa B — neon2, desfasada 1.4s */}
        <rect
          className="chagra-etrace"
          x="2" y="2"
          width={w - 4} height={h - 4}
          rx={r} ry={r}
          fill="none"
          stroke="var(--neon2)"
          strokeWidth="1.8"
          strokeLinecap="round"
          filter="url(#chagra-eglow)"
          strokeDasharray={`24 ${perim}`}
          style={{
            '--chagra-trace-perim': perim,
            animation: 'chagra-electric-trace-b 2.8s linear infinite',
            animationDelay: '-1.4s',
          }}
        />
      </svg>
    </>
  );
}

/**
 * BackgroundPreviewModal — overlay con la imagen completa (object-fit:contain)
 * y el borde eléctrico. onConfirm → aplica el fondo. onClose → descarta.
 */
function BackgroundPreviewModal({ option, onConfirm, onClose }) {
  const src = getBackgroundSrc(option.id);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Vista completa: ${option.label}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(4,7,13,0.88)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      {/* contenedor imagen + borde eléctrico */}
      <div
        style={{
          position: 'relative',
          maxWidth: 'min(92vw, 640px)',
          maxHeight: 'min(72vh, 560px)',
          width: '100%',
          aspectRatio: '4/3',
          borderRadius: '12px',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={option.label}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '12px',
            background: '#04070d',
          }}
        />
        <ElectricBorder w={640} h={480} r={12} />

        {/* botón cerrar — esquina superior derecha */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar vista previa"
          style={{
            position: 'absolute',
            top: '-14px',
            right: '-14px',
            zIndex: 20,
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(57,255,208,0.35)',
            background: 'rgba(4,7,13,0.92)',
            color: '#39ffd0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <X size={16} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>

      {/* etiqueta + botón confirmar */}
      <div
        style={{ marginTop: '20px', textAlign: 'center', position: 'relative', zIndex: 10 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p style={{ margin: '0 0 4px', color: '#bafff0', fontWeight: 700, fontSize: '14px' }}>
          {option.label}
        </p>
        <p style={{ margin: '0 0 16px', color: '#6fa99e', fontSize: '12px' }}>
          {option.sub}
        </p>
        <button
          type="button"
          onClick={onConfirm}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '9px 24px',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #39ffd0 0%, #7cf6ff 100%)',
            color: '#04140f',
            fontWeight: 700,
            fontSize: '13px',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            boxShadow: '0 0 18px rgba(57,255,208,0.45)',
          }}
        >
          <Zap size={14} strokeWidth={2.5} aria-hidden="true" />
          Elegir este fondo
        </button>
      </div>
    </div>
  );
}

export default function BackgroundSelector() {
  const selected = useThemeBackgroundStore((s) => s.selected);
  const setBackground = useThemeBackgroundStore((s) => s.setBackground);
  const [preview, setPreview] = useState(null);

  const handleThumbClick = useCallback((id) => {
    setPreview(id);
  }, []);

  const handleConfirm = useCallback(() => {
    if (preview) setBackground(preview);
    setPreview(null);
  }, [preview, setBackground]);

  const handleClose = useCallback(() => {
    setPreview(null);
  }, []);

  const previewOption = preview
    ? BACKGROUND_CATALOG.find((o) => o.id === preview) || null
    : null;

  return (
    <>
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div>
          <h4 className="text-sm font-bold text-slate-200">Fondo de la app</h4>
          <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
            Toca una miniatura para verla completa y elegirla.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {BACKGROUND_CATALOG.map((opt) => {
            const isSelected = selected === opt.id;
            const thumbSrc = getBackgroundSrc(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleThumbClick(opt.id)}
                aria-pressed={isSelected}
                aria-label={`Ver fondo ${opt.label}${isSelected ? ' (activo)' : ''}`}
                className={`relative flex flex-col rounded-xl border-2 overflow-hidden transition-all active:scale-95 ${
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="relative w-full aspect-[4/3] bg-slate-800 overflow-hidden">
                  <img
                    src={thumbSrc}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {isSelected && (
                    <span className="absolute top-2 right-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white shadow">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="text-center px-2 py-2 bg-slate-900">
                  <p className="text-sm font-bold text-slate-100">{opt.label}</p>
                  <p className="text-2xs text-slate-500 mt-0.5">{opt.sub}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {previewOption && (
        <BackgroundPreviewModal
          option={previewOption}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
    </>
  );
}
