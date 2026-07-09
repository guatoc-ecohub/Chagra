/**
 * stress/lib/sidecarAuth.mjs — resuelve el token del sidecar agro-mcp.
 * Espejo de `getSidecarToken` en scripts/lib/bench-sidecar.mjs (misma
 * convención: archivo local primero, env var como fallback). Vive
 * duplicado a propósito — stress/ es un set independiente, sin depender de
 * scripts/lib/ interno de benches para no acoplar ambos árboles.
 *
 * @module stress/lib/sidecarAuth
 */
import { readFileSync, existsSync } from 'node:fs';

/**
 * getSidecarToken — lee `~/.config/chagra-sidecar-token.txt` o
 * `SIDECAR_TOKEN` del entorno. Nunca lanza — devuelve '' si no hay token
 * (el sidecar en dev local puede correr sin auth).
 * @param {object} [env=process.env]
 * @returns {string}
 */
export function getSidecarToken(env = process.env) {
  const tokenPath = env.HOME ? `${env.HOME}/.config/chagra-sidecar-token.txt` : null;
  if (tokenPath && existsSync(tokenPath)) {
    try {
      return readFileSync(tokenPath, 'utf-8').trim();
    } catch {
      // sigue a env var
    }
  }
  return env.SIDECAR_TOKEN || '';
}
