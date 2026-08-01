/*
 * vistaParamo.archivado.jsx — ARCHIVADO 2026-07-18, pedido del operador.
 *
 * El Ent-queñua MAGNÍFICO parado en el filo, rodeado de frailejones (la
 * "vista del páramo" que antes vivía como acceso decorativo arriba del
 * valle), se veía AMONTONADO en el cuadro general del valle 3D. Se saca de
 * la vista — pero NO se borra: queda completo aquí por si se retoma en otra
 * composición (una vista propia del páramo con más aire, u otro director).
 *
 * OJO — el PORTAL/entrada real al páramo NO estaba aquí y sigue intacto:
 *   · src/mockups/valle/valleData.js LUGARES id:'paramo' — su propio lugar
 *     navegable en el valle, con su rótulo (RotulosLugares) y su patio.
 *   · src/prodApp/wire3DNav.js `paramo: 'diorama_paramo'` — lleva a
 *     MundoParamo3D de verdad.
 * Esta vista archivada tocaba 'disenio' (toda mi finca/bosque), no
 * 'diorama_paramo' — un mundoId distinto al portal real de arriba.
 *
 * Para reactivar:
 *   1. Copiar VISTA_PARAMO de vuelta a
 *      src/visual/mundo3d/direccion/composicionValle.js (§3b).
 *   2. Copiar VistaParamoEnt de vuelta a src/mockups/valle/composicionValle3D.jsx,
 *      con el import de EntQuenua y `alApuntar`/`alSoltar` (o reusar los que
 *      ya viven en ese archivo — son los mismos).
 *   3. Volver a montar <VistaParamoEnt alturaDe={alturaTerreno} tier={tier}
 *      reducedMotion={reducedMotion} onEntrar={...} /> en la <Escena> de
 *      Valle3D.jsx, cerca de <VentanasVivas>.
 *   4. Revisar también los 3 frailejones que lo arropaban en
 *      valleData.js VEGETACION_PISOS (quedaron comentados ahí mismo, con
 *      nota y coordenadas).
 */
import EntQuenua from '../../../visual/mundo3d/bosque/EntQuenua.jsx';

/* Antes vivía en src/visual/mundo3d/direccion/composicionValle.js */
export const VISTA_PARAMO = {
  punto: [2.2, -7.4], // el filo alto, a la derecha de la veleta: se ve entero
  escala: 0.62, // el Ent mide ~6 u a escala 1: aquí corona sin tapar el cielo
  mundoId: 'disenio',
};

/* Cursor-mano al pasar sobre el Ent (antes reusaba el mismo helper de
   composicionValle3D.jsx — se copia acá para que este archivo quede
   autocontenido). */
const alApuntar = (e) => {
  e.stopPropagation();
  document.body.style.cursor = 'pointer';
};
const alSoltar = () => {
  document.body.style.cursor = '';
};

/* Antes vivía en src/mockups/valle/composicionValle3D.jsx, montado en la
   <Escena> de Valle3D.jsx junto a <VentanasVivas>. */
export function VistaParamoEnt({ alturaDe, tier = 'alto', reducedMotion = false, onEntrar = null }) {
  const [x, z] = VISTA_PARAMO.punto;
  const y = alturaDe(x, z);
  const tierEnt = tier === 'bajo' ? 'bajo' : 'medio';
  return (
    <group
      position={[x, y, z]}
      rotation={[0, 0.5, 0]}
      scale={VISTA_PARAMO.escala}
      onClick={
        onEntrar
          ? (e) => {
              e.stopPropagation();
              onEntrar(VISTA_PARAMO.mundoId);
            }
          : undefined
      }
      onPointerOver={onEntrar ? alApuntar : undefined}
      onPointerOut={onEntrar ? alSoltar : undefined}
    >
      <EntQuenua tier={tierEnt} reducedMotion={reducedMotion} />
    </group>
  );
}
