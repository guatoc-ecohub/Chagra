import React, { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * VideoManual — reproductor de un video-manual (HTML animado autocontenido).
 *
 * Los video-manuales viven como HTML animado en /manual/mv-*.html (1080×1920,
 * se animan solos con requestAnimationFrame y hacen loop; traen su propio
 * fitStage que los escala al contenedor). Se embeben en un <iframe> same-origin
 * dentro de un "marco de celular" 9:16, así se ven como se verán en la app.
 *
 * CSP: la app corre con default-src 'self' (sin frame-src explícito → hereda
 * 'self'), por eso el iframe same-origin carga sin problema; el documento del
 * iframe trae su propio JS inline y no está sujeto a la CSP del padre.
 *
 * Rendimiento: el iframe NO se monta hasta que el usuario toca "reproducir"
 * (o si `autostart`). Cada HTML pesa ~150 KB (fuentes embebidas), así que se
 * monta solo el del módulo abierto.
 *
 * Offline: si el HTML no está cacheado por el SW y no hay red, el iframe queda
 * en blanco; el marco muestra igual su título/subtítulo. Es un extra, no un
 * bloqueante del curso.
 *
 * @param {object} props
 * @param {string} props.src        Ruta al HTML (/manual/mv-*.html).
 * @param {string} props.titulo
 * @param {string} [props.subtitulo]
 * @param {boolean} [props.autostart=false] Monta el iframe de una.
 */
export default function VideoManual({ src, titulo, subtitulo, autostart = false }) {
  const [activo, setActivo] = useState(Boolean(autostart));

  return (
    <figure
      data-testid="video-manual"
      className="flex flex-col items-center gap-2 shrink-0 w-[220px]"
    >
      <div
        className="relative w-full overflow-hidden rounded-[26px] border border-emerald-800/50 bg-slate-950 shadow-[0_10px_40px_rgba(6,182,212,0.18)]"
        style={{ aspectRatio: '9 / 16' }}
      >
        {activo ? (
          <iframe
            src={src}
            title={`Video: ${titulo}`}
            loading="lazy"
            scrolling="no"
            className="absolute inset-0 w-full h-full border-0"
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <button
            type="button"
            data-testid="video-manual-play"
            onClick={() => setActivo(true)}
            aria-label={`Reproducir video: ${titulo}`}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-950/80 to-slate-950 active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/50">
              <Play size={28} className="text-emerald-200 translate-x-0.5" fill="currentColor" />
            </span>
            <span className="text-xs font-bold text-emerald-100/90 px-4 text-center leading-snug">
              Toca para ver
            </span>
          </button>
        )}
      </div>
      <figcaption className="text-center px-1">
        <p className="text-sm font-bold text-slate-100 leading-tight">{titulo}</p>
        {subtitulo && (
          <p className="text-[11px] text-slate-400 leading-snug mt-0.5">{subtitulo}</p>
        )}
      </figcaption>
    </figure>
  );
}
