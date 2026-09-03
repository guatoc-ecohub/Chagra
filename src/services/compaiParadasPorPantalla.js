/**
 * compaiParadasPorPantalla — EL REGISTRO de qué elementos de cada pantalla
 * son "funciones" que el compAI puede visitar y comentar (#27).
 *
 * Nace de sacar el patrón que ya vivía ad-hoc en `HoyEnFincaScreen.jsx`
 * (`paradasGuia`, un `useMemo` local con refs+texto) a un lugar único —
 * así el planificador de paseo (`compaiPaseoPlanificador.js`) tiene un
 * catálogo real para elegir destino, en vez de una lista fija sin dueño.
 *
 * CONTRATO (#26 — "lo que toca es lo que comenta"): cada parada trae su
 * PROPIO texto agroecológico, ligado al `id` de la pantalla y al elemento
 * real. El planificador nunca inventa comentarios sueltos de un pool
 * genérico — visita la parada, dice EXACTAMENTE lo que esa parada declaró.
 * Reutiliza la forma `ParadaGuia` de `useAngelitaGuia` (`{id, ref, texto,
 * gesto, tipo, lado}`), con un campo extra:
 *
 *   - `anillo` ('cerca'|'pantalla', default 'pantalla') — a qué anillo del
 *     paseo (#31) pertenece esta parada. Las paradas 'cerca' son las que el
 *     planificador visita primero (funciones junto al puesto); 'pantalla'
 *     son el recorrido más amplio.
 *
 * UNA PANTALLA SE REGISTRA UNA VEZ, típicamente en el propio componente con
 * un `useEffect` de montaje/desmontaje (ver `HoyEnFincaScreen.jsx`):
 *
 *   useEffect(() => {
 *     registrarParadas('hoy-en-finca', paradas);
 *     return () => desregistrarParadas('hoy-en-finca');
 *   }, [paradas]);
 *
 * Registro en memoria (module-singleton, como `compaiOcupado.js`) — vive
 * mientras la pantalla está montada, cero persistencia: no tiene sentido
 * pasear hacia un ref de una pantalla que ya no existe.
 *
 * @module services/compaiParadasPorPantalla
 */

/** @type {Map<string, import('../hooks/useAngelitaGuia').ParadaGuia[]>} */
const registro = new Map();

const ANILLOS_VALIDOS = new Set(['cerca', 'pantalla']);

/**
 * Registra (o reemplaza) las paradas de una pantalla. Paradas sin `anillo`
 * declarado caen en 'pantalla' — el anillo más amplio, nunca se asume
 * "cerca" sin que la pantalla lo pida explícitamente.
 * @param {string} pantallaId
 * @param {import('../hooks/useAngelitaGuia').ParadaGuia[]} paradas
 */
export function registrarParadas(pantallaId, paradas) {
  if (!pantallaId) return;
  const lista = Array.isArray(paradas) ? paradas : [];
  registro.set(
    pantallaId,
    lista
      .filter((p) => p && p.id && p.ref)
      .map((p) => ({ ...p, anillo: ANILLOS_VALIDOS.has(p.anillo) ? p.anillo : 'pantalla' })),
  );
}

/** Suelta el registro de una pantalla (desmontaje). */
export function desregistrarParadas(pantallaId) {
  if (!pantallaId) return;
  registro.delete(pantallaId);
}

/** Todas las paradas vivas de una pantalla (`[]` si no hay registro). */
export function paradasDe(pantallaId) {
  return registro.get(pantallaId) || [];
}

/** Solo las paradas del anillo 'cerca' de una pantalla. */
export function paradasCercaDe(pantallaId) {
  return paradasDe(pantallaId).filter((p) => p.anillo === 'cerca');
}

/** Solo las paradas del anillo 'pantalla' (recorrido amplio). */
export function paradasPantallaDe(pantallaId) {
  return paradasDe(pantallaId).filter((p) => p.anillo === 'pantalla');
}

/** ¿Hay algo registrado para pasear en esta pantalla? */
export function tieneParadas(pantallaId) {
  return paradasDe(pantallaId).length > 0;
}

/** Vacía TODO el registro — para tests y para desmontajes duros. */
export function limpiarRegistro() {
  registro.clear();
}

export default {
  registrarParadas,
  desregistrarParadas,
  paradasDe,
  paradasCercaDe,
  paradasPantallaDe,
  tieneParadas,
  limpiarRegistro,
};
