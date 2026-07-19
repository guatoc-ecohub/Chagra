/*
 * MundoCacao — el MUNDO DEL CACAO completo: la vega navegable + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas
 * que recorren lo que este mundo enseña — qué es la mazorca y de dónde nace,
 * por qué el cacao va bajo sombra, el grano con su baba y la fermentación, y
 * el rumbo al secado — y cada paso señala SU lugar en la vega con un anillo
 * que respira (el `foco` que la escena dibuja). Copy en español de Colombia,
 * en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaCacaoVivo from './EscenaCacaoVivo.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaVega } from './floraCacao.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la vega que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaVega(x, z), z];
const PASOS = [
  {
    id: 'mazorca',
    kicker: 'Paso 1 de 4 · La mazorca',
    texto:
      'El fruto del cacao es la MAZORCA, y nace donde nadie la espera: pegada del tronco y de las ramas gruesas, no en la punta de las ramitas. Pinta del verde al amarillo y al rojo cobrizo cuando está de coger.',
    foco: enSuelo(-2.0, 1.6),
  },
  {
    id: 'sombra',
    kicker: 'Paso 2 de 4 · ¿Por qué bajo sombra?',
    texto:
      'El cacao es mata de monte: nació bajo los árboles grandes y así quiere vivir. El guamo y el plátano le bajan el sol quemante, le guardan la humedad, y su hoja caída se vuelve el abono que lo alimenta.',
    foco: enSuelo(3.5, -8.0),
  },
  {
    id: 'grano',
    kicker: 'Paso 3 de 4 · El grano y la baba',
    texto:
      'Dentro de la mazorca vienen los granos envueltos en una baba blanca y dulce. Esa baba no se lava: en el cajón de madera, tapada con hoja de plátano, FERMENTA los granos unos días — ahí nace el sabor a chocolate.',
    foco: enSuelo(9.5, -12.2),
  },
  {
    id: 'secado',
    kicker: 'Paso 4 de 4 · Rumbo al secado',
    texto:
      'Fermentado el grano, sube a la pasera: la cama donde se extiende al sol y se voltea a mano hasta quedar seco y sonando a cascajo. Ese grano seco es el que la familia vende — y del que sale el chocolate que usted se toma.',
    foco: enSuelo(13.5, -12.6),
  },
];

const CSS = `
.mcacao { position: relative; width: 100%; height: 100%; overflow: hidden; background: #dce4bd; }
.mcacao canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcacao .cacao-canvas--lista canvas, .mcacao canvas.cacao-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .mcacao canvas { transition: none; }
}
`;

/* Acento del cacaotal para el panel compartido (madera y mazorca cobriza). */
const TEMA_PANEL = {
  fondo: 'rgba(30, 20, 10, 0.68)',
  borde: 'rgba(216, 174, 116, 0.3)',
  tinta: '#f4ecda',
  kicker: '#dcb478',
  acentoA: 'rgba(224, 168, 74, 0.95)',
  acentoB: 'rgba(176, 118, 40, 0.95)',
  tintaAccion: '#241503',
  activo: '#e0a84a',
};

/**
 * El mundo del cacaotal bajo sombra, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoCacao({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mcacao">
      <style>{CSS}</style>
      <EscenaCacaoVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección del cacaotal"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
