/**
 * Perezoso.render.test.jsx — los 5 frentes de "Perezoso completo" (espejo de
 * Angelita/Oso, con el CARÁCTER de la QUIETUD EXTREMA: cuelga de la rama por sus
 * garras largas, antifaz, tinte verdoso de algas y todo en cámara lenta).
 * Verifica que las capacidades ADITIVAS del componente canónico se rendericen sin
 * romper el contrato base:
 *   1. Expresividad lentísima — line-boil (contorno que hierve), dormita (Zzz) y
 *      estiramiento en cámara lenta; más su firma: cuelga de la rama.
 *   2. Lip-sync — el visema viaja a la cara (data-visema).
 *   3. Modo poder — el aura TURQUESA de 4 capas (wrapper .is-powered-up), distinta
 *      del verde de la rana.
 *   4. Ruana — de noche RUANA, y el perezoso NUNCA suda (ni con calor).
 *   5. Prop por mundo — la herramienta en la garra al entrar.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Perezoso } from '../Perezoso.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('Perezoso — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Perezoso tier="medio" />);
    const svg = container.querySelector('svg[data-creature="perezoso"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-dormita')).toBeNull();
    expect(svg.getAttribute('data-estira')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su ANTIFAZ y la RAMA de la que cuelga (identidad de la especie)', () => {
    const { container } = render(<Perezoso tier="medio" />);
    expect(container.querySelector('.perezoso-antifaz')).toBeTruthy();
    expect(container.querySelector('.perezoso-rama')).toBeTruthy();
  });
});

describe('1. Expresividad lentísima — line-boil, dormita y estira', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Perezoso tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Perezoso tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('dormita marca el estado y saca las "Z" del sueño', () => {
    const { container } = render(<Perezoso tier="medio" dormita animated />);
    expect(container.querySelector('svg').getAttribute('data-dormita')).toBe('1');
    expect(container.querySelectorAll('.perezoso-zzz-mota').length).toBeGreaterThan(1);
  });

  it('estira marca el estado (estiramiento en cámara lenta)', () => {
    const { container } = render(<Perezoso tier="medio" estira animated />);
    expect(container.querySelector('svg').getAttribute('data-estira')).toBe('1');
  });

  it('sin dormita no hay "Z" (frugal, avatar despierto)', () => {
    const { container } = render(<Perezoso tier="medio" animated />);
    expect(container.querySelector('.perezoso-zzz-mota')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Perezoso tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa serena de siempre)', () => {
    const { container } = render(<Perezoso tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura TURQUESA de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura TURQUESA', () => {
    const { container } = render(<Perezoso tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('perezoso');
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('perezoso'));
    // el turquesa del perezoso es DISTINTO del verde de la rana y del dorado abeja
    expect(auraDeBicho('perezoso')).not.toBe(auraDeBicho('rana-andina'));
    expect(auraDeBicho('perezoso')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Perezoso tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="perezoso"]')).toBeTruthy();
  });
});

describe('4. Ruana — el perezoso se abriga y NUNCA suda', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<Perezoso tier="medio" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el perezoso NO suda (la calma no se acalora)', () => {
    const { container } = render(<Perezoso tier="medio" vestuario clima="soleado" tempC={30} />);
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Perezoso tier="medio" clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la garra', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Perezoso tier="medio" mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=agua → carga la manguerita', () => {
    const { container } = render(<Perezoso tier="medio" mundoId="agua" />);
    expect(container.querySelector('[data-prop="manguera"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → garras libres (no rompe)', () => {
    const { container } = render(<Perezoso tier="medio" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="perezoso"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Perezoso tier="medio" inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="perezoso"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
