/**
 * Tests del router puro de escucha manos libres.
 * Cubre navegación, preguntas al agente, ayuda, registro por voz y
 * variantes tolerantes a la wake-word en transcripciones de Whisper.
 */
import { describe, it, expect } from 'vitest';
import {
  routeUtterance,
  normalizarHabla,
  listarDestinos,
  extraerTextoDespuesWakeWord,
} from '../escuchaIntentRouter.js';

describe('normalizarHabla', () => {
  it('quita tildes, signos y colapsa espacios', () => {
    expect(normalizarHabla('¿Lléveme  al MAPA, por favor?')).toBe('lleveme al mapa por favor');
  });

  it('tolera null/undefined', () => {
    expect(normalizarHabla(null)).toBe('');
    expect(normalizarHabla(undefined)).toBe('');
  });
});

describe('extraerTextoDespuesWakeWord', () => {
  it('detecta hola chagra con mayusculas, sin h y con muletillas', () => {
    expect(extraerTextoDespuesWakeWord('HOLA chagra')).toEqual({
      tieneWakeWord: true,
      texto: '',
    });
    expect(extraerTextoDespuesWakeWord('ola chagra')).toEqual({
      tieneWakeWord: true,
      texto: '',
    });
    expect(extraerTextoDespuesWakeWord('este... hola chagra pues como esta el cafe')).toEqual({
      tieneWakeWord: true,
      texto: 'como esta el cafe',
    });
  });

  it('ignora textos que no empiezan con la wake-word', () => {
    expect(extraerTextoDespuesWakeWord('como va mi finca')).toEqual({
      tieneWakeWord: false,
      texto: 'como va mi finca',
    });
  });
});

describe('routeUtterance', () => {
  const casos = [
    { frase: 'lleveme a las gallinas', esperado: { tipo: 'navegar', view: 'animales_gallinas' } },
    { frase: 'abrame el cafe', esperado: { tipo: 'navegar', view: 'cafe' } },
    { frase: 'quiero ver el suelo', esperado: { tipo: 'navegar', view: 'suelo' } },
    { frase: 'muestreme el mercado', esperado: { tipo: 'navegar', view: 'mercado' } },
    { frase: 'lleveme al mundo del cafe', esperado: { tipo: 'navegar', view: 'valle3d', mundo: 'cafe' } },
    { frase: 'muestreme el mundo del agua', esperado: { tipo: 'navegar', view: 'valle3d', mundo: 'agua' } },
    { frase: 'muestreme el agua', esperado: { tipo: 'navegar', view: 'valle3d', mundo: 'agua' } },
    { frase: 'hola chagra lleveme al mundo del suelo', esperado: { tipo: 'navegar', view: 'valle3d', mundo: 'suelo' } },
    { frase: '¿por qué se amarilla el tomate?', esperado: { tipo: 'agente' } },
    { frase: '¿por qué se amarilla el café?', esperado: { tipo: 'agente' } },
    { frase: '¿por qué se amarilla el plátano?', esperado: { tipo: 'agente' } },
    { frase: '¿por qué se amarilla la papa?', esperado: { tipo: 'agente' } },
    { frase: '¿qué sabes hacer?', esperado: { tipo: 'agente' } },
    { frase: 'ayuda', esperado: { tipo: 'navegar', view: 'ayuda' } },
    { frase: '¿cómo registro una siembra?', esperado: { tipo: 'agente' } },
    { frase: 'anota que sembre 20 tomates', esperado: { tipo: 'navegar', view: 'sembrar' } },
    { frase: 'apunta que coseche 3 arrobas de papa', esperado: { tipo: 'navegar', view: 'cosechar' } },
    { frase: 'HOLA chagra', esperado: { tipo: 'agente', prompt: 'HOLA chagra' } },
    { frase: 'ola chagra', esperado: { tipo: 'agente', prompt: 'ola chagra' } },
    {
      frase: 'este... hola chagra pues como esta el cafe',
      esperado: { tipo: 'agente', prompt: 'como esta el cafe' },
    },
    { frase: '', esperado: { tipo: 'agente', prompt: '' } },
    { frase: 'hola chagra', esperado: { tipo: 'agente', prompt: 'hola chagra' } },
    { frase: '¿por qué se amarilla?', esperado: { tipo: 'agente' } },
    { frase: 'como va mi finca', esperado: { tipo: 'agente' } },
  ];

  it.each(casos)('$frase', ({ frase, esperado }) => {
    const r = routeUtterance(frase);
    expect(r.tipo).toBe(esperado.tipo);
    if (esperado.tipo === 'navegar') {
      expect(r).toMatchObject({
        tipo: 'navegar',
        view: esperado.view,
        etiqueta: expect.any(String),
      });
      if (esperado.mundo) {
        expect(r.initialData).toEqual({ mundo: esperado.mundo });
      }
    } else {
      expect(r).toMatchObject({ tipo: 'agente' });
      if (r.tipo === 'agente' && 'prompt' in esperado) {
        expect(r.prompt).toBe(esperado.prompt);
      }
    }
  });

  it('frase de ayuda corta sigue navegando a la vista de ayuda', () => {
    expect(routeUtterance('manual')).toMatchObject({ tipo: 'navegar', view: 'ayuda' });
  });
});

describe('listarDestinos', () => {
  it('expone view + etiqueta para cada destino', () => {
    const destinos = listarDestinos();
    expect(destinos.length).toBeGreaterThan(10);
    for (const d of destinos) {
      expect(typeof d.view).toBe('string');
      expect(typeof d.etiqueta).toBe('string');
    }
  });
});
