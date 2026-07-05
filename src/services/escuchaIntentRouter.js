/**
 * escuchaIntentRouter.js — Router PURO de la escucha manos libres.
 *
 * Decide qué hacer con lo que el campesino DIJO (ya transcrito por Whisper):
 *
 *   a) COMANDO DE NAVEGACIÓN ("lléveme a suelo", "abrir mercado", "el mapa")
 *      → { tipo: 'navegar', view, etiqueta } — la app redirige a esa pantalla.
 *   b) PREGUNTA / PEDIDO ("cuánta agua necesita el café", "qué siembro este
 *      mes") → { tipo: 'agente', prompt } — va al agente (→ respuesta Kokoro).
 *
 * Reglas (deliberadamente conservadoras — ante la duda, AGENTE, porque el
 * agente siempre puede responder "eso está en la pantalla X", mientras que
 * una navegación equivocada bota al campesino a una pantalla que no pidió):
 *
 *   1. Palabra interrogativa (qué/cómo/cuándo/cuánto/por qué/cuál/quién/
 *      dónde) en cualquier parte → AGENTE, aunque mencione un destino.
 *   2. Verbo de navegación (lléveme/abra/muéstreme/vamos a/ir a/entrar a/ver)
 *      + destino conocido → NAVEGAR.
 *   3. Frase corta (≤ 4 palabras) que es solo un destino con artículos
 *      ("el mercado", "mapa", "a la bodega") → NAVEGAR.
 *   4. Todo lo demás → AGENTE.
 *
 * Es un módulo PURO (sin red, sin React, sin DOM): testeable en aislamiento
 * (TDD). Los nombres de vista son los `case` reales del switch de App.jsx —
 * si una vista se renombra allá, el test de este archivo la caza.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

/** Quita tildes/diéresis y baja a minúsculas para matching tolerante a Whisper. */
export function normalizarHabla(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[¿?¡!.,;:()"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Destinos navegables por voz. Clave = palabra(s) normalizada(s) tal como las
 * dice la gente; view = case real de App.jsx; etiqueta = cómo se lo decimos
 * de vuelta ("Abriendo Mercado…"). Las claves multi-palabra se evalúan
 * primero (más específicas ganan). */
const DESTINOS = Object.freeze([
  // multi-palabra primero
  { claves: ['mercados campesinos'], view: 'mercados', etiqueta: 'Mercados campesinos' },
  { claves: ['salud del suelo'], view: 'salud_suelo', etiqueta: 'Salud del suelo' },
  { claves: ['registro por voz', 'registrar por voz'], view: 'voz', etiqueta: 'Registro por voz' },
  // una palabra
  { claves: ['suelo'], view: 'suelo', etiqueta: 'Suelo' },
  { claves: ['mercado'], view: 'mercado', etiqueta: 'Mercado' },
  { claves: ['mercados'], view: 'mercados', etiqueta: 'Mercados campesinos' },
  { claves: ['mapa'], view: 'mapa', etiqueta: 'Mapa de la finca' },
  { claves: ['bitacora', 'historial'], view: 'historial', etiqueta: 'Bitácora' },
  { claves: ['clima', 'boletin'], view: 'clima_boletin', etiqueta: 'Clima' },
  { claves: ['calendario'], view: 'calendario_finca', etiqueta: 'Calendario de la finca' },
  { claves: ['semilla', 'semillas'], view: 'semilla', etiqueta: 'Semillas' },
  { claves: ['agua'], view: 'agua', etiqueta: 'Agua' },
  { claves: ['bodega'], view: 'bodega', etiqueta: 'Bodega' },
  { claves: ['insumos'], view: 'insumos', etiqueta: 'Insumos' },
  { claves: ['animales'], view: 'animales', etiqueta: 'Animales' },
  { claves: ['gallinas'], view: 'animales_gallinas', etiqueta: 'Gallinas' },
  { claves: ['abejas'], view: 'animales_abejas', etiqueta: 'Abejas' },
  { claves: ['vacas'], view: 'animales_vacas', etiqueta: 'Vacas' },
  { claves: ['biopreparados', 'biopreparado'], view: 'biopreparados', etiqueta: 'Biopreparados' },
  { claves: ['fermentos'], view: 'fermentos', etiqueta: 'Fermentos' },
  { claves: ['sembrar', 'siembra', 'siembras'], view: 'sembrar', etiqueta: 'Sembrar' },
  { claves: ['cosechar', 'cosecha', 'cosechas'], view: 'cosechar', etiqueta: 'Cosechar' },
  { claves: ['perfil'], view: 'perfil', etiqueta: 'Perfil' },
  { claves: ['inicio', 'casa', 'portada', 'principal'], view: 'dashboard', etiqueta: 'Inicio' },
  { claves: ['especies', 'directorio'], view: 'directorio', etiqueta: 'Directorio de especies' },
  { claves: ['aprende', 'aprender'], view: 'aprende', etiqueta: 'Aprende' },
  { claves: ['informes'], view: 'informes', etiqueta: 'Informes' },
  { claves: ['tareas'], view: 'task_log', etiqueta: 'Tareas' },
  { claves: ['ayuda', 'manual'], view: 'ayuda', etiqueta: 'Ayuda' },
  { claves: ['juego'], view: 'juego', etiqueta: 'Juego de la finca' },
  { claves: ['activos'], view: 'activos', etiqueta: 'Mi finca' },
]);

/* Verbos/locuciones que declaran intención de IR a un lugar de la app.
 * Aceptamos variantes de tuteo/ustedeo E imperativos que Whisper transcribe
 * del habla real ("llevame", "abrime") — lo que ESCUCHAMOS no se limita al
 * dialecto con el que RESPONDEMOS. */
const VERBOS_NAV = [
  'llevame', 'lleveme', 'llevanos', 'llevarme',
  'abrir', 'abre', 'abra', 'abrime', 'abrame',
  'muestrame', 'muestreme', 'mostrar', 'muestra', 'muestre',
  'ir a', 'ir al', 'vamos a', 'vamos al', 'vamos para', 've a', 'vaya a',
  'entrar a', 'entra a', 'entre a', 'entremos a',
  'quiero ver', 'quiero entrar', 'ver el', 'ver la', 'ver los', 'ver las', 'ver mi', 'ver mis',
];

/* Palabras interrogativas: si aparecen, es una PREGUNTA → agente, siempre.
 * (normalizadas: sin tilde). */
const INTERROGATIVAS = [
  'que', 'como', 'cuando', 'cuanto', 'cuanta', 'cuantos', 'cuantas',
  'por que', 'porque', 'cual', 'cuales', 'quien', 'quienes', 'donde',
  'necesita', 'necesitan', 'sirve', 'debo', 'puedo', 'ayudame', 'ayudeme',
  'recomienda', 'recomiendame', 'recomiendeme', 'explica', 'explicame', 'expliqueme',
];

/* Palabras "relleno" tolerables en una frase corta que es solo un destino:
 * "a la bodega" → bodega. */
const RELLENO = new Set(['a', 'al', 'el', 'la', 'los', 'las', 'de', 'del', 'mi', 'mis', 'un', 'una', 'chagra', 'por', 'favor']);

const contieneToken = (tokens, frase) => {
  const partes = frase.split(' ');
  if (partes.length === 1) return tokens.includes(frase);
  for (let i = 0; i <= tokens.length - partes.length; i++) {
    if (partes.every((p, j) => tokens[i + j] === p)) return true;
  }
  return false;
};

function buscarDestino(tokens) {
  for (const destino of DESTINOS) {
    for (const clave of destino.claves) {
      if (contieneToken(tokens, clave)) return destino;
    }
  }
  return null;
}

/**
 * Rutea una frase transcrita: ¿navegación o pregunta al agente?
 *
 * @param {string} texto - transcripción cruda de Whisper.
 * @returns {{ tipo: 'navegar', view: string, etiqueta: string }
 *          | { tipo: 'agente', prompt: string }}
 * @example
 * routeUtterance('Lléveme a suelo');        // → { tipo:'navegar', view:'suelo', … }
 * routeUtterance('abrir mercado');           // → { tipo:'navegar', view:'mercado', … }
 * routeUtterance('¿cuánta agua pide el café?'); // → { tipo:'agente', prompt:'…' }
 */
export function routeUtterance(texto) {
  const prompt = String(texto || '').trim();
  const norma = normalizarHabla(prompt);
  if (!norma) return { tipo: 'agente', prompt };

  const tokens = norma.split(' ');

  // Regla 1: pregunta explícita → agente, sin importar qué destinos mencione.
  if (INTERROGATIVAS.some((q) => contieneToken(tokens, q))) {
    return { tipo: 'agente', prompt };
  }

  const destino = buscarDestino(tokens);
  if (destino) {
    // Regla 2: verbo de navegación + destino conocido.
    if (VERBOS_NAV.some((v) => contieneToken(tokens, v))) {
      return { tipo: 'navegar', view: destino.view, etiqueta: destino.etiqueta };
    }
    // Regla 3: la frase corta ES el destino (con artículos de relleno).
    if (tokens.length <= 4) {
      const soloDestino = tokens.every(
        (t) => RELLENO.has(t) || destino.claves.some((c) => c.split(' ').includes(t)),
      );
      if (soloDestino) {
        return { tipo: 'navegar', view: destino.view, etiqueta: destino.etiqueta };
      }
    }
  }

  // Regla 4: default — al agente (Whisper → agente → Kokoro).
  return { tipo: 'agente', prompt };
}

/** Destinos expuestos (para el hint del widget y para tests). */
export function listarDestinos() {
  return DESTINOS.map((d) => ({ view: d.view, etiqueta: d.etiqueta }));
}
