/**
 * MercadosScreen.sipsaVivo.test.jsx — el precio de REFERENCIA del marketplace
 * sale del FEED VIVO SIPSA (get_precio_sipsa), con FALLBACK HONESTO a la foto
 * estática del boletín cuando el sidecar no responde.
 *
 * Se mockea el cliente SIPSA (getPrecioSipsa) — mismo patrón que
 * CicloVivoWidget.test.jsx. Verifica:
 *   - dato vivo fresco → rótulo "en vivo" + banda del día + fecha del dato vivo
 *     + deep-link, y NO la fecha del boletín estático.
 *   - sidecar sin dato (null) → cae al boletín estático fechado (fallback honesto).
 *   - producto desconocido + sin feed → deflección honesta, sin precio inventado.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { __TEST__ as sipsaHookTest } from '../../hooks/useSipsaLatestPrice';

const { getPrecioSipsa } = vi.hoisted(() => ({ getPrecioSipsa: vi.fn() }));
vi.mock('../../services/sidecarClient', () => ({ getPrecioSipsa }));

// No probamos la cámara aquí (mismo patrón que MercadosScreen.precioReferencia.test.jsx).
vi.mock('../PhotoCaptureField', () => ({ default: () => null }));

import MercadosScreen from '../MercadosScreen';

beforeEach(() => {
  getPrecioSipsa.mockReset();
  getPrecioSipsa.mockResolvedValue(null);
});
afterEach(() => {
  sipsaHookTest.clearCache();
  cleanup();
});

/** Abre "Publicar" y devuelve el input de "¿Qué vende?". */
function abrirPublicar() {
  fireEvent.click(screen.getByRole('tab', { name: /Publicar/i }));
  return screen.getByPlaceholderText(/Tomate chonto, miel, papa criolla/i);
}

describe('MercadosScreen — Publicar: precio de referencia SIPSA en vivo', () => {
  it('muestra el dato VIVO (rótulo "en vivo" + banda del día + fecha del dato vivo + deep-link)', async () => {
    getPrecioSipsa.mockResolvedValueOnce({
      available: true,
      especie: 'tomate',
      price: {
        producto: 'Tomate chonto',
        plaza: 'Corabastos, Bogotá',
        fecha: '2026-08-21',
        precio_promedio_cop_kg: 3200,
        precio_min_cop_kg: 3000,
        precio_max_cop_kg: 3400,
      },
      central_abastos: 'Corabastos, Bogotá',
      frescura: { fecha_dato: '2026-08-21', desactualizado: false, dias_desde_dato: 0 },
    });

    render(<MercadosScreen onBack={() => {}} />);
    const input = abrirPublicar();
    fireEvent.change(input, { target: { value: 'tomate' } });

    // Rótulo "en vivo" y banda del día del feed (no la del boletín estático).
    expect(await screen.findByText(/Referencia SIPSA en vivo/i)).toBeTruthy();
    expect(screen.getByText(/3\.000/)).toBeTruthy();
    expect(screen.getByText(/3\.400/)).toBeTruthy();
    expect(screen.getByText(/Corabastos/i)).toBeTruthy();
    // Fecha del DATO VIVO, no del boletín estático de junio.
    expect(screen.getByText(/dato del 2026-08-21/i)).toBeTruthy();
    expect(screen.queryByText(/boletín 2026-06-09/i)).toBeNull();
    // Deep-link a SIPSA/DANE.
    const link = screen.getByRole('link', { name: /Fuente: SIPSA/i });
    expect(link.getAttribute('href')).toMatch(/dane\.gov\.co/i);
  });

  it('sella la frescura cuando el dato vivo está desactualizado', async () => {
    getPrecioSipsa.mockResolvedValueOnce({
      available: true,
      price: {
        producto: 'Papa criolla',
        plaza: 'Corabastos',
        fecha: '2026-08-18',
        precio_promedio_cop_kg: 4600,
      },
      central_abastos: 'Corabastos',
      frescura: { fecha_dato: '2026-08-18', desactualizado: true, dias_desde_dato: 3 },
    });

    render(<MercadosScreen onBack={() => {}} />);
    const input = abrirPublicar();
    fireEvent.change(input, { target: { value: 'papa criolla' } });

    expect(await screen.findByText(/Referencia SIPSA en vivo/i)).toBeTruthy();
    expect(screen.getByText(/último disponible/i)).toBeTruthy();
    expect(screen.getByText(/hace 3 días/i)).toBeTruthy();
  });

  it('cae al boletín estático fechado cuando el sidecar no responde (fallback honesto)', async () => {
    getPrecioSipsa.mockResolvedValue(null); // sidecar off/offline/sin dato

    render(<MercadosScreen onBack={() => {}} />);
    const input = abrirPublicar();
    fireEvent.change(input, { target: { value: 'tomate' } });

    // Boletín estático (precioReferencia.js): banda 4.318–4.833, fecha del boletín.
    expect(await screen.findByText(/Referencia SIPSA \(precio mayorista\)/i)).toBeTruthy();
    expect(screen.getByText(/4\.318/)).toBeTruthy();
    expect(screen.getByText(/boletín 2026-06-09/i)).toBeTruthy();
    // No debe rotularse "en vivo" cuando es la foto estática.
    expect(screen.queryByText(/Referencia SIPSA en vivo/i)).toBeNull();
  });

  it('deflecta honesto para un producto sin dato en ninguna fuente (no inventa precio)', async () => {
    getPrecioSipsa.mockResolvedValue(null);

    render(<MercadosScreen onBack={() => {}} />);
    const input = abrirPublicar();
    fireEvent.change(input, { target: { value: 'quinua' } });

    expect(await screen.findByText(/Sin referencia SIPSA para este producto todavía/i)).toBeTruthy();
    expect(screen.queryByText(/Referencia SIPSA \(precio mayorista\)/i)).toBeNull();
    expect(screen.queryByText(/Referencia SIPSA en vivo/i)).toBeNull();
    // Sanidad anti-fabricación: no aparece ningún patrón de banda de precios.
    expect(screen.queryByText(/\$[\d.]+–\$[\d.]+ \/ kg/)).toBeNull();
  });

  it('no consulta el sidecar mientras el campo tiene menos de 3 caracteres', async () => {
    render(<MercadosScreen onBack={() => {}} />);
    const input = abrirPublicar();
    fireEvent.change(input, { target: { value: 'to' } });

    // Sin bloque de referencia y sin llamada al feed vivo con 2 caracteres.
    expect(screen.queryByText(/Referencia SIPSA/i)).toBeNull();
    await waitFor(() => expect(getPrecioSipsa).not.toHaveBeenCalled());
  });
});
