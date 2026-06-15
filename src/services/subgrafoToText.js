/**
 * Convierte un subgrafo (nodos + relaciones) a texto llano para el campesino.
 * @param {object|null} subgrafo
 * @returns {string}
 */
export function subgrafoATextoCampesino(subgrafo) {
  if (!subgrafo?.nodes?.length) return '';
  const partes = [];
  const especies = subgrafo.nodes.filter((n) => n.labels?.includes('Species'));
  const plagas = subgrafo.nodes.filter((n) => n.labels?.includes('Pest'));
  const biopreps = subgrafo.nodes.filter((n) => n.labels?.includes('Biopreparado'));
  if (especies.length) partes.push(`Especies: ${especies.map((e) => e.properties?.nombre_comun || e.properties?.name).filter(Boolean).join(', ')}`);
  if (plagas.length) partes.push(`Plagas: ${plagas.map((p) => p.properties?.nombre_comun || p.properties?.name).filter(Boolean).join(', ')}`);
  if (biopreps.length) partes.push(`Biopreparados: ${biopreps.map((b) => b.properties?.nombre || b.properties?.name).filter(Boolean).join(', ')}`);
  if (subgrafo.relaciones?.length) {
    partes.push(`Relaciones encontradas: ${subgrafo.relaciones.length}`);
    subgrafo.relaciones.slice(0, 5).forEach((r) => {
      partes.push(`  ${r.from} → ${r.rel} → ${r.to}`);
    });
  }
  return partes.join('\n');
}
