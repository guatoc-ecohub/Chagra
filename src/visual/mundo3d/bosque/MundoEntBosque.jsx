/*
 * MundoEntBosque — el MUNDO del Ent, armado como lo pide el paisaje:
 *
 *   1. LA ENTRADA (EscenaBosqueVivo): el Ent majestuoso como LANDMARK del
 *      páramo. La cámara llega desde lejos, el guardián se mece en la niebla y
 *      entre sus raíces respira un resplandor verde-agua — la seña de que abajo
 *      hay algo vivo.
 *   2. LA ELECCIÓN: desde la entrada, un panel didáctico abierto con un solo
 *      camino claro: "Bajar al microsuelo", que lleva a la ruta ya cableada
 *      #/mockups/mundo-microfauna-3d. Nada encimado: primero el árbol,
 *      después la lección. No se duplica la puerta: la otra tarea construye
 *      ese mundo desde cero.
 *
 * Contrato de mundos: acepta `{tier, reducedMotion}` y llena a su padre
 * (position:relative implícito aquí). Copy en español de Colombia, en "usted".
 * Autocontenido: CSS embebido, cero imágenes/CDN.
 *
 * Importa three/@react-three (vía las escenas) → montar SOLO perezoso (lazy).
 */
import { useMemo } from 'react';
import EscenaBosqueVivo from './EscenaBosqueVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';

/*
 * La invitación vive en el PanelPasos compartido, ABIERTA por defecto: el panel
 * legible con el kicker "El guardián del páramo" y el texto completo se ve desde
 * el primer frame, sin taparle el cuerpo al Ent (regla dura del operador: los
 * diálogos no tapan el mundo). El botón "Bajar al microsuelo" es la puerta
 * visible al mundo de microfauna que ya existe en #/mockups/mundo-microfauna-3d
 * (no se duplica la lección: el microsuelo propio del Ent quedó absorbido por
 * esa ruta de la otra tarea).
 */
const CSS = `
.entb { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3cfce; }
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

/**
 * El mundo del Ent: entrada-landmark con el panel didáctico abierto y una
 * puerta visible al microsuelo (#/mockups/mundo-microfauna-3d). Montar SOLO
 * perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoEntBosque({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: si el host pasa {tier, reducedMotion} se respeta; si se
  // monta suelto (p.ej. el router de prod.chagra.app monta <Componente /> sin
  // props), auto-detecta el equipo con decidirTier() para no matar la gama baja.
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;

  return (
    <div className="entb">
      <style>{CSS}</style>

      <EscenaBosqueVivo tier={tier} reducedMotion={reducedMotion} />
      <PanelPasos
        etiqueta="La invitación del Ent"
        kicker="El guardián del páramo"
        texto="Bajo sus raíces vive una red de hongos que reparte el alimento entre las plantas. El Ent se la quiere enseñar."
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
        abiertoInicial={true}
      >
        <button
          type="button"
          className="ppasos__accion"
          onClick={() => {
            if (typeof window === 'undefined') return;
            window.location.hash = '#/mockups/mundo-microfauna-3d';
          }}
        >
          Bajar al microsuelo
        </button>
      </PanelPasos>
    </div>
  );
}
