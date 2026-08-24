#!/usr/bin/env node
/* global URL, console, process */

/**
 * Cron entry point. A failed critical URL check stops the refresh and leaves
 * the alert in the service journal instead of replacing a source URL.
 */
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const verifier = fileURLToPath(new URL('./verificar-urls.mjs', import.meta.url));
const refreshScript = process.env.DR_CLIMA_REFRESH_SCRIPT
  ?? `${os.homedir()}/.local/bin/dr-clima-refresh.sh`;

export function run(command, args, options = {}) {
  return spawnSync(command, args, { stdio: 'inherit', env: process.env, ...options });
}

export function main() {
  const check = run(process.execPath, [verifier]);
  if (check.error || check.status !== 0) {
    console.error(
      `[dr-clima-refresh] ALERTA: hay una fuente crítica de clima muerta; `
      + `se omite el refresco para no inventar URLs. Revisión: ${verifier}`,
    );
    return 1;
  }

  const refresh = run(refreshScript, []);
  if (refresh.error) {
    console.error(`[dr-clima-refresh] no se pudo ejecutar ${refreshScript}: ${refresh.error.message}`);
    return 1;
  }
  return refresh.status ?? 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exitCode = main();
}
