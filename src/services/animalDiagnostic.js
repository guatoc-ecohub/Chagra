/**
 * animalDiagnostic — diagnostico pecuario agroecologico.
 *
 * Datos: src/data/animal-diagnostics.json
 * Fuentes publicas: ICA, AGROSAVIA, CIPAV, FEDEGAN, Fenavi, FEDEABEJA, FAO.
 *
 * Guardas criticas: Leucaena PROHIBIDA a monogastricos+equinos,
 * Apis vs meliponas (pillaje), estres termico mortal aves/cerdos.
 */
import ANIMAL_DATA from '../data/animal-diagnostics.json';

/**
 * Margen de tolerancia (m s.n.m.) al filtrar forrajeras por altitud de la
 * finca. Especie con altitud_max=1200 no se descarta de golpe a 1250 msnm —
 * la franja de transición entre pisos térmicos es difusa, no una pared.
 */
const ALTITUD_MARGIN_M = 200;

/**
 * ¿La altitud de la finca cae dentro de [altitud_min, altitud_max] de la
 * forrajera (± ALTITUD_MARGIN_M)? Fix cross_thermal (bench-contaminacion.mjs
 * midió 40% de contaminación, 6/15, 2026-07-10 — AUDIT-INJECTORS-GROUNDING-
 * 2026-07-09.md: `animalDiagnostic` recomendaba forrajeras de CUALQUIER piso
 * térmico sin cruzar contra la altitud de la finca; una finca de páramo
 * podía recibir "Botón de oro (Tithonia diversifolia)", forrajera de
 * 800–1800 msnm que no sobrevive a 3000+).
 *
 * GRACEFUL: si la forrajera no trae altitud_min/altitud_max (subproductos
 * como plátano de rechazo, yuca cocida, suero, larva BSF — no se "siembran"
 * en la finca, se consiguen igual sin importar el piso) o si no hay altitud
 * de finca conocida (perfil sin ubicación), NO filtra — nunca rompe el caso
 * sin ubicación.
 * @param {object} forrajera
 * @param {number|string|null} [altitud]
 * @returns {boolean}
 */
export function forrajeraEnRangoAltitud(forrajera, altitud) {
  const min = forrajera?.altitud_min;
  const max = forrajera?.altitud_max;
  const hasMin = typeof min === 'number' && Number.isFinite(min);
  const hasMax = typeof max === 'number' && Number.isFinite(max);
  if (!hasMin && !hasMax) return true; // sin dato de altitud → no se filtra.
  const alt = altitud != null && altitud !== '' ? Number(altitud) : NaN;
  if (!Number.isFinite(alt)) return true; // sin altitud de finca → no se filtra.
  if (hasMin && alt < min - ALTITUD_MARGIN_M) return false;
  if (hasMax && alt > max + ALTITUD_MARGIN_M) return false;
  return true;
}

/**
 * Resuelve el % maximo de inclusion en dieta de una forrajera segun la
 * especie animal (monogastricos vs equinos vs rumiantes). UNICA fuente de
 * verdad de este mapeo — usada tanto por el filtro de recomendarForraje
 * como por el formateador que inyecta el bloque al LLM, para que nunca
 * diverjan (bug corregido: antes formatearGroundingAnimal mostraba el %
 * de rumiantes a aves/equinos, sobreestimando la dosis segura hasta 3x en
 * forrajeras con antinutricionales como matarraton/cumarina).
 * @param {string} especieId
 * @param {object} f forrajera de ANIMAL_DATA.forrajeras
 * @returns {number}
 */
function maxPctParaEspecie(especieId, f) {
  if (especieId === 'porcino' || especieId === 'cunicola' || especieId === 'avicola') {
    return f.monogastricos_max_pct;
  }
  if (especieId === 'equino') return f.equinos_max_pct;
  return f.rumiantes_max_pct;
}

/** @param {string} descripcion @returns {Object|null} */
export function detectarEspecie(descripcion) {
  if (!descripcion) return null;
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Ordenar por especificidad (mas palabras primero) para que "vacas lecheras"
  // matchee antes que solo "vacas"
  const senales = Object.entries(ANIMAL_DATA.senales_voz)
    .sort((a, b) => b[0].split('_').length - a[0].split('_').length);
  for (const [clave, senal] of senales) {
    const palabras = clave.split('_');
    if (palabras.every((p) => texto.includes(p))) {
      const especie = ANIMAL_DATA.especies.find((e) => e.id === senal.especie);
      return especie ? { ...especie, funcion_detectada: senal.funcion || especie.funcion } : null;
    }
  }
  return null;
}

/**
 * Recomienda forrajeras segun la especie animal, recortadas a las que
 * viven en el piso térmico de la finca (± margen, ver
 * `forrajeraEnRangoAltitud`). `altitud` es opcional — sin ella, no filtra
 * por piso (compatibilidad hacia atrás + grace para fincas sin ubicación).
 * @param {string} especieId
 * @param {number|string|null} [altitud] — msnm de la finca activa.
 * @returns {Array<object>}
 */
export function recomendarForraje(especieId, altitud = null) {
  const forrajes = ANIMAL_DATA.forrajeras.filter(
    (f) => maxPctParaEspecie(especieId, f) > 0 && forrajeraEnRangoAltitud(f, altitud),
  );
  return forrajes;
}

/**
 * @param {string} especieId
 * @param {number|string|null} [altitud] — msnm de la finca activa, recorta
 *   los complementos que SÍ son plantas vivas (azolla/morera/nacedero/botón
 *   de oro) a su piso térmico. Los subproductos comprados/preparados
 *   (plátano de rechazo, yuca cocida, suero, larva BSF) no tienen
 *   altitud_min/altitud_max en el dato → `forrajeraEnRangoAltitud` los deja
 *   pasar siempre (graceful).
 * @returns {Array<object>}
 */
export function recomendarAlimentosPecuarios(especieId, altitud = null) {
  if (especieId !== 'porcino') return [];
  const ids = ['platano_rechazo', 'yuca_cocida', 'suero_leche', 'azolla', 'bsf', 'morera', 'nacedero', 'boton_oro'];
  return ANIMAL_DATA.forrajeras.filter((f) => ids.includes(f.id) && forrajeraEnRangoAltitud(f, altitud));
}

/**
 * Retorna guardas de seguridad especificas para una especie animal.
 * @param {string} especieId
 * @returns {Array<string>}
 */
export function getGuardas(especieId) {
  const guardas = [];
  if (['porcino', 'cunicola', 'avicola', 'equino'].includes(especieId)) {
    guardas.push(ANIMAL_DATA.guardas.leucaena_toxica);
  }
  if (especieId === 'apicola') guardas.push(ANIMAL_DATA.guardas.apis_vs_meliponas);
  if (['avicola', 'porcino'].includes(especieId)) guardas.push(ANIMAL_DATA.guardas.estres_termico);
  if (especieId === 'porcino') {
    guardas.push(ANIMAL_DATA.guardas.porquinaza_bioseguridad);
    guardas.push(ANIMAL_DATA.guardas.reproduccion_porcina);
  }
  guardas.push(ANIMAL_DATA.guardas.normativa_ica);
  return guardas;
}

/**
 * Diagnostica una especie animal a partir de la descripcion del usuario
 * y retorna forrajes y guardas.
 * @param {string} descripcion
 * @param {object} [opts]
 * @param {number|string|null} [opts.altitud] — msnm de la finca activa
 *   (perfil/finca georreferenciada). Recorta las forrajeras/complementos
 *   candidatos a los de su piso térmico (± 200m). Sin este dato, no filtra
 *   (graceful — no rompe el caso sin ubicación).
 * @returns {{especie: object|null, forrajes: Array, guardas: Array, sin_datos: boolean, fuente: string}}
 */
export function diagnosticarAnimal(descripcion, opts = {}) {
  if (!descripcion || descripcion.trim().length < 3) {
    return { especie: null, forrajes: [], guardas: [], sin_datos: true, fuente: ANIMAL_DATA.fuente };
  }
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const especie = detectarEspecie(descripcion);
  if (!especie) {
    return { especie: null, forrajes: [], guardas: [ANIMAL_DATA.guardas.normativa_ica], sin_datos: true, fuente: ANIMAL_DATA.fuente };
  }
  const altitud = opts?.altitud ?? null;
  const forrajes = recomendarForraje(especie.id, altitud);
  const alimentos = recomendarAlimentosPecuarios(especie.id, altitud);
  const guardas = getGuardas(especie.id);

  // Detect Leucaena specifically mentioned
  if (texto.includes('leucaena') && ['porcino', 'cunicola', 'avicola', 'equino'].includes(especie.id)) {
    guardas.unshift(ANIMAL_DATA.guardas.leucaena_toxica);
  }

  return { especie, forrajes, alimentos, guardas, sin_datos: false, fuente: ANIMAL_DATA.fuente };
}

/**
 * Formatea el resultado del diagnostico pecuario en texto legible.
 * @param {object|null} d
 * @returns {string}
 */
export function formatearGroundingAnimal(d) {
  if (!d || d.sin_datos || !d.especie) return '';
  const partes = [];
  partes.push(`**Especie detectada:** ${d.especie.nombre} (${d.especie.funcion_detectada || d.especie.funcion}).`);
  if (d.forrajes.length > 0) {
    partes.push('**Forrajeras recomendadas:**');
    d.forrajes.forEach((f) => partes.push(`- ${f.nombre}: max ${maxPctParaEspecie(d.especie.id, f)}% inclusion. ${f.guarda}`));
  }
  if (Array.isArray(d.alimentos) && d.alimentos.length > 0) {
    partes.push('**Alimentos y complementos para porcinos:**');
    d.alimentos.forEach((f) => {
      if (f.id === 'nacedero' || f.id === 'boton_oro' || f.id === 'morera') {
        partes.push(`- ${f.nombre}: usar como complemento, no como dieta unica. ${f.guarda}`);
      } else {
        partes.push(`- ${f.nombre}: ${f.guarda}`);
      }
    });
  }
  if (d.guardas.length > 0) {
    partes.push('**GUARDAS DE SEGURIDAD:**');
    d.guardas.forEach((g) => partes.push(`- ${g}`));
  }
  partes.push(`Fuente: ${d.fuente}`);
  return partes.join('\n\n');
}
