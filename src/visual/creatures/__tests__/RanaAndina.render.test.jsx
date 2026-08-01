/**
 * RanaAndina.render.test.jsx — los 5 frentes de "Rana completa" cableados en el
 * DIBUJO (rubber-hose ZEN, al nivel de Angelita), verificando que las capas
 * ADITIVAS del componente canónico se rendericen sin romper el contrato viejo:
 *   1. Expresividad ZEN — garganta que late + salto ocasional + line-boil.
 *   2. Lip-sync — el visema viaja a la BOCOTA (data-visema + boca de goma).
 *   3. Modo poder VERDE — aura verde de 4 capas (wrapper .is-powered-up).
 *   4. Ropa por clima — ruana de noche y JAMÁS sudor (rana del páramo).
 *   5. Prop por mundo — la herramienta en la manito al entrar.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { RanaAndina } from '../RanaAndina.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('RanaAndina — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas opt-in', () => {
    const { container } = render(<RanaAndina tier="medio" />);
    const svg = container.querySelector('svg[data-creature="rana-andina"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toBe('Rana arlequín andina');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(svg.getAttribute('data-visema')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector('[data-accesorios-clima]')).toBeNull();
  });
});

describe('1. Expresividad ZEN — garganta + salto + line-boil', () => {
  it('viva: late la garganta y hay salto ocasional (no arrebatos de abeja)', () => {
    const { container } = render(<RanaAndina tier="medio" animated />);
    expect(container.querySelector('.crt-garganta')).toBeTruthy();
    expect(container.querySelector('.rana-salto')).toBeTruthy();
    // La rana NO hereda los arrebatos hiperactivos de la abeja.
    expect(container.querySelector('.rh-antic')).toBeNull();
    expect(container.querySelector('.rh-travieso')).toBeNull();
  });

  it('quieta (animated=false): sin cadencia continua (fotograma digno)', () => {
    const { container } = render(<RanaAndina tier="medio" animated={false} />);
    expect(container.querySelector('.crt-garganta')).toBeNull();
    expect(container.querySelector('.rana-salto')).toBeNull();
    expect(container.querySelector('.rh-boil')).toBeNull();
  });

  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<RanaAndina tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<RanaAndina tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega a la BOCOTA', () => {
  it('con visema V3 la boca abierta se dibuja y el data-visema viaja', () => {
    const { container } = render(<RanaAndina tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa de siempre)', () => {
    const { container } = render(<RanaAndina tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder VERDE — aura de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes ascendentes VERDES', () => {
    const { container } = render(<RanaAndina tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('rana-andina');
    // aura VERDE de la rana cableada en la variable CSS (verde, no dorado/rojo).
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('rana-andina'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('el color de aura de la rana es VERDE (su firma, no la dorada por defecto)', () => {
    expect(auraDeBicho('rana-andina')).toBe('#39d98a');
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<RanaAndina tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="rana-andina"]')).toBeTruthy();
  });
});

describe('4. Ropa por clima — ruana de noche, JAMÁS sudor', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor (bug muerto)', () => {
    const { container } = render(<RanaAndina tier="medio" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    expect(svg.getAttribute('data-sudor')).toBeNull();
    expect(svg.getAttribute('data-sombrero')).toBeNull();
    expect(container.querySelector('[data-accesorios-clima]')).toBeTruthy();
  });

  it('de páramo: al sol de día SIN °C real no suda (perfil sudaAlSol:false)', () => {
    const { container } = render(<RanaAndina tier="medio" vestuario clima="soleado" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-sudor')).toBeNull();
    expect(svg.getAttribute('data-sombrero')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<RanaAndina tier="medio" clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBeNull();
    expect(container.querySelector('[data-accesorios-clima]')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la manito', () => {
  it('mundoId=agua → carga la manguerita', () => {
    const { container } = render(<RanaAndina tier="medio" mundoId="agua" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('agua');
    expect(container.querySelector('[data-prop="manguera"]')).toBeTruthy();
  });

  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<RanaAndina tier="medio" mundoId="suelo" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → manos libres (no rompe)', () => {
    const { container } = render(<RanaAndina tier="medio" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="rana-andina"]')).toBeTruthy();
  });
});
