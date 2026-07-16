/*
 * MundoLecheria — el MUNDO DE LA CADENA LÁCTEA completo: el potrero navegable +
 * la lección. Mismo contrato de host que MundoCafetal: acepta `{tier,
 * reducedMotion}` (o auto-detecta con decidirTier si se monta suelto), llena a su
 * padre y guarda su estado local. Sobre la escena viven los PASOS: cuatro
 * lecciones cortas — el silvopastoril, el hato por piso térmico, la quesera de
 * la finca y el ciclo del estiércol al abono — y cada paso señala SU lugar en el
 * potrero con un anillo que respira. Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaLecheriaViva from './EscenaLecheriaViva.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import {
  alturaPotrero,
  SITIO_QUESERA,
  SITIO_BIODIGESTOR,
} from './floraLecheria.geom.js';

const enSuelo = (x, z) => [x, alturaPotrero(x, z), z];
const PASOS = [
  {
    id: 'silvopastoril',
    kicker: 'Paso 1 de 4 · El potrero con árboles',
    texto:
      'Esto no es potrero pelado: es un sistema SILVOPASTORIL. Entre el pasto se siembran árboles forrajeros —nacedero, matarratón, leucaena y el arbusto botón de oro—: dan sombra, forraje con proteína y fijan nitrógeno que abona el suelo.',
    foco: enSuelo(-6.5, -1.5),
  },
  {
    id: 'hato',
    kicker: 'Paso 2 de 4 · El hato por piso',
    texto:
      'La vaca se escoge según el clima: en tierra fría, la Holstein y la Normando de buena leche; en tierra caliente, la criolla y el cruce con cebú (el de la giba), que aguanta el calor y las garrapatas. Se pastorea rotando el potrero para que el pasto descanse.',
    foco: enSuelo(-5.5, -3.2),
  },
  {
    id: 'quesera',
    kicker: 'Paso 3 de 4 · La quesera de la finca',
    texto:
      'La leche no se vende cruda y barata: se TRANSFORMA en la finca. En la quesera salen la cuajada y el queso campesino, el doble crema, el kumis y el yogur, y en la olla de cobre el arequipe. Ahí es donde el trabajo del campesino se paga.',
    foco: enSuelo(SITIO_QUESERA[0], SITIO_QUESERA[1]),
  },
  {
    id: 'ciclo',
    kicker: 'Paso 4 de 4 · Nada se pierde',
    texto:
      'El estiércol no es basura: entra al biodigestor y da BIOGÁS para cocinar en la quesera y BIOL para abonar el pasto; lo demás va al montón de abono. Así se cierra el ciclo —del potrero a la leche y de vuelta al potrero— sin comprar químicos.',
    foco: enSuelo(SITIO_BIODIGESTOR[0], SITIO_BIODIGESTOR[1]),
  },
];

const CSS = `
.mlecheria { position: relative; width: 100%; height: 100%; overflow: hidden; background: #cfe0cf; }
.mlecheria canvas { opacity: 0; transition: opacity 0.9s ease; }
.mlecheria .lecheria-canvas--lista canvas, .mlecheria canvas.lecheria-canvas--lista { opacity: 1; }
.mlecheria__panel {
  position: absolute; left: 50%; bottom: max(0.9rem, env(safe-area-inset-bottom));
  transform: translateX(-50%);
  width: min(26rem, calc(100% - 1.6rem));
  padding: 0.8rem 0.95rem 0.85rem;
  border-radius: 1rem;
  background: rgba(22, 28, 18, 0.68);
  box-shadow: inset 0 0 0 1px rgba(180, 206, 150, 0.3), 0 6px 24px rgba(12, 14, 8, 0.35);
  backdrop-filter: blur(6px);
  color: #f0f3e8;
}
.mlecheria__kicker { margin: 0 0 0.15rem; font: 600 0.68rem/1.2 system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: #b9d68f; }
.mlecheria__texto { margin: 0 0 0.6rem; font: 500 0.85rem/1.38 system-ui, sans-serif; color: #e9efdb; }
.mlecheria__nav { display: flex; align-items: center; gap: 0.55rem; }
.mlecheria__btn {
  min-height: 2.5rem; min-width: 2.9rem; padding: 0 0.8rem;
  border: 0; border-radius: 0.7rem; cursor: pointer;
  background: linear-gradient(180deg, rgba(150, 186, 96, 0.95), rgba(102, 140, 58, 0.95));
  color: #17230b; font: 700 0.9rem/1 system-ui, sans-serif;
  transition: transform 0.15s ease;
}
.mlecheria__btn:active { transform: scale(0.96); }
.mlecheria__btn[disabled] { opacity: 0.35; cursor: default; }
.mlecheria__puntos { display: flex; gap: 0.35rem; margin: 0 auto; }
.mlecheria__punto { width: 0.5rem; height: 0.5rem; border-radius: 999px; background: rgba(233, 239, 219, 0.32); }
.mlecheria__punto--activo { background: #96ba60; box-shadow: 0 0 8px 1px rgba(150, 186, 96, 0.5); }
@media (prefers-reduced-motion: reduce) {
  .mlecheria canvas { transition: none; }
  .mlecheria__btn { transition: none; }
}
`;

/**
 * El mundo de la cadena láctea campesina, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoLecheria({ tier: tierProp, reducedMotion: rmProp } = {}) {
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mlecheria">
      <style>{CSS}</style>
      <EscenaLecheriaViva tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <div className="mlecheria__panel" role="group" aria-label="La lección de la cadena láctea">
        <p className="mlecheria__kicker">{actual.kicker}</p>
        <p className="mlecheria__texto">{actual.texto}</p>
        <div className="mlecheria__nav">
          <button
            type="button"
            className="mlecheria__btn"
            onClick={() => setPaso((p) => Math.max(0, p - 1))}
            disabled={paso === 0}
            aria-label="Paso anterior"
          >
            ←
          </button>
          <span className="mlecheria__puntos" aria-hidden="true">
            {PASOS.map((p, i) => (
              <span
                key={p.id}
                className={`mlecheria__punto${i === paso ? ' mlecheria__punto--activo' : ''}`}
              />
            ))}
          </span>
          <button
            type="button"
            className="mlecheria__btn"
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
