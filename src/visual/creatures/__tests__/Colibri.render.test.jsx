/**
 * Colibri.render.test.jsx — los 5 frentes de "Colibrí completo" (espejo de
 * Angelita y el oso, con el CARÁCTER del HIPERACTIVO: veloz, nervioso, con
 * estelas iridiscentes). Verifica que las capacidades ADITIVAS del componente
 * canónico se rendericen sin romper el contrato viejo:
 *   1. Expresividad veloz — estelas-afterimage (SU firma, default viva),
 *      line-boil opt-in y dardo (wrapper .colibri-dardo).
 *   2. Lip-sync — el visema viaja al PICO (data-visema + garganta al chillar).
 *   3. Modo poder — aura IRIDISCENTE cian-magenta de 4 capas (≠ abeja ≠ oso).
 *   4. Ruanita por clima — de noche RUANA, y el colibrí NUNCA suda (es ave).
 *   5. Prop por mundo — la herramienta colgando de las patitas al entrar.
 * Más la firma de identidad: gorguera violeta iridiscente (Colibri coruscans).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Colibri } from '../Colibri.jsx';
import { auraDeBicho } from '../transformacion.js';
import { COLIBRI_PALETA } from '../faunaAndina.js';

afterEach(cleanup);

describe('Colibri — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas opt-in', () => {
    const { container } = render(<Colibri />);
    const svg = container.querySelector('svg[data-creature="colibri"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión visual).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-visema')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su GORGUERA violeta iridiscente (identidad de la especie)', () => {
    const { container } = render(<Colibri />);
    expect(container.querySelector(`[fill="${COLIBRI_PALETA.garganta}"]`)).toBeTruthy();
  });
});

describe('1. Expresividad veloz — estelas, dardo y line-boil', () => {
  it('viva trae sus 2 ESTELAS iridiscentes por defecto (la firma) + el dardo', () => {
    const { container } = render(<Colibri animated />);
    expect(container.querySelector('svg').getAttribute('data-estelas')).toBe('1');
    expect(container.querySelectorAll('.colibri-estela').length).toBe(2);
    expect(container.querySelector('.colibri-estela--1')).toBeTruthy();
    expect(container.querySelector('.colibri-estela--2')).toBeTruthy();
    expect(container.querySelector('.colibri-dardo')).toBeTruthy();
  });

  it('las estelas son decorativas (aria-hidden) y tornasol (cian + magenta)', () => {
    const { container } = render(<Colibri animated />);
    const estelas = container.querySelectorAll('.colibri-estela');
    estelas.forEach((e) => expect(e.getAttribute('aria-hidden')).toBe('true'));
    expect(container.querySelector(`.colibri-estela[fill="${COLIBRI_PALETA.irisCian}"]`)).toBeTruthy();
    expect(container.querySelector(`.colibri-estela[fill="${COLIBRI_PALETA.irisMagenta}"]`)).toBeTruthy();
  });

  it('estelas={false} las apaga; animated=false ni las monta (fotograma digno)', () => {
    const sinEstelas = render(<Colibri animated estelas={false} />);
    expect(sinEstelas.container.querySelector('.colibri-estela')).toBeNull();
    cleanup();
    const quieto = render(<Colibri animated={false} />);
    expect(quieto.container.querySelector('.colibri-estela')).toBeNull();
    expect(quieto.container.querySelector('.colibri-dardo')).toBeNull();
    expect(quieto.container.querySelector('svg').getAttribute('data-estelas')).toBeNull();
  });

  it('lineBoil instancia el filtro de displacement (línea que respira)', () => {
    const { container } = render(<Colibri lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Colibri animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });
});

describe('2. Lip-sync — el visema llega al PICO', () => {
  it('con visema V3 el pico chilla: data-visema + garganta visible', () => {
    const { container } = render(<Colibri visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
    expect(container.querySelector('.colibri-garganta')).toBeTruthy();
  });

  it('sin visema no marca data-visema ni abre garganta (la sonrisita de siempre)', () => {
    const { container } = render(<Colibri />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
    expect(container.querySelector('.colibri-garganta')).toBeNull();
  });

  it('V1 (silencio) = pico cerrado, sin garganta', () => {
    const { container } = render(<Colibri visema="V1" />);
    expect(container.querySelector('.colibri-garganta')).toBeNull();
  });
});

describe('3. Modo poder — aura IRIDISCENTE cian-magenta (standalone)', () => {
  it('poder envuelve en .is-powered-up.colibri-poder con SU aura (≠ abeja ≠ oso)', () => {
    const { container } = render(<Colibri poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.classList.contains('colibri-poder')).toBe(true);
    expect(wrap.getAttribute('data-creature-poder')).toBe('colibri');
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('colibri'));
    expect(auraDeBicho('colibri')).not.toBe(auraDeBicho('abeja-angelita'));
    expect(auraDeBicho('colibri')).not.toBe(auraDeBicho('oso-andino'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<Colibri />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="colibri"]')).toBeTruthy();
  });
});

describe('4. Ruanita por clima — se abriga y NUNCA suda (es ave)', () => {
  it('de noche con vestuario → RUANA y JAMÁS sudor/sombrero', () => {
    const { container } = render(<Colibri vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-ruana')).toBe('1');
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('de día caluroso (tempC alta) el colibrí NO suda (las aves no sudan)', () => {
    const { container } = render(<Colibri vestuario clima="soleado" tempC={30} />);
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de ropa aunque haya clima', () => {
    const { container } = render(<Colibri clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
  });
});

describe('5. Prop por mundo — herramienta en las patitas', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Colibri mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundoId=agua → carga la manguerita', () => {
    const { container } = render(<Colibri mundoId="agua" />);
    expect(container.querySelector('[data-prop="manguera"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → patitas libres (no rompe)', () => {
    const { container } = render(<Colibri mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="colibri"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Colibri inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="colibri"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
