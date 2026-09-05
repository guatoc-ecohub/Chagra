/*
 * MundoFrutales — el MUNDO DE LOS FRUTALES completo: la finca navegable + la
 * lección del PISO TÉRMICO.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda su
 * estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas que
 * recorren lo que este mundo enseña — el mango de tierra caliente, los cítricos
 * que sí suben, cómo se reconoce cada uno, y la regla que ordena la finca
 * entera. Cada paso señala SU lugar con un anillo que respira (el `foco` que la
 * escena dibuja). Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaFrutalesVivo from './EscenaFrutalesVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaFinca } from './floraFrutales.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la finca que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaFinca(x, z), z];
const PASOS = [
  {
    id: 'mango',
    kicker: 'Paso 1 de 4 · El palo de mango',
    texto:
      'Ese gigante del patio es un MANGO. Copa más ancha que alta, sombra para toda la familia, y fruta colgando de un cordón largo: el mango de azúcar, pequeño y amarillo. Vive en tierra caliente, de los 0 a los 1.000 metros.',
    foco: enSuelo(-4.2, 8.6),
  },
  {
    id: 'citricos',
    kicker: 'Paso 2 de 4 · Los cítricos suben',
    texto:
      'Loma arriba, donde ya refresca, están los cítricos: naranja, mandarina y limón. Son árboles mucho más chicos, de copa redonda y apretada. La naranja y la mandarina aguantan hasta unos 1.600 metros — el limón sube todavía un poco más.',
    foco: enSuelo(-6.0, -6.5),
  },
  {
    id: 'senas',
    kicker: 'Paso 3 de 4 · Las señas de cada uno',
    texto:
      'Al mango lo delata el brote nuevo: nace color vino, se hace cobrizo y solo después se pone verde oscuro. Al cítrico lo delata la hoja: en la base tiene una hojita chiquita pegada, el pecíolo alado, y en la rama guarda espinas. Su flor blanca es el azahar.',
    foco: enSuelo(3.5, -8.5),
  },
  {
    id: 'piso',
    kicker: 'Paso 4 de 4 · La altura manda',
    texto:
      'Suba por ese camino y va cambiando de clima sin salir de la finca. Por eso el mango se queda abajo y los cítricos lo acompañan más arriba: no es capricho, es el piso térmico. Antes de sembrar, mire a qué altura está su tierra.',
    foco: enSuelo(-1.0, -1.5),
  },
];

const CSS = `
.mfrutales { position: relative; width: 100%; height: 100%; overflow: hidden; background: #dfe7c6; }
.mfrutales canvas { opacity: 0; transition: opacity 0.9s ease; }
.mfrutales .frutales-canvas--lista canvas, .mfrutales canvas.frutales-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .mfrutales canvas { transition: none; }
}
`;

/* Acento de los frutales para el panel compartido: la corteza oscura del mango
   con el amarillo-naranja de la fruta. El color de este mundo es la cosecha. */
const TEMA_PANEL = {
  fondo: 'rgba(28, 18, 10, 0.68)',
  borde: 'rgba(240, 176, 74, 0.3)',
  tinta: '#f6eeda',
  kicker: '#f0bc6a',
  acentoA: 'rgba(244, 182, 60, 0.95)',
  acentoB: 'rgba(224, 122, 28, 0.95)',
  tintaAccion: '#2a1705',
  activo: '#f4b63c',
};

/**
 * El mundo de los frutales (mango + cítricos), completo: escena + pasos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoFrutales({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mfrutales">
      <style>{CSS}</style>
      <EscenaFrutalesVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección de los frutales"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
