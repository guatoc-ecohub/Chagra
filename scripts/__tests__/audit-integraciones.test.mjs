// Pragma node para eslint (process.env más abajo): el arnés siempre fue un
// script node; se declara explícito al tocar el archivo (cableado pizarra
// 2026-09-03) para que el hook de eslint (staged, --max-warnings=0) no se
// tropiece con el no-undef heredado de la config.
/* global process */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { execPath } from 'node:process';
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync,
  readdirSync, statSync, symlinkSync, lstatSync,
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
 *  3. TANDA MUNDO3D 2026-09-04 (task audit-integraciones-rojo-en-la-base): el
 *     motor por símbolo (095.b, #3113) destapó 48 archivos de
 *     src/visual/mundo3d que el gate viejo (solo .jsx) no miraba — apoyos de
 *     escenas ya declaradas el 2026-08-30, vendor flora de #3103, barriles
 *     muertos y dos hooks "listos para cablear". Se declaran con reason; estos
 *     tests sostienen la decisión y el des-cableado.
 *  4. REMATE 2026-09-05 (task audit-gate-remate-20260905): con la tanda mundo3d
 *     el rojo quedó en 126 hallazgos que frenaban TODOS los PRs (represa de 9).
 *     El operador ordenó el remate: borrar 13 entradas fantasma (archivos que
 *     se cablearon o pasaron a vitrina/página suelta y ya no eran hallazgo) y
 *     declarar los 123 restantes — cada uno pasado por un CONTROL de
 *     importadores con resolución exacta de especificadores, la lección de
 *     useT.js (el 09-04 casi se declara muerto por un grep por substring que
 *     le atribuyó los importadores de useTheme). El control pescó 3 FALSOS
 *     huérfanos (data/aguaFinca, data/cacaoFinca, data/mangoFinca: importados
 *     por pantallas MONTADAS con cláusulas >400 chars que el motor no veía —
 *     fix en alcance-simbolica.mjs y su regresión en
 *     alcance-simbolica.test.mjs) y por eso NO se declararon. Este bloque
 *     sostiene el verde, la purga de fantasmas y el control.
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
  'src/visual/creatures/_archivo/ChivitoPunkLaminaViva.jsx',
  'src/visual/creatures/_archivo/LuciernagaLaminaViva.jsx',
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

function construirFixture({ conConsumidor = true, conAllowlist = true, allowlist, conSymlinkColgante = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'audit-integraciones-fixture-'));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'ops'), { recursive: true });
  mkdirSync(join(root, 'src/mockups'), { recursive: true });
  mkdirSync(join(root, 'src/services'), { recursive: true });
  if (conSymlinkColgante) {
    // Réplica del árbol CI de las láminas archivadas (#3124/#3151): un symlink
    // a `/mnt/data/coldstore/...`, un punto de montaje que el runner de CI no
    // tiene. El symlink cuelga; un walker que lo siga con `statSync` revienta
    // con ENOENT (el rojo de #3151) en vez de decidir.
    mkdirSync(join(root, 'src/visual/creatures/_archivo'), { recursive: true });
    symlinkSync(
      '/mnt/data/coldstore/chagra-laminas-fuera-20260904/ChivitoPunkLaminaViva.jsx',
      join(root, 'src/visual/creatures/_archivo/ChivitoPunkLaminaViva.jsx'),
    );
  }

  // El script se COPIA: su ROOT es el padre de su propia carpeta, así que la
  // copia audita el árbol fixture.
  cpSync(GATE_SCRIPT, join(root, 'scripts/audit-integraciones.mjs'));
  // Y con él su motor. Desde 095.b el gate no tiene resolver propio: llama a
  // `scripts/lib/alcance-simbolica.mjs`, el MISMO que usa
  // `audit-componente-huerfano.mjs`. Sin copiar la carpeta, la copia del gate
  // muere en el import y el fixture deja de probar nada.
  cpSync(resolve(__dirname, '../lib'), join(root, 'scripts/lib'), { recursive: true });

  // Los 3 SAME_REPO_TARGETS del script apuntan a src/services/grafoRelations.js.
  writeFileSync(join(root, 'src/services/grafoRelations.js'), GRAFO_FIXTURE);

  // Componente ALCANZABLE desde App.jsx (import estático, dos saltos: App →
  // Montado → módulo de servicio) y componente HUÉRFANO (nadie lo importa).
  writeFileSync(join(root, 'src/App.jsx'), "import { Montado } from './mockups/index.js';\nexport default function App() { return Montado; }\n");
  writeFileSync(join(root, 'src/mockups/Huerfano.jsx'), 'export default function Huerfano() { return null; }\n');

  // Barril que re-exporta el huérfano SIN que nadie le pida el nombre. Es el
  // control positivo de la ceguera nº1: el barril SÍ es alcanzable (App.jsx lo
  // importa por `Montado`), así que un BFS por ARCHIVO daba `Lavado.jsx` por
  // cableado. Con alcance por SÍMBOLO no se lava: nadie pide `Lavado`.
  writeFileSync(
    join(root, 'src/mockups/index.js'),
    "export { default as Montado } from './Montado.jsx';\nexport { default as Lavado } from './Lavado.jsx';\n",
  );
  writeFileSync(join(root, 'src/mockups/Lavado.jsx'), 'export default function Lavado() { return null; }\n');

  if (conConsumidor) {
    // Consumidor real del tercer target (fuera del módulo y de __tests__).
    // Ojo: nadie lo importa, así que desde 095.b (el gate barre TODO src/, no
    // solo mockups+visual) es él mismo un huérfano — y por eso está declarado
    // en el allowlist del fixture. Eso es intencional: prueba que el gate ya
    // mira `src/services`, que antes quedaba fuera de su radar.
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
        { id: 'src/mockups/Lavado.jsx', reason: 'excepcion de prueba del fixture (barril que lava)', date: '2026-09-03' },
        { id: 'src/services/consumidorGrafo.js', reason: 'excepcion de prueba del fixture (barrido ancho)', date: '2026-09-03' },
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
      // El barril NO lava: `Lavado.jsx` es huérfano aunque el barril esté vivo.
      expect(stdout).toContain('src/mockups/Lavado.jsx');
    });
  });

  it('PRUEBA DE CONTROL #3151: un symlink colgante en src/ no tumba el gate (decide, no revienta)', function () {
    // El 2026-09-05 el gate `audit-integraciones` de #3151 se caía con
    // ENOENT: `walk()` hacía `statSync` (que SIGUE el enlace) sobre
    // src/visual/creatures/_archivo/*.jsx, symlinks a un disco frío que el
    // runner de CI no tiene montado. Un stat sobre un enlace roto tiene que
    // DECIDIR (¿es un módulo del árbol de build? no: apunta fuera de src/),
    // no reventar. Con el auditor de HOY esta prueba muere con el stack de
    // `statSync`; con el arreglo el fixture corre igual que sin symlink y
    // termina en el mismo veredicto (exit 0, auditoría limpia).
    conFixture({ conSymlinkColgante: true }, function ({ status, stdout, stderr }) {
      const salida = `${stdout}\n${stderr}`;
      expect(status).toBe(0);
      expect(stdout).toContain('Auditoría limpia');
      expect(salida).not.toContain('ENOENT');
      expect(salida).not.toContain('at walk');
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
        // CONTROL POSITIVO de la ceguera nº1: `Lavado.jsx` solo llega por un
        // `export … from` de un barril vivo. El gate viejo lo daba por
        // cableado; este tiene que nombrarlo.
        expect(stderr).toContain('src/mockups/Lavado.jsx');
        // CONTROL POSITIVO de la ceguera nº3: `src/services/` no es
        // `src/mockups` ni `src/visual` — antes ni se miraba.
        expect(stderr).toContain('src/services/consumidorGrafo.js');
        // CONTROL NEGATIVO: `Montado.jsx` SÍ está pedido por nombre desde el
        // barril que App.jsx importa. Nada cableado puede salir acusado.
        expect(stderr).not.toContain('src/mockups/Montado.jsx');
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

  // Una sola corrida del gate sobre este repo, compartida por los tres bloques
  // de controles de abajo (095.b, tanda mundo3d 2026-09-04 y remate
  // 2026-09-05). CHAGRA_PRO_PATH imposible: en este repo público el sidecar no
  // existe y la auditoría de endpoints se salta con warning (comportamiento
  // esperado, ver el header del gate).
  //
  // Un matiz de robustez medido el 2026-09-05: cuando la suite completa corre
  // en paralelo (12 workers con jsdom), el proceso del gate puede morir SIN
  // veredicto a mitad de analizarAlcance (status null, stdout cortado tras los
  // warnings del sidecar — reproducido 2/2 veces en `npx vitest run` completo,
  // 0/10 veces en corrida del archivo solo o del trío de audités). Un proceso
  // muerto NO es un veredicto: se reintenta (hasta 3 intentos) solo cuando
  // status es null o hay error de spawn; un exit 0/1/2 se respeta tal cual —
  // un rojo real NUNCA se reintenta para callarlo.
  function correrGateReal() {
    let intento = spawnSync(execPath, [GATE_SCRIPT], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
      env: { ...process.env, CHAGRA_PRO_PATH: '/__no_existe__' },
    });
    for (let i = 0; (intento.status === null || intento.error) && i < 2; i++) {
      intento = spawnSync(execPath, [GATE_SCRIPT], {
        encoding: 'utf8',
        cwd: REPO_ROOT,
        env: { ...process.env, CHAGRA_PRO_PATH: '/__no_existe__' },
      });
    }
    return intento;
  }
  const r = correrGateReal();
  const salida = `${r.stdout || ''}\n${r.stderr || ''}`;

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

  it('cada id de orphan_components existe en disco y es un módulo de src/', function () {
    // Si un renombre o borrado deja una entrada apuntando a un archivo que ya
    // no existe, la entrada queda muerta (y el gate ya no protege nada ahí).
    //
    // 095.b relajó DOS restricciones de esta guardia, y las dos por la misma
    // razón: el gate ya no audita solo `src/mockups`+`src/visual` ni solo
    // `.jsx/.tsx`. Exigirle a una entrada que viva en dos carpetas concretas
    // era heredar en el allowlist la misma ceguera que se arregló en el gate —
    // un huérfano de `src/hooks` no se podría ni declarar.
    const problemas = [];
    for (const entrada of allowlist.orphan_components || []) {
      const id = entrada.id || '(sin id)';
      if (!/^src\//.test(id)) {
        problemas.push(`${id} no es una ruta bajo src/`);
        continue;
      }
      if (!/\.(jsx|tsx|js|mjs|ts)$/.test(id)) {
        problemas.push(`${id} no es un módulo auditable`);
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
    // en el registro CREATURES. El 2026-09-04 las láminas-viva dejaron el
    // árbol vivo y quedaron en _archivo/ como symlinks reversibles (el cable,
    // el borrado y el archivo con razones viven en integraciones-no-consumidas
    // y en ops/DRENAJE-HUERFANOS-TANDA-1-2026-09-04.md). Quitar estas entradas
    // sin actualizar el estado devuelve el gate al rojo que esta task cerró.
    // Ver ops/integraciones-no-consumidas.json para la justificación completa.
    const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
    for (const id of IDS_REGRESION_090C) {
      expect(ids.has(id), `falta la entrada allowlist de ${id} — el gate volvería a rojo`).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // CONTROLES sobre el repo real (095.b)
  // -------------------------------------------------------------------------
  // Acá NO se afirma "el gate corre verde". Hasta 2026-09-03 este test exigía
  // exit 0, y ese era justo el incentivo equivocado: al arreglarle la ceguera al
  // gate aparecen hallazgos reales, y un test que exige verde empuja a
  // declararlos en masa para callarlo — que es convertir el gate en trámite.
  // Lo que se guarda acá es que el INSTRUMENTO no vuelva a mentir: que vea lo
  // que se le escapaba y que no acuse a lo que sí está montado. Verde o rojo
  // sobre dev es una decisión de drenaje del operador, no del arnés.
  describe('el gate ve lo que antes se le escapaba (095.b)', function () {
    // CONTROL POSITIVO · el barril que lavaba. Estos ocho solo llegan por un
    // `export … from` de `src/visual/creatures/index.js`, que sí está vivo:
    // nadie les pide el nombre, así que un bundler con tree-shaking no los
    // emite. El BFS por ARCHIVO los daba por cableados; el alcance por SÍMBOLO
    // los nombra. Si alguien vuelve a un resolver por archivo, esto se cae.
    const LAVADOS_POR_EL_BARRIL = [
      'src/visual/creatures/Borugo.jsx',
      'src/visual/creatures/ChivitoTinta.jsx',
      'src/visual/creatures/LuciernagaTinta.jsx',
      'src/visual/creatures/MomentoGuardianes.jsx',
      'src/visual/creatures/OsoAndino.jsx',
      'src/visual/creatures/OsoAnteojos.jsx',
      'src/visual/creatures/PerroHeroe.jsx',
      'src/visual/creatures/PerroTransicion.jsx',
    ];
    it.each(LAVADOS_POR_EL_BARRIL)('%s sale nombrado (el barril no lava)', function (id) {
      expect(salida).toContain(id);
    });

    // CONTROL NEGATIVO · lo que SÍ está montado no puede salir acusado.
    // Estas dos pasan por el mismo barril y NO son huérfanas, cada una por su
    // razón, y por eso están acá: es el par que separa "pasa por un barril" de
    // "está lavado".
    //   · OsoBastonLaminaViva — el barril la importa por DEFAULT (línea 326) y
    //     la mete en el objeto de registro CREATURES. Eso es un valor, no un
    //     re-export: el bundler la emite.
    //   · ZariguyaGeminiLaminaViva — sí es `export … from` en el barril, pero
    //     además `ZariguyaCompaiEscena.jsx` la importa directo y la renderiza.
    const MONTADAS_DE_VERDAD = [
      'src/visual/creatures/OsoBastonLaminaViva.jsx',
      'src/visual/creatures/ZariguyaGeminiLaminaViva.jsx',
    ];
    it.each(MONTADAS_DE_VERDAD)('%s NO sale acusado', function (id) {
      expect(salida).not.toContain(id);
    });

    // CONTROL POSITIVO · el radar de dos carpetas. Estos viven fuera de
    // `src/mockups`/`src/visual` y por eso el gate viejo ni los miraba.
    // ACTUALIZADO A MANO 2026-09-03 (protocolo del arnés): dos de los tres
    // originales (useCompaiGuiaPantalla.js, compaiExplicaPantallas.js) se
    // CABLEARON de verdad — la cadena explicación→pizarra quedó montada en
    // AgentFab (decisión del operador: el texto de explicación de la pantalla
    // SALE EN LA PIZARRA SIEMPRE, commit 3233f7f06) — y por eso dejaron de
    // salir acusados. El control sigue de pie con GuiaEspecieCards y
    // AdminPanel, huérfanos reales de src/components que el gate sí ve.
    it.each([
      'src/components/aprendizaje/GuiaEspecieCards.jsx',
      'src/components/admin/AdminPanel.jsx',
    ])('%s sale nombrado (el gate ya no mira solo dos carpetas)', function (id) {
      expect(salida).toContain(id);
    });

    // CONTROL NEGATIVO · las piezas cableadas dejan de salir acusadas: si
    // vuelven a aparecer acá, alguien des-cableó la cadena.
    it.each([
      'src/hooks/useCompaiGuiaPantalla.js',
      'src/services/compaiExplicaPantallas.js',
    ])('%s ya NO sale acusado (la cadena explicación→pizarra está cableada)', function (id) {
      expect(salida).not.toContain(id);
    });

    it('el gate sigue barato: termina en menos de 20 s', function () {
      // No se mide el tiempo acá (el spawn ya corrió); se afirma que corrió y
      // devolvió un veredicto legible en vez de colgarse o reventar.
      expect([0, 1]).toContain(r.status);
      expect(salida).toContain('alcance de src/:');
    });
  });

  // -------------------------------------------------------------------------
  // TANDA MUNDO3D 2026-09-04 (task audit-integraciones-rojo-en-la-base)
  // -------------------------------------------------------------------------
  // El motor por símbolo (095.b, #3113) amplió el radar del gate de 454 a
  // 1.593 sujetos y dejó rojo a TODOS los PRs: 48 archivos de mundo3d salían
  // acusados sin entrada en el allowlist. Ninguno es un olvido nuevo:
  //   · 34 apoyos (geom/datos/barriles) de escenas YA declaradas el
  //     2026-08-30 — el gate viejo solo miraba .jsx y por eso los apoyos no
  //     se declararon junto con su escena;
  //   · 10 vendor flora de #3103 — mismos hermanos ya declarados
  //     (godRaysSylva.js, climaPorPiso.js);
  //   · DemoAtmosferaViva.jsx — contrato A4, ya declarada en el allowlist del
  //     OTRO gate (drenaje tanda 1, #3120), que este gate no lee;
  //   · 2 barriles muertos (infraestructura, polinizadores), kit/geometria.js
  //     (superficie del taller sin adoptar), sonidosAmbientales.js (T48
  //     rescatado en #2668) y useCruceMundo/useTunelLamina (hooks "listos
  //     para cablear" sin host).
  // Si alguien QUITA una de estas entradas sin cablear o borrar el archivo,
  // el gate vuelve a rojo con ese id — este bloque lo explica en el fallo.
  const IDS_TANDA_MUNDO3D = [
    // apoyos de escenas declaradas 2026-08-30
    'src/visual/mundo3d/semillas/bancoSemillas.geom.js',
    'src/visual/mundo3d/semillas/semillasData.js',
    'src/visual/mundo3d/artesania/geometriasArtesania.js',
    'src/visual/mundo3d/artesania/materialesArtesania.js',
    'src/visual/mundo3d/artesania/texturasArtesania.js',
    'src/visual/mundo3d/artesania/tramaAndina.js',
    'src/visual/mundo3d/artesania/index.js',
    'src/visual/mundo3d/beneficos/beneficos.geom.js',
    'src/visual/mundo3d/beneficos/beneficosIdentidad.js',
    'src/visual/mundo3d/beneficos/dinamicaPlaga.js',
    'src/visual/mundo3d/beneficos/index.js',
    'src/visual/mundo3d/bosque/corteSuelo.geom.js',
    'src/visual/mundo3d/bosque/doselBiodiverso.geom.js',
    'src/visual/mundo3d/estiercol/biodigestor.geom.js',
    'src/visual/mundo3d/estiercol/compostera.geom.js',
    'src/visual/mundo3d/estiercol/estiercol.geom.js',
    'src/visual/mundo3d/estiercol/index.js',
    'src/visual/mundo3d/fauna/anatomiaFauna.geom.js',
    'src/visual/mundo3d/fauna/faunaEmblematica.js',
    'src/visual/mundo3d/fauna/index.js',
    'src/visual/mundo3d/fauna/iridiscencia.js',
    'src/visual/mundo3d/fauna/marcha.js',
    'src/visual/mundo3d/fauna/pelajes.js',
    'src/visual/mundo3d/olor/aireCargado.js',
    'src/visual/mundo3d/olor/index.js',
    'src/visual/mundo3d/olor/olor.geom.js',
    'src/visual/mundo3d/olor/senalesDelCuerpo.js',
    'src/visual/mundo3d/olor/texturasOlor.js',
    'src/visual/mundo3d/suelo-comparado/index.js',
    'src/visual/mundo3d/suelo-comparado/sueloComparado.geom.js',
    'src/visual/mundo3d/suelo-comparado/sueloComparadoTextos.js',
    'src/visual/mundo3d/transiciones/useCruceMundo.js',
    'src/visual/mundo3d/transiciones/useTunelLamina.js',
    // vendor flora #3103 (hermanos de godRaysSylva/climaPorPiso)
    'src/visual/mundo3d/sierra/vendor/flora/FollajeMasa.js',
    'src/visual/mundo3d/sierra/vendor/flora/arbolesAltoandinos.js',
    'src/visual/mundo3d/sierra/vendor/flora/flora-eztree-bake.js',
    'src/visual/mundo3d/sierra/vendor/flora/flora.js',
    'src/visual/mundo3d/sierra/vendor/flora/frailejonFabrica.js',
    'src/visual/mundo3d/sierra/vendor/flora/lodEspecieSylva.js',
    'src/visual/mundo3d/sierra/vendor/flora/matrizParamo.js',
    'src/visual/mundo3d/sierra/vendor/flora/pisosTermicos.js',
    'src/visual/mundo3d/sierra/vendor/flora/quickGrass.js',
    'src/visual/mundo3d/sierra/vendor/flora/vientoMundos.js',
    // espejo del drenaje tanda 1 (contrato A4)
    'src/visual/mundo3d/atmosfera/DemoAtmosferaViva.jsx',
    // sueltos con decisión propia
    'src/visual/mundo3d/sonidosAmbientales.js',
    'src/visual/mundo3d/kit/geometria.js',
    'src/visual/mundo3d/infraestructura/index.js',
    'src/visual/mundo3d/polinizadores/index.js',
  ];

  describe('tanda mundo3d 2026-09-04: la declaración queda sostenida', function () {
    it('las 48 entradas de la tanda están en el allowlist', function () {
      const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
      const faltantes = IDS_TANDA_MUNDO3D.filter(function (id) { return !ids.has(id); });
      expect(
        faltantes,
        'entradas tanda mundo3d quitadas sin cablear: el gate volvería a rojo con esos ids',
      ).toEqual([]);
    });

    it('cada una sigue viva como hallazgo allowlisted (ni cableada ni borrada en silencio)', function () {
      // El gate advierte en stdout cada hallazgo cubierto por el allowlist. Si
      // un archivo se CABLEA, deja de salir (y su entrada se vuelve obsoleta —
      // bien, pero entonces la entrada se borra y este test obliga a hacerlo
      // consciente); si se BORRA del disco, la guardia de ids-en-disco de
      // arriba truena. Acá se sostiene el estado declarado: siguen existiendo
      // como hallazgos con excepción vigente.
      const faltantes = IDS_TANDA_MUNDO3D.filter(function (id) {
        return !salida.includes(`pieza SIN ruta viva pero allowlisted: ${id}`);
      });
      expect(
        faltantes,
        'estos ids ya no salen como hallazgo allowlisted: o se cablearon (borrar la entrada del allowlist y actualizar este pin) o el motor dejó de verlos',
      ).toEqual([]);
    });

    it('el gate ya no acusa NINGÚN archivo de mundo3d en sus hallazgos', function () {
      // La meta de la tanda: la porción mundo3d del rojo queda en cero. Los
      // demás hallazgos (criaturas, dashboards, types/hooks — tanda 2 del
      // drenaje) seguían en stderr a propósito: declararlos en masa habría
      // sido convertir el gate en trámite. La decisión final sobre ellos la
      // tomó el operador un día después, con control de importadores
      // entrada por entrada: es el REMATE 2026-09-05 (bloque de abajo).
      expect(r.stderr || '').not.toContain('mundo3d');
    });

    it('muestra representativa: el único importador del apoyo es su escena declarada', function () {
      // La premisa que sostiene la herencia de la declaración: bancoSemillas
      // solo lo importa EscenaBancoSemillas.jsx (declarada 2026-08-30) y
      // semillasData solo el geom + la escena. Si un módulo VIVO empieza a
      // importarlos, la declaración dejó de ser honesta y toca cablear.
      const importadoresDe = function (nombreBase) {
        const encontrados = [];
        const caminar = function (dir) {
          for (const entry of readdirSync(dir)) {
            if (entry === 'node_modules' || entry.startsWith('.')) continue;
            const ruta = join(dir, entry);
            if (statSync(ruta).isDirectory()) { caminar(ruta); continue; }
            if (!/\.(js|jsx|mjs|ts|tsx)$/.test(entry)) continue;
            const texto = readFileSync(ruta, 'utf8');
            if (texto.includes(nombreBase) && !ruta.includes('__tests__')
                && !ruta.endsWith(`${nombreBase}.js`)) {
              encontrados.push(ruta);
            }
          }
        };
        caminar(join(REPO_ROOT, 'src'));
        return encontrados.map(function (p) { return p.slice(REPO_ROOT.length + 1); });
      };
      // Ningún importador fuera del cluster semillas (todos declarados).
      const ajenos = importadoresDe('bancoSemillas.geom')
        .concat(importadoresDe('semillasData'))
        .filter(function (f) { return !f.includes('mundo3d/semillas/'); });
      expect(ajenos, 'un módulo vivo consume el apoyo declarado: la excepción ya no es inocua').toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // REMATE 2026-09-05 (task audit-gate-remate-20260905)
  // -------------------------------------------------------------------------
  // El rojo del gate represaba 9 PRs. El operador ordenó el remate: borrar 13
  // entradas fantasma y declarar los 123 hallazgos restantes, CADA UNO pasado
  // por un control de importadores con resolución exacta de especificadores.
  // El control es la lección useT.js: un grep por substring le atribuyó los
  // importadores de useTheme/useTts («14 importadores») y casi mata en el
  // allowlist un hook que —verificado con frontera de palabra— no tiene
  // ninguno. El mismo control, en la dirección contraria, pescó 3 archivos
  // VIVOS a punto de declararse muertos (aguaFinca/cacaoFinca/mangoFinca,
  // importados por pantallas MONTADAS con cláusulas >400 chars que el motor
  // no veía): esos NO se declararon — se arregló el motor.
  //
  // De aquí en adelante: un hallazgo nuevo del gate NO se declara sin su
  // control de importadores. Si el control encuentra un importador vivo, el
  // archivo está vivo — se cablea el verdadero estado o se arregla el motor,
  // nunca se declara por comodidad.
  describe('remate 2026-09-05', function () {
    const FANTASMAS_BORRADAS = [
      // Se cablearon o pasaron a vitrina/página suelta y dejaron de ser
      // hallazgo (el gate lo avisaba como «ya NO le hacen match»). Quitarlas
      // de vuelta las volvería a convertir en excepciones protegiendo un
      // fantasma.
      'src/visual/mundo3d/ArtesaniaAndina.jsx',
      'src/visual/mundo3d/GemeloValle2D.jsx',
      'src/visual/mundo3d/PisosTermicosBandas.jsx',
      'src/visual/mundo3d/TransicionMundoKit.jsx',
      'src/visual/mundo3d/TransicionSierraMundo.jsx',
      'src/visual/mundo3d/infraestructura/InfraestructuraViva.jsx',
      'src/mockups/MundoLecheria3D.jsx',
      'src/mockups/MundoSanidad3D.jsx',
      'src/mockups/MundoVergelFrutal3D.jsx',
      'src/visual/mundo3d/sierra/ArbolMayor.jsx',
      'src/visual/mundo3d/sierra/GaleriaSierraArboles.jsx',
      'src/visual/mundo3d/sierra/SierraCorteVertical.jsx',
      'src/visual/mundo3d/sierra/SierraMonte3D.jsx',
    ];
    // Vivos a los que el motor acusaba por el bug de la cláusula >400:
    // NO deben estar en el allowlist (sería declarar muerto lo que una
    // pantalla MONTADA importa de verdad).
    const VIVOS_RESCATADOS_DEL_MOTOR = [
      'src/data/aguaFinca.js',
      'src/data/cacaoFinca.js',
      'src/data/mangoFinca.js',
    ];

    it('el gate queda VERDE sobre dev: 0 huérfanos sin declarar (el remate)', function () {
      expect(
        r.status,
        `el gate murió sin veredicto tras los reintentos (status=${r.status}, error=${r.error && r.error.code}) — no es un rojo del gate, es el entorno`,
      ).not.toBeNull();
      expect(r.status, `el gate volvió a rojo:\n${(r.stderr || '').slice(0, 2000)}`).toBe(0);
      expect(r.stdout).toContain('Auditoría limpia');
    });

    it('el allowlist no tiene NI UNA entrada fantasma', function () {
      expect(r.stdout, 'hay entradas de orphan_components que ya no le hacen match a ningún hallazgo — borrarlas (curaduría), no dejarlas pudrirse')
        .not.toContain('ya NO le hacen match');
    });

    it('las 13 entradas fantasma siguen borradas del allowlist', function () {
      const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
      const vueltas = FANTASMAS_BORRADAS.filter(function (id) { return ids.has(id); });
      expect(
        vueltas,
        'fantasmas de vuelta en el allowlist: sus archivos ya no son hallazgo (cableados/vitrina/página suelta)',
      ).toEqual([]);
    });

    it('los 3 archivos vivos que el motor acusaba NO están declarados', function () {
      const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
      for (const id of VIVOS_RESCATADOS_DEL_MOTOR) {
        expect(ids.has(id), `${id} está declarado y es VIVO: una pantalla MONTADA lo importa (cláusula >400 chars). Ver alcance-simbolica.test.mjs.`).toBe(false);
        expect(salida, `${id} sale del gate otra vez: ¿regresión del tope de cláusula del motor?`).not.toContain(id);
      }
    });

    it('las entradas con date 2026-09-05 son exactamente 126 (remate 123 + 3 apoyos de láminas) y todas siguen siendo hallazgos allowlisted', function () {
      // El remate (#3149) declaró 123. La misma fecha sumó 3 apoyos de las
      // láminas archivadas por #3151 (osoLamina/anatomia.js, osoLamina/capas.js
      // y zariguyaGeminiLamina/capas.js — task gate-audit-3-laminas), cada uno
      // con control de importadores verificado con grep: tests propios y
      // hermanos de módulo, nada de producto.
      const remate = (allowlist.orphan_components || []).filter(function (e) { return e.date === '2026-09-05'; });
      expect(
        remate.length,
        'el remate declaró 123 y la tanda láminas 3 (126 en total): si este número cambia, actualícelo conscientemente (con control de importadores por entrada)',
      ).toBe(126);
      const flojos = remate.filter(function (e) {
        return !salida.includes(`pieza SIN ruta viva pero allowlisted: ${e.id}`);
      });
      expect(
        flojos.map(function (e) { return e.id; }),
        'estas entradas del remate ya no salen como hallazgo allowlisted: o se cablearon (borrar la entrada + este pin) o el motor dejó de verlas',
      ).toEqual([]);
    });

    // EL CONTROL DE IMPORTADORES, hecho permanente. Resolución EXACTA de
    // especificadores sobre src/ (sin comentarios — misma semántica runtime
    // del motor): para cada entrada del remate, todo importador REAL y no-test
    // debe estar a su vez declarado en el allowlist. Si esta prueba falla,
    // alguien cableó un declarado (quitar la entrada, no callarla) o el
    // hallazgo del motor era un falso negativo (arreglar el motor, no
    // declarar por comodidad).
    const mapaImportadores = (function () {
      const SIN_COMENTARIOS = function (texto) {
        let out = '';
        let i = 0;
        while (i < texto.length) {
          const c = texto[i];
          if (c === '/' && texto[i + 1] === '/') { while (i < texto.length && texto[i] !== '\n') i++; continue; }
          if (c === '/' && texto[i + 1] === '*') {
            i += 2;
            while (i < texto.length && !(texto[i] === '*' && texto[i + 1] === '/')) i++;
            i += 2;
            continue;
          }
          if (c === '"' || c === "'" || c === '`') {
            const cierre = c;
            out += c; i++;
            while (i < texto.length) {
              if (texto[i] === '\\') { out += texto[i] + (texto[i + 1] || ''); i += 2; continue; }
              out += texto[i];
              const fin = texto[i] === cierre;
              i++;
              if (fin) break;
            }
            continue;
          }
          out += c;
          i++;
        }
        return out;
      };
      const EXT = ['', '.js', '.jsx', '.mjs', '.ts', '.tsx', '/index.js', '/index.jsx', '/index.ts', '/index.tsx'];
      const esTest = function (f) { return f.includes('__tests__') || /\.test\./.test(f) || /\.spec\./.test(f); };
      const resolver = function (spec, desde) {
        let base;
        if (spec.startsWith('./') || spec.startsWith('../')) base = resolve(dirname(desde), spec);
        else if (spec.startsWith('@/')) base = join(REPO_ROOT, 'src', spec.slice(2));
        else return null; // bare specifier (paquete)
        for (const ext of EXT) {
          const ruta = base + ext;
          if (existsSync(ruta) && statSync(ruta).isFile()) return ruta;
        }
        return null;
      };
      const reFrom = /(^|[\s;}])import\s+[^;'"]*?from\s*['"]([^'"]+)['"]/g;
      const reBare = /(^|[\s;}])import\s*['"]([^'"]+)['"]/g;
      const reDyn = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
      // SÓLO los sujetos del remate interesan: filtrar DURANTE el escaneo y no
      // guardar el grafo completo (1.600 módulos) — este arnés corre en
      // paralelo con los dos gates que spawnean el motor y la memoria del
      // worker no da para ambos (medido 2026-09-05: el spawn del gate moría
      // con la salida truncada cuando el mapa guardaba todo).
      const interesan = new Set(
        (allowlist.orphan_components || [])
          .filter(function (e) { return e.date === '2026-09-05'; })
          .map(function (e) { return join(REPO_ROOT, e.id); }),
      );
      const importadoresDeRuta = {};
      const caminar = function (dir) {
        for (const entry of readdirSync(dir)) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          const ruta = join(dir, entry);
          // MISMA semántica del gate (audit-integraciones.mjs / #3151): un
          // symlink NO es módulo del árbol — ni como sujeto ni como
          // consumidor. Sin este salto, el CONTROL leía (readFileSync sigue
          // el enlace, y en alpha el disco frío está montado) los componentes
          // ARCHIVADOS en _archivo/ y los contaba como importadores «vivos»
          // de sus apoyos declarados — falso positivo que castigaría la
          // declaración honesta del archivo.
          if (lstatSync(ruta).isSymbolicLink()) continue;
          if (statSync(ruta).isDirectory()) { caminar(ruta); continue; }
          if (!/\.(js|jsx|mjs|ts|tsx)$/.test(entry)) continue;
          const texto = SIN_COMENTARIOS(readFileSync(ruta, 'utf8'));
          const specs = [];
          let m;
          reFrom.lastIndex = 0;
          while ((m = reFrom.exec(texto)) !== null) specs.push(m[2]);
          reBare.lastIndex = 0;
          while ((m = reBare.exec(texto)) !== null) specs.push(m[2]);
          reDyn.lastIndex = 0;
          while ((m = reDyn.exec(texto)) !== null) specs.push(m[1]);
          for (const spec of specs) {
            const destino = resolver(spec, ruta);
            if (!destino || !interesan.has(destino)) continue;
            (importadoresDeRuta[destino] = importadoresDeRuta[destino] || []).push(ruta);
          }
        }
      };
      caminar(join(REPO_ROOT, 'src'));
      return {
        de: function (idRelativo) {
          return (importadoresDeRuta[join(REPO_ROOT, idRelativo)] || [])
            .map(function (f) { return f.slice(REPO_ROOT.length + 1).split('\\').join('/'); })
            .filter(function (f) { return f !== idRelativo && !esTest(f); });
        },
      };
    })();

    it('CONTROL: todo importador real de una entrada del remate está a su vez declarado', function () {
      const declarados = new Set(
        (allowlist.orphan_components || []).map(function (e) { return e.id; }),
      );
      const remate = (allowlist.orphan_components || []).filter(function (e) { return e.date === '2026-09-05'; });
      const problemas = [];
      for (const e of remate) {
        for (const imp of mapaImportadores.de(e.id)) {
          if (!declarados.has(imp)) problemas.push(`${e.id} ← ${imp} (vivo y SIN declarar)`);
        }
      }
      expect(
        problemas,
        'importadores vivos bajo una entrada declarada: la declaración dejó de ser honesta — cablea y borra la entrada, o corrige el veredicto del motor',
      ).toEqual([]);
    });

    it('CONTROL useT.js (la lección del 09-04): 0 importadores reales', function () {
      // Los «14 importadores» eran matches por substring de useTheme/useTts.
      // Si esto falla con importadores de verdad, alguien cableó el hook:
      // borrar la entrada del allowlist conscientemente.
      expect(mapaImportadores.de('src/hooks/useT.js')).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // TANDA LÁMINAS 2026-09-05 (task gate-audit-3-laminas)
  // -------------------------------------------------------------------------
  // #3151 archivó las láminas-viva en _archivo/ como symlinks al disco frío
  // (regla dura del operador: «compais solo con TINTA»; archivar ≠ borrar) y
  // desconectó sus últimos consumidores vivos (registro CREATURES y
  // ZariguyaCompaiEscena). Las carpetas de apoyo (anatomia/capas) se quedaron
  // en el árbol — el archivo es reversible — y el gate las acusó como 3
  // módulos de apoyo sin consumidor: el rojo de audit-integraciones que esta
  // tanda cierra. Los COMPONENTES dueños no se declaran a propósito: como
  // symlinks quedan fuera del alcance del gate, y sus 4 hermanas ya
  // declaradas (Jaguar/Zariguya/ChivitoPunk/Luciernaga, 2026-09-04) son hoy
  // la advertencia «ya NO le hacen match» que el gate reporta — su retiro es
  // curaduría del operador, no de este arnés.
  describe('tanda láminas 2026-09-05: apoyos de láminas archivadas declarados', function () {
    const APOYOS_LAMINAS = [
      'src/visual/creatures/osoLamina/anatomia.js',
      'src/visual/creatures/osoLamina/capas.js',
      'src/visual/creatures/zariguyaGeminiLamina/capas.js',
    ];

    it('los 3 apoyos están declarados (quitarlos devuelve el gate al rojo que esta task cerró)', function () {
      const porId = new Map((allowlist.orphan_components || []).map(function (e) { return [e.id, e]; }));
      for (const id of APOYOS_LAMINAS) {
        const e = porId.get(id);
        expect(e, `falta la entrada allowlist de ${id} — el gate vuelve a rojo (3 hallazgos sin declarar)`).toBeTruthy();
        expect(e.reason, `${id} sin reason: una excepción sin razón es exactamente lo que este archivo previene`).toBeTruthy();
        expect(e.date, `${id} sin date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('los 3 siguen siendo hallazgos allowlisted (ni cableados ni borrados en silencio)', function () {
      for (const id of APOYOS_LAMINAS) {
        expect(
          salida,
          `${id} ya no sale como hallazgo allowlisted: o se cableó (borrar la entrada + este pin) o el archivo dejó de existir`,
        ).toContain(`pieza SIN ruta viva pero allowlisted: ${id}`);
      }
    });

    it('CONTROL anti-falso-huérfano: zariguyaGeminiLamina/anatomia.js NO se declara — está viva', function () {
      // posesTrazado.js (el trazado tinta que vive en producto) importa la
      // anatomía Gemini con specifier EXACTO: declararla sería tachar de
      // muerto lo que una piel montada usa — la lección useT.js y data/*Finca.
      // Si este test falla porque el import ya no existe, la cadena tinta
      // cambió: revisar si anatomia pasó a huérfana ANTES de declararla.
      const ids = new Set((allowlist.orphan_components || []).map(function (e) { return e.id; }));
      expect(ids.has('src/visual/creatures/zariguyaGeminiLamina/anatomia.js')).toBe(false);
      const poses = readFileSync(
        resolve(REPO_ROOT, 'src/visual/creatures/zariguyaTrazado/posesTrazado.js'),
        'utf8',
      );
      expect(poses).toContain("from '../zariguyaGeminiLamina/anatomia.js'");
    });
  });
});
