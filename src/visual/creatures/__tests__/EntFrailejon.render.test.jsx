/**
 * EntFrailejon.render.test.jsx — el Ent del páramo (frailejón guardián), los 5
 * FRENTES + el fallback del guion. El Ent NO es un bicho: es el árbol-maestro
 * del Bosque Vivo. Verifica que sus capas ADITIVAS se rendericen sin romper el
 * contrato de la familia rubber-hose:
 *   1. Expresividad de árbol vivo con PESO — line-boil lento, rostro sabio
 *      (cejas de corteza), roseta, faldita, raíces, balanceo ancestral.
 *   2. Lip-sync — la boca entre las grietas del tronco (data-visema).
 *   3. Modo-GUARDIÁN — aura VERDE-PLATEADA de 4 capas (no dorada), la roseta se abre.
 *   4. Clima de páramo — ESCARCHA de noche/frío, NEBLINA, y JAMÁS suda.
 *   5. Enseñanza — useEntGuion trae el guion; fallback digno hasta que aterrice
 *      src/data/entGuion.js (punto de integración: useEntGuion({ guion })).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, renderHook, act, cleanup } from '@testing-library/react';
import { EntFrailejon } from '../EntFrailejon.jsx';
import { auraDeBicho } from '../transformacion.js';
import {
  useEntGuion, resolverGuionEnt, ENT_GUION_PLACEHOLDER, ENT_TEMAS,
} from '../useEntGuion.js';

afterEach(cleanup);

describe('EntFrailejon — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas opt-in', () => {
    const { container } = render(<EntFrailejon tier="medio" />);
    const svg = container.querySelector('svg[data-creature="ent-frailejon"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    // Ninguna capa opt-in aparece sin pedirla (no regresión).
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-escarcha')).toBeNull();
    expect(svg.getAttribute('data-neblina')).toBeNull();
    expect(svg.getAttribute('data-ensena')).toBeNull();
    expect(svg.getAttribute('data-visema')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('siempre trae su rostro sabio y su anatomía de frailejón (identidad)', () => {
    const { container } = render(<EntFrailejon tier="medio" />);
    expect(container.querySelector('.ent-cejas')).toBeTruthy();   // cejas de corteza
    expect(container.querySelector('.ent-roseta')).toBeTruthy();  // corona plateada
    expect(container.querySelector('.ent-faldita')).toBeTruthy(); // hojas muertas
    expect(container.querySelector('.ent-raices')).toBeTruthy();  // raíces que asientan
  });
});

describe('1. Expresividad de árbol vivo con PESO', () => {
  it('lineBoil instancia el filtro de displacement (corteza que hierve, lento)', () => {
    const { container } = render(<EntFrailejon tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<EntFrailejon tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('vivo → balanceo ancestral y la corona viva; quieto → fotograma digno', () => {
    const { container: vivo } = render(<EntFrailejon tier="medio" animated />);
    expect(vivo.querySelector('.ent-balanceo')).toBeTruthy();
    expect(vivo.querySelector('.ent-roseta-viva')).toBeTruthy();
    cleanup();
    const { container: quieto } = render(<EntFrailejon tier="medio" animated={false} />);
    expect(quieto.querySelector('.ent-balanceo')).toBeNull();
    // la roseta sigue dibujada (digna), solo sin la clase de vida
    expect(quieto.querySelector('.ent-roseta')).toBeTruthy();
    expect(quieto.querySelector('.ent-roseta-viva')).toBeNull();
  });
});

describe('2. Lip-sync — la boca entre las grietas', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<EntFrailejon tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la hendidura serena de siempre)', () => {
    const { container } = render(<EntFrailejon tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('3. Modo-GUARDIÁN — aura VERDE-PLATEADA de 4 capas', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura verde-plateada (no dorada)', () => {
    const { container } = render(<EntFrailejon tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('ent-frailejon');
    expect(wrap.getAttribute('style')).toContain('--aura-color');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('ent-frailejon'));
    // el aura del Ent NO es la dorada de la abeja ni la púrpura del jaguar
    expect(auraDeBicho('ent-frailejon')).not.toBe(auraDeBicho('abeja-angelita'));
    expect(auraDeBicho('ent-frailejon')).not.toBe(auraDeBicho('jaguar'));
    // capa 4: las corrientes (AuraPoder)
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('sin poder no hay wrapper (svg desnudo)', () => {
    const { container } = render(<EntFrailejon tier="medio" />);
    expect(container.querySelector('.is-powered-up')).toBeNull();
    expect(container.querySelector(':scope > svg[data-creature="ent-frailejon"]')).toBeTruthy();
  });
});

describe('4. Clima de páramo — escarcha, neblina y JAMÁS suda', () => {
  it('de noche/frío con vestuario → ESCARCHA en las hojas, nunca sudor', () => {
    const { container } = render(<EntFrailejon tier="medio" vestuario clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-escarcha')).toBe('1');
    expect(container.querySelector('.ent-escarcha-cristal')).toBeTruthy();
    // el frailejón vive en el frío: no se acalora nunca
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('con niebla → NEBLINA que cruza el tronco', () => {
    const { container } = render(<EntFrailejon tier="medio" vestuario clima="niebla" />);
    expect(container.querySelector('svg').getAttribute('data-neblina')).toBe('1');
    expect(container.querySelector('.ent-neblina-banda')).toBeTruthy();
  });

  it('de día caluroso (tempC alta) el Ent NO suda (páramo, identidad)', () => {
    const { container } = render(<EntFrailejon tier="medio" vestuario clima="soleado" tempC={30} />);
    expect(container.querySelector('.crt-sudor')).toBeNull();
    expect(container.querySelector('.crt-gota-sudor')).toBeNull();
    expect(container.querySelector('svg').getAttribute('data-escarcha')).toBeNull();
  });

  it('sin vestuario (avatar/catálogo) → nada de clima aunque haya dato', () => {
    const { container } = render(<EntFrailejon tier="medio" clima="noche" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-escarcha')).toBeNull();
    expect(container.querySelector('.ent-escarcha-cristal')).toBeNull();
  });
});

describe('5. Enseñanza — el guion del Ent-maestro (fallback digno)', () => {
  it('resolverGuionEnt() sin guion real → placeholders (4 snippets, un tema c/u)', () => {
    const { lista, fuente } = resolverGuionEnt();
    expect(fuente).toBe('placeholder');
    expect(lista).toBe(ENT_GUION_PLACEHOLDER);
    expect(lista.length).toBe(4);
    // cubre los 4 temas del guardián del páramo
    const temas = new Set(lista.map((s) => s.tema));
    for (const t of ENT_TEMAS) expect(temas.has(t)).toBe(true);
    // usted colombiano (no voseo): ningún snippet dice "tenés"/"vos"
    for (const s of lista) {
      expect(/\btenés\b|\bvos\b/i.test(s.texto)).toBe(false);
    }
  });

  it('resolverGuionEnt(guionReal) → lo consume (fuente=guion), ignora entradas vacías', () => {
    const guionReal = [
      { id: 'r1', tema: 'clima', titulo: 'Real', texto: 'El páramo es una esponja de agua.' },
      { id: 'vacio', tema: 'x', titulo: '', texto: '   ' }, // se filtra
    ];
    const { lista, fuente } = resolverGuionEnt(guionReal);
    expect(fuente).toBe('guion');
    expect(lista.length).toBe(1);
    expect(lista[0].id).toBe('r1');
  });

  it('guion inválido/ vacío → cae al placeholder (nunca rompe)', () => {
    expect(resolverGuionEnt([]).fuente).toBe('placeholder');
    expect(resolverGuionEnt(null).fuente).toBe('placeholder');
    expect(resolverGuionEnt([{ texto: '' }]).fuente).toBe('placeholder');
  });

  it('useEntGuion (hook) sin guion → snippet placeholder y avanza en ciclo', () => {
    const { result } = renderHook(() => useEntGuion());
    expect(result.current.fuente).toBe('placeholder');
    expect(result.current.total).toBe(4);
    const primero = result.current.snippet.id;
    act(() => result.current.avanzar());
    expect(result.current.snippet.id).not.toBe(primero);
    expect(result.current.indice).toBe(1);
    // porTema salta al snippet del tema pedido
    act(() => result.current.porTema('caza'));
    expect(result.current.snippet.tema).toBe('caza');
  });

  it('useEntGuion (hook) con guion real → fuente=guion', () => {
    const guion = [{ id: 'g', tema: 'botanica', titulo: 'T', texto: 'Crezco un centímetro al año.' }];
    const { result } = renderHook(() => useEntGuion({ guion }));
    expect(result.current.fuente).toBe('guion');
    expect(result.current.snippet.id).toBe('g');
  });
});

describe('Postura de enseñanza + anti-regresión inline', () => {
  it('ensena marca la postura de maestro (data-ensena)', () => {
    const { container } = render(<EntFrailejon tier="medio" ensena />);
    expect(container.querySelector('svg').getAttribute('data-ensena')).toBe('1');
  });

  it('inline devuelve un <g> con data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <EntFrailejon tier="medio" inline poder ensena />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="ent-frailejon"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1'); // el host DOM pinta el aura
    expect(g.getAttribute('data-ensena')).toBe('1');
  });
});
