import { useState, useEffect, useCallback } from 'react';
import { Check, X, Zap } from 'lucide-react';
import useThemeBackgroundStore, {
  BACKGROUND_CATALOG,
  getBackgroundSrc,
  esGradiente,
} from '../../store/useThemeBackgroundStore';

/**
 * BackgroundSelector — selector visual del fondo de biodiversidad.
 *
 * El operador elige entre los fondos curados por la diseñadora (Lili)
 * desde su Perfil. Opciones en grid 2x2 (4 cards biopunk).
 *
 * Persiste vía useThemeBackgroundStore (localStorage `chagra:background:v1`).
 * El cambio aplica de inmediato (App.jsx escribe --app-bg-image en el body)
 * y se preserva el overlay/blur biopunk para legibilidad.
 *
 * UX 2026-06-02 (rediseño aprobado, reemplaza #1261): al hacer click/tap en
 * una miniatura se abre una VISTA AMPLIADA (overlay modal) con la imagen
 * COMPLETA (object-fit:contain, sin recorte) sobre fondo oscuro, con un
 * MICELIO recorriendo el borde del marco — referencia visual aprobada por
 * el operador (sección "1 · Fondo a pantalla completa + micelio").
 *
 * El operador RECHAZÓ el borde eléctrico cónico anterior (#1261): el
 * conic-gradient giratorio + la máscara inset tapaban la imagen. Eliminado.
 *
 * Micelio (lenguaje visual de la referencia):
 *   - `.hypha`  → filamentos estáticos tenues que brotan de las esquinas
 *                 (stroke --myc2 #34e3a0, opacity .5, glow suave g2).
 *   - `.ring`   → contorno-madre del marco (rgba(57,255,208,.18)).
 *   - `.pulse`  → rayo neón que recorre el perímetro vía stroke-dashoffset
 *                 (#39ffd0 / #7cf6ff con glow g1); dos chispas desfasadas.
 *   - `.spore`  → esporas que laten (blink).
 *   Todo CSS/SVG puro (stroke-dashoffset + opacity keyframes), sin JS por
 *   frame. prefers-reduced-motion: micelio estático (animation:none).
 *
 * ADAPTACIÓN a imágenes reales (no fijo 3/4 como el prototipo): el marco
 * toma el aspect-ratio NATURAL de la imagen cargada (medido una sola vez en
 * el onLoad, no por frame), así `contain` no deja franjas y el micelio
 * abraza el borde real de la foto. El SVG usa preserveAspectRatio="none" +
 * pathLength normalizado → el rayo recorre el perímetro idéntico sea la
 * foto vertical, horizontal o cuadrada. El marco se acota al viewport.
 *
 * CRÍTICO anti React #185: consumir solo `selected` (string) del store;
 * nunca retornar objetos inline desde selectores de useThemeBackgroundStore.
 * El aspect-ratio medido vive en useState local (no en el store).
 */

// ─── CSS global del micelio ─────────────────────────────────────────────────
const MYCELIUM_STYLE_ID = 'chagra-mycelium-border-css';
const MYCELIUM_CSS = `
  :root {
    --myc:   #39ffd0;
    --myc2:  #34e3a0;
    --spore: #7cf6ff;
  }

  /* el rayo recorre el perímetro: pathLength=1360, dash 60 viaja el contorno */
  @keyframes chagra-myc-run {
    from { stroke-dashoffset: 1360; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes chagra-myc-blink {
    0%, 100% { opacity: 0; }
    50%      { opacity: 0.9; }
  }

  .chagra-myc-pulse {
    animation: chagra-myc-run 4.2s linear infinite;
  }
  .chagra-myc-pulse.b {
    animation-delay: -2.1s;
  }
  .chagra-myc-spore {
    animation: chagra-myc-blink 4.2s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .chagra-myc-pulse,
    .chagra-myc-spore {
      animation: none;
    }
  }
`;

function ensureMyceliumStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MYCELIUM_STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = MYCELIUM_STYLE_ID;
  s.textContent = MYCELIUM_CSS;
  document.head.appendChild(s);
}
ensureMyceliumStyles();
// ─────────────────────────────────────────────────────────────────────────────

/**
 * MyceliumBorder — micelio que recorre el borde del marco SIN taparlo.
 *
 * El SVG cubre el marco con un pequeño desborde (inset:-10px, overflow
 * visible) y usa preserveAspectRatio="none" para que el contorno-madre y el
 * rayo se estiren al aspect-ratio real de la foto. `pathLength="1360"`
 * normaliza el perímetro: el stroke-dashoffset recorre el contorno idéntico
 * sea cual sea el tamaño real → adaptable a cualquier aspect-ratio.
 *
 * El viewBox se calcula a partir del aspect-ratio del marco para que los
 * filamentos `.hypha` broten cerca de las esquinas reales; el rect-madre
 * mantiene un margen interno constante (en unidades del viewBox).
 *
 * Capas puramente decorativas (aria-hidden, pointer-events:none) — quedan
 * DETRÁS de la imagen para no taparla; el desborde del micelio asoma fuera
 * del marco como un borde orgánico.
 */
function MyceliumBorder({ ratio = 3 / 4 }) {
  // viewBox proporcional al marco. Lado mayor fijo a 420 (como la referencia
  // vertical 320×420); el lado menor se deriva del ratio (w/h). Mantener un
  // valor grande da resolución de path; preserveAspectRatio="none" lo estira.
  const BASE = 420;
  let vbW;
  let vbH;
  if (ratio >= 1) {
    // horizontal o cuadrada → ancho mayor
    vbW = BASE;
    vbH = Math.max(120, Math.round(BASE / ratio));
  } else {
    // vertical → alto mayor
    vbH = BASE;
    vbW = Math.max(120, Math.round(BASE * ratio));
  }

  const M = 6; // margen interno del contorno-madre (unidades viewBox)
  const rx = 18;
  const innerW = vbW - 2 * M;
  const innerH = vbH - 2 * M;

  // Filamentos hypha brotando de las 4 esquinas + 2 lados, en coords del
  // viewBox (se estiran con preserveAspectRatio:none, lectura orgánica).
  const hyphae = [
    // esquina sup-izq
    `M${M + 4} ${M} q-6 -10 -16 -8 q5 4 4 12 M${M + 4} ${M} q4 -8 12 -10`,
    // esquina sup-der
    `M${vbW - M - 14} ${M + 60} q12 -2 18 6 q-8 0 -10 8 M${vbW - M - 14} ${M + 60} q9 4 10 14`,
    // esquina inf-der
    `M${vbW - M - 2} ${vbH - M - 110} q12 4 12 16 q-7 -4 -14 0 M${vbW - M - 2} ${vbH - M - 110} q8 8 4 18`,
    // borde inferior
    `M${vbW / 2} ${vbH - M + 2} q2 12 -8 16 q-1 -8 -10 -9 M${vbW / 2} ${vbH - M + 2} q-2 10 6 17`,
    // borde izquierdo medio
    `M${M} ${vbH * 0.6} q-12 0 -16 10 q7 -1 11 6 M${M} ${vbH * 0.6} q-10 6 -7 16`,
    // borde izquierdo superior
    `M${M} ${vbH * 0.28} q-11 -3 -16 5 q7 1 8 9 M${M} ${vbH * 0.28} q-9 5 -5 14`,
  ];

  return (
    <svg
      aria-hidden="true"
      className="chagra-mycelium"
      style={{
        position: 'absolute',
        inset: '-10px',
        width: 'calc(100% + 20px)',
        height: 'calc(100% + 20px)',
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 1,
      }}
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="chagra-myc-g1" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id="chagra-myc-g2" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
      </defs>

      {/* filamentos hypha — ramas estáticas tenues */}
      <g
        fill="none"
        stroke="var(--myc2)"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.5"
        filter="url(#chagra-myc-g2)"
        vectorEffect="non-scaling-stroke"
      >
        {hyphae.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* contorno-madre del marco */}
      <rect
        x={M}
        y={M}
        width={innerW}
        height={innerH}
        rx={rx}
        fill="none"
        stroke="rgba(57,255,208,0.18)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />

      {/* rayo A — neón principal #39ffd0 que recorre el perímetro */}
      <rect
        className="chagra-myc-pulse"
        x={M}
        y={M}
        width={innerW}
        height={innerH}
        rx={rx}
        pathLength="1360"
        fill="none"
        stroke="var(--myc)"
        strokeWidth="2.4"
        strokeLinecap="round"
        filter="url(#chagra-myc-g1)"
        strokeDasharray="60 1300"
        vectorEffect="non-scaling-stroke"
      />

      {/* rayo B — espora #7cf6ff, desfasado */}
      <rect
        className="chagra-myc-pulse b"
        x={M}
        y={M}
        width={innerW}
        height={innerH}
        rx={rx}
        pathLength="1360"
        fill="none"
        stroke="var(--spore)"
        strokeWidth="1.4"
        strokeLinecap="round"
        filter="url(#chagra-myc-g1)"
        strokeDasharray="30 1330"
        vectorEffect="non-scaling-stroke"
      />

      {/* esporas que laten en las esquinas */}
      <circle
        className="chagra-myc-spore"
        cx={M + 4}
        cy={M}
        r="2.6"
        fill="var(--spore)"
        filter="url(#chagra-myc-g1)"
        style={{ animationDelay: '-0.3s' }}
      />
      <circle
        className="chagra-myc-spore"
        cx={vbW - M - 2}
        cy={vbH - M - 110}
        r="2.6"
        fill="var(--spore)"
        filter="url(#chagra-myc-g1)"
        style={{ animationDelay: '-2.6s' }}
      />
    </svg>
  );
}

/**
 * BackgroundPreviewModal — overlay con la imagen COMPLETA (object-fit:contain)
 * y el micelio en el borde. onConfirm → aplica el fondo. onClose → descarta.
 *
 * El marco adopta el aspect-ratio natural de la imagen (medido en onLoad),
 * de modo que `contain` no deja franjas y el micelio abraza la foto real.
 */
function BackgroundPreviewModal({ option, onConfirm, onClose }) {
  const src = getBackgroundSrc(option.id);
  // aspect-ratio (ancho/alto) real de la imagen; arranca en 3/4 (vertical,
  // como la referencia) y se corrige una sola vez al cargar. NO es per-frame.
  const [ratio, setRatio] = useState(3 / 4);

  const handleImgLoad = useCallback((e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (w > 0 && h > 0) setRatio(w / h);
  }, []);

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
        background: 'radial-gradient(120% 90% at 50% -10%, #0a1622 0%, #04070d 70%)',
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
      {/* marco: toma el aspect-ratio real de la imagen y se acota al viewport */}
      <div
        className="chagra-bg-frame"
        style={{
          position: 'relative',
          aspectRatio: ratio,
          maxWidth: 'min(92vw, 640px)',
          maxHeight: 'min(72vh, 620px)',
          width: 'auto',
          height: 'auto',
          // garantiza tamaño visible incluso en jsdom (sin layout): el marco
          // crece hasta los topes manteniendo el aspect-ratio.
          minWidth: '40vw',
          borderRadius: '16px',
          overflow: 'visible',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* micelio DETRÁS de la imagen → asoma por el borde, nunca la tapa */}
        <MyceliumBorder ratio={ratio} />

        {/* fondo COMPLETO — gradiente andino (las fotos-oso se archivaron) */}
        <div
          role="img"
          aria-label={option.label}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            background: esGradiente(src) ? src : `#04070d url('${src}') center/contain no-repeat`,
            borderRadius: '16px',
            boxShadow: '0 18px 60px -20px #000',
            zIndex: 2,
          }}
        />

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
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full"
                    style={{ background: esGradiente(thumbSrc) ? thumbSrc : `url('${thumbSrc}') center/cover` }}
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
