/**
 * ChagraAgentAvatar{Jaguar,OsoBaston,Luciernaga,Guacamaya,ChivitoPunk} — ítem
 * #8 del GAP compAI (2026-08-13, "elenco unificado"; ampliado 2026-08-14 con
 * los últimos dos del roster-7): estos ya tenían cuerpo 2.5D y ya estaban
 * `enPWA:true` en `compai/nucleo/elenco.js` (#96), pero ningún selector los
 * exponía. Estos wrappers cierran ese hueco — mismo contrato que
 * ChagraAgentAvatarZariguya (state/size/withLabel/onClick/onDoubleClick/
 * glow/className/ariaLabel).
 *
 * ACTUALIZADO (feat/compai-laminas-en-movimiento): Jaguar/OsoBaston/
 * Luciernaga/ChivitoPunk pasaron de SVG dibujado a mano (o rig vectorial
 * reusado, ChivitoPunk) a la LÁMINA HUMBOLDT REAL recortada en capas +
 * rigeada (CompaiLamina.jsx, ver ese módulo) — el SPEC del operador prohibió
 * explícitamente redibujar, a mano o a vector. El contrato de estos 4 CAMBIA:
 * el cuerpo real ya no es un `<svg data-creature>`, es un `<div role="img"
 * data-creature data-lamina-viva="1">` con capas <canvas> adentro, y no hay
 * `data-visema` (la lámina no tiene boca/mandíbula medida — fuera del
 * alcance mínimo ojos+cabeza+respiración, ver docstring de CompaiLamina).
 * Guacamaya NO tiene lámina PNG propia (solo el rig vectorial F24) — sigue
 * con el contrato SVG viejo, sin cambios.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import ChagraAgentAvatarJaguar from '../ChagraAgentAvatarJaguar';
import ChagraAgentAvatarOsoBaston from '../ChagraAgentAvatarOsoBaston';
import ChagraAgentAvatarLuciernaga from '../ChagraAgentAvatarLuciernaga';
import ChagraAgentAvatarGuacamaya from '../ChagraAgentAvatarGuacamaya';
import ChagraAgentAvatarChivitoPunk from '../ChagraAgentAvatarChivitoPunk';

// El contrato COMÚN a los 5 (botón/withLabel/ariaLabel) no depende de si el
// cuerpo es SVG a mano o lámina viva — se prueba igual para todos.
const CASOS = [
    { Component: ChagraAgentAvatarJaguar, nombre: 'Jaguar', slug: 'jaguar' },
    { Component: ChagraAgentAvatarOsoBaston, nombre: 'Oso del bastón', slug: 'oso-baston' },
    { Component: ChagraAgentAvatarLuciernaga, nombre: 'Luciérnaga', slug: 'luciernaga' },
    { Component: ChagraAgentAvatarGuacamaya, nombre: 'Guacamaya', slug: 'guacamaya' },
    { Component: ChagraAgentAvatarChivitoPunk, nombre: 'Chivito', slug: 'chivito-punk' },
];

// Los 4 que ya cruzaron a lámina viva (todos menos guacamaya, sin lámina
// propia — ver docstring del archivo).
const SLUGS_LAMINA = new Set(['jaguar', 'oso-baston', 'luciernaga', 'chivito-punk']);

// for...of en vez de describe.each: con describe.each, el linter no rastrea
// el uso de `Component` dentro de las closures anidadas de cada `test()` (se
// lee como parámetro sin usar aunque SÍ se use en el JSX).
for (const { Component, nombre, slug } of CASOS) {
    const esLamina = SLUGS_LAMINA.has(slug);

    describe(`ChagraAgentAvatar${nombre}`, () => {
        if (esLamina) {
            test(`renderiza la lámina viva de ${nombre} (data-creature=${slug})`, () => {
                const { container } = render(<Component state="idle" />);
                const cuerpo = container.querySelector(`[data-creature="${slug}"]`);
                expect(cuerpo).toBeInTheDocument();
                expect(cuerpo).toHaveAttribute('role', 'img');
                expect(cuerpo).toHaveAttribute('data-lamina-viva', '1');
            });
        } else {
            test(`renderiza el cuerpo real de ${nombre} (data-creature=${slug})`, () => {
                const { container } = render(<Component state="idle" />);
                const svg = container.querySelector(`svg[data-creature="${slug}"]`);
                expect(svg).toBeInTheDocument();
                expect(svg).toHaveAttribute('role', 'img');
            });
        }

        test('sin onClick ni onDoubleClick renderiza solo el dibujo (no button)', () => {
            const { container } = render(<Component state="idle" />);
            expect(container.querySelector('button')).toBeNull();
            expect(container.querySelector(esLamina ? '[data-lamina-viva]' : 'svg')).toBeInTheDocument();
        });

        test('con onDoubleClick envuelve en button y dispara el handler', () => {
            let llamadas = 0;
            render(<Component state="idle" onDoubleClick={() => { llamadas += 1; }} />);
            const btn = screen.getByRole('button');
            fireEvent.doubleClick(btn);
            expect(llamadas).toBe(1);
        });

        test('ariaLabel custom se respeta en el botón', () => {
            render(<Component state="idle" onDoubleClick={() => {}} ariaLabel="Avatar de prueba" />);
            expect(screen.getByRole('button', { name: 'Avatar de prueba' })).toBeInTheDocument();
        });

        test('withLabel agrega el nombre propio bajo el dibujo', () => {
            render(<Component state="idle" withLabel />);
            expect(screen.getByText(nombre)).toBeInTheDocument();
        });

        if (esLamina) {
            test('state="speaking" viaja como data-agt-estado="animada" (sin visema: la lámina no tiene boca medida)', () => {
                const { container } = render(<Component state="speaking" />);
                const cuerpo = container.querySelector(`[data-creature="${slug}"]`);
                expect(cuerpo).toHaveAttribute('data-agt-estado', 'animada');
                expect(cuerpo).not.toHaveAttribute('data-visema');
            });
        } else {
            test('state="speaking" pasa un visema (lip-sync) al cuerpo', () => {
                const { container } = render(<Component state="speaking" />);
                const svg = container.querySelector('svg');
                expect(svg).toHaveAttribute('data-visema');
            });
        }
    });
}
