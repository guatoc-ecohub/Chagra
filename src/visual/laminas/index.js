/*
 * Librería visual de LÁMINAS DE CUADERNO DE CAMPO de la chagra.
 * Fuente única y reutilizable. Antes de dibujar una lámina, búscala aquí.
 *
 * Una "lámina" es una hoja de papel entera (SVG propio, sin stock ni deps): la
 * mata o la labor dibujada a mano, con su viewBox y su relación de aspecto —
 * NO un ícono cuadrado (para eso está `src/visual/creatures`). Por eso NO
 * comparten la firma size/inline de las criaturas: cada lámina se dibuja a
 * `width:100%` y expone `className` + su propia prop de dominio.
 *
 * Props comunes:
 *   - `className` (string): clases extra sobre el nodo raíz.
 * Props propias por lámina:
 *   - LaminaSiembra   → `activo`: 'tuberculo' | 'esqueje' | 'colino' | null
 *   - LaminaMataEtapa → `etapa` : 'semilla' | 'plantula' | 'juvenil' | 'adulto'
 *                                 | 'floracion' | 'cosecha'
 */
export { default as LaminaSiembra } from './LaminaSiembra.jsx';
export { default as LaminaAporque } from './LaminaAporque.jsx';
export { default as LaminaMaiz } from './LaminaMaiz.jsx';
export { default as LaminaCafeto } from './LaminaCafeto.jsx';
export { default as LaminaMataEtapa } from './LaminaMataEtapa.jsx';

import LaminaSiembra from './LaminaSiembra.jsx';
import LaminaAporque from './LaminaAporque.jsx';
import LaminaMaiz from './LaminaMaiz.jsx';
import LaminaCafeto from './LaminaCafeto.jsx';
import LaminaMataEtapa from './LaminaMataEtapa.jsx';

/* Registro consultable: slug → componente + nombre común + especie/mundo.
   (accesible: aria-hidden = decorativa; role=img = enseña con rótulos). */
export const LAMINAS = {
  siembra: {
    Component: LaminaSiembra,
    nombre: 'Formas de siembra',
    especie: 'Tubérculos y raíces (varias)',
    accesible: 'decorativa',
  },
  aporque: {
    Component: LaminaAporque,
    nombre: 'El aporque (en corte)',
    especie: 'Tubérculos y raíces (varias)',
    accesible: 'decorativa',
  },
  maiz: {
    Component: LaminaMaiz,
    nombre: 'La mata de maíz',
    especie: 'Zea mays',
    accesible: 'enseña',
  },
  cafeto: {
    Component: LaminaCafeto,
    nombre: 'El cafeto',
    especie: 'Coffea arabica',
    accesible: 'enseña',
  },
  'mata-etapa': {
    Component: LaminaMataEtapa,
    nombre: 'La mata por etapa (viva)',
    especie: 'Solanum lycopersicum',
    accesible: 'decorativa',
  },
};
