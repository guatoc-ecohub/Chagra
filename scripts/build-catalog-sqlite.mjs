import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../public/catalog.sqlite');
const CATALOG_DIR = path.join(__dirname, '../catalog');

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
    data TEXT NOT NULL
  );
  
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
`);

const speciesData = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'chagra-catalog-seed-v3.1.json'), 'utf8')).species || [];
const biopreparadosData = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'biopreparados-seed.json'), 'utf8')).biopreparados || [];
const sourcesData = JSON.parse(fs.readFileSync(path.join(CATALOG_DIR, 'sources-seed.json'), 'utf8')).sources || [];

db.transaction(() => {
    const insertSpecies = db.prepare(`
    INSERT INTO species (id, nombre_comun, nombre_cientifico, category, cultivable, conservation_status, altitud_min_absoluto, altitud_max_absoluto, altitud_optimo_min, altitud_optimo_max, data)
    VALUES (@id, @nombre_comun, @nombre_cientifico, @category, @cultivable, @conservation_status, @altitud_min_absoluto, @altitud_max_absoluto, @altitud_optimo_min, @altitud_optimo_max, @data)
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

console.log(`[Build Catalog] Complete.`);
console.log(`- ${countSpecies} species inserted.`);
console.log(`- ${countBio} biopreparados inserted.`);
console.log(`- ${countSources} sources inserted.`);

db.close();

if (countSpecies !== speciesData.length || countBio !== biopreparadosData.length || countSources !== sourcesData.length) {
    console.error(`[Build Catalog] Mismatch in expected counts! Failed. Species: ${countSpecies}!=${speciesData.length}`);
    process.exit(1);
}

process.exit(0);
