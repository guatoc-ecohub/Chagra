import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.resolve(here, '../../App.jsx'), 'utf8');

const ROUTED_MOCKUPS = [
  ['cana-trapiche-3d', 'CanaTrapiche3DMockup', './mockups/CanaTrapiche3D'],
  ['condor-cielo-3d', 'CondorCielo3DMockup', './mockups/CondorCielo3D'],
  ['navegador-grafo', 'NavegadorGrafoDemoMockup', './mockups/NavegadorGrafoDemo'],
];

describe('mockups rescatados de huérfanos', () => {
  test.each(ROUTED_MOCKUPS)('%s tiene ruta, carga perezosa y handler', (slug, component, modulePath) => {
    const view = `mockup_${slug.replaceAll('-', '_')}`;

    expect(appSource).toContain(`'mockups/${slug}': '${view}'`);
    expect(appSource).toContain(`lazy(() => import('${modulePath}'))`);
    expect(appSource).toContain(`case '${view}':`);
    expect(appSource).toContain(`<${component} />`);
  });

  test('las envolturas reemplazadas viven fuera de la carpeta activa', () => {
    for (const file of ['BosqueVivo3D-legacy.jsx', 'CasaAdentro3D.jsx', 'SueloDemo3D-legacy.jsx']) {
      expect(fs.existsSync(path.resolve(here, '../_archivo', file))).toBe(true);
    }
  });
});
