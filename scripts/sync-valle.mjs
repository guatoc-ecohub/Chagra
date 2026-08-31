#!/usr/bin/env node
/**
 * sync-valle.mjs — sincroniza el valle 3D vanilla (three r160, el mismo
 * build que sirve 3d.guatoc.co) desde su checkout de desarrollo local hacia
 * `public/valle/`, para que Vite lo sirva estático (marco de entrada
 * opcional, ver `src/components/ValleMarcoScreen.jsx`) y quede disponible
 * para caché offline (SW — fuera de alcance de este script).
 *
 * FUENTE: `~/demos/3d` (o `$VALLE_SRC_DIR`) — NO es parte de este repo; vive
 * en un checkout local aparte, mantenido fuera de Chagra. `public/valle/` NO
 * se commitea (ver .gitignore) — es artefacto generado, no fuente; se
 * re-sincroniza en cada `prebuild`. Si `~/demos/3d` no existe en la máquina
 * que construye (CI sin ese checkout, otro desarrollador), el script es un
 * NO-OP: `public/valle/` queda ausente/vacío y el marco de entrada 404ea si
 * alguien lo activa — aceptable porque `marco3d` es opt-in (default OFF, ver
 * userProfileService.getMarco3DPreference) y hoy solo el host que despliega
 * (alpha, con `~/demos/3d` presente) construye el build servido en
 * producción. Este script es una herramienta de sync para quien tiene el
 * origen a mano — no un paso que deba poder correr en todas partes.
 *
 * QUÉ SE EXCLUYE Y POR QUÉ:
 *   - .git, node_modules, .venv, __pycache__ — control de versiones/deps,
 *     nunca assets de runtime del navegador.
 *   - _gate/, registro/ — scratch de verificación visual de los esclavos
 *     (capturas, informes por-commit); infla sin aportar al valle servido.
 *   - carpetas "dist..." (build de sub-herramientas del repo fuente).
 *   - systemd/, noc-gateway/, _relevo.py, _server.py, *.py — infraestructura
 *     de desarrollo local (unidades systemd con IP de VPN interna, un
 *     gateway NOC en Python, relés websocket). Cero de esto es código de
 *     navegador, y `systemd/` en particular referencia infra interna que NO
 *     puede entrar a un repo público (SOP infra-refs-scan) — verificado
 *     limpio el resto del árbol antes de cablear este script.
 *   - dev/, package.json, package-lock.json, server.js — tooling Node de los
 *     juegos (tests, relay de multijugador): no se sirven ni se ejecutan en
 *     el navegador.
 *   - app/ (solo en la raíz) — snapshot de un build viejo de la PWA embebido
 *     en el valle para enlaces de respaldo (`/app/#/mockups/...`); duplica
 *     ~48 MB de datos que la PWA ya trae en su propio `public/`
 *     (rag-embeddings.json, catalog.sqlite, etc.) y esos enlaces no
 *     resuelven igual una vez el valle vive bajo `/valle/` — no vale la pena
 *     arrastrar el peso.
 *   - *.md — informes/auditorías de desarrollo, no assets del valle.
 *   - *-check.png, *-shot.png, *-shot2.png, *-gate.html, _prueba-recorte.png,
 *     prueba.html, _canario*.txt — capturas y páginas de verificación visual
 *     ("gate") que quedaron FUERA de `_gate/` pero cumplen la misma función:
 *     evidencia de QA, nunca cargadas por el juego real.
 *
 * Ver también (tratan `public/valle/**` como VENDOREADO — sincronizado
 * completo desde otro repo, no autoría de este, igual que ya trata ESLint a
 * `public/vendor/**` con tfjs/speech-commands):
 *   - eslint.config.js          → globalIgnores('public/valle/**')
 *   - lefthook.yml              → strategic-content-scan filtra public/valle/
 *   - scripts/scan-voseo-comments.mjs → EXCLUDE_RE incluye public/valle/
 *   - scripts/check-perf-budget.mjs   → LAZY_EXCLUDED_PREFIXES incluye dist/valle
 * `secret-scan` e `infra-refs-scan` SÍ corren sobre `public/valle/**` sin
 * excepción: ya se verificó limpio antes de este commit, y debe seguir
 * limpio en cada re-sync futuro (si algún día no lo está, el commit del
 * re-sync debe fallar el pre-commit, no pasar en silencio).
 */
import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEST = join(ROOT, 'public', 'valle');
const SRC = process.env.VALLE_SRC_DIR || join(homedir(), 'demos', '3d');

const EXCLUDE_DIR_NAMES = new Set([
  '.git', 'node_modules', '.venv', '__pycache__', '_gate', 'registro',
  '_steals', 'systemd', 'noc-gateway', 'dev',
]);
const EXCLUDE_DIR_PREFIXES = ['dist'];
// Solo se excluyen en la RAÍZ del valle (un subdirectorio de mundo llamado
// igual, si algún día existiera, no debe caer en esta regla).
const EXCLUDE_TOPLEVEL_DIRS = new Set(['app']);

const EXCLUDE_FILE_EXTS = new Set(['.md', '.py']);
const EXCLUDE_FILE_NAMES = new Set([
  '.gitignore', 'package.json', 'package-lock.json', 'server.js', 'prueba.html',
]);
const EXCLUDE_FILE_SUFFIXES = ['-check.png', '-shot.png', '-shot2.png', '-gate.html', '_prueba-recorte.png'];
const EXCLUDE_FILE_PREFIXES = ['_canario'];

function debeExcluirDir(name, isTopLevel) {
  if (EXCLUDE_DIR_NAMES.has(name)) return true;
  if (EXCLUDE_DIR_PREFIXES.some((p) => name.startsWith(p))) return true;
  if (isTopLevel && EXCLUDE_TOPLEVEL_DIRS.has(name)) return true;
  return false;
}

function debeExcluirArchivo(name) {
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot) : '';
  if (EXCLUDE_FILE_EXTS.has(ext)) return true;
  if (EXCLUDE_FILE_NAMES.has(name)) return true;
  if (EXCLUDE_FILE_SUFFIXES.some((s) => name.endsWith(s))) return true;
  if (EXCLUDE_FILE_PREFIXES.some((p) => name.startsWith(p))) return true;
  return false;
}

function copiarDir(src, dest, isTopLevel) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    // No seguir symlinks: evita ciclos y fugas de contenido fuera del árbol
    // del valle (el único symlink conocido hoy vive dentro de un .venv ya
    // excluido — esto es defensa en profundidad, no una regla ad-hoc).
    if (entry.isSymbolicLink()) continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      if (debeExcluirDir(entry.name, isTopLevel)) continue;
      copiarDir(s, d, false);
    } else if (entry.isFile()) {
      if (debeExcluirArchivo(entry.name)) continue;
      copyFileSync(s, d);
    }
  }
}

function main() {
  if (!existsSync(SRC)) {
    console.log(`[sync-valle] ${SRC} no existe en esta máquina — se conserva public/valle/ ya commiteado (no-op).`);
    return;
  }
  console.log(`[sync-valle] sincronizando ${SRC} -> ${DEST}`);
  rmSync(DEST, { recursive: true, force: true });
  copiarDir(SRC, DEST, true);
  console.log('[sync-valle] listo.');
}

main();
