/**
 * ClimaBoletinScreen.test.jsx — La Página del Tiempo (rediseño 3 horizontes).
 *
 * Cubre el contrato que NO puede regresar con el rediseño:
 *   1. Render base: cielo ENSO + los 3 HORIZONTES navegables (Hoy / 7–16d / El Niño).
 *   2. Hoy sin ubicación: degrada honesto (SlotPendiente), no inventa números.
 *   3. El Niño: fase EN VIVO de ensoService (default Neutral, fuente base) y su
 *      reflejo real al fijar El Niño (no reimplementa el motor).
 *   4. El Niño: regla insignia por fase + lectura regional (familia correcta) +
 *      boletines IDEAM/MTA/Fenalce + checklist + anti-alucinación (SlotPendiente).
 *   5. Puente al agente (onNavigate).
 *
 * La red (snapshot ENSO + Open-Meteo) se mockea a `null`: la pantalla debe
 * funcionar offline-first sin inventar datos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ClimaBoletinScreen from './ClimaBoletinScreen.jsx';
import { setEnsoPhase, clearEnsoPhase } from '../../services/ensoService.js';
import { fetchAgroMeteo, fetchNormales } from '../../services/agroMeteoService.js';

// Perfil andino (Boyacá) → región 'andina' para la lectura regional.
vi.mock('../../services/userProfileService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, getProfile: () => ({ departamento: 'boyacá' }) };
});

// Red apagada: sin ubicación resoluble ni fetch — la UI degrada honesta.
vi.mock('../../services/climaService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchClimaSnapshot: vi.fn(async () => null) };
});
vi.mock('../../services/agroMeteoService', async (importActual) => {
  const actual = await importActual();
  return { ...actual, fetchAgroMeteo: vi.fn(async () => null), fetchNormales: vi.fn(async () => null) };
});

const gotoElNino = () => fireEvent.click(screen.getByTestId('horizonte-tab-estacional'));

beforeEach(() => {
  cleanup();
  clearEnsoPhase();
  try { localStorage.clear(); } catch { /* jsdom */ }
});

describe('La página del tiempo — render base', () => {
  it('monta con el cielo ENSO y los 3 horizontes', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    expect(screen.getByTestId('clima-boletin-screen')).toBeInTheDocument();
    expect(screen.getByTestId('cielo-enso')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-hoy')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-semana')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-tab-estacional')).toBeInTheDocument();
    expect(screen.getByTestId('horizonte-hoy')).toBeInTheDocument();
  });
});

describe('La página del tiempo — Hoy degrada honesto sin datos', () => {
  it('sin ubicación no inventa números: muestra SlotPendiente', async () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    // Tras resolver la red (mock → null), Hoy degrada al estado honesto sin datos.
    const slots = await screen.findAllByTestId('slot-grounded-pendiente');
    expect(slots.length).toBeGreaterThanOrEqual(1);
  });
});

describe('La página del tiempo — El Niño lee la fase ENSO en vivo', () => {
  it('sin override muestra Neutral y la fuente honesta (valor base)', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('Neutral');
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/base|conexión/i);
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'neutral');
  });

  it('refleja la fase cuando el operador fija El Niño (no la inventa)', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-fase-label')).toHaveTextContent('El Niño');
    expect(screen.getByTestId('clima-fuente-fase')).toHaveTextContent(/mano/i);
    expect(screen.getByTestId('cielo-enso')).toHaveAttribute('data-family', 'nino');
  });
});

describe('La página del tiempo — regla accionable y lectura regional', () => {
  it('con El Niño da la regla insignia: material PRECOZ', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/PRECOZ/i);
  });

  it('con La Niña la regla apunta al EXCESO de agua', () => {
    setEnsoPhase('la_nina');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-regla-insignia')).toHaveTextContent(/EXCESO de agua/i);
  });

  it('bajo El Niño y perfil andino muestra el impacto regional del Niño', () => {
    setEnsoPhase('el_nino');
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-region-linea')).toHaveTextContent(/El Niño en los Andes/i);
  });
});

describe('La página del tiempo — El Niño remite y prepara', () => {
  it('lista boletines IDEAM, MTA (regional andina), Fenalce y el checklist', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('boletin-agrometeorologico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-agroclimatico')).toBeInTheDocument();
    expect(screen.getByTestId('boletin-enso')).toBeInTheDocument();
    expect(screen.getByTestId('clima-mta')).toBeInTheDocument();
    expect(screen.getByTestId('clima-mta-regional')).toHaveTextContent(/Andina/i);
    expect(screen.getByTestId('clima-fenalce')).toBeInTheDocument();
    expect(screen.getByTestId('clima-checklist')).toBeInTheDocument();
  });

  it('la cifra ENSO que caduca se pinta como dato en camino', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-elnino-2027')).toBeInTheDocument();
    expect(screen.getAllByTestId('slot-grounded-pendiente').length).toBeGreaterThanOrEqual(1);
  });
});

describe('La página del tiempo — El Niño mes a mes + ventana de siembra MTA', () => {
  it('renderiza el timeline ENSO con las 4 fases y el resumen de alivio', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-enso-timeline')).toBeInTheDocument();
    expect(screen.getByTestId('enso-cal-fortalecimiento')).toBeInTheDocument();
    expect(screen.getByTestId('enso-cal-pico')).toBeInTheDocument();
    expect(screen.getByTestId('enso-cal-persistencia')).toBeInTheDocument();
    expect(screen.getByTestId('enso-cal-transicion')).toBeInTheDocument();
    // "Cuándo se alivia" + enlace al pronóstico ENSO EN VIVO (no snapshot).
    expect(screen.getByTestId('clima-enso-alivio')).toHaveTextContent(/alivia/i);
    const live = screen.getByTestId('clima-enso-live-link');
    expect(live).toHaveAttribute('target', '_blank');
    expect(live.getAttribute('href')).toMatch(/^https?:\/\/.*noaa/i);
  });

  it('la transición a Neutral se marca como dato en camino (no inventa cifra)', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    const trans = screen.getByTestId('enso-cal-transicion');
    // grounded_pendiente en la fila de transición (probFoto null).
    expect(trans.querySelector('[data-testid="slot-grounded-pendiente"]')).not.toBeNull();
  });

  it('la ventana de siembra MTA deflecta honesto y enlaza al boletín en vivo', () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    gotoElNino();
    expect(screen.getByTestId('clima-mta-ventana')).toBeInTheDocument();
    // No inventa la fecha: remite al boletín (deflección honesta).
    expect(screen.getByTestId('clima-mta-ventana-pendiente')).toHaveTextContent(/no la inventa|boletín/i);
    const link = screen.getByTestId('clima-mta-ventana-live');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('href')).toMatch(/^https?:\/\//i);
  });
});

describe('La página del tiempo — 7–16 días remite a la fuente oficial', () => {
  it('con pronóstico, el Open-Meteo enlaza al BSA del IDEAM en vivo', async () => {
    // Con días de pronóstico, la pestaña 7–16 muestra el contraste con la fuente
    // oficial (BSA IDEAM, link vivo). La red se resuelve con daily mockeado.
    const daily = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-08-${String(24 + i).padStart(2, '0')}`,
      temp_max: 20, temp_min: 9, precip_mm: 1, precip_prob: 30,
      viento_max: 10, sol_horas: 6, rh_mean: 70,
    }));
    vi.mocked(fetchAgroMeteo).mockResolvedValueOnce({ daily });
    render(<ClimaBoletinScreen onBack={() => {}} location={{ lat: 5.5, lng: -73.4, municipio: 'Villa de Leyva' }} />);
    fireEvent.click(screen.getByTestId('horizonte-tab-semana'));
    const bsa = await screen.findByTestId('clima-bsa-link');
    expect(bsa).toHaveAttribute('target', '_blank');
    expect(bsa.getAttribute('href')).toMatch(/ideam\.gov\.co.*bsa/i);
  });
});

describe('La página del tiempo — motores agroclimáticos', () => {
  it('muestra horas-frío y SPI con sus fuentes cuando llegan los datos', async () => {
    vi.mocked(fetchAgroMeteo).mockResolvedValueOnce({
      now: { temp: 6, rh: 80, weather: { emoji: '🌤️', label: 'Casi despejado' } },
      today: { temp_max: 12, temp_min: 4, precip_mm: 2, eto_mm: 4, horas_frio: 3, uv_max: 2 },
      daily: [],
    });
    vi.mocked(fetchNormales).mockResolvedValueOnce({
      temp_media_normal: 8,
      precip_dia_normal: 6,
      precip_dia_desv: 2,
      balance_dia_normal: 0,
      balance_dia_desv: 2,
      source: 'Open-Meteo archive (ERA5)',
    });

    render(<ClimaBoletinScreen onBack={() => {}} location={{ lat: 5.5, lng: -73.4 }} />);

    const frio = await screen.findByTestId('clima-indice-horas-frio');
    expect(frio).toHaveTextContent('3');
    expect(frio).toHaveTextContent('Open-Meteo');

    const indiceSpi = await screen.findByTestId('clima-indice-spi');
    expect(indiceSpi).toHaveTextContent('-2');
    expect(indiceSpi).toHaveTextContent('Open-Meteo archive (ERA5)');

    const indiceSpei = await screen.findByTestId('clima-indice-spei');
    expect(indiceSpei).toHaveTextContent('-1');
    expect(indiceSpei).toHaveTextContent('ETc de referencia');
  });
});

describe('La página del tiempo — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<ClimaBoletinScreen onBack={() => {}} onNavigate={onNavigate} />);
    gotoElNino();
    fireEvent.click(screen.getByTestId('clima-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/sembrar|clima/i),
    }));
  });
});

describe('La página del tiempo — puente al mundo 3D', () => {
  it('muestra el botón al mundo 3D y navega correctamente', () => {
    const onNavigate = vi.fn();
    render(<ClimaBoletinScreen onBack={() => {}} onNavigate={onNavigate} />);
    const btnMundo3d = screen.getByTestId('clima-ver-mundo3d');
    expect(btnMundo3d).toBeInTheDocument();
    expect(btnMundo3d).toHaveTextContent(/Ver el mundo del clima en 3D/i);
    fireEvent.click(btnMundo3d);
    expect(onNavigate).toHaveBeenCalledWith('mockup_mundo3d_clima');
  });
});

/* ── Unificación 2D (spec 2026-09-06-unificar-2d-clima) ─────────────────── */
describe('La página del tiempo — la escena atmosférica vive detrás del dato', () => {
  it('monta la escena aria-hidden con las capas y el contenido encima; sin ubicación no hay data-clima (CA-6)', async () => {
    render(<ClimaBoletinScreen onBack={() => {}} />);
    const escena = screen.getByTestId('escena-atmosfera');
    expect(escena).toHaveAttribute('aria-hidden', 'true');
    expect(escena.querySelectorAll('.ca-gota').length).toBe(30);
    expect(escena.querySelectorAll('.ca-frailejon').length).toBe(4);
    const root = screen.getByTestId('escena-atmosfera-root');
    expect(root.hasAttribute('data-clima')).toBe(false);
    expect(['amanecer', 'dia', 'atardecer', 'noche']).toContain(root.getAttribute('data-luz'));
    await screen.findByTestId('clima-sin-dato');
    expect(document.documentElement.hasAttribute('data-clima')).toBe(false);
  });

  it('con dato real: la cabecera, la cifra grande, la lectura del cielo y la condición reindexan la escena (CA-1, CA-2)', async () => {
    vi.mocked(fetchAgroMeteo).mockResolvedValueOnce({
      available: true, elevation: 2680,
      now: { temp: 16.2, aparente: 13, rh: 62, dew: 9, cloud: 82, precip: 0, weather: { emoji: '☁️', label: 'Nublado', family: 'nubes' } },
      today: { date: '2026-09-05', temp_max: 18, temp_min: 11.8, precip_mm: 1.8, precip_prob: 94, eto_mm: 3.71, uv_max: 9, horas_frio: 0, cloud_mean: 70 },
      daily: [{ date: '2026-09-05', precip_mm: 1.8, cloud_mean: 70, temp_max: 18, temp_min: 11.8 }],
    });
    render(<ClimaBoletinScreen onBack={() => {}} location={{ lat: 4.9345, lng: -73.8331, elevation: 2680, municipio: 'Guatavita', vereda: 'El Volador' }} />);
    const cifra = await screen.findByTestId('clima-cifra-grande');
    expect(screen.getByTestId('clima-temp')).toHaveTextContent('16°C');
    expect(screen.getByTestId('clima-se-siente')).toHaveTextContent(/Se siente como 13 °C/);
    expect(cifra).toBeInTheDocument();
    expect(screen.getByTestId('clima-migaja')).toHaveTextContent(/Guatavita/);
    expect(screen.getByTestId('clima-migaja')).toHaveTextContent(/2 680 m s\. n\. m\./) // jest-dom normaliza el U+202F a espacio;
    expect(screen.getByTestId('clima-migaja')).toHaveTextContent(/piso frío/);
    expect(screen.getByTestId('clima-condicion')).toHaveTextContent('Nublado');
    expect(screen.getByTestId('clima-lectura-cielo')).toHaveTextContent(/Cielo cubierto|Niebla/);
    // A 2 680 m con 82 % de nubes el servicio dice NIEBLA (regla de piso frío);
    // la escena y el <html> global obedecen al servicio, no a un chip.
    const root = screen.getByTestId('escena-atmosfera-root');
    expect(root.getAttribute('data-clima')).toBe('niebla');
    expect(document.documentElement.getAttribute('data-clima')).toBe('niebla');
    expect(screen.getByTestId('clima-boletin-screen')).toHaveAttribute('data-escena-fuente', 'openmeteo');
    // ninguna cadena de muestra del mockup (CA-5)
    const texto = document.body.textContent;
    for (const muestra of ['doña Rosa', 'Finca La Esperanza', 'DATOS DE MUESTRA', 'Datos de muestra', '10:40 a. m.']) {
      expect(texto).not.toContain(muestra);
    }
  });

  it('la helada aparece como banda de alerta (D-3), nunca como piel', async () => {
    vi.mocked(fetchAgroMeteo).mockResolvedValueOnce({
      available: true, elevation: 2680,
      now: { temp: 6, aparente: 3, rh: 70, cloud: 5, precip: 0, weather: { emoji: '☀️', label: 'Despejado', family: 'sol' } },
      today: { date: '2026-09-05', temp_max: 15, temp_min: 1.5, precip_mm: 0, eto_mm: 3, uv_max: 8, cloud_mean: 10 },
      daily: [{ date: '2026-09-05', precip_mm: 0, cloud_mean: 10, temp_max: 15, temp_min: 1.5 }],
    });
    render(<ClimaBoletinScreen onBack={() => {}} location={{ lat: 4.9345, lng: -73.8331, elevation: 2680, municipio: 'Guatavita' }} />);
    const banda = await screen.findByTestId('clima-banda-helada');
    expect(banda).toHaveAttribute('data-origen', 'derivado');
    expect(banda).toHaveTextContent(/1,5 °C/);
    expect(screen.getByTestId('escena-atmosfera-root').getAttribute('data-clima')).toBe('despejado');
  });

  it('el bloque pedagógico de la anomalía trata de usted (CA-7)', async () => {
    vi.mocked(fetchAgroMeteo).mockResolvedValueOnce({
      available: true, elevation: 2680,
      now: { temp: 16, aparente: 13, rh: 62, cloud: 30, precip: 0, weather: { emoji: '🌤️', label: 'Casi despejado', family: 'sol' } },
      today: { date: '2026-09-05', temp_max: 18, temp_min: 9, precip_mm: 0, eto_mm: 3.7, uv_max: 6, cloud_mean: 30 },
      daily: [],
    });
    render(<ClimaBoletinScreen onBack={() => {}} location={{ lat: 4.9345, lng: -73.8331, elevation: 2680 }} />);
    const chip = await screen.findByTestId('que-es-anomalia');
    fireEvent.click(chip);
    const texto = document.body.textContent;
    expect(texto).toMatch(/Imagine que cada día/);
    expect(texto).not.toMatch(/\btu estatura\b|\btu edad\b|Imagina que/);
  });
});
