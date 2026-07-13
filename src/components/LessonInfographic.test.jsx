/**
 * LessonInfographic.test.jsx — render del infográfico por lección (PoC del
 * hueco de UX del audit triple: "cero gráficos; los módulos son un muro de
 * texto"). Verifica que los pasos, la numeración accesible, la meta y la
 * fuente se pinten, y que el componente degrade limpio sin datos.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import LessonInfographic from './LessonInfographic.jsx';

const PASOS = [
  { emoji: '🌱', titulo: 'Germinación', detalle: 'La semilla despierta.' },
  { emoji: '🌿', titulo: 'Crecimiento', detalle: 'Forma tallo y hojas.' },
  { emoji: '🧺', titulo: 'Cosecha', detalle: 'Recoja en el punto justo.' },
];

const PROPS = {
  titulo: 'El ritmo del cultivo, paso a paso',
  subtitulo: 'Mírela de un vistazo.',
  icono: '🗓️',
  pasos: PASOS,
  resultado: { emoji: '👀', titulo: 'El truco', texto: 'Vigile por evento.' },
  fuente: 'Agrosavia / BBCH / CIP',
};

describe('LessonInfographic', () => {
  it('renderiza el contenedor con aria-label descriptivo', () => {
    render(<LessonInfographic {...PROPS} />);
    const section = screen.getByTestId('lesson-infographic');
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute('aria-label', expect.stringContaining('El ritmo del cultivo'));
  });

  it('pinta el título y el subtítulo', () => {
    render(<LessonInfographic {...PROPS} />);
    expect(screen.getByText('El ritmo del cultivo, paso a paso')).toBeInTheDocument();
    expect(screen.getByText('Mírela de un vistazo.')).toBeInTheDocument();
  });

  it('renderiza un paso por cada elemento con su título y detalle', () => {
    render(<LessonInfographic {...PROPS} />);
    const pasos = screen.getAllByTestId('lesson-infographic-paso');
    expect(pasos).toHaveLength(PASOS.length);
    expect(screen.getByText('Germinación')).toBeInTheDocument();
    expect(screen.getByText('La semilla despierta.')).toBeInTheDocument();
    expect(screen.getByText('Cosecha')).toBeInTheDocument();
  });

  it('numera cada paso de forma accesible (role img + aria-label "Paso N")', () => {
    render(<LessonInfographic {...PROPS} />);
    expect(screen.getByRole('img', { name: 'Paso 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Paso 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Paso ${PASOS.length}` })).toBeInTheDocument();
  });

  it('muestra la meta/desenlace y su texto', () => {
    render(<LessonInfographic {...PROPS} />);
    expect(screen.getByTestId('lesson-infographic-resultado')).toBeInTheDocument();
    expect(screen.getByText('El truco')).toBeInTheDocument();
    expect(screen.getByText('Vigile por evento.')).toBeInTheDocument();
  });

  it('muestra la fuente para conservar trazabilidad', () => {
    render(<LessonInfographic {...PROPS} />);
    expect(screen.getByText(/Agrosavia \/ BBCH \/ CIP/)).toBeInTheDocument();
  });

  it('renderiza la píldora de resaltado cuando un paso la trae', () => {
    render(
      <LessonInfographic
        titulo="Con resaltado"
        pasos={[{ titulo: 'Fermentar', detalle: 'Espere.', resaltado: '~15 días' }]}
      />
    );
    expect(screen.getByText('~15 días')).toBeInTheDocument();
  });

  it('degrada limpio (retorna null) sin pasos', () => {
    const { container } = render(<LessonInfographic titulo="Vacío" pasos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('degrada limpio (retorna null) sin título', () => {
    // @ts-expect-error test intentionally omits titulo to check graceful degradation
    const { container } = render(<LessonInfographic pasos={PASOS} />);
    expect(container.firstChild).toBeNull();
  });
});
