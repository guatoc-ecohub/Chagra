/**
 * useRecorridoVoz — pegamento del recorrido por voz.
 * Enruta transcripciones a cámara / resumen / observación y cierra el loop de
 * cámara con el reconocimiento de especie.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// aiService trae dependencias pesadas (sidecar, telemetría): lo mockeamos.
vi.mock('../../services/aiService', () => ({
  recognizeSpeciesGrounded: vi.fn(),
}));

import { useRecorridoVoz } from '../useRecorridoVoz';
import useRecorridoStore from '../../store/useRecorridoStore';

const POTRERO = {
  id: 'potrero',
  type: 'asset--land',
  attributes: {
    name: 'Potrero de abajo',
    land_type: 'field',
    intrinsic_geometry: {
      value: 'POLYGON((-73.925 4.529, -73.925 4.531, -73.923 4.531, -73.923 4.529, -73.925 4.529))',
    },
  },
};
const gpsDentro = () => vi.fn().mockResolvedValue({ lat: 4.530, lng: -73.924, accuracy: 6 });

beforeEach(() => {
  useRecorridoStore.getState().reset();
  useRecorridoStore.getState().iniciarRecorrido();
});

describe('procesarTranscripcion', () => {
  it('enruta "mira esta mata" a la cámara (señal + callback)', async () => {
    const onCameraRequested = vi.fn();
    const { result } = renderHook(() => useRecorridoVoz({ onCameraRequested }));
    /** @type {any} */
    let out;
    await act(async () => { out = await result.current.procesarTranscripcion('mira esta mata'); });
    expect(out.accion).toBe('camara');
    expect(onCameraRequested).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCamera).toMatchObject({ sujeto: 'planta', frase: 'mira esta mata' });
  });

  it('enruta "cómo quedó el recorrido" al resumen hablado', async () => {
    const speak = vi.fn().mockResolvedValue(true);
    const onResumen = vi.fn();
    const { result } = renderHook(() => useRecorridoVoz({ onResumen, resumenOpts: { speak } }));
    /** @type {any} */
    let out;
    await act(async () => { out = await result.current.procesarTranscripcion('cómo quedó el recorrido'); });
    expect(out.accion).toBe('resumen');
    expect(speak).toHaveBeenCalledTimes(1);
    expect(onResumen).toHaveBeenCalledWith(out.texto);
  });

  it('enruta narración normal a observación (GPS + lote)', async () => {
    const registroOpts = { lotes: [POTRERO], getPosition: gpsDentro(), now: 10 };
    const onObservacion = vi.fn();
    const { result } = renderHook(() => useRecorridoVoz({ registroOpts, onObservacion }));
    /** @type {any} */
    let out;
    await act(async () => {
      out = await result.current.procesarTranscripcion('aquí sembré 20 tomates');
    });
    expect(out.accion).toBe('observacion');
    expect(out.observacion.loteId).toBe('potrero');
    expect(onObservacion).toHaveBeenCalledTimes(1);
    expect(useRecorridoStore.getState().observaciones).toHaveLength(1);
  });

  it('ignora transcripción vacía', async () => {
    const { result } = renderHook(() => useRecorridoVoz({}));
    /** @type {any} */
    let out;
    await act(async () => { out = await result.current.procesarTranscripcion('   '); });
    expect(out.accion).toBe('ignorado');
  });
});

describe('capturarEspecie', () => {
  it('reconoce la especie, registra observación planta_foto y limpia la señal', async () => {
    const recognizer = vi.fn().mockResolvedValue({
      scientific_name: 'Musa paradisiaca',
      common_name: 'plátano',
    });
    const registroOpts = { lotes: [POTRERO], getPosition: gpsDentro(), now: 20 };
    const { result } = renderHook(() => useRecorridoVoz({ recognizer, registroOpts }));

    // Primero dispara la cámara para tener pendingCamera con la frase.
    await act(async () => { await result.current.procesarTranscripcion('mira esta mata'); });

    /** @type {any} */
    let out;
    await act(async () => { out = await result.current.capturarEspecie(new Blob(['x'])); });

    expect(recognizer).toHaveBeenCalledTimes(1);
    expect(out.especie.common_name).toBe('plátano');
    expect(out.observacion.tipo).toBe('planta_foto');
    expect(out.observacion.especie.scientific_name).toBe('Musa paradisiaca');
    expect(out.observacion.loteId).toBe('potrero');
    expect(result.current.pendingCamera).toBeNull();
    // Una sola observación (sin doble-apilado).
    expect(useRecorridoStore.getState().observaciones).toHaveLength(1);
  });

  it('si el reconocedor falla registra observación "sin identificar"', async () => {
    const recognizer = vi.fn().mockRejectedValue(new Error('vision down'));
    const registroOpts = { lotes: [POTRERO], getPosition: gpsDentro(), now: 30 };
    const { result } = renderHook(() => useRecorridoVoz({ recognizer, registroOpts }));
    /** @type {any} */
    let out;
    await act(async () => { out = await result.current.capturarEspecie(new Blob(['x'])); });
    expect(out.especie).toBeNull();
    expect(out.observacion.tipo).toBe('planta_foto');
    expect(out.observacion.texto).toMatch(/sin identificar/i);
  });
});
