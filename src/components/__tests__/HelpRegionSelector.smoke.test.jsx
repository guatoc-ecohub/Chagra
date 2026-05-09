import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpRegionSelector from '../HelpRegionSelector';

describe('HelpRegionSelector', () => {
  test('renders collapsed by default', () => {
    render(<HelpRegionSelector />);
    expect(screen.getByText('Tono regional IA')).toBeInTheDocument();
  });

  test('expands on click', async () => {
    const user = userEvent.setup();
    render(<HelpRegionSelector />);
    await user.click(screen.getByRole('button', { name: /tono regional/i }));
    expect(screen.getByText('Región')).toBeInTheDocument();
    expect(screen.getByText('Intensidad')).toBeInTheDocument();
  });

  test('shows intensity buttons', async () => {
    const user = userEvent.setup();
    render(<HelpRegionSelector />);
    await user.click(screen.getByRole('button', { name: /tono regional/i }));
    expect(screen.getByRole('button', { name: 'Off' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sutil' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Full' })).toBeInTheDocument();
  });

  test('shows amazonica apropiacion note when selected', async () => {
    const user = userEvent.setup();
    render(<HelpRegionSelector />);
    await user.click(screen.getByRole('button', { name: /tono regional/i }));
    await user.selectOptions(screen.getByRole('combobox'), 'amazonica');
    expect(screen.getByText(/voces propias muy diversas/i)).toBeInTheDocument();
  });
});