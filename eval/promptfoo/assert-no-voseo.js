// Assertion de Promptfoo que reusa el voseoFilter REAL de Chagra para rechazar
// voseo argentino en la salida del agente. Si el texto filtrado difiere del
// original, hubo voseo → falla con la corrección sugerida.
//
// Es el control que faltaba: la misma herramienta del producto valida los
// tests del agente (y, por extensión, cualquier output en español colombiano).
import { filterVoseo } from '../../src/services/voseoFilter.js';

export default function assertNoVoseo(output) {
  const text = typeof output === 'string' ? output : JSON.stringify(output);
  const filtered = filterVoseo(text);
  const clean = filtered === text;
  return {
    pass: clean,
    score: clean ? 1 : 0,
    reason: clean
      ? 'Sin voseo (español colombiano OK)'
      : `Voseo detectado. Corrección del filtro: "${filtered.slice(0, 240)}"`,
  };
}
