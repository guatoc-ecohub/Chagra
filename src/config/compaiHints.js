/*
 * compaiHints.js — el mapa ruta → hint contextual del compai (capa BASE:
 * "qué es esta pantalla, dónde estoy, qué puedo hacer aquí").
 *
 * Origen (unificación 2026-08-23): este mapa + `getHintForRuta` vivían dentro
 * de `CompaiOverlay.jsx`. Al retirar el CompaiOverlay de la PWA 2D (un solo
 * compai por pantalla = el AgentFab canónico), su ÚNICO aporte propio —el hint
 * por ruta— se PLIEGA aquí, como fuente única, para que:
 *   - `AgentFab` lo use como la enseñanza en idle (política R3) y en el panel
 *     "Ver" (política R4), y
 *   - lo que quede de `CompaiOverlay` (tests, usos 3D futuros) siga leyendo del
 *     MISMO sitio (cero duplicación de contenido pedagógico).
 *
 * NOTA: los mensajes son la capa BASE (qué es cada pantalla). Los tips VIVOS de
 * finca+pendientes (datos reales del usuario) son una capa ADITIVA aparte (ver
 * `notificacionesInteligentes` en AgentFab). Aquí NO se inventan datos del
 * usuario.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- hints pedagógicos es-CO, deuda i18n preexistente (ADR-050) */

// Objetos reusados por rutas que son la misma pantalla vía alias del manifiesto.
const HINT_CATALOGO = {
  titulo: 'Catálogo de especies',
  descripcion: 'Busque plantas, plagas y enemigos naturales de su región. Toque una ficha para ver cuidados, asociaciones y cómo manejarla.',
};
const HINT_HISTORIAL = {
  titulo: 'Registro de su finca',
  descripcion: 'Aquí están anotadas todas las acciones de su finca: siembras, cosechas, insumos y observaciones, ordenadas por fecha.',
};
const HINT_CULTIVOS = {
  titulo: 'Sus cultivos',
  descripcion: 'Explore por cultivo (café, cacao, plátano, frutales…) y vea el manejo recomendado para su piso térmico.',
};

/**
 * Mapa ruta → hint contextual. La CLAVE es el `path` de la ruta 2D (o su alias)
 * del manifiesto `config/rutasProdChagraApp.js`. Extensible:
 *   - Añadir rutas nuevas (usar el `path` real del manifiesto, o su alias)
 *   - `getHintForRuta` cae a un prefijo (`animales_gallinas` → `animales`) y,
 *     si nada calza, al hint 'default'.
 */
export const RUTA_HINTS = {
  // ── Inicio / agente / perfil ───────────────────────────────────
  dashboard: {
    titulo: 'Bienvenido a su finca',
    descripcion: 'Este es su tablero: aquí ve el clima de hoy, las tareas pendientes y accesos rápidos al Mapa, al Catálogo y a registrar lo que hizo en la finca.',
  },
  agente: {
    titulo: 'Pregúntele a su compai',
    descripcion: 'Escriba o hable y le respondo sobre cultivos, plagas, clima y manejo de su finca. Toque el micrófono para preguntar con la voz.',
  },
  perfil: {
    titulo: 'Su perfil de la finca',
    descripcion: 'Aquí actualiza su ubicación, el tipo de finca, el compai que le acompaña y preferencias como la letra grande.',
  },
  // ── Hoy / evolución ────────────────────────────────────────────
  // descripcion ampliada 2026-09-03 (feedback_pizarra_unico_aviso_compai):
  // recoge las 3 explicaciones que daba <AngelitaGuia> en su paseo autónomo
  // por esta pantalla (alertas/tareas/accesos, retirado — ver
  // HoyEnFincaScreen.jsx) para que se sigan leyendo, ahora en la pizarra.
  hoy_finca: {
    titulo: 'Hoy en la finca',
    descripcion: 'Lo que importa hoy: le aviso apenas algo necesite su atención (helada, plaga, clima raro) — toque la alerta para preguntarme qué hacer. Las tareas siguen la etapa real de sus cultivos, no un calendario genérico. Y desde aquí registra por voz lo que va pasando: entre más anote, mejor la acompaño.',
  },
  evolucion: {
    titulo: 'Cómo va su finca',
    descripcion: 'Vea la evolución de sus cultivos y registros en el tiempo: qué ha sembrado, cosechado y observado mes a mes.',
  },
  // ── Catálogo / especies ────────────────────────────────────────
  directorio: HINT_CATALOGO,
  especies: HINT_CATALOGO,
  plagas: HINT_CATALOGO,
  catalogo: HINT_CATALOGO,
  defensores: {
    titulo: 'Defensores naturales',
    descripcion: 'Los enemigos naturales de las plagas: insectos y aves que le ayudan a cuidar sus cultivos sin químicos.',
  },
  asociaciones: {
    titulo: 'Asociaciones de cultivos',
    descripcion: 'Qué plantas se ayudan entre sí y cuáles no conviene juntar. Para sembrar mejor.',
  },
  // ── Registro de finca ──────────────────────────────────────────
  registro_unificado: {
    titulo: 'Registrar en su finca',
    descripcion: 'Desde aquí anota siembras, cosechas, insumos u observaciones, todo en un solo lugar.',
  },
  sembrar: {
    titulo: 'Registrar una siembra',
    descripcion: 'Anote qué sembró, cuándo y dónde. Queda en el historial de su finca y ayuda a calcular la cosecha.',
  },
  cosechar: {
    titulo: 'Registrar una cosecha',
    descripcion: 'Anote lo que cosechó y cuánto. Así lleva la cuenta de la producción de su finca.',
  },
  insumos: {
    titulo: 'Registrar insumos',
    descripcion: 'Anote los abonos, biopreparados o materiales que aplicó, con la fecha y el lote.',
  },
  observacion: {
    titulo: 'Anotar una observación',
    descripcion: '¿Vio una plaga, una enfermedad o algo raro en un cultivo? Anótelo aquí, con foto si quiere.',
  },
  voz: {
    titulo: 'Registrar con la voz',
    descripcion: 'Hable y yo anoto por usted. Diga qué hizo en la finca y lo guardo en el registro.',
  },
  // ── Mapa / clima / suelo / agua ────────────────────────────────
  mapa: {
    titulo: 'Su finca en el mapa',
    descripcion: 'Toque un lugar para ver el piso térmico, las plantas recomendadas y la lluvia del mes en ese punto.',
  },
  clima_boletin: {
    titulo: 'El clima de su zona',
    descripcion: 'El boletín del tiempo para su finca: lluvia, temperatura y qué esperar los próximos días.',
  },
  agua: {
    titulo: 'El agua de su finca',
    descripcion: 'Aquí ve y anota lo del agua: lluvias, riego y fuentes de su finca.',
  },
  suelo: {
    titulo: 'Su suelo',
    descripcion: 'Información y registros del suelo de su finca: tipo, salud y qué le conviene para mejorarlo.',
  },
  // ── Cultivos / calendario / germinación ────────────────────────
  mundo_cultivos: HINT_CULTIVOS,
  plantas: HINT_CULTIVOS,
  calendario_finca: {
    titulo: 'Calendario de la finca',
    descripcion: 'Vea por fechas qué conviene sembrar, abonar o cosechar según el clima y sus cultivos.',
  },
  germinacion: {
    titulo: 'Germinación',
    descripcion: 'Guía y registro de sus germinadores: qué sembró, cuándo y cómo va cada semilla.',
  },
  // ── Animales / biopreparados ───────────────────────────────────
  animales: {
    titulo: 'Sus animales',
    descripcion: 'Gallinas, cerdos, ganado y abejas. Aquí anota las observaciones y el manejo de cada uno.',
  },
  biopreparados: {
    titulo: 'Biopreparados',
    descripcion: 'Recetas de caldos, biofertilizantes y bioinsumos para su finca, con sus ingredientes y modo de uso.',
  },
  // ── Registro histórico / informes / aprender ───────────────────
  historial: HINT_HISTORIAL,
  bitacora: HINT_HISTORIAL,
  informes: {
    titulo: 'Informes de su finca',
    descripcion: 'Resúmenes de lo que ha registrado: producción, insumos y actividad de su finca.',
  },
  aprende: {
    titulo: 'Aprenda con Chagra',
    descripcion: 'Cursos, juegos y guías sobre agroecología y el manejo de su finca. A su ritmo.',
  },
  default: {
    titulo: 'Su compai está aquí',
    descripcion: 'Su compai le acompaña en Chagra. Toque para obtener ayuda en esta pantalla.',
  },
};

/**
 * Obtiene el hint para una ruta dada. `nombreCompai` personaliza SOLO el hint
 * default (para las rutas sin mensaje propio).
 */
export function getHintForRuta(ruta, nombreCompai = 'Angelita') {
  const hintDefault = {
    ...RUTA_HINTS.default,
    titulo: `${nombreCompai} está aquí`,
    descripcion: `Soy ${nombreCompai}, su compañero en Chagra. Toque para obtener ayuda en esta pantalla.`,
  };

  if (!ruta) {
    return hintDefault;
  }

  if (ruta === 'default') {
    return hintDefault;
  }
  if (RUTA_HINTS[ruta]) {
    return RUTA_HINTS[ruta];
  }

  // Fallback: si es una subruta (p. ej. 'animales_gallinas'), intenta prefijo.
  const prefijo = ruta.split('_')[0];
  if (RUTA_HINTS[prefijo]) {
    return RUTA_HINTS[prefijo];
  }

  return hintDefault;
}
