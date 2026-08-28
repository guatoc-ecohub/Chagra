import { describe, expect, it } from 'vitest';
import appSource from '../App.jsx?raw';
import prodSource from '../prodApp/ProdChagraApp.jsx?raw';

const appEscuchaLine = appSource
  .split('\n')
  .find((line) => line.includes('<EscuchaOverlay />'));

describe('EscuchaOverlay: cobertura de shells', () => {
  it('se monta en mockups y conserva el gate de vistas pre-auth en App', () => {
    expect(appEscuchaLine).toBeDefined();
    expect(appEscuchaLine).toMatch(/currentView !== 'loading'/);
    expect(appEscuchaLine).toMatch(/currentView !== 'login'/);
    expect(appEscuchaLine).toMatch(/currentView !== 'oauth-callback'/);
    expect(appEscuchaLine).not.toContain("!currentView.startsWith('mockup_')");
  });

  it('se monta en el shell prod, que cubre sus vistas 2D y 3D', () => {
    expect(prodSource).toMatch(
      /const EscuchaOverlay = lazy\(\(\) => import\('\.\.\/components\/escucha\/EscuchaOverlay\.jsx'\)\);/,
    );
    expect(prodSource).toMatch(/<EscuchaOverlay \/>/);
  });
});
