#!/usr/bin/env node
/**
 * gen-veredas-dataset.mjs — genera dataset de veredas desde perfiles existentes.
 *
 * Lee localStorage (si está disponible) o un archivo de exportación de perfiles
 * y construye src/data/veredas-crowdsourced.json con las veredas que los usuarios
 * han escrito manualmente.
 *
 * Uso:
 *   node scripts/gen-veredas-dataset.mjs
 *
 * El output es un JSON:
 *   {
 *     "_meta": { source: "crowdsourced", generatedAt: "...", total: 42 },
 *     "municipio_codigo": {
 *       "nombre_vereda": {
 *         "conteo": 5,
 *         "lat_promedio": 5.02,
 *         "lng_promedio": -74.15,
 *         "ejemplo_display_name": "La Esperanza, Zipaquirá"
 *       }
 *     }
 *   }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Dataset DANE de municipios (para validar códigos)
const COLOMBIA_LOCATIONS_PATH = path.join(ROOT, 'src/data/colombia-locations.dane.json');
const OUTPUT_PATH = path.join(ROOT, 'src/data/veredas-crowdsourced.json');

/**
 * Simulación de perfiles para testing.
 * En producción, esto vendría de:
 *   - localStorage export (client-side)
 *   - Base de datos de perfiles (si existiera backend)
 */
const MOCK_PERFILES = [
  { vereda: 'La Esperanza', municipio: 'Zipaquirá', lat: 5.02, lng: -74.15 },
  { vereda: 'La Esperanza', municipio: 'Zipaquirá', lat: 5.03, lng: -74.14 },
  { vereda: 'Mundo Nuevo', municipio: 'La Calera', lat: 4.68, lng: -73.85 },
  { vereda: 'Mundo Nuevo', municipio: 'La Calera', lat: 4.67, lng: -73.84 },
  { vereda: 'El Hato', municipio: 'Cajicá', lat: 4.92, lng: -74.02 },
  { vereda: 'El Hato', municipio: 'Cajicá', lat: 4.93, lng: -74.01 },
  { vereda: 'El Hato', municipio: 'Cajicá', lat: 4.91, lng: -74.03 },
];

/**
 * Normaliza nombre de vereda para agrupar.
 */
function normalize(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Agrupa veredas por municipio y las contabiliza.
 */
function agruparVeredas(perfiles) {
  const grupos = {};

  for (const perfil of perfiles) {
    if (!perfil.vereda || !perfil.municipio) continue;

    const veredaNormalizada = normalize(perfil.vereda);
    const clave = `${perfil.municipio}:${veredaNormalizada}`;

    if (!grupos[clave]) {
      grupos[clave] = {
        vereda: veredaNormalizada,
        municipio: perfil.municipio,
        conteo: 0,
        lat_sum: 0,
        lng_sum: 0,
        ejemplos: [],
      };
    }

    grupos[clave].conteo++;
    grupos[clave].lat_sum += perfil.lat || 0;
    grupos[clave].lng_sum += perfil.lng || 0;
    grupos[clave].ejemplos.push(perfil);
  }

  return grupos;
}

/**
 * Construye dataset final desde grupos.
 */
function construirDataset(grupos, daneDataset) {
  const dataset = {
    _meta: {
      source: 'crowdsourced',
      generatedAt: new Date().toISOString(),
      total_veredas: 0,
      municipio_codigos: [],
    },
    por_codigo: {},
  };

  // Mapa nombre municipio → código DIVIPOLA desde dataset DANE
  const municipioToCodigo = {};
  for (const [depto, info] of Object.entries(daneDataset.departamentos || {})) {
    for (const mun of info.municipios || []) {
      municipioToCodigo[mun.name.toLowerCase()] = mun.codigo;
    }
  }

  for (const grupo of Object.values(grupos)) {
    // Solo incluir veredas confirmadas por >=2 usuarios (anti-spam)
    if (grupo.conteo < 2) continue;

    const codigo = municipioToCodigo[grupo.municipio.toLowerCase()];
    if (!codigo) {
      console.warn(`[warn] Municipio no encontrado en DANE: ${grupo.municipio}`);
      continue;
    }

    if (!dataset.por_codigo[codigo]) {
      dataset.por_codigo[codigo] = {};
      dataset._meta.municipio_codigos.push(codigo);
    }

    dataset.por_codigo[codigo][grupo.vereda] = {
      conteo: grupo.conteo,
      lat_promedio: grupo.lat_sum / grupo.conteo,
      lng_promedio: grupo.lng_sum / grupo.conteo,
      ejemplo_display_name: `${grupo.vereda}, ${grupo.municipio}`,
    };

    dataset._meta.total_veredas++;
  }

  return dataset;
}

/**
 * Main function.
 */
async function main() {
  console.log('[gen-veredas-dataset] Iniciando...');

  // 1. Cargar dataset DANE de municipios
  let daneDataset;
  try {
    const daneContent = fs.readFileSync(COLOMBIA_LOCATIONS_PATH, 'utf-8');
    daneDataset = JSON.parse(daneContent);
    console.log(`[info] Dataset DANE cargado: ${daneDataset._meta?.municipios || 0} municipios`);
  } catch (e) {
    console.error('[error] No se pudo leer dataset DANE:', e.message);
    process.exit(1);
  }

  // 2. Cargar perfiles (MOCK por ahora)
  // TODO: en producción, leer desde localStorage export o DB
  const perfiles = MOCK_PERFILES;
  console.log(`[info] Perfiles cargados: ${perfiles.length}`);

  // 3. Agrupar veredas
  const grupos = agruparVeredas(perfiles);
  console.log(`[info] Veredas agrupadas: ${Object.keys(grupos).length}`);

  // 4. Construir dataset final
  const dataset = construirDataset(grupos, daneDataset);
  console.log(`[info] Dataset construido: ${dataset._meta.total_veredas} veredas`);

  // 5. Escribir archivo
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 2));
  console.log(`[success] Dataset escrito en: ${OUTPUT_PATH}`);

  // 6. Resumen
  console.log('\n[summary]');
  console.log(`  Total veredas: ${dataset._meta.total_veredas}`);
  console.log(`  Municipios con veredas: ${dataset._meta.municipio_codigos.length}`);
  
  // Ejemplo: veredas de Zipaquirá
  const zipaquiráCodigo = '25871'; // DIVIPOLA Zipaquirá
  if (dataset.por_codigo[zipaquiráCodigo]) {
    console.log(`\n  Ejemplo Zipaquirá:`);
    for (const [vereda, data] of Object.entries(dataset.por_codigo[zipaquiráCodigo])) {
      console.log(`    - ${vereda} (${data.conteo} usuarios)`);
    }
  }
}

// Ejecutar
main().catch(e => {
  console.error('[fatal]', e);
  process.exit(1);
});
