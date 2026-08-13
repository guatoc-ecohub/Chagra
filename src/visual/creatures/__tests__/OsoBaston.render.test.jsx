/**
 * OsoBaston.render.test.jsx — EL OSO DEL BASTÓN (Tremarctos ornatus), la
 * dirección CAMINANTE del oso de anteojos: erguido, Cuphead de día, con su
 * bastón florecido. Espejo del test de la luciérnaga, con lo que este
 * personaje tiene de propio y de INNEGOCIABLE:
 *   1. LA FIRMA ES DE FORMA — el bastón coronado y la postura de caminante
 *      con botas sobreviven al negro sobre blanco (la lección del borugo).
 *   2. EL BASTÓN NO SE NEGOCIA — está SIEMPRE (identidad, no opt-in), también
 *      con animated=false (fotograma digno).
 *   3. FLORECE — su ecología (dispersor de semillas) es su gesto-firma.
 *   4. CAMINA — el ciclo de andar con bastón existe como pose del host.
 *   5. Modo poder — aura VERDE del bastón florecido, distinta de todas.
 *   6. Vida propia + cableado completo (vidaEstados, creatureIdle, CREATURES,
 *      elenco enPWA) — existe aunque nadie le hable.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { OsoBaston } from '../OsoBaston.jsx';
import { auraDeBicho, AURA_POR_BICHO } from '../transformacion.js';
import { OSO_BASTON_FIRMA, OSO_BASTON_FLORA } from '../osoBastonIdentidad.js';
import { IDLE_PERFILES } from '../creatureIdle.js';
import { VIDA_REPERTORIO } from '../vidaEstados.js';
import { CREATURES } from '../index.js';
import { ELENCO } from '../../../compai/nucleo/elenco.js';
import { esRubberhose } from '../rubberhoseSpec.js';

afterEach(cleanup);

describe('Oso del bastón — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<OsoBaston tier="medio" />);
    const svg = container.querySelector('svg[data-creature="oso-baston"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-florece')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('está registrado como el binomio correcto (Tremarctos ornatus)', () => {
    expect(CREATURES['oso-baston']).toBeTruthy();
    expect(CREATURES['oso-baston'].cientifico).toBe('Tremarctos ornatus');
  });

  it('cruzó al elenco de la PWA y al registro rubber-hose', () => {
    expect(ELENCO['oso-baston']).toBeTruthy();
    expect(ELENCO['oso-baston'].enPWA).toBe(true);
    expect(esRubberhose('oso-baston')).toBe(true);
  });
});

describe('1. LA FIRMA ES DE FORMA — el caminante del bastón florecido', () => {
  it('el contrato de silueta es DATO y declara la prueba como obligatoria', () => {
    expect(OSO_BASTON_FIRMA.pruebaSilueta.obligatoria).toBe(true);
    // el contraste está nombrado: un oso sin bastón no es este personaje
    expect(OSO_BASTON_FIRMA.pruebaSilueta.contraste).toMatch(/bastón|baston/i);
  });

  it('TODOS los rasgos de la firma son de forma (ninguno depende del color)', () => {
    expect(OSO_BASTON_FIRMA.rasgos.length).toBeGreaterThanOrEqual(4);
    expect(OSO_BASTON_FIRMA.rasgos.every((r) => r.forma === true)).toBe(true);
    const ids = OSO_BASTON_FIRMA.rasgos.map((r) => r.id);
    expect(ids).toContain('baston-florecido');
    expect(ids).toContain('caminante-botas');
    expect(ids).toContain('anteojos-asimetricos');
    expect(ids).toContain('luna-pecho');
  });

  it('la botánica del bastón está nombrada con binomios (mirada Humboldt)', () => {
    expect(OSO_BASTON_FLORA.frailejon.cientifico).toMatch(/Espeletia/);
    expect(OSO_BASTON_FLORA.orquidea.cientifico).toMatch(/Cattleya/);
  });
});

describe('2. EL BASTÓN NO SE NEGOCIA — identidad, no opt-in', () => {
  it('el bastón (palo + corona + halo) está SIEMPRE', () => {
    const { container } = render(<OsoBaston tier="medio" />);
    expect(container.querySelector('.osb-baston')).toBeTruthy();
    expect(container.querySelector('.osb-corola')).toBeTruthy();
    expect(container.querySelector('.osb-halo')).toBeTruthy();
  });

  it('con animated=false la silueta y el bastón no se negocian (fotograma digno)', () => {
    const { container } = render(<OsoBaston animated={false} />);
    expect(container.querySelector('.osb-baston')).toBeTruthy();
    // sin vida: ni corola animada ni polen con clase de cadencia
    expect(container.querySelector('.osb-polen')).toBeNull();
    expect(container.querySelector('svg').getAttribute('data-pose')).toBeNull();
  });
});

describe('3. FLORECE — la ecología del dispersor hecha estado', () => {
  it("florece marca data-florece='1' (halo verde + corola con overshoot)", () => {
    const { container } = render(<OsoBaston tier="medio" florece />);
    expect(container.querySelector('svg').getAttribute('data-florece')).toBe('1');
  });

  it('el momento florece existe en su repertorio de vida propia', () => {
    expect(VIDA_REPERTORIO['oso-baston']).toBeTruthy();
    expect(VIDA_REPERTORIO['oso-baston'].momentos.florece).toBeTruthy();
    // regla dura: dur = múltiplo exacto del keyframe dominante (osb-florece 1.7s)
    expect(VIDA_REPERTORIO['oso-baston'].momentos.florece.dur % 1700).toBe(0);
  });

  it('resopla hereda el huff familiar (vaho por la trufa)', () => {
    const { container } = render(<OsoBaston tier="medio" resopla />);
    expect(container.querySelector('svg').getAttribute('data-resopla')).toBe('1');
    expect(container.querySelector('.crt-vaho-mota')).toBeTruthy();
  });
});

describe('4. CAMINA — el ciclo de andar con bastón (kart/mundos)', () => {
  it("pose='camina' viaja como data-pose (el CSS mueve piernas y bastón)", () => {
    const { container } = render(<OsoBaston tier="medio" pose="camina" />);
    expect(container.querySelector('svg').getAttribute('data-pose')).toBe('camina');
    expect(container.querySelector('.osb-pierna-i')).toBeTruthy();
    expect(container.querySelector('.osb-pierna-d')).toBeTruthy();
  });

  it('su perfil idle 3D es de SUELO (billboard que llega a pie)', () => {
    expect(IDLE_PERFILES['oso-baston']).toBeTruthy();
    expect(IDLE_PERFILES['oso-baston'].medio).toBe('suelo');
  });
});

describe('5. MODO PODER — el verde del bastón florecido, distinto de todos', () => {
  it('poder envuelve en .is-powered-up con su aura', () => {
    const { container } = render(<OsoBaston tier="medio" poder />);
    expect(container.querySelector('.is-powered-up')).toBeTruthy();
  });

  it('su aura es propia: ningún otro bicho la comparte', () => {
    const verde = auraDeBicho('oso-baston');
    expect(verde).toBe('#43c24f');
    const repetidos = Object.entries(AURA_POR_BICHO)
      .filter(([slug, color]) => slug !== 'oso-baston' && color === verde);
    expect(repetidos).toEqual([]);
  });
});

describe('6. LIP-SYNC — el visema viaja a la cara', () => {
  it("visema='V3' abre la boca (garganta) y viaja como data-visema", () => {
    const { container } = render(<OsoBaston tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });
});
