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
import ESPECIES_DATA from '../data/restauracion-especies.json';

/**
 * Deriva el piso térmico desde la altitud (m s.n.m.) del perfil de la finca.
 * @param {number|null} alt
 * @returns {string|null}
 */
function pisoDesdeAltitud(alt) {
  const a = Number(alt);
  if (alt == null || Number.isNaN(a)) return null;
  if (a >= 3000) return 'paramo_3000';
  if (a >= 2000) return 'frio_2000_3000';
  if (a >= 1000) return 'templado_1000_2000';
  return 'calido_0_1000';
}

/**
 * @param {string} descripcion
 * @param {{ piso?: string, altitud?: number }} [opts]
 * @returns {Object}
 */
export function diagnosticarRestauracion(descripcion, opts = {}) {
  if (!descripcion || descripcion.trim().length < 3) {
    return { arreglo: null, roles: null, especies: null, alertas: [], guardas: [REST_DATA.guardas.pino_eucalipto], sin_datos: true, fuente: REST_DATA.fuente };
  }
  const texto = descripcion.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const alertas = [];
  let arregloId = null;
  // Prioridad: piso/altitud del perfil de la finca; luego señales del texto.
  let piso = opts.piso || pisoDesdeAltitud(opts.altitud);

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
    piso = piso || 'paramo_3000';
    alertas.push(REST_DATA.guardas.paramo_pasivo);
  }
  // Detección por texto solo si el perfil no dio piso (cubre fría/frío, cálido/cálida…).
  if (!piso) {
    if (texto.includes('calid') || texto.includes('tropical')) piso = 'calido_0_1000';
    else if (texto.includes('templad') || texto.includes('andino')) piso = 'templado_1000_2000';
    else if (texto.includes('fri')) piso = 'frio_2000_3000';
  }

  const arreglo = arregloId ? REST_DATA.arreglos.find((a) => a.id === arregloId) : null;
  const roles = piso ? REST_DATA.roles_sucesion[piso] : null;
  const especies = piso ? (ESPECIES_DATA.especies_por_rol[piso] || null) : null;

  if (texto.includes('pino') || texto.includes('eucalipto')) alertas.push(REST_DATA.guardas.pino_eucalipto);
  if (texto.includes('carbono') || texto.includes('pagar') || texto.includes('bonos')) alertas.push(REST_DATA.guardas.bonos_carbono);

  const guardas = [REST_DATA.guardas.pino_eucalipto, REST_DATA.guardas.densidad_excesiva];
  if (!arreglo && !alertas.length && !roles) {
    return { arreglo: null, roles: null, especies, alertas, guardas, sin_datos: true, fuente: REST_DATA.fuente };
  }

  return { arreglo, roles, especies, alertas, guardas, sin_datos: false, fuente: REST_DATA.fuente };
}

/**
 * @param {Object|null} d
 * @returns {string}
 */
export function formatearGroundingRestauracion(d) {
  if (!d || d.sin_datos) return '';
  const partes = [];
  if (d.arreglo) partes.push(`**Arreglo recomendado:** ${d.arreglo.nombre} — ${d.arreglo.detalle} (${d.arreglo.densidad}).`);
  if (d.especies) {
    // No todas las especies de la lista son nativas (p. ej. matarraton/guamo son
    // introducidas de uso agroforestal legitimo) — el rotulo "nativas" aqui era
    // una sobre-generalizacion falsa (audit AUDIT-RESTAURACION-GROUNDING-2026-07-09.md,
    // hallazgo #1/#11). Se deja "verificadas" (existen en el catalogo), no "nativas".
    partes.push('**Sucesion ecologica — especies verificadas de tu piso termico (usa SOLO estas, NO inventes otras):**');
    const fmt = (arr) => arr.map((e) => `${e.nombre} (${e.cientifico})${e.nota ? ` — ${e.nota}` : ''}`).join('; ');
    if (d.especies.pioneras) partes.push(`- Pioneras: ${fmt(d.especies.pioneras)}`);
    if (d.especies.intermedias) partes.push(`- Intermedias: ${fmt(d.especies.intermedias)}`);
    if (d.especies.climax) partes.push(`- Climax: ${fmt(d.especies.climax)}`);
  } else if (d.roles) {
    partes.push('**Sucesion ecologica:**');
    if (d.roles.pioneras) partes.push(`- Pioneras: ${d.roles.pioneras.join(', ')}`);
    if (d.roles.intermedias) partes.push(`- Intermedias: ${d.roles.intermedias.join(', ')}`);
    if (d.roles.climax) partes.push(`- Climax: ${d.roles.climax.join(', ')}`);
  }
  if (d.alertas.length > 0) { partes.push('**ALERTAS:**'); d.alertas.forEach((a) => partes.push(`- ${a}`)); }
  if (d.guardas.length > 0) { partes.push('**GUARDAS:**'); d.guardas.forEach((g) => partes.push(`- ${g}`)); }
  partes.push('IMPORTANTE: recomienda SOLO especies verificadas de la lista anterior (indica si cada una es nativa o introducida, no asumas que todas son nativas); si no hay lista para este piso, dilo y sugiere el vivero local o la CAR. NUNCA inventes nombres de especies.');
  partes.push(`Fuente: ${d.fuente}`);
  return partes.join('\n\n');
}
