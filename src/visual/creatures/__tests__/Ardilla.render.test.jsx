/**
 * Ardilla.render.test.jsx — los 5 frentes de "Ardilla completa" (espejo de la
 * abeja y del oso, con el CARÁCTER pizpireta: ágil, curiosa, rápida e inquieta,
 * ÁMBAR en poder). Verifica que las capacidades ADITIVAS del componente canónico
 * se rendericen sin romper el contrato base:
 *   1. Expresividad ÁGIL — line-boil (contorno que hierve), INSPECCIÓN INVERTIDA
 *      (su firma: se cuelga de cabeza), roer (dientes + bellota) y la cola tupida.
 *   2. Lip-sync — el visema viaja a la cara (data-visema).
 *   3. Modo poder — el aura ÁMBAR de 4 capas (wrapper .is-powered-up, no dorada).
 *   4. Ropa por clima — de noche RUANA, y la ardilla NUNCA suda (contrato común).
 *   5. Prop por mundo — la herramienta en la patita al entrar.
 * Más la firma de identidad: la LÍNEA DORSAL siempre presente y su aura ámbar.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Ardilla } from '../Ardilla.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('Ardilla — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Ardilla tier="alto" />);
    const svg = container.querySelector('svg[data-creature="ardilla"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-inspecciona')).toBeNull();
    expect(svg.getAttribute('data-roe')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su LÍNEA DORSAL y su cola tupida (identidad de la especie)', () => {
    const { container } = render(<Ardilla tier="alto" />);
    // La línea dorsal oscura es parte de la identidad (no opt-in).
    expect(container.querySelector('.ardilla-dorsal')).toBeTruthy();
    // La cola tupida está siempre (viva anima; aquí solo que exista).
    expect(container.querySelector('.ardilla-cola')).toBeTruthy();
  });
});

describe('1. Expresividad ÁGIL — line-boil, inspección invertida y roer', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Ardilla tier="alto" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Ardilla tier="alto" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('inspecciona (su FIRMA) marca el estado (se cuelga de cabeza)', () => {
    const { container } = render(<Ardilla tier="alto" inspecciona animated />);
    expect(container.querySelector('svg').getAttribute('data-inspecciona')).toBe('1');
  });

  it('roe marca el estado y saca la bellota que mordisquea', () => {
    const { container } = render(<Ardilla tier="alto" roe animated />);
    expect(container.querySelector('svg').getAttribute('data-roe')).toBe('1');
    expect(container.querySelector('.ardilla-bellota')).toBeTruthy();
    // los dientes de roedor están para castañetear
    expect(container.querySelector('.ardilla-dientes')).toBeTruthy();
  });

  it('sin roe no hay bellota (frugal, avatar sereno)', () => {
    const { container } = render(<Ardilla tier="alto" animated />);
    expect(container.querySelector('.ardilla-bellota')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega a la boquita', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Ardilla tier="alto" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa de siempre)', () => {
    const { container } = render(<Ardilla tier="alto" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura ÁMBAR de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura ÁMBAR (no dorada)', () => {
    const { container } = render(<Ardilla tier="alto" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('ardilla');
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('ardilla'));
    // el color de aura de la ardilla es ÁMBAR (distinto del dorado de la abeja)
    expect(auraDeBicho('ardilla')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Ardilla tier="alto" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="ardilla"]')).toBeTruthy();
  });
});

describe('4. Ropa por clima — se abriga y NUNCA suda (contrato compartido)', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor', () => {
    const { container } = render(<Ardilla tier="alto" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) la ardilla NO suda (contrato compartido)', () => {
    const { container } = render(<Ardilla tier="alto" vestuario clima="soleado" tempC={30} />);
    // aunque el termómetro dispararía sudor en un bicho templado, la ardilla no.
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Ardilla tier="alto" clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la patita', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Ardilla tier="alto" mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=semillero → carga el canasto', () => {
    const { container } = render(<Ardilla tier="alto" mundoId="semillero" />);
    expect(container.querySelector('[data-prop="canasto"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → patitas libres (no rompe)', () => {
    const { container } = render(<Ardilla tier="alto" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="ardilla"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Ardilla tier="alto" inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="ardilla"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
