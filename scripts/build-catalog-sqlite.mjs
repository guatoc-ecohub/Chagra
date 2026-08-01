import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../public/catalog.sqlite');

// better-sqlite3 es un módulo NATIVO. En la máquina de deploy (NixOS) node-gyp
// puede fallar al compilarlo (prebuild-install no detecta libc → sin binario) y
// eso ROMPÍA todo el deploy en `npm ci`. Import dinámico con FAIL-SOFT: si no
// carga y ya existe el catálogo commiteado (public/catalog.sqlite está trackeado),
// se usa ese y se salta la regeneración — el build/deploy NO se cae. Combinar con
// better-sqlite3 en optionalDependencies (package.json) para que npm ci tampoco
// falle. Regenerar el catálogo requiere better-sqlite3 (dev/CI con build tools).
let Database;
try {
  ({ default: Database } = await import('better-sqlite3'));
} catch (err) {
  if (fs.existsSync(DB_PATH)) {
    console.warn('[build-catalog] better-sqlite3 no disponible; uso el catálogo YA commiteado (skip regen):', DB_PATH);
    process.exit(0);
  }
  console.error('[build-catalog] better-sqlite3 no disponible y NO hay catálogo commiteado:', String(err).slice(0, 120));
  process.exit(1);
}
// REVERT 2026-05-23: el subset 50 species (PR #1011) cortó species críticas
// (aguacate, tomate, lechuga, acelga, tomate árbol) y rompió casos de uso
// reales del agente en producción. Vuelve al corpus full 496 mientras
// curamos un subset que incluya top-N species por uso real efectivo.
//
// 2026-05-24: re-curado completado. Subset v3.2 (105 species) cubre frutales
// mayor + pasifloras + hortalizas comunes + tubérculos andinos + cereales/
// leguminosas + medicinales base familiar + asocios + sombrío café + páramo
// + amazónicos estratégicos. v3.1 conservado para rollback. Ver
// catalog/SUBSET_OSS_V3.2_RATIONALE.md.
//
// Override env (contrato preservado): CHAGRA_SEED=<filename> regenera con
// otro seed (ej. corpus full para chagra-pro o rollback al subset v3.1).
const CATALOG_DIR = path.join(__dirname, '../catalog');
const DEFAULT_SEED = 'chagra-catalog-oss-subset-v3.2.json';
const SEED_FILE = process.env.CHAGRA_SEED
  ? path.basename(process.env.CHAGRA_SEED)
  : DEFAULT_SEED;

if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE species (
    id TEXT PRIMARY KEY,
    nombre_comun TEXT NOT NULL,
    nombre_cientifico TEXT NOT NULL,
    category TEXT NOT NULL,
    cultivable INTEGER NOT NULL,
    conservation_status TEXT NOT NULL,
    altitud_min_absoluto INTEGER,
    altitud_max_absoluto INTEGER,
    altitud_optimo_min INTEGER,
    altitud_optimo_max INTEGER,
    tracking_mode TEXT,  -- ADR-030: "individual" | "aggregate" | NULL (invasoras)
    dli_optimo_mol_m2_dia REAL, -- ADR-028
    fotoperiodo_min REAL,
    fotoperiodo_optimo REAL,
    fotoperiodo_max REAL,
    tolerancia_sombra_neta_pct REAL,
    data TEXT NOT NULL
  );
  CREATE INDEX idx_species_tracking_mode ON species(tracking_mode);
  
  CREATE TABLE species_roles (
    species_id TEXT NOT NULL,
    role TEXT NOT NULL,
    priority INTEGER NOT NULL,
    PRIMARY KEY (species_id, role),
    FOREIGN KEY (species_id) REFERENCES species(id)
  );
  CREATE INDEX idx_species_roles_role_priority ON species_roles(role, priority);
  
  CREATE TABLE species_thermal_zones (
    species_id TEXT NOT NULL,
    thermal_zone TEXT NOT NULL,
    PRIMARY KEY (species_id, thermal_zone),
    FOREIGN KEY (species_id) REFERENCES species(id)
  );
  CREATE INDEX idx_species_thermal_zones_zone ON species_thermal_zones(thermal_zone);

  CREATE TABLE biopreparados (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    data TEXT NOT NULL
  );

  CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    autores TEXT,
    año INTEGER,
    data TEXT NOT NULL
  );

  CREATE TABLE fermentos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL,
    categoria TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX idx_fermentos_tipo ON fermentos(tipo);
`);

// Bug 069.1 fix 2026-05-18: v3.1 tiene biopreparados[] + sources[] INLINE en
// el mismo seed file. Cargar todo desde un único parse para evitar mismatch
// (los archivos separados biopreparados-seed.json/sources-seed.json en
// el repo interno son legacy v3.0 con 16/54 entries vs v3.1 inline 19/66).
const seedJson = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, SEED_FILE), 'utf8'));
const speciesData = seedJson.species || [];
const biopreparadosData = seedJson.biopreparados || [];
const sourcesData = seedJson.sources || [];

// Cargar fermentos desde archivo separado
const fermentosSeedPath = path.join(CATALOG_DIR, 'fermentos-seed.json');
const fermentosJson = JSON.parse(fs.readFileSync(fermentosSeedPath, 'utf8'));
const fermentosData = fermentosJson.fermentos || [];

db.transaction(() => {
  const insertSpecies = db.prepare(`
    INSERT INTO species (id, nombre_comun, nombre_cientifico, category, cultivable, conservation_status, altitud_min_absoluto, altitud_max_absoluto, altitud_optimo_min, altitud_optimo_max, tracking_mode, dli_optimo_mol_m2_dia, fotoperiodo_min, fotoperiodo_optimo, fotoperiodo_max, tolerancia_sombra_neta_pct, data)
    VALUES (@id, @nombre_comun, @nombre_cientifico, @category, @cultivable, @conservation_status, @altitud_min_absoluto, @altitud_max_absoluto, @altitud_optimo_min, @altitud_optimo_max, @tracking_mode, @dli_optimo_mol_m2_dia, @fotoperiodo_min, @fotoperiodo_optimo, @fotoperiodo_max, @tolerancia_sombra_neta_pct, @data)
  `);
  const insertRole = db.prepare(`INSERT INTO species_roles (species_id, role, priority) VALUES (@species_id, @role, @priority)`);
  const insertZone = db.prepare(`INSERT INTO species_thermal_zones (species_id, thermal_zone) VALUES (@species_id, @thermal_zone)`);

  for (const sp of speciesData) {
    const limits = sp.altitud_msnm || {};

    insertSpecies.run({
      id: sp.id,
      nombre_comun: sp.nombre_comun || sp.nomenclature?.common_names?.[0] || 'Desconocido',
      nombre_cientifico: sp.nombre_cientifico || sp.nomenclature?.scientific_name || sp.id,
      category: sp.category || 'unknown',
      cultivable: sp.cultivable ? 1 : 0,
      conservation_status: sp.conservation_status || 'NE',
      altitud_min_absoluto: limits.min_absoluto ?? limits.absolute_min ?? null,
      altitud_max_absoluto: limits.max_absoluto ?? limits.absolute_max ?? null,
      altitud_optimo_min: limits.optimo_min ?? limits.optimal_min ?? null,
      altitud_optimo_max: limits.optimo_max ?? limits.optimal_max ?? null,
      tracking_mode: sp.tracking_mode ?? null,
      dli_optimo_mol_m2_dia: sp.dli_optimo_mol_m2_dia ?? null,
      fotoperiodo_min: sp.fotoperiodo_horas_optimo?.min ?? null,
      fotoperiodo_optimo: sp.fotoperiodo_horas_optimo?.optimo ?? null,
      fotoperiodo_max: sp.fotoperiodo_horas_optimo?.max ?? null,
      tolerancia_sombra_neta_pct: sp.tolerancia_sombra_neta_pct ?? null,
      data: JSON.stringify(sp)
    });

    if (Array.isArray(sp.roles_in_guild)) {
      sp.roles_in_guild.forEach((role, i) => insertRole.run({ species_id: sp.id, role, priority: i }));
    }

    if (Array.isArray(sp.thermal_zones)) {
      sp.thermal_zones.forEach(tz => insertZone.run({ species_id: sp.id, thermal_zone: tz }));
    }
  }

  const insertBio = db.prepare(`INSERT INTO biopreparados (id, nombre, data) VALUES (@id, @nombre, @data)`);
  for (const bp of biopreparadosData) {
    insertBio.run({ id: bp.id, nombre: bp.nombre || bp.metadata?.name || bp.id, data: JSON.stringify(bp) });
  }

  const insertFermento = db.prepare(`INSERT INTO fermentos (id, nombre, tipo, categoria, data) VALUES (@id, @nombre, @tipo, @categoria, @data)`);
  for (const f of fermentosData) {
    insertFermento.run({
      id: f.id,
      nombre: f.nombre || f.id,
      tipo: f.tipo || 'alimentario',
      categoria: f.categoria || 'fermentado',
      data: JSON.stringify(f)
    });
  }

  const insertSource = db.prepare(`INSERT INTO sources (id, tipo, titulo, autores, año, data) VALUES (@id, @tipo, @titulo, @autores, @año, @data)`);
  for (const src of sourcesData) {
    insertSource.run({
      id: src.id,
      tipo: src.tipo || src.type || 'unknown',
      titulo: src.titulo || src.title || src.id,
      autores: Array.isArray(src.autores) ? src.autores.join(', ') : (Array.isArray(src.authors) ? src.authors.join(', ') : ''),
      año: src.año || src.year_published || null,
      data: JSON.stringify(src)
    });
  }
})();

const countSpecies = db.prepare("SELECT COUNT(*) as c FROM species").get().c;
const countBio = db.prepare("SELECT COUNT(*) as c FROM biopreparados").get().c;
const countSources = db.prepare("SELECT COUNT(*) as c FROM sources").get().c;
const countFermentos = db.prepare("SELECT COUNT(*) as c FROM fermentos").get().c;

console.log(`[Build Catalog] Complete.`);
console.log(`- ${countSpecies} species inserted.`);
console.log(`- ${countBio} biopreparados inserted.`);
console.log(`- ${countSources} sources inserted.`);
console.log(`- ${countFermentos} fermentos inserted.`);

db.close();

if (countSpecies !== speciesData.length || countBio !== biopreparadosData.length || countSources !== sourcesData.length || countFermentos !== fermentosData.length) {
  console.error(`[Build Catalog] Mismatch in expected counts! Failed. Species: ${countSpecies}!=${speciesData.length}, Fermentos: ${countFermentos}!=${fermentosData.length}`);
  process.exit(1);
}

process.exit(0);
