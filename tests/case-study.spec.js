import { test, expect } from '@playwright/test';

/**
 * case-study.spec.js — CaseStudyScreen, contenido pedagógico.
 *
 * Componente:  src/components/CaseStudyScreen.jsx
 * Services:    caseStudyDemoLoader.js, caseStudyLessonsSummarizer.js,
 *              caseStudyTreatmentRecommender.js, caseStudyVoiceExtractor.js
 *
 * Los case studies son casos reales que el agente usa para enseñar (e.g.
 * cómo un agricultor trata broca con biopreparados). Multi-finca aplica
 * acá (useCaseStudyStore, PR #18).
 */

const ORIGIN = 'http://localhost:5173';

test.describe.skip('CaseStudyScreen — flujo (skipped — requiere login + datos)', () => {
  test('CaseStudyScreen renderiza lista de casos', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/case-studies`);
    const text = await page.locator('body').innerText();
    expect(text.toLowerCase()).toMatch(/caso|estudio|case stud/);
  });

  test('demo loader trae casos de ejemplo si no hay propios del usuario', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/case-studies`);
    const hasDemos = await page.evaluate(async () => {
      const mod = await import('/src/services/caseStudyDemoLoader.js');
      const list = typeof mod.loadDemoCases === 'function' ? await mod.loadDemoCases() : null;
      return Array.isArray(list) ? list.length : 0;
    });
    expect(hasDemos).toBeGreaterThan(0);
  });

  test('treatment recommender devuelve sugerencias coherentes', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/case-studies`);
    const sugg = await page.evaluate(async () => {
      const mod = await import('/src/services/caseStudyTreatmentRecommender.js');
      if (typeof mod.recommendTreatment === 'function') {
        return mod.recommendTreatment({ pest: 'broca', crop: 'cafe' });
      }
      return null;
    });
    expect(sugg).toBeTruthy();
  });

  test('voice extractor parsea transcripts en español colombiano', async ({ page }) => {
    await page.goto(`${ORIGIN}/#/case-studies`);
    const result = await page.evaluate(async () => {
      const mod = await import('/src/services/caseStudyVoiceExtractor.js');
      if (typeof mod.extractFromTranscript === 'function') {
        return mod.extractFromTranscript('le metí ajo y ají al café para la broca');
      }
      return null;
    });
    expect(result).toBeTruthy();
  });
});

test.describe('CaseStudy — multi-finca scoping (smoke)', () => {
  test('useCaseStudyStore expone fincaId scope (PR #18)', async ({ page }) => {
    await page.goto(ORIGIN);
    await page.waitForLoadState('networkidle');
    const hasStore = await page.evaluate(async () => {
      try {
        const mod = await import('/src/store/useCaseStudyStore.js');
        return typeof mod.useCaseStudyStore === 'function';
      } catch {
        return false;
      }
    });
    expect(hasStore).toBe(true);
  });
});
