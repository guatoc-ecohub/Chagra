/*
 * EntsDelValle — los GUARDIANES del gradiente vistos DESDE el valle.
 *
 * El pedido del operador (2026-07-30): cuando el campesino está en su valle,
 * tiene que VER al Ent de su piso térmico — el guardián emergiendo AL FONDO
 * del paisaje como landmark, no en primer plano tapando la finca.
 *
 * LA REGLA (pisosBosqueGradiente.js, dura y pareja): protagonista = el piso
 * del usuario + MÁXIMO UN vecino → nunca más de dos Ents en el cuadro. El
 * protagonista va a todo color; el vecino va `apagado` (la misma jerarquía
 * que ya usa EscenaTresEnts: apagar no es esconder, es dejar de pelear por
 * el ojo). Sin perfil utilizable, el mapeo cae solo a templado (el roble).
 *
 * DÓNDE — la lección del intento archivado (2026-07-18,
 * _archivo/vistaParamo.archivado.jsx): un Ent en el CENTRO de la franja del
 * páramo ([2.2, -7.4]) quedaba amontonado contra los portales y los
 * frailejones. Este NO repite eso: los puestos viven en el FLANCO IZQUIERDO
 * del valle (x ≤ -6.9), lejos de todos los lugares del director (x ≥ -3.2),
 * de las terrazas de papa (ZONA_LADERA_ALTA) y de los parches densos. La
 * cámara de reposo mira desde el frente-derecha ([10.5, 9, 13.5]) → el
 * flanco izquierdo-atrás ES el fondo del cuadro. Composición: monte denso a
 * la derecha, guardianes a la izquierda, la finca viva en el medio.
 *
 * Cada Ent se para EN LA FRANJA DE SU PISO (valleData PISOS_TERMICOS, z por
 * altitud) — el gradiente se cuenta honesto: la queñua en el filo del
 * páramo, el aliso al borde de las terrazas frías (donde de verdad se
 * siembra, fija nitrógeno en las lindes andinas), el roble en el clima
 * medio, la ceiba en la tierra caliente del frente.
 *
 * Presupuesto: EntGradiente son ~8-10 draw calls por árbol (geometría
 * fusionada). Protagonista siempre; el vecino solo en tier medio/alto. Sin
 * lección al pie (`leccion={false}`): las setas del roble y los nódulos del
 * aliso son para el retrato del mundo, acá serían ruido a 15 unidades.
 */
import { useMemo } from 'react';
import EntGradiente from '../../visual/mundo3d/bosque/EntGradiente.jsx';
import {
  MAPA_PISO_ENT,
  protagonistaDePiso,
  vecinoDePiso,
} from '../../visual/mundo3d/bosque/pisosBosqueGradiente.js';

/* El PUESTO de cada guardián en el valle: [x, z] en el flanco izquierdo, DENTRO
   de la franja z de su piso (valleData PISOS_TERMICOS). `escala` compensa la
   altura de fuste de cada especie (quenua 6.9 … ceiba 9.6) para que todos los
   landmarks lean parejo (~5.5-6 u de árbol); `rotY` gira el rostro hacia la
   cámara de reposo del valle (frente-derecha). Privado del módulo (exportarlo
   rompería el fast-refresh del archivo: react-refresh/only-export-components). */
const PUESTOS_ENT_VALLE = Object.freeze({
  calido: { punto: [-7.2, 5.6], escala: 0.6, rotY: 0.74 }, // tierra caliente del frente
  templado: { punto: [-7.7, 0.9], escala: 0.7, rotY: 0.64 }, // clima medio, a la izquierda de la casa
  frio: { punto: [-8.3, -4.5], escala: 0.72, rotY: 0.56 }, // la linde alta de las terrazas de papa
  paramo: { punto: [-6.9, -9.3], escala: 0.85, rotY: 0.48 }, // el filo del páramo, contra la cordillera
});

/* El vecino cede un poco de tamaño además de apagarse: jerarquía doble
   (color + escala) para que el protagonista mande sin que el vecino
   desaparezca. */
const FACTOR_VECINO = 0.85;

/**
 * Los (máximo dos) Ents del valle: el del piso del usuario + su vecino.
 * Montar SOLO dentro del <Canvas> del valle.
 *
 * @param {object} props
 * @param {'calido'|'templado'|'frio'|'paramo'|null} [props.pisoTermico]  el
 *   piso térmico del PERFIL DE LA FINCA (no confundir con el perfil de render
 *   del tier). null/inválido → cae al default del mapeo (templado).
 * @param {(x:number, z:number) => number} props.alturaDe  el terreno del valle.
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 */
export default function EntsDelValle({
  pisoTermico = null,
  alturaDe,
  tier = 'alto',
  reducedMotion = false,
}) {
  const puestos = useMemo(() => {
    const protagonista = protagonistaDePiso(pisoTermico);
    /* En tier bajo el vecino no se monta: la regla dice MÁXIMO dos, y en un
       equipo apretado un solo guardián cuenta el piso igual de bien. */
    const vecino = tier === 'bajo' ? null : vecinoDePiso(protagonista);
    return [
      { piso: protagonista, apagado: false, factor: 1 },
      ...(vecino ? [{ piso: vecino, apagado: true, factor: FACTOR_VECINO }] : []),
    ]
      .map(({ piso, apagado, factor }) => {
        const puesto = PUESTOS_ENT_VALLE[piso];
        const especie = MAPA_PISO_ENT[piso];
        if (!puesto || !especie) return null; // un piso sin tallar no se dibuja
        return { piso, especie, apagado, factor, ...puesto };
      })
      .filter(Boolean);
  }, [pisoTermico, tier]);

  /* El tier del Ent-landmark: a 12-18 u de la cámara, el detalle 'alto' del
     retrato no se distingue — 'medio' rinde igual y cuesta menos (el mismo
     recorte que hacía la vista archivada del páramo). */
  const tierEnt = tier === 'bajo' ? 'bajo' : 'medio';

  return (
    <group name="ents-del-valle">
      {puestos.map(({ piso, especie, apagado, factor, punto, escala, rotY }) => {
        const [x, z] = punto;
        /* Un pelo hundido (-0.05): las raíces agarran la ondulación de la
           ladera en vez de flotar sobre ella. */
        const y = alturaDe(x, z) - 0.05;
        return (
          <group
            key={piso}
            name={`ent-valle-${piso}`}
            position={[x, y, z]}
            rotation={[0, rotY, 0]}
            scale={escala * factor}
          >
            <EntGradiente
              especie={especie}
              tier={tierEnt}
              reducedMotion={reducedMotion}
              apagado={apagado}
              leccion={false}
            />
          </group>
        );
      })}
    </group>
  );
}
