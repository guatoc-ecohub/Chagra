/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Este módulo es DATOS SEMILLA (nombres de fincas, veredas, municipios,
 * variedades y notas agronómicas de la finca de ejemplo), no chrome de UI. Los
 * nombres propios ("Finca El Cacaotal", "San Vicente de Chucurí") y las notas
 * de contexto no son cadenas traducibles a src/config/messages.js — son el
 * contenido demostrativo mismo. Mismo criterio que demoPersonaSeeds.js y que el
 * disable a nivel de archivo de DashboardLive.jsx / FincaVivaHero.jsx. */
/**
 * demoFincaEjemplo — la FINCA DE EJEMPLO RICA que puebla Chagra al SALTAR el
 * onboarding ("Explorar con finca de ejemplo").
 *
 * Es la base del demo público: un usuario que entra por primera vez y no quiere
 * llenar formularios ve, en un toque, una finca que lo tiene TODO — no un campo
 * muerto. Modela una red campesina real de la cordillera colombiana repartida
 * por PISO TÉRMICO (cálido / templado / frío), con sus cultivos INSIGNIA por
 * piso, historial de cada mata (siembra → evolución → cosecha) y PROBLEMAS
 * ACTIVOS que despiertan el diagnóstico del agente (broca/roya en café, gota en
 * papa, mosca de la fruta en maracuyá).
 *
 * PRINCIPIO INNEGOCIABLE — CERO FABRICACIÓN DE ESPECIES: cada `subject_slug` y
 * cada `plant_type` sale del catálogo REAL de 580 especies (public/catalog.sqlite,
 * verificado 2026-07-04). Las plagas usan la MISMA base que el motor de alertas
 * (climateCycleService.getPestRisksByStage): café→broca/roya, papa→gota/tizón.
 * Las variedades, altitudes y municipios son plausibles de la agroecología
 * andina; nada de números fake escandalosos.
 *
 * Persistencia: escribe en IndexedDB (ChagraDB) EXACTAMENTE como una finca real —
 * asset--land (zonas por piso), asset--structure (invernadero, compostera,
 * beneficiadero, gallinero), asset--plant (una por siembra → alimenta el conteo
 * "Mis plantas: N"), farm_process (ciclos con etapa fenológica real) y
 * farm_process_event (el historial). Así el home "Finca Viva" la renderiza
 * POBLADA sin ningún camino especial: consume los mismos stores de siempre.
 *
 * Idempotente: los ids son deterministas (`ej-*`), así que re-sembrar sobre-
 * escribe sin duplicar. Un flag en localStorage marca que ya se sembró.
 *
 * Español de Colombia (tú/usted), sin voseo.
 *
 * @module services/demoFincaEjemplo
 */

import { openDB, STORES } from '../db/dbCore.js';

/** Flag localStorage: ¿ya se sembró la finca de ejemplo en este dispositivo? */
export const EXAMPLE_FINCA_SEEDED_KEY = 'chagra:finca-ejemplo:sembrada:v1';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Red de fincas de ejemplo, agrupadas por PISO TÉRMICO. Tres fincas por piso
 * (cálido / templado / frío), cada una con su lote (asset--land), cultivos
 * insignia y — en algunas — un problema activo que dispara el diagnóstico.
 *
 * Campos de cada cultivo:
 *   - slug:    id EXACTO del catálogo (verificado). No inventar.
 *   - nombre:  nombre común corto para la escena/etiqueta.
 *   - variedad:variedad plausible (opcional).
 *   - kind:    'individual' | 'aggregate' (subject_kind del FarmProcess).
 *   - unidad:  'plantas' | 'arboles' | 'matas' | 'semillas' | 'kg'.
 *   - cantidad:cantidad declarada (entero >= 1).
 *   - etapa:   current_stage fenológica (VALID_STAGES de types/farmProcess).
 *   - diasSiembra: hace cuántos días se sembró (para el historial).
 *   - problema:(opcional) { sintoma, plaga, control } — genera un evento
 *              observation + deja el ciclo en una etapa que el motor de
 *              alertas reconoce (café floración/vegetativa, papa vegetativa).
 *   - cosechado:(opcional) true → agrega evento harvest_confirmed al historial.
 */
export const FINCAS_EJEMPLO = Object.freeze([
  // ─────────────────────────── PISO CÁLIDO (200–1000 msnm) ──────────────────
  {
    id: 'calido-cacaotal',
    nombre: 'Finca El Cacaotal',
    piso: 'calido',
    altitud_msnm: 450,
    vereda: 'La Colorada',
    municipio: 'San Vicente de Chucurí',
    departamento: 'Santander',
    land_type: 'field',
    descripcion: 'SAF de cacao con sombra de guamo y matarratón, plátano asociado.',
    cultivos: [
      { slug: 'theobroma_cacao', nombre: 'Cacao', variedad: 'CCN-51', kind: 'individual', unidad: 'arboles', cantidad: 320, etapa: 'fruiting', diasSiembra: 1120 },
      { slug: 'musa_paradisiaca', nombre: 'Plátano', variedad: 'Hartón', kind: 'aggregate', unidad: 'matas', cantidad: 80, etapa: 'harvest_window', diasSiembra: 300, cosechado: true },
      { slug: 'inga_edulis', nombre: 'Guamo', variedad: null, kind: 'individual', unidad: 'arboles', cantidad: 40, etapa: 'mantenimiento', diasSiembra: 900 },
      { slug: 'gliricidia_sepium', nombre: 'Matarratón', variedad: null, kind: 'individual', unidad: 'arboles', cantidad: 60, etapa: 'mantenimiento', diasSiembra: 900 },
      { slug: 'citrus_sinensis', nombre: 'Naranja', variedad: 'Valencia', kind: 'individual', unidad: 'arboles', cantidad: 18, etapa: 'flowering', diasSiembra: 700 },
      { slug: 'musa_acuminata', nombre: 'Banano', variedad: 'Criollo', kind: 'aggregate', unidad: 'matas', cantidad: 35, etapa: 'fruiting', diasSiembra: 340 },
    ],
  },
  {
    id: 'calido-lapalma',
    nombre: 'Finca La Palma',
    piso: 'calido',
    altitud_msnm: 720,
    vereda: 'El Aguacate',
    municipio: 'Rionegro',
    departamento: 'Santander',
    land_type: 'field',
    descripcion: 'Pancoger de plátano y yuca con maracuyá en espaldera.',
    cultivos: [
      { slug: 'musa_paradisiaca', nombre: 'Plátano', variedad: 'Dominico Hartón', kind: 'aggregate', unidad: 'matas', cantidad: 120, etapa: 'fruiting', diasSiembra: 280 },
      { slug: 'manihot_esculenta', nombre: 'Yuca', variedad: 'ICA Negrita', kind: 'aggregate', unidad: 'matas', cantidad: 200, etapa: 'vegetative', diasSiembra: 150 },
      {
        slug: 'passiflora_edulis_flavicarpa', nombre: 'Maracuyá', variedad: 'Amarilla', kind: 'individual', unidad: 'plantas', cantidad: 60, etapa: 'fruiting', diasSiembra: 240,
        problema: { sintoma: 'Frutos con picaduras y caída temprana.', plaga: 'Mosca de la fruta (Anastrepha spp.)', control: 'Trampas McPhail con proteína hidrolizada + recoger fruta caída.' },
      },
      { slug: 'persea_americana', nombre: 'Aguacate', variedad: 'Lorena', kind: 'individual', unidad: 'arboles', cantidad: 14, etapa: 'vegetative', diasSiembra: 500 },
      { slug: 'cucurbita_moschata', nombre: 'Ahuyama', variedad: 'Amarilla', kind: 'aggregate', unidad: 'matas', cantidad: 35, etapa: 'fruiting', diasSiembra: 100, cosechado: true },
    ],
  },
  {
    id: 'calido-villapina',
    nombre: 'Finca Villa Piña',
    piso: 'calido',
    altitud_msnm: 900,
    vereda: 'Santa Rosa',
    municipio: 'Lebrija',
    departamento: 'Santander',
    land_type: 'field',
    descripcion: 'Piña, cítricos y frutales de tierra caliente.',
    cultivos: [
      { slug: 'ananas_comosus', nombre: 'Piña', variedad: 'Oro Miel MD2', kind: 'aggregate', unidad: 'matas', cantidad: 400, etapa: 'flowering', diasSiembra: 330 },
      { slug: 'citrus_sinensis', nombre: 'Naranja', variedad: 'Valencia', kind: 'individual', unidad: 'arboles', cantidad: 30, etapa: 'fruiting', diasSiembra: 800, cosechado: true },
      { slug: 'psidium_guajava_manzana', nombre: 'Guayaba manzana', variedad: null, kind: 'individual', unidad: 'arboles', cantidad: 22, etapa: 'fruiting', diasSiembra: 640 },
      { slug: 'cucurbita_moschata', nombre: 'Ahuyama', variedad: 'Amarilla', kind: 'aggregate', unidad: 'matas', cantidad: 40, etapa: 'flowering', diasSiembra: 90 },
      { slug: 'musa_acuminata', nombre: 'Banano', variedad: 'Gros Michel', kind: 'aggregate', unidad: 'matas', cantidad: 30, etapa: 'vegetative', diasSiembra: 180 },
    ],
  },

  // ────────────────────────── PISO TEMPLADO (1000–2000 msnm) ────────────────
  {
    id: 'templado-mirador',
    nombre: 'Finca El Mirador',
    piso: 'templado',
    altitud_msnm: 1650,
    vereda: 'Alto Bonito',
    municipio: 'Chinchiná',
    departamento: 'Caldas',
    land_type: 'field',
    descripcion: 'Café bajo sombra de guamo (SAF), banano y aguacate.',
    cultivos: [
      {
        slug: 'coffea_arabica', nombre: 'Café', variedad: 'Castillo', kind: 'individual', unidad: 'arboles', cantidad: 350, etapa: 'flowering', diasSiembra: 620,
        problema: { sintoma: 'Manchas amarillo-naranja en el envés de la hoja y frutos perforados.', plaga: 'Roya del cafeto (Hemileia vastatrix) + Broca (Hypothenemus hampei)', control: 'Variedad resistente + caldo bordelés preventivo + trampas Brocap y Beauveria bassiana.' },
      },
      { slug: 'inga_edulis', nombre: 'Guamo', variedad: null, kind: 'individual', unidad: 'arboles', cantidad: 45, etapa: 'mantenimiento', diasSiembra: 1500 },
      { slug: 'musa_acuminata', nombre: 'Banano', variedad: 'Gros Michel', kind: 'aggregate', unidad: 'matas', cantidad: 60, etapa: 'fruiting', diasSiembra: 320, cosechado: true },
      { slug: 'persea_americana', nombre: 'Aguacate', variedad: 'Hass', kind: 'individual', unidad: 'arboles', cantidad: 20, etapa: 'flowering', diasSiembra: 900 },
    ],
  },
  {
    id: 'templado-buenavista',
    nombre: 'Finca Buenavista',
    piso: 'templado',
    altitud_msnm: 1520,
    vereda: 'San Fernando',
    municipio: 'Líbano',
    departamento: 'Tolima',
    land_type: 'field',
    descripcion: 'Café Cenicafé 1, lulo y aguacate Hass.',
    cultivos: [
      { slug: 'coffea_arabica', nombre: 'Café', variedad: 'Cenicafé 1', kind: 'individual', unidad: 'arboles', cantidad: 280, etapa: 'fruiting', diasSiembra: 720, cosechado: true },
      {
        slug: 'solanum_quitoense', nombre: 'Lulo', variedad: 'La Selva', kind: 'individual', unidad: 'plantas', cantidad: 90, etapa: 'flowering', diasSiembra: 200,
        problema: { sintoma: 'Hojas con perforaciones y presencia de larvas en el tallo.', plaga: 'Barrenador del tallo del lulo (Alcidion sp.)', control: 'Poda sanitaria + eliminación de plantas afectadas + Beauveria bassiana.' },
      },
      { slug: 'persea_americana', nombre: 'Aguacate', variedad: 'Hass', kind: 'individual', unidad: 'arboles', cantidad: 16, etapa: 'vegetative', diasSiembra: 420 },
      { slug: 'coriandrum_sativum', nombre: 'Cilantro', variedad: null, kind: 'aggregate', unidad: 'semillas', cantidad: 250, etapa: 'growth', diasSiembra: 30 },
    ],
  },
  {
    id: 'templado-esperanza',
    nombre: 'Finca La Esperanza',
    piso: 'templado',
    altitud_msnm: 1800,
    vereda: 'El Tablazo',
    municipio: 'Fresno',
    departamento: 'Tolima',
    land_type: 'field',
    descripcion: 'Café Caturra, plátano asociado y tomate de árbol.',
    cultivos: [
      { slug: 'coffea_arabica', nombre: 'Café', variedad: 'Caturra', kind: 'individual', unidad: 'arboles', cantidad: 300, etapa: 'vegetative', diasSiembra: 180 },
      { slug: 'musa_paradisiaca', nombre: 'Plátano', variedad: 'Hartón', kind: 'aggregate', unidad: 'matas', cantidad: 70, etapa: 'vegetative', diasSiembra: 210 },
      { slug: 'solanum_betaceum', nombre: 'Tomate de árbol', variedad: 'Común', kind: 'individual', unidad: 'arboles', cantidad: 55, etapa: 'fruiting', diasSiembra: 380 },
      { slug: 'coriandrum_sativum', nombre: 'Cilantro', variedad: null, kind: 'aggregate', unidad: 'semillas', cantidad: 300, etapa: 'growth', diasSiembra: 35 },
    ],
  },

  // ──────────────────────────── PISO FRÍO (2000–3000 msnm) ──────────────────
  {
    id: 'frio-paramo',
    nombre: 'Finca El Páramo',
    piso: 'frio',
    altitud_msnm: 2800,
    vereda: 'Chasqués',
    municipio: 'Villapinzón',
    departamento: 'Cundinamarca',
    land_type: 'field',
    descripcion: 'Papa pastusa, haba y arveja de clima frío.',
    cultivos: [
      {
        slug: 'solanum_tuberosum', nombre: 'Papa', variedad: 'Parda Pastusa', kind: 'aggregate', unidad: 'matas', cantidad: 500, etapa: 'vegetative', diasSiembra: 70,
        problema: { sintoma: 'Manchas oscuras acuosas en hojas y tallos, avanzan con la lluvia.', plaga: 'Gota / tizón tardío (Phytophthora infestans)', control: 'Drenaje del lote + variedades tolerantes + monitoreo tras cada lluvia; MIP antes de fungicida.' },
      },
      { slug: 'vicia_faba', nombre: 'Haba', variedad: 'Común', kind: 'aggregate', unidad: 'matas', cantidad: 150, etapa: 'flowering', diasSiembra: 110 },
      { slug: 'pisum_sativum_andina', nombre: 'Arveja', variedad: 'Andina', kind: 'aggregate', unidad: 'matas', cantidad: 180, etapa: 'vegetative', diasSiembra: 60 },
      { slug: 'tropaeolum_tuberosum', nombre: 'Cubio', variedad: 'Amarillo', kind: 'aggregate', unidad: 'matas', cantidad: 120, etapa: 'vegetative', diasSiembra: 85 },
      { slug: 'arracacia_xanthorrhiza', nombre: 'Arracacha', variedad: 'Amarilla', kind: 'aggregate', unidad: 'matas', cantidad: 90, etapa: 'growth', diasSiembra: 130 },
    ],
  },
  {
    id: 'frio-alisos',
    nombre: 'Finca Los Alisos',
    piso: 'frio',
    altitud_msnm: 2600,
    vereda: 'Chingacío',
    municipio: 'Chocontá',
    departamento: 'Cundinamarca',
    land_type: 'field',
    descripcion: 'Papa Diacol Capiro, cebolla, zanahoria y acelga.',
    cultivos: [
      { slug: 'solanum_tuberosum', nombre: 'Papa', variedad: 'Diacol Capiro', kind: 'aggregate', unidad: 'matas', cantidad: 450, etapa: 'harvest_window', diasSiembra: 150, cosechado: true },
      { slug: 'allium_cepa', nombre: 'Cebolla cabezona', variedad: 'Roja Ocañera', kind: 'aggregate', unidad: 'matas', cantidad: 260, etapa: 'vegetative', diasSiembra: 95 },
      { slug: 'daucus_carota_subsp_sativus', nombre: 'Zanahoria', variedad: 'Chantenay', kind: 'aggregate', unidad: 'semillas', cantidad: 400, etapa: 'growth', diasSiembra: 55 },
      { slug: 'beta_vulgaris_var_cicla', nombre: 'Acelga', variedad: 'Verde', kind: 'aggregate', unidad: 'matas', cantidad: 90, etapa: 'growth', diasSiembra: 40 },
      { slug: 'coriandrum_sativum', nombre: 'Cilantro', variedad: null, kind: 'aggregate', unidad: 'semillas', cantidad: 200, etapa: 'growth', diasSiembra: 28 },
    ],
  },
  {
    id: 'frio-lamilpa',
    nombre: 'Finca La Milpa',
    piso: 'frio',
    altitud_msnm: 2500,
    vereda: 'Mancilla',
    municipio: 'Facatativá',
    departamento: 'Cundinamarca',
    land_type: 'field',
    descripcion: 'Milpa criolla (maíz-fríjol-calabaza) + huerta e invernadero.',
    cultivos: [
      { slug: 'zea_mays', nombre: 'Maíz criollo', variedad: 'Blanco criollo', kind: 'aggregate', unidad: 'semillas', cantidad: 600, etapa: 'flowering', diasSiembra: 120 },
      { slug: 'phaseolus_vulgaris', nombre: 'Fríjol', variedad: 'Cargamanto', kind: 'aggregate', unidad: 'semillas', cantidad: 300, etapa: 'flowering', diasSiembra: 110 },
      { slug: 'cucurbita_maxima', nombre: 'Calabaza', variedad: 'Común', kind: 'aggregate', unidad: 'matas', cantidad: 30, etapa: 'vegetative', diasSiembra: 90 },
      { slug: 'lactuca_sativa_crispa_verde', nombre: 'Lechuga crespa', variedad: 'Verde', kind: 'aggregate', unidad: 'matas', cantidad: 120, etapa: 'growth', diasSiembra: 30, zona: 'invernadero' },
      { slug: 'solanum_lycopersicum_cerasiforme', nombre: 'Tomate cherry', variedad: 'Cerasiforme', kind: 'aggregate', unidad: 'plantas', cantidad: 48, etapa: 'fruiting', diasSiembra: 160, zona: 'invernadero' },
      { slug: 'allium_fistulosum', nombre: 'Cebolla larga', variedad: 'Junca', kind: 'aggregate', unidad: 'matas', cantidad: 140, etapa: 'vegetative', diasSiembra: 80 },
    ],
  },
]);

/**
 * Estructuras (asset--structure) de la finca de ejemplo: dan cuerpo a la escena
 * (invernadero, compostera, beneficiadero, gallinero). Plausibles de una red
 * campesina real.
 */
export const ESTRUCTURAS_EJEMPLO = Object.freeze([
  { id: 'ej-str-invernadero', nombre: 'Invernadero La Milpa', structure_type: 'greenhouse', finca: 'frio-lamilpa', notas: 'Túnel para lechuga y tomate cherry.' },
  { id: 'ej-str-compostera', nombre: 'Compostera central', structure_type: 'compost', finca: 'frio-lamilpa', notas: 'Bocashi y lombricompost para toda la red.' },
  { id: 'ej-str-beneficiadero', nombre: 'Beneficiadero de café', structure_type: 'building', finca: 'templado-mirador', notas: 'Despulpado, fermentación y secadero solar.' },
  { id: 'ej-str-gallinero', nombre: 'Gallinero de patio', structure_type: 'building', finca: 'calido-lapalma', notas: 'Gallinas criollas para huevo y control de plagas.' },
  { id: 'ej-str-secadero-cacao', nombre: 'Secadero de cacao', structure_type: 'building', finca: 'calido-cacaotal', notas: 'Cajas de fermentación y marquesina.' },
]);

/** Etiqueta bonita de piso térmico para notas. */
const PISO_LABEL = Object.freeze({ calido: 'cálido', templado: 'templado', frio: 'frío' });

/**
 * Construye TODOS los registros IndexedDB de la finca de ejemplo, de forma PURA
 * (sin tocar IDB ni la red). Ideal para tests: verifica conteos, slugs grounded
 * y validez de FarmProcess sin abrir la base.
 *
 * @param {Object} [opts]
 * @param {number} [opts.now=Date.now()] reloj de referencia (para historial determinista en tests).
 * @returns {{ lands: Object[], structures: Object[], plants: Object[], processes: Object[], events: Object[], logs: Object[] }}
 */
export function buildExampleFincaRecords({ now = Date.now() } = {}) {
  const lands = [];
  const structures = [];
  const plants = [];
  const processes = [];
  const events = [];
  const logs = [];

  for (const finca of FINCAS_EJEMPLO) {
    const landId = `ej-land-${finca.id}`;
    lands.push({
      id: landId,
      asset_type: 'land',
      _tenant_id: null,
      type: 'asset--land',
      attributes: {
        name: finca.nombre,
        land_type: finca.land_type || 'field',
        status: 'active',
        notes: { value: `${finca.descripcion} Vereda ${finca.vereda}, ${finca.municipio} (${finca.departamento}), ${finca.altitud_msnm} msnm — piso ${PISO_LABEL[finca.piso]}.`, format: 'plain_text' },
        _demo: true,
        _demo_finca: finca.id,
        piso_termico: finca.piso,
        altitud_msnm: finca.altitud_msnm,
        municipio: finca.municipio,
        departamento: finca.departamento,
        vereda: finca.vereda,
      },
      cached_at: now,
    });

    finca.cultivos.forEach((c, idx) => {
      const baseId = `ej-${finca.id}-${idx}-${c.slug}`;
      const plantedAt = now - (c.diasSiembra || 30) * DAY;

      // asset--plant: una siembra real (alimenta "Mis plantas: N").
      plants.push({
        id: `ej-plant-${finca.id}-${idx}`,
        asset_type: 'plant',
        _tenant_id: null,
        type: 'asset--plant',
        attributes: {
          name: `${c.nombre}${c.variedad ? ` ${c.variedad}` : ''} — ${finca.nombre}`,
          status: 'active',
          notes: { value: `Sembrado en ${finca.municipio} (${PISO_LABEL[finca.piso]}, ${finca.altitud_msnm} msnm).`, format: 'plain_text' },
          _demo: true,
          _demo_finca: finca.id,
          _chagra_plant_meta: {
            especie_slug: c.slug,
            variedad: c.variedad || null,
            cantidad: c.cantidad,
            fenologia: c.etapa,
            piso_termico: finca.piso,
          },
        },
        relationships: {
          plant_type: { data: { type: 'taxonomy_term--plant_type', id: c.slug } },
          location: { data: [{ type: 'asset--land', id: landId }] },
        },
        cached_at: now,
      });

      // farm_process: el ciclo con su etapa fenológica real.
      const processId = `ej-proc-${finca.id}-${idx}`;
      processes.push({
        process_id: processId,
        type: 'farm_process',
        attributes: {
          process_type: 'sowing',
          subject_kind: c.kind,
          subject_slug: c.slug,
          subject_label: c.nombre,
          variety: c.variedad || undefined,
          quantity: Math.max(1, Math.floor(c.cantidad || 1)),
          unit: c.unidad || 'plantas',
          location_land_asset_id: landId,
          location_zone_id: c.zona === 'invernadero' ? 'ej-str-invernadero' : undefined,
          status: 'active',
          current_stage: c.etapa,
          created_at: plantedAt,
          updated_at: now - Math.floor((c.diasSiembra || 30) / 6) * DAY,
          notes: c.variedad ? `Variedad ${c.variedad}.` : '',
        },
      });

      // ── Historial de eventos (siembra → evolución → [cosecha] → [problema]) ──
      events.push({
        event_id: `${baseId}-ev0`,
        type: 'farm_process_event',
        attributes: {
          process_id: processId,
          event_type: 'sowing_confirmed',
          occurred_at: plantedAt,
          actor: 'operator',
          source: 'operator',
          notes: `Siembra de ${c.cantidad} ${c.unidad} de ${c.nombre}${c.variedad ? ` (${c.variedad})` : ''}.`,
        },
      });

      // Transición de etapa intermedia (mitad del ciclo) → muestra evolución.
      if (c.etapa !== 'sowing_confirmed' && c.etapa !== 'sowing') {
        events.push({
          event_id: `${baseId}-ev1`,
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'stage_transition',
            occurred_at: plantedAt + Math.floor((c.diasSiembra || 30) / 2) * DAY,
            actor: 'operator',
            source: 'operator',
            payload: { to_stage: c.etapa },
            notes: `${c.nombre} avanzó a etapa "${c.etapa}".`,
          },
        });
      }

      // Cosecha registrada (si aplica) → cierra el arco siembra→cosecha.
      if (c.cosechado) {
        const harvestAt = now - 10 * DAY;
        events.push({
          event_id: `${baseId}-evH`,
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'harvest_confirmed',
            occurred_at: harvestAt,
            actor: 'operator',
            source: 'operator',
            notes: `Primera cosecha de ${c.nombre} registrada.`,
          },
        });
        logs.push({
          id: `ej-log-${finca.id}-${idx}-harvest`,
          _tenant_id: null,
          type: 'log--harvest',
          asset_id: `ej-plant-${finca.id}-${idx}`,
          timestamp: Math.floor(harvestAt / 1000),
          name: `Cosecha de ${c.nombre} — ${finca.nombre}`,
          status: 'done',
          category: 'cosecha',
          cached_at: now,
        });
      }

      // Problema activo → evento de observación con el síntoma (diagnóstico).
      if (c.problema) {
        events.push({
          event_id: `${baseId}-evP`,
          type: 'farm_process_event',
          attributes: {
            process_id: processId,
            event_type: 'observation',
            occurred_at: now - 3 * DAY,
            actor: 'operator',
            source: 'operator',
            payload: { plaga: c.problema.plaga, control: c.problema.control },
            notes: `Problema: ${c.problema.sintoma} Posible: ${c.problema.plaga}.`,
          },
        });
      }

      // Log de siembra (alimenta la actividad reciente del home).
      logs.push({
        id: `ej-log-${finca.id}-${idx}-seeding`,
        _tenant_id: null,
        type: 'log--seeding',
        asset_id: `ej-plant-${finca.id}-${idx}`,
        timestamp: Math.floor(plantedAt / 1000),
        name: `Siembra de ${c.nombre} — ${finca.nombre}`,
        status: 'done',
        category: 'cultivo',
        cached_at: now,
      });
    });
  }

  // Estructuras (asset--structure).
  for (const s of ESTRUCTURAS_EJEMPLO) {
    structures.push({
      id: s.id,
      asset_type: 'structure',
      _tenant_id: null,
      type: 'asset--structure',
      attributes: {
        name: s.nombre,
        structure_type: s.structure_type,
        status: 'active',
        notes: { value: s.notas, format: 'plain_text' },
        _demo: true,
        _demo_finca: s.finca,
      },
      cached_at: now,
    });
  }

  return { lands, structures, plants, processes, events, logs };
}

/**
 * Resumen agregado de la finca de ejemplo (para toasts / reportes / tests).
 * @returns {{ fincas:number, pisos:Object<string,number>, cultivos:number, problemas:number, cosechas:number, estructuras:number, especies:number }}
 */
export function resumenFincaEjemplo() {
  /** @type {Record<string, number>} */
  const pisos = {};
  let cultivos = 0;
  let problemas = 0;
  let cosechas = 0;
  const especies = new Set();
  for (const f of FINCAS_EJEMPLO) {
    pisos[f.piso] = (pisos[f.piso] || 0) + 1;
    for (const c of f.cultivos) {
      cultivos += 1;
      especies.add(c.slug);
      if (c.problema) problemas += 1;
      if (c.cosechado) cosechas += 1;
    }
  }
  return {
    fincas: FINCAS_EJEMPLO.length,
    pisos,
    cultivos,
    problemas,
    cosechas,
    estructuras: ESTRUCTURAS_EJEMPLO.length,
    especies: especies.size,
  };
}

/** ¿Ya se sembró la finca de ejemplo en este dispositivo? Fail-open: si el
 * storage está roto, respondemos false para permitir re-sembrar (idempotente). */
export function isExampleFincaSeeded() {
  try {
    return window.localStorage.getItem(EXAMPLE_FINCA_SEEDED_KEY) === '1';
  } catch {
    return false;
  }
}

function marcarSembrada() {
  try {
    window.localStorage.setItem(EXAMPLE_FINCA_SEEDED_KEY, '1');
  } catch {
    /* storage no disponible: el flag simplemente no persiste */
  }
}

/**
 * Siembra la finca de ejemplo en IndexedDB (assets, ciclos, eventos y logs) en
 * una sola transacción atómica. Idempotente: los ids son deterministas, así que
 * re-invocar sobre-escribe sin duplicar.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.force=false] re-sembrar aunque el flag ya esté puesto.
 * @param {number} [opts.now=Date.now()] reloj de referencia.
 * @returns {Promise<ReturnType<typeof resumenFincaEjemplo>>} resumen de lo sembrado.
 */
export async function seedExampleFinca({ force = false, now = Date.now() } = {}) {
  if (isExampleFincaSeeded() && !force) {
    return resumenFincaEjemplo();
  }

  const { lands, structures, plants, processes, events, logs } = buildExampleFincaRecords({ now });
  const db = await openDB();

  await new Promise((resolve, reject) => {
    const tx = db.transaction([
      STORES.ASSETS,
      STORES.FARM_PROCESSES,
      STORES.FARM_PROCESS_EVENTS,
      STORES.LOGS,
      STORES.SYNC_META,
    ], 'readwrite');

    const assetStore = tx.objectStore(STORES.ASSETS);
    for (const a of [...lands, ...structures, ...plants]) assetStore.put(a);

    const fpStore = tx.objectStore(STORES.FARM_PROCESSES);
    for (const p of processes) fpStore.put(p);

    const fpeStore = tx.objectStore(STORES.FARM_PROCESS_EVENTS);
    for (const e of events) fpeStore.put(e);

    const logStore = tx.objectStore(STORES.LOGS);
    for (const l of logs) logStore.put(l);

    tx.objectStore(STORES.SYNC_META).put({ key: 'finca_ejemplo_sembrada', value: true });

    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });

  marcarSembrada();

  // Refrescar el store de activos en memoria para que el home reaccione sin
  // recargar (fail-silent en tests/SSR sin el store montado).
  try {
    const mod = await import('../store/useAssetStore.js');
    const store = mod.default;
    if (store && typeof store.getState === 'function') {
      await store.getState().hydrate();
    }
  } catch {
    /* sin store montado (test/SSR): el home hidratará al montar */
  }

  const resumen = resumenFincaEjemplo();
  console.info(
    `[demoFincaEjemplo] Finca de ejemplo sembrada: ${resumen.fincas} fincas · ` +
    `${plants.length} siembras · ${resumen.problemas} problemas activos · ${structures.length} estructuras.`,
  );
  return resumen;
}

export default seedExampleFinca;
