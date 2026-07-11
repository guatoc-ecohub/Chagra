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
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { resolverMundo, tinteDeMundo, tituloDeMundo, emojiDeMundo } from './resolverMundo.js';
import Mundo2D from './Mundo2D.jsx';
import './mundo.css';

/* Los dioramas 3D se cargan PEREZOSO: three/@react-three viven en su propio
   chunk (`vendor-three`, vite.config), fuera del bundle base. Los importadores
   viven aparte de los `lazy` para poder REINTENTAR con un import() fresco
   (un `lazy` cachea su promesa para siempre — colgada incluida). */
const IMPORTA_ESCENA = {
  cutaway: () => import('./escenas/EscenaCutaway.jsx'),
  flujo: () => import('./escenas/EscenaFlujo.jsx'),
  recinto: () => import('./escenas/EscenaRecinto.jsx'),
  estratos: () => import('./escenas/EscenaEstratos.jsx'),
  valle: () => import('./escenas/EscenaValle.jsx'),
  boveda: () => import('./escenas/EscenaBoveda.jsx'),
  sanidad: () => import('./escenas/EscenaSanidad.jsx'),
};
const ESCENAS_3D = Object.fromEntries(
  Object.entries(IMPORTA_ESCENA).map(([k, importa]) => [k, lazy(importa)]),
);

/* Cuánto esperamos el chunk 3D antes de la CAÍDA DIGNA al 2D. Con señal
   intermitente (el caso normal del campo) un fetch colgado NO lanza error —
   el ErrorBoundary nunca lo ve; este timeout sí. */
export const CARGA_3D_TIMEOUT_MS = 9000;

function MundoCargando({ tinte, onTimeout }) {
  /* El fallback vive SOLO mientras Suspense espera el chunk: si el chunk llega,
     el desmonte limpia el timer; si no llega, avisa al host para caer al 2D. */
  useEffect(() => {
    if (!onTimeout) return undefined;
    const t = setTimeout(onTimeout, CARGA_3D_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [onTimeout]);
  return (
    <div
      className="mundo-cargando"
      style={{ '--m-tinte': (tinte && tinte[0]) || '#3f8f4e' }}
      role="status"
    >
      <div className="mundo-cargando__pulso" />
      <p>Levantando el mundo…</p>
    </div>
  );
}

/* Aviso de la caída digna: nunca "error", siempre un camino de vuelta. */
function AvisoCaida3D({ tinte, onReintentar }) {
  return (
    <div className="mundo-caida" role="status" style={{ '--m-tinte': (tinte && tinte[0]) || '#3f8f4e' }}>
      <p className="mundo-caida__txt">
        El mundo en 3D no bajó con esta señal. Le mostramos la versión ligera; la finca sigue completa.
      </p>
      <button type="button" className="mundo-caida__btn" onClick={onReintentar}>
        Reintentar 3D
      </button>
    </div>
  );
}

/* La MIGA: dónde-estoy + volver al valle, SIEMPRE visible y consistente en
   todo mundo (el host solo pasa `onSalir`; el framework pinta lo mismo). */
function MigaVolver({ onSalir, mundoId }) {
  if (!onSalir) return null;
  return (
    <nav className="mundo-miga" aria-label="Usted está aquí">
      <button type="button" className="mundo-salir" onClick={() => onSalir()} aria-label="Volver al valle">
        ‹ El valle
      </button>
      <span className="mundo-miga__aqui">
        <span aria-hidden="true">{emojiDeMundo(mundoId)}</span> {tituloDeMundo(mundoId)}
      </span>
    </nav>
  );
}

function MundoInterno({
  mundoId, tier = 'alto', reducedMotion = false, onHotspot, onSalir, animo = 'sereno', energia = 1,
}) {
  /* CAÍDA DIGNA (BUG-UX-05 / SPEC-UX-05): si el chunk 3D no baja en
     CARGA_3D_TIMEOUT_MS, caemos al espejo 2D del mundo. `intento` fabrica un
     `lazy` nuevo al reintentar (import() fresco, no la promesa colgada). */
  const [caido3d, setCaido3d] = useState(false);
  const [intento, setIntento] = useState(0);

  const plan = resolverMundo(mundoId, tier);
  const tinte = tinteDeMundo(mundoId);

  const alTimeout3D = useCallback(() => setCaido3d(true), []);
  const reintentar3D = useCallback(() => {
    setIntento((n) => n + 1);
    setCaido3d(false);
  }, []);

  const Escena = useMemo(() => {
    if (plan.modo !== '3d') return null;
    const importa = IMPORTA_ESCENA[plan.escena];
    if (!importa) return null;
    // 1er intento: el lazy compartido (cachea el chunk). Reintentos: lazy fresco.
    return intento === 0 ? ESCENAS_3D[plan.escena] : lazy(importa);
  }, [plan.modo, plan.escena, intento]);

  // Sin escena o mundo ausente: el host navega al 2D real (no montamos nada).
  if (plan.modo === 'ausente' || plan.modo === 'ruta') return null;

  if (plan.modo === '3d' && caido3d) {
    /* El espejo 2D del mismo mundo (el plan que este equipo vería en tier
       'bajo'): la lección sigue, la señal decide después. */
    const espejo = resolverMundo(mundoId, 'bajo');
    return (
      <div className="mundo-root" data-dim="2d" data-mundo={mundoId} data-caida3d="1">
        {espejo.modo === '2d' && (
          <Mundo2D
            escena={espejo.escena}
            motivo={espejo.motivo}
            entrada={espejo.entrada}
            tinte={tinte}
            reducedMotion={reducedMotion}
            onHotspot={onHotspot}
            animo={animo}
            energia={energia}
          />
        )}
        <AvisoCaida3D tinte={tinte} onReintentar={reintentar3D} />
        <MigaVolver onSalir={onSalir} mundoId={mundoId} />
      </div>
    );
  }

  if (plan.modo === '3d') {
    if (!Escena) return null;
    return (
      <div className="mundo-root" data-dim="3d" data-mundo={mundoId}>
        <Suspense fallback={<MundoCargando tinte={tinte} onTimeout={alTimeout3D} />}>
          <Escena
            params={plan.entrada.params}
            hotspots={plan.entrada.hotspots}
            entrada={plan.entrada.entrada}
            tinte={tinte}
            tier={tier}
            reducedMotion={reducedMotion}
            onHotspot={onHotspot}
            onSalir={onSalir}
            animo={animo}
            energia={energia}
          />
        </Suspense>
        <MigaVolver onSalir={onSalir} mundoId={mundoId} />
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
      <MigaVolver onSalir={onSalir} mundoId={mundoId} />
    </div>
  );
}

/* El host público: `key={mundoId}` resetea la caída/reintentos al cambiar de
   mundo (que un timeout viejo no persiga al mundo siguiente). */
export default function Mundo(props) {
  return <MundoInterno key={props.mundoId} {...props} />;
}
