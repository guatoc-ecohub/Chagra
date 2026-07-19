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
import PanelPasos from '../PanelPasos.jsx';
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
@media (prefers-reduced-motion: reduce) {
  .mlecheria canvas { transition: none; }
}
`;

/* Acento del potrero para el panel compartido (pasto y forraje). */
const TEMA_PANEL = {
  fondo: 'rgba(22, 28, 18, 0.68)',
  borde: 'rgba(180, 206, 150, 0.3)',
  tinta: '#f0f3e8',
  kicker: '#b9d68f',
  acentoA: 'rgba(150, 186, 96, 0.95)',
  acentoB: 'rgba(102, 140, 58, 0.95)',
  tintaAccion: '#17230b',
  activo: '#96ba60',
};

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

      <PanelPasos
        etiqueta="La lección de la cadena láctea"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
