/**
 * AbejaAngelita.render.test.jsx — los 5 frentes de "Angelita completa" cableados
 * en el DIBUJO (rubber-hose pleno). Verifica que las capacidades ADITIVAS del
 * componente canónico se rendericen sin romper el contrato viejo:
 *   1. Expresividad — line-boil (contorno que hierve) + puff de polen.
 *   2. Lip-sync — el visema viaja a la cara (data-visema + boca de goma).
 *   3. Modo poder — el aura dorada de 4 capas (wrapper .is-powered-up).
 *   4. Ruana de noche (BUG muerto) — de noche ruana, JAMÁS sudor.
 *   5. Prop por mundo — la herramienta en la manita al entrar.
 * Más la ANTI-REGRESIÓN de tamaño (billboardBase ≥ 48).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { AbejaAngelita } from '../AbejaAngelita.jsx';
import { ABEJA_PRESENCIA } from '../abejaIdentidad.js';

afterEach(cleanup);

describe('AbejaAngelita — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<AbejaAngelita />);
    const svg = container.querySelector('svg[data-creature="abeja-angelita"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-polen')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.crt-polen')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });
});

describe('1. Expresividad — line-boil + polen', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<AbejaAngelita lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<AbejaAngelita animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('polen dibuja las motas ámbar', () => {
    const { container } = render(<AbejaAngelita polen animated />);
    expect(container.querySelector('svg').getAttribute('data-polen')).toBe('1');
    expect(container.querySelectorAll('.crt-polen-mota').length).toBeGreaterThan(2);
  });
});

describe('2. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta se dibuja y el data-visema viaja', () => {
    const { container } = render(<AbejaAngelita visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa de siempre)', () => {
    const { container } = render(<AbejaAngelita />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes ascendentes', () => {
    const { container } = render(<AbejaAngelita poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('abeja-angelita');
    // aura dorada de Angelita cableada en la variable CSS
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<AbejaAngelita />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    // el nodo raíz es el svg (no un wrapper): existe y es el primer hijo
    expect(container.querySelector(':scope > svg[data-creature="abeja-angelita"]')).toBeTruthy();
  });
});

describe('4. Ruana de noche — el BUG muerto', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor', () => {
    const { container } = render(<AbejaAngelita vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    expect(svg.getAttribute('data-sudor')).toBeNull();
    expect(svg.getAttribute('data-sombrero')).toBeNull();
  });

  it('de día soleado sin frío → NORMAL (sin ruana)', () => {
    const { container } = render(<AbejaAngelita vestuario clima="soleado" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<AbejaAngelita clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBeNull();
    expect(svg.getAttribute('data-sudor')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la mano', () => {
  it('mundoId=agua → carga la manguerita', () => {
    const { container } = render(<AbejaAngelita mundoId="agua" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('agua');
    expect(container.querySelector('[data-prop="manguera"]')).toBeTruthy();
  });

  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<AbejaAngelita mundoId="suelo" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → manos libres (no rompe)', () => {
    const { container } = render(<AbejaAngelita mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    // el svg sigue existiendo, digno
    expect(container.querySelector('svg[data-creature="abeja-angelita"]')).toBeTruthy();
  });
});

describe('Anti-regresión — Angelita NUNCA pequeñita', () => {
  it('billboardBase se mantiene en 48 o más (presencia en 3D)', () => {
    expect(ABEJA_PRESENCIA.billboardBase).toBeGreaterThanOrEqual(48);
  });
});
