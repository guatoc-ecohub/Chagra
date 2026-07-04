/**
 * SanidadSintomaScreen — el flujo insignia de punta a punta:
 *   buscar/elegir síntoma → desambiguar (cultivo/detalle) → resultado con causa,
 *   manejo agroecológico por pilares, umbral (si hay) y fuente.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, afterEach } from 'vitest';

// ScreenShell arrastra tema/notificaciones; para un test de FLUJO lo pasamos
// a través (el shell tiene su propia suite).
vi.mock('../../common/ScreenShell', () => ({
    ScreenShell: ({ title, children }) => (
        <div data-testid="shell"><h1>{title}</h1>{children}</div>
    ),
    default: ({ children }) => <div>{children}</div>,
}));

import SanidadSintomaScreen from '../SanidadSintomaScreen';

afterEach(() => cleanup());

describe('SanidadSintomaScreen — flujo síntoma → causa → manejo', () => {
    test('síntoma directo (broca): muestra causa, umbral citable y fuente', () => {
        render(<SanidadSintomaScreen />);
        fireEvent.click(screen.getByTestId('san-sintoma-broca'));
        const res = screen.getByTestId('san-resultado');
        expect(within(res).getByText(/broca del café/i)).toBeInTheDocument();
        expect(within(res).getByText(/Hypothenemus hampei/i)).toBeInTheDocument();
        // La broca es el único con umbral numérico citable.
        expect(within(res).getByTestId('san-umbral')).toHaveTextContent(/2\s*%/);
        // La fuente se cita (aparece en varios sitios; el <b> la lleva exacta).
        expect(within(res).getByText('Cenicafé')).toBeInTheDocument();
    });

    test('polisemia: candelilla PIDE cultivo antes de cerrar, y café → Mycena', () => {
        render(<SanidadSintomaScreen />);
        fireEvent.click(screen.getByTestId('san-sintoma-candelilla'));
        // No hay resultado todavía: primero la pregunta de cultivo.
        expect(screen.queryByTestId('san-resultado')).toBeNull();
        const preg = screen.getByTestId('san-pregunta');
        expect(preg).toHaveTextContent(/en cuál la vio/i);
        fireEvent.click(screen.getByTestId('san-opcion-cafe'));
        expect(screen.getByTestId('san-resultado')).toHaveTextContent(/Mycena citricolor/i);
    });

    test('amarillamiento: desambiguación forzada con árbol anidado → nematodo', () => {
        render(<SanidadSintomaScreen />);
        fireEvent.click(screen.getByTestId('san-sintoma-amarillamiento'));
        const preg = screen.getByTestId('san-pregunta');
        // Banner de desambiguación forzada visible.
        expect(preg).toHaveTextContent(/no le puedo dar un solo culpable/i);
        // Elijo la rama de marchitez → anida OTRA pregunta (no cierra aún).
        fireEvent.click(screen.getByText(/se marchita al sol/i));
        expect(screen.queryByTestId('san-resultado')).toBeNull();
        expect(screen.getByTestId('san-pregunta')).toHaveTextContent(/mírele la raíz/i);
        fireEvent.click(screen.getByText(/nuditos o bolitas/i));
        expect(screen.getByTestId('san-resultado')).toHaveTextContent(/Meloidogyne/i);
    });

    test('búsqueda por texto folk: "polvillo" abre el flujo', () => {
        render(<SanidadSintomaScreen />);
        fireEvent.change(screen.getByLabelText(/Escriba lo que le ve/i), {
            target: { value: 'polvillo blanco' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
        // El polvillo pregunta haz vs envés.
        expect(screen.getByTestId('san-pregunta')).toHaveTextContent(/Dónde está el polvo/i);
    });

    test('el agente queda siempre a la mano en el resultado', () => {
        const onNavigate = vi.fn();
        render(<SanidadSintomaScreen onNavigate={onNavigate} />);
        fireEvent.click(screen.getByTestId('san-sintoma-roya'));
        fireEvent.click(screen.getByTestId('san-agente'));
        expect(onNavigate).toHaveBeenCalledWith('agente');
    });
});
