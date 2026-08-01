// @ts-nocheck
/**
// @ts-nocheck
 * temas-fase2-1-contraste.test.jsx — Fase 2.1: CONTRASTE de texto por tema.
 *
 * El test visual integral encontró que en los TEMAS CLAROS (nature/minimalista),
 * con la flag VITE_FINCA_VIVA_HOME_PERFIL ON, varios textos del HUB de juego, del
 * Directorio y del Doom quedaban ILEGIBLES: el FONDO de los paneles ya viraba a
 * superficie clara del tema (Fase 2), pero el TEXTO seguía en utilidades Tailwind
 * pensadas para fondo oscuro (text-white / text-emerald-50/100/200…) → claro
 * sobre claro.
 *
 * El fix tona ese texto vía las CSS vars del tema, marcándolo con clases
 * semánticas (`jp-tinta` principal, `jp-tinta-suave` secundario, `jp-acento-vida`
 * para el verde legible). Las reglas viven en juego-pulido.css bajo `.fvh-skin`
 * y solo se ACTIVAN con la flag ON (la clase fvh-skin se monta en el contenedor).
 * Con la flag OFF (prod), el contenedor NO lleva fvh-skin → el texto conserva su
 * utilidad Tailwind original (dark) y prod queda EXACTO como hoy.
 *
 * Este test verifica el CONTRATO estructural: (1) el texto-cuerpo afectado lleva
 * la clase semántica de tinta (toma var del tema, no un color lavado fijo); y
 * (2) el gating fvh-skin ON/OFF en el contenedor raíz. NO renderiza pixeles
 * (sin chromium): la legibilidad real (ratios AA) se valida aparte con rsvg.
 *
 * Español de Colombia (tú/usted), sin voseo.
 */
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Flag mockeable: ON (dev) vs OFF (prod) en el mismo archivo.
let flagOn = false;
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

// IDB de procesos: finca vacía por defecto → el hub muestra la invitación.
const listFarmProcessesMock = vi.fn(() => Promise.resolve([]));
const getFarmEventsMock = vi.fn(() => Promise.resolve([]));
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: (...a) => listFarmProcessesMock(...a),
  getFarmEvents: (...a) => getFarmEventsMock(...a),
}));
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getProfile: () => ({ fincaSlug: 'finca-juli' }) };
});
vi.mock('../../../services/ttsService', () => ({
  speak: vi.fn(), stop: vi.fn(), isSupported: () => false,
}));
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { chime: vi.fn(), listen: vi.fn(), start: vi.fn(), error: vi.fn(), cancel: vi.fn() },
  isSoundEnabled: () => false,
  setSoundEnabled: vi.fn(),
}));
vi.mock('../../../services/usageTelemetryService', () => ({
  recordGameStart: vi.fn(), recordGameComplete: vi.fn(),
}));

// Directorio: catálogo mockeado para un resultado de búsqueda determinista.
const searchSpeciesMock = vi.fn(() => Promise.resolve([
  { id: 'coffea_arabica', comun: 'Café', cientifico: 'Coffea arabica', familia: 'Rubiaceae' },
]));
vi.mock('../../../services/directorioEspecies.js', () => ({
  searchSpecies: (...a) => searchSpeciesMock(...a),
  buildSpeciesFicha: vi.fn(() => Promise.resolve(null)),
}));

import MiFincaVivaScreen from '../MiFincaVivaScreen';
import DirectorioEspeciesScreen from '../../DirectorioEspecies/DirectorioEspeciesScreen';

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

describe('Fase 2.1 — Mi Finca Viva (hub): texto-cuerpo toma tinta del tema', () => {
  it('el título del mundo y el mensaje llevan la clase de tinta del tema', () => {
    flagOn = true;
    render(<MiFincaVivaScreen />);
    // "La tierra que despierta" (estado vacío): el título del mundo.
    const titulo = screen.getByText('La tierra que despierta');
    expect(titulo).toHaveClass('jp-tinta');
    // El mensaje del mundo también vira a tinta del tema.
    const mensaje = screen.getByText(/Tu finca está empezando/);
    expect(mensaje).toHaveClass('jp-tinta');
  });

  it('las descripciones de los subjuegos llevan tinta SUAVE (legible AA)', () => {
    flagOn = true;
    render(<MiFincaVivaScreen />);
    const desc = screen.getByText(/Corre y salta por la finca/);
    expect(desc).toHaveClass('jp-tinta-suave');
    const descMilpa = screen.getByText(/Siembra maíz, fríjol y ahuyama/);
    expect(descMilpa).toHaveClass('jp-tinta-suave');
    const descDoom = screen.getByText(/Recorre el invernadero/);
    expect(descDoom).toHaveClass('jp-tinta-suave');
  });

  it('flag ON: el contenedor raíz del hub adopta fvh-skin (reglas de tinta activas)', () => {
    flagOn = true;
    render(<MiFincaVivaScreen />);
    expect(screen.getByTestId('mi-finca-viva-screen')).toHaveClass('fvh-skin');
  });

  it('flag OFF (prod): el hub NO lleva fvh-skin → las reglas de tinta no aplican', () => {
    flagOn = false;
    render(<MiFincaVivaScreen />);
    expect(screen.getByTestId('mi-finca-viva-screen')).not.toHaveClass('fvh-skin');
  });
});

describe('Fase 2.1 — Directorio de especies: título de resultado toma tinta del tema', () => {
  it('flag ON: el contenedor raíz adopta fvh-skin (jp-directorio)', () => {
    flagOn = true;
    const { container } = render(<DirectorioEspeciesScreen />);
    const root = container.firstChild;
    expect(root).toHaveClass('jp-directorio');
    expect(root).toHaveClass('fvh-skin');
  });

  it('flag OFF (prod): el contenedor NO lleva fvh-skin → dark intacto', () => {
    flagOn = false;
    const { container } = render(<DirectorioEspeciesScreen />);
    const root = container.firstChild;
    expect(root).toHaveClass('jp-directorio');
    expect(root).not.toHaveClass('fvh-skin');
  });

  it('el nombre común (título) lleva jp-tinta — ya NO el emerald lavado', async () => {
    flagOn = true;
    render(<DirectorioEspeciesScreen initialQuery="café" />);
    const titulo = await waitFor(() => screen.getByText('Café'));
    expect(titulo).toHaveClass('jp-tinta');
    // El binomio (científico) usa tinta suave (legible, secundario).
    const binomio = screen.getByText('Coffea arabica');
    expect(binomio).toHaveClass('jp-tinta-suave');
  });
});
