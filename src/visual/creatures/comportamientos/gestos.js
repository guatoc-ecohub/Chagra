/*
 * Gestos visuales compartidos por los compais rubber-hose.
 *
 * Estas funciones no dibujan ni animan. Devuelven el contrato declarativo que
 * consume cada creature: `pose` termina en `data-pose` y las reacciones
 * terminan en `data-*`. La cadencia sigue siendo la fuente única CSS.
 */

export const POSES_RUBBERHOSE = Object.freeze([
  'vuela', 'anda', 'camina', 'celebra', 'reposo', 'señala',
]);

const POSE_DEFECTO = 'vuela';

function esPose(valor) {
  return typeof valor === 'string' && POSES_RUBBERHOSE.includes(valor);
}

/** Convierte una pose solicitada en un estado declarativo estable. */
export function aplicarGesto(pose = POSE_DEFECTO, { activo = true } = {}) {
  const nombre = esPose(pose) ? pose : POSE_DEFECTO;
  return Object.freeze({
    nombre,
    pose: activo ? nombre : undefined,
    activo: Boolean(activo),
  });
}

/** Gestos de pose: cada uno es importable sin conocer la especie. */
export const volar = (opciones) => aplicarGesto('vuela', opciones);
export const andar = (opciones) => aplicarGesto('anda', opciones);
export const caminar = (opciones) => aplicarGesto('camina', opciones);
export const celebrar = (opciones) => aplicarGesto('celebra', opciones);
export const reposar = (opciones) => aplicarGesto('reposo', opciones);
export const senalar = (opciones) => aplicarGesto('señala', opciones);

/** Reacciones corporales comunes. */
export const respirar = (activo = true) => ({ evento: 'respira', activo: Boolean(activo) });
export const rascar = (activo = true) => ({ evento: 'rasca', activo: Boolean(activo) });
export const sacudir = (activo = true) => ({ evento: 'sacude', activo: Boolean(activo) });
export const posarse = (activo = true) => ({ evento: 'percha', activo: Boolean(activo) });
export const darVuelta = (activo = true) => ({ evento: 'vuelta', activo: Boolean(activo) });
export const acurrucar = (activo = true) => ({ evento: 'acurruca', activo: Boolean(activo) });

/** Reacciones de Angelita que otros compais pueden implementar con su arte. */
export const mojar = (activo = true) => ({ mojada: Boolean(activo) });
export const tenerSed = (activo = true) => ({ sed: Boolean(activo) });
export const comer = (activo = true) => ({ comiendo: Boolean(activo) });
export const cargarPolen = (activo = true) => ({ polen: Boolean(activo) });
export const usarGafas = (puesta = true) => ({ gafas: puesta });
export const usarCejas = (estilo = null) => ({ cejas: estilo });
export const usarProp = (mundoId = null) => ({ mundoId });

/** Une pequeños estados de gesto sin pisar accidentalmente otras claves. */
export function combinarGestos(...gestos) {
  return gestos.reduce((estado, gesto) => ({ ...estado, ...(gesto || {}) }), {});
}
