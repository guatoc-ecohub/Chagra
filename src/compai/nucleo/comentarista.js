/**
 * comentarista — LOS 8 COMENTARISTAS DE MUNDO. Núcleo portable.
 *
 * Extraído de `services/angelitaInteligencia.js` (donde vivía) al núcleo, sin
 * cambiarle una coma al texto: es LA fuente única de qué dice el compAI al
 * husmear un mundo, y ahora la comparten la PWA y el valle de `3d.guatoc.co`.
 * `angelitaInteligencia.js` re-exporta desde aquí — no copia. Ver MANIFIESTO.md.
 *
 * LA REGLA DE LA CASA: cada comentarista sabe hablar CON los datos que tenga y
 * sabe CALLAR HONESTO cuando no los tiene. Ningún builder inventa una cifra —
 * un precio o una dosis inventada le cuesta plata real a un campesino.
 *
 * Los datos se los construye `datosFinca.js` (mismo núcleo).
 *
 * @module compai/nucleo/comentarista
 */

/** Los mundos que este módulo sabe comentar. */
export const MUNDOS_COMENTABLES = /** @type {const} */ ([
  'mis_matas', 'mis_animales', 'clima', 'vender',
  'aprender', 'bosque', 'paramo', 'finca',
]);

/** Un dato "real" de inventario: array no vacío de { name, count>0 }. */
function inventarioReal(lista) {
  return Array.isArray(lista) && lista.some((x) => x && x.name && Number(x.count) > 0);
}

/** El ítem de inventario más numeroso (para aterrizar el comentario). */
function masNumeroso(lista) {
  if (!inventarioReal(lista)) return null;
  return [...lista]
    .filter((x) => x && x.name && Number(x.count) > 0)
    .sort((a, b) => Number(b.count) - Number(a.count))[0];
}

/** Limpia el "#03" del nombre y lo deja en minúscula amable. */
function nombreLimpio(name) {
  return String(name || '').replace(/\s*#\d+\s*$/, '').trim().toLowerCase();
}

/* Cada mundo sabe comentar CON los datos que tenga, y sabe callar honesto
   cuando no los tiene. `datos` es lo que el shell alcanzó a reunir localmente;
   ningún builder inventa cifras — sólo lee lo que le pasan. */
export const COMENTARISTA_MUNDO = {
  mis_matas(datos = {}) {
    const top = masNumeroso(datos.cultivos);
    if (top) {
      const n = Number(top.count);
      const nombre = nombreLimpio(top.name);
      return n > 1
        ? `De sus matas, la que más tiene es ${nombre} — ${n} registradas. ¿Le hacemos seguimiento?`
        : `Tiene ${nombre} registrado en su finca. ¿Le echamos un ojo a cómo va?`;
    }
    return 'Todavía no me ha contado qué tiene sembrado. Cuando registre sus matas, le sigo el rastro a cada una.';
  },

  mis_animales(datos = {}) {
    const top = masNumeroso(datos.especies);
    const total = Number(datos.total);
    if (top) {
      const nombre = nombreLimpio(top.name);
      return `De sus animales, lo que más tiene es ${nombre}. ¿Revisamos cómo van?`;
    }
    if (Number.isFinite(total) && total > 0) {
      return `Tiene ${total} ${total === 1 ? 'animal anotado' : 'animales anotados'}. ¿Los repasamos?`;
    }
    return 'Aquí llevamos sus animales. Cuando anote los suyos, le ayudo con la cría, el alimento y la sanidad.';
  },

  clima(datos = {}) {
    const snap = datos.snapshot;
    const alertas = Array.isArray(snap?.alertas_locales) ? snap.alertas_locales.length : 0;
    if (alertas > 0) {
      return `El parte del clima trae ${alertas} ${alertas === 1 ? 'aviso' : 'avisos'} para su zona. ¿Se los muestro?`;
    }
    const fase = snap?.enso_status?.phase;
    if (fase && typeof datos.describirFase === 'function') {
      const desc = datos.describirFase(fase);
      if (desc && desc !== 'Estado del clima desconocido') {
        return `Por temporada, ${String(desc).toLowerCase()}. El clima del día en su finca manda; ¿le ayudo a leerlo?`;
      }
    }
    return 'No tengo el parte del clima a la mano ahora. Cuando haya señal se lo traigo — y el cielo de su finca siempre manda.';
  },

  vender(datos = {}) {
    // NUNCA inventamos precios. Sólo ofrecemos acompañar la venta.
    const top = masNumeroso(datos.cultivos);
    if (top) {
      const nombre = nombreLimpio(top.name);
      return `Cuando quiera vender, le ayudo a sacar cuentas y a presentar bien su ${nombre}. ¿Empezamos por ahí?`;
    }
    return 'Cuando tenga algo para vender, le ayudo a sacar cuentas y a presentarlo bien. Sin afán.';
  },

  aprender() {
    return '¿Qué quiere aprender hoy? Aquí estoy sin afán — pregúnteme sin pena.';
  },

  bosque() {
    // Verdad general, en pregunta (no es un dato de SU finca).
    return 'El bosque se recupera con paciencia. ¿Le muestro cómo un rastrojo vuelve a ser monte?';
  },

  paramo() {
    // Verdad geográfica segura: del páramo baja el agua de la finca andina.
    return 'Del páramo baja el agua de su finca. ¿Le cuento cómo se cuida ese nacimiento?';
  },

  finca(datos = {}) {
    const top = masNumeroso(datos.cultivos);
    if (top) {
      return 'Aquí está su finca. Toque el mundo que quiera revisar y yo le acompaño.';
    }
    return 'Aquí está su finca. Empecemos por registrar lo que tiene sembrado, y yo le sigo el rastro.';
  },
};

/**
 * Comentario de Angelita al entrar/pasar por un mundo. GROUNDED: usa sólo los
 * datos reales que le pasen; si faltan, cae a un acompañamiento honesto (nunca
 * inventa una cifra ni un dato agronómico).
 *
 * @param {string} mundo — uno de MUNDOS.
 * @param {Object} [datos] — datos reales locales del mundo:
 *   - mis_matas / vender / finca: { cultivos: Array<{name,count}> }
 *   - mis_animales: { especies: Array<{name,count}>, total?: number }
 *   - clima: { snapshot, describirFase?: (phase)=>string }
 * @returns {string|null} el comentario en usted, o null si el mundo no existe.
 */
export function comentarioDeMundo(mundo, datos = {}) {
  const fn = COMENTARISTA_MUNDO[mundo];
  if (!fn) return null;
  return fn(datos);
}

export default { comentarioDeMundo, COMENTARISTA_MUNDO, MUNDOS_COMENTABLES };
