/**
 * CompaiGuiaPantalla.pizarra.test.jsx — el texto de explicación de la pantalla
 * vive EN LA PIZARRA, siempre.
 *
 * DECISIÓN DEL OPERADOR (2026-09-03): el texto de explicación de la pantalla
 * SALE EN LA PIZARRA (el board) SIEMPRE. Regla dura (commit 3233f7f06): la
 * pizarra es el ÚNICO aviso del compai. Este archivo fija:
 *
 *   1. EL GUARD ANTI-HUÉRFANA: la cadena manifiesto (compaiExplicaPantallas)
 *      → hook (useCompaiGuiaPantalla) → componente (CompaiGuiaPantalla) →
 *      pizarra (AgentFab) no puede volver a quedar sin consumidores. Si alguien
 *      des-cablea el componente del AgentFab, o el componente deja de consumir
 *      el hook, o el hook deja de consumir el manifiesto, ESTE test se pone
 *      rojo. (Historia: la cadena llegó a tener CERO consumidores — su propio
 *      JSDoc prometía un montaje en AgentFab que nunca existió.)
 *   2. El contrato nuevo del componente: bloque de pizarra (sin posición
 *      absoluta, sin BurbujaAngelita, sin timers): nada se monta solo.
 *   3. El comportamiento: tocar el compai muestra la explicación de SU
 *      pantalla en el peek; "Ver" abre el panel con la guía + funciones +
 *      salto al agente; con un aviso vivo, la guía lo acompaña SIEMPRE debajo.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { readFileSync } from 'node:fs';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Igual que AgentFab.politica.test.jsx: se neutralizan los "avisos vivos"
// (clima / susurro / agroecología) para aislar el cableado de la guía.
vi.mock('../../hooks/useCompaiClimaVivo', () => ({ __esModule: true, default: () => {}, useCompaiClimaVivo: () => {} }));
vi.mock('../../hooks/useCompaiSusurroNocturno', () => ({ __esModule: true, default: () => {}, useCompaiSusurroNocturno: () => {} }));
vi.mock('../../hooks/useCompaiAgroecologiaReal', () => ({ __esModule: true, default: () => {}, useCompaiAgroecologiaReal: () => {} }));
vi.mock('../../services/angelitaInteligencia', async (importOriginal) => {
  /** @type {object} */
  const actual = await importOriginal();
  return { ...actual, notificacionesInteligentes: () => ({ hay: false }) };
});

import CompaiGuiaPantalla from '../CompaiGuiaPantalla.jsx';
import AgentFab from '../AgentFab';
import useAngelitaStore from '../../store/useAngelitaStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';

const leerFuente = (rutaRelativa) =>
  readFileSync(new URL(rutaRelativa, import.meta.url), 'utf8');

beforeEach(() => {
  useAngelitaStore.setState({ silenciado: false, hoyNoFecha: null });
  useAngelitaStore.setState({ estado: 'calma', visualEstado: 'acompana', mensaje: null, tipo: null });
  useAgentNotificationStore.setState({ responseReady: false, lastAssistantMessage: null });
});
afterEach(cleanup);

describe('GUARD: la cadena explicación→pizarra no puede quedar sin consumidores', () => {
  it('AgentFab importa y monta CompaiGuiaPantalla (la guía vive en su panel "Ver")', () => {
    const fuente = leerFuente('../AgentFab.jsx');
    expect(fuente).toMatch(/import\s+CompaiGuiaPantalla\s+from\s+'\.\/CompaiGuiaPantalla(\.jsx)?';/);
    expect(fuente).toMatch(/<CompaiGuiaPantalla\s/);
  });

  it('CompaiGuiaPantalla consume useCompaiGuiaPantalla', () => {
    expect(leerFuente('../CompaiGuiaPantalla.jsx')).toMatch(/useCompaiGuiaPantalla\(/);
  });

  it('useCompaiGuiaPantalla consume el manifiesto (explicacionDePantalla)', () => {
    expect(leerFuente('../../hooks/useCompaiGuiaPantalla.js')).toMatch(/explicacionDePantalla\(/);
  });

  it('getHintForRuta (el texto del PEEK) consulta el manifiesto primero', () => {
    const fuente = leerFuente('../../config/compaiHints.js');
    expect(fuente).toMatch(/import\s+\{\s*explicacionDePantalla\s*\}\s+from\s+'\.\.\/services\/compaiExplicaPantallas\.js';/);
    expect(fuente.indexOf('explicacionDePantalla(')).toBeGreaterThan(
      fuente.indexOf('export function getHintForRuta'),
    );
  });

  it('el componente NO vuelve a ser una burbuja auto-pop (sin BurbujaAngelita ni timers)', () => {
    const fuente = leerFuente('../CompaiGuiaPantalla.jsx');
    // Prohibido reimportar la burbuja (menciones históricas en el JSDoc sí se
    // permiten, el import NO).
    expect(fuente).not.toMatch(/import\s+BurbujaAngelita/);
    expect(fuente).not.toMatch(/setTimeout|useEffect/);
    expect(fuente).not.toMatch(/position:\s*'absolute'/);
  });

  it('comportamiento: tocar el compai en bodega asoma SU explicación en la pizarra', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="bodega" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    expect(screen.getByTestId('compai-fab-peek').textContent)
      .toContain('Aquí caben los insumos, las herramientas y lo que ya cosechó.');
  });

  it('comportamiento: sin tocar nada, CERO guía en pantalla (la pizarra es el único aviso)', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="bodega" />);
    expect(document.querySelector('.compai-guia')).toBeNull();
    expect(screen.queryByTestId('compai-fab-peek')).toBeNull();
  });
});

describe('CompaiGuiaPantalla — bloque de la pizarra (contrato)', () => {
  it('pantalla cubierta: escribe el texto, las funciones y el salto al agente', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <CompaiGuiaPantalla pantalla="bodega" onNavigate={onNavigate} />,
    );
    const guia = container.querySelector('.compai-guia');
    expect(guia).toBeInTheDocument();
    expect(guia).toHaveAttribute('role', 'region');
    expect(guia.textContent).toContain('Aquí caben los insumos');
    expect(guia.textContent).toContain('Anotar insumos');
    expect(screen.getByRole('button', { name: /Preguntar sobre Su bodega/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Preguntar sobre Su bodega/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', {
      desdePantalla: 'bodega',
      spatialContext: { pantalla: 'bodega' },
    });
  });

  it('pantalla NO cubierta: no dice nada (mejor callado que inventado)', () => {
    const { container } = render(
      <CompaiGuiaPantalla pantalla="cafe" onNavigate={() => {}} />,
    );
    expect(container.querySelector('.compai-guia')).toBeNull();
  });

  it('sin onNavigate muestra la guía pero no el botón (la pizarra del overlay no navega)', () => {
    render(<CompaiGuiaPantalla pantalla="suelo" />);
    expect(screen.getByRole('region', { name: /Guía de/i }).textContent).toContain('La tierra no se adivina');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('AgentFab + CompaiGuiaPantalla — la guía SIEMPRE dentro de la pizarra', () => {
  it('"Ver" del peek abre el panel con la guía completa (texto + funciones + preguntar)', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="bodega" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ver el mensaje completo/i }));
    const panel = screen.getByTestId('compai-fab-panel');
    expect(panel.textContent).toContain('Aquí caben los insumos');
    expect(panel.textContent).toContain('Llevar cuentas');
    expect(screen.getByRole('button', { name: /Preguntar sobre Su bodega/i })).toBeInTheDocument();
  });

  it('con un aviso vivo, la explicación de la pantalla lo acompaña SIEMPRE en el panel', () => {
    useAngelitaStore.setState({
      estado: 'aviso',
      visualEstado: 'preocupada',
      mensaje: 'Revise la helada de esta noche.',
      tipo: 'alerta',
    });
    render(<AgentFab onNavigate={() => {}} pantalla="bodega" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ver el mensaje completo/i }));
    const panel = screen.getByTestId('compai-fab-panel');
    // El aviso vivo primero...
    expect(panel.textContent).toContain('Revise la helada de esta noche.');
    // ...y la guía de la pantalla SIEMPRE, dentro de la misma pizarra.
    expect(panel.textContent).toContain('Aquí caben los insumos');
    expect(panel.textContent).toContain('Anotar insumos');
  });

  it('cambio de pantalla: el peek muestra la explicación de la NUEVA pantalla', () => {
    const { rerender } = render(<AgentFab onNavigate={() => {}} pantalla="bodega" />);
    rerender(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    expect(screen.getByTestId('compai-fab-peek').textContent)
      .toContain('Su finca en el mapa, con sus lotes, aguas y siembras ubicados.');
  });
});
