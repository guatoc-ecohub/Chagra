import { describe, it, expect } from 'vitest';
import {
  idsDeclaradosEnSvg,
  namespaceSvg,
  namespaceCss,
  extraerCssDelRig,
} from '../nsRigValle.js';

describe('idsDeclaradosEnSvg', () => {
  it('recolecta todos los ids declarados, sin duplicados', () => {
    const svg = '<g id="wrap"><g id="cuerpoRig"></g><g id="wrap"></g></g>';
    expect(idsDeclaradosEnSvg(svg)).toEqual(new Set(['wrap', 'cuerpoRig']));
  });

  it('devuelve un set vacío si no hay ids', () => {
    expect(idsDeclaradosEnSvg('<g><path d="M0,0"/></g>').size).toBe(0);
  });
});

describe('namespaceSvg', () => {
  it('reescribe id= y url(#...) al mismo sufijo', () => {
    const svg = '<g id="cuerpoRig" filter="url(#boil)"><use href="#pluma"/></g>';
    const ids = new Set(['cuerpoRig', 'boil', 'pluma']);
    const out = namespaceSvg(svg, ids, 'i1');
    expect(out).toContain('id="cuerpoRig-i1"');
    expect(out).toContain('url(#boil-i1)');
    expect(out).toContain('href="#pluma-i1"');
    expect(out).not.toContain('id="cuerpoRig"');
  });

  it('dos instancias con sufijos distintos no comparten ids', () => {
    const svg = '<g id="cuerpoRig"></g>';
    const ids = new Set(['cuerpoRig']);
    const a = namespaceSvg(svg, ids, 'a');
    const b = namespaceSvg(svg, ids, 'b');
    expect(a).toContain('id="cuerpoRig-a"');
    expect(b).toContain('id="cuerpoRig-b"');
    expect(a).not.toBe(b);
  });

  it('respeta xlink:href además de href', () => {
    const svg = '<use xlink:href="#pluma"/>';
    const out = namespaceSvg(svg, new Set(['pluma']), 'i1');
    expect(out).toContain('xlink:href="#pluma-i1"');
  });
});

describe('namespaceCss', () => {
  it('reescribe selectores por id sin tocar colores hex', () => {
    const css = '#cuerpoRig{fill:#2a140b;animation:bob 1s}';
    const out = namespaceCss(css, new Set(['cuerpoRig']), 'i1');
    expect(out).toContain('#cuerpoRig-i1{');
    expect(out).toContain('fill:#2a140b'); // el color hex queda intacto
  });

  it('no toca clases (.flota) ni ids desconocidos', () => {
    const css = '.flota{animation:bob 1s} #otro{color:red}';
    const out = namespaceCss(css, new Set(['cuerpoRig']), 'i1');
    expect(out).toBe(css);
  });
});

describe('extraerCssDelRig', () => {
  it('devuelve solo el bloque desde el comentario del rig hasta el final', () => {
    const css = 'body{margin:0}\n/* =====\n   GUACAMAYA — rig rubber-hose\n   ===== */\n#guaca{opacity:1}';
    const out = extraerCssDelRig(css, 'GUACAMAYA — rig rubber-hose');
    expect(out).not.toContain('body{margin:0}');
    expect(out).toContain('#guaca{opacity:1}');
  });

  it('devuelve cadena vacía si el marcador no aparece (safety net)', () => {
    expect(extraerCssDelRig('body{margin:0}', 'NO EXISTE')).toBe('');
  });
});
