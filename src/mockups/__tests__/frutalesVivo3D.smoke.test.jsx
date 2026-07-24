/*
 * Vitrina #/mockups/frutales-vivo-3d — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina monta
 * la FICHA 2D — el mismo camino del device-tiering real en gama baja. Aquí la
 * ficha no es un adorno de relleno: es la lección entera (el mango y el cítrico
 * a escala, con su franja de altura), así que se congela que salga completa y
 * bien rotulada. Se verifica además que el copy vaya en "usted" y que las dos
 * alturas del piso térmico estén dichas con número, no a ojo.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import FrutalesVivo3D from '../FrutalesVivo3D.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo de los frutales (mockups/frutales-vivo-3d)', () => {
  test('renderiza el título y el lema de la finca que sube', () => {
    render(<FrutalesVivo3D />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'El mango abajo, los cítricos arriba' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/la altura es la que decide qué se da/i)).toBeInTheDocument();
  });

  test('sin WebGL cae a la ficha 2D — y la ficha ENSEÑA la escala', () => {
    const { container } = render(<FrutalesVivo3D />);
    const ficha = screen.getByRole('img', { name: /a escala/i });
    expect(ficha).toBeInTheDocument();
    // el mango con su copa ancha y su brote vino; el cítrico chiquito al lado
    expect(container.querySelector('.fviva__mango-copa')).toBeInTheDocument();
    expect(container.querySelector('.fviva__brote')).toBeInTheDocument();
    expect(container.querySelector('.fviva__citrico-copa')).toBeInTheDocument();
    // la línea de suelo que los pone en la misma tierra (así se compara)
    expect(container.querySelector('.fviva__suelo')).toBeInTheDocument();
    // …y nunca se monta el canvas 3D en equipo humilde
    expect(container.querySelector('canvas')).toBeNull();
  });

  test('el piso térmico va dicho con números, no a ojo', () => {
    render(<FrutalesVivo3D />);
    // la cifra va dicha DOS veces a propósito: en la ficha y en los saberes
    expect(screen.getByText(/Mango: 0 a 1\.000 m/)).toBeInTheDocument();
    expect(screen.getAllByText(/hasta unos 1\.600 m/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/hasta unos 1\.000 metros/i)).toBeInTheDocument();
  });

  test('los cuatro saberes traen las dos señas diagnósticas', () => {
    const { container } = render(<FrutalesVivo3D />);
    expect(container.querySelectorAll('.fviva__saberes li').length).toBe(4);
    // el brote vino del mango y el pecíolo alado del cítrico: lo que los delata
    expect(screen.getByText(/brota color vino/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pecíolo alado/i).length).toBeGreaterThanOrEqual(1);
  });

  test('el copy va en "usted", sin voseo', () => {
    const { container } = render(<FrutalesVivo3D />);
    const texto = container.textContent;
    expect(texto).toMatch(/Está viendo|Su equipo|le enseñan/);
    expect(texto).not.toMatch(/tenés|querés|podés|mirá|sembrá|fijate/i);
  });
});
