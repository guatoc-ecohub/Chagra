/**
 * glaciarCaaml.js — exportación CAAML v6 (SnowProfileIACS) de reportes glaciar.
 *
 * CAAML (Collaborative Australian Avalanche and Climate Laboratory) es el estándar
 * internacional para perfiles de nieve. Esta implementación sigue la v6 con namespace
 * http://caaml.org/Schemas/SnowProfileIACS/v6.
 *
 * Convierte un reporte glaciar con capas[{profundidad,tipoSuperficie,dureza}] a XML
 * CAAML listo para importación en herramientas de análisis de avalanchas y glaciares.
 *
 * Mapeo principal:
 *   - capas[].profundidad → Layer.depthTop (cm)
 *   - capas[].dureza → Layer.hardness.hardnessCode (F/4F/1F/P/K/I/ice)
 *   - capas[].tipoSuperficie → Layer.grainType.primaryType
 *   - reporte → meta, location, profile
 *
 * Usa template strings + escape XML (no hay xmlbuilder2 en deps).
 *
 * @module services/glaciarCaaml
 */

/**
 * Mapeo de códigos de dureza Chagra → CAAML hardnessCode.
 *
 * CAAML define: F (Fist), 4F (Four Fingers), 1F (One Finger), P (Pencil),
 * K (Knife), I (Ice). Nuestro esquema mano→piolet se mapea así:
 */
const DUREZA_TO_CAAML = {
  'F': 'F',      // Fist - Puño
  '4F': '4F',    // Four Fingers - 4 dedos
  '1F': '1F',    // One Finger - 1 dedo
  'P': 'P',      // Pencil - Lápiz
  'K': 'K',      // Knife - Cuchillo
  'H1': 'I',     // Hielo blando → Ice (única categoría para hielo en CAAML)
  'H2': 'I',     // Hielo duro → Ice (no distingue entre hielo blando/duro)
};

/**
 * Mapeo de tipos de superficie Chagra → CAAML grainType.
 *
 * CAAML grainType define tipos principales de granos de nieve/hielo:
 * - 'PP' (Precipitation Particles) - nieve fresca
 * - 'DF' (Depth Hoar) - escarcha de profundidad
 * - 'RG' (Rounded Grains) - nieve vieja/firn
 * - 'FC' (Faceted Crystals) - cristales facéticos
 * - 'IF' (Ice Formations) - formaciones de hielo
 * - 'MF' (Melt Freeze Crust) - costra de derretimiento-congelación
 * - 'SH' (Slab) - lámina
 */
const TIPO_SUPERFICIE_TO_CAAML = {
  'nieve_fresca': 'PP',          // Precipitation Particles
  'firn_neve': 'RG',             // Rounded Grains (firn/nieve vieja)
  'hielo_glaciar_azul': 'IF',    // Ice Formations (hielo glaciar azul)
  'hielo_podrido': 'IF',         // Ice Formations (candle ice = formaciones de hielo)
  'penitentes': 'FC',            // Faceted Crystals (penitentes = cristales facéticos)
  'hielo_cubierto_detritos': 'IF', // Ice Formations (hielo cubierto)
  'hielo_sobreimpuesto': 'MF',   // Melt Freeze Crust (superimposed ice = costra)
};

/**
 * Escapa caracteres especiales para XML seguro.
 * Convierte: < → &lt;, > → &gt;, & → &amp;, " → &quot;, ' → &apos;
 *
 * @param {string} str - string a escapar
 * @returns {string} string escapado seguro para XML
 */
function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Extrae profundidad numérica (cm) desde string rango Chagra.
 *
 * Chagra usa rangos como '0–10 cm', '10–40 cm'. CAAML requiere depthTop
 * (profundidad del tope de la capa) en cm.
 *
 * @param {string} profundidadChagra - rango Chagra (ej: '0–10 cm', '10–40 cm')
 * @returns {number} profundidad del tope en cm, o 0 si no se puede parsear
 */
function parseDepthTop(profundidadChagra) {
  if (!profundidadChagra) return 0;
  
  // Buscar patrones: '0–10', '0-10', '10–40', etc.
  const match = profundidadChagra.match(/(\d+)\s*[–-]\s*\d+/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  // Si es un solo número: '5 cm', '10'
  const singleMatch = profundidadChagra.match(/(\d+)/);
  if (singleMatch && singleMatch[1]) {
    return parseInt(singleMatch[1], 10);
  }
  
  return 0;
}

/**
 * Normaliza código de dureza Chagra a código CAAML.
 *
 * @param {string} durezaChagra - código Chagra (F, 4F, 1F, P, K, H1, H2)
 * @returns {string} código CAAML (F, 4F, 1F, P, K, I)
 */
function normalizeHardness(durezaChagra) {
  return DUREZA_TO_CAAML[durezaChagra] || 'F'; // fallback a Fist (más blando)
}

/**
 * Normaliza tipo de superficie Chagra a grainType CAAML.
 *
 * @param {string} tipoSuperficieChagra - key Chagra (nieve_fresca, firn_neve, etc.)
 * @returns {string} código CAAML grainType (PP, RG, IF, FC, MF, etc.)
 */
function normalizeGrainType(tipoSuperficieChagra) {
  return TIPO_SUPERFICIE_TO_CAAML[tipoSuperficieChagra] || 'RG'; // fallback a Rounded Grains
}

/**
 * Genera string XML de un Layer CAAML.
 *
 * @param {object} capa - capa Chagra { profundidad, tipoSuperficie, dureza }
 * @returns {string} XML string del Layer
 */
function generateLayerXml(capa) {
  const depthTop = parseDepthTop(capa.profundidad);
  const hardnessCode = normalizeHardness(capa.dureza);
  const grainType = normalizeGrainType(capa.tipoSuperficie);
  
  return `    <caaml:layer>
      <caaml:depthTop uom="cm">${depthTop}</caaml:depthTop>
      <caaml:hardness>
        <caaml:hardnessCode>${escapeXml(hardnessCode)}</caaml:hardnessCode>
      </caaml:hardness>
      <caaml:grainType>
        <caaml:primaryType>${escapeXml(grainType)}</caaml:primaryType>
      </caaml:grainType>
    </caaml:layer>`;
}

/**
 * Convierte un reporte glaciar Chagra a XML CAAML v6.
 *
 * @param {object} reporte - reporte glaciar completo con capas
 * @returns {string} XML CAAML completo
 */
export function toCaamlXml(reporte) {
  if (!reporte) {
    throw new Error('Reporte glaciar requerido para exportación CAAML');
  }
  
  const capas = Array.isArray(reporte.capas) ? reporte.capas : [];
  
  // Meta datos del perfil
  const fechaISO = reporte.fechaISO || new Date().toISOString();
  const guia = escapeXml(reporte.guia || 'Desconocido');
  const montana = escapeXml(reporte.montanaLibre || reporte.montana || 'Desconocida');
  const puntoId = escapeXml(reporte.puntoId || 'N/A');
  
  // Ubicación
  const lat = reporte.lat ?? 0;
  const lng = reporte.lng ?? 0;
  const altitud = reporte.altitud ?? 0;
  
  // Condiciones
  const tempSuperficie = reporte.tempSuperficie ?? '';
  const tempAmbiente = reporte.tempAmbiente ?? '';
  const cielo = escapeXml(reporte.cielo || '');
  const viento = escapeXml(reporte.viento || '');
  const notas = escapeXml(reporte.notas || '');
  
  // Generar XML de capas
  const capasXml = capas.length > 0
    ? capas.map((capa) => generateLayerXml(capa)).join('\n')
    : '    <caaml:layer>\n      <caaml:depthTop uom="cm">0</caaml:depthTop>\n      <caaml:hardness>\n        <caaml:hardnessCode>F</caaml:hardnessCode>\n      </caaml:hardness>\n      <caaml:grainType>\n        <caaml:primaryType>PP</caaml:primaryType>\n      </caaml:grainType>\n    </caaml:layer>';
  
  // XML CAAML v6 completo
  return `<?xml version="1.0" encoding="UTF-8"?>
<caaml:SnowProfile xmlns:caaml="http://caaml.org/Schemas/SnowProfileIACS/v6" xmlns:gml="http://www.opengis.net/gml">
  <caaml:metaData>
    <caaml:dateTimeString>${escapeXml(fechaISO)}</caaml:dateTimeString>
    <caaml:observer>
      <caaml:name>${guia}</caaml:name>
    </caaml:observer>
    <caaml:comment>Exportado desde Chagra - Punto ID: ${puntoId} - Montaña: ${montana}</caaml:comment>
  </caaml:metaData>
  <caaml:location>
    <caaml:obsPoint>
      <caaml:position>
        <caaml:point gml:id="point-${puntoId}">
          <gml:pos>${lat} ${lng} ${altitud}</gml:pos>
        </caaml:point>
      </caaml:position>
    </caaml:obsPoint>
  </caaml:location>
  <caaml:profile>
    <caaml:profileDate>${escapeXml(fechaISO)}</caaml:profileDate>
${capasXml}
  </caaml:profile>
  <caaml:custom>
    <caaml:airTemp>${tempAmbiente}°C</caaml:airTemp>
    <caaml:snowTemp>${tempSuperficie}°C</caaml:snowTemp>
    <caaml:skyCondition>${cielo}</caaml:skyCondition>
    <caaml:wind>${viento}</caaml:wind>
    <caaml:notes>${notas}</caaml:notes>
  </caaml:custom>
</caaml:SnowProfile>`;
}

/**
 * Trigger download del archivo CAAML como XML.
 * Crea un Blob y dispara la descarga en el navegador.
 *
 * @param {string} caamlXml - contenido XML CAAML
 * @param {string} [filename] - nombre del archivo (default: chagra_glaciar_{fecha}.xml)
 */
export function downloadCaaml(caamlXml, filename) {
  const blob = new Blob([caamlXml], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `chagra_glaciar_${new Date().toISOString().split('T')[0]}.xml`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export default { toCaamlXml, downloadCaaml };