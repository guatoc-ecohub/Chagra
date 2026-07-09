/**
 * QuinuaScreen — mundo "Quinua y granos andinos" (photo-forward, 5 estaciones).
 *
 * Contrato cubierto:
 *   - Las 5 estaciones son navegables y cada una muestra su contenido groundeado.
 *   - Los granos: quinua/amaranto/chía/cañihua/tarwi con su nombre científico y
 *     su pastilla de saponina (quinua se lava, tarwi se desamarga, el resto no).
 *   - Siembra: piso térmico por especie + las cifras de sitio como "dato en
 *     camino" (no se inventan dosis).
 *   - Desaponificado: el paso clave (lavar la saponina hasta que no haga espuma)
 *     + el desamargado del tarwi + los que NO se lavan (cañihua/amaranto/chía).
 *   - Mildiú: Peronospora variabilis + manejo agroecológico + guard anti-receta.
 *   - Cosecha/trilla + valor nutricional (ICBF: proteína/hierro; proteína
 *     completa y sin gluten de FAO/NRC).
 *   - Puentes: onBack; enlaces a salud_suelo, nutricion, biopreparados, agente.
 *   - Créditos de fotos con atribución (cumplimiento CC).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import QuinuaScreen from './QuinuaScreen';
import { CREDITOS_FOTOS_QUINUA } from '../../data/quinuaFinca';

afterEach(() => cleanup());

const irAEstacion = (id) => fireEvent.click(screen.getByTestId(`estacion-tab-${id}`));

describe('QuinuaScreen — navegación y portada', () => {
  it('arranca en «Los granos» y muestra las 5 pestañas', () => {
    render(<QuinuaScreen onBack={() => {}} onNavigate={() => {}} />);
    expect(screen.getByTestId('quinua-screen')).toBeTruthy();
    expect(screen.getByTestId('estacion-granos')).toBeTruthy();
    for (const id of ['granos', 'siembra', 'desaponificado', 'plagas', 'cosecha']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeTruthy();
    }
  });

  it('el botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<QuinuaScreen onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('QuinuaScreen — los granos (grounded catálogo)', () => {
  it('muestra las 5 especies con su nombre científico', () => {
    render(<QuinuaScreen onBack={() => {}} />);
    for (const id of ['quinua', 'amaranto', 'chia', 'canihua', 'tarwi']) {
      expect(screen.getByTestId(`grano-${id}`)).toBeTruthy();
    }
    expect(screen.getByText(/Chenopodium quinoa/i)).toBeTruthy();
    expect(screen.getByText(/Amaranthus caudatus/i)).toBeTruthy();
    expect(screen.getByText(/Chenopodium pallidicaule/i)).toBeTruthy();
    expect(screen.getByText(/Lupinus mutabilis/i)).toBeTruthy();
  });

  it('marca la quinua como «se lava» (saponina) y la cañihua como «no amarga»', () => {
    render(<QuinuaScreen onBack={() => {}} />);
    const quinua = screen.getByTestId('grano-quinua');
    expect(quinua.querySelector('[data-testid="saponina-quinua"]').textContent).toMatch(/se lava/i);
    const canihua = screen.getByTestId('grano-canihua');
    expect(canihua.querySelector('[data-testid="saponina-canihua"]').textContent).toMatch(/no amarga/i);
  });
});

describe('QuinuaScreen — siembra y piso térmico', () => {
  it('muestra el piso térmico por especie y no inventa dosis (dato en camino)', () => {
    const onNavigate = vi.fn();
    render(<QuinuaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('siembra');
    expect(screen.getByTestId('siembra-quinua')).toBeTruthy();
    expect(screen.getByTestId('siembra-canihua')).toBeTruthy();
    const dosis = screen.getByTestId('quinua-siembra-dosis');
    expect(dosis.querySelector('[data-testid="slot-grounded-pendiente"]')).toBeTruthy();
    fireEvent.click(screen.getByTestId('quinua-ir-suelo'));
    expect(onNavigate).toHaveBeenCalledWith('salud_suelo');
  });
});

describe('QuinuaScreen — el desaponificado (paso clave)', () => {
  it('muestra los pasos de lavado de la saponina y el desamargado del tarwi', () => {
    render(<QuinuaScreen onBack={() => {}} />);
    irAEstacion('desaponificado');
    for (const id of ['remojo', 'frote', 'enjuague']) {
      expect(screen.getByTestId(`desap-${id}`)).toBeTruthy();
    }
    // frotar hasta que el agua no haga espuma = la saponina saliendo
    const pasos = screen.getByTestId('quinua-desaponificado-pasos');
    expect(pasos.textContent).toMatch(/espuma/i);
    // el tarwi se desamarga aparte (alcaloides)
    expect(screen.getByTestId('quinua-desamargado-tarwi').textContent).toMatch(/alcaloides/i);
    // los que NO se lavan
    expect(screen.getByTestId('quinua-sin-desaponificar')).toBeTruthy();
  });

  it('enlaza al mundo de la nutrición', () => {
    const onNavigate = vi.fn();
    render(<QuinuaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('desaponificado');
    fireEvent.click(screen.getByTestId('quinua-ir-nutricion'));
    expect(onNavigate).toHaveBeenCalledWith('nutricion');
  });
});

describe('QuinuaScreen — mildiú y manejo (sin recetas químicas)', () => {
  it('muestra el mildiú (Peronospora) con manejo agroecológico y el guard anti-receta', () => {
    render(<QuinuaScreen onBack={() => {}} />);
    irAEstacion('plagas');
    expect(screen.getByTestId('mal-mildiu')).toBeTruthy();
    expect(screen.getByText(/Peronospora variabilis/i)).toBeTruthy();
    const nota = screen.getByTestId('quinua-nota-sin-recetas');
    expect(nota.textContent).toMatch(/no encontrará dosis de veneno/i);
  });

  it('enlaza a biopreparados y a "mi mata está enferma"', () => {
    const onNavigate = vi.fn();
    render(<QuinuaScreen onBack={() => {}} onNavigate={onNavigate} />);
    irAEstacion('plagas');
    fireEvent.click(screen.getByTestId('quinua-ir-biopreparados'));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByTestId('quinua-ir-sanidad'));
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma');
  });
});

describe('QuinuaScreen — cosecha, trilla y valor nutricional', () => {
  it('muestra los pasos de cosecha/trilla y el valor nutricional groundeado (ICBF)', () => {
    render(<QuinuaScreen onBack={() => {}} />);
    irAEstacion('cosecha');
    for (const id of ['punto', 'secado', 'trilla', 'guardar']) {
      expect(screen.getByTestId(`cosecha-${id}`)).toBeTruthy();
    }
    const valor = screen.getByTestId('quinua-valor-nutricional');
    expect(valor.textContent).toMatch(/proteína completa/i);
    expect(valor.textContent).toMatch(/sin gluten/i);
    // la cifra dura de la quinua viene del ICBF
    expect(screen.getByTestId('quinua-cifra-icbf').textContent).toMatch(/8,4 mg/i);
    expect(valor.textContent).toMatch(/ICBF/i);
  });
});

describe('QuinuaScreen — puente al agente y créditos de fotos', () => {
  it('el agente queda presente en el pie con prompt de quinua', () => {
    const onNavigate = vi.fn();
    render(<QuinuaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('quinua-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/desaponifico la quinua/i),
    }));
  });

  it('las fotos traen atribución (cumplimiento CC): todas con autor, licencia y fuente', () => {
    expect(CREDITOS_FOTOS_QUINUA.length).toBeGreaterThanOrEqual(6);
    for (const cr of CREDITOS_FOTOS_QUINUA) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toBeTruthy();
      expect(cr.fuenteUrl).toMatch(/^https?:\/\/([a-z0-9-]+\.)*wikimedia\.org\//);
    }
  });
});
