// El arnés siempre fue un script node; `process` (process.on de limpieza más
// abajo) entra por import de node:process para que el hook de eslint (staged,
// --max-warnings=0) no se tropiece con el no-undef heredado de la config.
/**
 * Arnés de aceptación del control de componente huérfano (card 095).
 *
 * NO testea "el script corre sin reventar" — eso no prueba nada. Testea el
 * criterio del card: **el control tiene que encontrar los SEIS casos que ya se
 * conocen** (control positivo contra un resultado sabido de antemano) y **no
 * puede acusar a un componente que sí está montado** (control negativo).
 *
 * Un control que reporta cero es un control roto hasta que se demuestre lo
 * contrario. Estos seis casos son la referencia conocida contra la que se mide
 * el instrumento, y viven acá para que un refactor que los apague se vea.
 *
 * Si alguno de los seis se CABLEA o se BORRA de verdad, este test empieza a
 * fallar — y eso está bien: hay que actualizarlo A MANO, dejando escrito qué
 * pasó con la pieza. Aflojarlo sin esa nota es apagar el control.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import process from 'node:process';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(ROOT, 'scripts/audit-componente-huerfano.mjs');

let out;
let tmp;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'huerfano-'));
  const json = join(tmp, 'reporte.json');
  execFileSync('node', [SCRIPT, '--json', json], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
  out = JSON.parse(readFileSync(json, 'utf8'));
}, 150000);

const veredicto = (id) => out.controlA.find((r) => r.id === id)?.veredicto;
const enB1 = (id) => out.controlB1.find((r) => r.id === id);
const enB2 = (id) => out.controlB2.find((r) => r.id === id);

// Todo veredicto que NO sea MONTADO ni una decisión ya tomada y visible en el
// router (vitrina / página suelta) significa "ninguna ruta viva lo alcanza".
const NO_ALCANZABLE = ['HUERFANO', 'SOLO_TEST'];

describe('premisas que el control mide en vez de recordar', () => {
  it('la entrada real de la PWA monta <App/>, no ProdChagraApp', () => {
    expect(out.premisas.montaApp).toBe(true);
    expect(out.premisas.montaProd).toBe(false);
  });

  it('rutasProdChagraApp.js es un catálogo: no está en el cierre vivo', () => {
    expect(veredicto('src/config/rutasProdChagraApp.js')).not.toBe('MONTADO');
  });

  it('parte de las entradas del build, no de una lista escrita a mano', () => {
    const htmls = out.premisas.entradas.map((e) => e.html);
    expect(htmls).toContain('index.html');
    expect(out.premisas.entradas.find((e) => e.html === 'index.html').modulo).toBe('src/main.jsx');
  });

  it('separa vistas de producto de vitrinas, y ninguna clase queda vacía', () => {
    // Si una de las dos da cero, la partición se rompió y el control es ciego:
    // pasó de verdad (la línea `const X = lazy(...)` contaba como uso y todo
    // salía "producto").
    expect(out.premisas.vistasProducto.length).toBeGreaterThan(20);
    expect(out.premisas.vistasVitrina.length).toBeGreaterThan(20);
    expect(out.premisas.modulosProducto).toBeLessThan(out.premisas.modulosTotal);
  });

  it('lee el switch completo de App.jsx (no se le pierden case por comentarios)', () => {
    const app = readFileSync(join(ROOT, 'src/App.jsx'), 'utf8');
    const casesEnFuente = (app.match(/^\s*case\s+['"]/gm) || []).length;
    // Tolerancia baja a propósito: el bug del `(#/mockups/*)` dentro de un
    // comentario de línea se comía 10 case y cuatro mundos 3D salían huérfanos.
    expect(out.premisas.vistasSwitch).toBeGreaterThanOrEqual(casesEnFuente - 2);
  });
});

describe('CONTROL POSITIVO — los seis casos del card 095 sobre dev', () => {
  it('caso 1 · RESUELTO: compaiExplicaPantallas + hook + CompaiGuiaPantalla están MONTADOS', () => {
    // ACTUALIZADO A MANO 2026-09-03 (protocolo de este arnés: "si alguno de
    // los seis se CABLEA o se BORRA de verdad, este test empieza a fallar —
    // hay que actualizarlo A MANO, dejando escrito qué pasó con la pieza").
    // Qué pasó: la cadena explicación→pizarra se CABLEÓ (decisión del
    // operador: el texto de explicación de la pantalla SALE EN LA PIZARRA
    // SIEMPRE; regla dura, commit 3233f7f06 — la pizarra es el único aviso
    // del compai). AgentFab importa y monta <CompaiGuiaPantalla> dentro de su
    // panel "Ver"; el componente consume useCompaiGuiaPantalla; el hook
    // consume explicacionDePantalla; y getHintForRuta (compaiHints.js)
    // consulta el manifiesto PRIMERO, así el texto también llega a la
    // pizarra del CompaiOverlay y al peek del toque. El componente dejó de
    // ser una burbuja auto-pop (prohibida) y es un bloque de la pizarra.
    // Este control ahora protege el RESULTADO: si alguien des-cablea la
    // cadena, los veredictos vuelven a HUERFANO/SOLO_TEST y esto se pone
    // rojo.
    expect(veredicto('src/services/compaiExplicaPantallas.js')).toBe('MONTADO');
    expect(veredicto('src/hooks/useCompaiGuiaPantalla.js')).toBe('MONTADO');
    expect(veredicto('src/components/CompaiGuiaPantalla.jsx')).toBe('MONTADO');
  });

  it('caso 2 · la librería comportamientos/ expone superficie que nadie consume', () => {
    const mods = out.controlB2.filter((r) => r.id.includes('/creatures/comportamientos/') && r.fuerte);
    expect(mods.length).toBeGreaterThanOrEqual(4);
    const gestos = enB2('src/visual/creatures/comportamientos/gestos.js');
    expect(gestos).toBeTruthy();
    // Umbral holgado a propósito: lo que se afirma es "la mayoría de esta
    // librería no la llama nadie", no un número exacto que un refactor menor
    // convierta en rojo. Medido en dev: 15 sin ningún consumidor + 6 que solo
    // sostiene su test, de 22 exports.
    expect(gestos.muertos.length + gestos.sostenidoTest.length).toBeGreaterThanOrEqual(15);
    expect(gestos.muertos.length).toBeGreaterThanOrEqual(10);
  });

  it('caso 3 · AngelitaSalida: el archivo entra por un hermano, el componente no lo monta nadie', () => {
    // El archivo es alcanzable (AngelitaEntrada le pide `MotasMisticas`), así
    // que un control por ARCHIVO lo daría por bueno. Por eso hace falta B1.
    expect(veredicto('src/visual/agente/AngelitaSalida.jsx')).not.toBe('HUERFANO');
    const b1 = enB1('src/visual/agente/AngelitaSalida.jsx');
    expect(b1, 'AngelitaSalida debe salir como componente sin importador').toBeTruthy();
    expect(b1.muertos).toContain('AngelitaSalida');
  });

  it('caso 4 · GuiaEspecieCards: solo lo importa su propio test', () => {
    expect(veredicto('src/components/aprendizaje/GuiaEspecieCards.jsx')).toBe('SOLO_TEST');
  });

  it('caso 5 · chips pintados sin conducta (092): asociaciones y fuente_doi', () => {
    expect(out.controlC.ok).toBe(true);
    expect(out.controlC.inertes).toEqual(expect.arrayContaining(['asociaciones', 'fuente_doi']));
  });

  it('caso 6 · láminas-viva (094): cuatro de las seis no las alcanza ninguna ruta viva', () => {
    const laminas = out.controlA.filter((r) => /creatures\/\w+LaminaViva\.jsx$/.test(r.id));
    expect(laminas.length).toBe(6);
    const sinRuta = laminas.filter((r) => NO_ALCANZABLE.includes(r.veredicto)).map((r) => r.id);
    // Medido sobre origin/dev el 2026-09-03. El card 094 sospechaba de cuatro
    // y no había trazado la cadena; acá está trazada una por una.
    expect(sinRuta.sort()).toEqual([
      'src/visual/creatures/ChivitoPunkLaminaViva.jsx',
      'src/visual/creatures/JaguarLaminaViva.jsx',
      'src/visual/creatures/LuciernagaLaminaViva.jsx',
      'src/visual/creatures/ZariguyaLaminaViva.jsx',
    ]);
    // Las otras dos SÍ tienen cadena real, y por eso no se reportan:
    expect(veredicto('src/visual/creatures/ZariguyaGeminiLaminaViva.jsx')).toBe('MONTADO');
    expect(veredicto('src/visual/creatures/OsoBastonLaminaViva.jsx')).toBe('MONTADO');
  });

  it('los seis casos aparecen en el reporte de hallazgos, no solo en el detalle', () => {
// NOTA (tanda 1 del drenaje, 2026-09-04): GuiaEspecieCards salió de esta
    // lista porque quedó DECLARADA en ops/componentes-huerfanos-allowlist.json
    // (prototipo con datos demo, ver su entrada). No se cableó ni se borró:
    // lo que el control sigue viendo es su VEREDICTO (test de abajo). Si un
    // día desaparece de declarados sin actualizarse acá, se apagó el control.
    // Rebase 2026-09-04 (PR #3115): las dos piezas del caso 1
    // (compaiExplicaPantallas.js y CompaiGuiaPantalla.jsx) salieron también del
    // listado porque se CABLEARON de verdad, ya no son hallazgos, son producto.
    const ids = new Set(out.hallazgos.map((h) => h.id));
    for (const id of [
      'src/visual/agente/AngelitaSalida.jsx',
      'src/visual/creatures/comportamientos/gestos.js',
      'chip:asociaciones',
      'chip:fuente_doi',
    ]) {
      expect(ids.has(id), `falta en hallazgos: ${id}`).toBe(true);
    }
    // Y la cadena cableada NO puede volver a salir como hallazgo:
    for (const id of [
      'src/services/compaiExplicaPantallas.js',
      'src/hooks/useCompaiGuiaPantalla.js',
      'src/components/CompaiGuiaPantalla.jsx',
    ]) {
      expect(ids.has(id), `la pieza cableada volvió a salir como hallazgo: ${id}`).toBe(false);
    }
  });

  it('ChivitoPunkLaminaViva sigue siendo HUERFANO, pero ya está DECLARADA (#3108)', () => {
    // Cuando se escribió este control, la lámina salía como hallazgo sin
    // declarar. El PR #3108 (2026-09-03) la declaró en
    // `ops/integraciones-no-consumidas.json` con razón sustantiva: la tinta la
    // reemplazó en el registro el 2026-08-31 y el archivo queda por historia.
    // Por eso ya NO está en `hallazgos` — está en `declarados`. Lo que este
    // control tiene que seguir viendo es el VEREDICTO: si algún día vuelve a
    // salir MONTADO sin que nadie la cablee, el instrumento se rompió.
    const id = 'src/visual/creatures/ChivitoPunkLaminaViva.jsx';
    expect(veredicto(id)).toBe('HUERFANO');
    expect(new Set(out.hallazgos.map((h) => h.id)).has(id)).toBe(false);
  });

  it('GuiaEspecieCards sigue siendo SOLO_TEST, pero ya está DECLARADA (tanda 1 del drenaje)', () => {
    // Tanda 1 del drenaje (2026-09-04): el prototipo del módulo de aprendizaje
    // quedó declarado en ops/componentes-huerfanos-allowlist.json con razón
    // sustantiva — montarlo hoy inyectaría GUIAS_DEMO (papa/café a mano) en
    // pantallas grounded desde catalog.sqlite. NO se cableó ni se borró: sigue
    // SOLO_TEST y ahora vive en `declarados`, no en `hallazgos`.
    const id = 'src/components/aprendizaje/GuiaEspecieCards.jsx';
    expect(veredicto(id)).toBe('SOLO_TEST');
    expect(new Set(out.hallazgos.map((h) => h.id)).has(id)).toBe(false);
  });
});

describe('TANDA 1 DEL DRENAJE — decisiones escritas (2026-09-04, ops/DRENAJE-HUERFANOS-TANDA-1-2026-09-04.md)', () => {
  // Las 9 piezas DECLARADAS en ops/componentes-huerfanos-allowlist.json.
  // Declarar no es cablear: el veredicto del control NO cambia — lo que cambia
  // es que dejan de ser hallazgos sin decisión y pasan a `declarados`.
  const DECLARADAS = [
    'src/components/aprendizaje/GuiaEspecieCards.jsx',
    'src/components/_archivado/UmbralValle.jsx',
    'src/components/_archivo/OnboardingModal.jsx',
    'src/components/_archivo/BienvenidaFinca.jsx',
    'src/components/_archivo/OnboardingHero.jsx',
    'src/components/_archivo/OnboardingProfile.jsx',
    'src/components/_archivado/PanelVitalidadEspiritu.jsx',
    'src/visual/mundo3d/atmosfera/DemoAtmosferaViva.jsx',
    'src/components/lotes/LoteCroquisPlaceholder.jsx',
  ];

  // Las 6 PROPUESTAS DE BORRADO de la tanda 1. Aquí NO se borra nada — eso lo
  // decide el operador. Hasta el 2026-09-04 el control las mantenía acusadas
  // como mecanismo de presión. El 2026-09-05 el operador ordenó el REMATE del
  // gate de integraciones (task audit-gate-remate-20260905): las 6 quedaron
  // declaradas en ops/integraciones-no-consumidas.json, y este gate HEREDA esa
  // excusa (su cargador lee orphan_components del otro allowlist como
  // `heredado`), así que dejaron de salir como hallazgos ACÁ TAMBIÉN — por
  // diseño del cargador, no por un cableado. Lo que NO cambió: siguen
  // inalcanzables, siguen en disco y el BORRADO sigue pendiente del operador.
  // Este pin sostiene ese estado: si falla, alguien las cableó o las borró
  // sin pasar por la curaduría.
  const PROPUESTAS_BORRADO = [
    'src/components/ChagraAgentAvatarColibri.jsx',
    'src/components/ChagraAgentAvatarColibriPhoto.jsx',
    'src/components/ChagraAgentAvatarMaiz.jsx',
    'src/components/SplashAngelita.jsx',
    'src/components/escucha/EscuchaFab.jsx',
    'src/components/QuickChipsBar.jsx',
  ];

  it('las 9 piezas declaradas de la tanda 1 ya no salen como hallazgos', () => {
    const ids = new Set(out.hallazgos.map((h) => h.id));
    for (const id of DECLARADAS) {
      expect(ids.has(id), `sigue acusada, falta su entrada en el allowlist: ${id}`).toBe(false);
    }
  });

  it('declarar no es cablear: su veredicto sigue siendo inalcanzable', () => {
    for (const id of DECLARADAS) {
      expect(NO_ALCANZABLE).toContain(veredicto(id));
    }
  });

  it('los archivos declarados existen: si uno desaparece, su entrada vence y hay que revisarla', () => {
    for (const id of DECLARADAS) {
      expect(existsSync(join(ROOT, id)), `archivo borrado con entrada de allowlist viva: ${id}`).toBe(true);
    }
  });

  it('cada entrada de la tanda 1 lleva reason sustantiva y date válida', () => {
    const al = JSON.parse(readFileSync(join(ROOT, 'ops/componentes-huerfanos-allowlist.json'), 'utf8'));
    const porId = new Map((al.componentes || []).map((e) => [e.id, e]));
    for (const id of DECLARADAS) {
      const e = porId.get(id);
      expect(e, `falta entrada de allowlist: ${id}`).toBeTruthy();
      expect(String(e.reason || '').length, `razón muy corta para ser sustantiva: ${id}`).toBeGreaterThanOrEqual(80);
      expect(e.date, `date inválida: ${id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('las 6 propuestas de borrado: declaradas por el remate 2026-09-05 (heredado), siguen inalcanzables y en disco', () => {
    // La excusa ahora viene del allowlist del gate de integraciones (herencia
    // del cargador de arriba), así que dejaron de salir como hallazgos acá.
    // Lo que este pin sostiene: la EXCUSA existe, el veredicto NO cambió y el
    // archivo NO se borró — el borrado sigue siendo curaduría del operador.
    const al = JSON.parse(
      readFileSync(join(ROOT, 'ops/integraciones-no-consumidas.json'), 'utf8'),
    );
    const porId = new Map((al.orphan_components || []).map((e) => [e.id, e]));
    const ids = new Set(out.hallazgos.map((h) => h.id));
    for (const id of PROPUESTAS_BORRADO) {
      expect(ids.has(id), `volvió a acusarse: su excusa heredada se rompió — revisar ${id}`).toBe(false);
      expect(NO_ALCANZABLE).toContain(veredicto(id));
      expect(existsSync(join(ROOT, id)), `archivo borrado sin curaduría del operador: ${id}`).toBe(true);
      const e = porId.get(id);
      expect(e, `falta la entrada en ops/integraciones-no-consumidas.json: ${id}`).toBeTruthy();
      expect(e.date, `la excusa heredada de ${id} ya no es del remate 2026-09-05`).toBe('2026-09-05');
    }
  });
});

describe('CONTROL NEGATIVO — lo que SÍ está montado no puede salir acusado', () => {
  const MONTADOS = [
    'src/App.jsx',
    'src/components/AgentFab.jsx',
    'src/components/LoginScreen.jsx',
    'src/components/dashboard/DashboardLive.jsx',
    'src/components/dashboard/MundosDeMiFinca.jsx',
    'src/components/ValleMarcoScreen.jsx',
    'src/components/clima/ClimaBoletinScreen.jsx',
  ];

  it.each(MONTADOS)('%s sale MONTADO', (id) => {
    expect(veredicto(id)).toBe('MONTADO');
  });

  it('ninguno de ellos aparece en hallazgos', () => {
    const ids = new Set(out.hallazgos.map((h) => h.id));
    for (const id of MONTADOS) expect(ids.has(id), `acusado en falso: ${id}`).toBe(false);
  });

  it('las vitrinas públicas bajo mockup_* NO se reportan como huérfanas', () => {
    // El card lo pide explícito: están deliberadamente no montadas y el propio
    // código las documenta como página pública autocontenida.
    const ids = new Set(out.hallazgos.map((h) => h.id));
    for (const id of ['src/mockups/VisualLib.jsx', 'src/mockups/Mundo3DAgua.jsx', 'src/mockups/AngelitaViva.jsx']) {
      expect(veredicto(id)).toBe('SOLO_VITRINA');
      expect(ids.has(id), `vitrina reportada como huérfana: ${id}`).toBe(false);
    }
  });

  it('la exención de vitrinas NO es una lista de nombres: sale del router de App.jsx', () => {
    // El error del CHUNK_ALLOWLIST fue exceptuar por nombre literal. Acá el
    // allowlist propio no tiene ni una entrada de vitrina y aun así ninguna se
    // reporta: la exención se deriva de MOCKUP_HASH_ROUTES.
    const allowlist = JSON.parse(readFileSync(join(ROOT, 'ops/componentes-huerfanos-allowlist.json'), 'utf8'));
    const ids = (allowlist.componentes || []).map((e) => e.id);
    expect(ids.filter((i) => i.includes('mockups/'))).toEqual([]);
  });

  it('un componente exportado que su propio archivo renderiza no cuenta como muerto', () => {
    // PlagasSprites.jsx exporta 12 sprites y los monta él mismo. Exportarlos de
    // más es higiene, no "construido y no conectado": B1 no los debe listar.
    expect(enB1('src/mockups/metalslug/PlagasSprites.jsx')).toBeFalsy();
  });
});

describe('el allowlist avisa cuando una excepción dejó de aplicar', () => {
  it('reporta entradas sin sujeto en vez de dejarlas protegiendo un fantasma', () => {
    expect(Array.isArray(out.allowlistObsoletas)).toBe(true);
  });

  it('una entrada inventada aparece como obsoleta', () => {
    // Control positivo del propio mecanismo: si esto pasara en silencio,
    // el allowlist sería decorativo (el error del CHUNK_ALLOWLIST).
    const json = join(tmp, 'obsoleta.json');
    const alPath = join(ROOT, 'ops/componentes-huerfanos-allowlist.json');
    const original = readFileSync(alPath, 'utf8');
    try {
      const al = JSON.parse(original);
      al.componentes.push({
        id: 'src/componentes/EsteArchivoNoExiste.jsx',
        reason: 'entrada de prueba del arnés — no debe sobrevivir a la corrida',
        date: '2026-09-03',
      });
      writeFileSync(alPath, JSON.stringify(al, null, 2) + '\n', 'utf8');
      execFileSync('node', [SCRIPT, '--json', json], { cwd: ROOT, encoding: 'utf8', timeout: 120000 });
      const r = JSON.parse(readFileSync(json, 'utf8'));
      expect(r.allowlistObsoletas.map((o) => o.id)).toContain('src/componentes/EsteArchivoNoExiste.jsx');
    } finally {
      writeFileSync(alPath, original, 'utf8');
    }
  }, 150000);
});

// Limpieza del tmpdir del arnés.
process.on('exit', () => { try { rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ } });
