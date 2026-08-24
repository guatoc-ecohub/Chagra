import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const clientId = process.env.SEEDINGLOG_TEST_FARMOS_CLIENT_ID || '';

vi.mock('../../src/config/env.js', () => ({
  ENV: { FARMOS_CLIENT_ID: process.env.SEEDINGLOG_TEST_FARMOS_CLIENT_ID || '' },
}));

vi.mock('../../src/db/catalogDB.js', () => ({
  getAllSpecies: vi.fn().mockResolvedValue([]),
}));

import SeedingLog from '../../src/components/SeedingLog.jsx';

describe('PR #2931 SeedingLog smoke', () => {
  it(`monta la rama ${clientId ? 'farmOS' : 'sin farmOS'} sin ReferenceError`, async () => {
    if (clientId) {
      expect(() => render(<SeedingLog onBack={() => {}} onSave={() => {}} />)).not.toThrow();
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Sembrar' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Guardar Registro' })).toBeInTheDocument();
      });
      return;
    }

    expect(() => render(<SeedingLog onBack={() => {}} />)).not.toThrow();
    expect(screen.getByRole('heading', { name: 'Configuración de siembra no disponible' })).toBeInTheDocument();
  });
});
