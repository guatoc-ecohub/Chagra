/**
 * Utilidades para avisos de Angelita (helpers no-componentes).
 * Separadas de BurbujaAngelita.jsx para satisfacer React Fast Refresh.
 */

const TOPE_AVISO = 105;

/**
 * Un aviso que no se lee de un vistazo no sirve (feedback del operador: "los
 * avisos son muy largos y entre más largos más difíciles de leer"). Se corta
 * en la primera frontera de frase que quepa; si no hay ninguna, en la última
 * palabra completa. Además evita que la máquina de escribir reserve un cajón
 * enorme y vacío mientras arranca.
 */
export function recortarAviso(texto, tope = TOPE_AVISO) {
  const t = String(texto || '').trim();
  if (t.length <= tope) return t;
  const cabe = t.slice(0, tope);
  const frase = Math.max(cabe.lastIndexOf('. '), cabe.lastIndexOf('? '), cabe.lastIndexOf('! '));
  if (frase > tope * 0.45) return t.slice(0, frase + 1).trim();
  const palabra = cabe.lastIndexOf(' ');
  return `${(palabra > 0 ? cabe.slice(0, palabra) : cabe).trim()}…`;
}
