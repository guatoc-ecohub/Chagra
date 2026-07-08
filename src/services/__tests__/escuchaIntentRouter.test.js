/**
 * Tests del router puro de escucha manos libres (navegación vs agente).
 * Los dos caminos que pidió el operador: (a) comando de navegación →
 * redirigir; (b) pregunta/pedido → agente (Whisper → agente → Kokoro).
 */
import { describe, it, expect } from 'vitest';
import { routeUtterance, normalizarHabla, listarDestinos } from '../escuchaIntentRouter.js';

describe('normalizarHabla', () => {
  it('quita tildes, signos y colapsa espacios', () => {
    expect(normalizarHabla('¿Lléveme  al MAPA, por favor?')).toBe('lleveme al mapa por favor');
  });
  it('tolera null/undefined', () => {
    expect(normalizarHabla(null)).toBe('');
    expect(normalizarHabla(undefined)).toBe('');
  });
});

describe('routeUtterance — camino (a): comandos de navegación', () => {
  const casos = [
    ['Lléveme a suelo', 'suelo'],
    ['llevame a suelo', 'suelo'],
    ['abrir mercado', 'mercado'],
    ['Abra el mercado', 'mercado'],
    ['muéstrame el mapa', 'mapa'],
    ['Muéstreme la bitácora', 'historial'],
    ['vamos al calendario', 'calendario_finca'],
    ['ir a la bodega', 'bodega'],
    ['quiero ver el clima', 'clima_boletin'],
    ['abre biopreparados', 'biopreparados'],
    ['lléveme a las gallinas', 'animales_gallinas'],
    ['entrar a mi perfil', 'perfil'],
    ['vamos a sembrar', 'sembrar'],
    ['abrir mercados campesinos', 'mercados'],
    ['muestre la salud del suelo', 'salud_suelo'],
    ['ve a inicio', 'dashboard'],
    ['abrir la ayuda', 'ayuda'],
  ];
  it.each(casos)('"%s" → navegar:%s', (frase, view) => {
    expect(routeUtterance(frase)).toMatchObject({
      tipo: 'navegar',
      view,
      etiqueta: expect.any(String),
    });
  });

  it('frase corta que ES el destino ("el mercado") también navega', () => {
    expect(routeUtterance('el mercado')).toMatchObject({ tipo: 'navegar', view: 'mercado' });
    expect(routeUtterance('mapa')).toMatchObject({ tipo: 'navegar', view: 'mapa' });
    expect(routeUtterance('a la bodega')).toMatchObject({ tipo: 'navegar', view: 'bodega' });
  });
});

describe('routeUtterance — camino (b): preguntas y pedidos → agente', () => {
  const casos = [
    '¿Cuánta agua necesita el café?',
    'qué siembro este mes',
    'cómo está el suelo de mi finca',        // menciona "suelo" pero es pregunta
    'cuándo cosecho la papa',
    'por qué se me amarillan las hojas del tomate',
    'me recomienda un biopreparado para la gota',
    'el mercado está caro y no sé si vender ya',  // larga, no es comando
    'dónde consigo semilla de arracacha certificada',
    'ayúdeme con una plaga en las gallinas',
  ];
  it.each(casos)('"%s" → agente', (frase) => {
    expect(routeUtterance(frase)).toMatchObject({ tipo: 'agente', prompt: frase.trim() });
  });

  it('pregunta gana aunque haya verbo de navegación', () => {
    // "muéstrame cómo hacer compost" = pedido de explicación, no navegación
    expect(routeUtterance('muéstrame cómo hacer compost').tipo).toBe('agente');
  });

  it('texto vacío o basura cae al agente sin explotar', () => {
    expect(routeUtterance('').tipo).toBe('agente');
    expect(routeUtterance('   ').tipo).toBe('agente');
    expect(routeUtterance(null).tipo).toBe('agente');
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
