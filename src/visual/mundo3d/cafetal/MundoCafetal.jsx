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
import PanelPasos from '../PanelPasos.jsx';
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
@media (prefers-reduced-motion: reduce) {
  .mcafetal canvas { transition: none; }
}
`;

/* Acento del cafetal para el panel compartido (café tostado + oro viejo). */
const TEMA_PANEL = {
  fondo: 'rgba(26, 20, 10, 0.68)',
  borde: 'rgba(214, 188, 130, 0.3)',
  tinta: '#f3ecda',
  kicker: '#d9be85',
  acentoA: 'rgba(226, 178, 82, 0.95)',
  acentoB: 'rgba(186, 132, 45, 0.95)',
  tintaAccion: '#241703',
  activo: '#e2b252',
};

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

      <PanelPasos
        etiqueta="La lección del cafetal"
        pasos={PASOS}
        paso={paso}
        onPaso={setPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
