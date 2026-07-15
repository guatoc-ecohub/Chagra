/*
 * botanicas — LÁMINAS BOTÁNICAS: el cuaderno de campo de las 21 matas.
 *
 * Barrel PROPIO, a propósito separado del `../index.js` de la librería
 * hermana: aquellas son láminas de cuaderno dibujadas a mano una por una;
 * éstas salen de un motor procedural con datos verificados detrás. Comparten
 * el oficio (SVG puro, cero dependencias, papel crema y tinta sepia) pero no
 * la firma ni el ciclo de vida, y mezclarlas en un solo barrel habría atado
 * dos cosas que cambian por razones distintas.
 *
 * Uso:
 *
 *   import { LaminaBotanica, POR_ID } from '@/visual/laminas/botanicas';
 *   import '@/visual/laminas/botanicas/laminasBotanicas.css';
 *
 *   <LaminaBotanica especie={POR_ID.papa} numero="I" />
 *
 * o buscando como pregunta la gente (por el nombre que cada quien usa):
 *
 *   import { buscaEspecie } from '@/visual/laminas/botanicas';
 *   <LaminaBotanica especie={buscaEspecie('zapallo')} />
 *
 * Ver ./README.md para la regla de la casa y el mapa del motor.
 */

/* La lámina */
export { default as LaminaBotanica } from './LaminaBotanica.jsx';

/* Los datos: las 21 matas, su procedencia y sus índices */
export { ESPECIES, POR_ID, POR_SINTOMA, COBERTURA, PISO_FRIO, PISO_TEMPLADO, PISO_CALIDO, buscaEspecie, porPiso } from './especies/index.js';

/* Los pintores sueltos: para armar una vista propia sin el pliego entero
   (una ficha de hoja, un corte de fruto en una tarjeta, la raíz en un modal) */
export { PintaHoja, PintaRaiz, PintaFlor, PintaFruto } from './pintores/organos.jsx';
export { PintaHabito, Cota } from './pintores/PintaHabito.jsx';
export { Texto, Rotulo, Fig, Binomio, BarraEscala, Seccion, Parrafo, SelloFuente, SERIF } from './pintores/tipografia.jsx';

/* El motor: para dibujar una mata que todavía no tiene registro */
export { hoja, hojaCompuesta, estipula, PERFILES, BORDES } from './geometria/hoja.js';
export { raiz, NOMBRE_SISTEMA, SISTEMAS } from './geometria/raiz.js';
export { FLORES } from './geometria/flor.js';
export { FRUTOS } from './geometria/fruto.js';
export { SINTOMAS, TIEMPOS } from './geometria/sintoma.js';
export { habito, filotaxia, PORTES, siluetaHumana, manoReferencia, barraEscala, escalaDe } from './geometria/habito.js';

/* La paleta y el azar determinista */
export * as paletaLamina from './nucleo/paletaLamina.js';
export { generador, semilla } from './nucleo/rng.js';
