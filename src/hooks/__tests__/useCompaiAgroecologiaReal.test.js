/**
 * useCompaiAgroecologiaReal — el compAI comenta CON el catálogo real de SU
 * cultivo (#80/#81).
 *
 * Contratos que cuidamos:
 *   - sin inventario real (finca vacía), no llama al catálogo — nada nuevo
 *     que decir.
 *   - con cultivo real que resuelve en el catálogo y trae un dato
 *     agroecológico usable, dispara entrarMundo('mis_matas', …) con `agro`.
 *   - sin match en el catálogo (resolveSpecies → null), no dispara nada
 *     (anti-fabricación: el husmeo normal de inventario sigue solo).
 *   - no le quita el turno a un husmeo/aviso ya en curso (mismo contrato que
 *     useCompaiClimaVivo/useCompaiSusurroNocturno).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../services/speciesResolver', () => ({ resolveSpecies: vi.fn() }));
vi.mock('../../services/compaiOcupado.js', () => ({ estaOcupado: () => false }));

import { useCompaiAgroecologiaReal } from '../useCompaiAgroecologiaReal';
import { resolveSpecies } from '../../services/speciesResolver';
import useAssetStore from '../../store/useAssetStore';
import useAngelitaStore from '../../store/useAngelitaStore';

function sembrarPlanta(nombre) {
  useAssetStore.setState({
    plants: [{ attributes: { name: nombre, status: 'active' } }],
    equipment: [],
  });
}

describe('useCompaiAgroecologiaReal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // rand alto: nunca cae bajo PROBABILIDAD_PREGUNTA del modo aprendiz
    // (#110) — este test cubre el comentario declarativo, no la pregunta.
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    useAssetStore.setState({ plants: [], equipment: [] });
    useAngelitaStore.setState({
      estado: 'calma',
      mensaje: null,
      ultimaHablaPorLlave: {},
      ultimoLogroId: null,
      ultimoLutoId: null,
      silenciado: false,
      molestia: 0,
    });
  });

  it('sin inventario real, no llama al catálogo', async () => {
    renderHook(() => useCompaiAgroecologiaReal({}));
    await waitFor(() => expect(resolveSpecies).not.toHaveBeenCalled());
  });

  it('con match real y dato agroecológico usable, husmea mis_matas con `agro`', async () => {
    sembrarPlanta('Fríjol');
    vi.mocked(resolveSpecies).mockResolvedValue({
      species: { id: 'phaseolus_vulgaris', roles_in_guild: ['crop', 'nitrogen_fixer'] },
      slug: 'phaseolus_vulgaris',
      match: 'exact',
      confidence: 1,
    });
    const onMensaje = vi.fn();
    renderHook(() => useCompaiAgroecologiaReal({ onMensaje }));

    await waitFor(() => expect(resolveSpecies).toHaveBeenCalledWith('Fríjol'));
    await waitFor(() => expect(useAngelitaStore.getState().estado).toBe('husmea'));
    expect(useAngelitaStore.getState().mensaje).toMatch(/nitrógeno/i);
    expect(onMensaje).toHaveBeenCalled();
  });

  it('sin match en el catálogo, no dispara nada (anti-fabricación)', async () => {
    sembrarPlanta('Planta rarísima que no existe');
    vi.mocked(resolveSpecies).mockResolvedValue(null);
    const onMensaje = vi.fn();
    renderHook(() => useCompaiAgroecologiaReal({ onMensaje }));

    await waitFor(() => expect(resolveSpecies).toHaveBeenCalled());
    expect(useAngelitaStore.getState().estado).toBe('calma');
    expect(onMensaje).not.toHaveBeenCalled();
  });

  it('no le quita el turno a un husmeo ya en curso', async () => {
    sembrarPlanta('Fríjol');
    useAngelitaStore.setState({ estado: 'aviso' });
    vi.mocked(resolveSpecies).mockResolvedValue({
      species: { roles_in_guild: ['nitrogen_fixer'] },
      slug: 'phaseolus_vulgaris',
      match: 'exact',
      confidence: 1,
    });
    renderHook(() => useCompaiAgroecologiaReal({}));

    // Da tiempo a que, si fuera a llamar, ya lo hubiera hecho.
    await new Promise((r) => setTimeout(r, 50));
    expect(resolveSpecies).not.toHaveBeenCalled();
  });

  it('activo=false no hace nada', async () => {
    sembrarPlanta('Fríjol');
    renderHook(() => useCompaiAgroecologiaReal({ activo: false }));
    await new Promise((r) => setTimeout(r, 50));
    expect(resolveSpecies).not.toHaveBeenCalled();
  });
});
