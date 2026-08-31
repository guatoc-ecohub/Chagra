/*
 * Láminas del DIFERENCIAL DEL DAÑO: plaga vs enfermedad vs deficiencia.
 *
 * Es la confusión que más plata le cuesta al campesino — le echa fungicida a
 * un pulgón, o veneno a una falta de nitrógeno: gasta, no resuelve, y mata a
 * los benéficos. Estas tres láminas enseñan a distinguirlos, a decidir, y
 * también a reconocer cuándo NO se puede saber.
 *
 * Hermana de `src/visual/laminas` (mismo papel, misma tinta, misma firma de
 * props: `width:100%` + `className`, sin `size`/`inline`). Vive aparte porque
 * no es un catálogo de matas: es un módulo con una tesis —el ORDEN del daño—
 * y sus piezas (`formasHoja`, `formasBicho`, `motivosDano`, `paletaDano`) se
 * comparten entre las tres para que LA HOJA sea siempre la misma.
 *
 * Cero dependencias, estáticas, sin animación, rsvg-safe.
 */
export { default as LaminaDiferencial } from './LaminaDiferencial.jsx';
export { default as LaminaLlave } from './LaminaLlave.jsx';
export { default as LaminaDuda } from './LaminaDuda.jsx';

/* Las piezas, por si otro mundo necesita dibujar una hoja con daño y no una
   lámina entera (regla de la casa: NO redibujar la hoja — reusar esta). */
export { HOJA, construirHoja, puntoEnHoja, blob, polvoRoya, mezclarHex } from './formasHoja.js';
export { GUSANO, construirGusano, tubo } from './formasBicho.js';
export {
  HojaBase,
  HojaMini,
  PolvoRoya,
  RoyaPorElHaz,
  ManchaCercospora,
  ManchaAnillos,
  ClorosisHierro,
  ClorosisNitrogeno,
  Gusano,
  Frass,
  Pliego,
  Rotulo,
  Lupa,
  Vineta,
} from './motivosDano.jsx';
export * as PaletaDano from './paletaDano.js';

import LaminaDiferencial from './LaminaDiferencial.jsx';
import LaminaLlave from './LaminaLlave.jsx';
import LaminaDuda from './LaminaDuda.jsx';

/* Registro consultable: slug → componente + qué enseña. Todas "enseñan"
   (role=img con título y descripción): ninguna es decorativa. */
export const LAMINAS_DIFERENCIAL = {
  diferencial: {
    Component: LaminaDiferencial,
    nombre: '¿Plaga, enfermedad o hambre?',
    ensena: 'Los tres daños lado a lado, sobre la misma hoja de café.',
    accesible: 'enseña',
  },
  llave: {
    Component: LaminaLlave,
    nombre: 'La llave: tres pruebas de mano',
    ensena: 'El doblez (simetría), el dedo (forma) y la edad (cuál hoja).',
    accesible: 'enseña',
  },
  duda: {
    Component: LaminaDuda,
    nombre: 'Cuando NO se puede saber',
    ensena: 'Nitrógeno o nematodo: por arriba no se distinguen. Mire la raíz.',
    accesible: 'enseña',
  },
};
