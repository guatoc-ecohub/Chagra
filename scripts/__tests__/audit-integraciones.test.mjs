import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Tests del gate `audit-integraciones` (scripts/audit-integraciones.mjs).
 *
 * Task 090c (2026-09-03): el gate quedó rojo sobre dev cuando el PR #3079
 * reemplazó ChivitoPunkLaminaViva/LuciernagaLaminaViva por las versiones
 * Trazado y sus imports salieron del barrel — dos huérfanos sin entrada en
 * ops/integraciones-no-consumidas.json. Estas pruebas cubren dos frentes:
 *
 *  1. CONTRATO del gate contra un árbol fixture hermético (el script se copia
 *     a un tmp y resuelve ROOT como el padre de su propia carpeta, así que la
 *     copia audita el fixture, no este repo): alcanzabilidad desde App.jsx,
 *     allowlist que declara la excepción, y los tres exit codes (0/1/2).
 *  2. GUARDIAS sobre el repo real: allowlist válido (reason + date en todas
 *     las entradas), ids de orphan_components que existen en disco (para que
 *     el allowlist no se pudra con renombres/borrados), los dos ids que
 *     causaron el rojo del 2026-08-31 siguen declarados, y una corrida
 *     end-to-end del gate sobre este repo que debe terminar en verde.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const GATE_SCRIPT = resolve(__dirname, '../audit-integraciones.mjs');
const REPO_ROOT = resolve(__dirname, '../..');
const ALLOWLIST_REPO = join(REPO_ROOT, 'ops/integraciones-no-consumidas.json');

// Los ids EXACTOS que hicieron rojo el gate sobre dev (verificado en local
// el 2026-09-03, exit 1 con estos dos [orphan] y ningún otro). Si alguien
// quita estas entradas del allowlist sin cablear o borrar los componentes,
// el gate vuelve a rojo — este test lo explica en el mensaje de fallo.
const IDS_REGRESION_090C = [
  'src/visual/creatures/ChivitoPunkLaminaViva.jsx',
  'src/visual/creatures/LuciernagaLaminaViva.jsx',
];

// ---------------------------------------------------------------------------
// Fixture hermético
// ---------------------------------------------------------------------------

const GRAFO_FIXTURE = [
  'export function getKnowledgeTopics() { return []; }',
  'export function getKnowledgeTopic() { return null; }',
  'export function buildKnowledgeTopicBlock() { return ""; }',
  '',
].join('\n');

function construirFixture({ conConsumidor = true, conAllowlist = true, allowlist } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'audit-integraciones-fixture-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'ops'), { recursive: true });
  mkdirSync(join(root, 'src/mockups'), { recursive: true });
  mkdirSync(join(root, 'src/services'), { recursive: true });

  // El script se COPIA: su ROOT es el padre de su propia carpeta, así que la
  // copia audita el árbol fixture. Es autocontenido (solo node:), la copia
  // es segura.
  cpSync(GATE_SCRIPT, join(root, 'scripts/audit-integraciones.mjs'));

  // Los 3 SAME_REPO_TARGETS del script apuntan a src/services/grafoRelations.js.
  writeFileSync(join(root, 'src/services/grafoRelations.js'), GRAFO_FIXTURE);

  // Componente ALCANZABLE desde App.jsx (import estático, dos saltos: App →
  // Montado → módulo de servicio) y componente HUÉRFANO (nadie lo importa).
  writeFileSync(join(root, 'src/App.jsx'), "import Montado from './mockups/Montado.jsx';\nexport default function App() { return Montado; }\n");
  writeFileSync(join(root, 'src/mockups/Huerfano.jsx'), 'export default function Huerfano() { return null; }\n');

  if (conConsumidor) {
    // Consumidor real del tercer target (fuera del módulo y de __tests__).
    writeFileSync(
      join(root, 'src/services/consumidorGrafo.js'),
      "import { getKnowledgeTopics } from './grafoRelations.js';\nexport const usarConocimiento = getKnowledgeTopics;\n",
    );
    // El segundo salto del BFS pasa por grafoRelations (Montado → servicio).
    writeFileSync(
      join(root, 'src/mockups/Montado.jsx'),
      "import { getKnowledgeTopics } from '../services/grafoRelations.js';\nexport default function Montado() { return getKnowledgeTopics; }\n",
    );
  } else {
    // Variante SIN ningún consumidor de getKnowledgeTopics en el árbol
    // (Montado no menciona el export): así el target same-repo queda
    // huérfano de verdad y ejercita el fallo [same-repo] del gate.
    writeFileSync(
      join(root, 'src/mockups/Montado.jsx'),
      'export default function Montado() { return null; }\n',
    );
  }

  if (conAllowlist) {
    const contenido = allowlist ?? {
      same_repo: [
        { id: 'grafoRelations.getKnowledgeTopic', reason: 'excepcion de prueba del fixture', date: '2026-09-03' },
        { id: 'grafoRelations.buildKnowledgeTopicBlock', reason: 'excepcion de prueba del fixture', date: '2026-09-03' },
      ],
      sidecar_endpoints: [],
      orphan_components: [
        { id: 'src/mockups/Huerfano.jsx', reason: 'excepcion de prueba del fixture', date: '2026-09-03' },
      ],
    };
    writeFileSync(join(root, 'ops/integraciones-no-consumidas.json'), JSON.stringify(contenido, null, 2));
  }

  return root;
}

function correrGate(root) {
  const r = spawnSync(execPath, [join(root, 'scripts/audit-integraciones.mjs')], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function conFixture(opciones, aserciones) {
  const root = construirFixture(opciones);
  try {
    aserciones(correrGate(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// 1) Contrato del gate contra fixture hermético
// ---------------------------------------------------------------------------

describe('audit-integraciones (fixture hermético)', function () {
  it('pasa (exit 0) cuando el huérfano está declarado en el allowlist y el alcanzable no se reporta', function () {
    conFixture({}, function ({ status, stdout }) {
      expect(status).toBe(0);
      expect(stdout).toContain('Auditoría limpia');
      // Huerfano.jsx está allowlisted (warn, no falla)...
      expect(stdout).toContain('src/mockups/Huerfano.jsx');
      // ...y Montado.jsx NO aparece como huérfano: el BFS desde App.jsx lo
      // alcanza por import estático (por eso no hay ningún warn sobre él).
      expect(stdout).not.toMatch(/SIN ruta viva pero allowlisted: src\/mockups\/Montado\.jsx/);
    });
  });

  it('falla (exit 1) y nombra el archivo cuando el huérfano no tiene entrada', function () {
    conFixture(
      {
        allowlist: {
          same_repo: [
            { id: 'grafoRelations.getKnowledgeTopic', reason: 'excepcion de prueba del fixture', date: '2026-09-03' },
            { id: 'grafoRelations.buildKnowledgeTopicBlock', reason: 'excepcion de prueba del fixture', date: '2026-09-03' },
          ],
          sidecar_endpoints: [],
          orphan_components: [],
        },
      },
      function ({ status, stderr }) {
        expect(status).toBe(1);
        expect(stderr).toContain('[orphan]');
        expect(stderr).toContain('src/mockups/Huerfano.jsx');
      },
    );
  });

  it('falla (exit 1) para un export same-repo sin consumidor y sin allowlist', function () {
    // Sin consumidorGrafo.js, getKnowledgeTopics queda huérfano y NO está en
    // el allowlist del fixture (sí lo están los otros dos targets).
    conFixture({ conConsumidor: false }, function ({ status, stderr }) {
      expect(status).toBe(1);
      expect(stderr).toContain('[same-repo]');
      expect(stderr).toContain('grafoRelations.getKnowledgeTopics');
    });
  });

  it('muere con exit 2 si falta el allowlist (problema de ejecución, no de integración)', function () {
    conFixture({ conAllowlist: false }, function ({ status, stderr }) {
      expect(status).toBe(2);
      expect(stderr).toContain('falta el allowlist');
    });
  });

  it('muere con exit 2 si una entrada no trae reason (una excepción sin razón no es una decisión)', function () {
    conFixture(
      {
        allowlist: {
          same_repo: [],
          sidecar_endpoints: [],
          orphan_components: [{ id: 'src/mockups/Huerfano.jsx', date: '2026-09-03' }],
        },
      },
      function ({ status, stderr }) {
        expect(status).toBe(2);
        expect(stderr).toContain('sin "reason"');
      },
    );
  });
});

// ---------------------------------------------------------------------------
// 2) Guardias sobre el repo real
// ---------------------------------------------------------------------------

describe('ops/integraciones-no-consumidas.json (repo real)', function () {
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_REPO, 'utf8'));

  const secciones = [
    ['same_repo', 'id'],
    ['sidecar_endpoints', 'endpoint'],
    ['orphan_components', 'id'],
  ];

  it('toda entrada trae reason concreta y date válida (YYYY-MM-DD)', function () {
    const problemas = [];
    for (const [seccion, campoId] of secciones) {
      for (const entrada of allowlist[seccion] || []) {
        const etiqueta = `${seccion}:${entrada[campoId] || '(sin id)'}`;
        if (!entrada.reason || !String(entrada.reason).trim()) {
          problemas.push(`${etiqueta} sin reason`);
        }
        if (!entrada.date || !/^\d{4}-\d{2}-\d{2}$/.test(entrada.date)) {
          problemas.push(`${etiqueta} sin date válida`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  it('cada id de orphan_components existe en disco, es .jsx/.tsx y vive bajo src/mockups o src/visual', function () {
    // Si un renombre o borrado deja una entrada apuntando a un archivo que ya
    // no existe, la entrada queda muerta (y el gate ya no protege nada ahí).
    const problemas = [];
    for (const entrada of allowlist.orphan_components || []) {
      const id = entrada.id || '(sin id)';
      if (!/^(src\/mockups|src\/visual)\//.test(id)) {
        problemas.push(`${id} fuera de los directorios auditados`);
        continue;
      }
      if (!/\.(jsx|tsx)$/.test(id)) {
        problemas.push(`${id} no es componente (.jsx/.tsx)`);
        continue;
      }
      if (!existsSync(resolve(REPO_ROOT, id))) {
        problemas.push(`${id} no existe en disco (entrada vieja — eliminarla)`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it('REGRESIÓN 090c: las dos láminas vivas causantes del rojo siguen declaradas', function () {
    // ChivitoPunkLaminaViva y LuciernagaLaminaViva quedaron sin consumidor
    // cuando el PR #3079 (2026-08-31) puso ChivitoTrazado/LuciernagaTrazado
    // en el registro CREATURES. Quitar estas entradas sin cablear o borrar
    // los componentes devuelve el gate a rojo (exit 1) — exactamente el rojo
    // que esta task cerró. Ver ops/integraciones-no-consumidas.json para la
    // justificación completa de cada excepción.
    const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
    for (const id of IDS_REGRESION_090C) {
      expect(ids.has(id), `falta la entrada allowlist de ${id} — el gate volvería a rojo`).toBe(true);
    }
  });

  it('el gate corre verde end-to-end sobre este repo', function () {
    // Verde DESPUÉS permanente: si un PR nuevo deja un componente huérfano
    // bajo src/mockups|src/visual sin declararlo, este test falla igual que
    // el workflow Integraciones no consumidas — doble guarda barata.
    const r = spawnSync(execPath, [GATE_SCRIPT], { encoding: 'utf8', cwd: REPO_ROOT });
    expect(r.status, `gate rojo:\n${r.stderr || r.stdout}`).toBe(0);
  });
});
