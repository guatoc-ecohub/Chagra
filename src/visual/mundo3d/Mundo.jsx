/*
 * <Mundo> — EL HOST ÚNICO del framework de mundos (2D + 3D en una sola pieza).
 *
 *   <Mundo mundoId tier reducedMotion onHotspot onSalir animo energia />
 *
 * Lee el registro `MUNDO[mundoId]`, resuelve el PLAN con `resolverMundo` (que
 * cruza el arquetipo con el device-tier) y monta lo que toca:
 *   · 3D  → el diorama del arquetipo (chunk perezoso `vendor-three`).
 *   · 2D  → el arquetipo 2D (de primera clase o el espejo de un 3D degradado).
 *   · ruta→ escena:null: no monta nada; el host debe navegar a `plan.ruta.view`
 *           (regla de oro: el mundo NUNCA reimplementa la pantalla 2D, la re-rutea).
 *
 * Nada de lógica de negocio adentro: solo lee datos y elige arquetipo. Sumar un
 * mundo = una entrada en `mundoData.js`, sin tocar este archivo.
 */
import { lazy, Suspense } from 'react';
import { resolverMundo, tinteDeMundo } from './resolverMundo.js';
import Mundo2D from './Mundo2D.jsx';
import './mundo.css';

/* Los dioramas 3D se cargan PEREZOSO: three/@react-three viven en su propio
   chunk (`vendor-three`, vite.config), fuera del bundle base. */
const ESCENAS_3D = {
  cutaway: lazy(() => import('./escenas/EscenaCutaway.jsx')),
  flujo: lazy(() => import('./escenas/EscenaFlujo.jsx')),
  recinto: lazy(() => import('./escenas/EscenaRecinto.jsx')),
  estratos: lazy(() => import('./escenas/EscenaEstratos.jsx')),
  valle: lazy(() => import('./escenas/EscenaValle.jsx')),
};

function MundoCargando({ tinte }) {
  return (
    <div className="mundo-cargando" style={{ '--m-tinte': (tinte && tinte[0]) || '#3f8f4e' }}>
      <div className="mundo-cargando__pulso" />
      <p>Levantando el mundo…</p>
    </div>
  );
}

function SalirBtn({ onSalir }) {
  if (!onSalir) return null;
  return (
    <button type="button" className="mundo-salir" onClick={() => onSalir()} aria-label="Volver al valle">
      ‹ Volver
    </button>
  );
}

export default function Mundo({
  mundoId, tier = 'alto', reducedMotion = false, onHotspot, onSalir, animo = 'sereno', energia = 1,
}) {
  const plan = resolverMundo(mundoId, tier);
  const tinte = tinteDeMundo(mundoId);

  // Sin escena o mundo ausente: el host navega al 2D real (no montamos nada).
  if (plan.modo === 'ausente' || plan.modo === 'ruta') return null;

  if (plan.modo === '3d') {
    const Escena = ESCENAS_3D[plan.escena];
    if (!Escena) return null;
    return (
      <div className="mundo-root" data-dim="3d" data-mundo={mundoId}>
        <Suspense fallback={<MundoCargando tinte={tinte} />}>
          <Escena
            params={plan.entrada.params}
            hotspots={plan.entrada.hotspots}
            entrada={plan.entrada.entrada}
            tinte={tinte}
            reducedMotion={reducedMotion}
            onHotspot={onHotspot}
            onSalir={onSalir}
            animo={animo}
            energia={energia}
          />
        </Suspense>
        <SalirBtn onSalir={onSalir} />
      </div>
    );
  }

  // 2D
  return (
    <div className="mundo-root" data-dim="2d" data-mundo={mundoId}>
      <Mundo2D
        escena={plan.escena}
        motivo={plan.motivo}
        entrada={plan.entrada}
        tinte={tinte}
        reducedMotion={reducedMotion}
        onHotspot={onHotspot}
        animo={animo}
        energia={energia}
      />
      <SalirBtn onSalir={onSalir} />
    </div>
  );
}
