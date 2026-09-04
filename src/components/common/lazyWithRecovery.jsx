/* eslint-disable chagra-i18n/no-hardcoded-spanish, react-refresh/only-export-components */
import React, { lazy as reactLazy } from 'react';

/**
 * Convierte un rechazo de import() en una pantalla legible. React.lazy conserva
 * un rechazo para siempre, por eso no basta con que Suspense tenga un loading.
 * Este es el punto único de las rutas perezosas declaradas en App.jsx.
 */
function CargaPerezosaFallida() {
  return (
    <section className="h-[100dvh] w-full bg-slate-950 text-white flex items-center justify-center p-6" role="alert">
      <div className="w-full max-w-md rounded-2xl border border-amber-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
        <h2 className="text-lg font-bold">No se pudo abrir esta pantalla</h2>
        <p className="text-sm leading-relaxed text-slate-300">
          La conexión no pudo traer una parte de Chagra. Sus datos de la finca siguen guardados en este dispositivo.
        </p>
        <button
          type="button"
          className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500"
          onClick={() => window.location.reload()}
        >
          Recargar Chagra
        </button>
      </div>
    </section>
  );
}

/**
 * Equivalente de React.lazy que resuelve un import rechazado a una UI de
 * recuperación, en vez de propagarlo hasta romper el árbol de la aplicación.
 */
export function lazy(importa) {
  return reactLazy(async () => {
    try {
      return await importa();
    } catch {
      return { default: CargaPerezosaFallida };
    }
  });
}
