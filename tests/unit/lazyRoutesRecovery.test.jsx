import React, { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lazy } from '../../src/components/common/lazyWithRecovery.jsx';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const appSource = fs.readFileSync(path.resolve(dirname, '../../src/App.jsx'), 'utf8');

describe('recuperación de rutas perezosas', () => {
  it('un import rechazado muestra una salida legible, incluida la forma que usa Sierra', async () => {
    const SierraSinChunk = lazy(() => Promise.reject(new Error('chunk ausente')));

    render(
      <Suspense fallback={<p>Cargando</p>}>
        <SierraSinChunk />
      </Suspense>
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/No se pudo abrir esta pantalla/i);
    expect(screen.getByText(/datos de la finca siguen guardados/i)).toBeInTheDocument();
  });

  it('enumera desde App todas las declaraciones lazy y las cubre con el cargador recuperable', () => {
    const declaraciones = [...appSource.matchAll(/^const\s+(\w+)\s*=\s*lazy\(\(\)\s*=>\s*import\(/gm)];

    expect(declaraciones.length).toBeGreaterThan(40);
    expect(appSource).toContain("import { lazy } from './components/common/lazyWithRecovery';");
    expect(declaraciones.some(([, nombre]) => nombre === 'SierraGlobalMockup')).toBe(true);
  });
});
