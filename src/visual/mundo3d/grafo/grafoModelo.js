/**
 * grafoModelo.js — de JSON crudo a constelación dibujable.
 *
 * Traduce `/grafo-relations.json` (el export offline del grafo AGE) a la forma
 * que el navegador necesita: `{ nodos, aristas, pisos }`. Puro y sin three: se
 * puede testear y correr en un worker sin arrastrar WebGL.
 *
 * POR QUÉ HACE SU PROPIO `fetch` Y NO USA `grafoRelations.js`
 * ──────────────────────────────────────────────────────────
 * Ese servicio es el brazo del agente/grounding y hoy expone `species`,
 * `_pest_index` y los sinónimos — pero NO `_piso_termico`, que es justo el eje
 * vertical de este dibujo. Tocarlo para agregarle un accesor sería meterle
 * mano a un archivo que otras ramas están editando. Así que leemos el MISMO
 * archivo por nuestra cuenta: es la misma URL, la sirve el mismo Service Worker
 * desde RAG_GROUNDING_CACHE, y el navegador la resuelve del caché HTTP. El
 * costo real de la segunda lectura es ~0 y a cambio este módulo no acopla nada.
 *
 * Contrato de degradación (heredado del servicio, a propósito): si el JSON no
 * carga —sin red y sin caché, o build sin el archivo— devolvemos un grafo
 * VACÍO y jamás lanzamos. La escena muestra su cartel y el teléfono sigue vivo.
 *
 * NO SE INVENTA DATO. Regla dura de este archivo: si el grafo no declara la
 * altura de una especie, esa especie va a `sin_piso` y se dibuja en la niebla.
 * Sería facilísimo (y una mentira) deducir que la piña es de tierra caliente.
 * El mapa muestra los huecos del conocimiento; no los tapa.
 */

const RUTA_GRAFO = '/grafo-relations.json';

/* Los cuatro habitantes. El prefijo evita que una plaga llamada "mosca" y un
   controlador llamado "mosca" colapsen en el mismo nodo. */
const PREFIJO = { especie: 'esp', plaga: 'pla', biopreparado: 'bio', controlador: 'ctl' };

/**
 * PRESUPUESTO DE NODOS POR TIER — la degradación digna, en números.
 *
 * El grafo completo son ~361 nodos y ~1.400 aristas. Eso en un teléfono de
 * gama baja no es "lento": es una pantalla negra y un aparato caliente. Pero
 * recortar al azar deja un mapa mutilado y sin sentido. Así que recortamos por
 * VALOR NARRATIVO, no por índice:
 *
 *  · alto  — todo. La constelación completa.
 *  · medio — todas las matas (son el sujeto), y las plagas/remedios/aliados más
 *            conectados. Se pierde la cola larga, se conserva la historia.
 *  · bajo  — solo las matas que SE RELACIONAN entre sí y sus plagas mayores.
 *            En gama baja el mapa se vuelve exactamente lo que más importa:
 *            la milpa, quién se lleva bien con quién. Menos nodos, misma verdad.
 *
 * `null` = sin tope.
 */
const PRESUPUESTO = {
  alto: { especie: null, plaga: null, biopreparado: null, controlador: null },
  medio: { especie: null, plaga: 48, biopreparado: 28, controlador: 22 },
  bajo: { especie: 72, plaga: 14, biopreparado: 0, controlador: 0 },
};

/** Minúsculas sin tildes: mismo criterio que usa el servicio para las plagas. */
function normalizar(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

let cacheCrudo = null;
let cargaEnVuelo = null;

/**
 * Lee el JSON del grafo. Nunca lanza: `null` si no hay dato.
 * @returns {Promise<object|null>}
 */
export async function cargarGrafoCrudo() {
  if (cacheCrudo) return cacheCrudo;
  if (cargaEnVuelo) return cargaEnVuelo;

  cargaEnVuelo = (async () => {
    try {
      const res = await fetch(RUTA_GRAFO);
      if (!res || !res.ok) return null;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) return null;
      const raw = await res.json();
      if (!raw || typeof raw !== 'object' || !raw.species) return null;
      cacheCrudo = raw;
      return raw;
    } catch (err) {
      console.warn('[grafoModelo] no se pudo leer el grafo:', err?.message);
      return null;
    } finally {
      if (!cacheCrudo) cargaEnVuelo = null; // permitir reintento
    }
  })();

  return cargaEnVuelo;
}

/** Sólo para tests: olvida lo cargado. */
export function __resetGrafoModeloCache() {
  cacheCrudo = null;
  cargaEnVuelo = null;
}

/**
 * Mapa `sinónimo normalizado → etiqueta canónica` de plaga.
 * Sin esto, "gota", "tizón tardío" y "phytophthora infestans" serían tres nodos
 * distintos y el dibujo mentiría tres veces sobre la misma enfermedad.
 */
function construirSinonimos(raw) {
  const out = new Map();
  const syn = raw._pest_synonyms;
  if (syn && typeof syn === 'object') {
    for (const [k, v] of Object.entries(syn)) {
      if (typeof v === 'string' && v) out.set(normalizar(k), v);
    }
  }
  return out;
}

/**
 * Construye el grafo dibujable.
 *
 * @param {object|null} raw JSON crudo (de `cargarGrafoCrudo`)
 * @param {{ tier?: 'alto'|'medio'|'bajo' }} [opts]
 * @returns {{
 *   nodos: Array<object>, aristas: Array<object>, pisos: Array<object>,
 *   porId: Map<string, object>, vecinos: Map<string, Set<string>>,
 *   conteo: object, recortado: boolean, meta: object
 * }}
 */
export function construirGrafo(raw, { tier = 'alto' } = {}) {
  const vacio = {
    nodos: [], aristas: [], pisos: [], porId: new Map(), vecinos: new Map(),
    conteo: { especie: 0, plaga: 0, biopreparado: 0, controlador: 0, aristas: 0 },
    recortado: false, meta: {},
  };
  if (!raw || !raw.species) return vacio;

  const species = raw.species;
  const sinonimos = construirSinonimos(raw);
  const canonizar = (label) => sinonimos.get(normalizar(label)) || String(label || '').trim();

  const nodos = new Map(); // id → nodo
  const aristas = new Map(); // clave → arista (dedupe)

  const ponerNodo = (tipo, clave, datos) => {
    const id = `${PREFIJO[tipo]}:${clave}`;
    const previo = nodos.get(id);
    if (previo) return previo;
    const nodo = { id, tipo, clave, grado: 0, piso: tipo === 'especie' ? 'sin_piso' : null, ...datos };
    nodos.set(id, nodo);
    return nodo;
  };

  const ponerArista = (de, a, tipo) => {
    if (!de || !a || de === a) return;
    /* Las simétricas (se ayudan / se estorban) se dedupean sin orden: el grafo
       declara "A compatible con B" y también "B compatible con A" en muchos
       casos, y dibujar las dos sería pintar la misma cuerda dos veces —
       exactamente el tipo de basura que produce el plato de espagueti. */
    const simetrica = tipo === 'compatible' || tipo === 'antagonista';
    const clave = simetrica
      ? `${tipo}|${[de, a].sort().join('|')}`
      : `${tipo}|${de}|${a}`;
    if (aristas.has(clave)) return;
    aristas.set(clave, { de, a, tipo });
  };

  // ── 1. Las matas ────────────────────────────────────────────────────────
  for (const [sid, sp] of Object.entries(species)) {
    ponerNodo('especie', sid, {
      etiqueta: sp.nombre_comun || sid,
      sub: sp.nombre_cientifico || '',
      nombresComunes: Array.isArray(sp.nombres_comunes) ? sp.nombres_comunes : [],
      conservacion: sp.conservation_status || null,
      origen: sp.establishment_means || null,
      amenaza: sp.threat_status || null,
    });
  }

  // ── 2. La altura: quién vive en qué piso ────────────────────────────────
  /* El eje Y del dibujo entero sale de aquí. Un piso declara sus cultivos y,
     arriba del límite agrícola, sus nativas (el páramo no tiene "cultivos":
     tiene frailejón). Ambas listas cuentan como "vive aquí". */
  const pisos = [];
  const ptRaw = raw._piso_termico;
  if (ptRaw && Array.isArray(ptRaw.pisos)) {
    for (const p of ptRaw.pisos) {
      const habitantes = [
        ...(Array.isArray(p.cultivos_representativos) ? p.cultivos_representativos : []),
        ...(Array.isArray(p.especies_nativas_representativas) ? p.especies_nativas_representativas : []),
      ];
      const presentes = [];
      for (const sid of habitantes) {
        const nodo = nodos.get(`${PREFIJO.especie}:${sid}`);
        if (!nodo) continue; // el piso lo nombra pero el grafo no lo describe
        /* Primera declaración gana. Una especie puede aparecer en dos pisos
           (la papa aguanta frío y páramo bajo); el dibujo necesita una sola
           altura, y la más baja es la que el grafo lista primero. */
        if (nodo.piso === 'sin_piso') nodo.piso = p.id;
        presentes.push(nodo.id);
      }
      pisos.push({
        id: p.id,
        nombre: p.nombre || p.id,
        altitud: p.altitud_m || null,
        temperatura: p.temperatura_media_c || null,
        lluvia: p.precipitacion_mm_anual || null,
        vegetacion: p.formacion_vegetal_principal || '',
        cultivable: p.cultivable !== false,
        notas: p.notas || '',
        habitantes: presentes,
      });
    }
  }

  // ── 3. Se ayudan / se estorban (mata ↔ mata) ────────────────────────────
  for (const [sid, sp] of Object.entries(species)) {
    const de = `${PREFIJO.especie}:${sid}`;
    for (const otro of sp.compatible_with || []) {
      if (species[otro]) ponerArista(de, `${PREFIJO.especie}:${otro}`, 'compatible');
    }
    for (const otro of sp.antagonist_of || []) {
      if (species[otro]) ponerArista(de, `${PREFIJO.especie}:${otro}`, 'antagonista');
    }
  }

  // ── 4. Las plagas y quién las controla ──────────────────────────────────
  /* Dos fuentes para lo mismo, y por eso se canoniza: `_pest_index` dice qué
     plaga ataca a qué mata; `pest_controllers` de cada especie dice qué aliado
     se come a cada plaga. Unidas cuentan la cadena completa —
     aliado → plaga → mata— que es la historia que este mapa existe para
     mostrar. */
  const pestIndex = raw._pest_index && typeof raw._pest_index === 'object' ? raw._pest_index : {};
  for (const [plagaRaw, afectadas] of Object.entries(pestIndex)) {
    const canon = canonizar(plagaRaw);
    if (!canon || !Array.isArray(afectadas) || !afectadas.length) continue;
    const plaga = ponerNodo('plaga', canon, { etiqueta: canon, sub: '' });
    for (const sid of afectadas) {
      if (species[sid]) ponerArista(plaga.id, `${PREFIJO.especie}:${sid}`, 'plaga_de');
    }
  }

  for (const [sid, sp] of Object.entries(species)) {
    const espId = `${PREFIJO.especie}:${sid}`;
    for (const pc of sp.pest_controllers || []) {
      const canon = canonizar(pc?.plaga);
      if (!canon) continue;
      const plaga = ponerNodo('plaga', canon, { etiqueta: canon, sub: '' });
      ponerArista(plaga.id, espId, 'plaga_de');
      for (const ctrlRaw of pc?.controladores || []) {
        const nombre = String(ctrlRaw || '').trim();
        if (!nombre) continue;
        const ctrl = ponerNodo('controlador', normalizar(nombre), { etiqueta: nombre, sub: '' });
        ponerArista(ctrl.id, plaga.id, 'controlador_de');
      }
    }

    // ── 5. Los remedios ───────────────────────────────────────────────────
    for (const b of sp.biopreparados || []) {
      const bid = b?.id;
      if (!bid) continue;
      const bio = ponerNodo('biopreparado', bid, { etiqueta: b.nombre || bid, sub: '' });
      ponerArista(bio.id, espId, 'biopreparado_de');
    }
  }

  // ── 6. Grado (cuánto pesa cada nodo en la historia) ─────────────────────
  const contarGrados = (listaAristas) => {
    for (const n of nodos.values()) n.grado = 0;
    for (const ar of listaAristas) {
      const a = nodos.get(ar.de);
      const b = nodos.get(ar.a);
      if (a) a.grado += 1;
      if (b) b.grado += 1;
    }
  };
  let listaAristas = [...aristas.values()];
  contarGrados(listaAristas);

  /* La mata que se relaciona con otras matas vale más que la que solo tiene
     plagas: la milpa es el corazón del saber agroecológico. Se marca antes de
     recortar, para que en gama baja sobreviva lo que enseña. */
  const relacionMata = new Set();
  for (const ar of listaAristas) {
    if (ar.tipo === 'compatible' || ar.tipo === 'antagonista') {
      relacionMata.add(ar.de);
      relacionMata.add(ar.a);
    }
  }
  for (const n of nodos.values()) n.tejeMilpa = relacionMata.has(n.id);

  // ── 7. Recorte por tier ─────────────────────────────────────────────────
  const topes = PRESUPUESTO[tier] || PRESUPUESTO.medio;
  let recortado = false;
  const sobreviven = new Set();

  for (const tipo of Object.keys(PREFIJO)) {
    const delTipo = [...nodos.values()].filter((n) => n.tipo === tipo);
    const tope = topes[tipo];
    if (tope == null || delTipo.length <= tope) {
      for (const n of delTipo) sobreviven.add(n.id);
      continue;
    }
    recortado = true;
    delTipo
      .sort((a, b) => (Number(b.tejeMilpa) - Number(a.tejeMilpa)) || (b.grado - a.grado) || a.id.localeCompare(b.id))
      .slice(0, tope)
      .forEach((n) => sobreviven.add(n.id));
  }

  for (const id of [...nodos.keys()]) if (!sobreviven.has(id)) nodos.delete(id);
  listaAristas = listaAristas.filter((ar) => nodos.has(ar.de) && nodos.has(ar.a));
  contarGrados(listaAristas);

  /* Un nodo que no toca nada es ruido: ocupa espacio y no cuenta historia.
     Las matas se quedan igual (son el sujeto del mapa aunque estén solas: su
     sola presencia dice "esto se siembra a esta altura"); los demás no. */
  for (const n of [...nodos.values()]) {
    if (n.tipo !== 'especie' && n.grado === 0) nodos.delete(n.id);
  }
  listaAristas = listaAristas.filter((ar) => nodos.has(ar.de) && nodos.has(ar.a));

  // ── 8. Vecindario (para el enfoque) ─────────────────────────────────────
  const vecinos = new Map();
  for (const id of nodos.keys()) vecinos.set(id, new Set());
  for (const ar of listaAristas) {
    vecinos.get(ar.de)?.add(ar.a);
    vecinos.get(ar.a)?.add(ar.de);
  }

  // Los pisos solo listan habitantes que sobrevivieron el recorte.
  for (const p of pisos) p.habitantes = p.habitantes.filter((id) => nodos.has(id));

  const listaNodos = [...nodos.values()];
  const conteo = { especie: 0, plaga: 0, biopreparado: 0, controlador: 0, aristas: listaAristas.length };
  for (const n of listaNodos) conteo[n.tipo] += 1;

  return {
    nodos: listaNodos,
    aristas: listaAristas,
    pisos,
    porId: nodos,
    vecinos,
    conteo,
    recortado,
    meta: raw._meta || {},
  };
}

/**
 * Las relaciones de un nodo, ya redactadas en voz de usted y agrupadas por
 * tipo, listas para la carta del enfoque.
 * @param {object} grafo
 * @param {string} id
 * @returns {Array<{ tipo: string, otros: Array<object> }>}
 */
export function relacionesDe(grafo, id) {
  if (!grafo || !id) return [];
  const porTipo = new Map();
  for (const ar of grafo.aristas) {
    if (ar.de !== id && ar.a !== id) continue;
    const otroId = ar.de === id ? ar.a : ar.de;
    const otro = grafo.porId.get(otroId);
    if (!otro) continue;
    if (!porTipo.has(ar.tipo)) porTipo.set(ar.tipo, []);
    porTipo.get(ar.tipo).push({ ...otro, entra: ar.a === id });
  }
  return [...porTipo.entries()].map(([tipo, otros]) => ({
    tipo,
    otros: otros.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta)),
  }));
}
