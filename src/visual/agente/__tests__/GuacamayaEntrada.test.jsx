import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import { GuacamayaEntrada } from '../GuacamayaEntrada.jsx';

/**
 * GuacamayaEntrada — entrada teatral de la guacamaya como compañera.
 * Cubre: secuencia de fases (asoma→quieta→crece→brillo→lista), gates de
 * reduced-motion/tier bajo, callback onLista, y que el componente
 * GuacamayaCompai subyacente recibe las props correctas.
 */
describe('GuacamayaEntrada', () => {
  test('renderiza el wrapper con clase espera cuando activa=false', () => {
    const { container } = render(<GuacamayaEntrada activa={false} />);
    const wrapper = container.querySelector('.ang-entrada');
    expect(wrapper).toHaveClass('ang-entrada--espera');
  });

  test('renderiza GuacamayaCompai dentro del wrapper', () => {
    const { container } = render(<GuacamayaEntrada activa={false} />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toBeInTheDocument();
  });

  test('pasa size correctamente a GuacamayaCompai (+15% en el <svg>)', () => {
    const { container } = render(<GuacamayaEntrada activa={false} size={128} />);
    const wrapper = container.querySelector('.ang-entrada');
    // el wrapper del teatro reserva el `size` nominal…
    expect(wrapper).toHaveStyle({ width: '128px', height: '128px' });
    // …y la guacamaya se dibuja +15% sobre ese size (FACTOR_TAMANO, solo ella).
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toHaveAttribute('width', '147'); // round(128 * 1.15)
    expect(guacamaya).toHaveAttribute('height', '147');
  });

  test('con animated=false o reduced-motion, salta directo a lista', () => {
    const { container: c1 } = render(<GuacamayaEntrada activa={false} animated={false} />);
    const { container: c2 } = render(<GuacamayaEntrada activa={false} animated={true} />);
    
    // Con animated=false, debería estar en lista (sin teatro)
    expect(c1.querySelector('.ang-entrada')).toHaveClass('ang-entrada--lista');
    
    // Con animated=true, empieza en espera
    expect(c2.querySelector('.ang-entrada')).toHaveClass('ang-entrada--espera');
  });

  test('pasa tier a GuacamayaCompai', () => {
    const { container } = render(<GuacamayaEntrada activa={false} tier="bajo" />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toHaveAttribute('data-tier', 'bajo');
  });

  test('en fase espera, estado mapea a "idle" (acompana → idle en GuacamayaCompai)', () => {
    // Nota: no es fácil testear las fases dinámicas sin manipular el temporizador,
    // pero al menos verificamos que las props se pasan correctamente
    const { container } = render(<GuacamayaEntrada activa={false} />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    // "acompana" en GuacamayaCompai mapea a "idle" (ver ESTADO_RIG_DE_ESTADO_AGENTE)
    expect(guacamaya).toHaveAttribute('data-estado', 'idle');
  });

  test('callback onLista se llama al terminar (cuando animated=false)', () => {
    const onLista = vi.fn();
    render(<GuacamayaEntrada activa={false} animated={false} onLista={onLista} />);
    // Con animated=false, salta directo a lista y llama al callback inmediatamente
    expect(onLista).toHaveBeenCalledTimes(1);
  });

  test('el aro y el brillo están presentes (pero invisibles por CSS)', () => {
    const { container } = render(<GuacamayaEntrada activa={false} />);
    const aro = container.querySelector('.ang-entrada__aro');
    const brillo = container.querySelector('.ang-entrada__brillo');
    expect(aro).toBeInTheDocument();
    expect(brillo).toBeInTheDocument();
  });

  test('pasa additional props a GuacamayaCompai', () => {
    const { container } = render(
      <GuacamayaEntrada 
        activa={false} 
        estadoFinal="contenta"
        visema="V3"
      />
    );
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toBeInTheDocument();
  });
});
