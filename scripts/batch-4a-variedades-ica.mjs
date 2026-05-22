#!/usr/bin/env node
/**
 * Batch 4A — Variedades ICA documentadas (Pasada 4 residual)
 *
 * Poblamiento puntual de `variedades_registradas_ica[]` en species padre
 * con datos verificables. Para los casos sin resolución ICA confirmada
 * (cucurbita_moschata La Plata Caribe, bactris_gasipaes Pacífico Chocoana)
 * NO se inventa código — la información de variedad se nota en
 * `valor_pedagogico` de la species padre + la cultivar dedicada existente.
 *
 * Sources:
 * - DR consolidado 3-LLMs `dr-variedades-ica-CONSOLIDADO-3LLMs-2026-05-21.md`
 *   confirma Res. ICA 00015201/2019 para AGROSAVIA La 22 (arracacha).
 * - Cultivar species dedicadas ya existen para los tres casos:
 *   * arracacia_xanthorrhiza_agrosavia_la22
 *   * cucurbita_moschata_agrosavia_la_plata
 *   * bactris_gasipaes_pacifico_chocoana
 *
 * Schema v3.2 (PR #973): AMB-20/21 strict (errors). Solo se inserta entry
 * en variedades_registradas_ica cuando hay resolución ICA verificada.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const CATALOG_PATH = 'catalog/chagra-catalog-seed-v3.1.json';
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));

const FECHA = '2026-05-22';
const NOTA_EDITORIAL_CANONICA =
  'Informacion referencial recopilada de fuentes publicas (ICA, AGROSAVIA). Sin convenio formal entre Chagra y estas instituciones. La PEA y el registro real corresponden a ICA; consultar resolucion oficial antes de tomar decisiones comerciales.';

function findSpecies(id) {
  return catalog.species.find((s) => s.id === id);
}

// === 1. arracacia_xanthorrhiza — AGROSAVIA La 22 (Res. 00015201/2019) ===
// Resolución verificada por DR consolidado 3-LLMs 2026-05-21.
// Mirror de la entrada en arracacia_xanthorrhiza_agrosavia_la22 pero
// referenciando a la species padre.
const arracacha = findSpecies('arracacia_xanthorrhiza');
if (!arracacha) throw new Error('species arracacia_xanthorrhiza no encontrada');

arracacha.variedades_registradas_ica = [
  {
    id_canonico: 'agrosavia-la22-arracacha-2019',
    nombre_comercial: 'AGROSAVIA La 22',
    codigo_experimental: null,
    nombre_botanico: 'Arracacia xanthorrhiza Bancr.',
    species_id_chagra: 'arracacia_xanthorrhiza',
    obtentor: {
      nombre: 'AGROSAVIA',
      denominacion_legal: 'Corporacion Colombiana de Investigacion Agropecuaria',
      centro_investigacion: 'C.I. Tibaitata',
    },
    resolucion_ica: {
      numero: '015201/2019',
      fecha: '2019',
      url_oficial: 'https://www.ica.gov.co/',
    },
    estado_registro: 'vigente',
    subregiones_naturales_ica: [
      {
        nombre: 'Region Andina',
        estratos_altitudinales_msnm: [
          { min: 1200, max: 1800, etiqueta: 'templado' },
          { min: 1800, max: 2200, etiqueta: 'frio_moderado' },
          { min: 2200, max: null, etiqueta: 'frio' },
        ],
      },
    ],
    departamentos_inferidos: ['Cundinamarca', 'Boyaca', 'Tolima', 'Narino', 'Cauca'],
    productividad: {
      rendimiento_promedio_t_ha: 34.8,
      rendimiento_tradicional_t_ha_comparado: {
        min: 7,
        max: 13,
        fuente_comparacion: 'promedio historico arracacha tradicional',
      },
      ciclo_meses: 11,
      tipo_dato: 'experimental',
    },
    caracteristicas_distintivas: [
      'raiz tuberosa amarillo intenso',
      'alto Brix (12-14 grados vs 9-11 de criollas)',
      'ausencia de pigmentacion morada en nabos',
    ],
    resistencias_documentadas: [],
    disponibilidad_semilla: {
      tipo_propagacion: 'asexual_propagulo',
      puntos_venta_oficiales: [
        { nombre: 'AGROSAVIA C.I. Tibaitata', ciudad: 'Mosquera' },
        { nombre: 'AGROSAVIA C.I. Obonuco', ciudad: 'Pasto' },
      ],
      requiere_licencia_multiplicador: true,
      norma_aplicable: 'Res. ICA 3168/2015 + Res. ICA 067516/2020',
    },
    ano_liberacion: 2019,
    source_ids: ['agrosavia-arracacha-la22-2021', 'agrosavia-modelo-arracacha-2024'],
    nota_editorial: NOTA_EDITORIAL_CANONICA,
    fecha_ingreso_chagra: FECHA,
    ultima_revision_chagra: FECHA,
    _curation_status: 'BATCH_4A_PASADA_4_RESIDUAL',
    _revisor: 'claude-opus-4-7',
  },
];

// === 2. cucurbita_moschata — AGROSAVIA La Plata Caribe ===
// Sin resolución ICA verificable en catálogo público 2026-05-22; el DR
// consolidado 3-LLMs no listó número para esta variedad. NO inventamos
// código. La información se documenta en valor_pedagogico de la species
// padre + la cultivar dedicada `cucurbita_moschata_agrosavia_la_plata`
// (ya existe) recibe nota de validation_level + saber_origen.
const cucurbita = findSpecies('cucurbita_moschata');
if (!cucurbita) throw new Error('species cucurbita_moschata no encontrada');

const NOTA_LA_PLATA = ' Variedad documentada AGROSAVIA La Plata Caribe (desarrollada por AGROSAVIA C.I. Caribia + C.I. La Libertad, Meta; cultivar tropical de bajío adaptado a costa Caribe y Orinoquia, fruto ~5 kg, pulpa naranja, alto beta-caroteno). Resolución ICA no localizada en catalogo publico 2026-05-22 — entrada estructurada en variedades_registradas_ica pendiente de verificacion. Ver species_id chagra `cucurbita_moschata_agrosavia_la_plata` para detalle cultivar.';

cucurbita.valor_pedagogico = (cucurbita.valor_pedagogico || '').trimEnd() + NOTA_LA_PLATA;

// Cultivar dedicada: enriquecer con metadatos editoriales
const cucurbitaLaPlata = findSpecies('cucurbita_moschata_agrosavia_la_plata');
if (cucurbitaLaPlata) {
  cucurbitaLaPlata.validation_level = cucurbitaLaPlata.validation_level || 'claude_draft';
  cucurbitaLaPlata._curation_status = 'BATCH_4A_PASADA_4_RESIDUAL';
  cucurbitaLaPlata._revisor = 'claude-opus-4-7';
  // Nota editorial sobre status registro
  cucurbitaLaPlata.valor_pedagogico = (cucurbitaLaPlata.valor_pedagogico || '').trimEnd() +
    ' Nota editorial: AGROSAVIA La Plata Caribe / Bolo Verde Caribe; obtentor AGROSAVIA C.I. La Libertad (Meta) y C.I. Caribia (Magdalena); liberacion comercial decada 2010; resolucion ICA no localizada en catalogo publico al 2026-05-22 (verificar repository.agrosavia.co antes de poblar variedades_registradas_ica strict).';
}

// === 3. bactris_gasipaes — Pacifico Chocoana / PIB1 ===
// Mismo tratamiento: sin resolución verificable, no inventamos. Nota
// en valor_pedagogico padre + cultivar dedicada existente.
const bactris = findSpecies('bactris_gasipaes');
if (!bactris) throw new Error('species bactris_gasipaes no encontrada');

const NOTA_PACIFICO = ' Variedad documentada Pacifico Chocoana (tambien "Seleccion Pacifico" o "PIB1" en programa AGROSAVIA Tumaco / SENA Pacifico; cultivar del Pacifico colombiano, fruto naranja-rojo, alto carotenoide, decadas 2000s+). Resolucion ICA no localizada en catalogo publico 2026-05-22 — verificar AGROSAVIA Cartilla Chontaduro 2015 + Bernal & Galeano Palmas de Colombia. Ver species_id chagra `bactris_gasipaes_pacifico_chocoana` para detalle cultivar.';

bactris.valor_pedagogico = (bactris.valor_pedagogico || '').trimEnd() + NOTA_PACIFICO;

const bactrisPacifico = findSpecies('bactris_gasipaes_pacifico_chocoana');
if (bactrisPacifico) {
  bactrisPacifico.validation_level = bactrisPacifico.validation_level || 'claude_draft';
  bactrisPacifico._curation_status = 'BATCH_4A_PASADA_4_RESIDUAL';
  bactrisPacifico._revisor = 'claude-opus-4-7';
  bactrisPacifico.valor_pedagogico = (bactrisPacifico.valor_pedagogico || '').trimEnd() +
    ' Nota editorial: tambien identificada como "Seleccion Pacifico" o "PIB1" en programa AGROSAVIA Tumaco / SENA Pacifico; fruto naranja-rojo alto carotenoide; resolucion ICA no localizada al 2026-05-22 (verificar AGROSAVIA Cartilla Chontaduro 2015, Bernal & Galeano Palmas de Colombia antes de poblar variedades_registradas_ica strict).';
}

// === 4. Species sospechosas — clarificacion landrace ===
// malus_domestica_sabanera, prunus_persica_amarilla, prunus_domestica_ciruela_imperial
// IDs ya son canonicos en el catalogo. Anadir nota inline en valor_pedagogico
// aclarando landrace local sin registro ICA formal.
const SUSPECT_NOTE = {
  malus_domestica_sabanera:
    ' Nota landrace: el cv. "Sabanera" es un cultivar tradicional / landrace de la Sabana de Bogota y altiplano cundiboyacense, no un registro ICA formal — nombre vernaculo usado por productores andinos de Cundinamarca/Boyaca/Narino. ID canonico chagra preservado.',
  prunus_persica_amarilla:
    ' Nota landrace: el cv. "Amarillo Sabanero" es un landrace andino tradicional (>=3 siglos en altiplano colombiano), no un registro ICA formal — nombre vernaculo de la region andina (Antioquia/Cundinamarca/Boyaca/Narino). ID canonico chagra preservado.',
  prunus_domestica_ciruela_imperial:
    ' Nota landrace: el cv. "Imperial" es un cultivar tradicional eurasiatico aclimatado al altiplano colombiano (Sopo, Chia, Tabio, Tenjo) desde la epoca colonial, no un registro ICA formal — nombre vernaculo. ID canonico chagra preservado.',
};

for (const [id, note] of Object.entries(SUSPECT_NOTE)) {
  const sp = findSpecies(id);
  if (!sp) throw new Error(`species ${id} no encontrada`);
  if (!(sp.valor_pedagogico || '').includes('Nota landrace:')) {
    sp.valor_pedagogico = (sp.valor_pedagogico || '').trimEnd() + note;
  }
}

// === 5. Source agrosavia-alhaja-ica-17702-2019 — actualizar audit ===
// El audit 2026-05-18 marco la source como huerfana, pero esta referenciada
// desde solanum_tuberosum_pastusa_suprema.variedades_registradas_ica[0].source_ids.
// Actualizar el flag.
const alhajaSource = catalog.sources.find((s) => s.id === 'agrosavia-alhaja-ica-17702-2019');
if (alhajaSource) {
  delete alhajaSource._orphan_audit_2026_05_18;
  alhajaSource._referenced_by_audit_2026_05_22 =
    'solanum_tuberosum_pastusa_suprema.variedades_registradas_ica[agrosavia-alhaja-papa-2019].source_ids — verificado Batch 4A Pasada 4 residual';
}

// === Escribir catalog ===
writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log('Batch 4A aplicado.');
console.log('Species pobladas con variedades_registradas_ica: arracacia_xanthorrhiza');
console.log('Species con nota landrace agregada: malus_domestica_sabanera, prunus_persica_amarilla, prunus_domestica_ciruela_imperial');
console.log('Species con nota variedad documentada (sin codigo ICA): cucurbita_moschata, bactris_gasipaes');
console.log('Source actualizada: agrosavia-alhaja-ica-17702-2019 (no es huerfana).');
