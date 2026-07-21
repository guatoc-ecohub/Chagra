/*
 * MundoInvernadero — el MICRO-MUNDO DEL INVERNADERO completo: el túnel
 * navegable + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cinco lecciones cortas que
 * recorren lo que este lugar enseña — el clima que se fabrica, el semillero en
 * bandejas, el repique a bolsa, el tomate bajo techo y el agua contada por
 * goteo — y cada paso señala SU lugar con un anillo que respira (el `foco`
 * que la escena dibuja). Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaInvernaderoVivo from './EscenaInvernaderoVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import {
  alturaInvernadero,
  SITIO_PUERTA,
  SITIO_MESA,
  SITIO_BOLSAS,
  SITIO_TOMATE,
  SITIO_CANECA,
} from './invernadero.geom.js';

/* Los cinco pasos de la lección. Cada `foco` es el punto que el anillo señala
   mientras se lee (coordenadas del mundo; los sitios de la mesa y las camas
   van a la altura de su tablero/sustrato, los del piso sobre el terreno). */
const enSuelo = (s, y = 0) => [s[0], alturaInvernadero(s[0], s[1]) + y, s[1]];
const PASOS = [
  {
    id: 'microclima',
    kicker: 'Paso 1 de 5 · Un clima que usted fabrica',
    texto:
      'Este techo de plástico no es lujo: es CLIMA hecho a mano. Adentro no golpea el aguacero, no quema la helada de madrugada y el calorcito se queda. Mire el plástico por dentro, perlado de gotas: es el agua que la tierra y las matas sudan y el techo atrapa — el microclima trabajando a la vista.',
    foco: enSuelo(SITIO_PUERTA),
  },
  {
    id: 'semillero',
    kicker: 'Paso 2 de 5 · El semillero en bandejas',
    texto:
      'En la mesa está el ALMÁCIGO: bandejas con celdas de sustrato suelto, una semilla por celda. Mire las etapas: unas apenas asoman, otras ya son plántula de dos hojas. Germinar parejo es la primera cosecha.',
    foco: [SITIO_MESA[0], 0.88, SITIO_MESA[1]],
  },
  {
    id: 'repique',
    kicker: 'Paso 3 de 5 · El repique a bolsa',
    texto:
      'Cuando la plántula saca sus hojas verdaderas, se REPICA: pasa de la celda a la bolsa negra, con espacio para echar raíz firme. En el piso junto a la mesa están las repicadas, cogiendo cuerpo antes de salir.',
    foco: enSuelo(SITIO_BOLSAS, 0.1),
  },
  {
    id: 'tomate',
    kicker: 'Paso 4 de 5 · El tomate bajo techo',
    texto:
      'El tomate se enferma con la hoja mojada: bajo el plástico la lluvia no lo toca y los hongos pierden. Cada mata va amarrada a su TUTOR de guadua, y el racimo madura de abajo hacia arriba — verde, pintón, rojo.',
    foco: [SITIO_TOMATE[0], 0.4, SITIO_TOMATE[1]],
  },
  {
    id: 'goteo',
    kicker: 'Paso 5 de 5 · El agua, contada por gotas',
    texto:
      'Bajo techo no llueve: el agua la pone usted. De la caneca salen las líneas de GOTEO tendidas sobre las camas — entregan el agua al pie de la mata, gota a gota, sin mojar la hoja y sin desperdiciar un balde.',
    foco: enSuelo(SITIO_CANECA),
  },
];

const CSS = `
.minvernadero { position: relative; width: 100%; height: 100%; overflow: hidden; background: #d9dcc3; }
.minvernadero canvas { opacity: 0; transition: opacity 0.9s ease; }
.minvernadero .invernadero-canvas--lista canvas, .minvernadero canvas.invernadero-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .minvernadero canvas { transition: none; }
}
`;

/* Acento del invernadero para el panel compartido (verde plántula y guadua). */
const TEMA_PANEL = {
  fondo: 'rgba(26, 24, 12, 0.68)',
  borde: 'rgba(200, 196, 140, 0.3)',
  tinta: '#f2efda',
  kicker: '#cfc27a',
  acentoA: 'rgba(178, 196, 92, 0.95)',
  acentoB: 'rgba(122, 148, 52, 0.95)',
  tintaAccion: '#1d2405',
  activo: '#b2c45c',
};

/**
 * El micro-mundo del invernadero, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoInvernadero({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="minvernadero">
      <style>{CSS}</style>
      <EscenaInvernaderoVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección del invernadero"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
