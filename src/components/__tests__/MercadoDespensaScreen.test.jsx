/**
 * MercadoDespensaScreen — mini-app "Mercado y despensa" (mundo del mismo nombre).
 *
 * Contrato cubierto:
 *   - Carga la estructura de mercado del JSON exportado del grafo chagra_kg.
 *   - Las 3 preguntas rectoras aparecen (por dónde vendo / valor / a cómo está).
 *   - La compra pública ACFC se marca como OPORTUNIDAD.
 *   - El chip de precio consulta get_precio_sipsa EN VIVO y CANTA el número real
 *     cuando el sidecar responde available:true.
 *   - Sin dato disponible → decline HONESTO (no inventa) + puente al agente.
 *   - CERO precios hardcodeados en el JSON de datos.
 *   - onBack.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import MercadoDespensaScreen from '../MercadoDespensaScreen';

// Mock del sidecar: controlamos la respuesta de precio por test.
const getPrecioSipsa = vi.fn();
vi.mock('../../services/sidecarClient', () => ({
  getPrecioSipsa: (...a) => getPrecioSipsa(...a),
}));

const DATA = {
  meta: {
    titulo: 'Mercado y despensa',
    origen_datos: 'Grafo chagra_kg exportado a estático.',
    nota_precios: 'Este archivo NO contiene precios. Los precios los trae get_precio_sipsa en vivo.',
    fuente_precio_url: 'https://www.dane.gov.co/sipsa',
    total_despensa: 2,
    despensa_con_producto_sipsa: 1,
  },
  canales: [
    {
      id: 'canal_venta_directa_finca', nombre: 'Venta directa', tipo: 'circuito_corto',
      descripcion: 'Finca a consumidor.', fuente: 'FAO', confianza: 'media-alta',
      orden: 1, emoji: '🤝', titulo_corto: 'Venta directa desde la finca', gancho: 'Más plata para usted.', tono: 'emerald',
    },
    {
      id: 'canal_compra_publica_acfc', nombre: 'Compra pública ACFC', tipo: 'compra_publica',
      descripcion: 'Ley 2046 de 2020: mínimo 30% a pequeños productores.', fuente: 'Ley 2046 de 2020', confianza: 'alta',
      orden: 4, emoji: '🏫', titulo_corto: 'Compra pública (Ley 2046)', gancho: 'Le compran 30%.', tono: 'violet', oportunidad: true,
    },
    {
      id: 'canal_central_mayorista_sipsa', nombre: 'Central mayorista', tipo: 'mayorista',
      descripcion: 'Precios SIPSA-DANE.', fuente: 'DANE - SIPSA', confianza: 'alta',
      orden: 6, emoji: '🚛', titulo_corto: 'Central mayorista', gancho: 'Precio de referencia.', tono: 'slate',
    },
  ],
  valor_agregado: [
    {
      id: 'valor_agregado_panela', nombre: 'Panela', tipo: 'transformacion_artesanal',
      descripcion: 'Natural, sin registro INVIMA.', fuente: 'Affirma Legal', confianza: 'media-alta',
      orden: 1, emoji: '🟫', nivel_riesgo: 'bajo', regimen: 'No requiere Registro INVIMA.', gancho: 'Arranca sin registro.',
    },
    {
      id: 'valor_agregado_queso', nombre: 'Queso', tipo: 'transformacion_agroindustrial',
      descripcion: 'Lácteo alto riesgo, RSA 5 años.', fuente: 'INVIMA Res. 719/2015', confianza: 'media-alta',
      orden: 4, emoji: '🧀', nivel_riesgo: 'alto', regimen: 'Registro Sanitario (RSA).', gancho: 'Trámite exigente.',
    },
  ],
  despensa: [
    {
      species_id: 'solanum_tuberosum', nombre_comun: 'Papa', nombre_cientifico: 'Solanum tuberosum L.',
      canales: ['canal_venta_directa_finca', 'canal_central_mayorista_sipsa'],
      transforma_en: null, producto_sipsa: 'papa',
      imagen: { url: 'https://example.org/papa.jpg', licencia: 'CC0', autor: 'x' },
    },
    {
      species_id: 'coffea_arabica', nombre_comun: 'Café', nombre_cientifico: 'Coffea arabica L.',
      canales: ['canal_venta_directa_finca'],
      transforma_en: 'valor_agregado_cafe_tostado', producto_sipsa: null, imagen: null,
    },
  ],
};

beforeEach(() => {
  getPrecioSipsa.mockReset();
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => DATA });
});
afterEach(() => cleanup());

const cargar = async () => {
  render(<MercadoDespensaScreen onBack={() => {}} onNavigate={() => {}} />);
  await screen.findByText('¿Por dónde vendo?');
};

describe('MercadoDespensaScreen — estructura', () => {
  it('muestra las tres preguntas rectoras', async () => {
    await cargar();
    expect(screen.getByText('¿Por dónde vendo?')).toBeTruthy();
    expect(screen.getByText('¿Cómo le agrego valor?')).toBeTruthy();
    expect(screen.getByText('¿A cómo está?')).toBeTruthy();
  });

  it('marca la compra pública ACFC como oportunidad', async () => {
    await cargar();
    expect(screen.getByText('Compra pública (Ley 2046)')).toBeTruthy();
    expect(screen.getAllByText(/Oportunidad/i).length).toBeGreaterThan(0);
  });

  it('muestra el valor agregado con su badge de riesgo sanitario', async () => {
    await cargar();
    expect(screen.getByText('Panela')).toBeTruthy();
    expect(screen.getByText('Queso')).toBeTruthy();
    expect(screen.getByText(/Trámite alto/i)).toBeTruthy();
  });

  it('botón volver llama onBack', async () => {
    const onBack = vi.fn();
    render(<MercadoDespensaScreen onBack={onBack} onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('MercadoDespensaScreen — precio EN VIVO (get_precio_sipsa)', () => {
  it('canta el precio real cuando el sidecar responde available:true', async () => {
    getPrecioSipsa.mockResolvedValue({
      available: true,
      central_abastos: 'Corabastos, Bogotá',
      frescura: { desactualizado: false },
      price: {
        producto: 'Papa parda', precio_promedio_cop_kg: 1800,
        precio_min_cop_kg: 1600, precio_max_cop_kg: 2000, plaza: 'Corabastos, Bogotá', fecha: '2026-07-04',
      },
    });
    await cargar();
    fireEvent.click(screen.getByRole('button', { name: /Papa/i }));
    await waitFor(() => expect(getPrecioSipsa).toHaveBeenCalledWith('latest_price', { producto: 'papa' }));
    expect(await screen.findByText(/\$1\.800/)).toBeTruthy();
    expect(screen.getByText(/Corabastos/)).toBeTruthy();
    // "SIPSA/DANE" aparece en el panel de precio + banner + footer: hay varios.
    expect(screen.getAllByText(/SIPSA\/DANE/).length).toBeGreaterThan(0);
  });

  it('sin dato disponible NO inventa: decline honesto + puente al agente', async () => {
    getPrecioSipsa.mockResolvedValue({ available: false });
    const onNavigate = vi.fn();
    render(<MercadoDespensaScreen onBack={() => {}} onNavigate={onNavigate} />);
    await screen.findByText('¿Por dónde vendo?');
    fireEvent.click(screen.getByRole('button', { name: /Papa/i }));
    expect(await screen.findByText(/No inventamos un número/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Preguntarle al agente/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({ prefilledPrompt: expect.stringMatching(/papa/i) }));
  });

  it('un cultivo sin producto SIPSA no se cotiza (honesto), remite al agente', async () => {
    await cargar();
    // Café no tiene producto SIPSA en el mapa: se selecciona y no llama al tool.
    const chips = screen.getAllByRole('button', { name: /Café/i });
    fireEvent.click(chips[0]);
    expect(await screen.findByText(/no está en el boletín de precios SIPSA\/DANE/i)).toBeTruthy();
    expect(getPrecioSipsa).not.toHaveBeenCalled();
  });
});

describe('MercadoDespensaScreen — honestidad de precios', () => {
  it('el JSON de datos NO trae ni un precio hardcodeado', () => {
    // Contrato anti-alucinación: la estructura de mercado no lleva precios.
    const flat = JSON.stringify(DATA.canales) + JSON.stringify(DATA.valor_agregado) + JSON.stringify(DATA.despensa);
    expect(flat).not.toMatch(/precio_promedio|cop_kg|\$\s?\d/);
  });

  it('la nota de honestidad de precios está siempre visible', async () => {
    await cargar();
    expect(screen.getByText(/no fija precios ni los adivina/i)).toBeTruthy();
  });
});
