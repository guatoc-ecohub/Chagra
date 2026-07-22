#!/usr/bin/env node
/**
 * nightly-canary.mjs — CANARIO NOCTURNO de Chagra (runner del framework).
 *
 * Test de salud + inteligencia auto-mejorante que corre todas las noches (1 AM
 * Colombia) contra DEV y PROD. Es un RUNNER DELGADO sobre un REGISTRO EXTENSIBLE
 * de módulos (`scripts/lib/canary-modules.mjs`): cada check (ejes B/D/C del doc
 * `ops/NIGHTLY_SYSTEM.md`) y cada cosecha (eje A) es un módulo pluggable. El
 * runner corre los de la(s) fase(s) activa(s) EN ORDEN, acumula estado en `ctx`
 * (los módulos de cosecha leen lo que produjeron los de salud), y reporta los de
 * fase inactiva como STUB con un TODO claro. Agregar un módulo nuevo = escribir
 * su `run()` en el registro; el runner lo corre solo.
 *
 * Salida: JSON + Markdown en CANARY_OUT_DIR; exit != 0 si algún check falla;
 * alerta Telegram INMEDIATA ante cualquier fallo (además del digest de las 9 AM).
 *
 * SEGURIDAD / ANTI-LEAK (repo público): sin hosts internos, IPs, tokens ni
 * credenciales hardcodeados. Credenciales del usuario de pruebas: SOLO en runtime
 * del archivo gitignored `~/.config/chagra-canary-creds.txt`. Verificación en
 * disco del store de conversaciones: comando inyectado por env. Datos sintéticos
 * (usuario de pruebas) → sin PII.
 *
 * USO:
 *   node scripts/nightly-canary.mjs --target=dev
 *   node scripts/nightly-canary.mjs --target=prod
 *   node scripts/nightly-canary.mjs --target=dev --no-alert --phases=P0 --skip=B0d
 *   node scripts/nightly-canary.mjs --list       # lista el registro de módulos
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module nightly-canary
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import { MODULES, selectModules, pickTopic, buildConversation, clip, nowIso } from './lib/canary-modules.mjs';

// ── CLI ─────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { target: null, noAlert: false, help: false, list: false, phases: ['P0'], skip: [], only: [] };
  for (const a of argv.slice(2)) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--list') out.list = true;
    else if (a === '--no-alert') out.noAlert = true;
    else if (a === '--skip-visual') out.skip.push('B0d');
    else if (a === '--skip-plant') out.skip.push('B0b');
    else if (a.startsWith('--target=')) out.target = a.slice('--target='.length);
    else if (a.startsWith('--phases=')) out.phases = a.slice('--phases='.length).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    else if (a.startsWith('--skip=')) out.skip.push(...a.slice('--skip='.length).split(',').map((s) => s.trim()).filter(Boolean));
    else if (a.startsWith('--only=')) out.only.push(...a.slice('--only='.length).split(',').map((s) => s.trim()).filter(Boolean));
    else throw new Error(`Argumento no reconocido: ${a}`);
  }
  return out;
}

const HELP = `CANARIO NOCTURNO de Chagra — framework extensible de checks + cosecha.

Uso:
  node scripts/nightly-canary.mjs --target=dev|prod [opciones]
  node scripts/nightly-canary.mjs --list

Opciones:
  --phases=P0[,P1,P2]  fases activas a correr (default P0). El resto se reporta como STUB.
  --skip=B0d,B0b       saltar módulos por id.   --only=D1,D2  correr solo esos.
  --skip-visual        alias de --skip=B0d.     --skip-plant  alias de --skip=B0b.
  --no-alert           no envía alerta Telegram aunque falle (para pruebas a mano).
  --list               imprime el registro de módulos (id, fase, categoría) y sale.

Env (todas con default): CANARY_DEV_URL/CANARY_PROD_URL, CANARY_OUT_DIR (~/chagra-canary-runs),
  CANARY_CREDS_FILE, CANARY_SIDECAR_TOKEN_FILE, CANARY_CHAT_MODEL (granite3.3:8b),
  CANARY_FARMOS_CLIENT_ID (farm), CANARY_CONV_COUNT_CMD (verificación de captura en disco),
  CANARY_TG_ENABLED=0 (desactiva Telegram), PLAYWRIGHT_CHROMIUM_PATH.
`;

// ── credenciales / tokens (SOLO runtime, NUNCA impresos) ───────────────────────
function readCreds() {
  const file = process.env.CANARY_CREDS_FILE || join(homedir(), '.config', 'chagra-canary-creds.txt');
  if (!existsSync(file)) throw new Error(`Credenciales no encontradas en ${file}.`);
  const out = {};
  for (const line of readFileSync(file, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim().toLowerCase()] = t.slice(i + 1).trim();
  }
  if (!out.usuario || !out.clave) throw new Error('Credenciales incompletas (usuario/clave).');
  return out;
}
function readSidecarToken() {
  const file = process.env.CANARY_SIDECAR_TOKEN_FILE || join(homedir(), '.config', 'chagra-sidecar-token.txt');
  if (existsSync(file)) return readFileSync(file, 'utf-8').trim();
  return process.env.CANARY_SIDECAR_TOKEN || '';
}

function tgAlert(message, noAlert) {
  if (noAlert) return { sent: false, reason: 'no-alert' };
  if (process.env.CANARY_TG_ENABLED === '0') return { sent: false, reason: 'disabled' };
  try { execSync(`tg-send ${JSON.stringify(message)}`, { encoding: 'utf-8', timeout: 20000, stdio: 'pipe' }); return { sent: true }; }
  catch (err) { return { sent: false, reason: String(err?.message || err).slice(0, 120) }; }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);
  if (args.help) { console.log(HELP); process.exit(0); }
  if (args.list) {
    console.log('REGISTRO DE MÓDULOS DEL CANARIO (id · fase · categoría · nombre):\n');
    for (const m of MODULES) console.log(`  ${m.id.padEnd(7)} ${m.fase}  ${(m.stub ? 'STUB ' : '     ')}${m.categoria.padEnd(9)} ${m.nombre}`);
    console.log(`\nTotal: ${MODULES.length} módulos (${MODULES.filter((m) => !m.stub).length} implementados, ${MODULES.filter((m) => m.stub).length} stubs registrados).`);
    process.exit(0);
  }
  if (!args.target || !['dev', 'prod'].includes(args.target)) {
    console.error('FATAL: --target=dev|prod es obligatorio.\n');
    console.error(HELP);
    process.exit(2);
  }

  const target = args.target;
  const base = target === 'dev'
    ? (process.env.CANARY_DEV_URL || 'https://chagra-dev.guatoc.co')
    : (process.env.CANARY_PROD_URL || 'https://chagra.app');
  // CANARY_DATE (YYYY-MM-DD) fija la fecha para retests REPRODUCIBLES: el banco
  // dinámico C1 rota sus sujetos por día del año, así que un retest debe usar la
  // fecha de la corrida original para evaluar los MISMOS sujetos (si cruza la
  // medianoche UTC sin fijarla, compara químicos distintos → veredicto inválido).
  const envDate = process.env.CANARY_DATE;
  const now = /^\d{4}-\d{2}-\d{2}$/.test(envDate || '')
    ? new Date(`${envDate}T12:00:00Z`)
    : new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const outDir = process.env.CANARY_OUT_DIR || join(homedir(), 'chagra-canary-runs');
  mkdirSync(outDir, { recursive: true });

  const topic = pickTopic(now);
  const conversation = buildConversation(topic, dateStr);

  // Contexto compartido: los módulos leen y ACUMULAN aquí (B produce, A consume).
  const ctx = {
    target, base, dateStr, now, outDir, topic, conversation,
    chatModel: process.env.CANARY_CHAT_MODEL || 'granite3.3:8b',
    sidecarToken: readSidecarToken(),
    creds: null, token: null, // creds/login los pone el módulo 'login'
    responses: [], verdicts: null, verdictsById: null,
  };
  try { ctx.creds = readCreds(); } catch (err) { console.error(`FATAL: ${err.message}`); process.exit(2); }

  console.log(`\n=== CANARIO NOCTURNO — target=${target} base=${base} fecha=${dateStr} ===`);
  console.log(`Tema de la noche: ${topic.id} (${topic.problema})`);
  console.log(`Fases activas: ${args.phases.join(',')}${args.only.length ? ` · only=${args.only.join(',')}` : ''}${args.skip.length ? ` · skip=${args.skip.join(',')}` : ''}\n`);

  const selected = selectModules(args.phases);
  const results = [];
  for (const m of selected) {
    // Filtros --only / --skip.
    const skipByFlag = args.skip.includes(m.id) || (args.only.length > 0 && !args.only.includes(m.id));
    if (m.stub) {
      results.push({ id: m.id, nombre: m.nombre, categoria: m.categoria, fase: m.fase, status: 'stub', valor: '', detalle: `STUB (${m.fase}) — TODO: ${m.todo || 'implementar run()'}` });
      console.log(`[STUB] ${m.id} — ${m.nombre} (${m.fase})`);
      continue;
    }
    if (!m._active || skipByFlag) {
      results.push({ id: m.id, nombre: m.nombre, categoria: m.categoria, fase: m.fase, status: 'skip', valor: '', detalle: skipByFlag ? 'saltado por flag' : `fase ${m.fase} inactiva` });
      console.log(`[SKIP] ${m.id} — ${m.nombre}`);
      continue;
    }
    const t0 = Date.now();
    let res;
    try {
      res = await m.run(ctx);
    } catch (err) {
      res = { status: 'fail', valor: 'excepción', detalle: `Excepción en ${m.id}: ${String(err?.stack || err).slice(0, 300)}` };
    }
    const ms = Date.now() - t0;
    const entry = { id: m.id, nombre: m.nombre, categoria: m.categoria, fase: m.fase, ms, ...res };
    results.push(entry);
    const icon = res.status === 'pass' ? 'PASS' : res.status === 'fail' ? 'FAIL' : 'SKIP';
    console.log(`[${icon}] ${m.id} — ${res.detalle}`);
  }

  // ── salida: JSON + Markdown ──────────────────────────────────────────────────
  const failed = results.filter((c) => c.status === 'fail');
  const passed = results.filter((c) => c.status === 'pass');
  const skipped = results.filter((c) => c.status === 'skip');
  const stubs = results.filter((c) => c.status === 'stub');
  const overall = failed.length === 0 ? 'PASS' : 'FAIL';

  const report = {
    canary_version: 2,
    framework: 'module-registry',
    target, base_url: base, date: dateStr,
    started_at: now.toISOString(), finished_at: nowIso(),
    phases_active: args.phases,
    topic: topic.id, topic_problema: topic.problema,
    overall,
    summary: { pass: passed.length, fail: failed.length, skip: skipped.length, stub: stubs.length },
    checks: results.map((r) => ({ ...r, data: r.data })),
    conversation: (ctx.responses || []).map((r) => ({ ...r, agent_text: clip(r.agent_text, 2000) })),
  };
  const jsonPath = join(outDir, `canary-${dateStr}-${target}.json`);
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const md = [
    `# Canario nocturno — ${target} — ${dateStr}`,
    '',
    `**Resultado global: ${overall}**  ·  ${passed.length} PASS · ${failed.length} FAIL · ${skipped.length} SKIP · ${stubs.length} STUB`,
    `**Target:** ${base}`,
    `**Tema de la noche:** ${topic.id} — ${topic.problema}`,
    `**Fases activas:** ${args.phases.join(', ')}`,
    '',
    '## Checks',
    '',
    '| id | Estado | Categoría | Valor | Detalle |',
    '|---|---|---|---|---|',
    ...results.map((c) => `| ${c.id} | ${c.status.toUpperCase()} | ${c.categoria} | ${String(c.valor || '').replace(/\|/g, '\\|')} | ${String(c.detalle).replace(/\|/g, '\\|')} |`),
    '',
    '## Conversación evaluada',
    '',
    ...(ctx.responses || []).flatMap((r) => [
      `### Turno ${r.turn} (${r.kind})`,
      `**Usuario:** ${r.user_text}`,
      '',
      `**Agente:** ${clip(r.agent_text, 1200) || '(sin respuesta)'}`,
      r.error ? `\n_error: ${r.error}_` : '',
      '',
    ]),
  ].join('\n');
  writeFileSync(join(outDir, `canary-${dateStr}-${target}.md`), md);

  console.log(`\n=== RESULTADO: ${overall} (${passed.length} pass / ${failed.length} fail / ${skipped.length} skip / ${stubs.length} stub) ===`);
  console.log(`Reporte JSON: ${jsonPath}`);

  if (failed.length > 0) {
    const lines = failed.map((c) => `• ${c.id} ${c.nombre}: ${c.detalle}`).join('\n');
    const alert = `🐤 CANARIO ${target.toUpperCase()} FALLÓ (${dateStr})\nTema: ${topic.id}\n${failed.length} check(s) caídos:\n${clip(lines, 1500)}`;
    const tg = tgAlert(alert, args.noAlert);
    console.log(`Alerta Telegram: ${tg.sent ? 'enviada' : `NO (${tg.reason})`}`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => { console.error('FATAL canario:', err?.stack || err); process.exit(3); });
