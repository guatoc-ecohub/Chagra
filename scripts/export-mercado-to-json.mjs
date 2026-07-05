#!/usr/bin/env node
/**
 * export-mercado-to-json.mjs — exporta la ESTRUCTURA DE MERCADO del grafo de
 * conocimiento `chagra_kg` (Apache AGE) a `public/mercado-despensa.json`, que
 * consume la mini-app "Mercado y despensa" (MercadoDespensaScreen). La PWA NO
 * consulta el grafo en vivo, así que congelamos un snapshot estático — mismo
 * patrón que `nutricion-humana.json`.
 *
 * FUENTE ÚNICA de los HECHOS (canales, requisitos, marco INVIMA, aristas):
 *   grafo chagra_kg — nodos CanalComercializacion (6) + ValorAgregado (4) +
 *   aristas SE_COMERCIALIZA_EN (especie→canal) y SE_TRANSFORMA_EN (especie→valor).
 *   Batch de origen: `mercado-estructural-dr-2026-07-05`.
 *
 * CERO invención de PRECIOS: este JSON no lleva ni un peso. Los precios los
 * resuelve el agente en vivo con `get_precio_sipsa` (SIPSA/DANE). Aquí solo va
 * el `producto_sipsa` (la clave para consultar) resuelto vía `sipsaProductMap`.
 *
 * Se corre a mano desde `stg` (tiene ssh a `alpha`, donde vive postgres-farm):
 *   node scripts/export-mercado-to-json.mjs
 *
 * Las etiquetas didácticas (emoji, orden narrativo, nivel de riesgo sanitario,
 * gancho) son PRESENTACIÓN en lenguaje llano de los MISMOS hechos del grafo —
 * no agregan datos nuevos. Cada afirmación de la UI traza al campo `descripcion`
 * o `fuente` del nodo correspondiente.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SSH_HOST = process.env.CHAGRA_KG_SSH_HOST || 'alpha';
const GRAPH = 'chagra_kg';

/** Corre un query Cypher en AGE vía ssh + podman + psql, devuelve filas crudas.
 *  El SQL viaja por STDIN (podman exec -i) para no pelear con el escape de `$$`
 *  del shell remoto (que si no lo expande al PID). */
function cypher(query, colspec) {
  const sql =
    `LOAD 'age'; SET search_path=ag_catalog,public;\n` +
    `SELECT * FROM cypher('${GRAPH}', $$ ${query} $$) AS (${colspec});\n`;
  const remote = `sudo podman exec -i postgres-farm psql -U farmos -d ${GRAPH} -tA -F'\t'`;
  const out = execFileSync('ssh', [SSH_HOST, remote], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return out
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l && !/^(LOAD|SET)$/.test(l));
}

/** agtype escalar → JS. Los strings vienen entre comillas; los objetos son JSON. */
function parseAg(cell) {
  if (cell == null || cell === '') return null;
  try {
    return JSON.parse(cell);
  } catch {
    return cell.replace(/^"|"$/g, '');
  }
}

// ── 1. Nodos canal + valor agregado (hechos verbatim del grafo) ──────────────
const canalesRaw = cypher('MATCH (c:CanalComercializacion) RETURN properties(c)', 'p agtype')
  .map((l) => parseAg(l))
  .filter(Boolean);

const valorRaw = cypher('MATCH (v:ValorAgregado) RETURN properties(v)', 'p agtype')
  .map((l) => parseAg(l))
  .filter(Boolean);

// ── 2. Aristas especie → canal (con nombre común de la especie) ──────────────
const comercializaRows = cypher(
  'MATCH (s)-[:SE_COMERCIALIZA_EN]->(c) RETURN s.id, s.nombre_comun, c.id',
  'sid agtype, nom agtype, cid agtype',
).map((l) => {
  const [sid, nom, cid] = l.split('\t');
  return { species_id: parseAg(sid), nombre_comun: parseAg(nom), canal_id: parseAg(cid) };
});

// ── 3. Aristas especie → valor agregado ──────────────────────────────────────
const transformaRows = cypher(
  'MATCH (s)-[:SE_TRANSFORMA_EN]->(v) RETURN s.id, s.nombre_comun, v.id',
  'sid agtype, nom agtype, vid agtype',
).map((l) => {
  const [sid, nom, vid] = l.split('\t');
  return { species_id: parseAg(sid), nombre_comun: parseAg(nom), valor_id: parseAg(vid) };
});

// ── 4. Joins locales: fotos (species-images.json) + producto SIPSA ───────────
const imgs = JSON.parse(readFileSync(resolve(ROOT, 'public/species-images.json'), 'utf8'));
const imgById = new Map();
for (const s of imgs.species) if (s?.species_id && s?.image_url) imgById.set(s.species_id, s);

const sipsaMap = JSON.parse(readFileSync(resolve(ROOT, 'src/data/sipsaProductMap.json'), 'utf8'));
const slugToProducto = {};
for (const [producto, slug] of Object.entries(sipsaMap)) {
  if (producto.startsWith('_')) continue;
  if (!(slug in slugToProducto)) slugToProducto[slug] = producto;
}
// Alias verificados 1:1 para variedades del catálogo cuyo slug exacto no está en
// el mapa SIPSA pero cuya identidad de cultivo es inequívoca (misma especie
// comercial, sin ambigüedad de producto). NO son precios: solo la clave de
// consulta para get_precio_sipsa. Verificado contra sipsaProductMap.json.
const SIPSA_ALIAS = {
  arracacia_xanthorrhiza_amarilla: 'arracacha',
  brassica_oleracea_var_capitata: 'repollo',
  lactuca_sativa: 'lechuga',
  pisum_sativum: 'arveja',
  solanum_lycopersicum: 'tomate',
};
const productoSipsa = (slug) => slugToProducto[slug] || SIPSA_ALIAS[slug] || null;

// ── 5. Capa DIDÁCTICA (presentación de los MISMOS hechos, orden narrativo) ────
// Orden = del canal más cercano al campesino / mejor margen, al mayorista.
const CANAL_UI = {
  canal_venta_directa_finca: {
    orden: 1, emoji: '🤝', titulo_corto: 'Venta directa desde la finca',
    gancho: 'El que más plata le deja: usted le vende directo a quien se lo come.',
    tono: 'emerald',
  },
  canal_mercado_campesino: {
    orden: 2, emoji: '🧺', titulo_corto: 'Mercados campesinos',
    gancho: 'La plaza campesina: sitio fijo, móvil o canastas a domicilio.',
    tono: 'lime',
  },
  canal_agroferia_institucional: {
    orden: 3, emoji: '🎪', titulo_corto: 'Agroferias y grandes mercados',
    gancho: 'Los eventos grandes que arma la alcaldía o la gobernación.',
    tono: 'amber',
  },
  canal_compra_publica_acfc: {
    orden: 4, emoji: '🏫', titulo_corto: 'Compra pública (Ley 2046)', oportunidad: true,
    gancho: 'La ley obliga a comprarle mínimo 30% a la agricultura campesina. Y le pagan contra entrega.',
    tono: 'violet',
  },
  canal_agroindustria_cliente_formal: {
    orden: 5, emoji: '🧾', titulo_corto: 'Venderle a un cliente formal',
    gancho: 'Restaurante, tienda o agroindustria: el comprador hace el papeleo con la DIAN, usted no factura.',
    tono: 'sky',
  },
  canal_central_mayorista_sipsa: {
    orden: 6, emoji: '🚛', titulo_corto: 'Central mayorista',
    gancho: 'El precio de referencia del país (SIPSA/DANE). Ojo: es precio de central, no de finca.',
    tono: 'slate',
  },
};

// Régimen sanitario / nivel de riesgo derivado del texto del nodo (verbatim del
// grafo). El nivel ordena de "puede arrancar ya" a "trámite fuerte".
const VALOR_UI = {
  valor_agregado_panela: {
    orden: 1, emoji: '🟫', nivel_riesgo: 'bajo',
    regimen: 'No requiere Registro Sanitario INVIMA (mientras sea natural, sin saborizantes).',
    gancho: 'La panela natural puede arrancar sin registro INVIMA.',
  },
  valor_agregado_cafe_tostado: {
    orden: 2, emoji: '☕', nivel_riesgo: 'bajo-medio',
    regimen: 'No pide el mismo trámite que un lácteo, pero sí Buenas Prácticas de Manufactura (BPM).',
    gancho: 'Tostar y moler el café multiplica el margen frente al pergamino.',
  },
  valor_agregado_mermelada: {
    orden: 3, emoji: '🍓', nivel_riesgo: 'medio',
    regimen: 'Entra a categorización de riesgo INVIMA (Registro/Permiso/Notificación según riesgo).',
    gancho: 'Microempresas y asociaciones NO pagan la tarifa del registro la primera vez (Ley 2069/2020).',
  },
  valor_agregado_queso: {
    orden: 4, emoji: '🧀', nivel_riesgo: 'alto',
    regimen: 'Lácteo = ALTO RIESGO: exige Registro Sanitario (RSA), vigencia 5 años (Res. 719/2015, 2674/2013).',
    gancho: 'El queso vende bien, pero es el trámite sanitario más exigente. Planéelo con tiempo.',
  },
};

// ── 6. Ensamble final ────────────────────────────────────────────────────────
const canales = canalesRaw
  .map((c) => ({
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    descripcion: c.descripcion,
    fuente: c.fuente,
    confianza: c.confianza,
    ...(CANAL_UI[c.id] || { orden: 99, emoji: '•', tono: 'slate' }),
  }))
  .sort((a, b) => a.orden - b.orden);

const valorAgregado = valorRaw
  .map((v) => ({
    id: v.id,
    nombre: v.nombre,
    tipo: v.tipo,
    descripcion: v.descripcion,
    fuente: v.fuente,
    confianza: v.confianza,
    ...(VALOR_UI[v.id] || { orden: 99, emoji: '•', nivel_riesgo: 'n/d' }),
  }))
  .sort((a, b) => a.orden - b.orden);

// Despensa: una entrada por especie que se comercializa, con sus canales, su
// transformación (si tiene) y su producto SIPSA (para el chip de precio vivo).
const transformaBySpecies = new Map();
for (const t of transformaRows) transformaBySpecies.set(t.species_id, t.valor_id);

const despensaMap = new Map();
for (const row of comercializaRows) {
  if (!despensaMap.has(row.species_id)) {
    const img = imgById.get(row.species_id) || null;
    despensaMap.set(row.species_id, {
      species_id: row.species_id,
      nombre_comun: row.nombre_comun,
      nombre_cientifico: img?.scientific_name || null,
      canales: [],
      transforma_en: transformaBySpecies.get(row.species_id) || null,
      producto_sipsa: productoSipsa(row.species_id),
      imagen: img
        ? { url: img.image_url, licencia: img.license || null, autor: img.attribution || null }
        : null,
    });
  }
  despensaMap.get(row.species_id).canales.push(row.canal_id);
}
const despensa = [...despensaMap.values()].sort((a, b) =>
  a.nombre_comun.localeCompare(b.nombre_comun, 'es'));

const conPrecio = despensa.filter((d) => d.producto_sipsa).length;

const out = {
  meta: {
    titulo: 'Mercado y despensa',
    subtitulo: '¿Por dónde vendo, cómo le agrego valor y a cómo está?',
    origen_datos:
      'Grafo de conocimiento chagra_kg (nodos CanalComercializacion + ValorAgregado y aristas ' +
      'SE_COMERCIALIZA_EN / SE_TRANSFORMA_EN), exportado a estático porque la PWA no consulta el grafo en vivo.',
    batch: 'mercado-estructural-dr-2026-07-05',
    generado: new Date().toISOString().slice(0, 10),
    total_canales: canales.length,
    total_valor_agregado: valorAgregado.length,
    total_despensa: despensa.length,
    despensa_con_producto_sipsa: conPrecio,
    nota_precios:
      'Este archivo NO contiene precios. Los precios del día los trae el agente en vivo con get_precio_sipsa ' +
      '(SIPSA/DANE). Donde no hay dato en vivo, se dice claro y se remite a la fuente oficial. Nunca se inventa un número.',
    fuente_precio_url: 'https://www.dane.gov.co/index.php/estadisticas-por-tema/agropecuario/sistema-de-informacion-de-precios-sipsa',
  },
  canales,
  valor_agregado: valorAgregado,
  despensa,
};

const dest = resolve(ROOT, 'public/mercado-despensa.json');
writeFileSync(dest, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(
  `✓ ${dest}\n  ${canales.length} canales · ${valorAgregado.length} valor agregado · ` +
  `${despensa.length} cultivos en despensa (${conPrecio} con producto SIPSA) · ` +
  `${transformaRows.length} aristas de transformación`,
);
