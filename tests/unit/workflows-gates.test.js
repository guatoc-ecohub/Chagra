/**
 * Guardas de proceso para los gates de CI — C1 y C2a de la auditoría de
 * proceso de gates rojos (2026-09-03).
 *
 * C1 — un job INFORMATIVO no debe ensuciar el semáforo agregado del PR:
 * `continue-on-error` a nivel de JOB evita que el workflow run falle, pero
 * el check-run del PR IGUAL reporta "failure". El patrón válido es a nivel
 * de STEP (así el job concluye "success"). Queda prohibido declararlo a
 * nivel de job en .github/workflows.
 *
 * C2a — los gates ABSOLUTOS (no dependen del ref base del evento: baseline
 * tsc commiteado, presupuesto de bundle, auditoría de integraciones) corren
 * también en push a dev, donde entran commits directos sin ningún gate.
 *
 * unit-tests.yml queda fuera de C2a A PROPÓSITO: en eventos push su detector
 * cae a origin/main (GITHUB_BASE_REF no existe en push) y el diff
 * origin/main...HEAD de dev seleccionaría ~345 tests, incluido
 * aiService.test.js (CI-flaky documentado en el header del workflow) → el
 * gate nacería rojo en cada push a dev, justo el ruido que C1 apaga. Ver el
 * comentario en el propio workflow.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const WORKFLOWS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '.github',
  'workflows'
);
const workflowFiles = readdirSync(WORKFLOWS_DIR).filter((f) => f.endsWith('.yml'));

const loadWorkflow = (file) =>
  yaml.load(readFileSync(join(WORKFLOWS_DIR, file), 'utf8'));

// js-yaml (schema YAML 1.1) parsea la clave `on:` sin comillas como el
// booleano `true`. Se aceptan las tres formas.
const triggersOf = (wf) => wf.on ?? wf[true] ?? wf['on'];

describe('C1: continue-on-error solo a nivel de step', () => {
  it('ningún workflow declara continue-on-error a nivel de job', () => {
    const offenders = [];
    for (const file of workflowFiles) {
      const wf = loadWorkflow(file);
      for (const [jobId, job] of Object.entries(wf.jobs ?? {})) {
        if (job && Object.prototype.hasOwnProperty.call(job, 'continue-on-error')) {
          offenders.push(`${file}#${jobId}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('playwright.yml: e2e-full es informativo vía continue-on-error en el step de ejecución', () => {
    const steps = loadWorkflow('playwright.yml').jobs['e2e-full'].steps;
    const runStep = steps.find((s) => s.name === 'Run full Playwright suite');
    expect(runStep).toBeDefined();
    expect(runStep['continue-on-error']).toBe(true);
    // El reporte de Playwright se conserva aunque el spec informativo falle.
    const upload = steps.find((s) => (s.name ?? '').startsWith('Upload Playwright report'));
    expect(upload).toBeDefined();
    expect(upload.if).toContain('!cancelled()');
  });

  it('visual-regression.yml: la comparación visual continúa en PR y aborta en workflow_dispatch', () => {
    const step = loadWorkflow('visual-regression.yml')
      .jobs.visual.steps
      .find((s) => s.name === 'Run visual comparison');
    expect(step['continue-on-error']).toBe(
      "${{ github.event_name == 'pull_request' }}"
    );
  });
});

describe('C2a: gates absolutos corren en push a dev', () => {
  const gatesAbsolutos = [
    ['tsc-gate.yml', 'baseline tsc commiteado'],
    ['perf-budget.yml', 'presupuesto de bundle'],
    ['integraciones-audit.yml', 'audita src/ + allowlist commiteada'],
  ];

  for (const [file, motivo] of gatesAbsolutos) {
    it(`${file} corre en push a dev (${motivo})`, () => {
      expect(triggersOf(loadWorkflow(file)).push.branches).toContain('dev');
    });
  }

  it('integraciones-audit.yml también escucha PRs contra dev', () => {
    const triggers = triggersOf(loadWorkflow('integraciones-audit.yml'));
    expect(triggers['pull_request'].branches).toContain('dev');
  });

  it('unit-tests.yml sigue SIN push a dev (escalado: el detector cae a origin/main en push)', () => {
    const triggers = triggersOf(loadWorkflow('unit-tests.yml'));
    expect(triggers.push.branches).not.toContain('dev');
    // El flujo de PRs a dev sí queda cubierto (ya existía).
    expect(triggers['pull_request'].branches).toContain('dev');
  });

  it('los deploys quedan intactos: deploy.yml no corre en push a dev', () => {
    // Regla de la contramedida: NO tocar deploys. dev-deploy.yml YA corre en
    // push a dev por diseño propio; la guarda cubre el deploy de producción.
    expect(triggersOf(loadWorkflow('deploy.yml')).push.branches).not.toContain('dev');
  });
});
