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
export { AngelitaGuia } from './AngelitaGuia.jsx';
export { useAngelitaGuia, calcularPuestoGuia } from '../../hooks/useAngelitaGuia.js';
export {
  ESTADOS_AGENTE,
  ESTADOS_COMPAI,
  ESTADOS_CONVERSACIONALES,
  ESTADOS_ANGELITA,
  ESTADOS_DE_PERFIL,
  ALIASES_ESTADO,
  ALIAS_DE_ESTADO,
  ALIAS_ESTADO,
  NIVELES_CONFIANZA,
  POSES_DE_ESTADO,
  POSE_POR_ESTADO,
  POSE_DE_ESTADO,
  CEJAS_POR_ESTADO,
  ARIA_DE_ESTADO,
  ARIA_POR_ESTADO,
  CEJAS_DE_ESTADO,
  TEXTO_POR_ESTADO,
  MOMENTOS_IDLE,
  TEXTO_NO_SE,
  textoDeEstado,
  textoParaEstado,
  ariaDeEstado,
  ariaParaEstado,
  estadoCanonico,
  validarPerfilDeEstados,
  validarMapaDePoses,
  validarPerfil,
  nivelDeConfianza,
  elegirMomentoIdle,
  duracionDeMomento,
} from './angelitaEstados.js';
