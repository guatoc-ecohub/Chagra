// asociacionesFilter — logica de filtrado por rol del modulo Asociaciones/Policultivos.
// Separado de Asociaciones.jsx para no romper react-refresh (only-export-components).
import arquetipos from '../data/asociaciones-arquetipos.json';

function norm(value) {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function roleFromProfile(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  return norm(p.rol) || norm(p.vocacion) || 'campesino';
}

export function filterAsociacionesByRole(items = arquetipos, profile = {}, opts = {}) {
  if (opts.esOperador) return items;
  const role = roleFromProfile(profile);
  return items.filter((item) => Array.isArray(item.rol) && item.rol.map(norm).includes(role));
}
