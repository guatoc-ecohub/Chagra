/**
 * agroecologia — EL compAI COMENTA CON EL CATÁLOGO REAL DE SU MATA (#80/#81).
 * Núcleo portable.
 *
 * El hueco que cierra: `comentarista.js` ya sabe decir "tiene maíz
 * registrado" (auditoría #38/#78), pero eso es inventario — nunca un dato
 * AGROECOLÓGICO de esa especie puntual (su rol en el gremio, si repele
 * plaga, si fija nitrógeno, su zona térmica real). El compañero hablaba de
 * "sus matas" en abstracto; con este módulo habla de SU maíz, con lo que el
 * catálogo Chagra sabe de Zea mays de verdad.
 *
 * REGLA DURA — anti-fabricación (misma de datosFinca.js / comentarista.js):
 * este módulo NO inventa nada. Sólo traduce a frase los campos ESTRUCTURADOS
 * que ya trae la especie resuelta del catálogo (`roles_in_guild`,
 * `thermal_zones`, `temperatura_c.helada_letal`) — nunca lee ni resume el
 * `valor_pedagogico` (texto libre): ese campo es prosa para lectura humana,
 * no un dato verificado campo-a-campo, y resumirlo aquí sería fabricar una
 * afirmación agronómica sin control. Si la especie no resuelve o no tiene
 * los campos, `null` — el comentarista cae a su rama honesta de siempre.
 *
 * Quién arma la especie resuelta: `hooks/useCompaiAgroecologiaReal.js`, que
 * cruza el cultivo real del inventario (`useInventarioCompai`) contra el
 * catálogo vivo (`services/speciesResolver.resolveSpecies`, IndexedDB/SQLite
 * ya cacheado por App.jsx) — ese lado SÍ hace I/O; este módulo no.
 *
 * @module compai/nucleo/agroecologia
 */

/**
 * Traducción de `roles_in_guild` (vocabulario cerrado del catálogo — ver
 * scripts/build-catalog-sqlite.mjs) a una frase corta en usted-colombiano.
 * Sólo se listan los roles con valor agroecológico claro para un consejo de
 * compañía; roles puramente descriptivos (crop, ground_cover) no producen
 * frase propia — el cultivo igual puede calificar por otro rol o por zona
 * térmica.
 */
const FRASE_POR_ROL = {
  pest_repellent: 'ayuda a alejar plaga de sus vecinas',
  nitrogen_fixer: 'le fija nitrógeno al suelo — buena vecina para las que comen mucho',
  living_fence: 'sirve de cerca viva',
  windbreak: 'corta el viento y protege lo que tiene al lado',
  nurse_plant: 'hace de nodriza: le da sombra a los cultivos jóvenes',
  pollinator_attractor: 'atrae polinizadores — más flor, más fruto alrededor',
  dynamic_accumulator: 'saca nutrientes de lo hondo y los deja en la superficie',
  biomass_producer: 'da harta biomasa para abono verde o mulch',
};

/** Orden de preferencia cuando una especie tiene varios roles con frase. */
const ORDEN_ROLES = Object.keys(FRASE_POR_ROL);

/**
 * @typedef {Object} EspecieCatalogo
 * @property {string} [id]
 * @property {string} [nombre_comun]
 * @property {Array<string>} [roles_in_guild]
 * @property {Array<string>} [thermal_zones]
 * @property {{helada_letal?: number}} [temperatura_c]
 */

/**
 * El primer rol con frase agroecológica conocida, en el orden curado de
 * `ORDEN_ROLES` (no el orden crudo del catálogo, que no prioriza nada).
 * @param {Array<string>} [roles]
 * @returns {string|null}
 */
function primerRolConFrase(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const set = new Set(roles);
  for (const rol of ORDEN_ROLES) {
    if (set.has(rol)) return rol;
  }
  return null;
}

/**
 * Arma el dato agroecológico real de una especie ya resuelta del catálogo,
 * grounded en `nombreCultivo` (el nombre tal como está en la finca del
 * usuario — puede diferir de `nombre_comun`, ej. "Café #03" ya sin sufijo).
 *
 * @param {string} nombreCultivo — nombre del cultivo real del usuario.
 * @param {EspecieCatalogo|null|undefined} especie — resuelta por
 *   speciesResolver contra el catálogo vivo; `null` si no hubo match.
 * @returns {string|null} frase lista para tejer en el comentario, o `null`
 *   si no hay especie o no tiene ningún campo agroecológico usable.
 */
export function datoAgroecologicoReal(nombreCultivo, especie) {
  if (!especie || typeof especie !== 'object') return null;
  const nombre = String(nombreCultivo || especie.nombre_comun || '').trim();
  if (!nombre) return null;

  const rol = primerRolConFrase(especie.roles_in_guild);
  if (rol) return `${FRASE_POR_ROL[rol]}`;

  // Sin rol de gremio con frase — probamos con la helada letal (dato de
  // temperatura, útil de verdad para decidir si tapar la mata esta noche).
  const heladaLetal = especie.temperatura_c?.helada_letal;
  if (Number.isFinite(heladaLetal) && heladaLetal > -50) {
    return `aguanta hasta ${heladaLetal}°C — por debajo de eso ya sufre`;
  }

  return null;
}

export default { datoAgroecologicoReal, FRASE_POR_ROL };
