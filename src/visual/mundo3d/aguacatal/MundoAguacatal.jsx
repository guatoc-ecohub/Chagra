/*
 * MundoAguacatal — el MUNDO DEL AGUACATE completo: la finca navegable + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas
 * que recorren lo que este mundo enseña — la ESCALA del árbol, la floración
 * en panícula con sus abejas, el fruto Hass contra el criollo, y la raíz
 * superficial con su camellón, su tutor y su zanjilla — y cada paso señala SU
 * lugar en la finca con un anillo que respira (el `foco` que la escena
 * dibuja). Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaAguacatalVivo from './EscenaAguacatalVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaFinca, SITIOS_CRIOLLO, SITIOS_HASS, SITIOS_JOVEN } from './floraAguacatal.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la finca que el
   anillo señala mientras se lee (coordenadas del mundo, sobre el terreno). */
const enSuelo = (x, z) => [x, alturaFinca(x, z), z];
const PASOS = [
  {
    id: 'escala',
    kicker: 'Paso 1 de 4 · El árbol grande',
    texto:
      'Mire la casa y mire el árbol del patio: el aguacate NO es una mata, es un ÁRBOL. Un Hass adulto pasa de los 8 metros y el criollo viejo, sembrado de semilla, más todavía. Por eso la escalera recostada: a este árbol se le sube. Párese debajo y la copa le hace techo.',
    foco: enSuelo(SITIOS_CRIOLLO[0][0], SITIOS_CRIOLLO[0][1]),
  },
  {
    id: 'floracion',
    kicker: 'Paso 2 de 4 · La flor y las abejas',
    texto:
      'El aguacate florece en PANÍCULAS: racimos de miles de flores pequeñas, amarillo-verdosas. De miles, cuajan poquitas — y las que cuajan es porque las abejas hicieron su trabajo. Donde ve el borde de la copa pintado de amarillo, acérquese: ahí está el zumbido.',
    foco: enSuelo(SITIOS_HASS[1][0], SITIOS_HASS[1][1]),
  },
  {
    id: 'fruto',
    kicker: 'Paso 3 de 4 · Hass rugoso, criollo liso',
    texto:
      'El fruto cuelga de su pedúnculo, en racimos flojos. El Hass se conoce por la cáscara RUGOSA que pinta de verde a morado-negro cuando madura. El criollo del patio es otra cosa: más grande, de cáscara LISA y verde aunque esté maduro. Aprenda a distinguirlos: valen distinto y se venden distinto.',
    foco: enSuelo(SITIOS_HASS[0][0], SITIOS_HASS[0][1]),
  },
  {
    id: 'raiz',
    kicker: 'Paso 4 de 4 · La raíz superficial',
    texto:
      'La raíz del aguacate es SUPERFICIAL: no ancla hondo y se ahoga encharcada. Por eso cada árbol va sembrado en su CAMELLÓN, el joven lleva su tutor contra el viento, y la zanjilla saca el agua sobrada. Y fíjese en el suelo bajo la copa: hojarasca gruesa, fresco, casi sin pasto — esa sombra es un microclima que abona solo.',
    foco: enSuelo(SITIOS_JOVEN[0][0], SITIOS_JOVEN[0][1]),
  },
];

const CSS = `
.maguacatal { position: relative; width: 100%; height: 100%; overflow: hidden; background: #cfdcc6; }
.maguacatal canvas { opacity: 0; transition: opacity 0.9s ease; }
.maguacatal .aguacatal-canvas--lista canvas, .maguacatal canvas.aguacatal-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .maguacatal canvas { transition: none; }
}
`;

/* Acento del aguacatal para el panel compartido: verde hoja profundo con el
   morado Hass de acento — nunca pardo apagado. */
const TEMA_PANEL = {
  fondo: 'rgba(15, 24, 13, 0.7)',
  borde: 'rgba(163, 196, 118, 0.3)',
  tinta: '#eef3e0',
  kicker: '#b9d078',
  acentoA: 'rgba(140, 178, 74, 0.95)',
  acentoB: 'rgba(97, 58, 84, 0.95)',
  tintaAccion: '#0f1906',
  activo: '#a8c855',
};

/**
 * El mundo del aguacate, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoAguacatal({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="maguacatal">
      <style>{CSS}</style>
      <EscenaAguacatalVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección del aguacatal"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
