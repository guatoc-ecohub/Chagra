/**
 * LOS MUNDOS DE MI FINCA — contrato de ALCANZABILIDAD (reestructuración 2.0).
 *
 * La reestructuración quitó del home F2 las tiles sueltas (consultar/aprender,
 * inventario, mercado, seguimiento). Este test CONGELA el contrato de que nada
 * quedó huérfano:
 *   1. Toda función que el home F2 exponía sigue alcanzable vía mundos.
 *   2. Toda vista referida por el manifiesto EXISTE en el router real
 *      (case '<view>' en App.jsx, o la familia seguimiento_*).
 *   3. La pantalla de mundo re-rutea de verdad (click → onNavigate) y su
 *      fallback sin id muestra el índice, nunca una pantalla rota.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import { MUNDOS_FINCA, mundosViews, getMundo } from '../mundosFinca';
import MundosDeMiFinca from '../MundosDeMiFinca';
import MundoScreen from '../../MundoScreen';
import MundoVineta from '../MundoVinetas';

afterEach(() => cleanup());

const __dir = path.dirname(fileURLToPath(import.meta.url));
const appSrc = fs.readFileSync(path.resolve(__dir, '../../../App.jsx'), 'utf8');

describe('Mundos — el mapa cubre todo lo que el home F2 exponía (sin huérfanos)', () => {
  // Las vistas que ANTES eran tiles/tarjetas sueltas del home F2 y ahora deben
  // vivir dentro de un mundo. Si alguien quita una entrada del manifiesto sin
  // reubicarla, este test truena.
  const VIEWS_QUE_NO_PUEDEN_QUEDAR_HUERFANAS = [
    // Consultar y aprender (ex bloque 4)
    'directorio', 'calendario_finca', 'casos', 'ciclo_nutrientes', 'estiercol',
    'biopreparados', 'suelo', 'agua', 'salud_suelo', 'toxicologia', 'informes',
    // Inventario/plantas y animales (ex bloque 2)
    'activos', 'mapa', 'reportar_invasora', 'asociaciones', 'biodiversidad', 'animales',
    // Mercado (ex bloque 5)
    'mercado', 'fermentos',
    // Seguimiento de procesos (ex tarjetas condicionales)
    'seguimiento_reforestacion', 'seguimiento_silvopastoreo', 'seguimiento_paramo', 'seguimiento_cerdos',
  ];

  test('toda vista del home viejo sigue alcanzable vía mundos', () => {
    const views = new Set(mundosViews());
    for (const v of VIEWS_QUE_NO_PUEDEN_QUEDAR_HUERFANAS) {
      expect(views.has(v), `vista huérfana: ${v} no está en ningún mundo`).toBe(true);
    }
  });

  test('toda vista del manifiesto existe en el router real (App.jsx)', () => {
    for (const v of mundosViews()) {
      const enRouter = appSrc.includes(`case '${v}':`)
        // La familia seguimiento_<key> se resuelve por parseSeguimientoView.
        || (/^seguimiento_/.test(v) && appSrc.includes('parseSeguimientoView'));
      expect(enRouter, `la vista '${v}' del manifiesto no existe en App.jsx`).toBe(true);
    }
    // Y la propia ruta de mundo existe.
    expect(appSrc).toContain("case 'mundo':");
  });

  test('el manifiesto es sano: ids únicos, tinte, y directo XOR entradas', () => {
    const ids = MUNDOS_FINCA.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MUNDOS_FINCA) {
      expect(Array.isArray(m.tinte) && m.tinte.length === 2, `tinte de ${m.id}`).toBe(true);
      const tieneDirecto = !!m.directo;
      const tieneEntradas = (m.entradas || []).length > 0;
      expect(tieneDirecto !== tieneEntradas, `${m.id} debe ser directo O tener entradas`).toBe(true);
    }
  });

  // Regresión: TODO mundo debe tener su ilustración (viñeta). El mundo 'café'
  // se había quedado sin registrar en MundoVinetas → su tarjeta salía con el
  // hueco vacío. Este test congela que ningún mundo quede sin dibujo.
  test('cada mundo tiene su viñeta ilustrada (ninguna tarjeta queda vacía)', () => {
    for (const m of MUNDOS_FINCA) {
      const { container } = render(<MundoVineta mundoId={m.id} />);
      expect(container.querySelector('svg'), `el mundo '${m.id}' no tiene viñeta`).not.toBeNull();
      cleanup();
    }
  });
});

describe('MundosDeMiFinca — grilla del home', () => {
  test('el gate de Animales por perfil oculta SOLO ese mundo', () => {
    render(<MundosDeMiFinca onNavigate={vi.fn()} mostrarAnimales={false} />);
    expect(screen.queryByTestId('mundo-animales')).toBeNull();
    expect(screen.getByTestId('mundo-cultivos')).toBeInTheDocument();
    expect(screen.getByTestId('mundo-sanidad')).toBeInTheDocument();
  });

  test('el sello vivo de Cultivos usa el conteo real de matas', () => {
    render(<MundosDeMiFinca onNavigate={vi.fn()} plantsCount={7} />);
    expect(screen.getByTestId('mundo-cultivos')).toHaveTextContent('7 matas sembradas');
  });
});

describe('MundoScreen — el mundo por dentro re-rutea a las vistas reales', () => {
  test('cada entrada navega a su vista (con su data)', () => {
    const onNavigate = vi.fn();
    render(<MundoScreen mundoId="sanidad" onBack={vi.fn()} onNavigate={onNavigate} />);
    const mundo = getMundo('sanidad');
    for (const e of mundo.entradas) {
      fireEvent.click(screen.getByTestId(`entrada-${e.view}`));
      expect(onNavigate).toHaveBeenCalledWith(e.view, e.data);
    }
    // Biopreparados conserva su back al dashboard (fix del onBack huérfano).
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
  });

  test('el agente queda siempre presente en el pie del mundo, con contexto', () => {
    const onNavigate = vi.fn();
    render(<MundoScreen mundoId="suelo" onBack={vi.fn()} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('mundo-agente'));
    // Ahora arranca el prompt sembrado con el tema del mundo (editable en el input).
    expect(onNavigate).toHaveBeenCalledWith(
      'agente',
      expect.objectContaining({ prefilledPrompt: expect.stringContaining('suelo vivo') }),
    );
  });

  test('sin id (recarga/enlace viejo) muestra el índice de mundos, no un error', () => {
    const onNavigate = vi.fn();
    render(<MundoScreen mundoId={undefined} onBack={vi.fn()} onNavigate={onNavigate} />);
    const indice = screen.getByTestId('mundo-indice');
    // Todos los mundos listados y navegables.
    const botones = within(indice).getAllByRole('button');
    expect(botones.length).toBe(MUNDOS_FINCA.length);
    fireEvent.click(within(indice).getByRole('button', { name: /El suelo vivo/ }));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'suelo' });
    // Nota: el título del mundo agua es "El agua"; existe además el mundo
    // "El aguacate", que comparte prefijo. Selecciono por el título exacto
    // (getByText exacto no confunde "El agua" con "El aguacate").
    fireEvent.click(within(indice).getByText('El agua').closest('button'));
    expect(onNavigate).toHaveBeenCalledWith('agua', undefined);
  });
});
