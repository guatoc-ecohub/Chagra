import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import OnboardingDescubrir from '../OnboardingDescubrir.jsx';
import {
  hotspotsDeValle, valleYaDescubierto, olvidarValleDescubierto,
} from '../onboardingDatos.js';

afterEach(() => {
  cleanup();
  olvidarValleDescubierto();
});

const PARADAS = [
  { id: 'suelo', label: 'El suelo vivo', emoji: '🪱', pista: 'Debajo del pasto hay un mundo.', tinte: '#6b4a2e' },
  { id: 'agua', label: 'El agua', emoji: '💧', pista: 'El camino de la gravedad.', tinte: '#3a7ca5' },
];

describe('OnboardingDescubrir — primer viaje al valle sin voz', () => {
  test('bienvenida: invita en usted y ofrece la salida "Ya lo conozco"', () => {
    const { getByText } = render(<OnboardingDescubrir hotspots={PARADAS} />);
    expect(getByText('Este es su valle')).toBeInTheDocument();
    expect(getByText('Muéstremelo')).toBeInTheDocument();
    expect(getByText('Ya lo conozco')).toBeInTheDocument();
  });

  test('recorrido completo: destaca cada parada y cierra con onListo(completado)', () => {
    const destacados = [];
    let listo = null;
    const { getByText, queryByText } = render(
      <OnboardingDescubrir
        hotspots={PARADAS}
        onDestacar={(id) => destacados.push(id)}
        onListo={(m) => { listo = m; }}
      />,
    );
    fireEvent.click(getByText('Muéstremelo'));
    expect(getByText('El suelo vivo')).toBeInTheDocument();
    expect(destacados).toContain('suelo');
    fireEvent.click(getByText('Siguiente'));
    expect(getByText('El agua')).toBeInTheDocument();
    expect(destacados).toContain('agua');
    // última parada → cierre
    fireEvent.click(getByText('Listo, a recorrer'));
    expect(listo).toBe('completado');
    expect(queryByText('El agua')).not.toBeInTheDocument();
    expect(destacados[destacados.length - 1]).toBe(null); // limpia el foco
    expect(valleYaDescubierto()).toBe(true);
  });

  test('saltable: "Ya lo conozco" cierra con motivo saltado y deja constancia', () => {
    let listo = null;
    const { getByText, container } = render(
      <OnboardingDescubrir hotspots={PARADAS} onListo={(m) => { listo = m; }} />,
    );
    fireEvent.click(getByText('Ya lo conozco'));
    expect(listo).toBe('saltado');
    expect(container.querySelector('.onbdesc')).not.toBeInTheDocument();
    expect(valleYaDescubierto()).toBe(true);
  });

  test('reducedMotion → pistas estáticas (data-estatico)', () => {
    const { container } = render(<OnboardingDescubrir hotspots={PARADAS} reducedMotion />);
    expect(container.querySelector('.onbdesc[data-estatico="si"]')).toBeInTheDocument();
  });

  test('sin paradas no monta nada', () => {
    const { container } = render(<OnboardingDescubrir hotspots={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test('hotspotsDeValle deriva del registro: ids con landmark, título y pista', () => {
    const paradas = hotspotsDeValle();
    const ids = paradas.map((p) => p.id);
    ['suelo', 'agua', 'disenio', 'clima'].forEach((id) => expect(ids).toContain(id));
    expect(ids).not.toContain('valle'); // el mapa no se presenta a sí mismo
    paradas.forEach((p) => {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.pista.length).toBeGreaterThan(0);
      expect(p.tinte).toMatch(/^#/);
    });
    // excluir respeta gates del host (animales)
    expect(hotspotsDeValle({ excluir: ['animales'] }).map((p) => p.id)).not.toContain('animales');
  });
});
