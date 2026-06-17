import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..');

function runScript(script, env = {}) {
  return spawnSync('node', [join(ROOT_DIR, script)], {
    cwd: ROOT_DIR,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
}

describe('bench skip guards', () => {
  it('vision pipeline salta limpio sin token', () => {
    const r = runScript('scripts/bench-vision-pipeline.mjs', { CHAGRA_MCP_TOKEN: '' });
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain('SKIP: falta CHAGRA_MCP_TOKEN');
  });

  it('vision ab rag salta limpio sin ground truth', () => {
    const r = runScript('scripts/bench-vision-ab-rag.mjs', {
      VISION_GROUND_TRUTH_PATH: '/no/such/ground-truth.json',
    });
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain('SKIP: no existe ground truth');
  });

  it('borde y complejos saltan limpio si falta la fixture de prompts', () => {
    const r1 = runScript('scripts/bench-borde-alucinacion.mjs', {
      PROMPTS_FILE: '/no/such/file.json',
    });
    expect(r1.status).toBe(0);
    expect(`${r1.stdout}${r1.stderr}`).toContain('SKIP: falta fixture de prompts');

    const r2 = runScript('scripts/bench-complejos-juez-independiente.mjs', {
      PROMPTS_FILE: '/no/such/file.json',
    });
    expect(r2.status).toBe(0);
    expect(`${r2.stdout}${r2.stderr}`).toContain('SKIP: no existe fixture de prompts');
  });
});
