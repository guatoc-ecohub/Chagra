/**
 * Luciernaga.render.test.jsx — LA LUCIÉRNAGA (cocuyo, Lampyridae), el escarabajo
 * bioluminiscente GUÍA de la finca: la que lee la noche. Espejo del test de la
 * zarigüeya, con lo que este personaje tiene de propio y de INNEGOCIABLE:
 *   1. FIDELIDAD DE ESPECIE — es un ESCARABAJO, no una mosca ni una abeja: su
 *      firma de silueta (pronoto-escudo, élitros compactos, linterna, antenas
 *      filiformes) es de FORMA y sobrevive al negro sobre blanco.
 *   2. LA LINTERNA es su alma y su MEDIDOR VIVO del cambio climático (eco):
 *      sano late fuerte, degradado titila débil, leer pulsa atenta.
 *   3. Lip-sync — el visema viaja a la cara.
 *   4. Modo poder — aura VERDE-LINTERNA (nadie más tiene el verde-lima frío).
 *   5. Vida propia + idle-cerebro (destella/lee) — existe aunque nadie le hable.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Luciernaga } from '../Luciernaga.jsx';
import { auraDeBicho } from '../transformacion.js';
import { LUCIERNAGA_FIRMA } from '../luciernagaIdentidad.js';
import { IDLE_PERFILES } from '../creatureIdle.js';
import { VIDA_REPERTORIO } from '../vidaEstados.js';
import { CREATURES } from '../index.js';

afterEach(cleanup);

describe('Luciérnaga — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Luciernaga tier="medio" />);
    const svg = container.querySelector('svg[data-creature="luciernaga"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-eco')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('está registrada como el binomio correcto (Lampyridae)', () => {
    expect(CREATURES.luciernaga).toBeTruthy();
    expect(CREATURES.luciernaga.cientifico).toBe('Lampyridae');
  });
});

describe('1. FIDELIDAD DE ESPECIE — escarabajo, y su firma es de FORMA', () => {
  it('el contrato de silueta es DATO y declara la prueba como obligatoria', () => {
    expect(LUCIERNAGA_FIRMA.pruebaSilueta.obligatoria).toBe(true);
    // la criatura de la que hay que diferenciarse está nombrada (mosca/abeja)
    expect(LUCIERNAGA_FIRMA.pruebaSilueta.contraste).toMatch(/mosca|abeja|mariposa/i);
  });

  it('TODOS los rasgos de la firma son de forma (ninguno depende del color)', () => {
    expect(LUCIERNAGA_FIRMA.rasgos.length).toBeGreaterThanOrEqual(4);
    // la lección del borugo: una firma dependiente del color es rechazo. La
    // luciérnaga NO confía su lectura al verde de la linterna.
    expect(LUCIERNAGA_FIRMA.rasgos.every((r) => r.forma === true)).toBe(true);
    const ids = LUCIERNAGA_FIRMA.rasgos.map((r) => r.id);
    expect(ids).toContain('pronoto-escudo');
    expect(ids).toContain('elitros-compactos');
    expect(ids).toContain('linterna-abdomen');
    expect(ids).toContain('antenas-filiformes');
  });
});

describe('2. LA LINTERNA — alma y medidor vivo del cambio climático', () => {
  it('la linterna (núcleo + halo) está SIEMPRE (identidad, no opt-in)', () => {
    const { container } = render(<Luciernaga tier="medio" />);
    expect(container.querySelector('.luci-linterna-core')).toBeTruthy();
    expect(container.querySelector('.luci-linterna-halo')).toBeTruthy();
  });

  it("eco='sano' marca la lectura de ecosistema sano (late fuerte)", () => {
    const { container } = render(<Luciernaga tier="medio" eco="sano" />);
    expect(container.querySelector('svg').getAttribute('data-eco')).toBe('sano');
  });

  it("eco='degradado' marca el aviso del cambio climático (titila débil)", () => {
    const { container } = render(<Luciernaga tier="medio" eco="degradado" />);
    expect(container.querySelector('svg').getAttribute('data-eco')).toBe('degradado');
  });

  it('con animated=false la silueta y la linterna no se negocian (fotograma digno)', () => {
    const { container } = render(<Luciernaga tier="medio" animated={false} />);
    // sin vida no se anima, pero el cuerpo (élitros, abdomen, linterna) sigue.
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toBeTruthy();
    expect(container.querySelector('.luci-pronoto')).toBeTruthy();
  });
});

describe('3. Expresividad — line-boil y lip-sync', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Luciernaga tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Luciernaga tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Luciernaga tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });
});

describe('4. Modo poder — aura VERDE-LINTERNA (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura VERDE (no dorada)', () => {
    const { container } = render(<Luciernaga tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up.luciernaga-poder');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('luciernaga');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('luciernaga'));
    expect(auraDeBicho('luciernaga')).not.toBe(auraDeBicho('abeja-angelita'));
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });
});

describe('5. Vida propia — idle-cerebro + perfil idle nocturno', () => {
  it('tiene REPERTORIO de idle propio (destella / lee) en vidaEstados', () => {
    expect(VIDA_REPERTORIO.luciernaga).toBeTruthy();
    expect(VIDA_REPERTORIO.luciernaga.momentos.destella).toBeTruthy();
    expect(VIDA_REPERTORIO.luciernaga.momentos.lee).toBeTruthy();
  });

  it('tiene PERFIL IDLE propio (voladora nocturna: de noche NO se apaga)', () => {
    expect(IDLE_PERFILES.luciernaga).toBeTruthy();
    expect(IDLE_PERFILES.luciernaga.medio).toBe('aire');
    expect(IDLE_PERFILES.luciernaga.noche.freq).toBeGreaterThan(1);
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Luciernaga tier="medio" inline poder />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="luciernaga"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1');
  });
});
