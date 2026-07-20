/*
 * MundoCana — el MUNDO DE LA CAÑA Y EL TRAPICHE completo: la escena + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda su
 * estado local.
 *
 * Los cinco pasos y sus encuadres viven en `leccionCana.js` (sin React ni
 * WebGL) para poder verificarlos headless: que ninguna cámara arranque metida
 * dentro de una cepa ni quede bajo tierra. Aquí solo queda el andamiaje.
 *
 * Cada paso señala SU lugar con un anillo (el `foco`) Y LLEVA LA CÁMARA (la
 * `vista`). Lo segundo importa tanto como lo primero: la altura del cañaveral no
 * se puede contar desde lejos, hay que meterse al pasillo entre surcos y mirar
 * para arriba. El paso 1 hace exactamente eso.
 *
 * Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useCallback, useMemo, useState } from 'react';
import EscenaCanaTrapiche from './EscenaCanaTrapiche.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { PASOS, TEMA_PANEL } from './leccionCana.js';

const CSS = `
.mcana { position: relative; width: 100%; height: 100%; overflow: hidden; background: #e6d6b4; }
.mcana canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcana .cana-canvas--lista canvas, .mcana canvas.cana-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .mcana canvas { transition: none; }
}
`;

/**
 * El mundo de la caña y el trapiche panelero, completo: escena + pasos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoCana({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;

  const [paso, setPaso] = useState(0);
  /* El token sube en CADA toque, no solo al cambiar de paso: si el que mira ya
     giró la escena con el dedo y vuelve a tocar el mismo paso, la cámara lo
     lleva otra vez al sitio en vez de quedarse quieta. */
  const [token, setToken] = useState(0);

  const irAlPaso = useCallback((i) => {
    setPaso(i);
    setToken((t) => t + 1);
  }, []);

  const actual = PASOS[paso];

  return (
    <div className="mcana">
      <style>{CSS}</style>
      <EscenaCanaTrapiche
        tier={tier}
        reducedMotion={reducedMotion}
        foco={actual.foco}
        vista={actual.vista}
        vistaToken={token}
      />

      <PanelPasos
        etiqueta="De la caña a la panela"
        pasos={PASOS}
        paso={paso}
        onPaso={irAlPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
