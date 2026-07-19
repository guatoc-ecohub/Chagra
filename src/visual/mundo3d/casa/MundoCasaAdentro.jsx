/*
 * MundoCasaAdentro — LA CASA POR DENTRO completa: el interior navegable + la
 * lección + los dos accesos.
 *
 * Mismo contrato de host que MundoCafetal/MundoInvernadero: acepta
 * `{tier, reducedMotion}` (o auto-detecta con decidirTier si se monta suelto),
 * llena a su padre y guarda su estado local. Sobre la escena viven los PASOS:
 * cinco lecciones cortas que recorren lo que la casa cuenta — el fogón, la
 * luz de la casa (el reloj de sol de la ventana), la mesa, el rincón de los
 * fermentos y la ventana de los mundos — y cada paso señala SU lugar con el
 * anillo que respira (el `foco` de la escena).
 *
 * Los ACCESOS son el contrato con el valle:
 *   · `onPortales`  → tocar la ventana de los mundos (o su botón). Por defecto
 *     navega al mirador de los mundos: `#/vitrina_maestra`.
 *   · `onFermentos` → tocar el estante de frascos (o su botón). Por defecto
 *     navega al mundo de los fermentos: `#/diorama_fermentos`.
 *   · `onSalir`     → volver al valle (el host que sabe la ruta lo pasa; si no
 *     llega, el botón no se pinta).
 *
 * Copy en español de Colombia, en "usted". Importa three/@react-three (vía la
 * escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaCasaAdentro from './EscenaCasaAdentro.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import {
  SITIO_FOGON,
  SITIO_LUZ,
  SITIO_MESA,
  SITIO_FERMENTOS,
  SITIO_MUNDOS,
} from './casaAdentro.geom.js';

/* Los cinco pasos de la lección: la casa se lee despacio. */
const PASOS = [
  {
    id: 'fogon',
    kicker: 'Paso 1 de 5 · El fogón',
    texto:
      'El fogón de leña es el corazón de la casa: aquí se prende el día antes de que amanezca. La olla que humea, la leña rajada, el hollín en la pared, el zarzo arriba donde el grano se cura con el humo — la casa que cocina es casa viva.',
    foco: SITIO_FOGON,
  },
  {
    id: 'luz',
    kicker: 'Paso 2 de 5 · La luz de la casa',
    texto:
      'Fíjese en el cuadro de sol que la ventana riega en el piso: camina y se estira con el día. Pegado al muro a mediodía, largo y hondo por la tarde. La casa de tapia se alumbra por un solo vano — y por eso es también un reloj: el abuelo sabía la hora sin mirar ninguna.',
    foco: SITIO_LUZ,
  },
  {
    id: 'mesa',
    kicker: 'Paso 3 de 5 · La mesa',
    texto:
      'En la mesa de madera se come lo que la finca dio: la mazorca, la totuma, el pocillo de café. Pero lo que de verdad se sirve aquí es la palabra — en la mesa se decide la siembra y se cuenta el día.',
    foco: SITIO_MESA,
  },
  {
    id: 'fermentos',
    kicker: 'Paso 4 de 5 · El rincón de los fermentos',
    texto:
      'En el estante trabajan los que no se ven: la chicha, el vinagre, el guarapo. Microbios buenos transformando la cosecha, sin afán y sin remedio comprado. Toque los frascos para entrar a su mundo.',
    foco: SITIO_FERMENTOS,
  },
  {
    id: 'mundos',
    kicker: 'Paso 5 de 5 · La ventana de los mundos',
    texto:
      'Desde la casa se ve toda la finca. Esta ventana del fondo mira a los mundos: el agua, el suelo, el café, el páramo. Toque la ventana cuando quiera salir a recorrerlos — la casa aquí lo espera.',
    foco: SITIO_MUNDOS,
  },
];

const CSS = `
.mcasa { position: relative; width: 100%; height: 100%; overflow: hidden; background: #2b2116; }
.mcasa canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcasa .casadentro-canvas--lista canvas, .mcasa canvas.casadentro-canvas--lista { opacity: 1; }
.mcasa__accesos {
  position: absolute; top: max(0.8rem, env(safe-area-inset-top)); left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
  width: min(28rem, calc(100% - 1.4rem));
}
.mcasa__acceso {
  min-height: 2.3rem; padding: 0.35rem 0.85rem;
  border: 0; border-radius: 999px; cursor: pointer;
  background: rgba(26, 20, 10, 0.62);
  box-shadow: inset 0 0 0 1px rgba(214, 188, 130, 0.35);
  color: #f0e6cd; font: 600 0.78rem/1.2 system-ui, sans-serif;
  backdrop-filter: blur(5px);
  transition: transform 0.15s ease;
}
.mcasa__acceso:active { transform: scale(0.96); }
@media (prefers-reduced-motion: reduce) {
  .mcasa canvas { transition: none; }
  .mcasa__acceso { transition: none; }
}
`;

/* Acento de la casa para el panel compartido (adobe, vela y oro viejo). */
const TEMA_PANEL = {
  fondo: 'rgba(26, 20, 10, 0.68)',
  borde: 'rgba(214, 188, 130, 0.3)',
  tinta: '#f3ecda',
  kicker: '#d9be85',
  acentoA: 'rgba(226, 178, 82, 0.95)',
  acentoB: 'rgba(186, 132, 45, 0.95)',
  tintaAccion: '#241703',
  activo: '#e2b252',
};

/* Los destinos por defecto (rutas hash de prod); un host con router propio
   pasa sus callbacks y estos no corren. */
const irAPortales = () => {
  window.location.hash = '#/vitrina_maestra';
};
const irAFermentos = () => {
  window.location.hash = '#/diorama_fermentos';
};

/**
 * La casa por dentro, completa: escena + pasos + accesos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{
 *   tier?: 'alto'|'medio'|'bajo',
 *   reducedMotion?: boolean,
 *   onPortales?: () => void,
 *   onFermentos?: () => void,
 *   onSalir?: (() => void)|null,
 * }} props
 */
export default function MundoCasaAdentro({
  tier: tierProp,
  reducedMotion: rmProp,
  onPortales = irAPortales,
  onFermentos = irAFermentos,
  onSalir = null,
} = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mcasa">
      <style>{CSS}</style>
      <EscenaCasaAdentro
        tier={tier}
        reducedMotion={reducedMotion}
        foco={actual.foco}
        onPortales={onPortales}
        onFermentos={onFermentos}
      />

      {/* los accesos SIEMPRE legibles (además de los hotspots 3D) */}
      <div className="mcasa__accesos" role="group" aria-label="Salidas de la casa">
        {onSalir && (
          <button type="button" className="mcasa__acceso" onClick={onSalir}>
            ← El valle
          </button>
        )}
        <button type="button" className="mcasa__acceso" onClick={onPortales}>
          ✦ La ventana de los mundos
        </button>
        <button type="button" className="mcasa__acceso" onClick={onFermentos}>
          ⚱ El rincón de los fermentos
        </button>
      </div>

      <PanelPasos
        etiqueta="La lección de la casa"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
