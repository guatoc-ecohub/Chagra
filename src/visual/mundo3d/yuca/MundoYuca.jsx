/*
 * MundoYuca — el MUNDO DE LA YUCA completo: la loma navegable + la lección.
 *
 * Mismo contrato de host que MundoPapa/MundoCafetal: acepta `{tier,
 * reducedMotion}` (o auto-detecta con decidirTier si se monta suelto), llena a
 * su padre y guarda su estado local. Sobre la escena viven los PASOS: cuatro
 * lecciones cortas que recorren la vuelta entera del cultivo — el tallo que
 * lleva escrita su historia, la siembra por estaca, el arranque de la raíz y la
 * diferencia entre yuca dulce y amarga.
 *
 * El orden no es decorativo: va de RECONOCERLA (el tallo anillado) a SEMBRARLA
 * (la estaca) a COSECHARLA (el arranque) a COMERLA SIN RIESGO (dulce/amarga).
 * El último paso es el que más importa y el que casi nunca se cuenta.
 *
 * La cámara NO cambia entre pasos (mismo patrón que el papal): lo que se mueve
 * es el anillo del `foco`, que señala en la loma el lugar del que habla cada
 * paso. Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useMemo, useState } from 'react';
import EscenaYucaViva from './EscenaYucaViva.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaYucal, SITIO_ARRANQUE, SITIO_ESTACAS } from './floraYuca.geom.js';

/* Los cuatro pasos de la lección. Cada `foco` es el punto de la loma que el
   anillo señala mientras se lee (coordenadas del mundo, y sobre el terreno). */
const enSuelo = (x, z) => [x, alturaYucal(x, z), z];
const PASOS = [
  {
    id: 'tallo',
    kicker: 'Paso 1 de 4 · El tallo que lleva la cuenta',
    texto:
      'Fíjese en el palo: va pelado abajo y con hojas solo arriba, y todo él está anillado de marcas. Cada marca es una hoja que se le cayó. La yuca va soltando la hoja de abajo mientras crece, y en el nudo queda la cicatriz — por eso, mirando el tallo, usted le lee la vida a la mata.',
    foco: enSuelo(-1.6, 1.2),
  },
  {
    id: 'estaca',
    kicker: 'Paso 2 de 4 · Se siembra un palo, no una semilla',
    texto:
      'La yuca no se siembra de semilla: se siembra de ESTACA. Se corta un pedazo de tallo maduro de unos 20 a 25 centímetros, con cinco a siete yemas, y se entierra inclinado. De esas yemas —las mismas que están sobre cada cicatriz— rebrota la mata nueva. La cosecha de mañana sale del tallo de hoy.',
    foco: enSuelo(SITIO_ESTACAS[0], SITIO_ESTACAS[1]),
  },
  {
    id: 'arranque',
    kicker: 'Paso 3 de 4 · El arranque',
    texto:
      'Primero se le corta el tallo y se guarda para semilla. Después se palanquea la mata con el gancho hasta que la tierra afloja, y sale el racimo entero: cuatro, cinco, seis raíces colgando del mismo cuello, de 30 a 50 centímetros cada una. Por fuera parda; por dentro, blanca. Eso es la yuca.',
    foco: enSuelo(SITIO_ARRANQUE[0], SITIO_ARRANQUE[1]),
  },
  {
    id: 'dulce-amarga',
    kicker: 'Paso 4 de 4 · Dulce y amarga',
    texto:
      'Hay yucas dulces y yucas amargas, y la diferencia no es el sabor no más: la amarga carga mucho más compuesto cianogénico, y por eso NUNCA se come cruda. Cocinarla, remojarla o rallarla y exprimirla es lo que la vuelve segura. La dulce necesita menos, pero cocida siempre. Esta es la regla que no se salta.',
    foco: enSuelo(SITIO_ARRANQUE[0] - 2.6, SITIO_ARRANQUE[1] + 1.4),
  },
];

const CSS = `
.myucal { position: relative; width: 100%; height: 100%; overflow: hidden; background: #e3d3b4; }
.myucal canvas { opacity: 0; transition: opacity 0.9s ease; }
.myucal .yucal-canvas--lista canvas, .myucal canvas.yucal-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .myucal canvas { transition: none; }
}
`;

/* Acento del yucal para el panel compartido (tierra roja y follaje de clima
   medio — la paleta del piso cálido, no la del páramo). */
const TEMA_PANEL = {
  fondo: 'rgba(26, 19, 12, 0.72)',
  borde: 'rgba(214, 174, 122, 0.3)',
  tinta: '#f3ece0',
  kicker: '#e0b98a',
  acentoA: 'rgba(206, 138, 74, 0.95)',
  acentoB: 'rgba(160, 96, 48, 0.95)',
  tintaAccion: '#221505',
  activo: '#ce8a4a',
};

/**
 * El mundo de la yuca de clima medio, completo: escena + pasos didácticos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoYuca({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;
  const [paso, setPaso] = useState(0);

  const actual = PASOS[paso];

  return (
    <div className="myucal">
      <style>{CSS}</style>
      <EscenaYucaViva tier={tier} reducedMotion={reducedMotion} foco={actual.foco} />

      <PanelPasos
        etiqueta="La lección del yucal"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
