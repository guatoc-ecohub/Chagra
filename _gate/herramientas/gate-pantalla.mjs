import { execFileSync } from 'node:child_process';

const env = { ...process.env, DISPLAY: process.env.DISPLAY || ':0' };

function consultarPantalla() {
  try {
    const salida = execFileSync('xset', ['q'], {
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    if (!/Monitor is/i.test(salida)) return null;
    return !/Monitor is Off/i.test(salida);
  } catch {
    return null;
  }
}

function pgrepChromium() {
  try {
    return Number(execFileSync('pgrep', ['-c', 'chromium'], { encoding: 'utf8' }).trim());
  } catch {
    return 0;
  }
}

export async function exigirPantallaViva({ medirFps = true } = {}) {
  let estado = consultarPantalla();
  if (estado === true) return true;
  if (estado === null) {
    const mensaje = '[gate-pantalla] NO PUDE CONSULTAR el estado de la pantalla.';
    if (medirFps) {
      console.error(`${mensaje} No sé si el FPS sería válido.`);
      process.exit(5);
    }
    console.warn(`${mensaje} La captura puede continuar, pero no se medirá FPS.`);
    return false;
  }

  try { execFileSync('xset', ['dpms', 'force', 'on'], { env, stdio: 'ignore' }); } catch { /* se verifica abajo */ }
  await new Promise((resolve) => setTimeout(resolve, 2000));
  estado = consultarPantalla();
  if (estado === true) return true;
  const mensaje = '[gate-pantalla] La pantalla sigue dormida; no hay medición válida.';
  if (medirFps) {
    console.error(mensaje);
    process.exit(4);
  }
  console.warn(`${mensaje} La captura puede continuar.`);
  return false;
}

export async function esperarMaquinaSola({ maxEspera = 120000, umbral = 0 } = {}) {
  let cuenta = pgrepChromium();
  if (cuenta <= umbral) return true;
  console.warn(`[gate-pantalla] Hay ${cuenta} chromium antes de capturar; espero ${Math.round(maxEspera / 1000)}s.`);
  const inicio = Date.now();
  while (Date.now() - inicio < maxEspera) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    cuenta = pgrepChromium();
    if (cuenta <= umbral) return true;
  }
  console.warn(`[gate-pantalla] Siguen ${cuenta} chromium; la medición queda contaminada por carga ajena.`);
  return false;
}
