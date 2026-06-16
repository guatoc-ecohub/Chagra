import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DemoModeBanner from '../DemoModeBanner';

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_DEMO_MODE', '');
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllEnvs();
});

describe('DemoModeBanner', () => {
  it('renders when VITE_DEMO_MODE is true', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByRole('region', { name: /selector de perfil demo/i })).toBeInTheDocument();
  });

  it('does not render when VITE_DEMO_MODE is not true and switch-active is not set', () => {
    const { container } = render(<DemoModeBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders when localStorage chagra:demo:switch-active is "1" without env var', () => {
    localStorage.setItem('chagra:demo:switch-active', '1');
    render(<DemoModeBanner />);
    expect(screen.getByRole('region', { name: /selector de perfil demo/i })).toBeInTheDocument();
  });

  it('shows "Demo" label', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByText('Demo')).toBeInTheDocument();
  });

  it('shows campesino label and emoji by default', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByText('Campesino')).toBeInTheDocument();
  });

  it('cycles forward through profiles with right arrow', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    const nextBtn = screen.getByLabelText('Perfil demo siguiente');
    fireEvent.click(nextBtn);
    expect(screen.getByText('Urbano (terraza)')).toBeInTheDocument();
  });

  it('cycles backward through profiles with left arrow', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    const prevBtn = screen.getByLabelText('Perfil demo anterior');
    fireEvent.click(prevBtn);
    expect(screen.getByText('Tecnico / agronomo')).toBeInTheDocument();
  });

  it('shows page counter', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByText('1 / 6')).toBeInTheDocument();
  });

  it('"Salir del demo" button clears localStorage demo keys', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ rol: 'campesino' }));
    localStorage.setItem('chagra:demo:switch-active', '1');
    render(<DemoModeBanner />);
    const exitBtn = screen.getByLabelText('Salir del modo demo');
    fireEvent.click(exitBtn);
    expect(localStorage.getItem('chagra:profile:v1')).toBeNull();
    expect(localStorage.getItem('chagra:demo:switch-active')).toBeNull();
  });

  it('left arrow has aria-label', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByLabelText('Perfil demo anterior')).toBeInTheDocument();
  });

  it('right arrow has aria-label', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByLabelText('Perfil demo siguiente')).toBeInTheDocument();
  });

  it('exit button has aria-label', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render(<DemoModeBanner />);
    expect(screen.getByLabelText('Salir del modo demo')).toBeInTheDocument();
  });

  it('clicking right arrow applies profile to localStorage', () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    localStorage.setItem('chagra:demo:switch-active', '1');
    render(<DemoModeBanner />);
    const nextBtn = screen.getByLabelText('Perfil demo siguiente');
    fireEvent.click(nextBtn);
    const raw = localStorage.getItem('chagra:profile:v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.vocacion).toBe('urbano');
  });
});
