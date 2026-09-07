/**
 * ChagraAgentAvatarOsoBaston.integral.test.jsx — la INTEGRACIÓN nivel-jaguar
 * del oso del bastón compai (operador 2026-08-24): comportamiento + tamaño,
 * SIN tocar el arte aprobado (la lámina musculosa de OsoBaston.jsx).
 *
 * Cubre las superficies que ESTA rama cambió (el ARTE no se testea acá porque
 * no cambió — su render vive en OsoBaston.render.test.jsx):
 *   · el avatar 2D del agente (ChagraAgentAvatarOsoBaston → FAB/chat/header)
 *     con la PRESENCIA aditiva (useAngelitaPresencia, mismo contrato que el
 *     jaguar/Angelita)
 *   · el TAMAÑO +5% en la identidad de presencia 3D (OSO_BASTON_PRESENCIA)
 *
 * jsdom no trae render real de SVG ni el loop de useFrame: se cubre el
 * CONTRATO observable (cuerpo montado, estado/visema que viajan, botón
 * accesible, presencia ADITIVA, tamaño en datos). El teletransporte místico y
 * el skin conservado se verifican por GPU-capture aparte (shot3d --headed).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarOsoBaston from '../ChagraAgentAvatarOsoBaston.jsx';
import { OSO_BASTON_PRESENCIA } from '../../visual/creatures/osoBastonIdentidad.js';

afterEach(cleanup);

describe('ChagraAgentAvatarOsoBaston — el agente 2D monta el oso del bastón (arte conservado)', () => {
  it('renderiza el CUERPO del oso (svg data-creature="oso-baston", role=img), no la abeja', () => {
    const { container } = render(<ChagraAgentAvatarOsoBaston state="idle" />);
    const raiz = container.querySelector('svg[data-creature="oso-baston"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
    expect(container.querySelector('[data-creature="abeja-angelita"]')).toBeNull();
  });

  it("state='speaking' pasa el visema (lip-sync) al cuerpo", () => {
    const { container } = render(<ChagraAgentAvatarOsoBaston state="speaking" />);
    expect(container.querySelector('svg[data-creature="oso-baston"]')).toHaveAttribute('data-visema', 'V2');
  });

  it("state='thinking' enciende su firma resopla (data-resopla)", () => {
    const { container } = render(<ChagraAgentAvatarOsoBaston state="thinking" />);
    expect(container.querySelector('svg[data-creature="oso-baston"]')).toHaveAttribute('data-resopla', '1');
  });

  it('onClick envuelve en button accesible', () => {
    let n = 0;
    render(<ChagraAgentAvatarOsoBaston state="idle" onClick={() => { n += 1; }} ariaLabel="Oso del bastón" />);
    fireEvent.click(screen.getByRole('button', { name: 'Oso del bastón' }));
    expect(n).toBe(1);
  });
});

describe('ChagraAgentAvatarOsoBaston — PRESENCIA aditiva (contrato jaguar/Angelita)', () => {
  it('reaccionaPresencia es ADITIVA: sin handlers NO fuerza un button', () => {
    const { container } = render(<ChagraAgentAvatarOsoBaston state="idle" reaccionaPresencia />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('svg[data-creature="oso-baston"]')).toBeInTheDocument();
  });

  it('reaccionaPresencia por defecto false: el adaptador histórico no cambia', () => {
    const { container } = render(<ChagraAgentAvatarOsoBaston state="idle" />);
    expect(container.querySelector('svg[data-creature="oso-baston"]')).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });

  it('con handlers, la presencia viaja por el botón (hover directo) sin romperlo', () => {
    render(<ChagraAgentAvatarOsoBaston state="idle" reaccionaPresencia onClick={() => {}} ariaLabel="Oso del bastón" />);
    const boton = screen.getByRole('button', { name: 'Oso del bastón' });
    // Los listeners de presencia son pasivos: disparar el hover no debe romper.
    fireEvent.pointerEnter(boton);
    expect(boton).toBeInTheDocument();
  });
});

describe('OSO_BASTON_PRESENCIA — el oso del valle 3D se lee +5% (operador 2026-08-24)', () => {
  it('billboardBase subió a 65 (de 62 ≈ +5%)', () => {
    expect(OSO_BASTON_PRESENCIA.billboardBase).toBe(65);
    expect(OSO_BASTON_PRESENCIA.billboardBase).toBeGreaterThan(62);
  });

  it('billboardPorEnergia subió a 11 (de 10 ≈ +5%): el rango de tamaño escala parejo', () => {
    expect(OSO_BASTON_PRESENCIA.billboardPorEnergia).toBe(11);
    // tamaño máx (energia=1) 72→76 = +5.6%; mín (energia=0) 62→65 = +4.8%.
    const maxNuevo = OSO_BASTON_PRESENCIA.billboardBase + OSO_BASTON_PRESENCIA.billboardPorEnergia;
    expect(maxNuevo).toBe(76);
  });
});
