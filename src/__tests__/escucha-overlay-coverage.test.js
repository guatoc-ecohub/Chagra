import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.resolve(here, '../App.jsx'), 'utf8');
const prodAppSource = fs.readFileSync(
  path.resolve(here, '../prodApp/ProdChagraApp.jsx'),
  'utf8',
);

describe('cobertura global de EscuchaOverlay', () => {
  it('App monta escucha también en mockups, excepto durante vistas pre-auth', () => {
    expect(appSource).toContain(
      "{currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && <EscuchaOverlay />}",
    );
    expect(appSource).not.toContain(
      "{currentView !== 'loading' && currentView !== 'login' && currentView !== 'oauth-callback' && !currentView.startsWith('mockup_') && <EscuchaOverlay />}",
    );
  });

  it('ProdChagraApp importa y monta escucha en su shell 3D-first', () => {
    expect(prodAppSource).toContain(
      "const EscuchaOverlay = lazy(() => import('../components/escucha/EscuchaOverlay'));",
    );
    expect(prodAppSource).toContain('<EscuchaOverlay />');
  });
});
