/*
 * MundoCafetal — el MUNDO DEL CAFÉ completo: la ladera navegable + la lección.
 *
 * Mismo contrato de host que MundoEntBosque: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas que
 * recorren lo que este mundo enseña — qué es el sombrío, por qué el café va
 * bajo sombra, cómo madura la cereza y a dónde va el grano — y cada paso
 * señala SU lugar en la ladera con un anillo que respira (el `foco` que la
 * escena dibuja). Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaCafetalVivo from './EscenaCafetalVivo.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaLadera } from './floraCafetal.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la ladera que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaLadera(x, z), z];
const PASOS = [
  {
    id: 'sombrio',
    kicker: 'Paso 1 de 4 · El sombrío',
    texto:
      'Los árboles altos que ve entre el café no estorban: son el SOMBRÍO. Guamos y nogales cafeteros sembrados a propósito, que le tienden un techo de hojas al cultivo.',
    foco: enSuelo(-1.5, -8.5),
  },
  {
    id: 'sombra',
    kicker: 'Paso 2 de 4 · ¿Por qué bajo sombra?',
    texto:
      'La sombra baja el sol quemante, guarda la humedad y su hoja caída abona el suelo. Un cafetal con sombrío es café con vida: vuelven las aves y las mariposas que el café a pleno sol espanta.',
    foco: enSuelo(0.5, -5.2),
  },
  {
    id: 'cereza',
    kicker: 'Paso 3 de 4 · La cereza',
    texto:
      'El fruto del café es la CEREZA: nace verde, pinta amarillo y madura ROJO. A la sombra madura despacio — y grano que madura despacio da taza más dulce. Se coge solo la roja, a mano, grano a grano.',
    foco: enSuelo(-2.8, 1.6),
  },
  {
    id: 'beneficio',
    kicker: 'Paso 4 de 4 · Rumbo al beneficio',
    texto:
      'La cereza cogida sube a la casa: allá se despulpa, se lava y se seca en la marquesina hasta volverse café pergamino, el grano que se vende. De esa paciencia sale el café que usted se toma.',
    foco: enSuelo(9.0, -12.2),
  },
];

const CSS = `
.mcafetal { position: relative; width: 100%; height: 100%; overflow: hidden; background: #c3dcd2; }
.mcafetal canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcafetal .cafetal-canvas--lista canvas, .mcafetal canvas.cafetal-canvas--lista { opacity: 1; }
.mcafetal__panel {
  position: absolute; left: 50%; bottom: max(0.9rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(26rem, calc(100% - 1.6rem));
  padding: 0.8rem 0.95rem 0.85rem;
  border-radius: 1rem;
  background: rgba(26, 20, 10, 0.68);
  box-shadow: inset 0 0 0 1px rgba(214, 188, 130, 0.3), 0 6px 24px rgba(14, 12, 8, 0.35);
  backdrop-filter: blur(6px);
  color: #f3ecda;
}
.mcafetal__kicker { margin: 0 0 0.15rem; font: 600 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #d9be85; }
.mcafetal__texto { margin: 0 0 0.6rem; font: 500 0.85rem/1.38 system-ui, sans-serif; color: #efe6cf; }
.mcafetal__nav { display: flex; align-items: center; gap: 0.55rem; }
.mcafetal__btn {
  min-height: 2.5rem; min-width: 2.9rem; padding: 0 0.8rem;
  border: 0; border-radius: 0.7rem; cursor: pointer;
  background: linear-gradient(180deg, rgba(226, 178, 82, 0.95), rgba(186, 132, 45, 0.95));
  color: #241703; font: 700 0.9rem/1 system-ui, sans-serif;
  transition: transform 0.15s ease;
}
.mcafetal__btn:active { transform: scale(0.96); }
.mcafetal__btn[disabled] { opacity: 0.35; cursor: default; }
.mcafetal__puntos { display: flex; gap: 0.35rem; margin: 0 auto; }
.mcafetal__punto { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: rgba(233, 220, 190, 0.32); }
.mcafetal__punto--activo { background: #e2b252; box-shadow: 0 0 8px 1px rgba(226, 178, 82, 0.5); }
@media (prefers-reduced-motion: reduce) {
  .mcafetal canvas { transition: none; }
  .mcafetal__btn { transition: none; }
}
`;

/**
 * El mundo del cafetal bajo sombra, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoCafetal({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mcafetal">
      <style>{CSS}</style>
      <EscenaCafetalVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <div className="mcafetal__panel" role="group" aria-label="La lección del cafetal">
        <p className="mcafetal__kicker">{actual.kicker}</p>
        <p className="mcafetal__texto">{actual.texto}</p>
        <div className="mcafetal__nav">
          <button
            type="button"
            className="mcafetal__btn"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            aria-label="Paso anterior"
          >
            ←
          </button>
          <span className="mcafetal__puntos" aria-hidden="true">
            {PASOS.map((p, i) => (
              <span
                key={p.id}
                className={`mcafetal__punto${i === paso ? ' mcafetal__punto--activo' : ''}`}
              />
            ))}
          </span>
          <button
            type="button"
            className="mcafetal__btn"
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
