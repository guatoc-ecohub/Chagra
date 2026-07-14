/**
 * PreguntarVecinoPanel — "Pregúntele al vecino": la IA como puente, no
 * reemplazo del saber campesino.
 *
 * Contrato cubierto:
 *   - Rutea la duda con agentConfident:false (quien busca aquí ya decidió
 *     preguntarle a una persona) y muestra al par competente + cercano.
 *   - Sin vecino competente: deflección honesta, NO inventa un contacto.
 *   - Sin teléfono público: NO filtra números — entrega el mensaje para
 *     llevarlo al encuentro (copiar), con la explicación del porqué.
 *   - Con contacto público (opt-in del mercado): botón de WhatsApp vía
 *     abrirCanal.
 *   - encontrarContactoPublico: matching best-effort SOLO sobre ofertas
 *     reales con teléfono (demo y sin tel quedan fuera).
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const preguntarAlVecino = vi.fn();
const abrirCanal = vi.fn();
vi.mock('../../../store/useRedStore', () => ({
  default: (selector) => selector({ preguntarAlVecino, abrirCanal }),
}));

const getAll = vi.fn();
vi.mock('../../../db/marketplaceOfertas', () => ({
  marketplaceOfertas: { getAll: (...a) => getAll(...a) },
}));

vi.mock('../../../services/userProfileService', () => ({
  getProfile: () => ({ vereda: 'El Rosal', municipio: 'Choachí' }),
}));

import PreguntarVecinoPanel from '../PreguntarVecinoPanel';
import { encontrarContactoPublico } from '../contactoPublico';

afterEach(() => cleanup());
beforeEach(() => {
  preguntarAlVecino.mockReset();
  abrirCanal.mockReset();
  getAll.mockReset();
  getAll.mockResolvedValue([]);
});

const PEER = {
  productorHash: 'h-vecino',
  producto: 'Mora de Castilla',
  nivel: 'verde',
  score: 0.7,
  proximidad: 3,
  proximidadLabel: 'de su misma vereda',
  vereda: 'El Rosal',
  municipio: 'Choachí',
  nTransacciones: 4,
  reciente: Date.now(),
};

const DECISION_CON_PEER = {
  shouldRoute: true,
  peer: PEER,
  motivo: 'agente_no_sabe',
  mensajeSugerido: 'Buenas. Le escribo desde la red de Chagra…',
  candidatos: [PEER],
};

async function buscar(producto = 'mora') {
  fireEvent.change(screen.getByLabelText(/Cultivo de la duda/i), { target: { value: producto } });
  fireEvent.click(screen.getByTestId('buscar-vecino'));
}

describe('PreguntarVecinoPanel', () => {
  it('rutea la duda con agentConfident:false y muestra al vecino cercano', async () => {
    preguntarAlVecino.mockResolvedValue(DECISION_CON_PEER);
    abrirCanal.mockReturnValue(null);
    render(<PreguntarVecinoPanel />);
    await buscar('mora');

    expect(await screen.findByTestId('vecino-sugerido')).toBeTruthy();
    expect(preguntarAlVecino).toHaveBeenCalledWith(expect.objectContaining({
      producto: 'mora',
      vereda: 'El Rosal',
      municipio: 'Choachí',
      agentConfident: false,
    }));
    expect(screen.getByText(/de su misma vereda/i)).toBeTruthy();
    // El mensaje es de la persona: editable antes de enviar.
    expect(/** @type {HTMLInputElement} */ (screen.getByLabelText(/Mensaje para el vecino/i)).value).toMatch(/red de Chagra/i);
    // El saber no se vende — el principio queda a la vista.
    expect(screen.getByText(/el saber no se vende/i)).toBeTruthy();
  });

  it('sin vecino competente deflecta honestamente (no inventa contacto)', async () => {
    preguntarAlVecino.mockResolvedValue({
      shouldRoute: false, peer: null, motivo: 'sin_vecino_competente', mensajeSugerido: null, candidatos: [],
    });
    render(<PreguntarVecinoPanel />);
    await buscar('quinua');

    expect(await screen.findByTestId('sin-vecino')).toBeTruthy();
    expect(screen.queryByTestId('vecino-sugerido')).toBeNull();
  });

  it('sin teléfono público NO filtra números: explica y ofrece copiar el mensaje', async () => {
    preguntarAlVecino.mockResolvedValue(DECISION_CON_PEER);
    abrirCanal.mockReturnValue(null);
    render(<PreguntarVecinoPanel />);
    await buscar('mora');

    await screen.findByTestId('vecino-sugerido');
    expect(screen.getByTestId('sin-contacto').textContent).toMatch(/no entrega números sin permiso/i);
    expect(screen.getByTestId('copiar-mensaje')).toBeTruthy();
    expect(screen.queryByTestId('abrir-canal')).toBeNull();
  });

  it('con contacto público (opt-in del mercado) abre el canal de WhatsApp', async () => {
    preguntarAlVecino.mockResolvedValue(DECISION_CON_PEER);
    getAll.mockResolvedValue([
      { id: 'of-9', producto: 'Mora de castilla', vereda: 'El Rosal', contactoTel: '3001234567' },
    ]);
    abrirCanal.mockReturnValue({ href: 'https://wa.me/573001234567?text=hola', tel: '3001234567' });
    render(<PreguntarVecinoPanel />);
    await buscar('mora');

    const link = await screen.findByTestId('abrir-canal');
    expect(link.getAttribute('href')).toMatch(/wa\.me/);
    expect(abrirCanal).toHaveBeenCalledWith(
      expect.objectContaining({ contactoTel: '3001234567' }),
      expect.objectContaining({ mensaje: expect.stringMatching(/red de Chagra/i) }),
    );
  });
});

describe('encontrarContactoPublico (puro)', () => {
  const OFERTAS = [
    { id: 'a', producto: 'Mora de Castilla', vereda: 'Otra', contactoTel: '111', demo: true },
    { id: 'b', producto: 'Mora de Castilla', vereda: 'Otra', contactoTel: '' },
    { id: 'c', producto: 'mora de castilla', vereda: 'Lejos', contactoTel: '222' },
    { id: 'd', producto: 'MORA DE CASTILLA', vereda: 'El Rosal', contactoTel: '333' },
  ];

  it('excluye demos y ofertas sin teléfono; prefiere la de la misma vereda', () => {
    const out = encontrarContactoPublico(PEER, OFERTAS);
    expect(out.id).toBe('d');
  });

  it('sin match de vereda cae a la primera oferta real con teléfono', () => {
    const out = encontrarContactoPublico({ ...PEER, vereda: 'Ninguna' }, OFERTAS);
    expect(out.id).toBe('c');
  });

  it('sin producto que coincida devuelve null (no adivina)', () => {
    expect(encontrarContactoPublico({ ...PEER, producto: 'café' }, OFERTAS)).toBeNull();
    expect(encontrarContactoPublico(null, OFERTAS)).toBeNull();
    expect(encontrarContactoPublico(PEER, null)).toBeNull();
  });
});
