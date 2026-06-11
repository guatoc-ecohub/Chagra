/**
 * restauracionDiagnostic — diagnostico de restauracion ecologica (DR-RESTAURACION-1).
 *
 * Fuente: DR-RESTAURACION-1 (2/3 Gemini+Meta, 2026-06-11).
 * Datos: src/data/restauracion.json
 *
 * Guardas: pino/eucalipto NO restauracion, alerta bonos carbono,
 * paramo→pasiva+Ley 1930, retamo NO quemar, densidad excesiva MITO.
 */
import REST_DATA from '../data/restauracion.json';

export function diagnosticarRestauracion(descripcion) {
  if (!descripcion || descripcion.trim().length < 3) {
    return { arreglo: null, roles: null, alertas: [], guardas: [REST_DATA.guardas.pino_eucalipto], sin_datos: true, fuente: REST_DATA.fuente };
  }
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const alertas = [];
  let arregloId = null;
  let piso = null;

  for (const [clave, senal] of Object.entries(REST_DATA.senales_voz)) {
    const palabras = clave.split('_');
    if (palabras.every((p) => texto.includes(p))) {
      if (senal.arreglo) arregloId = senal.arreglo;
      if (senal.alerta) {
        if (senal.alerta === 'bonos_carbono') alertas.push(REST_DATA.guardas.bonos_carbono);
        if (senal.alerta === 'ley_1930') alertas.push(REST_DATA.guardas.paramo_pasivo);
      }
      if (senal.accion === 'erradicar_invasora') alertas.push(REST_DATA.guardas.retamo_no_quemar);
    }
  }

  if (texto.includes('paramo') || texto.includes('frailejon')) {
    piso = 'paramo_3000';
    alertas.push(REST_DATA.guardas.paramo_pasivo);
  } else if (texto.includes('calido') || texto.includes('tropical')) piso = 'calido_0_1000';
  else if (texto.includes('templado') || texto.includes('andino')) piso = 'templado_1000_2000';
  else if (texto.includes('frio')) piso = 'frio_2000_3000';

  const arreglo = arregloId ? REST_DATA.arreglos.find((a) => a.id === arregloId) : null;
  const roles = piso ? REST_DATA.roles_sucesion[piso] : null;

  if (texto.includes('pino') || texto.includes('eucalipto')) alertas.push(REST_DATA.guardas.pino_eucalipto);
  if (texto.includes('carbono') || texto.includes('pagar') || texto.includes('bonos')) alertas.push(REST_DATA.guardas.bonos_carbono);

  const guardas = [REST_DATA.guardas.pino_eucalipto, REST_DATA.guardas.densidad_excesiva];
  if (!arreglo && !alertas.length && !roles) {
    return { arreglo: null, roles: null, alertas, guardas, sin_datos: true, fuente: REST_DATA.fuente };
  }

  return { arreglo, roles, alertas, guardas, sin_datos: false, fuente: REST_DATA.fuente };
}

export function formatearGroundingRestauracion(d) {
  if (!d || d.sin_datos) return '';
  const partes = [];
  if (d.arreglo) partes.push(`**Arreglo recomendado:** ${d.arreglo.nombre} — ${d.arreglo.detalle} (${d.arreglo.densidad}).`);
  if (d.roles) {
    partes.push('**Sucesion ecologica:**');
    if (d.roles.pioneras) partes.push(`- Pioneras: ${d.roles.pioneras.join(', ')}`);
    if (d.roles.intermedias) partes.push(`- Intermedias: ${d.roles.intermedias.join(', ')}`);
    if (d.roles.climax) partes.push(`- Climax: ${d.roles.climax.join(', ')}`);
  }
  if (d.alertas.length > 0) { partes.push('**ALERTAS:**'); d.alertas.forEach((a) => partes.push(`- ${a}`)); }
  if (d.guardas.length > 0) { partes.push('**GUARDAS:**'); d.guardas.forEach((g) => partes.push(`- ${g}`)); }
  partes.push(`Fuente: ${d.fuente}`);
  return partes.join('\n\n');
}
