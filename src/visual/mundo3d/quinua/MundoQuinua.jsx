/*
 * MundoQuinua — el MUNDO DE LA QUINUA completo: el quinual navegable + la lección.
 *
 * Mismo contrato de host que MundoPapa/MundoYuca: acepta `{tier, reducedMotion}`
 * (o auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda
 * su estado local. Sobre la escena viven los PASOS: cuatro lecciones cortas que
 * van de mirar el cultivo a poder comerlo — la panoja y sus dos formas, el color
 * como seña de variedad, la cosecha y la trilla, y el lavado de la saponina.
 *
 * El cuarto paso es el que casi nunca se cuenta y el que de verdad hace falta:
 * la quinua no se come recién trillada. Hay que lavarle la saponina, que es
 * amarga. Es el mismo tipo de saber que cierra el mundo de la yuca (la amarga
 * no se come cruda): entre la cosecha y el plato hay un trabajo, y ese trabajo
 * es conocimiento campesino, no un detalle.
 *
 * La cámara NO cambia entre pasos (mismo patrón que el papal y el yucal): lo que
 * se mueve es el anillo del `foco`. Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaQuinuaViva from './EscenaQuinuaViva.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaQuinual, SITIO_TRILLA } from './floraQuinua.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la ladera que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaQuinual(x, z), z];
const PASOS = [
  {
    id: 'panoja',
    kicker: 'Paso 1 de 4 · La panoja',
    texto:
      'Lo que remata cada mata es la PANOJA, y no todas son iguales. La compacta —glomerulada— lleva los granitos apretados contra el eje y se ve maciza. La suelta —amarantiforme— abre sus ramitas y cuelga como una escoba. Mírelas: en este lote están las dos, y saber cuál es cuál es saber qué sembró.',
    foco: enSuelo(-2.4, 2.0),
  },
  {
    id: 'color',
    kicker: 'Paso 2 de 4 · El color no es adorno',
    texto:
      'Ese campo de colores no es una postal: cada mancha es una variedad distinta. Tunkahuán vira a morado y se levanta hasta más de dos metros; Punto Rojo se enciende rojizo; Aurora queda blanca rosada y bajita; Blanca de Jericó se queda verde. Sembrar varias no es capricho — es que si una falla, las otras responden.',
    foco: enSuelo(5.0, -2.4),
  },
  {
    id: 'trilla',
    kicker: 'Paso 3 de 4 · Cortar, trillar, aventar',
    texto:
      'Cuando la panoja seca y el grano ya no se raja con la uña, se corta con hoz y se hace gavilla. En la era se le da garrote sobre la manta para que suelte el grano, y después se avienta: se deja caer al viento, que se lleva la paja y deja la semilla limpia en el suelo.',
    foco: enSuelo(SITIO_TRILLA[0] - 0.4, SITIO_TRILLA[1] + 0.3),
  },
  {
    id: 'lavado',
    kicker: 'Paso 4 de 4 · Lavarle lo amargo',
    texto:
      'Falta lo que casi nadie cuenta: el grano viene forrado en saponina, que es amarga, y así no se come. Se lava y se frota con agua hasta que deje de hacer espuma — esa espuma ES la saponina saliendo. La Blanca de Jericó es la excepción: nace dulce y casi no pide lavado. Por eso hay que saber cuál se sembró.',
    foco: enSuelo(SITIO_TRILLA[0] - 1.9, SITIO_TRILLA[1] + 1.0),
  },
];

const CSS = `
.mquinual { position: relative; width: 100%; height: 100%; overflow: hidden; background: #d6e0d2; }
.mquinual canvas { opacity: 0; transition: opacity 0.9s ease; }
.mquinual .quinual-canvas--lista canvas, .mquinual canvas.quinual-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .mquinual canvas { transition: none; }
}
`;

/* Acento del quinual para el panel compartido. El morado de Tunkahuán manda —
   es el color que hace la foto de este mundo. */
const TEMA_PANEL = {
  fondo: 'rgba(24, 18, 26, 0.72)',
  borde: 'rgba(198, 158, 200, 0.3)',
  tinta: '#f1ecf1',
  kicker: '#d7a9c8',
  acentoA: 'rgba(155, 88, 140, 0.95)',
  acentoB: 'rgba(110, 56, 104, 0.95)',
  tintaAccion: '#f6eef4',
  activo: '#9b588c',
};

/**
 * El mundo del quinual de tierra fría, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoQuinua({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="mquinual">
      <style>{CSS}</style>
      <EscenaQuinuaViva tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección del quinual"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
