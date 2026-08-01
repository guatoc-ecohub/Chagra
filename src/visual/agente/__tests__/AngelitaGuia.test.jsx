/**
 * AngelitaGuia.test.jsx — el CABLEADO del mecanismo reutilizable: que el
 * hook (useAngelitaGuia, probado a fondo aparte) efectivamente llegue al
 * DOM — el gesto declarado llega a <Angelita>, el texto declarado llega a
 * la burbuja, y la navegación/cierre funcionan desde la UI real.
 *
 * Nota: el mensaje de la burbuja pasa por <Typewriter> (grafema a grafema),
 * que además duplica el texto completo en dos nodos (`.tw__molde` para el
 * tamaño estable, `.tw__sr` para lectores de pantalla) — por eso las
 * aserciones de MENSAJE miran `.tw__molde` puntual en vez de `getByText`
 * (que encontraría ambos y lanzaría "multiple elements").
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { AngelitaGuia } from '../AngelitaGuia.jsx';

afterEach(cleanup);

/** Deja correr varios cortes cortos de act() (ver nota en useAngelitaGuia.test.js). */
async function asentar(comprobar, { intentos = 15, pasoMs = 20 } = {}) {
  for (let i = 0; i < intentos; i += 1) {
    if (comprobar()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, pasoMs));
    });
  }
}

const panelListo = () => document.querySelector('.ang-guia__panel') !== null;
const textoBurbuja = () => document.querySelector('.tw__molde')?.textContent ?? '';

describe('<AngelitaGuia> — sin paradas no pinta nada', () => {
  it('paradas=[] → null', () => {
    const { container } = render(<AngelitaGuia paradas={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('<AngelitaGuia> — el gesto y el texto declarados llegan al DOM', () => {
  it('el gesto de la parada llega a <Angelita> (data-agt-estado) y el texto a la burbuja', async () => {
    const ref = createRef();
    render(
      <>
        <div ref={ref} style={{ width: 200, height: 80 }}>elemento real</div>
        <AngelitaGuia
          paradas={[{ id: 'cafe', ref, texto: 'El café mojado coge hongos.', gesto: 'senala', tipo: 'atencion' }]}
          demoraInicialMs={0}
        />
      </>,
    );

    await asentar(panelListo);

    const svg = document.querySelector('svg[data-agente="angelita"]');
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('data-agt-estado')).toBe('senala');
    // angelitaVariedad puede anteponerle una apertura ('Mire:', 'Pendiente:'…);
    // lo que importa es que el NÚCLEO factual llegue intacto.
    expect(textoBurbuja()).toMatch(/café mojado coge hongos/i);
  });

  it('sin gesto declarado, Angelita actúa "senala" por defecto', async () => {
    const ref = createRef();
    render(
      <>
        <div ref={ref}>x</div>
        <AngelitaGuia paradas={[{ id: 'a', ref, texto: 'x' }]} demoraInicialMs={0} />
      </>,
    );
    await asentar(panelListo);
    expect(document.querySelector('svg[data-agente="angelita"]').getAttribute('data-agt-estado')).toBe('senala');
  });
});

describe('<AngelitaGuia> — navegación y cierre desde la UI', () => {
  it('una sola parada: el botón principal dice "Entendido" y la cierra', async () => {
    const ref = createRef();
    render(
      <>
        <div ref={ref}>x</div>
        <AngelitaGuia paradas={[{ id: 'a', ref, texto: 'solo una parada' }]} demoraInicialMs={0} />
      </>,
    );
    await asentar(panelListo);
    expect(textoBurbuja()).toMatch(/solo una parada/i);
    // Una sola parada: sin navegación previa, botón principal = "Entendido".
    expect(screen.queryByText('← Antes')).toBeNull();

    act(() => {
      fireEvent.click(screen.getByText('Entendido'));
    });
    expect(document.querySelector('.ang-guia__panel')).toBeNull();
  });

  it('varias paradas: "Siguiente" avanza a la próxima (su texto cambia)', async () => {
    const refA = createRef();
    const refB = createRef();
    render(
      <>
        <div ref={refA}>a</div>
        <div ref={refB}>b</div>
        <AngelitaGuia
          paradas={[
            { id: 'a', ref: refA, texto: 'primera parada' },
            { id: 'b', ref: refB, texto: 'segunda parada' },
          ]}
          demoraInicialMs={0}
        />
      </>,
    );
    await asentar(panelListo);
    expect(textoBurbuja()).toMatch(/primera parada/i);
    expect(screen.getByText('1/2')).toBeTruthy();

    act(() => {
      fireEvent.click(screen.getByText('Siguiente →'));
    });
    await asentar(() => /segunda parada/i.test(textoBurbuja()));

    expect(textoBurbuja()).toMatch(/segunda parada/i);
    expect(screen.getByText('2/2')).toBeTruthy();
    // Última parada: el botón principal ya dice "Entendido", no "Siguiente".
    expect(screen.queryByText('Siguiente →')).toBeNull();
  });

  it('el botón de cerrar (×) apaga la guía inmediatamente', async () => {
    const ref = createRef();
    render(
      <>
        <div ref={ref}>x</div>
        <AngelitaGuia paradas={[{ id: 'a', ref, texto: 'texto a cerrar' }]} demoraInicialMs={0} />
      </>,
    );
    await asentar(panelListo);

    act(() => {
      fireEvent.click(screen.getByLabelText('Cerrar la guía de Angelita'));
    });
    expect(document.querySelector('.ang-guia__panel')).toBeNull();
  });
});
