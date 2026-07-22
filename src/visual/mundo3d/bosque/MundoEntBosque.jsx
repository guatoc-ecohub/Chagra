/*
 * MundoEntBosque — el host del PÁRAMO DEFINITIVO (2026-07-22).
 *
 * Antes este mundo tenía dos actos: la entrada con el Ent y la lección del
 * microsuelo (EscenaEntMaestro). El operador revisó los tres mundos con piezas
 * de páramo y cerró la decisión: queda UNO solo — la escena del páramo
 * definitivo (EscenaBosqueVivo, ahora armada con la cámara y la inmensidad del
 * páramo viejo + el suelo rico dorado) y SIN el Ent ni el campesino ("están
 * horribles"). EscenaEntMaestro se desmonta de aquí sin redibujarse: era un
 * import aparte, sale limpio. El archivo sigue en el repo por si otra
 * composición retoma la lección de las cinco capas.
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

const CSS = `
.entb { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3cfce; }
`;

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
        etiqueta="El páramo"
        kicker="La fábrica de agua"
        texto="Los frailejones peinan la niebla con sus hojas de lana y el musgo la guarda como una esponja. De aquí, gota a gota, nace el agua que baja a su finca."
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
