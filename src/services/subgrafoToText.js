/**
 * Convierte un subgrafo (nodos + relaciones) a texto llano para el campesino.
 *
 * Soporta los labels canónicos del grafo de conocimiento de Chagra: Species,
 * Pest, Biopreparado y Concept (este último появился con el enriquecimiento
 * 2026-07-14 para nodos de tópico: PisoTermico, Micorriza, Polinizador,
 * CambioClimatico, Metabolito, Alelopata). Para Concept se prefieren las
 * propiedades `nombre` y `definicion` (las que trae el export enriquecido).
 * @param {object|null} subgrafo
 * @returns {string}
 */
export function subgrafoATextoCampesino(subgrafo) {
  if (!subgrafo?.nodes?.length) return '';
  const partes = [];
  const especies = subgrafo.nodes.filter((n) => n.labels?.includes('Species'));
  const plagas = subgrafo.nodes.filter((n) => n.labels?.includes('Pest'));
  const biopreps = subgrafo.nodes.filter((n) => n.labels?.includes('Biopreparado'));
  const conceptos = subgrafo.nodes.filter((n) => n.labels?.includes('Concept'));
  if (especies.length) partes.push(`Especies: ${especies.map((e) => e.properties?.nombre_comun || e.properties?.name).filter(Boolean).join(', ')}`);
  if (plagas.length) partes.push(`Plagas: ${plagas.map((p) => p.properties?.nombre_comun || p.properties?.name).filter(Boolean).join(', ')}`);
  if (biopreps.length) partes.push(`Biopreparados: ${biopreps.map((b) => b.properties?.nombre || b.properties?.name).filter(Boolean).join(', ')}`);
  if (conceptos.length) {
    const lista = conceptos
      .map((c) => c.properties?.nombre || c.properties?.name || c.properties?.id)
      .filter(Boolean);
    if (lista.length) partes.push(`Conceptos: ${lista.join(', ')}`);
  }
  if (subgrafo.relaciones?.length) {
    partes.push(`Relaciones encontradas: ${subgrafo.relaciones.length}`);
    subgrafo.relaciones.slice(0, 5).forEach((r) => {
      partes.push(`  ${r.from} → ${r.rel} → ${r.to}`);
    });
  }
  return partes.join('\n');
}
