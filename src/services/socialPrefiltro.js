import { expandQueryTokens } from './ragSynonyms';

const PALABRAS_PELIGROSAS = ['glifosato', 'paraquat', 'clorpirifos', 'urea_pura', 'cal_viva', 'formalina', 'arsenico'];
const MITOS_BLOQUEABLES = ['vinagre.*ph', 'bicarbonato.*ph', 'luna.*sembrar', 'luna.*regar', 'varilla.*agua', 'pendulo.*agua'];

export function preFiltroSocial(texto) {
  if (!texto) return { pasar: false, razon: 'vacio' };
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const p of PALABRAS_PELIGROSAS) {
    if (t.includes(p)) return { pasar: false, razon: `bloqueado: menciona ${p}`, severidad: 'alta' };
  }
  for (const m of MITOS_BLOQUEABLES) {
    if (new RegExp(m, 'i').test(t)) return { pasar: false, razon: `bloqueado: posible mito (${m})`, severidad: 'media' };
  }
  return { pasar: true };
}
