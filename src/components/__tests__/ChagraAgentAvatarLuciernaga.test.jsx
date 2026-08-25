/**
 * ChagraAgentAvatarLuciernaga.test.jsx — la INTEGRACIÓN nivel-jaguar de la
 * luciérnaga compai (operador 2026-08-25): comportamiento + presencia + marcha,
 * SIN tocar el arte rubber-hose aprobado (Luciernaga.jsx).
 *
 * Cubre las superficies que ESTA rama cambió (el ARTE no se testea acá porque
 * no cambió — su render vive en tests de creatures):
 *   · el avatar 2D del agente (ChagraAgentAvatarLuciernaga → FAB/chat/header)
 *     con la PRESENCIA aditiva (useAngelitaPresencia, mismo contrato que el
 *     jaguar/Angelita/oso)
 *   · el estado 'caminando' para roam (CON_MARCHA)
 *   · los 4 estados clásicos + el contrato rico (estado, eco, visema, etc.)
 *   · backwards compatibility con state histórico
 *
 * jsdom no trae render real de SVG ni el loop de useFrame: se cubre el
 * CONTRATO observable (cuerpo montado, estado/visema que viajan, botón
 * accesible, presencia ADITIVA).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChagraAgentAvatarLuciernaga from '../ChagraAgentAvatarLuciernaga.jsx';

afterEach(cleanup);

describe('ChagraAgentAvatarLuciernaga — el agente 2D monta la luciérnaga (arte conservado)', () => {
  it('renderiza el CUERPO de la luciérnaga (svg data-creature="luciernaga", role=img)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" />);
    const raiz = container.querySelector('svg[data-creature="luciernaga"]');
    expect(raiz).toBeInTheDocument();
    expect(raiz).toHaveAttribute('role', 'img');
  });

  it("state='speaking' pasa el visema (lip-sync) al cuerpo", () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="speaking" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-visema', 'V2');
  });

  it("state='thinking' enciende su firma eco='leer' (la linterna lee la noche)", () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="thinking" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-eco', 'leer');
  });

  it("state='listening' usa pose 'reposo'", () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="listening" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'reposo');
  });

  it("state='idle' usa pose 'vuela' (base, flota)", () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'vuela');
  });

  it('onClick envuelve en button accesible', () => {
    let n = 0;
    render(<ChagraAgentAvatarLuciernaga state="idle" onClick={() => { n += 1; }} ariaLabel="Luciérnaga" />);
    fireEvent.click(screen.getByRole('button', { name: 'Luciérnaga' }));
    expect(n).toBe(1);
  });

  it('onDoubleClick envuelve en button accesible', () => {
    let n = 0;
    render(<ChagraAgentAvatarLuciernaga state="idle" onDoubleClick={() => { n += 1; }} ariaLabel="Luciérnaga" />);
    fireEvent.doubleClick(screen.getByRole('button', { name: 'Luciérnaga' }));
    expect(n).toBe(1);
  });
});

describe('ChagraAgentAvatarLuciernaga — PRESENCIA aditiva (contrato jaguar/Angelita/oso)', () => {
  it('reaccionaPresencia es ADITIVA: sin handlers NO fuerza un button', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" reaccionaPresencia />);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toBeInTheDocument();
  });

  it('reaccionaPresencia por defecto false: el adaptador histórico no cambia', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toBeInTheDocument();
    expect(container.querySelector('button')).toBeNull();
  });

  it('con handlers, la presencia viaja por el botón (hover directo) sin romperlo', () => {
    render(<ChagraAgentAvatarLuciernaga state="idle" reaccionaPresencia onClick={() => {}} ariaLabel="Luciérnaga" />);
    const boton = screen.getByRole('button', { name: 'Luciérnaga' });
    // Los listeners de presencia son pasivos: disparar el hover no debe romper.
    fireEvent.pointerEnter(boton);
    expect(boton).toBeInTheDocument();
  });

  it('la presencia solo despierta en estados pasivos (NO interrumpe speaking/thinking)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="speaking" reaccionaPresencia />);
    // En speaking activo, la presencia no debe cambiar el estado
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'celebra');
  });
});

describe('ChagraAgentAvatarLuciernaga — estado caminando (roam CON_MARCHA)', () => {
  it("state='caminando' usa pose 'vuela' (la luciérnaga vuela al deambular)", () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="caminando" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'vuela');
  });

  it('caminando respeta el contrato rico (estado prop)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga estado="caminando" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'vuela');
  });
});

describe('ChagraAgentAvatarLuciernaga — contrato rico (estado + props extras)', () => {
  it('estado prop tiene prioridad sobre state prop (backwards compatibility)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" estado="speaking" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-pose', 'celebra');
  });

  it('eco prop custom se respeta (sobreescribe el default)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" eco="sano" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-eco', 'sano');
  });

  it('visema prop custom se respeta (sobreescribe el default)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" visema="V3" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-visema', 'V3');
  });

  it('animated prop se respeta (reduced-motion)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" animated={false} />);
    // Con animated=false, no debe haber data-vida
    expect(container.querySelector('svg[data-creature="luciernaga"]')).not.toHaveAttribute('data-vida');
  });

  it('tier prop se respeta (data-tier viaja al cuerpo)', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" tier="bajo" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-tier', 'bajo');
  });

  it('glow prop añade drop-shadow verde-linterna', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="idle" glow />);
    const svg = container.querySelector('svg[data-creature="luciernaga"]');
    expect(svg).toBeInTheDocument();
    expect(svg.style.filter).toContain('drop-shadow');
    expect(svg.style.filter).toContain('199,255,78'); // verde-linterna
  });

  it('withLabel agrega el nombre "Luciérnaga" bajo el dibujo', () => {
    render(<ChagraAgentAvatarLuciernaga state="idle" withLabel />);
    expect(screen.getByText('Luciérnaga')).toBeInTheDocument();
  });
});

describe('ChagraAgentAvatarLuciernaga — backwards compatibility (API histórica)', () => {
  it('state prop solo (sin estado) funciona como antes', () => {
    const { container } = render(<ChagraAgentAvatarLuciernaga state="thinking" />);
    expect(container.querySelector('svg[data-creature="luciernaga"]')).toHaveAttribute('data-eco', 'leer');
  });

  it('props clásicas (size, className, ariaLabel) se respetan', () => {
    const { container } = render(
      <ChagraAgentAvatarLuciernaga
        state="idle"
        size={64}
        className="mi-clase"
        ariaLabel="Mi Luciérnaga"
      />
    );
    const svg = container.querySelector('svg[data-creature="luciernaga"]');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '64');
    expect(svg).toHaveAttribute('height', '64');
    expect(svg).toHaveAttribute('aria-label', 'Mi Luciérnaga');
    expect(svg).toHaveClass('mi-clase');
  });
});
