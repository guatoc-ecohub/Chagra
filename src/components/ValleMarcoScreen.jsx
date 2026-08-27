/*
 * ValleMarcoScreen — marco liviano para el valle 3D canónico.
 *
 * El valle vive en public/valle y se sirve como documento same-origin para
 * mantener aislado su Three r160 del Three r180 usado por los mockups React.
 * Este shell es lazy y no copia el build pesado dentro de la PWA.
 */
import { useEffect, useMemo, useState } from 'react';
import Valle2DFallback from '../mockups/valle/Valle2DFallback.jsx';

function leerCompai() {
  try {
    return localStorage.getItem('compai:companero') || 'angelita';
  } catch (_) {
    return 'angelita';
  }
}

/** @param {{ onExit?: () => void }} props */
export default function ValleMarcoScreen({ onExit }) {
  const [marcoError, setMarcoError] = useState(false);
  const valleSrc = useMemo(
    () => `/valle/index.html?compai=${encodeURIComponent(leerCompai())}`,
    [],
  );

  // El valle autónomo puede pedir fullscreen al entrar. Este marco debe
  // conservar siempre visible su salida, así que revierte ese intento tanto
  // por evento como por polling defensivo.
  useEffect(() => {
    const salirDeFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', salirDeFullscreen);
    const pollId = setInterval(salirDeFullscreen, 250);
    return () => {
      document.removeEventListener('fullscreenchange', salirDeFullscreen);
      clearInterval(pollId);
    };
  }, []);

  return (
    <main className="fixed inset-0 z-40 bg-[#071923]" data-testid="valle-marco-screen">
      <button
        type="button"
        onClick={onExit}
        className="tap-target absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-slate-950/75 px-4 py-2.5 text-xs font-bold text-white shadow-xl backdrop-blur-sm transition hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-300"
        aria-label="Volver a mi finca"
        data-testid="valle-marco-salir"
      >
        ‹ Volver a mi finca
      </button>

      {marcoError ? (
        <div className="absolute inset-0">
          <Valle2DFallback
            clima="tarde"
            focoId={null}
            animo="sereno"
            energia={1}
            onEntrar={() => {}}
            onAlerta={() => {}}
            webglBloqueado
          />
          <p className="absolute left-1/2 top-20 z-10 w-[min(90vw,34rem)] -translate-x-1/2 rounded-2xl border border-white/15 bg-slate-950/75 px-4 py-3 text-center text-sm font-semibold text-white shadow-xl">
            El valle dibujado está listo mientras se recupera la vista 3D.
          </p>
        </div>
      ) : (
        <iframe
          src={valleSrc}
          title="Valle 3D de Guatoc"
          className="absolute inset-0 h-full w-full border-0"
          onError={() => setMarcoError(true)}
        />
      )}
    </main>
  );
}
