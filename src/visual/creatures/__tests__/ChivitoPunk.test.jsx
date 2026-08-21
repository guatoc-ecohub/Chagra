import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import ChivitoCompai from '../ChivitoPunk.jsx';

/**
 * ChivitoCompai — cuerpo 2.5D que reusa el rig F24 del valle. Mismo contrato de
 * pruebas que GuacamayaCompai.test.jsx — ver ese archivo para el detalle de
 * qué cuida cada caso.
 */
describe('ChivitoCompai', () => {
  test('renderiza el cuerpo real (data-creature=chivito-punk, role=img)', () => {
    const { container } = render(<ChivitoCompai state="idle" />);
    const svg = container.querySelector('svg[data-creature="chivito-punk"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('role', 'img');
  });

  test('trae el rig del valle inlineado (marcado real, no vacío)', () => {
    const { container } = render(<ChivitoCompai state="idle" />);
    const g = container.querySelector('svg[data-creature="chivito-punk"] > g');
    expect(g.innerHTML.length).toBeGreaterThan(500);
    expect(g.innerHTML).toContain('chivitoWrap');
  });

  test('respeta el tamaño (size) y el título accesible', () => {
    const { container } = render(<ChivitoCompai size={40} title="Mi chivito" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
    expect(svg).toHaveAttribute('aria-label', 'Mi chivito');
  });

  test('state="speaking" marca data-visema para lip-sync', () => {
    const { container } = render(<ChivitoCompai state="speaking" visema="V2" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-visema', 'V2');
  });

  test('dos instancias simultáneas namespacean sus ids (sin colisión)', () => {
    const { container } = render(
      <div>
        <ChivitoCompai />
        <ChivitoCompai />
      </div>,
    );
    const svgs = container.querySelectorAll('svg[data-creature="chivito-punk"]');
    expect(svgs.length).toBe(2);
    const idsA = [...svgs[0].querySelectorAll('[id]')].map((n) => n.id);
    const idsB = [...svgs[1].querySelectorAll('[id]')].map((n) => n.id);
    expect(idsA.length).toBeGreaterThan(0);
    expect(idsA.some((id) => idsB.includes(id))).toBe(false);
  });

  test('guacamaya y chivito-punk renderizados juntos tampoco colisionan ids (#cuerpoRig compartido en origen)', async () => {
    const GuacamayaCompaiMod = await import('../GuacamayaCompai.jsx');
    const GuacamayaCompai = GuacamayaCompaiMod.default;
    const { container } = render(
      <div>
        <GuacamayaCompai />
        <ChivitoCompai />
      </div>,
    );
    const guaca = container.querySelector('svg[data-creature="guacamaya"]');
    const chivito = container.querySelector('svg[data-creature="chivito-punk"]');
    const idsGuaca = [...guaca.querySelectorAll('[id]')].map((n) => n.id);
    const idsChivito = [...chivito.querySelectorAll('[id]')].map((n) => n.id);
    expect(idsGuaca.some((id) => idsChivito.includes(id))).toBe(false);
  });

  test('trae su <style> con el CSS del rig recortado (sin el chrome de página del valle)', () => {
    const { container } = render(<ChivitoCompai />);
    const style = container.querySelector('svg style');
    expect(style).toBeInTheDocument();
    expect(style.textContent).not.toContain('#burbuja');
    expect(style.textContent).not.toContain('font-family:Georgia');
  });

  test('API rica: estado="respondiendo" → data-estado="hablar"', () => {
    const { container } = render(<ChivitoCompai estado="respondiendo" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-estado', 'hablar');
  });

  test('API rica: estado="senala" → data-estado="senalar"', () => {
    const { container } = render(<ChivitoCompai estado="senala" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-estado', 'senalar');
  });

  test('API rica: visema se estampa directamente (no hardcodeado)', () => {
    const { container } = render(<ChivitoCompai estado="respondiendo" visema="V3" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-visema', 'V3');
  });

  test('API rica: idle-cerebro expone momento como data-chivito-idle (solo con estado=acompana, tier!=bajo)', () => {
    const { container: c1 } = render(
      <div>
        <ChivitoCompai estado="acompana" tier="alto" />
        <ChivitoCompai estado="acompana" tier="bajo" />
        <ChivitoCompai estado="escuchando" tier="alto" />
      </div>,
    );
    const svgs = c1.querySelectorAll('svg');
    // Solo el primero (acompana + tier alto) debe tener el atributo
    expect(svgs[0]).toHaveAttribute('data-chivito-idle');
    expect(svgs[1]).not.toHaveAttribute('data-chivito-idle');
    expect(svgs[2]).not.toHaveAttribute('data-chivito-idle');
  });

  test('hostALigero convierte :host([data-estado="X"]) a [data-estado="X"] (light DOM fix)', () => {
    const { container } = render(<ChivitoCompai estado="hablar" />);
    const style = container.querySelector('svg style');
    // El CSS inyectado NO debe contener :host (ya fue reescrito por hostALigero)
    expect(style.textContent).not.toContain(':host(');
    // Pero SÍ debe contener selectores planos equivalentes
    expect(style.textContent).toContain('[data-estado="hablar"]');
  });
});
