/**
 * SoilDiagnosticScreen — diagnóstico de suelo guiado (DR-SUELOS-1, UI).
 *
 * Contrato cubierto:
 *   - Pantalla inicial: chips de síntomas con íconos + entrada de texto/voz.
 *   - Degradación: descripción sin match → mensaje amable, sin crash.
 *   - Flujo guiado: síntoma → prueba casera sugerida (con confiabilidad)
 *     → pasos numerados → reportar resultado → enmienda con dosis+precaución.
 *   - Anti-pseudociencia: pruebas `mito` (vinagre/bicarbonato) muestran el
 *     aviso "NO sirve para decidir" y nunca se presentan como válidas.
 *   - Guarda de enmienda: la cal queda BLOQUEADA hasta confirmar pH<5.5
 *     con la prueba; la advertencia de no sobre-encalar es visible.
 *   - Señal "buena" (tierra negra) → mensaje positivo, sin enmiendas.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../hooks/useVoiceRecorder', () => ({
  default: () => ({ durationMs: 0, start: vi.fn(), stop: vi.fn(), reset: vi.fn(), error: null }),
}));
vi.mock('../../services/voiceService', () => ({ transcribe: vi.fn() }));

const defaultProps = { onBack: () => {}, onNavigate: vi.fn() };

import SoilDiagnosticScreen from '../SoilDiagnosticScreen';

afterEach(() => cleanup());

const verTierra = () => fireEvent.click(screen.getByRole('button', { name: /Mirar mi tierra/i }));

describe('SoilDiagnosticScreen — pantalla inicial', () => {
  it('muestra los chips de síntomas con íconos y la entrada de texto', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    expect(screen.getByText(/Dura como piedra/i)).toBeTruthy();
    expect(screen.getByText(/Se empoza el agua/i)).toBeTruthy();
    expect(screen.getByLabelText(/Describe tu tierra/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mirar mi tierra/i })).toBeTruthy();
  });

  it('botón volver llama onBack', () => {
    const onBack = vi.fn();
    render(<SoilDiagnosticScreen onBack={onBack} onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(onBack).toHaveBeenCalled();
  });
});

describe('SoilDiagnosticScreen — degradación amable', () => {
  it('texto sin match → mensaje amable, sin crash', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Describe tu tierra/i), { target: { value: 'qwerty zzz' } });
    verTierra();
    expect(screen.getByText(/cuéntame más de tu tierra/i)).toBeTruthy();
    // Sigue en la pantalla de síntomas, puede reintentar
    expect(screen.getByRole('button', { name: /Mirar mi tierra/i })).toBeTruthy();
  });

  it('sin descripción ni chips el botón no avanza', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    verTierra();
    expect(screen.queryByText(/Esto veo en tu tierra/i)).toBeNull();
  });
});

describe('SoilDiagnosticScreen — flujo guiado completo', () => {
  it('síntoma → prueba con confiabilidad → pasos numerados → confirmar → enmienda con dosis y precaución', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    // 1. Elegir síntoma con ícono
    fireEvent.click(screen.getByRole('button', { name: /Dura como piedra/i }));
    verTierra();
    // 2. Diagnóstico preliminar: problema + prueba sugerida con confiabilidad visible
    expect(screen.getByText(/Esto veo en tu tierra/i)).toBeTruthy();
    expect(screen.getByText(/compactada/i)).toBeTruthy();
    expect(screen.getByText(/Varilla de penetración/i)).toBeTruthy();
    expect(screen.getAllByText(/Orienta, no decide/i).length).toBeGreaterThan(0);
    // 3. Abrir la prueba: pasos numerados de como_se_hace (sin inventar)
    fireEvent.click(screen.getByRole('button', { name: /Varilla de penetración/i }));
    expect(screen.getByText(/Insertar varilla metálica de 6mm/i)).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
    // 4. Reportar el resultado → enmienda con dosis y precaución del catálogo
    fireEvent.click(screen.getByRole('button', { name: /Sí, se confirmó/i }));
    expect(screen.getByText(/Abonos verdes/i)).toBeTruthy();
    expect(screen.getByText(/Nabo forrajero 20 kg\/ha/i)).toBeTruthy();
    expect(screen.getByText(/Incorporar en floración/i)).toBeTruthy();
  });

  it('señal buena (tierra negra) → mensaje positivo sin enmiendas', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Negra y sueltica/i }));
    verTierra();
    expect(screen.getByText(/se ve sana/i)).toBeTruthy();
    expect(screen.queryByText(/Cal dolomítica/i)).toBeNull();
  });

  it('aguacate + encharcamiento → alerta crítica visible', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Se empoza el agua/i }));
    fireEvent.click(screen.getByRole('button', { name: /Aguacate/i }));
    verTierra();
    expect(screen.getByText(/ALERTA CRÍTICA/i)).toBeTruthy();
    expect(screen.getByText(/Phytophthora/i)).toBeTruthy();
  });
});

describe('SoilDiagnosticScreen — anti-pseudociencia (mitos)', () => {
  it('la prueba de vinagre/bicarbonato aparece como MITO con aviso "NO sirve"', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sale helecho marranero/i }));
    verTierra();
    // Sección fija de mitos en el diagnóstico
    expect(screen.getByText(/Vinagre y bicarbonato/i)).toBeTruthy();
    expect(screen.getAllByText(/NO sirve para decidir/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/es un mito/i)).toBeTruthy();
  });

  it('si el campesino menciona vinagre, la advertencia MITO del servicio se muestra', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Describe tu tierra/i), {
      target: { value: 'le eché vinagre a la tierra y sale helecho' },
    });
    verTierra();
    expect(screen.getAllByText(/MITO/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/acidez intercambiable/i)).toBeTruthy();
  });

  it('al abrir la prueba mito NO hay botón de confirmar resultado', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sale helecho marranero/i }));
    verTierra();
    fireEvent.click(screen.getByRole('button', { name: /Vinagre y bicarbonato/i }));
    expect(screen.getAllByText(/NO sirve para decidir/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Sí, se confirmó/i })).toBeNull();
  });
});

describe('SoilDiagnosticScreen — guardas de enmienda', () => {
  it('sin confirmar el pH, la cal queda bloqueada con la guarda visible', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sale helecho marranero/i }));
    verTierra();
    // Saltar la prueba → recomendaciones con enmiendas pH bloqueadas
    fireEvent.click(screen.getByRole('button', { name: /Ver recomendaciones/i }));
    expect(screen.getByText(/Cal dolomítica/i)).toBeTruthy();
    expect(screen.getAllByText(/Primero haz la prueba de pH/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/NO sobre-encalar/i)).toBeTruthy();
  });

  it('con la prueba confirmada, la enmienda se muestra con dosis y precaución', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sale helecho marranero/i }));
    verTierra();
    fireEvent.click(screen.getByRole('button', { name: /pH con tiras/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sí, se confirmó/i }));
    expect(screen.getByText(/Cal dolomítica/i)).toBeTruthy();
    expect(screen.getByText(/Máximo 1 t\/ha\/año/i)).toBeTruthy();
    expect(screen.getByText(/NO sobre-encalar/i)).toBeTruthy();
    expect(screen.queryByText(/Primero haz la prueba de pH/i)).toBeNull();
  });

  it('si la prueba descartó el problema → no recomendar enmiendas', () => {
    render(<SoilDiagnosticScreen {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Sale helecho marranero/i }));
    verTierra();
    fireEvent.click(screen.getByRole('button', { name: /pH con tiras/i }));
    fireEvent.click(screen.getByRole('button', { name: /No, salió bien/i }));
    expect(screen.getByText(/no necesitas aplicar/i)).toBeTruthy();
    expect(screen.queryByText(/Máximo 1 t\/ha\/año/i)).toBeNull();
  });
});

describe('Capacidad en el manifiesto (apertura desde la mano Ⓐ)', () => {
  it('existe la capacidad "suelo" con ruta de navegación', async () => {
    const { CAPABILITY_MANIFEST } = await import('../../services/agentCapabilities');
    const cap = CAPABILITY_MANIFEST.find((c) => c.id === 'suelo');
    expect(cap).toBeTruthy();
    expect(cap.hero).toBe(true);
    expect(cap.heroRoute).toEqual({ kind: 'nav', view: 'suelo' });
  });
});
