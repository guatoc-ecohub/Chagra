/**
 * Zariguya.render.test.jsx — LA ZARIGÜEYA (chucha), el marsupial nocturno de la
 * finca: LA QUE CARGA. Espejo del test del borugo/danta, con lo que este
 * personaje tiene de propio y de INNEGOCIABLE:
 *   1. LA FIRMA ESTÁ EN LA FORMA — las crías al lomo, el hocico en cuña, la
 *      cola prensil y las orejas viven en el dibujo SIEMPRE (no son opt-in):
 *      son lo que la hace reconocible en negro sobre blanco. El borugo fue
 *      archivado por confiar su firma al COLOR (las motas crema); acá el
 *      contrato de silueta es dato (ZARIGUYA_FIRMA) y se verifica.
 *   2. Expresividad — line-boil, husmea (el hocico lee el aire) y TANATOSIS
 *      (se hace la muerta, su gag más suyo).
 *   3. Lip-sync — el visema viaja a la cara.
 *   4. Modo poder — aura ROSA DE LUNA de 4 capas (nadie más tiene el rosa).
 *   5. NO SE VISTE — no expone `vestuario` a propósito: la ruana opaca de
 *      AccesoriosClima le taparía las crías (el bug que hizo que la abeja
 *      pareciera un burro con poncho, PR #2782). El clima sí se le escribe en
 *      el cuerpo por tinte, que no tapa nada.
 *   6. Prop por mundo — la herramienta en la manito.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { Zariguya } from '../Zariguya.jsx';
import { auraDeBicho } from '../transformacion.js';
import { ZARIGUYA_FIRMA, ZARIGUYA_PROPORCION } from '../zariguyaIdentidad.js';
import { IDLE_PERFILES } from '../creatureIdle.js';
import { CREATURES } from '../index.js';

afterEach(cleanup);

describe('Zariguya — contrato base intacto', () => {
  it('render por defecto = svg accesible, sin capas nuevas', () => {
    const { container } = render(<Zariguya tier="medio" />);
    const svg = container.querySelector('svg[data-creature="zariguya"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('data-lineboil')).toBeNull();
    expect(svg.getAttribute('data-husmea')).toBeNull();
    expect(svg.getAttribute('data-tanatosis')).toBeNull();
    expect(svg.getAttribute('data-prop')).toBeNull();
    expect(container.querySelector('feDisplacementMap')).toBeNull();
    expect(container.querySelector('.is-powered-up')).toBeNull();
  });

  it('está registrada como el binomio correcto (Didelphis marsupialis)', () => {
    expect(CREATURES.zariguya).toBeTruthy();
    expect(CREATURES.zariguya.cientifico).toBe('Didelphis marsupialis');
  });

  it('tiene PERFIL IDLE propio (si no, se movería como la abeja)', () => {
    expect(IDLE_PERFILES.zariguya).toBeTruthy();
    expect(IDLE_PERFILES.zariguya.medio).toBe('suelo');
    // nocturna: de noche NO se apaga (es cuando sale a trabajar)
    expect(IDLE_PERFILES.zariguya.noche.freq).toBeGreaterThan(1);
  });
});

describe('1. LA FIRMA ES DE FORMA — sobrevive al negro sobre blanco', () => {
  it('el contrato de silueta es DATO y declara la prueba como obligatoria', () => {
    expect(ZARIGUYA_FIRMA.pruebaSilueta.obligatoria).toBe(true);
    // la criatura de la que hay que diferenciarse está nombrada (el gurre)
    expect(ZARIGUYA_FIRMA.pruebaSilueta.contraste).toMatch(/gurre|armadillo/i);
  });

  it('TODOS los rasgos de la firma son de forma (ninguno depende del color)', () => {
    expect(ZARIGUYA_FIRMA.rasgos.length).toBeGreaterThanOrEqual(4);
    // la lección del borugo: una firma dependiente del color es rechazo.
    expect(ZARIGUYA_FIRMA.rasgos.every((r) => r.forma === true)).toBe(true);
    const ids = ZARIGUYA_FIRMA.rasgos.map((r) => r.id);
    expect(ids).toContain('crias-al-lomo');
    expect(ids).toContain('hocico-cuna');
    expect(ids).toContain('cola-prensil');
    expect(ids).toContain('orejas-grandes');
  });

  it('las CRÍAS AL LOMO vienen por DEFECTO (el personaje base las lleva)', () => {
    const { container } = render(<Zariguya tier="medio" />);
    const svg = container.querySelector('svg');
    expect(svg.getAttribute('data-crias')).toBe(String(ZARIGUYA_PROPORCION.crias));
    expect(container.querySelectorAll('.zari-cria').length).toBe(ZARIGUYA_PROPORCION.crias);
  });

  it('la cola prensil, el hocico y las orejas están SIEMPRE (identidad, no opt-in)', () => {
    const { container } = render(<Zariguya tier="medio" />);
    expect(container.querySelector('.zari-cola')).toBeTruthy();
    expect(container.querySelector('.zari-hocico')).toBeTruthy();
    expect(container.querySelector('.zari-orejas')).toBeTruthy();
  });

  it('siguen dibujados aunque la criatura esté quieta (fotograma digno)', () => {
    const { container } = render(<Zariguya tier="medio" animated={false} />);
    // sin vida no se anima, pero la SILUETA no se negocia: los nodos siguen.
    expect(container.querySelector('.zari-cola')).toBeTruthy();
    expect(container.querySelector('.zari-hocico')).toBeTruthy();
    expect(container.querySelectorAll('.zari-cria').length).toBe(ZARIGUYA_PROPORCION.crias);
  });

  it('crias={0} es legítimo pero DEGRADA la firma (queda documentado por el data-attr)', () => {
    const { container } = render(<Zariguya tier="medio" crias={0} />);
    expect(container.querySelectorAll('.zari-cria').length).toBe(0);
    expect(container.querySelector('svg').getAttribute('data-crias')).toBeNull();
  });

  it('el hocico es una CUÑA más larga que el radio del cráneo (no un morro)', () => {
    // el rasgo diagnóstico es geométrico: si esto deja de cumplirse, la cabeza
    // se redondea y vuelve a leerse como cualquier bicho pequeño.
    expect(ZARIGUYA_PROPORCION.hocicoLargo).toBeGreaterThan(ZARIGUYA_PROPORCION.cabezaR);
  });
});

describe('2. Expresividad — line-boil, husmea y TANATOSIS', () => {
  it('lineBoil instancia el filtro de displacement (contorno que hierve)', () => {
    const { container } = render(<Zariguya tier="medio" lineBoil animated />);
    expect(container.querySelector('svg').getAttribute('data-lineboil')).toBe('1');
    expect(container.querySelector('feDisplacementMap')).toBeTruthy();
    expect(container.querySelector('feTurbulence')).toBeTruthy();
  });

  it('sin lineBoil NO se paga el filtro (frugal)', () => {
    const { container } = render(<Zariguya tier="medio" animated />);
    expect(container.querySelector('feDisplacementMap')).toBeNull();
  });

  it('husmea marca el estado (el hocico lee el aire, las vibrisas tiemblan)', () => {
    const { container } = render(<Zariguya tier="medio" husmea animated />);
    expect(container.querySelector('svg').getAttribute('data-husmea')).toBe('1');
    expect(container.querySelector('.zari-bigote')).toBeTruthy();
  });

  it('tanatosis marca el estado (se hace la muerta — con las crías encima)', () => {
    const { container } = render(<Zariguya tier="medio" tanatosis animated />);
    expect(container.querySelector('svg').getAttribute('data-tanatosis')).toBe('1');
    // aguantan agarradas: el gag no las tira
    expect(container.querySelectorAll('.zari-cria').length).toBe(ZARIGUYA_PROPORCION.crias);
    // y la cola sigue ahí para seguir enroscándose (no está muerta)
    expect(container.querySelector('.zari-cola')).toBeTruthy();
  });
});

describe('3. Lip-sync — el visema llega a la cara', () => {
  it('con visema V3 la boca abierta viaja a la cara (data-visema)', () => {
    const { container } = render(<Zariguya tier="medio" visema="V3" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBe('V3');
  });

  it('sin visema no marca data-visema (la sonrisa humilde de siempre)', () => {
    const { container } = render(<Zariguya tier="medio" />);
    expect(container.querySelector('svg').getAttribute('data-visema')).toBeNull();
  });
});

describe('4. Modo poder — aura ROSA DE LUNA de 4 capas (standalone)', () => {
  it('poder envuelve en .is-powered-up + corrientes, con aura ROSA (no dorada)', () => {
    const { container } = render(<Zariguya tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up');
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute('data-creature-poder')).toBe('zariguya');
    expect(wrap.getAttribute('style')).toContain(auraDeBicho('zariguya'));
    expect(auraDeBicho('zariguya')).not.toBe(auraDeBicho('abeja-angelita'));
    expect(container.querySelector('.poder-corrientes')).toBeTruthy();
  });

  it('las crías van DENTRO del power-up (la que carga no suelta a nadie)', () => {
    const { container } = render(<Zariguya tier="medio" poder />);
    const wrap = container.querySelector('.is-powered-up.zariguya-poder');
    expect(wrap).toBeTruthy();
    expect(wrap.querySelector('.zari-cria')).toBeTruthy();
  });
});

describe('5. NO se viste — la ruana opaca le taparía las crías', () => {
  it('no acepta vestuario: aunque se lo pasen, jamás pinta ruana ni sudor', () => {
    // `vestuario` no es parte de su API (va a `...rest` y muere ahí); el
    // contrato verificable es que NUNCA aparece ropa encima de la firma.
    const { container } = render(<Zariguya tier="medio" clima="noche" />);
    expect(container.querySelector('svg').getAttribute('data-ruana')).toBeNull();
    expect(container.querySelector('.crt-ruana')).toBeNull();
    expect(container.querySelector('.crt-sudor')).toBeNull();
  });

  it('el clima SÍ se le escribe en el cuerpo (tinte/opacidad, que no tapa nada)', () => {
    const { container } = render(<Zariguya tier="medio" clima="niebla" />);
    // bicho chico y nocturno: la niebla se la traga (perfil difusa 0.7)
    const svg = container.querySelector('svg[data-creature="zariguya"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('style') || '').toMatch(/filter|opacity/);
  });
});

describe('6. Prop por mundo — herramienta en la manito', () => {
  it('mundoId=suelo → carga la lupa', () => {
    const { container } = render(<Zariguya tier="medio" mundoId="suelo" />);
    expect(container.querySelector('svg').getAttribute('data-prop')).toBe('suelo');
    expect(container.querySelector('[data-prop="lupa"]')).toBeTruthy();
  });

  it('mundo sin prop mapeado → manitos libres (no rompe)', () => {
    const { container } = render(<Zariguya tier="medio" mundoId="mundo-fantasma" />);
    expect(container.querySelector('[data-prop="lupa"]')).toBeNull();
    expect(container.querySelector('svg[data-creature="zariguya"]')).toBeTruthy();
  });
});

describe('Anti-regresión — modo inline no rompe la escena', () => {
  it('inline devuelve un <g> con el data-creature y marca data-poder', () => {
    const { container } = render(
      <svg>
        <Zariguya tier="medio" inline poder mundoId="suelo" />
      </svg>,
    );
    const g = container.querySelector('g[data-creature="zariguya"]');
    expect(g).toBeTruthy();
    expect(g.getAttribute('data-poder')).toBe('1');
    expect(g.getAttribute('data-prop')).toBe('suelo');
  });
});
