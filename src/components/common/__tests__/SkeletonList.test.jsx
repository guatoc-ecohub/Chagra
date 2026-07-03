/**
 * SkeletonList.test.jsx — skeletons con la forma del contenido.
 *
 * Contrato: UN solo role="status" en el contenedor (hijos aria-hidden,
 * no anunciar N veces "cargando"), fondo oscuro, shimmer motion-safe.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import SkeletonList from '../SkeletonList';

describe('SkeletonList', () => {
  test('renderiza N placeholders con un solo role="status"', () => {
    const { container } = render(<SkeletonList count={5} />);
    const wrapper = screen.getByTestId('skeleton-list');
    expect(wrapper).toHaveAttribute('role', 'status');
    expect(wrapper).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBe(5);
  });

  test('hijos ocultos a lectores de pantalla (aria-hidden)', () => {
    const { container } = render(<SkeletonList count={3} />);
    const children = screen.getByTestId('skeleton-list').children;
    expect(children.length).toBe(3);
    for (const child of children) {
      expect(child).toHaveAttribute('aria-hidden', 'true');
    }
    expect(container).toBeTruthy();
  });

  test('aria-label descriptivo en tono usted', () => {
    render(<SkeletonList />);
    expect(screen.getByTestId('skeleton-list')).toHaveAttribute(
      'aria-label',
      'Cargando sus registros…'
    );
  });

  test('shimmer usa motion-safe (respeta prefers-reduced-motion)', () => {
    const { container } = render(<SkeletonList count={1} />);
    expect(container.innerHTML).toMatch(/motion-safe:animate-pulse/);
  });

  test('variante card imita la silueta de las cards de activos (fondo oscuro)', () => {
    const { container } = render(<SkeletonList count={2} variant="card" />);
    expect(container.innerHTML).toMatch(/bg-slate-800/);
    expect(container.innerHTML).not.toMatch(/bg-white|bg-gray-/);
  });

  test('variante row renderiza fila liviana con círculo', () => {
    const { container } = render(<SkeletonList count={2} variant="row" />);
    expect(container.innerHTML).toMatch(/rounded-full/);
  });

  test('count mínimo 1 aunque pasen 0', () => {
    render(<SkeletonList count={0} />);
    expect(screen.getByTestId('skeleton-list').children.length).toBe(1);
  });
});
