/**
 * glaciarZenodoMeta.js — generador de metadata Zenodo DOI para datasets glaciares.
 *
 * Este módulo construye el objeto JSON de depósito Zenodo para datasets de
 * monitoreo glaciar, protegiendo la autoría del dato y habilitando su citación
 * con DOI persistente.
 *
 * Zenodo es el repositorio de CERN que integra con DOI (DataCite). Este servicio
 * genera metadata Dublin Core mínima pero suficiente para:
 *   - Proteger autoría del dato (guidas/guides de montaña)
 *   - Habilitar citación académica
 *   - Trazabilidad de series temporales de retroceso glacial
 *   - Cumplimiento FAIR básico (Findable, Accessible, Interoperable, Reusable)
 *
 * NO implementa subida HTTP a Zenodo (eso sería otro módulo). Solo genera
 * el objeto de metadata listo para pasar a un cliente Zenodo/REST.
 *
 * @module services/glaciarZenodoMeta
 */

/**
 * Construye metadata Zenodo para un dataset de reportes glaciares.
 *
 * Genera un objeto JSON conforme a la API de depósito Zenodo v10.13.0.
 * Incluye:
 *   - upload_type: dataset
 *   - title (requerido)
 *   - creators[] (requerido, con nombre y afiliación si existe)
 *   - description (generada automáticamente a partir de los reportes)
 *   - keywords (fijos + derivados)
 *   - license (CC-BY-4.0, copyleft forzado por Chagra)
 *   - Dublin Core mínima (publication_date, access_right)
 *
 * @param {object[]} reportes - Array de reportes glaciares (esquema glaciarReportes).
 * @param {object} options - Opciones de metadata
 * @param {string[]} [options.creators] - Array de nombres completos de creadores.
 *   Si no se provee, se extrae de reportes[].guia (deduplicando).
 * @param {string} [options.title] - Título del dataset. Si no se provee, se genera.
 * @param {string} [options.affiliation] - Afiliación por defecto para creadores.
 * @returns {object} Metadata de depósito Zenodo lista para JSON.stringify.
 *
 * @example
 * const meta = buildZenodoMetadata(
 *   [{ guia: 'Ana Pérez', montana: 'cocuy_ritacuba', createdAt: 1640000000000 }],
 *   { title: 'Monitoreo Glaciar Cocuy 2022' }
 * );
 * // → { metadata: { upload_type: 'dataset', title: '...', ... } }
 */
export function buildZenodoMetadata(reportes, options = {}) {
  const reportesArray = Array.isArray(reportes) ? reportes : [];
  const opts = typeof options === 'string' ? { title: options } : options;

  // ── Extraer creators: explícitos o deducidos de reportes[].guia ──
  const creators = Array.isArray(opts.creators) && opts.creators.length > 0
    ? opts.creators.map((c) => (typeof c === 'string' ? { name: c } : c))
    : extractCreatorsFromReportes(reportesArray);

  // ── Título: explícito o generado ──
  const title = opts.title || generateTitle(reportesArray);

  // ── Descripción: generada automáticamente desde los reportes ──
  const description = generateDescription(reportesArray);

  // ── Keywords: fijos + derivados de montañas/paises ──
  const keywords = generateKeywords(reportesArray);

  // ── Fecha: la más reciente entre reportes o hoy ──
  const publicationDate = mostRecentDate(reportesArray);

  // ── Acceso y licencia (CC-BY-4.0 forzado por Chagra) ──
  const accessRight = 'open';
  const license = 'cc-by-4.0';

  return {
    metadata: {
      upload_type: 'dataset',
      title,
      creators,
      description,
      keywords,
      publication_date: publicationDate,
      access_right: accessRight,
      license,
      // Dublin Core básicos (mapeados automáticamente por Zenodo)
      language: 'es',
      version: datasetVersion(reportesArray),
      // @ts-ignore doi is an optional Zenodo metadata field
      doi: opts.doi || undefined, // Si ya se tiene DOI reservado, incluirlo
    },
  };
}

/** Extrae creadores únicos desde reportes[].guia. */
function extractCreatorsFromReportes(reportes) {
  const guias = new Set();
  for (const r of reportes) {
    if (r.guia && typeof r.guia === 'string' && r.guia.trim()) {
      guias.add(r.guia.trim());
    }
  }
  return [...guias].sort().map((name) => ({ name }));
}

/** Genera título desde los reportes (fallback). */
function generateTitle(reportes) {
  if (reportes.length === 0) {
    return 'Dataset de monitoreo glaciar - Chagra';
  }
  const montanas = new Set();
  for (const r of reportes) {
    if (r.montanaLibre) montanas.add(r.montanaLibre);
    else if (r.montana) montanas.add(r.montana);
  }
  const anyo = anyoDeReportes(reportes);
  const montanasStr = [...montanas].slice(0, 3).join(', ');
  return montanasStr
    ? `Monitoreo glaciar ${montanasStr} - ${anyo}`
    : `Dataset de monitoreo glaciar - ${anyo}`;
}

/** Genera descripción automática desde los reportes. */
function generateDescription(reportes) {
  if (reportes.length === 0) {
    return 'Dataset de monitoreo de puntos glaciares generado por Chagra (app agroecológica y de glaciares). Contiene reportes de campo de guías de montaña sobre estado de superficie, dureza del hielo y peligros observados.\n\n**Licencia:** CC-BY-4.0 (uso libre con atribución).';
  }

  const lineas = [
    `Dataset de **${reportes.length} reporte${reportes.length !== 1 ? 's' : ''}** de monitoreo glaciar recolectados vía Chagra.`,
  ];

  // Estadísticas básicas
  const puntos = new Set();
  const montanas = new Set();
  const anyos = new Set();
  for (const r of reportes) {
    if (r.puntoId) puntos.add(r.puntoId);
    if (r.montanaLibre) montanas.add(r.montanaLibre);
    else if (r.montana) montanas.add(r.montana);
    if (r.fechaISO) anyos.add(new Date(r.fechaISO).getFullYear());
  }

  if (montanas.size > 0) {
    lineas.push(`\n**Montañas monitoreadas:** ${[...montanas].join(', ')}`);
  }
  if (puntos.size > 0) {
    lineas.push(`\n**Puntos de monitoreo:** ${puntos.size} punto${puntos.size !== 1 ? 's' : ''} fijos (series temporales de retroceso)`);
  }
  if (anyos.size > 0) {
    lineas.push(`\n**Años de monitoreo:** ${[...anyos].sort().join(', ')}`);
  }

  // Fuentes de los datos
  const creadores = extractCreatorsFromReportes(reportes);
  if (creadores.length > 0) {
    lineas.push(`\n**Guías de montaña colaboradores:** ${creadores.map((c) => c.name).join(', ')}`);
  }

  // Contexto y metodología
  lineas.push('\n**Metodología:**');
  lineas.push('- Cada reporte representa una medición de campo en un punto fijo del borde/glaciar.');
  lineas.push('- Se registra tipo de superficie, dureza (escala mano→piolet), peligros observados y condiciones ambientales.');
  lineas.push('- La repetición de un mismo `puntoId` en el tiempo genera series temporales de retroceso glacial.');
  lineas.push('- Datos recolectados con Chagra, herramienta agroecológica y de glaciares para guías de montaña y comunidades locales.');

  // Trazabilidad
  lineas.push('\n**Trazabilidad:**');
  lineas.push('- Origen: Chagra (app agroecológica y de glaciares)');
  lineas.push('- Licencia: CC-BY-4.0 (uso libre con atribución)');
  lineas.push('- Versión del dataset: ' + datasetVersion(reportes));

  return lineas.join('\n');
}

/** Genera keywords: fijos + derivados de montañas/países. */
function generateKeywords(reportes) {
  const keywords = new Set([
    'glacier',
    'cryosphere',
    'citizen-science',
    'Colombia',
    'glacier-monitoring',
    'ice-hardness',
    'glacier-retreat',
    'mountain-safety',
  ]);

  // Montañas específicas
  const montanasKeys = new Set();
  for (const r of reportes) {
    if (r.montana) montanasKeys.add(r.montana);
  }

  // Mapeo de keys a keywords
  const montanaKeywords = {
    cocuy_ritacuba: 'Sierra-Nevada-del-Cocuy',
    ruiz: 'Nevado-del-Ruiz',
    tolima: 'Nevado-del-Tolima',
    huila: 'Nevado-del-Huila',
    santa_isabel: 'Santa-Isabel',
    sierra_nevada_santa_marta: 'Sierra-Nevada-de-Santa-Marta',
    yanapaccha: 'Cordillera-Blanca',
    huascaran: 'Cordillera-Blanca',
    pisco: 'Cordillera-Blanca',
    chopicalqui: 'Cordillera-Blanca',
    tocllaraju: 'Cordillera-Blanca',
    vallunaraju: 'Cordillera-Blanca',
  };

  for (const key of montanasKeys) {
    const kw = montanaKeywords[key];
    if (kw) keywords.add(kw);
  }

  // Agregar Perú si hay montañas de Perú
  if (montanasKeys.has('yanapaccha') || montanasKeys.has('huascaran') || montanasKeys.has('pisco')) {
    keywords.add('Peru');
    keywords.add('Perú');
  }

  return [...keywords].sort();
}

/** Fecha más reciente entre reportes o hoy en formato ISO. */
function mostRecentDate(reportes) {
  let max = 0;
  for (const r of reportes) {
    if (r.createdAt && r.createdAt > max) max = r.createdAt;
  }
  if (max === 0) max = Date.now();
  return new Date(max).toISOString().split('T')[0]; // YYYY-MM-DD
}

/** Año de los reportes (el más reciente). */
function anyoDeReportes(reportes) {
  let maxTs = 0;
  for (const r of reportes) {
    if (r.createdAt && r.createdAt > maxTs) maxTs = r.createdAt;
  }
  if (maxTs === 0) maxTs = Date.now();
  return new Date(maxTs).getFullYear();
}

/** Versión del dataset basada en timestamp más reciente + conteo. */
function datasetVersion(reportes) {
  const anyo = anyoDeReportes(reportes);
  const count = reportes.length;
  return `${anyo}.${count}`;
}
