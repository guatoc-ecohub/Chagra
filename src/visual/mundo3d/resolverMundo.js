/*
 * resolverMundo — la DECISIÓN 2D/3D del framework, en una función pura.
 *
 * Dado un `mundoId` y un `tier` de equipo, decide QUÉ montar. Es el único punto
 * donde vive la regla "device-tier decide 3D-vs-2D, pero un mundo NO-3D declara
 * un arquetipo 2D directo". Devuelve un PLAN que el host `<Mundo>` ejecuta:
 *
 *   { modo: '3d',    escena, entrada }                 → montar diorama 3D
 *   { modo: '2d',    escena, motivo?, entrada }        → montar arquetipo 2D
 *   { modo: 'ruta',  ruta, entrada }                   → navegar a vista 2D real (escena:null)
 *   { modo: 'ausente', mundoId }                       → el mundo no está registrado
 */
import { MUNDO } from './mundoData.js';
import { ARQUETIPOS, esArquetipo3D } from './arquetipos.js';
import { permite3D } from './deviceTier.js';
import { MUNDO_BY_ID } from '../../components/dashboard/mundosFinca.js';

export function resolverMundo(mundoId, tier = 'alto') {
  const d = MUNDO[mundoId];
  if (!d) return { modo: 'ausente', mundoId };
  if (!d.escena) return { modo: 'ruta', ruta: d.ruta2d || null, entrada: d };

  const arq = ARQUETIPOS[d.escena];
  if (!arq) return { modo: 'ruta', ruta: d.ruta2d || null, entrada: d };

  if (esArquetipo3D(d.escena)) {
    if (permite3D(tier)) return { modo: '3d', escena: d.escena, entrada: d };
    // el equipo no aguanta 3D → cae al ESPEJO 2D del arquetipo (o al declarado)
    const esp = d.fallback2d || { escena: arq.espejo, params: {} };
    return {
      modo: '2d',
      escena: esp.escena,
      motivo: arq.motivo,
      entrada: { ...d, params: { ...(d.params || {}), ...(esp.params || {}) } },
    };
  }

  // arquetipo 2D declarado DIRECTO (mercado, sanidad, ficha de cultivo…)
  return { modo: '2d', escena: d.escena, entrada: d };
}

/** Tinte [fuerte, suave] del mundo, resuelto del manifiesto real (no duplicado). */
export const tinteDeMundo = (id) => MUNDO_BY_ID[id]?.tinte || ['#3f8f4e', '#dcedc9'];

/** Título del mundo, resuelto del manifiesto real. */
export const tituloDeMundo = (id) => MUNDO_BY_ID[id]?.titulo || id;
