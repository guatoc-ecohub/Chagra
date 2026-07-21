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
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';

/*
 * La invitación vive en el PanelPasos compartido: una pastilla en la esquina
 * inferior izquierda, visible DESDE EL PRIMER FRAME, que anuncia "El guardián
 * del páramo" sin taparle el cuerpo al Ent (regla dura del operador: los
 * diálogos no tapan el mundo). La lección sigue sin esconderse — el operador
 * había reportado *"no veo la lección del subsuelo"* cuando el botón demoraba
 * en aparecer; la pastilla siempre está, y un toque abre la invitación
 * completa con el botón de bajar al microsuelo.
 */
const CSS = `
.entb { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3cfce; }
.entb__volver {
  position: absolute; top: max(0.8rem, env(safe-area-inset-top)); left: 0.8rem;
  min-height: 2.75rem; padding: 0 0.95rem;
  border: 0; border-radius: 999px; cursor: pointer;
  background: rgba(14, 12, 9, 0.68);
  box-shadow: inset 0 0 0 1px rgba(180, 200, 150, 0.3);
  color: #e9efdd; font: 600 0.9rem/1 system-ui, sans-serif;
  backdrop-filter: blur(6px);
}
.entb__volver:active { transform: scale(0.97); }
`;

/* Acento del bosque para el panel compartido (musgo y verde-agua del Ent). */
const TEMA_PANEL = {
  fondo: 'rgba(14, 12, 9, 0.68)',
  borde: 'rgba(180, 200, 150, 0.28)',
  tinta: '#e9efdd',
  kicker: '#aebd97',
  acentoA: 'rgba(55, 214, 176, 0.95)',
  acentoB: 'rgba(38, 168, 138, 0.95)',
  tintaAccion: '#07211a',
  activo: '#37d6b0',
};

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
          <PanelPasos
            etiqueta="La invitación del Ent"
            kicker="El guardián del páramo"
            texto="Bajo sus raíces vive una red de hongos que reparte el alimento entre las plantas. El Ent se la quiere enseñar."
            tema={TEMA_PANEL}
            reducedMotion={reducedMotion}
          >
            <button
              type="button"
              className="ppasos__accion"
              onClick={() => irA('microsuelo')}
            >
              Bajar al microsuelo
            </button>
          </PanelPasos>
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
