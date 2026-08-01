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
import { getPieza } from '../../../data/entGuion.js';

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

/* LA LECCIÓN DE LA CEIBA-ENT — el guardián del cacaotal (piso cálido) habla con
   su pieza del guion pedagógico grounded (`entGuion`, verificada contra el
   catálogo v3.2). Va APARTE de los cuatro pasos del cultivo, como el guardián
   del bosque de tres estratos: los pasos enseñan el cacao; la ceiba, por qué el
   monte grande lo cobija. Fallback digno por si el id cambiara. */
const LECCION_CEIBA = getPieza('ceiba_sombrio_refugio_biodiversidad');

const CSS = `
.mcacao { position: relative; width: 100%; height: 100%; overflow: hidden; background: #dce4bd; }
.mcacao canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcacao .cacao-canvas--lista canvas, .mcacao canvas.cacao-canvas--lista { opacity: 1; }
/* La carta del guardián: rincón superior izquierdo (los pasos viven abajo a la
   izquierda; el sujeto, en el centro). Display-only — deja pasar la órbita. */
.mcacao-guardian { position: absolute; top: 0.8rem; left: 0.8rem; z-index: 6; max-width: 21rem; margin: 0; padding: 0.55rem 0.9rem 0.62rem; border-radius: 0.8rem; background: rgba(30, 20, 10, 0.72); backdrop-filter: blur(4px); color: #f4ecda; pointer-events: none; }
.mcacao-guardian h3 { margin: 0 0 0.25rem; font: 700 0.9rem/1.25 system-ui, sans-serif; }
.mcacao-guardian h3 em { font-weight: 500; font-style: italic; opacity: 0.85; }
.mcacao-guardian p { margin: 0; font: 500 0.78rem/1.5 system-ui, sans-serif; }
@media (max-width: 460px) {
  .mcacao-guardian { max-width: calc(100% - 1.2rem); top: 0.6rem; left: 0.6rem; padding: 0.5rem 0.75rem 0.56rem; }
  .mcacao-guardian h3 { font-size: 0.84rem; }
  .mcacao-guardian p { font-size: 0.74rem; }
}
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

      {/* EL GUARDIÁN habla: la lección grounded de la ceiba-Ent (el sombrío
          emergente del cálido), aparte de los pasos del cultivo. Nunca muda. */}
      {LECCION_CEIBA && (
        <article className="mcacao-guardian" role="status">
          <h3>
            {LECCION_CEIBA.nombre_comun}
            {' '}
            <em>{LECCION_CEIBA.nombre_cientifico}</em>
          </h3>
          <p>{LECCION_CEIBA.snippet_pedagogico}</p>
        </article>
      )}

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
