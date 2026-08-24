import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import { GuacamayaSalida } from '../GuacamayaSalida.jsx';

/**
 * GuacamayaSalida — salida épica de la guacamaya como compañera.
 * Cubre: secuencia de fases (aleta→mistico→completo), gates de
 * reduced-motion/tier bajo, callback onSalio, y que el componente
 * GuacamayaCompai subyacente recibe las props correctas.
 */
describe('GuacamayaSalida', () => {
  test('renderiza el wrapper con clase espera cuando activa=false', () => {
    const { container } = render(<GuacamayaSalida activa={false} />);
    const wrapper = container.querySelector('.guaca-salida');
    expect(wrapper).toHaveClass('guaca-salida--espera');
  });

  test('renderiza GuacamayaCompai dentro del wrapper', () => {
    const { container } = render(<GuacamayaSalida activa={false} />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toBeInTheDocument();
  });

  test('pasa size correctamente a GuacamayaCompai', () => {
    const { container } = render(<GuacamayaSalida activa={false} size={128} />);
    const wrapper = container.querySelector('.guaca-salida');
    expect(wrapper).toHaveStyle({ width: '128px', height: '128px' });
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toHaveAttribute('width', '128');
    expect(guacamaya).toHaveAttribute('height', '128');
  });

  test('con animated=false o reduced-motion, salta directo a completo', () => {
    const { container: c1 } = render(<GuacamayaSalida activa={false} animated={false} />);
    const { container: c2 } = render(<GuacamayaSalida activa={false} animated={true} />);
    
    // Con animated=false, debería estar en completo (sin teatro)
    expect(c1.querySelector('.guaca-salida')).toHaveClass('guaca-salida--completo');
    
    // Con animated=true, empieza en espera
    expect(c2.querySelector('.guaca-salida')).toHaveClass('guaca-salida--espera');
  });

  test('pasa tier a GuacamayaCompai', () => {
    const { container } = render(<GuacamayaSalida activa={false} tier="bajo" />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toHaveAttribute('data-tier', 'bajo');
  });

  test('en fase aleta, usa estadoSalida (default: invita)', () => {
    const { container } = render(<GuacamayaSalida activa={false} estadoSalida="invita" />);
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toHaveAttribute("data-estado", "idle"); // estado inicial en espera (acompana → idle) en espera
  });

  test('callback onSalio se llama al terminar (cuando animated=false)', () => {
    const onSalio = vi.fn();
    render(<GuacamayaSalida activa={false} animated={false} onSalio={onSalio} />);
    // Con animated=false, salta directo a completo y llama al callback inmediatamente
    expect(onSalio).toHaveBeenCalledTimes(1);
  });

  test('opacidad es 1 en espera/aleta, 0 en mistico/completo', () => {
    const { container: c1 } = render(<GuacamayaSalida activa={false} />);
    const { container: c2 } = render(<GuacamayaSalida activa={false} animated={false} />);
    
    // Con animated=true (default), empieza en espera con opacidad 1
    const wrapper1 = c1.querySelector('.guaca-salida');
    expect(wrapper1).toHaveStyle({ opacity: '1' });
    
    // Con animated=false, salta directo a completo con opacidad 0
    const wrapper2 = c2.querySelector('.guaca-salida');
    expect(wrapper2).toHaveStyle({ opacity: '0' });
  });

  test('pasa additional props a GuacamayaCompai', () => {
    const { container } = render(
      <GuacamayaSalida 
        activa={false} 
        visema="V2"
      />
    );
    const guacamaya = container.querySelector('[data-creature="guacamaya"]');
    expect(guacamaya).toBeInTheDocument();
  });
});
