/*
 * MundoEntBosque — el host del PÁRAMO DEFINITIVO (2026-07-22).
 *
 * Antes este mundo tenía dos actos: la entrada con el Ent y la lección del
 * microsuelo (EscenaEntMaestro). El operador revisó los tres mundos con piezas
 * de páramo y cerró la decisión: queda UNO solo — la escena del páramo
 * definitivo (EscenaBosqueVivo, ahora armada con la cámara y la inmensidad del
 * páramo viejo + el suelo rico dorado). EscenaEntMaestro se desmonta de aquí
 * sin redibujarse: era un import aparte, sale limpio.
 *
 * 2026-07-30: el ENT VUELVE al páramo, pero como la QUEÑUA (Polylepis) con el
 * cincel reconciliado de `EntGradiente` (el aprobado en `tres-ents-gradiente`,
 * NO la vieja `EntQuenua` "horrible"). El panel del mundo ya no da la lección
 * genérica del frailejón: da la LECCIÓN DE LA QUEÑUA (entGuion, grounded) — el
 * árbol que sostiene el suelo y guarda el agua sobre los 4.000 m.
 *
 * Contrato de mundos: acepta `{tier, reducedMotion}` y llena a su padre. Copy
 * en español de Colombia, en "usted". Autocontenido: CSS embebido, cero
 * imágenes/CDN. Importa three/@react-three (vía la escena) → montar SOLO
 * perezoso (lazy).
 */
import { useMemo } from 'react';
import EscenaBosqueVivo from './EscenaBosqueVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { getPieza } from '../../../data/entGuion.js';

const CSS = `
.entb { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3cfce; }
`;

/* LA LECCIÓN DE LA QUEÑUA-ENT — la enseñanza del guardián del páramo, tomada
   del guion pedagógico (`entGuion`, grounded contra el catálogo v3.2). La
   queñua (coloradito, *Polylepis*) sostiene el suelo sobre los 4.000 m y guarda
   el agua que baja al valle: es la lección que el brazo del Ent señala y que el
   panel pone en palabras. Fallback digno por si el id cambiara. */
const PIEZA_QUENUA = getPieza('coloradito_regula_agua_alta_montana');
const LECCION_QUENUA = {
  etiqueta: 'La queñua del páramo',
  kicker: 'El agua que baja al valle',
  texto: PIEZA_QUENUA?.snippet_pedagogico
    || 'La queñua crece donde casi ningún árbol se atreve, arriba de los cuatro '
    + 'mil metros. Sus raíces sujetan el suelo del páramo y guardan el agua que '
    + 'baja a los valles. Sin ella, el páramo se deslava.',
};

/* Acento del páramo para el panel compartido (pajonal dorado y bruma fría). */
const TEMA_PANEL = {
  fondo: 'rgba(16, 20, 22, 0.66)',
  borde: 'rgba(196, 206, 178, 0.3)',
  tinta: '#edf2e6',
  kicker: '#c9c08a',
  acentoA: 'rgba(120, 190, 214, 0.95)',
  acentoB: 'rgba(84, 148, 176, 0.95)',
  tintaAccion: '#0a1c22',
  activo: '#78bed6',
};

/**
 * El mundo del páramo definitivo. Montar SOLO perezoso (lazy); llena a su
 * contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoEntBosque({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: si el host pasa {tier, reducedMotion} se respeta; si se
  // monta suelto (p.ej. el router de prod monta <Componente /> sin props),
  // auto-detecta el equipo con decidirTier() para no matar la gama baja.
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;

  return (
    <div className="entb">
      <style>{CSS}</style>
      <EscenaBosqueVivo tier={tier} reducedMotion={reducedMotion} />
      <PanelPasos
        etiqueta={LECCION_QUENUA.etiqueta}
        kicker={LECCION_QUENUA.kicker}
        texto={LECCION_QUENUA.texto}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
