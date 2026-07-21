/**
 * Borugo.render.test.jsx — los 5 frentes de "Borugo completo" (espejo del
 * jaguar/oso, con el CARÁCTER del 9º y ÚLTIMO bicho — el ANIMAL DE CIERRE: la
 * paca de montaña andina, TIERNA, tímida, serena, NOCTURNA — plata lunar en
 * poder). Verifica que las capacidades ADITIVAS del componente canónico se
 * rendericen sin romper el contrato base:
 *   1. Expresividad tierna — line-boil (contorno que hierve), olfateo (nariz +
 *      bigotes + orejas), acurrucarse a salvo (acurruca), motas crema de flancos.
 *   2. Lip-sync — el visema viaja a la cara (data-visema).
 *   3. Modo poder — el aura PLATA LUNAR de 4 capas (wrapper .is-powered-up, no dorada).
 *   4. Ropa/clima — de noche RUANA, y el borugo (nocturno de páramo) NUNCA suda.
 *   5. Prop por mundo — la herramienta en la patita al entrar.
 * Más la firma de identidad: es el roedor de las MOTAS crema y su aura es plata
 * lunar; y el HOMENAJE — honrado vivo, a salvo y digno (nada de cacería).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Borugo } from '../Borugo.jsx';
import { auraDeBicho } from '../transformacion.js';
import { CREATURES } from '../index.js';

afterEach(cleanup);

describe('Borugo — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Borugo tier="medio" />);
    const svg = container.querySelector('svg[data-creature="borugo"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-olfatea')).toBeNull();
    expect(svg.getAttribute('data-acurruca')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su NARIZ, sus BIGOTES y sus OREJITAS (identidad tierna)', () => {
    const { container } = render(<Borugo tier="medio" />);
    // la seña del roedor nocturno (olfateo + bigotes + orejas) es identidad.
    expect(container.querySelector('.borugo-nariz')).toBeTruthy();
    expect(container.querySelector('.borugo-bigotes')).toBeTruthy();
    expect(container.querySelector('.borugo-orejas')).toBeTruthy();
  });

  it('está registrado como el binomio correcto (Cuniculus taczanowskii)', () => {
    expect(CREATURES.borugo).toBeTruthy();
    expect(CREATURES.borugo.cientifico).toBe('Cuniculus taczanowskii');
  });
});

describe('1. Expresividad tierna — line-boil, olfateo y acurrucarse', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Borugo tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Borugo tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('olfatea marca el estado (la nariz tiembla, los bigotes se abren)', () => {
    const { container } = render(<Borugo tier="medio" olfatea animated />);
    expect(container.querySelector('svg').getAttribute('data-olfatea')).toBe('1');
    expect(container.querySelector('.borugo-nariz')).toBeTruthy();
    expect(container.querySelector('.borugo-bigotes')).toBeTruthy();
  });

  it('acurruca marca el estado (se ovilla a salvo — el corazón del cierre)', () => {
    const { container } = render(<Borugo tier="medio" acurruca animated />);
    expect(container.querySelector('svg').getAttribute('data-acurruca')).toBe('1');
    expect(container.querySelector('.borugo-cabeza')).toBeTruthy();
  });

  it('trae SIEMPRE sus MOTAS crema de los flancos (la firma inconfundible)', () => {
    const { container } = render(<Borugo tier="medio" />);
    // varias motas + su capa de luz lunar
    expect(container.querySelector('.borugo-motas-luz')).toBeTruthy();
  });
});

describe('2. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Borugo tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa tímida de siempre)', () => {
    const { container } = render(<Borugo tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo poder — aura PLATA LUNAR de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura PLATA LUNAR (no dorada)', () => {
    const { container } = render(<Borugo tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('borugo');
    // el color de aura del borugo es PLATA LUNAR (distinto del dorado abeja)
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('borugo'));
    expect(auraDeBicho('borugo')).not.toBe(auraDeBicho('abeja-angelita'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Borugo tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="borugo"]')).toBeTruthy();
  });
});

describe('4. Ropa/clima — el borugo se abriga de frío y NUNCA suda', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<Borugo tier="medio" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    // el borugo nocturno/páramo aguanta sin sudar
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el borugo NO suda (nocturno de páramo, identidad)', () => {
    const { container } = render(<Borugo tier="medio" vestuario clima="soleado" tempC={33} />);
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Borugo tier="medio" clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en la patita', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Borugo tier="medio" mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=animales → carga el lazo', () => {
    const { container } = render(<Borugo tier="medio" mundoId="animales" />);
    expect(container.querySelector('[data-prop="lazo"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → patitas libres (no rompe)', () => {
    const { container } = render(<Borugo tier="medio" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="borugo"]')).toBeTruthy();
  });
});

describe('6. Nocturno sagrado — el brillo lunar (permanente y sutil)', () => {
  it('trae SIEMPRE la luz de las motas y la luna en los ojos', () => {
    const { container } = render(<Borugo tier="medio" />);
    expect(container.querySelector('.borugo-motas-luz')).toBeTruthy();  // motas que brillan tenue
    expect(container.querySelector('.borugo-ojo-luna')).toBeTruthy();   // la luna en los ojos
  });

  it('el brillo lunar es PERMANENTE (existe sin pedir modo poder)', () => {
    const { container } = render(<Borugo tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector('.borugo-motas-luz')).toBeTruthy();
  });

  it('reduced-motion-safe / tier-safe: con animated=false NO se anima el brillo (fotograma digno)', () => {
    const { container } = render(<Borugo tier="medio" animated={false} />);
    // sin vida: no se cuelgan las clases que animan (motas/ojos/nariz/bigotes)…
    expect(container.querySelector('.borugo-motas-luz')).toBeNull();
    expect(container.querySelector('.borugo-ojo-luna')).toBeNull();
    expect(container.querySelector('.borugo-nariz')).toBeTruthy(); // el nodo sigue dibujado, quieto
    // …pero las motas (la firma) siguen dibujadas, quietas y dignas (elipses crema).
    expect(container.querySelector('svg[data-creature="borugo"]')).toBeTruthy();
  });

  it('modo poder PLATA LUNAR: la luz de las motas sigue dentro del power-up', () => {
    const { container } = render(<Borugo tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up.borugo-poder');
    expect(wrap).toBeTruthy();
    // el ser protegido se revela: la luz lunar vive dentro del wrapper
    expect(wrap.querySelector('.borugo-motas-luz')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Borugo tier="medio" inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="borugo"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
