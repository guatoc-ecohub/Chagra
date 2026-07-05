/**
 * CursoChagra.test.jsx — curso auto-guiado "Aprende a usar Chagra".
 *
 * Cubre:
 *   1. Listado: los 5 módulos + barra de progreso.
 *   2. Abrir un módulo muestra su detalle (videos / lecciones / pruébalo).
 *   3. "Pruébalo en tu finca" hace deep-link (onNavigate con el view real).
 *   4. Una lección hace onNavigate('aprende', { leccion: slug }).
 *   5. "Marcar como visto" persiste el progreso en localStorage.
 *   6. CursoEntryCard navega a 'curso'.
 *   7. Coherencia de datos: slugs de lección existen; views de prueba no vacías.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';

// ScreenShell trae dependencias de tema/notificaciones que no aportan a la
// lógica del curso; se mockea a un contenedor mínimo que respeta onBack.
vi.mock('../common/ScreenShell', () => ({
  ScreenShell: ({ title, children, onBack }) => (
    <div data-testid="screen-shell">
      <span>{title}</span>
      {onBack && (
        <button type="button" onClick={onBack}>
          volver-shell
        </button>
      )}
      {children}
    </div>
  ),
}));

import CursoChagra, { CursoEntryCard } from './CursoChagra.jsx';
import {
  CURSO_MODULOS,
  CURSO_TOTAL,
  CURSO_PROGRESO_KEY,
  leerProgresoCurso,
} from '../../data/cursoChagra.js';
import lecciones from '../../data/agro-lecciones.json';

beforeEach(() => {
  try {
    globalThis.localStorage?.clear();
  } catch {
    /* jsdom siempre trae localStorage */
  }
});

describe('cursoChagra data', () => {
  it('tiene 5 módulos con la progresión esperada', () => {
    expect(CURSO_TOTAL).toBe(5);
    expect(CURSO_MODULOS.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5']);
  });

  it('todos los slugs de lección existen en agro-lecciones.json', () => {
    const slugsValidos = new Set(lecciones.map((l) => l.slug));
    for (const m of CURSO_MODULOS) {
      for (const slug of m.lecciones) {
        expect(slugsValidos.has(slug), `slug desconocido: ${slug}`).toBe(true);
      }
    }
  });

  it('cada módulo tiene al menos algo para probar, con view no vacío', () => {
    for (const m of CURSO_MODULOS) {
      expect(m.pruebas.length).toBeGreaterThan(0);
      for (const p of m.pruebas) {
        expect(typeof p.view).toBe('string');
        expect(p.view.length).toBeGreaterThan(0);
      }
    }
  });

  it('los videos apuntan a /manual/*.html', () => {
    for (const m of CURSO_MODULOS) {
      for (const v of m.videos) {
        expect(v.src).toMatch(/^\/manual\/mv-.+\.html$/);
      }
    }
  });
});

describe('CursoChagra — listado', () => {
  it('muestra los 5 módulos y el progreso inicial 0 de 5', () => {
    render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('curso-chagra')).toBeInTheDocument();
    for (const m of CURSO_MODULOS) {
      expect(screen.getByTestId(`curso-modulo-${m.id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('curso-progreso')).toHaveTextContent(`0 de ${CURSO_TOTAL}`);
  });
});

describe('CursoChagra — detalle de módulo', () => {
  it('abre el módulo 1 y muestra sus videos y pruébalo', () => {
    render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('curso-modulo-m1'));

    const detalle = screen.getByTestId('curso-modulo-detalle');
    expect(detalle).toBeInTheDocument();
    // Módulo 1 tiene 2 videos.
    expect(screen.getAllByTestId('video-manual')).toHaveLength(2);
    // Y sus deep-links de "pruébalo".
    expect(screen.getByTestId('curso-prueba-sembrar')).toBeInTheDocument();
    expect(screen.getByTestId('curso-prueba-voz')).toBeInTheDocument();
  });

  it('deep-link "Pruébalo": onNavigate con el view real', () => {
    const onNavigate = vi.fn();
    render(<CursoChagra onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('curso-modulo-m1'));
    fireEvent.click(screen.getByTestId('curso-prueba-sembrar'));
    expect(onNavigate).toHaveBeenCalledWith('sembrar', undefined);
  });

  it('una lección hace onNavigate("aprende", { leccion })', () => {
    const onNavigate = vi.fn();
    render(<CursoChagra onBack={vi.fn()} onNavigate={onNavigate} />);
    // Módulo 2 trae la lección "suelo".
    fireEvent.click(screen.getByTestId('curso-modulo-m2'));
    fireEvent.click(screen.getByTestId('curso-leccion-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('aprende', { leccion: 'suelo' });
  });

  it('un video se reproduce (monta el iframe) al tocar reproducir', () => {
    render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('curso-modulo-m4')); // milpa: 1 video
    const video = screen.getByTestId('video-manual');
    fireEvent.click(within(video).getByTestId('video-manual-play'));
    const iframe = within(video).getByTitle(/Video:/);
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe.getAttribute('src')).toMatch(/mv-milpa\.html$/);
  });

  it('"Marcar como visto" persiste el progreso en localStorage', () => {
    const { unmount } = render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByTestId('curso-modulo-m1'));
    fireEvent.click(screen.getByTestId('curso-marcar-modulo'));

    // Persistido.
    expect(leerProgresoCurso().has('m1')).toBe(true);
    const raw = globalThis.localStorage.getItem(CURSO_PROGRESO_KEY);
    expect(JSON.parse(raw)).toContain('m1');

    // Al re-montar, el progreso se restaura (1 de 5).
    unmount();
    render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} />);
    expect(screen.getByTestId('curso-progreso')).toHaveTextContent(`1 de ${CURSO_TOTAL}`);
  });

  it('initialModulo abre directo ese módulo (deep-link)', () => {
    render(<CursoChagra onBack={vi.fn()} onNavigate={vi.fn()} initialModulo="m3" />);
    const detalle = screen.getByTestId('curso-modulo-detalle');
    expect(detalle).toHaveTextContent('Cuida sin veneno');
  });
});

describe('CursoEntryCard', () => {
  it('navega a "curso" al hacer clic', () => {
    const onNavigate = vi.fn();
    render(<CursoEntryCard onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('curso-entry-card'));
    expect(onNavigate).toHaveBeenCalledWith('curso');
  });
});
