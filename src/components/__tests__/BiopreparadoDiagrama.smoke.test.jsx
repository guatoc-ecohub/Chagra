import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import BiopreparadoDiagrama from '../BiopreparadoDiagrama';
import {
  getDiagramaBiopreparado,
  tieneDiagrama,
  iconoIngrediente,
} from '../../data/biopreparado-diagramas';

/**
 * Smoke tests — BiopreparadoDiagrama (TIER 2 #4: diagramas de biopreparados).
 *
 * Verifican que:
 *   - se renderiza el diagrama paso a paso de un biopreparado con receta curada,
 *   - los pasos están numerados (badges SVG accesibles) y traen título + detalle,
 *   - los ingredientes salen como fichas con su nombre,
 *   - `highlightIngredient` resalta el material recién agregado a la bodega,
 *   - la banda de seguridad y la fuente del catálogo se muestran (trazabilidad),
 *   - si el biopreparado NO tiene receta curada, devuelve null (la UI cae al texto),
 *   - ningún texto usa voseo argentino (español de Colombia).
 *
 * Fixtures fieles a catalog/biopreparados-seed.json (no se inventan dosis).
 */

const CALDO_BORDELES = {
  id: 'caldo_bordeles',
  nombre: 'Caldo bordelés',
  tipo: 'caldo',
  ingredientes: ['sulfato de cobre', 'cal hidratada', 'agua'],
  proceso_resumen: '100g sulfato + 100g cal en 10L agua…',
  tiempo_elaboracion_dias: 1,
  vida_util_dias: 1,
  precaucion_seguridad:
    'TOXICOLOGIA COBRE: metal pesado. EPI: guantes, careta y gafas. NO mezclar con caldo sulfocalcico.',
  fuente: 'Restrepo Rivera, J.; Agrosavia/ICA; Resolucion ICA 698/2011.',
};

const BOCASHI = {
  id: 'bocashi',
  nombre: 'Bocashi',
  tipo: 'fermentado',
  ingredientes: ['gallinaza', 'cascarilla de arroz', 'melaza', 'agua'],
  proceso_resumen: 'Fermentación aeróbica 15-21 días…',
  tiempo_elaboracion_dias: 18,
  precaucion_seguridad: 'Bajo riesgo. Aplicar MADURO y frio.',
  fuente: 'Restrepo Rivera, J. — ABC de la agricultura organica.',
};

const SIN_DIAGRAMA = {
  id: 'roca_fosforica',
  nombre: 'Roca fosfórica',
  ingredientes: ['roca fosfórica molida'],
  proceso_resumen: 'Aplicación directa al suelo.',
};

describe('BiopreparadoDiagrama — render del diagrama paso a paso', () => {
  test('renderiza el diagrama de caldo bordelés con sus 5 pasos numerados', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getByTestId('biopreparado-diagrama')).toBeInTheDocument();
    const pasos = getDiagramaBiopreparado('caldo_bordeles').pasos;
    for (const paso of pasos) {
      expect(screen.getByLabelText(`Paso ${paso.n}`)).toBeInTheDocument();
      expect(screen.getByText(paso.titulo)).toBeInTheDocument();
    }
  });

  test('muestra las cantidades destacadas (100 g) tomadas del catálogo', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getAllByText('100 g').length).toBeGreaterThanOrEqual(2);
  });

  test('renderiza las fichas de ingredientes con su nombre', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    for (const ing of CALDO_BORDELES.ingredientes) {
      expect(screen.getByText(ing)).toBeInTheDocument();
    }
  });

  test('muestra la banda de seguridad (precaución) del catálogo', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getByText(/TOXICOLOGIA COBRE/)).toBeInTheDocument();
  });

  test('muestra la fuente del catálogo (trazabilidad)', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getByText(/Resolucion ICA 698\/2011/)).toBeInTheDocument();
  });

  test('"se usa el mismo día" cuando tiempo_elaboracion_dias <= 1', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getAllByText(/mismo día/i).length).toBeGreaterThanOrEqual(1);
  });

  test('muestra "~N días de fermentación" para bocashi (18 días)', () => {
    render(<BiopreparadoDiagrama biopreparado={BOCASHI} />);
    expect(screen.getByText(/18 días/)).toBeInTheDocument();
    expect(screen.getByText(/fermentación/i)).toBeInTheDocument();
  });

  test('resalta el ingrediente recién agregado vía highlightIngredient', () => {
    render(
      <BiopreparadoDiagrama biopreparado={CALDO_BORDELES} highlightIngredient="cal" />,
    );
    // La ficha "cal hidratada" toma la clase de resaltado emerald.
    const cal = screen.getByText('cal hidratada');
    expect(cal.className).toMatch(/emerald/);
  });

  test('en modo compact NO renderiza el encabezado con el nombre', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} compact />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  test('en modo normal SÍ renderiza el nombre como encabezado', () => {
    render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    expect(screen.getByRole('heading', { name: /Caldo bordelés/ })).toBeInTheDocument();
  });
});

describe('BiopreparadoDiagrama — defensa y degradación elegante', () => {
  test('devuelve null si el biopreparado no tiene receta curada', () => {
    const { container } = render(<BiopreparadoDiagrama biopreparado={SIN_DIAGRAMA} />);
    expect(container.firstChild).toBeNull();
  });

  test('devuelve null si no hay biopreparado', () => {
    const { container } = render(<BiopreparadoDiagrama biopreparado={null} />);
    expect(container.firstChild).toBeNull();
  });

  test('devuelve null si el objeto no trae id', () => {
    const { container } = render(<BiopreparadoDiagrama biopreparado={{ nombre: 'X' }} />);
    expect(container.firstChild).toBeNull();
  });

  test('ningún texto del diagrama usa voseo argentino', () => {
    const { container } = render(<BiopreparadoDiagrama biopreparado={CALDO_BORDELES} />);
    // Regex de voseo establecida en el repo (ChipsToolbar.smoke): solo formas
    // imperativas con vocal final acentuada (escribí/tomá/tenés…). El diagrama
    // usa imperativos de USTED (Disuelva/Prepare/Vierta/Asperje) → no debe matchear.
    const VOSEO = /\b(escrib[íi]|ten[ée]s|quer[ée]s|eleg[íi]|pod[ée]s|sab[ée]s|aplicá|prepará|verté)\b/i;
    expect(container.textContent).not.toMatch(VOSEO);
  });
});

describe('overlay de datos biopreparado-diagramas', () => {
  test('tieneDiagrama es true para los 3 biopreparados de prueba', () => {
    expect(tieneDiagrama('caldo_bordeles')).toBe(true);
    expect(tieneDiagrama('bocashi')).toBe(true);
    expect(tieneDiagrama('biol')).toBe(true);
  });

  test('tieneDiagrama es false para ids sin receta curada o vacíos', () => {
    expect(tieneDiagrama('roca_fosforica')).toBe(false);
    expect(tieneDiagrama('')).toBe(false);
    expect(tieneDiagrama(undefined)).toBe(false);
  });

  test('cada diagrama tiene pasos numerados de 1..N en orden', () => {
    for (const id of ['caldo_bordeles', 'bocashi', 'biol']) {
      const { pasos } = getDiagramaBiopreparado(id);
      expect(pasos.length).toBeGreaterThanOrEqual(3);
      pasos.forEach((p, i) => {
        expect(p.n).toBe(i + 1);
        expect(p.titulo).toBeTruthy();
        expect(p.detalle).toBeTruthy();
        expect(p.icon).toBeTruthy();
      });
    }
  });

  test('iconoIngrediente mapea claves conocidas y cae a 🌿 por defecto', () => {
    expect(iconoIngrediente('agua')).toBe('💧');
    expect(iconoIngrediente('sulfato de cobre')).toBe('🔷');
    expect(iconoIngrediente('algo desconocido xyz')).toBe('🌿');
  });
});
