import { describe, expect, it } from 'vitest';
import {
  ALIASES_ESTADO,
  ARIA_DE_ESTADO,
  ARIA_POR_ESTADO,
  ESTADOS_AGENTE,
  ESTADOS_ANGELITA,
  ESTADOS_DE_PERFIL,
  POSE_DE_ESTADO,
  POSES_DE_ESTADO,
  ariaDeEstado,
  estadoCanonico,
  textoDeEstado,
  validarPerfilDeEstados,
} from '../angelitaEstados.js';

describe('vocabulario de estados compai', () => {
  it('expone diez estados conversacionales species-neutral y conserva aliases históricos', () => {
    expect(ESTADOS_AGENTE).toHaveLength(10);
    expect(ESTADOS_ANGELITA).toBe(ESTADOS_AGENTE);
    expect(POSE_DE_ESTADO).toBe(POSES_DE_ESTADO);
    expect(new Set(ESTADOS_AGENTE).size).toBe(10);
    expect(ESTADOS_AGENTE).not.toContain('caminando');
  });

  it('normaliza aliases conocidos y degrada uno desconocido a acompana', () => {
    expect(ALIASES_ESTADO.idle).toBe('acompana');
    expect(estadoCanonico('señala')).toBe('senala');
    expect(estadoCanonico('estado-inexistente')).toBe('acompana');
    expect(estadoCanonico()).toBe('acompana');
  });

  it('construye texto y ARIA con el nombre del compai elegido', () => {
    expect(textoDeEstado('pensando', 'Jaguar')).toContain('Jaguar');
    expect(ariaDeEstado('no-se', 'Luciérnaga')).toContain('Luciérnaga');
    expect(ARIA_POR_ESTADO.pensando).toContain('{nombre}');
    expect(ARIA_DE_ESTADO.pensando).toContain('Angelita');
  });

  it('valida las diez poses conversacionales más caminando', () => {
    const completo = Object.fromEntries(ESTADOS_DE_PERFIL.map((estado) => [estado, 'vuela']));
    expect(validarPerfilDeEstados(completo, 'jaguar')).toBe(true);
    expect(validarPerfilDeEstados('jaguar', completo)).toBe(true);
  });

  it('reporta slug y estado faltante cuando un perfil está incompleto', () => {
    const incompleto = Object.fromEntries(
      ESTADOS_DE_PERFIL.filter((estado) => estado !== 'pensando').map((estado) => [estado, 'vuela'])
    );
    expect(() => validarPerfilDeEstados(incompleto, 'jaguar')).toThrow(/jaguar.*pensando/);
    expect(() => validarPerfilDeEstados({ posePorEstado: incompleto, slug: 'zariguya' }))
      .toThrow(/zariguya.*pensando/);
  });
});
