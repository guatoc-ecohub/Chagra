/**
 * AprenderConAgente.test.jsx — tests unitarios e integración del módulo Aprende.
 *
 * Cubre:
 *   1. Card de entrada renderiza correctamente
 *   2. El componente principal muestra lecciones
 *   3. Clic en una lección navega a esa lección
 *   4. Flujo avanzar/retroceder entre bloques
 *   5. Botón "Volver" regresa al listado
 *   6. useInsightProactivo retorna el insight correcto por entity_slug
 *   7. useInsightProactivo retorna null cuando no hay cultivo en el texto
 *   8. useInsightProactivo no repite insights ya vistos
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import AprenderConAgente, { AprenderEntryCard } from './AprenderConAgente.jsx';
import { detectarSlugEnTexto, elegirInsight } from '../../hooks/useInsightProactivo.js';
import todasLasCards from '../../data/agro-insight-cards.json';
import lecciones from '../../data/agro-lecciones.json';

// --- Card de entrada ---

describe('AprenderEntryCard', () => {
  it('renderiza el botón de entrada con el texto correcto', () => {
    const mockNav = vi.fn();
    render(<AprenderEntryCard onNavigate={mockNav} />);

    const card = screen.getByTestId('aprende-entry-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Aprende con el agente');
  });

  it('llama onNavigate("aprende") al hacer clic', () => {
    const mockNav = vi.fn();
    render(<AprenderEntryCard onNavigate={mockNav} />);

    fireEvent.click(screen.getByTestId('aprende-entry-card'));
    expect(mockNav).toHaveBeenCalledWith('aprende');
  });
});

// --- Componente principal: listado de lecciones ---

describe('AprenderConAgente — listado', () => {
  it('renderiza el contenedor principal', () => {
    render(<AprenderConAgente />);
    expect(screen.getByTestId('aprende-con-agente')).toBeInTheDocument();
  });

  it('muestra la lección de suelo', () => {
    render(<AprenderConAgente />);
    expect(screen.getByTestId('leccion-card-suelo')).toBeInTheDocument();
  });

  it('muestra todas las lecciones esperadas', () => {
    render(<AprenderConAgente />);
    const slugsEsperados = ['suelo', 'asociaciones', 'biopreparados', 'mip', 'fenologia'];
    for (const slug of slugsEsperados) {
      expect(screen.getByTestId(`leccion-card-${slug}`)).toBeInTheDocument();
    }
  });
});

// --- Flujo de navegación ---

describe('AprenderConAgente — flujo lección', () => {
  it('clic en suelo abre la vista de lección', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));
    expect(screen.getByTestId('leccion-view')).toBeInTheDocument();
  });

  it('el primer bloque se muestra al entrar a la lección', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));
    expect(screen.getByTestId('bloque-actual')).toBeInTheDocument();
  });

  it('el botón Anterior está deshabilitado en el primer bloque', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));
    const btnAnterior = screen.getByRole('button', { name: /anterior/i });
    expect(btnAnterior).toBeDisabled();
  });

  it('avanzar al siguiente bloque activa el botón Anterior', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));

    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(btnSiguiente);

    const btnAnterior = screen.getByRole('button', { name: /anterior/i });
    expect(btnAnterior).not.toBeDisabled();
  });

  it('retroceder vuelve al primer bloque (Anterior deshabilitado de nuevo)', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));

    // Avanzar
    const btnSiguiente = screen.getByRole('button', { name: /siguiente/i });
    fireEvent.click(btnSiguiente);
    // Retroceder
    const btnAnterior = screen.getByRole('button', { name: /anterior/i });
    fireEvent.click(btnAnterior);

    // Debe estar deshabilitado de nuevo
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
  });

  it('el botón Volver en la lección regresa al listado', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));

    const btnVolver = screen.getByRole('button', { name: /volver al menú de lecciones/i });
    fireEvent.click(btnVolver);

    expect(screen.getByTestId('aprende-con-agente')).toBeInTheDocument();
  });

  it('el último bloque muestra el botón "Ver datos verificados"', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-mip'));

    // Avanzar hasta el último bloque (mip tiene 5 bloques, índices 0-4)
    let intentos = 0;
    while (!screen.queryByRole('button', { name: /ver datos verificados/i }) && intentos < 10) {
      const btnSig = screen.queryByRole('button', { name: /siguiente/i });
      if (!btnSig) break;
      fireEvent.click(btnSig);
      intentos++;
    }

    expect(screen.getByRole('button', { name: /ver datos verificados/i })).toBeInTheDocument();
  });

  it('entrar a insights muestra las cards de la lección', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-mip'));

    // Avanzar hasta el botón de insights
    let intentos = 0;
    while (!screen.queryByRole('button', { name: /ver datos verificados/i }) && intentos < 10) {
      const btnSig = screen.queryByRole('button', { name: /siguiente/i });
      if (!btnSig) break;
      fireEvent.click(btnSig);
      intentos++;
    }

    fireEvent.click(screen.getByRole('button', { name: /ver datos verificados/i }));

    expect(screen.getByTestId('insights-view')).toBeInTheDocument();
  });
});

// --- useInsightProactivo (funciones puras) ---

describe('detectarSlugEnTexto', () => {
  it('detecta café', () => {
    expect(detectarSlugEnTexto('¿qué hay con el café?')).toBe('cafe');
  });

  it('detecta papa', () => {
    expect(detectarSlugEnTexto('Mi papa tiene gota')).toBe('papa');
  });

  it('detecta maíz', () => {
    expect(detectarSlugEnTexto('El maíz tiene cogollero')).toBe('maiz');
  });

  it('detecta frijol (con tilde)', () => {
    expect(detectarSlugEnTexto('El fríjol no dio nada')).toBe('frijol');
  });

  it('retorna null cuando no hay cultivo conocido', () => {
    expect(detectarSlugEnTexto('¿Cómo está el clima?')).toBeNull();
  });

  it('retorna null para texto vacío', () => {
    expect(detectarSlugEnTexto('')).toBeNull();
  });

  it('retorna null para valor no string', () => {
    expect(detectarSlugEnTexto(null)).toBeNull();
    expect(detectarSlugEnTexto(undefined)).toBeNull();
  });
});

describe('elegirInsight', () => {
  it('retorna un insight de café cuando el slug es "cafe"', () => {
    const resultado = elegirInsight('cafe', []);
    expect(resultado).not.toBeNull();
    expect(resultado.entity_slug).toBe('cafe');
  });

  it('retorna null cuando todos los insights del slug ya fueron vistos', () => {
    const idsCafe = todasLasCards
      .filter((c) => c.entity_slug === 'cafe')
      .map((c) => c.id);
    const resultado = elegirInsight('cafe', idsCafe);
    expect(resultado).toBeNull();
  });

  it('no retorna un insight ya visto', () => {
    const primerInsight = elegirInsight('cafe', []);
    expect(primerInsight).not.toBeNull();
    const segundo = elegirInsight('cafe', [primerInsight.id]);
    // Si solo hay un insight de café, el segundo es null; si hay más, es diferente
    if (segundo !== null) {
      expect(segundo.id).not.toBe(primerInsight.id);
    }
  });

  it('retorna null para slug inexistente', () => {
    expect(elegirInsight('mango', [])).toBeNull();
  });

  it('prefiere insights colombianos (non_co=false) sobre internacionales', () => {
    // Para café hay tanto Co como non_co
    const resultado = elegirInsight('cafe', []);
    if (resultado) {
      // El primero debe ser colombiano si existe alguno colombiano
      const hayCo = todasLasCards.some((c) => c.entity_slug === 'cafe' && !c.non_co);
      if (hayCo) {
        expect(resultado.non_co).toBe(false);
      }
    }
  });
});

// --- Aprender → Agente: botón "Pregúntale al agente" (cableado) ---

describe('AprenderConAgente — Pregúntale al agente (Aprender → Agente)', () => {
  it('cada lección tiene una pregunta_agente no vacía', () => {
    for (const leccion of lecciones) {
      expect(typeof leccion.pregunta_agente).toBe('string');
      expect(leccion.pregunta_agente.trim().length).toBeGreaterThan(8);
    }
  });

  it('muestra el botón "Pregúntale al agente" dentro de una lección', () => {
    render(<AprenderConAgente onAskAgent={vi.fn()} />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));
    expect(screen.getAllByTestId('preguntale-al-agente').length).toBeGreaterThan(0);
  });

  it('clic en el botón llama onAskAgent con la pregunta de la lección', () => {
    const onAskAgent = vi.fn();
    render(<AprenderConAgente onAskAgent={onAskAgent} />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));

    const leccionSuelo = lecciones.find((l) => l.slug === 'suelo');
    fireEvent.click(screen.getAllByTestId('preguntale-al-agente')[0]);

    expect(onAskAgent).toHaveBeenCalledTimes(1);
    expect(onAskAgent).toHaveBeenCalledWith(leccionSuelo.pregunta_agente);
  });

  it('NO muestra el botón si no se pasa onAskAgent (degrada limpio)', () => {
    render(<AprenderConAgente />);
    fireEvent.click(screen.getByTestId('leccion-card-suelo'));
    expect(screen.queryByTestId('preguntale-al-agente')).toBeNull();
  });
});
