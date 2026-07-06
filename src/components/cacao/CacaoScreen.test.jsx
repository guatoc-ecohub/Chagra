/**
 * CacaoScreen.test.jsx — mundo "El cacao" (cultivo bandera de la paz).
 *
 * Cubre:
 *   1. Render base: las 5 estaciones navegables; arranca en "El árbol".
 *   2. El árbol: ficha groundeada (Theobroma cacao) + grupos genéticos + clones.
 *   3. La sombra (SAF): los 4 estratos + puente a "Buenas vecinas" (asociaciones).
 *   4. Siembra y poda: injerto de clon élite + podas.
 *   5. Sanidad: monilia y escoba de bruja con su síntoma clave y umbral
 *      groundeados; manejo CULTURAL (sin dosis químicas inventadas); "no confundir".
 *   6. Beneficio: fermentación en cajón + puente cáscara→abono (estiercol).
 *   7. Puente al agente (onNavigate con la pregunta prellenada).
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CacaoScreen from './CacaoScreen.jsx';

afterEach(() => cleanup());

describe('CacaoScreen — render base', () => {
  it('monta la pantalla con las 5 estaciones y arranca en El árbol', () => {
    render(<CacaoScreen onBack={() => {}} />);
    expect(screen.getByTestId('cacao-screen')).toBeInTheDocument();
    for (const id of ['arbol', 'sombra', 'manejo', 'sanidad', 'beneficio']) {
      expect(screen.getByTestId(`estacion-tab-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('estacion-arbol')).toBeInTheDocument();
  });
});

describe('CacaoScreen — El árbol (ficha + variedades)', () => {
  it('muestra la ficha groundeada y las familias genéticas', () => {
    render(<CacaoScreen onBack={() => {}} />);
    const s = screen.getByTestId('estacion-arbol');
    expect(s).toHaveTextContent(/Theobroma cacao/i);
    // Grupos genéticos: criollo (fino de aroma) vs forastero vs trinitario.
    expect(screen.getByTestId('grupo-criollo')).toHaveTextContent(/fino de aroma/i);
    expect(screen.getByTestId('grupo-trinitario')).toBeInTheDocument();
    // Clones de registro nombrados (CCN-51, ICS, regionales colombianos).
    expect(screen.getByTestId('clon-ccn51')).toHaveTextContent(/CCN-51/i);
    expect(screen.getByTestId('clon-regionales')).toHaveTextContent(/AGROSAVIA|FEAR-5|TCS/i);
  });
});

describe('CacaoScreen — La sombra (sistema agroforestal)', () => {
  it('muestra los estratos y enlaza a Buenas vecinas', () => {
    const onNavigate = vi.fn();
    render(<CacaoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('estacion-tab-sombra'));
    for (const id of ['cacao', 'platano', 'leguminosa', 'maderable']) {
      expect(screen.getByTestId(`estrato-${id}`)).toBeInTheDocument();
    }
    // El plátano es sombra temporal; la leguminosa fija nitrógeno.
    expect(screen.getByTestId('estrato-leguminosa')).toHaveTextContent(/nitr[oó]geno/i);
    fireEvent.click(screen.getByTestId('cacao-link-asociaciones'));
    expect(onNavigate).toHaveBeenCalledWith('asociaciones');
  });
});

describe('CacaoScreen — Siembra y poda', () => {
  it('recomienda el injerto de clon élite y lista las podas', () => {
    render(<CacaoScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('estacion-tab-manejo'));
    expect(screen.getByTestId('propagacion-injerto')).toHaveTextContent(/clon/i);
    expect(screen.getByTestId('poda-sanitaria')).toBeInTheDocument();
  });
});

describe('CacaoScreen — Monilia y escoba de bruja (sanidad)', () => {
  it('reconoce la monilia por su síntoma clave y su umbral, con manejo cultural', () => {
    render(<CacaoScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('estacion-tab-sanidad'));
    const monilia = screen.getByTestId('enfermedad-monilia');
    // Nombre científico groundeado (grafo chagra_kg).
    expect(monilia).toHaveTextContent(/Moniliophthora roreri/i);
    // Síntoma clave: el polvo blanco cremoso sobre la mancha café.
    expect(monilia).toHaveTextContent(/polvo blanco/i);
    // Umbral de acción groundeado: 2% de mazorcas enfermas.
    expect(monilia).toHaveTextContent(/2%/);
    // Manejo cultural: ronda sanitaria cada 7 a 15 días (no un químico).
    expect(monilia).toHaveTextContent(/ronda sanitaria/i);
    expect(monilia).toHaveTextContent(/7 a 15 d[ií]as/i);
  });

  it('muestra la escoba de bruja y NO da dosis químicas inventadas', () => {
    render(<CacaoScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('estacion-tab-sanidad'));
    const escoba = screen.getByTestId('enfermedad-escoba-bruja');
    expect(escoba).toHaveTextContent(/Moniliophthora perniciosa/i);
    expect(escoba).toHaveTextContent(/escoba/i);
    // Donde se menciona el cobre, es "de registro ICA" y sin dosis (no receta).
    expect(escoba).toHaveTextContent(/registro ICA/i);
    // No aparece ninguna cifra de dosis (cc, gramos, litros por bomba…).
    expect(escoba.textContent).not.toMatch(/\d+\s?(cc|g\/L|gramos por|ml por|cc por)/i);
  });

  it('separa monilia, escoba y mazorca negra para no confundirlas', () => {
    render(<CacaoScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('estacion-tab-sanidad'));
    const noConf = screen.getByTestId('cacao-no-confundir');
    expect(noConf).toHaveTextContent(/mazorca negra|pudrici[oó]n parda/i);
    expect(screen.getByTestId('confundir-mazorca-negra')).toHaveTextContent(/Phytophthora/i);
  });
});

describe('CacaoScreen — Cosecha y beneficio', () => {
  it('explica la fermentación en cajón y enlaza la cáscara al mundo del abono', () => {
    const onNavigate = vi.fn();
    render(<CacaoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('estacion-tab-beneficio'));
    // Fermentación en cajones de madera (define el sabor/precio).
    expect(screen.getByTestId('beneficio-fermentacion')).toHaveTextContent(/caj[oó]n|caj[oó]nes|cajones/i);
    // La cáscara vuelve al suelo → enlaza al mundo "Del corral al abono".
    fireEvent.click(screen.getByTestId('cacao-link-estiercol'));
    expect(onNavigate).toHaveBeenCalledWith('estiercol');
  });
});

describe('CacaoScreen — puente al agente', () => {
  it('navega al agente con la pregunta prellenada sobre el cacao', () => {
    const onNavigate = vi.fn();
    render(<CacaoScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('cacao-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/cacao|monilia/i),
    }));
  });
});
