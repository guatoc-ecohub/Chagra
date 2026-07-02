/**
 * MercadosScreen — precio de referencia SIPSA en la ficha de venta (Publicar).
 *
 * Contrato cubierto (anti-alucinación, mismo criterio que
 * marketplaceService.test.js): al publicar una oferta, el productor ve la
 * banda de precio de referencia SIPSA/DANE con la fecha del boletín tan pronto
 * escribe un producto que sí tiene dato citado (p. ej. "tomate", boletín
 * 2026-06-09). Si el producto no tiene dato (p. ej. "quinua"), se deflecta
 * honestamente — NUNCA se inventa un precio ni una tendencia.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// No probamos la cámara aquí (mismo patrón que GlaciarReporteScreen.test.jsx).
vi.mock('../PhotoCaptureField', () => ({ default: () => null }));

import MercadosScreen from '../MercadosScreen';

afterEach(() => cleanup());

/** Abre la pestaña "Publicar" y devuelve el input de "¿Qué vendes?". */
function abrirPublicarYObtenerInputProducto() {
  fireEvent.click(screen.getByRole('tab', { name: /Publicar/i }));
  return screen.getByPlaceholderText(/Tomate chonto, miel, papa criolla/i);
}

describe('MercadosScreen — Publicar: precio de referencia SIPSA', () => {
  it('muestra la banda SIPSA + mercado + fecha del boletín para un producto con dato citado', async () => {
    render(<MercadosScreen onBack={() => {}} />);
    const inputProducto = abrirPublicarYObtenerInputProducto();

    fireEvent.change(inputProducto, { target: { value: 'tomate' } });

    expect(await screen.findByText(/Referencia SIPSA/i)).toBeTruthy();
    // Banda de precio del boletín citado (precioReferencia.js): $4.318–$4.833.
    expect(screen.getByText(/4\.318/)).toBeTruthy();
    expect(screen.getByText(/4\.833/)).toBeTruthy();
    // Plaza(s) mayorista(s) citada(s).
    expect(screen.getByText(/Manizales/i)).toBeTruthy();
    // Fecha del boletín visible — honesto, no "precio en vivo".
    expect(screen.getByText(/boletín 2026-06-09/i)).toBeTruthy();
    expect(screen.getByText(/no lo que le van a pagar a usted en finca/i)).toBeTruthy();
  });

  it('NO muestra flecha de tendencia (no hay serie temporal, solo una foto puntual)', async () => {
    render(<MercadosScreen onBack={() => {}} />);
    const inputProducto = abrirPublicarYObtenerInputProducto();
    fireEvent.change(inputProducto, { target: { value: 'tomate' } });

    await screen.findByText(/Referencia SIPSA/i);
    expect(screen.queryByText(/tendencia/i)).toBeNull();
  });

  it('deflecta honestamente cuando el producto no tiene dato citado (no inventa precio)', async () => {
    render(<MercadosScreen onBack={() => {}} />);
    const inputProducto = abrirPublicarYObtenerInputProducto();

    // 'quinua' no está en la tabla de precioReferencia.js (mismo caso que
    // marketplaceService.test.js).
    fireEvent.change(inputProducto, { target: { value: 'quinua' } });

    expect(await screen.findByText(/Sin referencia SIPSA para este producto todavía/i)).toBeTruthy();
    expect(screen.queryByText(/Referencia SIPSA \(precio mayorista\)/i)).toBeNull();
  });

  it('no muestra ningún bloque de referencia con el campo casi vacío (< 3 caracteres)', () => {
    render(<MercadosScreen onBack={() => {}} />);
    const inputProducto = abrirPublicarYObtenerInputProducto();

    fireEvent.change(inputProducto, { target: { value: 'to' } });

    expect(screen.queryByText(/Referencia SIPSA/i)).toBeNull();
    expect(screen.queryByText(/Sin referencia SIPSA/i)).toBeNull();
  });
});
