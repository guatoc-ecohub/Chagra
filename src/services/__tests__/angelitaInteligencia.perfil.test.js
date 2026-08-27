import { describe, it, expect, vi } from 'vitest';
import { resolverComportamiento } from '../angelitaInteligencia';
import { comentarioDeMundo } from '../../compai/nucleo/comentarista';

// Mock del comentarista para verificar que se llama con perfil
vi.mock('../../compai/nucleo/comentarista', () => ({
  comentarioDeMundo: vi.fn((mundo, datos, perfil) => {
    // Retorna un comentario basado en el perfil
    if (perfil?.vocacion === 'tecnico') {
      return `Comentario técnico para ${mundo}`;
    }
    return `Comentario default para ${mundo}`;
  }),
}));

describe('resolverComportamiento - inyección de perfil', () => {
  it('acepta perfil en el contexto', () => {
    const decision = resolverComportamiento({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Maíz', count: 5 }] },
      perfil: { vocacion: 'campesino' },
    });

    expect(decision).toBeDefined();
    expect(decision.estado).toBe('husmea');
  });

  it('pasa perfil a comentarioDeMundo', () => {
    const perfilTecnico = { vocacion: 'tecnico' };

    const decision = resolverComportamiento({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Maíz', count: 5 }] },
      perfil: perfilTecnico,
    });

    // Verificar que se llamó a comentarioDeMundo con el perfil
    expect(comentarioDeMundo).toHaveBeenCalledWith(
      'mis_matas',
      expect.any(Object),
      perfilTecnico
    );

    // El mensaje debe reflejar el perfil técnico
    expect(decision.mensaje).toContain('técnico');
  });

  it('funciona sin perfil (backward compatibility)', () => {
    const decision = resolverComportamiento({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Maíz', count: 5 }] },
    });

    expect(decision).toBeDefined();
    expect(decision.estado).toBe('husmea');
  });

  it('respeta cooldown y ocupado con perfil', () => {
    const decision = resolverComportamiento({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Maíz', count: 5 }] },
      perfil: { vocacion: 'campesino' },
      ocupado: true,
      ultimaHablaPorLlave: { 'husmea:mis_matas': Date.now() - 1000 },
    });

    // Si está ocupado y en cooldown, debe respetar la anti-molestia
    expect(decision).toBeDefined();
  });

  it('prioriza aviso sobre husmea con perfil', () => {
    const decision = resolverComportamiento({
      notificaciones: {
        hay: true,
        estado: 'aviso',
        severidad: 'alta',
        lead: '¡Helada今晚!',
        items: [],
        restCount: 0,
        prompt: '¿Qué hacer con la helada?',
        prioridad: 100,
      },
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Maíz', count: 5 }] },
      perfil: { vocacion: 'campesino' },
    });

    // El aviso debe tener prioridad sobre el husmeo
    expect(decision.estado).toBe('aviso');
    expect(decision.mensaje).toContain('Helada');
  });
});
