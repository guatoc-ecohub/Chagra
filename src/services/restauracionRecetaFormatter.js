export function formatearRecetaAgroecologica(diagnostico) {
  if (!diagnostico || diagnostico.sin_datos) return '';
  const p = [];
  if (diagnostico.arreglo) p.push(`Arreglo: ${diagnostico.arreglo.nombre} — ${diagnostico.arreglo.detalle}`);
  if (diagnostico.roles) {
    p.push('Sucesion recomendada:');
    if (diagnostico.roles.pioneras) p.push(`  Pioneras: ${diagnostico.roles.pioneras.join(', ')}`);
    if (diagnostico.roles.intermedias) p.push(`  Intermedias: ${diagnostico.roles.intermedias.join(', ')}`);
    if (diagnostico.roles.climax) p.push(`  Climax: ${diagnostico.roles.climax.join(', ')}`);
  }
  if (diagnostico.alertas?.length) { p.push('Alertas:'); diagnostico.alertas.forEach((a) => p.push(`  - ${a}`)); }
  return p.join('\n');
}
