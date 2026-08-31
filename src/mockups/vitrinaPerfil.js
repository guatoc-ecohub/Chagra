import { construirLugaresValle } from './valle/valleData.js';

export const COPY_VITRINA_PERFIL = Object.freeze({
  agregar: '+ Agregar a mi valle',
  ariaAgregar: (titulo) => `Agregar ${titulo} a mi valle`,
});

/** Distingue el espejo de la finca de los mundos disponibles para conocer. */
export function estadoMundoVitrina(id, perfil) {
  if (id === 'valle') return 'propio';
  const p = perfil && typeof perfil === 'object' ? perfil : {};
  const mundosActivos = Array.isArray(p.mundosActivos) ? p.mundosActivos : [];
  const sinAgregados = { ...p, mundosActivos: [] };
  const propios = new Set(construirLugaresValle(sinAgregados).map((lugar) => lugar.id));
  if (propios.has(id) || (id === 'compost' && propios.has('abono'))) return 'propio';
  if (mundosActivos.includes(id)) return 'agregado';
  return 'conocer';
}
