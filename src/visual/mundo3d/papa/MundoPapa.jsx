/*
 * MundoPapa — el MUNDO DE LA PAPA completo: la ladera navegable + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas que
 * recorren lo que este mundo enseña — el surco y por qué se amontona la tierra,
 * la mata y su flor, la papa criolla y sus variedades andinas, y la cosecha —
 * y cada paso señala SU lugar en la ladera con un anillo que respira (el
 * `foco` que la escena dibuja). Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaPapaVivo from './EscenaPapaVivo.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaLadera, SITIO_COSECHA } from './floraPapa.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la ladera que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaLadera(x, z), z];
const PASOS = [
  {
    id: 'surco',
    kicker: 'Paso 1 de 4 · El surco',
    texto:
      'Mire el relieve: la papa no se siembra a ras, se siembra en SURCOS — caballones de tierra amontonada a curva de nivel. Esa tierra alzada abriga la semilla del frío, escurre el agua lluvia y le da campo al tubérculo para engordar.',
    foco: enSuelo(-1.0, 2.6),
  },
  {
    id: 'mata',
    kicker: 'Paso 2 de 4 · La mata y su flor',
    texto:
      'Encima de cada lomo va la mata: bajita, tupida, aporcada — se le arrima tierra al tallo para que eche más papa. Y cuando el papal florece, lila y blanco según la variedad, la mata le está avisando: abajo ya hay tubérculo formándose.',
    foco: enSuelo(-3.2, -0.6),
  },
  {
    id: 'criolla',
    kicker: 'Paso 3 de 4 · La papa criolla',
    texto:
      'La criolla amarilla es la reina de la tierra fría colombiana, pero no está sola: en los Andes hay cientos de variedades — rojas, moradas, pintadas. Esa diversidad es semilla guardada por generaciones campesinas, y es un seguro contra plagas y heladas.',
    foco: enSuelo(SITIO_COSECHA[0] + 0.6, SITIO_COSECHA[1] + 0.4),
  },
  {
    id: 'cosecha',
    kicker: 'Paso 4 de 4 · La cosecha',
    texto:
      'A los cinco o seis meses la mata se agacha y amarillea: es la seña. Se abre el caballón con azadón — con cuidado, que la papa se ofende — y la tierra entrega lo guardado. Se aparta la saca por tamaños, se cose el costal y arranca pal mercado.',
    foco: enSuelo(SITIO_COSECHA[0] - 1.2, SITIO_COSECHA[1] + 1.2),
  },
];

const CSS = `
.mpapal { position: relative; width: 100%; height: 100%; overflow: hidden; background: #b7d2e4; }
.mpapal canvas { opacity: 0; transition: opacity 0.9s ease; }
.mpapal .papal-canvas--lista canvas, .mpapal canvas.papal-canvas--lista { opacity: 1; }
.mpapal__panel {
  position: absolute; left: 50%; bottom: max(0.9rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(26rem, calc(100% - 1.6rem));
  padding: 0.8rem 0.95rem 0.85rem;
  border-radius: 1rem;
  background: rgba(18, 22, 14, 0.7);
  box-shadow: inset 0 0 0 1px rgba(196, 208, 150, 0.3), 0 6px 24px rgba(10, 14, 10, 0.35);
  backdrop-filter: blur(6px);
  color: #eef1e2;
}
.mpapal__kicker { margin: 0 0 0.15rem; font: 600 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #cdd88f; }
.mpapal__texto { margin: 0 0 0.6rem; font: 500 0.85rem/1.38 system-ui, sans-serif; color: #e9edd8; }
.mpapal__nav { display: flex; align-items: center; gap: 0.55rem; }
.mpapal__btn {
  min-height: 2.5rem; min-width: 2.9rem; padding: 0 0.8rem;
  border: 0; border-radius: 0.7rem; cursor: pointer;
  background: linear-gradient(180deg, rgba(214, 196, 92, 0.95), rgba(164, 146, 52, 0.95));
  color: #221d05; font: 700 0.9rem/1 system-ui, sans-serif;
  transition: transform 0.15s ease;
}
.mpapal__btn:active { transform: scale(0.96); }
.mpapal__btn[disabled] { opacity: 0.35; cursor: default; }
.mpapal__puntos { display: flex; gap: 0.35rem; margin: 0 auto; }
.mpapal__punto { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: rgba(230, 234, 210, 0.32); }
.mpapal__punto--activo { background: #d6c45c; box-shadow: 0 0 8px 1px rgba(214, 196, 92, 0.5); }
@media (prefers-reduced-motion: reduce) {
  .mpapal canvas { transition: none; }
  .mpapal__btn { transition: none; }
}
`;

/**
 * El mundo de la papa de tierra fría, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoPapa({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mpapal">
      <style>{CSS}</style>
      <EscenaPapaVivo tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <div className="mpapal__panel" role="group" aria-label="La lección del papal">
        <p className="mpapal__kicker">{actual.kicker}</p>
        <p className="mpapal__texto">{actual.texto}</p>
        <div className="mpapal__nav">
          <button
            type="button"
            className="mpapal__btn"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            aria-label="Paso anterior"
          >
            ←
          </button>
          <span className="mpapal__puntos" aria-hidden="true">
            {PASOS.map((p, i) => (
              <span
                key={p.id}
                className={`mpapal__punto${i === paso ? ' mpapal__punto--activo' : ''}`}
              />
            ))}
          </span>
          <button
            type="button"
            className="mpapal__btn"
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
