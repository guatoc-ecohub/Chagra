/*
 * comandoMundo — EL LAZO agente→escena (spec S1, "bucle dos-vías voz↔3D").
 *
 * Hoy la voz de Angelita solo NARRA (una vía). Este módulo cierra el lazo: toma
 * un pedido en lenguaje natural del campesino ("muéstreme las trampas", "dónde
 * está el agua", "lléveme al biocontrol") y lo resuelve contra los HOTSPOTS del
 * mundo actual (mundoData) para que la escena ENFOQUE y RESALTE ese punto — el
 * mismo `foco` que la abeja ya persigue en EscenaBase3D.
 *
 * Puro y three-free (lo usa la capa acompañante sin inflar el bundle 3D):
 * determinista, sin red, sin LLM. El match es por PALABRA CLAVE contra el
 * vocabulario de cada hotspot —su `label`, `id`, `view`, `data.tema` y `claves`
 * opcionales— expandido con un diccionario agroecológico (SINONIMOS) para cubrir
 * cómo habla DE VERDAD el campo (trampa↔plaga, biocontrol↔hongo, riego↔agua).
 *
 * Regla de puntaje: un acierto DIRECTO (la palabra vive en el label/id del
 * hotspot) pesa más que uno por sinónimo — así "biocontrol" gana el punto de
 * Biopreparados sin que un vecino se lo robe. Sin match → null (arriba, Angelita
 * responde cordial y ofrece las puertas del mundo).
 */
import { MUNDO } from './mundoData.js';

// Palabras vacías: cortesía, verbos de pedir y conectores que NO son intención.
// (ya sin tildes — se comparan contra tokens normalizados).
const VACIAS = new Set([
  'muestre', 'muestreme', 'muestrame', 'ver', 'vea', 'veamos', 'mostrar', 'ensename', 'enseneme',
  'lleve', 'lleveme', 'llevame', 'llevar', 'vamos', 'ir', 'pon', 'ponme', 'abre', 'abrir', 'abreme',
  'quiero', 'quisiera', 'necesito', 'busco', 'buscar', 'buscando', 'ando', 'dame', 'ver',
  'donde', 'esta', 'estan', 'cual', 'cuales', 'como', 'que', 'porfa', 'favor', 'gracias',
  'el', 'la', 'lo', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'de', 'con', 'sin',
  'por', 'para', 'esa', 'ese', 'esos', 'esas', 'este', 'esta', 'mi', 'mis', 'su', 'sus', 'aqui',
]);

// Diccionario agroecológico: cómo habla el campesino ↔ conceptos que sí viven en
// los labels/ids de los hotspots. Cada grupo es una clase de equivalencia: una
// palabra hace match con cualquier otra del MISMO grupo. NO es por-mundo (es
// vocabulario del dominio, verificado contra el catálogo de mundos); el layout
// de cada mundo sigue viviendo, intacto, en mundoData.
const SINONIMOS = [
  ['agua', 'quebrada', 'riego', 'riega', 'regar', 'regada', 'nacimiento', 'naciente', 'toma', 'bocatoma', 'tanque', 'rio', 'acueducto'],
  ['trampa', 'trampas', 'pegajosa', 'cromatica', 'amarilla', 'amarillas', 'azul', 'mosca', 'minador', 'trips'],
  ['plaga', 'plagas', 'bicho', 'bichos', 'insecto', 'insectos', 'gusano', 'pulgon'],
  ['biocontrol', 'biopreparado', 'biopreparados', 'hongo', 'hongos', 'beauveria', 'metarhizium', 'esporas', 'bioinsumo'],
  ['defensor', 'defensores', 'enemigo', 'enemigos', 'mariquita', 'benefico', 'aliado', 'aliados', 'depredador'],
  ['sintoma', 'enferma', 'enfermo', 'enfermedad', 'mala', 'decaida', 'clinica'],
  ['veneno', 'toxico', 'toxicologia', 'seguridad', 'insumo', 'insumos', 'quimico'],
  ['suelo', 'tierra', 'lombriz', 'lombrices', 'subsuelo', 'microorganismo', 'raiz', 'raices'],
  ['compost', 'abono', 'estiercol', 'bocashi', 'humus', 'pila', 'cobertura'],
  ['cromatografia', 'cromato'],
  ['animal', 'animales', 'gallina', 'gallinas', 'vaca', 'vacas', 'oveja', 'ovejas', 'corral', 'ponedora'],
  ['bosque', 'arbol', 'arboles', 'restauracion', 'monte', 'estrato', 'estratos', 'reforestar'],
  ['clima', 'tiempo', 'lluvia', 'lluvias', 'sol', 'cielo', 'almanaque', 'temporada', 'boveda'],
  ['cafe', 'cafeto', 'cafetal'],
  ['milpa', 'maiz', 'frijol', 'calabaza', 'hermanas'],
  ['mercado', 'vender', 'venta', 'comprar', 'precio', 'despensa', 'poscosecha', 'cosecha', 'reporte', 'reportes', 'informe', 'informes'],
  ['papa', 'tuberculo', 'papas', 'yuca'],
  ['piso', 'pisos', 'altura', 'termico', 'paramo', 'ladera'],
  ['fruta', 'frutal', 'frutales', 'naranja', 'citrico', 'mango', 'mora'],
  ['huerta', 'hortaliza', 'hortalizas', 'verdura', 'verduras', 'siembra', 'sembrar'],
  ['asociacion', 'asociaciones', 'asocio', 'vecina', 'vecinas', 'compania', 'consorcio'],
];

// Índice palabra → grupo, para expandir en O(1).
const GRUPO_DE = new Map();
SINONIMOS.forEach((grupo, i) => grupo.forEach((p) => GRUPO_DE.set(p, i)));

/**
 * Normaliza y trocea un texto: minúsculas, SIN tildes, sin signos; descarta
 * palabras vacías y de menos de 3 letras. Devuelve la lista de tokens.
 */
export function tokenizar(texto) {
  if (!texto || typeof texto !== 'string') return [];
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // fuera tildes: á→a, y ñ (NFD: n+tilde)→n
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && w.length >= 3 && !VACIAS.has(w));
}

// El "saco" expandido de un conjunto de tokens crudos: cada token + todo su grupo
// de sinónimos → Set para overlap O(1).
function expandir(tokens) {
  const saco = new Set();
  tokens.forEach((t) => {
    saco.add(t);
    const g = GRUPO_DE.get(t);
    if (g !== undefined) SINONIMOS[g].forEach((e) => saco.add(e));
  });
  return saco;
}

// El vocabulario CRUDO de un hotspot (sin expandir): su label, id, view,
// data.tema y `claves` opcionales, tokenizado.
function crudosDeHotspot(h) {
  const fuente = [h.label, h.id, h.view, h.data?.tema, ...(h.claves || [])]
    .filter(Boolean)
    .join(' ');
  return tokenizar(fuente);
}

/**
 * Resuelve un pedido de voz/texto contra los hotspots del mundo.
 *
 * @param {string} texto   lo que dijo/escribió el usuario.
 * @param {string} mundoId id del mundo actual (mundoData).
 * @returns {{ hotspot: object, score: number }|null} el hotspot ganador o null.
 */
export function parseComandoMundo(texto, mundoId) {
  const hotspots = MUNDO[mundoId]?.hotspots || [];
  if (!hotspots.length) return null;
  const tokens = tokenizar(texto);
  if (!tokens.length) return null;

  let mejor = null;
  for (const h of hotspots) {
    const crudos = new Set(crudosDeHotspot(h));
    const saco = expandir(crudos); // crudos + sinónimos
    let score = 0;
    for (const q of tokens) {
      if (crudos.has(q)) score += 2; // acierto directo: pesa el doble
      else if (saco.has(q)) score += 1; // acierto por sinónimo
    }
    if (score > 0 && (!mejor || score > mejor.score)) mejor = { hotspot: h, score };
  }
  return mejor;
}

/** Los labels de las puertas del mundo (para la respuesta cordial de fallback). */
export function puertasDeMundo(mundoId) {
  return (MUNDO[mundoId]?.hotspots || []).map((h) => h.label);
}
