/* ─────────────────────────────────────────────────────────────────────────────
 * COPIA VERBATIM VENDORIZADA — NO EDITAR A MANO.
 *
 * Original: `~/demos/3d/lib3d/flora/pisosTermicos.js` (valle). Se trae al bundle
 * de la PWA para el descenso por la Sierra.
 *
 * Licencia: MIT (Sylva / Token-Gremlin), notice completo al pie del archivo.
 * ───────────────────────────────────────────────────────────────────────────── */
/* eslint-disable */
/* ── INICIO COPIA VERBATIM ── */
const REGISTRO = new Map([
  ['frailejon_grandiflora', ['paramo']],
  ['frailejon_argentea', ['paramo']],
  ['frailejon_killipii', ['paramo']],
  ['frailejon_lopezii', ['paramo']],
  ['frailejon_pycnophylla', ['paramo']],
  ['frailejon_uribei', ['paramo']],
]);

function normalizarPiso(piso) {
  return typeof piso === 'string' ? piso.trim().toLowerCase() : '';
}

function normalizarPisos(pisos) {
  const lista = Array.isArray(pisos) ? pisos : [pisos];
  return [...new Set(lista.map(normalizarPiso).filter(Boolean))];
}

export function registrarPisoTermico(componente, pisos) {
  if (!componente) return;
  REGISTRO.set(componente, normalizarPisos(pisos));
}

export function pisosDeComponente(componente) {
  return [...(REGISTRO.get(componente) ?? [])];
}

export function componentesPorPiso(piso) {
  const buscado = normalizarPiso(piso);
  if (!buscado) return [];
  const res = [];
  for (const [componente, pisos] of REGISTRO.entries()) {
    if (pisos.includes(buscado)) res.push(componente);
  }
  return res;
}

export const PISOS_TERMICOS = Object.freeze({
  nieve: 'nieve',
  paramo: 'paramo',
  frio: 'frio',
  templado: 'templado',
  calido: 'calido',
  cualquiera: 'cualquiera',
});
