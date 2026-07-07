/**
 * MundoCultivosHub — la PORTADA del mundo cultivos. Contrato:
 *   1. Orienta por región (régimen de lluvia) antes de sembrar.
 *   2. Cada lámina RE-RUTEA a su pantalla real (onNavigate), no reimplementa.
 *   3. La calculadora de grados-día calcula determinista (maíz frío = 4.5 °D/día).
 *   4. El agente queda a la mano.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

import MundoCultivosHub from '../MundoCultivosHub';
import CalculadoraGradosDia from '../CalculadoraGradosDia';

afterEach(() => cleanup());

describe('MundoCultivosHub — portada del mundo cultivos', () => {
    test('renderiza el hub con hero y orientación por región', () => {
        render(<MundoCultivosHub onBack={vi.fn()} onNavigate={vi.fn()} />);
        expect(screen.getByTestId('mundo-cultivos-hub')).toBeInTheDocument();
        expect(screen.getByTestId('regimen-bimodal')).toBeInTheDocument();
        expect(screen.getByTestId('regimen-unimodal')).toBeInTheDocument();
        // Por defecto abre en bimodal (Andes) → dos semestres de siembra.
        const ventanas = screen.getByTestId('ventanas-siembra');
        expect(within(ventanas).getByText(/Semestre A/)).toBeInTheDocument();
        expect(within(ventanas).getByText(/Semestre B/)).toBeInTheDocument();
    });

    test('el régimen unimodal muestra una sola ventana de siembra', () => {
        render(<MundoCultivosHub onBack={vi.fn()} onNavigate={vi.fn()} />);
        fireEvent.click(screen.getByTestId('regimen-unimodal'));
        const ventanas = screen.getByTestId('ventanas-siembra');
        expect(within(ventanas).getByText(/Única/)).toBeInTheDocument();
        expect(within(ventanas).queryByText(/Semestre B/)).toBeNull();
    });

    test('cada lámina re-rutea a su vista real existente', () => {
        const onNavigate = vi.fn();
        render(<MundoCultivosHub onBack={vi.fn()} onNavigate={onNavigate} />);
        const esperadas = ['directorio', 'calendario_finca', 'ciclo', 'germinacion', 'sembrar', 'activos', 'cosechar'];
        for (const view of esperadas) {
            fireEvent.click(screen.getByTestId(`lamina-${view}`));
            expect(onNavigate).toHaveBeenCalledWith(view);
        }
    });

    test('la calculadora de grados-día se despliega y calcula (maíz frío = 4.5)', () => {
        render(<MundoCultivosHub onBack={vi.fn()} onNavigate={vi.fn()} />);
        // Cerrada por defecto: la portada se lee primero.
        expect(screen.queryByTestId('calc-grados-dia')).toBeNull();
        fireEvent.click(screen.getByTestId('calc-toggle'));
        expect(screen.getByTestId('calc-grados-dia')).toBeInTheDocument();
        expect(screen.getByTestId('calc-por-dia')).toHaveTextContent('4.5');
    });

    test('el agente queda a la mano al pie, con contexto del mundo', () => {
        const onNavigate = vi.fn();
        render(<MundoCultivosHub onBack={vi.fn()} onNavigate={onNavigate} />);
        fireEvent.click(screen.getByTestId('mch-agente'));
        // Arranca el prompt sembrado con el tema (editable en el input, no se envía solo).
        expect(onNavigate).toHaveBeenCalledWith(
            'agente',
            expect.objectContaining({ prefilledPrompt: expect.stringContaining('cultivos') }),
        );
    });
});

describe('CalculadoraGradosDia — determinista y honesta', () => {
    test('cambiar de piso térmico recalcula los grados-día por día', () => {
        render(<CalculadoraGradosDia />);
        // Arranca en tierra fría → maíz 4.5 °D/día.
        expect(screen.getByTestId('calc-por-dia')).toHaveTextContent('4.5');
        // Tierra templada → 10.5 °D/día.
        fireEvent.click(screen.getByTestId('calc-piso-templado'));
        expect(screen.getByTestId('calc-por-dia')).toHaveTextContent('10.5');
    });

    test('cultivo manual muestra el campo de temperatura base', () => {
        render(<CalculadoraGradosDia />);
        expect(screen.queryByTestId('calc-tb-manual')).toBeNull();
        fireEvent.click(screen.getByTestId('calc-cultivo-manual'));
        expect(screen.getByTestId('calc-tb-manual')).toBeInTheDocument();
    });

    test('con fecha de siembra estima la etapa por fenología', () => {
        render(<CalculadoraGradosDia />);
        fireEvent.change(screen.getByTestId('calc-fecha'), { target: { value: '2020-01-01' } });
        const etapa = screen.getByTestId('calc-etapa');
        // Fecha muy pasada → maíz ya en grano seco (último hito), sin próxima.
        expect(within(etapa).getByText(/Grano seco/)).toBeInTheDocument();
        expect(within(etapa).getByText(/grados-día acumulados/)).toBeInTheDocument();
    });

    test('temperaturas invertidas muestran aviso, no un número falso', () => {
        render(<CalculadoraGradosDia />);
        fireEvent.change(screen.getByTestId('calc-tmax'), { target: { value: '3' } });
        expect(screen.queryByTestId('calc-por-dia')).toBeNull();
        expect(screen.getByText(/no puede ser menor/)).toBeInTheDocument();
    });
});
