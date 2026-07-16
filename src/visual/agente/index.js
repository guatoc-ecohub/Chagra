/*
 * src/visual/agente — EL CUERPO VISIBLE DE LA INTELIGENCIA DE CHAGRA.
 *
 * Angelita, la abeja angelita, es la cara del agente que le responde al
 * campesino. Aquí vive SOLO su arte (cuerpo + estados + cadencia); la
 * inteligencia la cablea el host donde viva la conversación (chat, voz).
 *
 *   import { Angelita } from 'src/visual/agente';
 *   <Angelita estado="pensando" confianza={0.8} />
 */
export { Angelita, default } from './Angelita.jsx';
export { AngelitaEntrada, esDiaSoleado } from './AngelitaEntrada.jsx';
export {
  ESTADOS_ANGELITA,
  NIVELES_CONFIANZA,
  POSE_DE_ESTADO,
  ARIA_DE_ESTADO,
  CEJAS_DE_ESTADO,
  MOMENTOS_IDLE,
  estadoCanonico,
  nivelDeConfianza,
  elegirMomentoIdle,
  duracionDeMomento,
} from './angelitaEstados.js';
