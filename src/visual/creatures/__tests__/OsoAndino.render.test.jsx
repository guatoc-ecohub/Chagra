/**
 * OsoAndino.render.test.jsx — los 5 frentes de "Oso andino completo" (espejo de
 * Angelita, con el CARÁCTER del guardián del páramo: mole seria, gruñona, roja
 * en poder). Verifica que las capacidades ADITIVAS del componente canónico se
 * rendericen sin romper el contrato viejo:
 *   1. Expresividad con PESO — line-boil (contorno que hierve), cejas del ceño,
 *      gruñido (resopla → vaho) y rascado.
 *   2. Lip-sync — el visema viaja a la cara (data-visema + bocota amplia).
 *   3. Modo poder — el aura ROJA de 4 capas (wrapper .is-powered-up, no dorada).
 *   4. Ruana del páramo — de noche RUANA, y el oso NUNCA suda (ni con calor).
 *   5. Prop por mundo — la herramienta en la zarpa al entrar.
 * Más la firma de identidad: es el oso de anteojos (crema) y su aura es roja.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { OsoAndino } from '../OsoAndino.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('OsoAndino — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<OsoAndino />);
    const svg = container.querySelector('svg[data-creature="oso-andino"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-resopla')).toBeNull();
    expect(svg.getAttribute('data-rasca')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae sus ANTEOJOS y su ceño serio (identidad de la especie)', () => {
    const { container } = render(<OsoAndino />);
    // Las cejas del sabio gruñón son parte de la identidad (no opt-in).
    expect(container.querySelector('.oso-cejas')).toBeTruthy();
  });
});

describe('1. Expresividad con PESO — line-boil, gruñido y rascado', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<OsoAndino lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<OsoAndino animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('resopla (gruñido) marca el estado y saca el vaho por la trufa', () => {
    const { container } = render(<OsoAndino resopla animated />);
    expect(container.querySelector('svg').getAttribute('data-resopla')).toBe('1');
    expect(container.querySelectorAll('.crt-vaho-mota').length).toBeGreaterThan(1);
  });

  it('rasca marca el estado (se rasca con la zarpa)', () => {
    const { container } = render(<OsoAndino rasca animated />);
    expect(container.querySelector('svg').getAttribute('data-rasca')).toBe('1');
  });

  it('sin resopla no hay vaho (frugal, avatar sereno)', () => {
    const { container } = render(<OsoAndino animated />);
    expect(container.querySelector('.crt-vaho-mota')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega a la bocota', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<OsoAndino visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa grave de siempre)', () => {
    const { container } = render(<OsoAndino />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura ROJA de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura ROJA (no dorada)', () => {
    const { container } = render(<OsoAndino poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('oso-andino');
    // el color de aura del oso es ROJO berserker (distinto del dorado de la abeja)
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('oso-andino'));
    expect(auraDeBicho('oso-andino')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<OsoAndino />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="oso-andino"]')).toBeTruthy();
  });
});

describe('4. Ruana del páramo — el oso se abriga y NUNCA suda', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<OsoAndino vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    // el oso de páramo no se acalora en ningún caso
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el oso NO suda (páramo, identidad)', () => {
    const { container } = render(<OsoAndino vestuario clima="soleado" tempC={26} />);
    // aunque el termómetro dispararía sudor en un bicho templado, el oso no.
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<OsoAndino clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la zarpa', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<OsoAndino mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=agua → carga la manguerita', () => {
    const { container } = render(<OsoAndino mundoId="agua" />);
    expect(container.querySelector('[data-prop="manguera"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → zarpas libres (no rompe)', () => {
    const { container } = render(<OsoAndino mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="oso-andino"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <OsoAndino inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="oso-andino"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
