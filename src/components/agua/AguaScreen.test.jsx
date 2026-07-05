/**
 * AguaScreen.test.jsx — módulo "Agua de la finca".
 *
 * Cubre:
 *   1. Render base: camino del agua + los 3 pilares navegables.
 *   2. Calculadora de lluvia: 100 m² × 100 mm → 8.000 L (determinista).
 *   3. Cambio de pilar: riego (calculadora ETc) y cuidar (caso nacimiento).
 *   4. Honestidad grounded: los slots pendientes se pintan como "dato en
 *      camino", nunca como cifra.
 *   5. Puente al agente (onNavigate).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AguaScreen from './AguaScreen.jsx';

describe('AguaScreen — render base', () => {
  it('monta la pantalla con el camino del agua y los 3 pilares', () => {
    render(<AguaScreen onBack={() => {}} />);
    expect(screen.getByTestId('agua-screen')).toBeInTheDocument();
    expect(screen.getByTestId('camino-del-agua')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-lluvia')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-riego')).toBeInTheDocument();
    expect(screen.getByTestId('pilar-tab-cuidar')).toBeInTheDocument();
    // Arranca en el pilar de lluvia
    expect(screen.getByTestId('pilar-lluvia')).toBeInTheDocument();
  });
});

describe('AguaScreen — calculadora de cosecha de lluvia', () => {
  it('calcula litros al mes: 100 m² × 100 mm × 0.8 = 8.000 L', () => {
    render(<AguaScreen onBack={() => {}} />);
    expect(screen.getByTestId('calc-lluvia-vacia')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('agua-area-techo'), { target: { value: '100' } });
    fireEvent.change(screen.getByTestId('agua-lluvia-mes'), { target: { value: '100' } });

    const resultado = screen.getByTestId('calc-lluvia-resultado');
    expect(resultado).toHaveTextContent('8.000');
    expect(resultado).toHaveTextContent('litros al mes');
    // Con el tanque default de 1.000 L queda lleno (100%)
    expect(resultado).toHaveTextContent('100%');
  });

  it('no muestra resultado con entradas incompletas', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.change(screen.getByTestId('agua-area-techo'), { target: { value: '100' } });
    expect(screen.queryByTestId('calc-lluvia-resultado')).toBeNull();
  });
});

describe('AguaScreen — pilar riego', () => {
  it('calcula ETc y litros/día con valores digitados', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-riego'));
    expect(screen.getByTestId('pilar-riego')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('agua-eto'), { target: { value: '4' } });
    fireEvent.change(screen.getByTestId('agua-kc'), { target: { value: '1.15' } });
    fireEvent.change(screen.getByTestId('agua-area-riego'), { target: { value: '100' } });

    const resultado = screen.getByTestId('calc-riego-resultado');
    expect(resultado).toHaveTextContent('460');
    expect(resultado).toHaveTextContent('litros al día');
    expect(resultado).toHaveTextContent('4.6 mm/día');
  });

  it('muestra los Kc de cultivos ya groundeados (FAO-56) y llena el campo al tocar', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-riego'));
    // Kc groundeados: el chip de maíz muestra su valor de etapa media (1.2).
    const chipMaiz = screen.getByTestId('agua-kc-maiz');
    expect(chipMaiz).toHaveTextContent('Maíz');
    expect(chipMaiz).toHaveTextContent('1.2');
    // Al tocarlo, se llena el campo Kc de la calculadora.
    fireEvent.click(chipMaiz);
    expect(screen.getByTestId('agua-kc')).toHaveValue(1.2);
    // La ETo por piso térmico también quedó groundeada (referencia IDEAM).
    expect(screen.getByTestId('agua-eto-piso-frío')).toBeInTheDocument();
  });
});

describe('AguaScreen — pilar cuidar (caso nacimiento + ENSO)', () => {
  it('muestra el caso insignia y la conexión con el clima ENSO', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));
    expect(screen.getByTestId('pilar-cuidar')).toBeInTheDocument();

    const caso = screen.getByTestId('caso-nacimiento');
    expect(caso).toHaveTextContent('Se me seca el nacimiento en verano');
    // Conexión viva con ensoService (fase default en test: Neutral)
    expect(screen.getByTestId('enso-conexion')).toHaveTextContent(/Neutral|Niño|Niña/);
  });

  it('muestra las dosis de potabilización y la ronda legal ya groundeadas', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));
    // Dosis groundeadas (EPA/OMS/EAWAG): cloro, hervido y SODIS con cifras.
    const dosis = screen.getByTestId('agua-dosis-potabilizacion');
    expect(dosis).toHaveTextContent(/2 gotas/i);
    expect(dosis).toHaveTextContent(/1 minuto/i);
    expect(dosis).toHaveTextContent(/3 minutos/i);
    // Ronda legal groundeada (Decreto 1449/1977): 100 m nacimiento, 30 m cauce.
    const ronda = screen.getByTestId('agua-ronda-legal');
    expect(ronda).toHaveTextContent(/100 metros a la redonda/i);
    expect(ronda).toHaveTextContent(/30 metros a cada lado/i);
  });
});

describe('AguaScreen — riesgos de contaminación + salud', () => {
  it('muestra qué contamina el agua con el semáforo de peligro', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));

    const bloque = screen.getByTestId('agua-que-contamina');
    // Focos clave del pedido del operador presentes.
    expect(bloque).toHaveTextContent(/venenos y plaguicidas/i);
    expect(bloque).toHaveTextContent(/cocheras y corrales/i);
    expect(bloque).toHaveTextContent(/letrinas/i);
    // Vías de contaminación explicadas (didáctico).
    expect(bloque).toHaveTextContent(/escorrent/i);
    expect(bloque).toHaveTextContent(/lixiviaci/i);
    // Semáforo: los venenos son peligro ALTO.
    const riesgoVeneno = screen.getByTestId('riesgo-plaguicidas');
    expect(riesgoVeneno).toHaveTextContent(/peligro alto/i);
  });

  it('la metahemoglobinemia (bebé azul) cita autoridad institucional, nunca una persona', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));

    const meta = screen.getByTestId('enfermedad-metahemoglobinemia');
    expect(meta).toHaveTextContent(/bebé azul/i);
    // Safety-critical: respaldado por OMS y Resolución 2115/2007 (MinSalud).
    expect(meta).toHaveTextContent(/OMS/);
    expect(meta).toHaveTextContent(/Resolución 2115\/2007/);
    // Nitratos como causa y su límite grounded.
    expect(meta).toHaveTextContent(/nitrato/i);
    expect(meta).toHaveTextContent(/50 mg\/L/);
    // Marcada como grave.
    expect(meta).toHaveTextContent(/grave/i);
  });

  it('muestra la intoxicación por plaguicidas con el ICA como autoridad', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));
    const intox = screen.getByTestId('enfermedad-intoxicacion');
    expect(intox).toHaveTextContent(/intoxicaci/i);
    expect(intox).toHaveTextContent(/ICA/);
  });

  it('muestra la regla de las distancias groundeadas + la ilustración de la finca', () => {
    render(<AguaScreen onBack={() => {}} />);
    fireEvent.click(screen.getByTestId('pilar-tab-cuidar'));

    // Ilustración presente (decorativa) y lista de distancias.
    expect(screen.getByTestId('distancias-finca')).toBeInTheDocument();
    const distancias = screen.getByTestId('agua-distancias');
    // Cifras grounded: 10 m fumigación terrestre, 100 m nacimiento, 30 m letrina.
    expect(screen.getByTestId('distancia-fumigacion-terrestre')).toHaveTextContent('10 m');
    expect(screen.getByTestId('distancia-nacimiento')).toHaveTextContent('100 m');
    expect(screen.getByTestId('distancia-septico')).toHaveTextContent('30 m');
    // Normas citadas.
    expect(distancias).toHaveTextContent(/Decreto 1843\/1991/);
    expect(distancias).toHaveTextContent(/RAS/);
    // Honestidad: el retiro exacto de corrales aún es "dato en camino".
    expect(screen.getByTestId('agua-distancias')).toHaveTextContent(/en camino/i);
  });
});

describe('AguaScreen — puente al agente', () => {
  it('navega al agente con la pregunta prellenada', () => {
    const onNavigate = vi.fn();
    render(<AguaScreen onBack={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('agua-preguntar-agente'));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      prefilledPrompt: expect.stringMatching(/agua/i),
    }));
  });
});
