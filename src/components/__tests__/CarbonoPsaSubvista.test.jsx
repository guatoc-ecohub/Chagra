// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * CarbonoPsaSubvista.test.jsx — sub-vista "Carbono y PSA" dentro del
 * seguimiento de Reforestación (operador 2026-06-15). Verifica:
 *   - se muestra la ALERTA anti-trampa de bonos de carbono (defensiva);
 *   - se muestra la ELEGIBILIDAD / modalidades PSA;
 *   - ANTI-ALUCINACIÓN: nunca se renderiza un número de CO₂ presentado como
 *     hecho. Si hay factor con fuente → rango orientativo [VALIDAR] + mensaje
 *     de validación. Si NO hay factor con fuente → no aparece ningún número,
 *     solo el mensaje de que requiere medición de campo.
 */
import React from 'react';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

afterEach(() => { cleanup(); vi.resetModules(); });

const PROCESO = {
  process_id: '01J',
  type: 'farm_process',
  attributes: {
    process_type: 'restoration',
    subject_label: 'Roble andino',
    quantity: 120,
    unit: 'árboles',
    area_ha: 1.5,
    status: 'active',
    current_stage: 'establecimiento',
    created_at: Date.now(),
  },
};

describe('CarbonoPsaSubvista', () => {
  test('muestra la alerta anti-trampa de bonos de carbono', async () => {
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    const alerta = screen.getByTestId('alerta-bonos-carbono');
    expect(alerta).toBeInTheDocument();
    // Texto defensivo clave: contratos largos + intermediarios + no firmar sin asesoría.
    expect(within(alerta).getAllByText(/bonos de carbono/i).length).toBeGreaterThan(0);
    expect(alerta).toHaveTextContent(/30-100|30–100|contratos/i);
    expect(alerta).toHaveTextContent(/intermediarios/i);
    expect(alerta).toHaveTextContent(/asesor[ií]a jur[ií]dica/i);
    expect(alerta).toHaveTextContent(/CAR|consultorios/i);
  });

  test('muestra la elegibilidad / modalidades PSA', async () => {
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    const psa = screen.getByTestId('psa-elegibilidad');
    expect(psa).toBeInTheDocument();
    expect(psa).toHaveTextContent(/Pago por Servicios Ambientales/i);
    // Al menos una modalidad del PSA aparece (lista nunca vacía: real o fallback).
    expect(psa.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  test('CON factor con fuente: muestra rango [VALIDAR] con fuente y SIEMPRE el mensaje de validación', async () => {
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    // El mensaje de validación está SIEMPRE presente (nunca número como hecho).
    expect(screen.getByTestId('co2-validacion')).toHaveTextContent(/estimaci[oó]n|VALIDAR/i);
    // El bloque de captura estimada aparece con especie, área y línea de tiempo.
    expect(screen.getAllByText(/Quercus humboldtii/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/1.5 ha/i)).toBeInTheDocument();
    expect(screen.getByTestId('co2-timeline')).toBeInTheDocument();
    // El rango se muestra con etiqueta [VALIDAR] y con su fuente visible.
    const rango = screen.getByTestId('co2-rango-referencia');
    expect(rango).toHaveTextContent(/\[VALIDAR\]/);
    expect(rango).toHaveTextContent(/tC\/ha/);
    expect(rango).toHaveTextContent(/DR-RESTAURACION|RAINFOR/i);
  });

  test('ANTI-ALUCINACIÓN: no renderiza un número de CO₂ derivado del # de árboles del proceso', async () => {
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    const co2 = screen.getByTestId('co2-estimacion');
    const text = co2.textContent || '';
    // El mensaje de validación SIEMPRE acompaña cualquier cifra: nunca un
    // número presentado como hecho del predio.
    expect(screen.getByTestId('co2-validacion')).toHaveTextContent(/medici[oó]n de campo|\[VALIDAR\]/i);
    // El # de árboles del proceso (120) NO se convierte en un resultado de CO₂:
    // no aparece "120 ... CO₂" ni "= <n> CO₂" para el predio.
    expect(text).not.toMatch(/120[^.]{0,40}CO[₂2]/i);
    expect(text).not.toMatch(/=\s*[\d.,]+\s*(kg|t|ton)/i);
    // No hay una cifra de captura ATRIBUIDA al predio como hecho
    // ("X kg/tCO₂ capturados/secuestrados/al año" del predio).
    expect(text).not.toMatch(/[\d.,]+\s*(kg|tCO[₂2])\s*(de\s*CO[₂2]\s*)?(capturad|secuestrad|al a[nñ]o)/i);
  });

  test('muestra el área y una captura acumulada cuando el proceso trae hectáreas', async () => {
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    const timeline = screen.getByTestId('co2-timeline');
    expect(timeline).toBeInTheDocument();
    expect(timeline.textContent || '').toMatch(/A[ñn]o 1/i);
    expect(timeline.textContent || '').toMatch(/A[ñn]o 6/i);
  });

  test('SIN factor con fuente en los datos: NO hay número, solo mensaje de validación + método', async () => {
    // Simula datos del repo sin factor (rangos vacíos, sin medición forzada falsa).
    vi.doMock('../../data/carbono-captura.json', () => ({
      default: {
        fuente: 'sin fuente verificable',
        requiere_medicion_campo: true,
        rangos_referencia: [],
        metodo_estimacion: {
          titulo: 'Qué se necesita para estimar la captura de CO₂',
          pasos: ['Número de árboles', 'Especie', 'Edad', 'Área'],
          advertencia: 'Sin medición de campo, cualquier número exacto es una invención.',
        },
      },
    }));
    const { default: CarbonoPsaSubvista } = await import('../CarbonoPsaSubvista');
    render(<CarbonoPsaSubvista proceso={PROCESO} perfilFinca={{ altitud: 2600 }} />);

    const co2 = screen.getByTestId('co2-estimacion');
    // No se muestra el bloque de rango (no hay factor con fuente).
    expect(screen.queryByTestId('co2-rango-referencia')).not.toBeInTheDocument();
    // Pero SÍ el mensaje de validación y el método (qué medir).
    expect(screen.getByTestId('co2-validacion')).toHaveTextContent(/estimaci[oó]n|VALIDAR/i);
    expect(co2).toHaveTextContent(/Qu[eé] se necesita|N[uú]mero de [aá]rboles/i);
    expect(co2.textContent || '').not.toMatch(/\d[\d.,]*\s*(kg|ton(elada)?s?)\s*(de\s*)?CO/i);
  });
});
