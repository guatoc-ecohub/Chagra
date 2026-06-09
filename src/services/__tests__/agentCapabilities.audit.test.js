import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AGENT_CAPABILITIES,
  HOME_CAPABILITIES,
  MODE_CAPABILITIES,
  capabilityFailureMessage,
} from '../agentCapabilities.js';
import { CHIP_DEFS, CHIP_INTENTS, planForcedIntent } from '../chipIntentRouter.js';
import { __TEST__ as sidecarContract } from '../sidecarClient.js';

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

const CHIP_REGISTRY = [
  {
    intent: 'siembro',
    label: 'Consultar un cultivo',
    emoji: '🌱',
    kind: 'mode',
    tool: 'get_species',
  },
  {
    intent: 'plaga',
    label: 'Tengo una plaga',
    emoji: '🐛',
    kind: 'mode',
    tool: 'get_pest_controllers',
  },
  {
    intent: 'biopreparado',
    label: 'Preparar un biopreparado',
    emoji: '🧪',
    kind: 'mode',
    tool: 'get_biopreparados',
  },
  {
    intent: 'clima',
    label: 'Consultar el clima',
    emoji: '🌦️',
    kind: 'mode',
    tool: 'get_clima_ideam',
  },
  {
    intent: 'precio',
    label: 'Consultar un precio',
    emoji: '💰',
    kind: 'mode',
    tool: 'get_precio_sipsa',
  },
  {
    intent: 'calendario',
    label: 'Qué sembrar este mes',
    emoji: '📅',
    kind: 'mode',
    tool: 'get_calendario_siembra',
  },
  {
    intent: 'deep',
    label: 'Investigación profunda',
    emoji: '🔬',
    kind: 'deep',
    tool: null,
  },
];

describe('auditoría de regresión de la araña de capacidades', () => {
  it('mantiene un manifiesto único, sin IDs ni intents duplicados', () => {
    expect(new Set(AGENT_CAPABILITIES.map((cap) => cap.id)).size).toBe(AGENT_CAPABILITIES.length);
    const intents = MODE_CAPABILITIES.map((cap) => cap.intent);
    expect(new Set(intents).size).toBe(intents.length);
  });

  it('cada opción explica ayuda, siguiente dato, efecto y fuente esperada', () => {
    for (const cap of AGENT_CAPABILITIES) {
      expect(cap.label?.trim()).toBeTruthy();
      expect(cap.description?.trim()).toBeTruthy();
      expect(cap.prompt?.trim()).toBeTruthy();
      expect(cap.source?.trim()).toBeTruthy();
      expect(['mode', 'deep', 'photo', 'nav']).toContain(cap.kind);
      if (cap.kind === 'mode' || cap.kind === 'deep') {
        expect(cap.placeholder?.trim()).toBeTruthy();
      }
    }
  });

  it('cada chip visible coincide con el contrato de auditoría', () => {
    expect(CHIP_DEFS.map((chip) => chip.intent)).toEqual(CHIP_REGISTRY.map((chip) => chip.intent));
    for (const chip of CHIP_DEFS) {
      expect(typeof chip.emoji).toBe('string');
      expect(chip.emoji.length).toBeGreaterThan(0);
      expect(typeof chip.label).toBe('string');
      expect(chip.label.length).toBeGreaterThan(0);
      expect(typeof chip.placeholder).toBe('string');
    }
  });

  it('cada chip del registro tiene etiqueta, explicación e intención verificables', () => {
    for (const entry of CHIP_REGISTRY) {
      const def = CHIP_DEFS.find((chip) => chip.intent === entry.intent);
      expect(def).toBeTruthy();
      expect(def.label).toBe(entry.label);
      expect(def.emoji).toBe(entry.emoji);
      expect(def.kind).toBe(entry.kind);
    }
  });

  it('ninguna superficie promete fuente cuando puede no existir', () => {
    const banned = /toda respuesta viene con su fuente|cada respuesta cita su fuente/i;
    expect(readSource('../../components/dashboard/AgentHero.jsx')).not.toMatch(banned);
    expect(readSource('../../components/AgentScreen/AgentScreen.jsx')).not.toMatch(banned);
  });

  it('mantiene el home y la pantalla principal conectados al manifiesto de capacidades', () => {
    const hero = readSource('../../components/dashboard/AgentHero.jsx');
    const screen = readSource('../../components/AgentScreen/AgentScreen.jsx');
    expect(hero).not.toMatch(/\bconst\s+CAPABILITIES\s*=/);
    expect(hero).toContain('HOME_CAPABILITIES.map');
    expect(screen).toContain('visibleModeCapabilities.map');
    expect(screen).toContain('forcedIntent && !toolEvidence');
    expect(screen).toContain('capabilityFailureMessage(forcedIntent');
  });

  it('todo tool MCP visible está permitido y su plan usa los argumentos requeridos', () => {
    const opts = { municipio: 'Pasto', pisoTermico: 'frío' };
    for (const cap of MODE_CAPABILITIES.filter((item) => item.kind === 'mode')) {
      expect(sidecarContract.ALLOWED_TOOLS.has(cap.tool), `${cap.id}: ${cap.tool}`).toBe(true);
      const plan = planForcedIntent(cap.intent, 'papa', opts);
      expect(plan?.tool).toBe(cap.tool);
      for (const arg of cap.requiredArgs) {
        expect(plan?.args).toHaveProperty(arg);
      }
    }
  });

  it('ningún chip apunta a un tool ausente de la allowlist', () => {
    for (const entry of CHIP_REGISTRY) {
      if (entry.tool) {
        expect(sidecarContract.ALLOWED_TOOLS.has(entry.tool), `${entry.intent}: ${entry.tool}`).toBe(true);
      }
    }
  });

  it('el inventario visible sigue apuntando a tools reales', () => {
    for (const entry of CHIP_REGISTRY) {
      if (entry.tool) {
        expect(sidecarContract.ALLOWED_TOOLS.has(entry.tool)).toBe(true);
      }
    }
  });

  it('cada entrada del registro es un CHIP_INTENT válido', () => {
    for (const entry of CHIP_REGISTRY) {
      expect(CHIP_INTENTS[entry.intent]).toBe(entry.intent);
    }
  });

  it('cada CHIP_INTENT tiene una entrada en el registro', () => {
    const registeredIntents = new Set(CHIP_REGISTRY.map((chip) => chip.intent));
    for (const intent of Object.keys(CHIP_INTENTS)) {
      expect(registeredIntents.has(intent)).toBe(true);
    }
  });

  it('un fallo de capacidad declara que no hubo datos verificados', () => {
    for (const cap of MODE_CAPABILITIES.filter((item) => item.kind === 'mode')) {
      const message = capabilityFailureMessage(cap.intent);
      expect(message).toMatch(/no pude/i);
      expect(message).toMatch(/no voy a inventar|no se respondió con datos verificados/i);
    }
  });

  it('las acciones directas del home tienen una ruta ejecutable', () => {
    for (const cap of HOME_CAPABILITIES) {
      if (cap.kind === 'nav') expect(cap.view).toBeTruthy();
      if (cap.kind === 'mode') expect(cap.intent).toBeTruthy();
      if (cap.kind === 'photo') expect(cap.id).toBe('foto');
    }
  });
});
