/**
 * T43 — Validación de formularios en tiempo real con feedback visual.
 *
 * Validaciones ligeras, sin librerías. Español campesino.
 * Uso: validarCampo(valor, reglas) → { ok, mensaje }
 */
const MENSAJES = {
  requerido: 'Este campo es obligatorio.',
  cantidadPositiva: 'La cantidad debe ser mayor que cero.',
  fechaNoFutura: 'La fecha no puede ser futura.',
  especieRequerida: 'Seleccione una especie del catálogo.',
  nombreMinimo: 'Escriba al menos 2 caracteres.',
};

/**
 * @param {any} valor
 * @param {Array<'requerido'|'cantidadPositiva'|'fechaNoFutura'|'especieRequerida'|'nombreMinimo'>} reglas
 * @returns {{ ok: boolean, mensaje: string|null }}
 */
export function validarCampo(valor, reglas = []) {
  for (const r of reglas) {
    if (r === 'requerido' && (!valor || (typeof valor === 'string' && !valor.trim()))) {
      return { ok: false, mensaje: MENSAJES.requerido };
    }
    if (r === 'cantidadPositiva' && (!valor || Number(valor) <= 0)) {
      return { ok: false, mensaje: MENSAJES.cantidadPositiva };
    }
    if (r === 'fechaNoFutura' && valor) {
      const d = new Date(valor);
      if (d > new Date()) return { ok: false, mensaje: MENSAJES.fechaNoFutura };
    }
    if (r === 'especieRequerida' && !valor) {
      return { ok: false, mensaje: MENSAJES.especieRequerida };
    }
    if (r === 'nombreMinimo' && (!valor || String(valor).trim().length < 2)) {
      return { ok: false, mensaje: MENSAJES.nombreMinimo };
    }
  }
  return { ok: true, mensaje: null };
}

/**
 * @param {boolean} ok
 * @returns {string} clases CSS para el borde del input
 */
export function claseBorde(ok) {
  return ok === false ? 'border-rose-500 focus:border-rose-400' : 'border-slate-700 focus:border-emerald-600';
}
