/**
 * temas-fase2-juegos.test.jsx — Fase 2 de la integración de temas.
 *
 * Verifica que las superficies de los JUEGOS que tenían paleta PROPIA adopten
 * la PIEL del tema activo SOLO con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (dev),
 * y queden EXACTO como hoy con la flag OFF (prod, dark).
 *
 * El mecanismo: con la flag ON, los contenedores raíz reciben la clase
 * `fvh-skin` (de `fvhSkinClass`), bajo la cual `temas-fase2.css` retiñe la
 * atmósfera con los tokens --c-* del tema. Con OFF, la clase NO se aplica.
 *
 * Además: DoomFinca pinta su cielo en canvas (no lee CSS vars) → verificamos
 * que `paletaPorTema` seleccione la paleta correcta por tema sin tocar la
 * tierra (jugabilidad/legibilidad).
 *
 * Español de Colombia (tú/usted), sin voseo.
 */
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Flag mockeable: ON (dev) vs OFF (prod) en el mismo archivo.
let flagOn = false;
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

import FincaWorldScene from '../FincaWorldScene';
import MundoSubsuelo from '../MundoSubsuelo';
import DefensoresFincaScreen from '../DefensoresFincaScreen';
import { PALETA, PALETAS_TEMA, paletaPorTema } from '../doomFincaData';

const STAGE = {
  level: 2,
  cielo: ['#90cce0', '#d4ecd6'],
  tierra: ['#9a8456', '#7a9655'],
  arboles: 4,
  vida: 3,
  nombreNino: 'Bosque joven',
  mensaje: 'Tu finca está creciendo.',
};

beforeEach(() => {
  flagOn = false;
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('Fase 2 — FincaWorldScene adopta la piel del tema (gated)', () => {
  it('flag OFF (prod): el lienzo NO lleva la clase fvh-skin', () => {
    flagOn = false;
    render(<FincaWorldScene stage={STAGE} criaturas={[]} />);
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene).toHaveClass('fv-scene');
    expect(scene).not.toHaveClass('fvh-skin');
  });

  it('flag ON (dev): el lienzo adopta fvh-skin (atmósfera por tema)', () => {
    flagOn = true;
    render(<FincaWorldScene stage={STAGE} criaturas={[]} />);
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene).toHaveClass('fv-scene');
    expect(scene).toHaveClass('fvh-skin');
  });

  it('flag ON: el contenido (data-modo/level) NO cambia — solo la piel', () => {
    flagOn = true;
    render(<FincaWorldScene stage={STAGE} criaturas={[]} />);
    const scene = screen.getByTestId('finca-world-scene');
    expect(scene.getAttribute('data-modo')).toBe('mundo');
    expect(scene.getAttribute('data-level')).toBe('2');
  });
});

describe('Fase 2 — MundoSubsuelo: superficie + viñeta por tema (gated)', () => {
  it('flag OFF (prod): el <main> conserva su crema fija, SIN fvh-skin', () => {
    flagOn = false;
    render(<MundoSubsuelo />);
    const root = screen.getByTestId('mundo-subsuelo');
    // La crema fija sigue ahí y el marcador ms-root es inerte sin fvh-skin (el
    // CSS solo matchea `.fvh-skin.ms-root`) → prod queda EXACTO como hoy.
    expect(root).toHaveClass('bg-[#fff8e8]');
    expect(root).toHaveClass('ms-root');
    expect(root).not.toHaveClass('fvh-skin');
  });

  it('flag ON (dev): el <main> y la viñeta toman la superficie del tema', () => {
    flagOn = true;
    render(<MundoSubsuelo />);
    const root = screen.getByTestId('mundo-subsuelo');
    expect(root).toHaveClass('ms-root');
    expect(root).toHaveClass('fvh-skin');
    // La viñeta de la escena también se reskina.
    const vinneta = screen.getByTestId('mundo-subsuelo-escena');
    expect(vinneta).toHaveClass('ms-vinneta');
    expect(vinneta).toHaveClass('fvh-skin');
  });
});

describe('Fase 2 — Defensores de la Finca: lienzo por tema (gated)', () => {
  it('flag OFF (prod): el stage NO lleva fvh-skin (cielo fijo como hoy)', () => {
    flagOn = false;
    const { container } = render(<DefensoresFincaScreen />);
    const stage = container.querySelector('.df-stage');
    expect(stage).not.toBeNull();
    expect(stage.classList.contains('fvh-skin')).toBe(false);
  });

  it('flag ON (dev): el stage adopta fvh-skin (cielo del tema activo)', () => {
    flagOn = true;
    const { container } = render(<DefensoresFincaScreen />);
    const stage = container.querySelector('.df-stage');
    expect(stage).not.toBeNull();
    expect(stage.classList.contains('fvh-skin')).toBe(true);
  });
});

describe('Fase 2 — DoomFinca: paleta del cielo por tema (jugabilidad intacta)', () => {
  it('los 4 temas tienen paleta; tierra/jugabilidad NO cambia entre temas', () => {
    for (const tema of ['biopunk', 'nature', 'minimalista', 'verde-vivo']) {
      const pal = paletaPorTema(tema);
      expect(pal).toBeTruthy();
      // La tierra/surco/pasto/mulch (el piso jugable) se conserva = legibilidad.
      expect(pal.tierra).toEqual(PALETA.tierra);
      expect(pal.tierraSurco).toEqual(PALETA.tierraSurco);
      expect(pal.pasto).toEqual(PALETA.pasto);
      expect(pal.mulch).toEqual(PALETA.mulch);
      // El sol mantiene su azimut (posición en el mundo) para el parallax.
      expect(pal.solAzimut).toEqual(PALETA.solAzimut);
    }
  });

  it('biopunk usa la PALETA base; los claros retiñen el CIELO', () => {
    expect(paletaPorTema('biopunk')).toBe(PALETA);
    // verde-vivo, nature y minimalista cambian el cielo (atmósfera) del base.
    expect(PALETAS_TEMA['verde-vivo'].cieloAlto).not.toEqual(PALETA.cieloAlto);
    expect(PALETAS_TEMA.nature.cieloAlto).not.toEqual(PALETA.cieloAlto);
    expect(PALETAS_TEMA.minimalista.cieloAlto).not.toEqual(PALETA.cieloAlto);
  });

  it('contraste de profundidad: el cielo (claro) es más claro que la tierra', () => {
    // En un raycaster, leer profundidad depende de cielo claro arriba ↔ tierra
    // oscura abajo. Verificamos que en TODOS los temas el horizonte siga más
    // claro que el piso (suma RGB), o el juego perdería legibilidad.
    for (const tema of ['biopunk', 'nature', 'minimalista', 'verde-vivo']) {
      const pal = paletaPorTema(tema);
      const luzCielo = pal.cieloBajo[0] + pal.cieloBajo[1] + pal.cieloBajo[2];
      const luzTierra = pal.tierra[0] + pal.tierra[1] + pal.tierra[2];
      expect(luzCielo).toBeGreaterThan(luzTierra);
    }
  });

  it('un tema desconocido cae a la PALETA base (idéntico a hoy)', () => {
    expect(paletaPorTema('inexistente')).toBe(PALETA);
    expect(paletaPorTema(undefined)).toBe(PALETA);
  });
});
