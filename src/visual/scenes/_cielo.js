/*
 * Helpers y tablas de la capa cielo paramétrica (interno de la librería). Vive
 * aparte del componente para no romper el fast-refresh de Vite (un archivo con
 * componente no debe exportar también funciones). Lo consume `CieloParametrico`
 * y se re-exporta desde el barrel.
 */

/** ¿Es de noche? (luna + estrellas en vez de sol). */
export function esNoche(cielo) { return cielo?.luz === 'noche'; }

/** ¿Cielo cubierto/lluvia? (velo + nubes densas). */
export function esCubierto(cielo) {
  return cielo?.condicion === 'nublado' || cielo?.condicion === 'lluvia' || cielo?.condicion === 'niebla';
}

/**
 * Tono de luz de la escena: cada tono tiene su cielo (el amanecer y el atardecer
 * —las horas más bellas del campo— dejan de pintarse como mediodía). Mismo dato
 * de siempre (deriveAtmosphere → luz), sin motor nuevo.
 * @returns {'dia'|'noche'|'amanecer'|'atardecer'}
 */
export function tonoLuz(cielo) {
  const l = cielo?.luz;
  return (l === 'noche' || l === 'amanecer' || l === 'atardecer') ? l : 'dia';
}

/**
 * Cielos por escena y por tono de luz [stop alto, stop bajo]. El degradado de la
 * escena acompaña la hora real: dorado al amanecer, brasa al atardecer, fresco
 * al mediodía, navy profundo de noche.
 */
export const CIELOS_ESCENA = {
  finca: {
    dia: ['#7ac3da', '#c8e8cb'],
    amanecer: ['#e9a06c', '#fbe9c2'],
    atardecer: ['#d97a4e', '#f6d99e'],
    noche: ['#121f3d', '#3d5560'],
  },
  balcon: {
    dia: ['#8fd0e8', '#dff0e3'],
    amanecer: ['#eeb083', '#fdeccb'],
    atardecer: ['#e08a5c', '#f9dfae'],
    noche: ['#1d2b4a', '#46566b'],
  },
  invernadero: {
    dia: ['#90cce0', '#d4ecd6'],
    amanecer: ['#edac7e', '#fceac6'],
    atardecer: ['#df845a', '#f8dda8'],
    noche: ['#1d2b4a', '#465a64'],
  },
};

/**
 * CIELOS POR TEMA — la piel del tema DENTRO de la escena. Cada tema fija el cielo
 * interno por tono de luz; se aplica ANTES que la tabla por escena (fallback sin
 * tema). El grade/textura por tema del CSS completa la piel.
 */
export const CIELOS_TEMA = {
  biopunk: {
    dia: ['#16324f', '#2b5a63'],
    amanecer: ['#3b2f5e', '#b06a55'],
    atardecer: ['#3a2440', '#c25c4a'],
    noche: ['#0c1830', '#26404d'],
  },
  // biopunk2 comparte la piel biopunk (mismo cielo interno).
  biopunk2: {
    dia: ['#16324f', '#2b5a63'],
    amanecer: ['#3b2f5e', '#b06a55'],
    atardecer: ['#3a2440', '#c25c4a'],
    noche: ['#0c1830', '#26404d'],
  },
  'verde-vivo': {
    dia: ['#79c9b7', '#e2f0cf'],
    amanecer: ['#ecb27a', '#f6ecc4'],
    atardecer: ['#dd8455', '#f3d99b'],
    noche: ['#183253', '#3e5a63'],
  },
  nature: {
    dia: ['#d9c493', '#f2e8cd'],
    amanecer: ['#e0a066', '#f7e6c0'],
    atardecer: ['#c97a45', '#efd6a0'],
    noche: ['#26243d', '#5a4a58'],
  },
  minimalista: {
    dia: ['#cfdcd2', '#f3f1e8'],
    amanecer: ['#e3c3a3', '#f5eddd'],
    atardecer: ['#d8a887', '#f0e2c8'],
    noche: ['#31394a', '#5d6672'],
  },
};

/** Stops [alto, bajo] del degradado de cielo para una escena y su hora/tema. */
export function cieloEscena(cielo, escena) {
  const tono = tonoLuz(cielo);
  // Piel por tema primero (cielo.tema lo inyecta el hero desde useTheme).
  const porTema = CIELOS_TEMA[cielo?.tema]?.[tono];
  if (porTema) return porTema;
  const mapa = CIELOS_ESCENA[escena] || CIELOS_ESCENA.finca;
  return mapa[tono] || mapa.dia;
}
