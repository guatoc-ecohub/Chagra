/**
 * BurbujaAngelita.test.jsx — el botón de "responder por voz" (#91).
 *
 * El resto del componente (recorte de texto, corrección de posición en
 * pantalla) ya está cubierto por burbujaEnPantalla.test.js contra las
 * funciones puras; aquí sólo se prueba lo nuevo: `permiteEscucha` cablea
 * activarEscucha({ fuente: 'tip' }) — el mismo contrato desacoplado que
 * usa EscuchaFab, sin que la burbuja sepa nada de grabar audio.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import BurbujaAngelita from '../BurbujaAngelita.jsx';
import { EVENTO_ESCUCHA } from '../../../services/escuchaService.js';

afterEach(cleanup);

describe('<BurbujaAngelita> — botón de responder por voz (#91)', () => {
  it('permiteEscucha=false (default): no pinta el botón de micrófono', () => {
    const { container } = render(<BurbujaAngelita mensaje="Riegue temprano." />);
    expect(container.querySelector('.angelita-burbuja__escuchar')).toBeNull();
  });

  it('permiteEscucha=true: pinta el botón con su aria-label', () => {
    const { getByLabelText } = render(
      <BurbujaAngelita mensaje="Riegue temprano." permiteEscucha />,
    );
    expect(getByLabelText('Responder por voz a este aviso')).toBeInTheDocument();
  });

  it('tocar el botón dispara activarEscucha({ fuente: "tip" }) — llega el CustomEvent global', () => {
    const oyente = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, oyente);
    const { getByLabelText } = render(
      <BurbujaAngelita mensaje="Riegue temprano." permiteEscucha />,
    );
    fireEvent.click(getByLabelText('Responder por voz a este aviso'));
    window.removeEventListener(EVENTO_ESCUCHA, oyente);

    expect(oyente).toHaveBeenCalledTimes(1);
    expect(oyente.mock.calls[0][0].detail).toMatchObject({ fuente: 'tip' });
  });

  it('sin mensaje no pinta nada, ni siquiera con permiteEscucha=true', () => {
    const { container } = render(<BurbujaAngelita mensaje={null} permiteEscucha />);
    expect(container.firstChild).toBeNull();
  });
});
