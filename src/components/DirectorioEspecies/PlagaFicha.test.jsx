import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlagaFicha from './PlagaFicha.jsx';

const FICHA_COMPLETA = {
  id: 'hypothenemus_hampei',
  nombreComun: 'broca del café',
  binomio: 'Hypothenemus hampei',
  tipo: 'insecto',
  tipoLabel: 'Insecto',
  tipoEmoji: '🐛',
  confianza: 'alta',
  confianzaLabel: 'Confianza alta',
  vineta: 'frutoBroca',
  emoji: '🔩',
  imagen: null,
  reconocer: {
    pistas: [
      { sintoma: 'Broca (café)', pista: 'Un huequito en la punta del grano; por dentro va comida.', nota: null, emoji: '🔩', vineta: 'frutoBroca' },
    ],
    confusiones: ['tizón temprano', 'antracnosis de la mora'],
  },
  cultivos: [{ id: 'cafe', label: 'Café', emoji: '☕' }],
  especiesAfectadas: [
    { id: 'coffea_arabica', comun: 'Café', cientifico: 'Coffea arabica', enCatalogo: true },
  ],
  ciclo: { umbral: 'Infestación mayor al 2 % de los frutos (Cenicafé).' },
  manejo: {
    biopreparado: null,
    biologico: 'Beauveria bassiana (mezcla Cenicafé).',
    controladores: ['Avispa parasitoide', 'Hongo entomopatógeno'],
    cultural: 'RE-RE: recolección oportuna y repase de frutos del suelo.',
    prevencion: 'No dejar frutos maduros ni caídos.',
  },
  notaSuave: null,
  dosisPendiente: false,
  fuente: 'Cenicafé',
  plagaGrafo: 'Broca del café',
};

const FICHA_VACIA = {
  id: 'x',
  nombreComun: 'Plaga sin datos',
  binomio: 'Ignota sp.',
  tipo: 'insecto',
  tipoLabel: 'Insecto',
  tipoEmoji: '🐛',
  confianza: 'media',
  confianzaLabel: 'Confianza media',
  vineta: 'manchaOjo',
  emoji: '🐛',
  imagen: null,
  reconocer: { pistas: [], confusiones: [] },
  cultivos: [],
  especiesAfectadas: [],
  ciclo: { umbral: null },
  manejo: { biopreparado: null, biologico: null, controladores: [], cultural: null, prevencion: null },
  notaSuave: null,
  dosisPendiente: false,
  fuente: null,
  plagaGrafo: null,
};

describe('PlagaFicha', () => {
  it('renderiza identidad y secciones con datos', () => {
    render(<PlagaFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByText('broca del café')).toBeInTheDocument();
    expect(screen.getByText('Hypothenemus hampei')).toBeInTheDocument();
    expect(screen.getByTestId('ficha-reconocer')).toBeInTheDocument();
    expect(screen.getByText(/huequito en la punta/)).toBeInTheDocument();
    expect(screen.getByTestId('ficha-cultivos')).toBeInTheDocument();
    // "Café" aparece como cultivo (chip) y como especie del grafo.
    expect(screen.getAllByText('Café').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Coffea arabica/)).toBeInTheDocument();
  });

  it('surfacea el manejo agroecológico y los controladores del grafo', () => {
    render(<PlagaFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByTestId('ficha-manejo')).toBeInTheDocument();
    expect(screen.getByText(/Beauveria bassiana/)).toBeInTheDocument();
    expect(screen.getByTestId('ficha-controladores')).toBeInTheDocument();
    expect(screen.getByText('Avispa parasitoide')).toBeInTheDocument();
    // Doctrina anti-veneno visible.
    expect(screen.getByText(/sin veneno/i)).toBeInTheDocument();
  });

  it('muestra el umbral y la procedencia', () => {
    render(<PlagaFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByText(/2 % de los frutos/)).toBeInTheDocument();
    expect(screen.getByTestId('plaga-procedencia')).toBeInTheDocument();
    expect(screen.getByText('Cenicafé')).toBeInTheDocument();
  });

  it('renderiza "con qué se confunde" cuando hay polisemia', () => {
    render(<PlagaFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByTestId('ficha-confusiones')).toBeInTheDocument();
    expect(screen.getByText(/tizón temprano/)).toBeInTheDocument();
  });

  it('muestra el fallback ilustrado (viñeta) cuando no hay foto', () => {
    render(<PlagaFicha ficha={FICHA_COMPLETA} />);
    expect(screen.getByTestId('plaga-photo-fallback')).toBeInTheDocument();
  });

  it('renderiza la foto CC cuando existe imagen, con crédito', () => {
    const ficha = {
      ...FICHA_COMPLETA,
      imagen: { url: '/plaga-images/x.jpg', license: 'CC BY-SA 4.0', rightsHolder: 'Autor', source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:x' },
    };
    render(<PlagaFicha ficha={ficha} />);
    expect(screen.getByAltText(/Foto de broca/)).toBeInTheDocument();
    expect(screen.getByText(/CC BY-SA 4.0/)).toBeInTheDocument();
  });

  it('deflección honesta en secciones sin datos', () => {
    render(<PlagaFicha ficha={FICHA_VACIA} />);
    expect(screen.getAllByText(/dato en camino/i).length).toBeGreaterThan(0);
  });

  it('no rompe con ficha null', () => {
    const { container } = render(<PlagaFicha ficha={null} />);
    expect(container.firstChild).toBeNull();
  });
});
