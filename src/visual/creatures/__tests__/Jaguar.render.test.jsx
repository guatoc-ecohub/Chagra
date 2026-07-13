/**
 * Jaguar.render.test.jsx — los 5 frentes de "Jaguar completo" (espejo de la
 * abeja/oso, con el CARÁCTER del felino de tierra cálida: majestuoso, poderoso,
 * ACECHADOR — púrpura en poder). Verifica que las capacidades ADITIVAS del
 * componente canónico se rendericen sin romper el contrato base:
 *   1. Expresividad felina — line-boil (contorno que hierve), cejas fieras,
 *      acecho de hombros, cola pesada, rugido corporal (ruge) y modo acecho.
 *   2. Lip-sync — el visema viaja a la cara (data-visema).
 *   3. Modo poder — el aura PÚRPURA de 4 capas (wrapper .is-powered-up, no dorada).
 *   4. Ropa/clima — de noche RUANA, y el jaguar (tierra cálida) NUNCA suda.
 *   5. Prop por mundo — la herramienta en la zarpa al entrar.
 * Más la firma de identidad: es el felino de las ROSETAS y su aura es púrpura.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Jaguar } from '../Jaguar.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('Jaguar — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Jaguar />);
    const svg = container.querySelector('svg[data-creature="jaguar"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-ruge')).toBeNull();
    expect(svg.getAttribute('data-acecha')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su ACECHO DE HOMBROS, su COLA y sus cejas fieras (identidad)', () => {
    const { container } = render(<Jaguar />);
    // La seña del depredador (omóplatos + cola + mirada) es identidad, no opt-in.
    expect(container.querySelector('.jaguar-hombros')).toBeTruthy();
    expect(container.querySelector('.jaguar-cola')).toBeTruthy();
    expect(container.querySelector('.jaguar-cejas')).toBeTruthy();
  });
});

describe('1. Expresividad felina — line-boil, rugido y acecho', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Jaguar lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Jaguar animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('ruge marca el estado y abre las fauces con colmillos (rugido corporal)', () => {
    const { container } = render(<Jaguar ruge animated />);
    expect(container.querySelector('svg').getAttribute('data-ruge')).toBe('1');
    expect(container.querySelector('.jaguar-rugido-boca')).toBeTruthy();
    expect(container.querySelectorAll('.jaguar-colmillo').length).toBeGreaterThan(1);
  });

  it('acecha marca el estado (el depredador se agazapa)', () => {
    const { container } = render(<Jaguar acecha animated />);
    expect(container.querySelector('svg').getAttribute('data-acecha')).toBe('1');
    expect(container.querySelector('.jaguar-cabeza')).toBeTruthy();
  });

  it('sin ruge no hay fauces abiertas (frugal, avatar sereno)', () => {
    const { container } = render(<Jaguar animated />);
    expect(container.querySelector('.jaguar-rugido-boca')).toBeNull();
    expect(container.querySelector('.jaguar-colmillo')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Jaguar visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('el RUGIDO manda sobre el visema (una fiera que ruge no articula fonemas)', () => {
    const { container } = render(<Jaguar ruge visema="V3" />);
    // el rugido pinta las fauces, no el visema.
    expect(container.querySelector('.jaguar-rugido-boca')).toBeTruthy();
  });

  it('sin visema no marca data-visema (la sonrisa de siempre)', () => {
    const { container } = render(<Jaguar />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura PÚRPURA de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura PÚRPURA (no dorada)', () => {
    const { container } = render(<Jaguar poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('jaguar');
    // el color de aura del jaguar es PÚRPURA depredador (distinto del dorado abeja)
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('jaguar'));
    expect(auraDeBicho('jaguar')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Jaguar />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="jaguar"]')).toBeTruthy();
  });
});

describe('4. Ropa/clima — el jaguar se abriga de frío y NUNCA suda', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<Jaguar vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    // el jaguar de tierra cálida aguanta el calor sin sudar
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el jaguar NO suda (tierra cálida, identidad)', () => {
    const { container } = render(<Jaguar vestuario clima="soleado" tempC={33} />);
    // aunque el termómetro dispararía sudor en un bicho templado, el jaguar no.
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Jaguar clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la zarpa', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Jaguar mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=animales → carga el lazo', () => {
    const { container } = render(<Jaguar mundoId="animales" />);
    expect(container.querySelector('[data-prop="lazo"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → zarpas libres (no rompe)', () => {
    const { container } = render(<Jaguar mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="jaguar"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Jaguar inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="jaguar"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
