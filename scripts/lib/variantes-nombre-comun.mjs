/**
 * scripts/lib/variantes-nombre-comun.mjs
 *
 * Normalizador de variantes de nombre común de especies.
 *
 * Este módulo resuelve el problema de confusiones taxonómicas causadas por
 * variantes de grafía del mismo nombre común (ej: curuba/curubo, uchuva/uvilla,
 * tomate de árbol/tomate de palo, etc.).
 *
 * REGLA DE DISEÑO CRÍTICA:
 * - NUNCA stripear a ciegas la vocal final (ej: mango → mang es falso positivo)
 * - Usar mapa explícito de variantes conocidas
 * - Normalizar acentos y case antes de buscar
 * - Dejar el mapa extensible en un solo lugar de datos
 *
 * @module scripts/lib/variantes-nombre-comun
 */

/**
 * Mapa explícito de variantes de nombre común.
 *
 * Cada entrada mapea variantes conocidas al término canónico usado en el catálogo.
 * El formato es: { canonica: [variantes] }
 *
 * Este mapa es el único lugar donde se definen las variantes conocidas.
 * Para añadir nuevas variantes, agregar entries aquí sin cambiar el código.
 */
const MAPA_VARIANTES = {
  // Pasifloras (curuba/curubo → Curuba de Castilla)
  'curuba de castilla': [
    'curuba',
    'curubo',
    'curuba de castilla',
    'curuba de castilla',  // con/sin acento
  ],
  
  // Physalis (uchuva/uvilla → Uchuva)
  'uchuva': [
    'uchuva',
    'uvilla',
    'aguaymanto',  // nombre en Perú/Ecuador
  ],
  
  // Solanum betaceum (tomate de árbol/tomate de palo → Tomate de árbol / Tamarillo)
  'tomate de árbol / tamarillo': [
    'tomate de árbol',
    'tomate de arbol',  // sin acento
    'tomate de palo',
    'tamarillo',
  ],
  
  // Otros casos comunes que podemos querer añadir en el futuro
  // 'avena': ['avena', 'avena'],  // placeholder para futuras expansiones
};

/**
 * Normaliza un texto para comparación: elimina acentos y convierte a minúsculas.
 *
 * @param {string} texto - Texto a normalizar
 * @returns {string} Texto sin acentos en minúsculas
 */
function normalizarParaComparacion(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // Elimina diacríticos (acentos)
    .trim();
}

/**
 * Normaliza un nombre común de especie al término canónico del catálogo.
 *
 * Esta función:
 * 1. Normaliza acentos y mayúsculas para comparación
 * 2. Busca en el mapa explícito de variantes
 * 3. Devuelve el término canónico (con acentos) si encuentra match
 * 4. Devuelve el nombre original en minúsculas si no es variante conocida
 *
 * REGLA DURA: NO stripear a ciegas la vocal final. Esto genera falsos
 * positivos obvios (ej: mango → mang). Solo usar el mapa explícito.
 *
 * @param {string} nombre - Nombre común a normalizar (ej: "curubo")
 * @returns {string} Término canónico (ej: "curuba de castilla") o el nombre en minúsculas
 */
export function normalizarNombreComun(nombre) {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return '';
  }

  const nombreNormalizado = normalizarParaComparacion(nombre);

  // Buscar en el mapa explícito de variantes
  for (const [canonica, variantes] of Object.entries(MAPA_VARIANTES)) {
    const canonicaNormalizada = normalizarParaComparacion(canonica);

    // Si el nombre coincide con alguna variante (incluida la canónica)
    if (variantes.some(variante => normalizarParaComparacion(variante) === nombreNormalizado)) {
      // Devolver la canónica en minúsculas (manteniendo acentos originales)
      return canonica.toLowerCase().trim();
    }
  }

  // Si no es variante conocida, devolver el nombre en minúsculas (sin modificar)
  return nombre.toLowerCase().trim();
}

/**
 * Resuelve un nombre común al nombre científico canónico del catálogo.
 *
 * Esta función:
 * 1. Normaliza la variante al término canónico usando normalizarNombreComun()
 * 2. Busca en el catálogo por nombre común normalizado (comparación sin acentos)
 * 3. Devuelve el nombre científico si encuentra match exacto
 * 4. Devuelve null si NO encuentra (NUNCA adivina)
 *
 * @param {string} nombre - Nombre común a resolver (ej: "curubo")
 * @param {object[]} catalogo - Catálogo de especies (array con propiedad nombre_comun)
 * @returns {string|null} Nombre científico canónico o null si no encuentra
 */
export function resolverEspecie(nombre, catalogo) {
  if (typeof nombre !== 'string' || nombre.trim() === '') {
    return null;
  }

  if (!Array.isArray(catalogo) || catalogo.length === 0) {
    return null;
  }

  // Primero normalizar la variante al término canónico
  const nombreCanonico = normalizarNombreComun(nombre);
  const nombreNormalizado = normalizarParaComparacion(nombreCanonico);

  // Buscar en el catálogo por nombre común normalizado
  for (const especie of catalogo) {
    if (especie && typeof especie.nombre_comun === 'string') {
      const nombreCatalogoNormalizado = normalizarParaComparacion(especie.nombre_comun);

      if (nombreCatalogoNormalizado === nombreNormalizado) {
        // Match exacto encontrado - devolver nombre científico canónico
        return especie.nombre_cientifico || null;
      }
    }
  }

  // NO encontrar match - devolver null (NUNCA adivinar)
  return null;
}

/**
 * Exporta el mapa de variantes para inspección/testing.
 *
 * Esto permite que los tests verifiquen que el mapa tiene las variantes
 * esperadas sin necesidad de duplicar la lógica.
 */
export { MAPA_VARIANTES };
