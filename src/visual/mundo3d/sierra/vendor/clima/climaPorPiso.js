/* VENDORIZADO desde ~/demos/3d/lib3d/clima/climaPorPiso.js (2026-09-04).
 * El original vive en el valle (vanilla, servido en vivo); esta copia la usa
 * la Sierra y la PWA. El test __tests__/climaPorPiso.vendor.test.js exige
 * (a) cuerpo byte-a-byte igual al original y (b) que sus cotas, umbrales y
 * franja coincidan con los canónicos de ESTE repo (pisosTermicos.js,
 * alertThresholds.js, sierra/descensoSierra.js). Re-sincronizar:
 *   cp ~/demos/3d/lib3d/clima/climaPorPiso.js src/visual/mundo3d/sierra/vendor/clima/climaPorPiso.js
 *   (restaurar esta cabecera y actualizar SHA_CUERPO)
 */
/* ── INICIO COPIA VERBATIM ── */
// ── lib3d/clima/climaPorPiso.js — CLIMA POR PISO TÉRMICO, dato puro ──────────
// Cero three, cero React, cero DOM. Lo consumen el valle 3D (clima.js,
// clima-vivo.js), la Sierra (chagra: sierra/vendor/clima/, con test de igualdad)
// y la 2D (velo CSS, CieloENSO). Diseño: ops/DISENO-SSOT-CLIMA-deepseek.md;
// hex: ops/DIRECCION-ARTE-CLIMA-20260903.md §2.2, ops/DIRECCION-CIELO-Y-NUBE-
// 20260904.md §2.2/§2.4, ops/DIRECCION-HELADA-20260904.md §5/§6.
//
// LA CONTRADICCIÓN «4 PISOS vs 7 COTAS», CERRADA AQUÍ Y EN UN SOLO LUGAR:
//   · Las 7 cotas (PISOS_TERMICOS_SIERRA, chagra PR #3102) son GEOGRAFÍA: la
//     Sierra las dibuja, el descenso las recorre. Se copian abajo como
//     COTAS_MSNM y un test (climaPorPiso.test.mjs) exige que encadenen 0→5775.
//   · Los 4 pisos de FINCA (cálido · templado · frío · páramo) son a quien se
//     le avisa. `pisoDeFinca()` es la ÚNICA función que colapsa 7 → 4:
//     playa+bosque seco → cálido; superpáramo+nival → PÁRAMO (arriba de 4000 m
//     nadie siembra; para clima y alertas heredan las reglas del páramo — y
//     NUNCA el `default: 3` de alertThresholds, que sería MENOS estricto que el
//     páramo estando más arriba).
//
// REGLA DURA (climatólogo): El Niño en piso FRÍO/PÁRAMO = MÁS heladas, no
// sequía. El cielo despejado enfría de noche por irradiación; el Niño 2015-16
// costó ≈ 25 000 t de papa (ensoContext.js:70). Consultar `sol` en frío bajo
// Niño DEVUELVE `helada` como fenómeno efectivo (aviso). El ámbar 0xe1a06e solo
// existe en cálido/templado.

export const CUMBRE_M = 5775;

/** Las 7 cotas canónicas (copiadas de chagra `PISOS_TERMICOS_SIERRA`, #3102). */
export const COTAS_MSNM = Object.freeze([
  { id: 'playa', min: 0, max: 300, finca: 'calido', nombre: 'Playa y costa' },
  { id: 'calido_seco', min: 300, max: 1000, finca: 'calido', nombre: 'Bosque seco' },
  { id: 'templado', min: 1000, max: 2000, finca: 'templado', nombre: 'Selva húmeda' },
  { id: 'frio', min: 2000, max: 3000, finca: 'frio', nombre: 'Bosque de niebla' },
  { id: 'paramo', min: 3000, max: 4000, finca: 'paramo', nombre: 'Páramo y frailejones' },
  { id: 'superparamo', min: 4000, max: 4800, finca: 'paramo', nombre: 'Superpáramo' },
  { id: 'nival', min: 4800, max: CUMBRE_M, finca: 'paramo', nombre: 'Nieve perpetua' },
]);
export const LINEA_NIEVE_M = 4800;
export const PISOS_FINCA = Object.freeze(['calido', 'templado', 'frio', 'paramo']);

/** Cota geográfica (una de las 7) por altitud. null si no es número. */
export function pisoGeo(msnm) {
  const n = Number(msnm);
  if (!Number.isFinite(n)) return null;
  if (n < 0) return COTAS_MSNM[0].id;
  const ultima = COTAS_MSNM[COTAS_MSNM.length - 1];
  if (n >= ultima.max) return ultima.id;
  return (COTAS_MSNM.find((c) => n >= c.min && n < c.max) || ultima).id;
}

/**
 * Piso de FINCA (4) desde una altitud, un id geográfico (7) o un id de finca.
 * Es la única función que colapsa. Devuelve null si no sabe (anti-fabricación).
 */
export function pisoDeFinca(x) {
  if (x == null) return null;
  if (typeof x === 'number') { const g = pisoGeo(x); return g ? pisoDeFinca(g) : null; }
  const s = String(x).trim().toLowerCase();
  if (s === '') return null;
  if (PISOS_FINCA.includes(s)) return s;
  const c = COTAS_MSNM.find((k) => k.id === s);
  if (c) return c.finca;
  const n = Number(s);
  return Number.isFinite(n) ? pisoDeFinca(n) : null;
}

/** Umbral de mínima diaria que amenaza helada, por piso de finca (= chagra alertThresholds.js HELADA_MIN_C). */
export const HELADA_MIN_C = Object.freeze({ paramo: 6, frio: 4, templado: 2, calido: 1 });

/** Turbidez del cielo despejado por piso (DIRECCION-CIELO §2.4) y del cubierto. */
export const TURBIDEZ_DESPEJADO = Object.freeze({ calido: 7, templado: 4.5, frio: 3.4, paramo: 2.3 });
export const TURBIDEZ_CUBIERTO = 16;

/** Elevación del sol que cada clima MANUAL pide (grados). La hora dorada es hora, no clima. */
export const SOL_POR_CLIMA = Object.freeze({ sol: 40, arcoiris: 9, lluvia: null, niebla: null, helada: -2 });

/**
 * La franja de condensación (dónde vive la nube). Copia de
 * chagra `sierra/descensoSierra.js::franjaCondensacion` (misma aritmética; el
 * test vendor de chagra exige igualdad). Bajo El Niño SUBE y se adelgaza.
 */
export function franjaCondensacion(fase = 'neutral', humedad = null) {
  const f = String(fase || 'neutral').toLowerCase();
  let cota = 2500, sigma = 520, amplitud = 1;
  if (f === 'el_nino' || f === 'nino') { cota += 380; sigma *= 0.72; amplitud *= 0.62; }
  else if (f === 'la_nina' || f === 'nina') { cota -= 260; sigma *= 1.18; amplitud *= 1.15; }
  if (typeof humedad === 'number' && Number.isFinite(humedad)) {
    const h = Math.min(100, Math.max(0, humedad));
    cota += (70 - h) * 6;
    amplitud *= Math.min(1.35, Math.max(0.5, 0.55 + h / 120));
  }
  return { cota, sigma, amplitud };
}

/* ── PALETA por piso (M = medido en foto del operador · D = derivado por regla) ── */
export const PALETA = Object.freeze({
  calido: {
    cielo: { cenit: '#5a95d2', medio: '#93b8dc', horizonte: '#d9e2e6' },
    nube: { tipo: 'cumulo', lomo: '#f4f6f8', panza: '#9aa3ad', base: '#8e97a3', rotura: '#eef2f5' },
    aire: '#c9c4b8', haze: '#e8e2d3', lluvia: { cielo: '#5f6478', estilo: 'aguacero' },
    luz: { dir: '#fff4e6', hemiSky: '#93b8dc', hemiGnd: '#3a3a2e' },
    nino: { ambar: '#e1a06e', polvo: '#c9c4b8' },
  },
  templado: {
    cielo: { cenit: '#4f88c8', medio: '#98b1cf', horizonte: '#d3dce3' },
    nube: { tipo: 'cumulo-estrato', lomo: '#e9eef5', panza: '#a6b0c2', base: '#98a3b6', rotura: '#e8edf4' },
    aire: '#b7bcc1', haze: '#dfe4e6', lluvia: { cielo: '#6a7080', estilo: 'oblicua' },
    luz: { dir: '#fff4e6', hemiSky: '#98b1cf', hemiGnd: '#33402e' },
    nino: { ambar: '#e1a06e', polvo: '#c4bfb3' },
  },
  frio: {
    cielo: { cenit: '#5b86bd', medio: '#9ca3b1' /* M */, horizonte: '#c9d0d8' },
    nube: { tipo: 'estrato-cresta', lomo: '#d4def7' /* M */, panza: '#aebad4' /* M */, base: '#a1abc4' /* M */, rotura: '#e6ecf6' },
    aire: '#9aa0a6' /* M #848482 sin aplastar el verde */, haze: '#dbe7ec', lluvia: { cielo: '#7d8899', estilo: 'llovizna' },
    luz: { dir: '#fff4e6', hemiSky: '#9ec4e8', hemiGnd: '#2e3a2e' },
    helada: {
      mantoSombra: '#c9d6e8', mantoSol: '#f4f8ff', mantoTecho: '#dfe8f2', vena: '#31507a',
      aireFrioNoche: '#7f8ea8', aireFrioAlba: '#8b9ab4', vaho: '#dbe9f4', vahoRio: '#e4edf5', agua: '#3b4a5c',
      cieloCenitAlba: '#1c2f5e', cieloMedioAlba: '#5c78a8', sombraTierra: '#5b6b8c', cintaRosa: '#e5b8b0',
      horizonteSol: '#f3d9b8', luzDirAlba: '#fff1d6', luzHemiSky: '#8fa3c6', luzHemiGnd: '#2a3140', hazeAlba: '#cfd8e6',
      quemadoD0: '#3b4a3a', quemadoD1: '#6f5a3e', quemadoD2: '#8b6b45', quemadoBorde: '#5a4630',
    },
    nino: { ambar: null /* PROHIBIDO en frío */, turbidezFactor: 0.85 },
  },
  paramo: {
    cielo: { cenit: '#3a6fb0', medio: '#8aa0bd', horizonte: '#c4ccd4' },
    nube: { tipo: 'niebla-al-ojo', lomo: '#dfe5ec', panza: '#b9c4d1', base: null, rotura: null },
    aire: '#b0bac6', haze: '#cdd5dc', lluvia: { cielo: '#8a94a3', estilo: 'horizontal' },
    luz: { dir: '#fff6ec', hemiSky: '#8aa0bd', hemiGnd: '#2c3226' },
    helada: { mantoSombra: '#c9d6e8', mantoSol: '#f4f8ff', aireFrioNoche: '#7f8ea8', aireFrioAlba: '#8b9ab4', vaho: '#dbe9f4', cintaRosa: '#e5b8b0', sombraTierra: '#5b6b8c' },
    nino: { ambar: null, turbidezFactor: 0.85 },
  },
});
// No hay clave `hoja` a propósito: el verde de la vegetación no lo tiñe el clima
// (única excepción: el quemado de la helada, que es la hoja la que cambió).

/** ¿El Niño se pinta como calor/polvo (ámbar) en este piso? Solo cálido y templado. */
export function ninoPintaCalor(piso) {
  const p = pisoDeFinca(piso);
  return p === 'calido' || p === 'templado';
}

/**
 * Qué fenómeno DIBUJA el motor dado lo que se consulta. Implementa la regla dura:
 * en frío/páramo, `sol` bajo El Niño devuelve `helada` (aviso: noche despejada).
 * `enso`: 'neutro'|'nino'|'nina' (acepta el_nino/la_nina/neutral).
 * @param {{ piso?: string|number|null, fenomeno?: string, enso?: string }} [consulta]
 * @returns {string}
 */
export function fenomenoEfectivo({ piso, fenomeno, enso = 'neutro' } = {}) {
  const p = pisoDeFinca(piso);
  const e = String(enso || 'neutro').toLowerCase().includes('nino') && !String(enso).toLowerCase().includes('nina') ? 'nino'
    : String(enso || '').toLowerCase().includes('nina') ? 'nina' : 'neutro';
  const f = String(fenomeno || 'sol').toLowerCase();
  if ((p === 'frio' || p === 'paramo') && f === 'sol' && e === 'nino') return 'helada';
  if ((p === 'calido' || p === 'templado') && f === 'helada') return 'sol'; // en cálido/templado la helada no existe: si el dato la trae es error del dato
  if (p === 'paramo' && f === 'nube') return 'niebla'; // en páramo la nube es el sitio
  return f;
}

/**
 * EL GATE ÚNICO DE LA HELADA (DIRECCION-HELADA §6). Lo consumen todas las
 * superficies. Devuelve { nivel, intensidad }:
 *   nivel: 'no' | 'aviso' | 'rocio' | 'escarcha' | 'negra'
 * · piso cálido/templado → 'no' siempre (templado con tempMin ≤ 2 → 'rocio': brillo sin blanco).
 * · frío/páramo: 'escarcha' exige tempMin ≤ HELADA_MIN_C[piso] Y nubosidad < 40 % Y viento < 10 km/h,
 *   O alerta 'helada' del sidecar. 'negra' = tempMin ≤ −2. Niño SIN dato → 'aviso' (nunca manto).
 * · Sin snapshot ni piso → 'no' (anti-fabricación).
 * @param {{ piso?: string|number|null, tempMin?: number|null, nubosidad?: number|null, viento?: number|null,
 *   alertas?: Array<string|{ tipo?: string, type?: string }>, ensoFamily?: string, hora?: number|null }} [dato]
 * @returns {{ nivel: 'no'|'aviso'|'rocio'|'escarcha'|'negra', intensidad: number }}
 */
export function hayHelada({ piso, tempMin = null, nubosidad = null, viento = null, alertas = [], ensoFamily = 'neutro', hora = null } = {}) {
  const p = pisoDeFinca(piso);
  const nino = String(ensoFamily || '').toLowerCase().includes('nino') && !String(ensoFamily || '').toLowerCase().includes('nina');
  const t = Number.isFinite(Number(tempMin)) && tempMin !== null ? Number(tempMin) : null;
  if (!p) return { nivel: 'no', intensidad: 0 };
  if (p === 'calido') return { nivel: 'no', intensidad: 0 };
  if (p === 'templado') return t !== null && t <= HELADA_MIN_C.templado ? { nivel: 'rocio', intensidad: 0.3 } : { nivel: 'no', intensidad: 0 };
  const alerta = Array.isArray(alertas) && alertas.some((a) => String(typeof a === 'string' ? a : (a?.tipo ?? a?.type ?? '')).toLowerCase().includes('helada'));
  const umbral = HELADA_MIN_C[p];
  const nub = nubosidad === null ? null : Number(nubosidad);
  const vie = viento === null ? null : Number(viento);
  const cieloLimpio = nub === null || nub < 40;
  const calma = vie === null || vie < 10;
  // el MANTO solo existe de H1 a H4 (03:00-09:00 local, DIRECCION-HELADA §4.1/§6);
  // fuera de esa ventana lo que hay es el AVISO (H-1: «esta noche hiela») — la
  // escarcha no se ve de noche (nadie la ilumina) ni sobrevive al mediodía.
  const h = hora === null || hora === undefined ? null : Number(hora);
  const ventanaManto = h === null || !Number.isFinite(h) || (h >= 3 && h < 9);
  if (t !== null && t <= -2 && cieloLimpio) return ventanaManto ? { nivel: 'negra', intensidad: 1 } : { nivel: 'aviso', intensidad: 0 };
  if (alerta || (t !== null && t <= umbral && cieloLimpio && calma)) {
    const i = t === null ? 0.6 : Math.min(1, Math.max(0.25, (umbral - t + 2) / 8));
    return ventanaManto ? { nivel: 'escarcha', intensidad: +i.toFixed(3) } : { nivel: 'aviso', intensidad: 0 };
  }
  if (nino) return { nivel: 'aviso', intensidad: 0 };
  return { nivel: 'no', intensidad: 0 };
}

/**
 * Un solo objeto para el motor: la celda (piso, fenómeno, enso) con lo que cada sistema lee.
 * @param {{ piso?: string|number|null, fenomeno?: string, enso?: string, humedad?: number|null }} [consulta]
 */
export function celdaClima({ piso, fenomeno = 'sol', enso = 'neutro', humedad = null } = {}) {
  const p = pisoDeFinca(piso) || 'frio';
  const ef = fenomenoEfectivo({ piso: p, fenomeno, enso });
  const pal = PALETA[p];
  const franja = franjaCondensacion(enso, humedad);
  const cubierto = ef === 'lluvia' || ef === 'niebla' || ef === 'nube';
  return {
    piso: p, fenomeno: ef, enso,
    cielo: ef === 'helada' ? pal.helada?.cieloMedioAlba ?? pal.cielo.medio : cubierto ? pal.nube.panza : pal.cielo.medio,
    neblina: ef === 'helada' ? pal.helada?.aireFrioAlba ?? pal.haze : pal.haze,
    turbidez: cubierto ? TURBIDEZ_CUBIERTO : TURBIDEZ_DESPEJADO[p] * (ef === 'helada' || (ninoPintaCalor(p) === false && String(enso).includes('nino')) ? 0.85 : 1),
    nieblaDensidad: ef === 'niebla' ? (p === 'paramo' ? 0.6 : 0.4) : ef === 'helada' ? 0.08 : 0.05,
    nieblaCotaMsnm: franja.cota, franja,
    hayHelada: ef === 'helada',
    lluviaEstilo: ef === 'lluvia' ? pal.lluvia.estilo : 'nada',
    vientoFuerza: ef === 'helada' ? 0 : p === 'paramo' ? 0.8 : ef === 'lluvia' ? 0.5 : 0.25,
    nubeTipo: cubierto ? pal.nube.tipo : ef === 'helada' ? 'despejado' : (p === 'frio' ? 'cirro' : 'despejado'),
    ambar: ninoPintaCalor(p) && String(enso).includes('nino') ? pal.nino.ambar : null,
    fenomenoEfectivo: ef,
  };
}
