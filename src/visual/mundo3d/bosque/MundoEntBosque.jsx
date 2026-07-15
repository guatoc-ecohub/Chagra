/*
 * MundoEntBosque — el MUNDO del Ent, armado como lo pide el paisaje:
 *
 *   1. LA ENTRADA (EscenaBosqueVivo): el Ent majestuoso como LANDMARK del
 *      páramo. La cámara llega desde lejos, el guardián se mece en la niebla y
 *      entre sus raíces respira un resplandor verde-agua — la seña de que abajo
 *      hay algo vivo.
 *   2. LA ELECCIÓN: desde la entrada, un solo camino claro — "Bajar al
 *      microsuelo". Nada encimado: primero el árbol, después la lección.
 *   3. EL MICROSUELO (EscenaEntMaestro): el Ent-maestro señala la tierra y
 *      enseña CAPA POR CAPA: hojarasca → humus → zona de raíces → red
 *      micorrízica → roca madre. Y de vuelta al bosque cuando se quiera.
 *
 * Este host guarda la elección (estado local, sin rutas: el wiring de ruta es
 * de quien integre). Contrato de mundos: acepta `{tier, reducedMotion}` y llena
 * a su padre (position:relative implícito aquí). Copy en español de Colombia,
 * en "usted". Autocontenido: CSS embebido, cero imágenes/CDN.
 *
 * Importa three/@react-three (vía las escenas) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaBosqueVivo from './EscenaBosqueVivo.jsx';
import EscenaEntMaestro from './EscenaEntMaestro.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';

/*
 * La invitación aparece CASI ENSEGUIDA (1.4s). Antes esperaba 5.6s "a que la
 * cámara llegara al claro", y el operador reportó *"no veo la lección del
 * subsuelo"*: se quedaba mirando el árbol sin saber que había un camino abajo.
 * La lección es la razón de existir de la pieza — no puede estar escondida
 * detrás de una espera larga y un botón que aparece sin avisar.
 */
const CSS = `
.entb { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3cfce; }
.entb__panel {
  position: absolute; left: 50%; bottom: max(0.9rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(24rem, calc(100% - 1.6rem));
  padding: 0.8rem 0.95rem 0.9rem;
  border-radius: 1rem;
  background: rgba(14, 12, 9, 0.68);
  box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.28), 0 6px 24px rgba(10, 14, 10, 0.35);
  backdrop-filter: blur(6px);
  color: #e9efdd;
  opacity: 0;
  animation: entb-aparece 0.9s ease 1.4s forwards;
}
.entb__panel--ya { opacity: 1; animation: none; }
.entb__kicker { margin: 0 0 0.15rem; font: 600 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #aebd97; }
.entb__texto { margin: 0 0 0.65rem; font: 500 0.85rem/1.35 system-ui, sans-serif; color: #dfe7cf; }
.entb__bajar {
  display: block; width: 100%; min-height: 2.9rem;
  border: 0; border-radius: 0.75rem; cursor: pointer;
  background: linear-gradient(180deg, rgba(55, 214, 176, 0.95), rgba(38, 168, 138, 0.95));
  color: #07211a; font: 700 0.95rem/1 system-ui, sans-serif;
  box-shadow: 0 0 18px 2px rgba(55, 214, 176, 0.35);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.entb__bajar:active { transform: scale(0.97); box-shadow: 0 0 10px 1px rgba(55, 214, 176, 0.3); }
.entb__volver {
  position: absolute; top: max(0.8rem, env(safe-area-inset-top)); left: 0.8rem;
  min-height: 2.6rem; padding: 0 0.95rem;
  border: 0; border-radius: 999px; cursor: pointer;
  background: rgba(14, 12, 9, 0.68);
  box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.3);
  color: #e9efdd; font: 600 0.85rem/1 system-ui, sans-serif;
  backdrop-filter: blur(6px);
}
.entb__volver:active { transform: scale(0.97); }
@media (prefers-reduced-motion: reduce) {
  .entb__panel { opacity: 1; animation: none; }
  .entb__bajar, .entb__volver { transition: none; }
}
`;

/*
 * Modo inicial según el hash: `#bosque_vivo` entra por el bosque y
 * `#bosque_vivo/microsuelo` cae DIRECTO en la lección de las capas del suelo.
 *
 * El router de prod parte el hash por '/' y se queda con el primer segmento
 * como ruta, así que el segundo viaja libre hasta aquí. Lo leemos nosotros
 * (el router no reparte `data` a los componentes) — así la lección es
 * enlazable, compartible y verificable con una captura, sin tocar el router.
 * OJO: la ruta va SIN barra inicial (`#bosque_vivo`); con `#/bosque_vivo` el
 * primer segmento queda vacío y el shell cae al valle.
 */
function modoDelHash() {
  if (typeof window === 'undefined') return 'entrada';
  const raw = window.location.hash.replace(/^#/, '');
  const sub = raw.split('/')[1];
  return sub === 'microsuelo' ? 'microsuelo' : 'entrada';
}

/**
 * El mundo del Ent completo: entrada-landmark + elección + microsuelo.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoEntBosque({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: si el host pasa {tier, reducedMotion} se respeta; si se
  // monta suelto (p.ej. el router de prod.chagra.app monta <Componente /> sin
  // props), auto-detecta el equipo con decidirTier() para no matar la gama baja.
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [modo, setModo] = useState(modoDelHash); // 'entrada' | 'microsuelo'

  // El hash sigue al modo (enlazable y con "atrás" del navegador coherente).
  const irA = (m) => {
    setModo(m);
    if (typeof window === 'undefined') return;
    const base = window.location.hash.replace(/^#/, '').split('/')[0] || 'bosque_vivo';
    window.location.hash = m === 'microsuelo' ? `#${base}/microsuelo` : `#${base}`;
  };

  return (
    <div className="entb">
      <style>{CSS}</style>

      {modo === 'entrada' ? (
        <>
          <EscenaBosqueVivo tier={tier} reducedMotion={reducedMotion} />
          <div className={`entb__panel${reducedMotion ? ' entb__panel--ya' : ''}`}>
            <p className="entb__kicker">El guardián del páramo</p>
            <p className="entb__texto">
              Bajo sus raíces vive una red de hongos que reparte el alimento
              entre las plantas. El Ent se la quiere enseñar.
            </p>
            <button
              type="button"
              className="entb__bajar"
              onClick={() => irA('microsuelo')}
            >
              Bajar al microsuelo
            </button>
          </div>
        </>
      ) : (
        <>
          <EscenaEntMaestro tier={tier} reducedMotion={reducedMotion} />
          <button
            type="button"
            className="entb__volver"
            onClick={() => irA('entrada')}
          >
            ← Volver al bosque
          </button>
        </>
      )}
    </div>
  );
}
