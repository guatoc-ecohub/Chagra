/**
 * wire3DNav.js — Mapeo navegable de hotspots del valle 3D → rutas 2D de prod.
 *
 * Cada ID de mundo/lugar en el valle 3D (valleData.js LUGARES) se mapea a la
 * ruta del manifiesto (rutasProdChagraApp.js) que DEBE abrirse al hacer tap
 * en el rótulo.
 *
 * La key es el `id` del lugar (ej. 'agua', 'cafe', 'cultivos').
 * El valor es la ruta hash (ej. 'agua', 'cafe', 'mundo_cultivos').
 *
 * Si un ID no está aquí, el rótulo solo enfoca la cámara (comportamiento
 * original) y no navega — se considera "solo exploración 3D sin destino 2D".
 */

/** @type {Record<string, string>} */
export const RUTA_2D_DESDE_3D = {
  // ── La casa del valle (vía SECUNDARIA, fix del operador 2026-07-16,
  //    recableada 2026-07-18): tocar la puerta iluminada lleva al MIRADOR
  //    DE LOS MUNDOS — VitrinaMaestraMundos, la puerta maestra a los 15
  //    mundos 3D por piso térmico (con su viaje Odyssey), no la ventana
  //    plana de antes. La entrada principal a cada mundo sigue siendo su
  //    portal-paisaje directo en el valle. ──
  // La casa mete ADENTRO en 3D (fogón, fermentos y la ventana de los mundos);
  // antes saltaba directo a la vitrina 2D. Bug reportado por el operador.
  casa: 'casa_adentro',

  // ── Mundos principales del valle (valleData.js LUGARES) ─────────
  agua: 'agua',
  // El portal del café lleva al MUNDO 3D (cafetal con sombrío y cereza roja),
  // no a la pantalla 2D de precios. Bug reportado por el operador.
  cafe: 'cafetal_vivo',
  cultivos: 'mundo_cultivos',
  suelo: 'suelo',
  sanidad: 'sanidad_sintoma',
  animales: 'animales',
  clima: 'clima_boletin',
  mercado: 'mercados',
  semillero: 'semilla',
  disenio: 'biodiversidad',
  // Los hongos no tienen pantalla propia todavía: el mundo subterráneo
  // (subsuelo) es su casa 2D hasta entonces (fix del director, DIRECCION #3).
  micorrizas: 'subsuelo',
  // La puerta del páramo en el valle (el frailejonal de la zona fría):
  // abre el mundo del páramo entero.
  paramo: 'diorama_paramo',
  bosque_vivo: 'bosque_vivo',

  // ── Sub-hotspots de cada escena 3D (mundoData.js hotspots con view:) ─
  subsuelo: 'subsuelo',
  salud_suelo: 'salud_suelo',
  cromatografia: 'cromatografia',
  biodiversidad: 'biodiversidad',
  toxicologia: 'toxicologia',
  hortalizas: 'hortalizas',
  animales_gallinas: 'animales_gallinas',
  estiercol: 'estiercol',
  restauracion: 'restauracion',
  asociaciones: 'asociaciones',
  compost: 'compost',
  milpa_cultivo: 'milpa_cultivo',
  directorio: 'directorio',
  calendario_finca: 'calendario_finca',
  animales_abejas: 'animales_abejas',
  animales_vacas: 'animales_vacas',
  animales_conejos: 'animales_conejos',
  animales_caprinos: 'animales_caprinos',
  biopreparados: 'biopreparados',
  semilla: 'semilla',
  poscosecha: 'poscosecha',
  almacenamiento: 'almacenamiento',

  // ── Juegos (de valleData o PENDIENTE_DECISION) ──────────────────
  juego: 'subsuelo',
  milpa: 'milpa',
  defensores: 'defensores',
  doom_finca: 'doom_finca',

  // ── MontanaMundosCampesino (IDs de la montaña) ─────────────────
  heladas: 'clima_boletin',
  glaciar: 'glaciar',
  guardian: 'espiritu_pro',
  corral: 'animales',
  cosecha: 'mi_cosecha',
  vender: 'mercados',
  papa: 'tuberculos',
  rio: 'agua',
  platano: 'platano',
};

/**
 * Dado un ID de mundo/lugar 3D, devuelve la ruta hash 2D a navegar.
 * Si no hay ruta mapeada, devuelve null (el rótulo solo enfoca cámara).
 * @param {string} mundoId
 * @returns {string|null}
 */
export function rutaDesdeMundo3D(mundoId) {
  return RUTA_2D_DESDE_3D[mundoId] || null;
}

/**
 * Navega del 3D a la ruta 2D después de un retardo (para la animación de cámara).
 * @param {string} mundoId
 */
export function navegarDesde3D(mundoId) {
  const ruta = rutaDesdeMundo3D(mundoId);
  if (!ruta) return;
  window.location.hash = '#' + ruta;
}
