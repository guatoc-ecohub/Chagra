/**
 * ChagraAgentAvatar{Jaguar,OsoBaston,Luciernaga,Guacamaya,ChivitoPunk} — ítem
 * #8 del GAP compAI (2026-08-13, "elenco unificado"; ampliado 2026-08-14 con
 * los últimos dos del roster-7): estos ya tenían cuerpo 2.5D (dibujado a mano
 * los tres primeros; reusando el rig F24 del valle los dos últimos —
 * GuacamayaCompai.jsx/ChivitoPunk.jsx, ver esos archivos) y ya estaban
 * `enPWA:true` en `compai/nucleo/elenco.js` (#96), pero ningún selector los
 * exponía. Estos wrappers cierran ese hueco — mismo contrato que
 * ChagraAgentAvatarZariguya (state/size/withLabel/onClick/onDoubleClick/
 * glow/className/ariaLabel).
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

const CASOS = [
    { Component: ChagraAgentAvatarJaguar, nombre: 'Jaguar', slug: 'jaguar' },
    { Component: ChagraAgentAvatarOsoBaston, nombre: 'Oso del bastón', slug: 'oso-baston' },
    { Component: ChagraAgentAvatarLuciernaga, nombre: 'Luciérnaga', slug: 'luciernaga' },
    { Component: ChagraAgentAvatarGuacamaya, nombre: 'Guacamaya', slug: 'guacamaya' },
    { Component: ChagraAgentAvatarChivitoPunk, nombre: 'Chivito', slug: 'chivito-punk' },
];

// for...of en vez de describe.each: con describe.each, el linter no rastrea
// el uso de `Component` dentro de las closures anidadas de cada `test()` (se
// lee como parámetro sin usar aunque SÍ se use en el JSX).
for (const { Component, nombre, slug } of CASOS) {
    describe(`ChagraAgentAvatar${nombre}`, () => {
        test(`renderiza el cuerpo real de ${nombre} (data-creature=${slug})`, () => {
            const { container } = render(<Component state="idle" />);
            const svg = container.querySelector(`svg[data-creature="${slug}"]`);
            expect(svg).toBeInTheDocument();
            expect(svg).toHaveAttribute('role', 'img');
        });

        test('sin onClick ni onDoubleClick renderiza solo el SVG (no button)', () => {
            const { container } = render(<Component state="idle" />);
            expect(container.querySelector('button')).toBeNull();
            expect(container.querySelector('svg')).toBeInTheDocument();
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

        test('state="speaking" pasa un visema (lip-sync) al cuerpo', () => {
            const { container } = render(<Component state="speaking" />);
            const svg = container.querySelector('svg');
            expect(svg).toHaveAttribute('data-visema');
        });
    });
}
