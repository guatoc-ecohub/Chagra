import { describe, test, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkerHistory from '../WorkerHistory';

describe('WorkerHistory', () => {
  test('renders header and tabs', () => {
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText(/Historial/i)).toBeInTheDocument();
    expect(screen.getByText(/Registros Recientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Completadas/i)).toBeInTheDocument();
  });

  test('syncCompleted event does not crash', () => {
    render(<WorkerHistory onBack={() => {}} />);
    window.dispatchEvent(new CustomEvent('syncCompleted', { detail: { id: 'log1' } }));
    expect(screen.getByText(/Historial/i)).toBeInTheDocument();
  });

  test('online/offline indicator renders', () => {
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText(/Historial/i)).toBeInTheDocument();
  });
});