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
.mcacao__panel {
  position: absolute; left: 50%; bottom: max(0.9rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(26rem, calc(100% - 1.6rem));
  padding: 0.8rem 0.95rem 0.85rem;
  border-radius: 1rem;
  background: rgba(30, 20, 10, 0.68);
  box-shadow: inset 0 0 0 1px rgba(216, 174, 116, 0.3), 0 6px 24px rgba(16, 12, 6, 0.35);
  backdrop-filter: blur(6px);
  color: #f4ecda;
}
.mcacao__kicker { margin: 0 0 0.15rem; font: 600 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #dcb478; }
.mcacao__texto { margin: 0 0 0.6rem; font: 500 0.85rem/1.38 system-ui, sans-serif; color: #f0e6cd; }
.mcacao__nav { display: flex; align-items: center; gap: 0.55rem; }
.mcacao__btn {
  min-height: 2.5rem; min-width: 2.9rem; padding: 0 0.8rem;
  border: 0; border-radius: 0.7rem; cursor: pointer;
  background: linear-gradient(180deg, rgba(224, 168, 74, 0.95), rgba(176, 118, 40, 0.95));
  color: #241503; font: 700 0.9rem/1 system-ui, sans-serif;
  transition: transform 0.15s ease;
}
.mcacao__btn:active { transform: scale(0.96); }
.mcacao__btn[disabled] { opacity: 0.35; cursor: default; }
.mcacao__puntos { display: flex; gap: 0.35rem; margin: 0 auto; }
.mcacao__punto { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: rgba(233, 218, 186, 0.32); }
.mcacao__punto--activo { background: #e0a84a; box-shadow: 0 0 8px 1px rgba(224, 168, 74, 0.5); }
@media (prefers-reduced-motion: reduce) {
  .mcacao canvas { transition: none; }
  .mcacao__btn { transition: none; }
}
`;

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

      <div className="mcacao__panel" role="group" aria-label="La lección del cacaotal">
        <p className="mcacao__kicker">{actual.kicker}</p>
        <p className="mcacao__texto">{actual.texto}</p>
        <div className="mcacao__nav">
          <button
            type="button"
            className="mcacao__btn"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            aria-label="Paso anterior"
          >
            ←
          </button>
          <span className="mcacao__puntos" aria-hidden="true">
            {PASOS.map((p, i) => (
              <span
                key={p.id}
                className={`mcacao__punto${i === paso ? ' mcacao__punto--activo' : ''}`}
              />
            ))}
          </span>
          <button
            type="button"
            className="mcacao__btn"
            onClick={() => setPaso((p) => Math.min(PASOS.length - 1, p + 1))}
            disabled={paso === PASOS.length - 1}
            aria-label="Paso siguiente"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
