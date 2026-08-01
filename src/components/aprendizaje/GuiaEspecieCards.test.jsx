/**
 * GuiaEspecieCards.test.jsx — cobertura del componente de tarjetas de APRENDIZAJE.
 *
 * Task #aprendizaje-cards: Verifica que el componente renderice correctamente
 * las guías fenológicas por especie en formato de tarjetas móviles-first.
 *
 * Casos cubiertos:
 *   1. Renderiza guía de papa por defecto
 *   2. Renderiza guía de café cuando se solicita
 *   3. Renderiza etapas personalizadas cuando se pasan como prop
 *   4. Es colapsable (expandir/contraer)
 *   5. Muestra todas las etapas en orden
 *   6. Muestra manejo y plaga de cada etapa
 *   7. Usa español colombiano (sin voseo argentino)
 *   8. Maneja caso de especie sin datos
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GuiaEspecieCards from './GuiaEspecieCards';

describe('GuiaEspecieCards — módulo APRENDIZAJE', () => {
  beforeEach(() => {
    // Limpiar cualquier estado previo
  });

  it('renderiza guía de papa por defecto', () => {
    render(<GuiaEspecieCards />);

    // Verificar que el componente se renderiza
    const card = screen.getByTestId('guia-especie-cards');
    expect(card).toBeInTheDocument();

    // Verificar que muestra "Guía de la especie"
    expect(screen.getByText(/Guía de la especie/i)).toBeInTheDocument();

    // Verificar que indica la especie (papa) - buscar en el header específicamente
    const header = screen.getByTestId('guia-especie-cards-toggle');
    expect(header).toContainHTML('papa');
  });

  it('renderiza guía de café cuando se solicita', () => {
    render(<GuiaEspecieCards especie="cafe" />);

    const card = screen.getByTestId('guia-especie-cards');
    expect(card).toBeInTheDocument();

    // Verificar que indica la especie (cafe)
    expect(screen.getByText(/cafe/i)).toBeInTheDocument();

    // Verificar etapas específicas de café
    expect(screen.getByText(/Sembrar en semillero con sombra/i)).toBeInTheDocument();
    expect(screen.getByText(/Hormiga cortadora/i)).toBeInTheDocument();
  });

  it('renderiza etapas personalizadas cuando se pasan como prop', () => {
    const etapasCustom = [
      {
        orden: 1,
        nombre: 'Siembra',
        dias: 'Día 0',
        manejo: 'Preparar suelo y sembrar',
        plaga_ventana: 'Ninguna al inicio'
      }
    ];

    render(<GuiaEspecieCards especie="custom" etapas={etapasCustom} />);

    // Verificar que muestra la etapa custom
    expect(screen.getByText(/Siembra/i)).toBeInTheDocument();
    expect(screen.getByText(/Día 0/i)).toBeInTheDocument();
    expect(screen.getByText(/Preparar suelo y sembrar/i)).toBeInTheDocument();
    expect(screen.getByText(/Ninguna al inicio/i)).toBeInTheDocument();
  });

  it('es colapsable (expandir/contraer)', () => {
    render(<GuiaEspecieCards especie="papa" />);

    const toggle = screen.getByTestId('guia-especie-cards-toggle');

    // Por defecto está expandido, así que debería mostrar etapas
    expect(screen.getByTestId('guia-especie-etapa-1')).toBeInTheDocument();

    // Hacer clic para contraer
    fireEvent.click(toggle);

    // Ahora NO debería mostrar etapas (está colapsado)
    // Nota: el header sigue visible, pero las etapas no
    expect(screen.queryByTestId('guia-especie-etapa-1')).not.toBeInTheDocument();

    // Hacer clic para expandir de nuevo
    fireEvent.click(toggle);

    // Ahora SÍ debería mostrar etapas de nuevo
    expect(screen.getByTestId('guia-especie-etapa-1')).toBeInTheDocument();
  });

  it('muestra todas las etapas en orden (papa)', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que existen las 6 etapas
    expect(screen.getByTestId('guia-especie-etapa-1')).toBeInTheDocument();
    expect(screen.getByTestId('guia-especie-etapa-2')).toBeInTheDocument();
    expect(screen.getByTestId('guia-especie-etapa-3')).toBeInTheDocument();
    expect(screen.getByTestId('guia-especie-etapa-4')).toBeInTheDocument();
    expect(screen.getByTestId('guia-especie-etapa-5')).toBeInTheDocument();
    expect(screen.getByTestId('guia-especie-etapa-6')).toBeInTheDocument();

    // Verificar nombres de etapas (usar getAllByText si hay múltiples ocurrencias)
    expect(screen.getAllByText(/Germinación/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vegetativo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Floración/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fructificación/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cosecha/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Producto/i).length).toBeGreaterThan(0);
  });

  it('muestra manejo y plaga de cada etapa', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que muestra secciones "Qué hacer" y "Qué vigilar"
    const queHacerLabels = screen.getAllByText(/Qué hacer/i);
    expect(queHacerLabels.length).toBeGreaterThan(0);

    const queVigilarLabels = screen.getAllByText(/Qué vigilar/i);
    expect(queVigilarLabels.length).toBeGreaterThan(0);

    // Verificar contenido específico de manejo
    expect(screen.getByText(/Mantener humedad constante/i)).toBeInTheDocument();

    // Verificar contenido específico de plaga
    expect(screen.getByText(/Pulguilla de la papa/i)).toBeInTheDocument();
  });

  it('usa español colombiano (sin voseo argentino)', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que NO usa voseo argentino (palabras prohibidas)
    const content = screen.getByTestId('guia-especie-cards').textContent;

    expect(content).not.toMatch(/vos|tenés|querés|elegí|dale|acá|che/);

    // Verificar que SÍ usa español colombiano estándar (puede usar tú/usted)
    // "Mantener", "Proteger", "Apilar", "Fertilizar" son imperativos (tú)
    expect(content).toMatch(/Mantener|Proteger|Apilar|Fertilizar/i);
  });

  it('maneja caso de especie sin datos', () => {
    // Especie que no existe en el demo y sin etapas custom
    render(<GuiaEspecieCards especie="inexistente" etapas={[]} />);

    // Debería mostrar mensaje de "No hay información"
    expect(screen.getByText(/No hay información de guías/i)).toBeInTheDocument();

    // No debería mostrar etapas
    expect(screen.queryByTestId('guia-especie-etapa-1')).not.toBeInTheDocument();
  });

  it('muestra días desde siembra en cada etapa', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que muestra información de días
    expect(screen.getByText(/7-14 días/i)).toBeInTheDocument();
    expect(screen.getByText(/15-45 días/i)).toBeInTheDocument();
    expect(screen.getByText(/90-120 días/i)).toBeInTheDocument();
  });

  it('usa íconos y colores apropiados para cada etapa', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que hay elementos con clases de colores específicos
    // (límite, verde, rosa, ámbar, amarillo para las diferentes etapas)
    const etapa1 = screen.getByTestId('guia-especie-etapa-1');
    expect(etapa1.className).toContain('border-lime-600');

    const etapa3 = screen.getByTestId('guia-especie-etapa-3');
    expect(etapa3.className).toContain('border-pink-600');

    const etapa4 = screen.getByTestId('guia-especie-etapa-4');
    expect(etapa4.className).toContain('border-amber-600');
  });

  it('cada etapa muestra su icono de ciclo distinto (no un genérico repetido)', () => {
    const { container } = render(<GuiaEspecieCards especie="papa" />);

    // Un icono de etapa por card, con el orden fenológico correcto…
    const ordenes = Array.from(
      container.querySelectorAll('svg[data-etapa-orden]'),
      (svg) => svg.getAttribute('data-etapa-orden'),
    );
    expect(ordenes).toEqual(['1', '2', '3', '4', '5', '6']);

    // …y los seis glifos son geometrías distintas entre sí.
    const glifos = Array.from(
      container.querySelectorAll('svg[data-etapa-orden]'),
      (svg) => svg.innerHTML,
    );
    expect(new Set(glifos).size).toBe(6);
  });

  it('es móvil-first (responsive)', () => {
    render(<GuiaEspecieCards especie="papa" />);

    // Verificar que usa clases de Tailwind responsive
    const card = screen.getByTestId('guia-especie-cards');
    expect(card.className).toContain('rounded-xl');

    // Las tarjetas de etapas deberían ser responsive
    const etapa1 = screen.getByTestId('guia-especie-etapa-1');
    expect(etapa1.className).toContain('rounded-r-lg');

    const etapa2 = screen.getByTestId('guia-especie-etapa-2');
    expect(etapa2.className).toContain('rounded-r-lg');
  });
});