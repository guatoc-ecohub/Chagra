/**
 * Morrocoy.render.test.jsx — los 5 frentes de "Morrocoy completo" (espejo de la
 * abeja/oso/jaguar, con el CARÁCTER del galápago de tierra cálida: ANCESTRAL,
 * LENTO, SABIO y PACIENTE — bronce en poder). Verifica que las capacidades
 * ADITIVAS del componente canónico se rendericen sin romper el contrato base:
 *   1. Expresividad ancestral — line-boil (contorno que hierve), caparazón de
 *      domo que respira, retracción elástica (seRetrae) y asentimiento (asiente).
 *   2. Lip-sync — el visema viaja a la cara (data-visema).
 *   3. Modo poder — el aura BRONCE de 4 capas (wrapper .is-powered-up, no dorada).
 *   4. Ropa/clima — de noche RUANA, y el morrocoy (tierra cálida) NUNCA suda.
 *   5. Prop por mundo — la herramienta en la pata al entrar.
 * Más la firma de identidad: es el galápago del CAPARAZÓN de domo y su aura es
 * bronce, con su capa ANCESTRAL (resplandor + shimmer) permanente y sutil.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Morrocoy } from '../Morrocoy.jsx';
import { auraDeBicho } from '../transformacion.js';

afterEach(cleanup);

describe('Morrocoy — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    const svg = container.querySelector('svg[data-creature="morrocoy"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-retrae')).toBeNull();
    expect(svg.getAttribute('data-asiente')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su CAPARAZÓN de domo y sus patas (identidad)', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    // El domo geométrico y las patas rojizas son identidad, no opt-in.
    expect(container.querySelector('.morrocoy-caparazon')).toBeTruthy();
    expect(container.querySelector('.morrocoy-cabeza')).toBeTruthy();
    expect(container.querySelectorAll('.morrocoy-pata').length).toBeGreaterThan(3);
  });
});

describe('1. Expresividad ancestral — line-boil, retracción y asentimiento', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Morrocoy tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Morrocoy tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('seRetrae marca el estado (retracción elástica a la concha)', () => {
    const { container } = render(<Morrocoy tier="medio" seRetrae animated />);
    expect(container.querySelector('svg').getAttribute('data-retrae')).toBe('1');
    // la cabeza y las patas (los que se recogen) siguen dibujados.
    expect(container.querySelector('.morrocoy-cabeza')).toBeTruthy();
    expect(container.querySelectorAll('.morrocoy-pata').length).toBeGreaterThan(3);
  });

  it('asiente marca el estado (el anciano cabecea sabio)', () => {
    const { container } = render(<Morrocoy tier="medio" asiente animated />);
    expect(container.querySelector('svg').getAttribute('data-asiente')).toBe('1');
    expect(container.querySelector('.morrocoy-cabeza')).toBeTruthy();
  });
});

describe('2. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Morrocoy tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa de siempre)', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura BRONCE de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura BRONCE (no dorada)', () => {
    const { container } = render(<Morrocoy tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('morrocoy');
    // el color de aura del morrocoy es BRONCE/COBRE (distinto del dorado abeja)
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('morrocoy'));
    expect(auraDeBicho('morrocoy')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="morrocoy"]')).toBeTruthy();
  });
});

describe('4. Ropa/clima — el morrocoy se abriga de frío y NUNCA suda', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<Morrocoy tier="medio" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    // el morrocoy de tierra cálida aguanta el calor sin sudar
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el morrocoy NO suda (tierra cálida, identidad)', () => {
    const { container } = render(<Morrocoy tier="medio" vestuario clima="soleado" tempC={34} />);
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Morrocoy tier="medio" clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la pata', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Morrocoy tier="medio" mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=animales → carga el lazo', () => {
    const { container } = render(<Morrocoy tier="medio" mundoId="animales" />);
    expect(container.querySelector('[data-prop="lazo"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → patas libres (no rompe)', () => {
    const { container } = render(<Morrocoy tier="medio" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="morrocoy"]')).toBeTruthy();
  });
});

describe('6. Toque ancestral — el anciano de piedra viva (permanente y sutil)', () => {
  it('trae SIEMPRE resplandor cobrizo y shimmer del caparazón', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    expect(container.querySelector('.morrocoy-resplandor')).toBeTruthy(); // calor ancestral permanente
    expect(container.querySelector('.morrocoy-shimmer')).toBeTruthy();    // shimmer del reborde
  });

  it('el resplandor ancestral es PERMANENTE (existe sin pedir modo poder)', () => {
    const { container } = render(<Morrocoy tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector('.morrocoy-resplandor')).toBeTruthy();
  });

  it('reduced-motion-safe / tier-safe: con animated=false NO se anima (fotograma digno)', () => {
    const { container } = render(<Morrocoy tier="medio" animated={false} />);
    // sin vida: no se cuelgan las clases que animan (resplandor/shimmer/caparazón)…
    expect(container.querySelector('.morrocoy-resplandor')).toBeNull();
    expect(container.querySelector('.morrocoy-shimmer')).toBeNull();
    // …pero el caparazón (el domo) sigue dibujado, quieto y digno.
    expect(container.querySelector('.morrocoy-caparazon')).toBeTruthy();
  });

  it('modo poder BRONCE: el resplandor sigue dentro del power-up', () => {
    const { container } = render(<Morrocoy tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up.morrocoy-poder');
    expect(wrap).toBeTruthy();
    // el anciano aviva la brasa: resplandor vive dentro del wrapper
    expect(wrap.querySelector('.morrocoy-resplandor')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Morrocoy tier="medio" inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="morrocoy"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
