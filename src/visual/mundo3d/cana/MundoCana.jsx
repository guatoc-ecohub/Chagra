/*
 * MundoCana — el MUNDO DE LA CAÑA Y EL TRAPICHE completo: la escena + la lección.
 *
 * Mismo contrato de host que MundoCafetal: acepta `{tier, reducedMotion}` (o
 * auto-detecta con decidirTier si se monta suelto), llena a su padre y guarda su
 * estado local.
 *
 * Sobre la escena viven los CINCO PASOS, y están puestos en el orden en que
 * pasan las cosas de verdad: la caña en pie → el corte y la molienda → el
 * bagazo que vuelve como leña → la hornilla y sus pailas → las gaveras. Al
 * final de ese camino, una mata que mide más de cuatro metros terminó siendo un
 * bloque que cabe en la mano. Esa transformación es la lección entera.
 *
 * Cada paso señala SU lugar con un anillo (el `foco`) Y LLEVA LA CÁMARA (la
 * `vista`). Lo segundo importa tanto como lo primero: la altura del cañaveral no
 * se puede contar desde lejos, hay que meterse al pasillo entre surcos y mirar
 * para arriba. El paso 1 hace exactamente eso.
 *
 * Copy en español de Colombia, en "usted".
 *
 * Importa three/@react-three (vía la escena) → montar SOLO perezoso (lazy).
 */
import { useCallback, useMemo, useState } from 'react';
import EscenaCanaTrapiche from './EscenaCanaTrapiche.jsx';
import PanelPasos from '../PanelPasos.jsx';
import { decidirTier, permite3D } from '../deviceTier.js';
import { alturaVega, enTrapiche } from './floraCana.geom.js';

/* Un punto del cañaveral, a ras de suelo. */
const enElLote = (x, z) => /** @type {[number,number,number]} */ ([x, alturaVega(x, z), z]);

/* El pasillo entre dos surcos por donde se mete la cámara en el primer paso.
   1,55 m es la altura de los ojos de una persona parada: desde ahí, y solo
   desde ahí, se entiende que la caña le pasa por encima. */
const PASILLO_X = -8.56;
const OJOS = 1.55;

const PASOS = [
  {
    id: 'canaveral',
    kicker: 'Paso 1 de 5 · El cañaveral',
    texto:
      'Métase al surco y mire para arriba: la caña le pasa por encima. Una caña de trapiche madura pasa de los cuatro metros — más de dos veces usted. Fíjese en el tallo: viene por segmentos, con un nudo entre uno y otro, y en cada nudo hay una yema. De un pedazo de tallo con yemas sale la mata siguiente.',
    foco: enElLote(PASILLO_X, 0),
    vista: {
      pos: [PASILLO_X, alturaVega(PASILLO_X, 6.5) + OJOS, 6.5],
      mira: [PASILLO_X + 0.3, 3.5, -6],
    },
  },
  {
    id: 'molienda',
    kicker: 'Paso 2 de 5 · La molienda',
    texto:
      'La caña se corta, se despunta y se arruma; y de ahí derecho al molino, porque caña cortada que se demora empieza a fermentar y daña la panela. El molino la pasa entre tres masas que la exprimen. Salen dos cosas: el JUGO, que aquí se llama guarapo, y el BAGAZO, que es la fibra ya seca de tanto apretarla.',
    foco: enTrapiche(-4.2, 0, -1.2),
    vista: { pos: [1.2, 2.4, 5.8], mira: [6.3, 1.5, 0.6] },
  },
  {
    id: 'bagazo',
    kicker: 'Paso 3 de 5 · El bagazo',
    texto:
      'Aquí está lo mejor del oficio. El bagazo sale mojado del molino, se apila unas semanas a secar, y seco vuelve a la hornilla como leña. El trapiche se calienta con la misma caña que muele: no le toca comprar combustible ni bajarle un palo al monte. Mire los tres montones y va a ver el mismo bagazo en sus tres momentos.',
    foco: enTrapiche(8.2, 0, 2.0),
    vista: { pos: [22.5, 3.2, 8.0], mira: [17.2, 1.2, 1.8] },
  },
  {
    id: 'hornilla',
    kicker: 'Paso 4 de 5 · La hornilla y las pailas',
    texto:
      'Una sola candela calienta toda la fila. El fuego está en un extremo y la chimenea en el otro, así que cada paila recibe distinto calor: el guarapo entra por la más templada, donde se le retira la CACHAZA — esa espuma verdosa que se lleva la suciedad y que después sirve de abono o de comida para los animales —, y va caminando hacia el fuego mientras se evapora y se vuelve miel. La última, la de al lado de la llama, es la del punteo.',
    foco: enTrapiche(2.3, 0, -1.4),
    vista: { pos: [12.6, 2.6, 6.4], mira: [12.8, 1.5, 0.5] },
  },
  {
    id: 'gaveras',
    kicker: 'Paso 5 de 5 · Las gaveras',
    texto:
      'La miel en su punto se pasa a la batea y se bate: al batirla entra aire, aclara y empieza a granular. Ahí mismo se vacía en las GAVERAS, los moldes de madera, y se deja enfriar. Cuando cuaja se voltea el molde y sale el bloque. De una mata más alta que usted salió algo que cabe en la mano — y eso es todo lo que pasa en un trapiche.',
    foco: enTrapiche(4.3, 0, 2.6),
    vista: { pos: [11.8, 2.2, 9.4], mira: [14.8, 1.2, 4.8] },
  },
];

const CSS = `
.mcana { position: relative; width: 100%; height: 100%; overflow: hidden; background: #e6d6b4; }
.mcana canvas { opacity: 0; transition: opacity 0.9s ease; }
.mcana .cana-canvas--lista canvas, .mcana canvas.cana-canvas--lista { opacity: 1; }
@media (prefers-reduced-motion: reduce) {
  .mcana canvas { transition: none; }
}
`;

/* El acento del trapiche para el panel compartido: el ámbar de la miel sobre el
   pardo quemado de la hornilla. */
const TEMA_PANEL = {
  fondo: 'rgba(30, 17, 9, 0.70)',
  borde: 'rgba(226, 160, 82, 0.30)',
  tinta: '#f6ead6',
  kicker: '#e6b877',
  acentoA: 'rgba(240, 168, 62, 0.95)',
  acentoB: 'rgba(184, 96, 30, 0.95)',
  tintaAccion: '#2a1606',
  activo: '#f0a83e',
};

/**
 * El mundo de la caña y el trapiche panelero, completo: escena + pasos.
 * Montar SOLO perezoso (lazy); llena a su contenedor.
 * @param {{tier?: 'alto'|'medio'|'bajo', reducedMotion?: boolean}} props
 */
export default function MundoCana({ tier: tierProp, reducedMotion: rmProp } = {}) {
  // Contrato de mundos: props del host si llegan; si se monta suelto,
  // auto-detección del equipo (no matar la gama baja).
  const auto = useMemo(() => decidirTier(), []);
  const tier = tierProp ?? (permite3D(auto.tier) ? auto.tier : 'bajo');
  const reducedMotion = rmProp ?? auto.reducedMotion;

  const [paso, setPaso] = useState(0);
  /* El token sube en CADA toque, no solo al cambiar de paso: si el que mira ya
     giró la escena con el dedo y vuelve a tocar el mismo paso, la cámara lo
     lleva otra vez al sitio en vez de quedarse quieta. */
  const [token, setToken] = useState(0);

  const irAlPaso = useCallback((i) => {
    setPaso(i);
    setToken((t) => t + 1);
  }, []);

  const actual = PASOS[paso];

  return (
    <div className="mcana">
      <style>{CSS}</style>
      <EscenaCanaTrapiche
        tier={tier}
        reducedMotion={reducedMotion}
        foco={actual.foco}
        vista={actual.vista}
        vistaToken={token}
      />

      <PanelPasos
        etiqueta="De la caña a la panela"
        pasos={PASOS}
        paso={paso}
        onPaso={irAlPaso}
        tema={TEMA_PANEL}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
