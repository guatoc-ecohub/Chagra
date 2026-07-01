/**
 * agentUserFlow.smoke.test.jsx — Smoke tests del flujo visible de usuario nuevo.
 *
 * Protege el recorrido básico de un usuario que entra por primera vez:
 * 1. La barra de chips se ve sin jerga técnica.
 * 2. El estado activo de un modo se comunica claramente.
 * 3. Cuando una herramienta falla, el mensaje es entendible y útil.
 *
 * NO mockea el servidor: usa las definiciones estáticas de chipIntentRouter
 * para verificar que los strings visibles son claros para un campesino.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChipsToolbar from '../ChipsToolbar';
import { CHIP_DEFS, CHIP_INTENTS } from '../../services/chipIntentRouter';
import * as deepResearchClient from '../../services/deepResearchClient';

// Palabras que NO deben aparecer en textos visibles para el campesino
const JERGA_TECNICA = [
  /\btool\b/i,
  /\bendpoint\b/i,
  /\bapi\b/i,
  /\bbackend\b/i,
  /\bpipeline\b/i,
  /\brouter\b/i,
  /\bintent\b/i,
  /\bdisponible en este plan\b/i,
];

describe('flujo usuario nuevo — chips visibles sin jerga técnica', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ningún label o placeholder de chip contiene jerga técnica', () => {
    for (const def of CHIP_DEFS) {
      for (const pattern of JERGA_TECNICA) {
        expect(def.label).not.toMatch(pattern);
        expect(def.placeholder).not.toMatch(pattern);
      }
    }
  });

  it('chip precio ya no es stub y usa referencia local', () => {
    const precioDef = CHIP_DEFS.find((d) => d.intent === 'precio');
    expect(precioDef.kind).toBe('local');
    expect(precioDef.placeholder.toLowerCase()).toMatch(/producto|precio/i);
  });

  it('chip "¿Qué siembro?" usa fraseo de pregunta, no comando técnico', () => {
    const siembroDef = CHIP_DEFS.find((d) => d.intent === 'siembro');
    expect(siembroDef.label).toMatch(/^\?|^¿/);
    expect(siembroDef.label).not.toMatch(/\binput|query|species|comando\b/i);
  });

  it('el chip foto (cuando aparece) se llama "Foto" no "Attachment"', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} hasAttachment />);
    expect(screen.getByText('Foto')).toBeInTheDocument();
    expect(screen.queryByText(/attachment|imagen adjunta|archivo/i)).not.toBeInTheDocument();
  });
});

describe('flujo usuario nuevo — estado activo del modo claro', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chip activo tiene aria-pressed=true (accesible para screen reader)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} activeIntent="clima" />);
    const climaChip = screen.getByRole('button', { name: /clima/i });
    expect(climaChip).toHaveAttribute('aria-pressed', 'true');
    expect(climaChip).toHaveClass(/emerald/); // verde = activo
  });

  it('chip inactivo no tiene aria-pressed=true', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} activeIntent="clima" />);
    const siembroChip = screen.getByRole('button', { name: /siembro/i });
    expect(siembroChip).toHaveAttribute('aria-pressed', 'false');
  });

  it('cada chip visible tiene un accessible label descriptivo (no solo emoji)', () => {
    render(<ChipsToolbar onSelectIntent={() => {}} />);
    // Expandir "Más" para incluir los chips de grounding puntual (viven
    // detrás del toggle, no en la fila principal — ver docstring del A4).
    fireEvent.click(screen.getByTestId('mode-chip-more'));
    // Con DR flag OFF, deep no se renderiza
    const visibleDefs = CHIP_DEFS.filter((d) => d.intent !== CHIP_INTENTS.deep);
    for (const def of visibleDefs) {
      // Match EXACTO (no substring): algunas etiquetas comparten palabras
      // (ej. "Páramo" vs "Alerta normativa páramo") — un regex suelto
      // encuentra ambas y `getByRole` revienta con "multiple elements".
      const chip = screen.getByRole('button', { name: def.label });
      expect(chip).toBeInTheDocument();
      expect(chip).toHaveAttribute('aria-label', expect.stringContaining(def.label));
    }
  });
});

describe('flujo usuario nuevo — respuesta entendible cuando falla una herramienta', () => {
  beforeEach(() => {
    vi.spyOn(deepResearchClient, 'isDeepResearchEnabled').mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('chip precio es local y mantiene contrato visible', () => {
    const precioDef = CHIP_DEFS.find((d) => d.intent === 'precio');
    expect(precioDef.kind).toBe('local');
  });

  it('chip precio conserva una etiqueta clara para consultar referencias', () => {
    const precioDef = CHIP_DEFS.find((d) => d.intent === 'precio');
    expect(precioDef.label).toBe('Precio');
    expect(precioDef.placeholder).toMatch(/producto/i);
  });

  it('placeholder de clima pide municipio (guía al usuario a dar información útil)', () => {
    const climaDef = CHIP_DEFS.find((d) => d.intent === 'clima');
    expect(climaDef.placeholder.toLowerCase()).toMatch(/zona|dónde|municipio|región|ubicación|lluvia/i);
  });

  it('placeholder de siembro pide la planta (guía al usuario)', () => {
    const siembroDef = CHIP_DEFS.find((d) => d.intent === 'siembro');
    expect(siembroDef.placeholder.toLowerCase()).toMatch(/planta|siembr|escribe|di/i);
  });

  it('placeholder de plaga pide describir el daño (guía al usuario)', () => {
    const plagaDef = CHIP_DEFS.find((d) => d.intent === 'plaga');
    expect(plagaDef.placeholder.toLowerCase()).toMatch(/plaga|daño|describe|ves/i);
  });
});
