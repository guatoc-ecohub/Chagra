import { describe, it, expect } from 'vitest';
import { comentarioDeMundo } from '../comentarista';

describe('comentarista - ramificación por perfil', () => {
  describe('mis_matas', () => {
    it('usa lenguaje técnico para perfil técnico', () => {
      const comentario = comentarioDeMundo(
        'mis_matas',
        { cultivos: [{ name: 'Café', count: 10 }] },
        { vocacion: 'tecnico' }
      );

      expect(comentario).toContain('cultivos');
      expect(comentario).toContain('manejo técnico');
      expect(comentario).not.toContain('matas');
    });

    it('usa lenguaje campesino para perfil campesino', () => {
      const comentario = comentarioDeMundo(
        'mis_matas',
        { cultivos: [{ name: 'Café', count: 10 }] },
        { vocacion: 'campesino' }
      );

      expect(comentario).toContain('matas');
      expect(comentario).toContain('¿Le hacemos seguimiento?');
    });

    it('usa lenguaje default para perfil curioso', () => {
      const comentario = comentarioDeMundo(
        'mis_matas',
        { cultivos: [{ name: 'Café', count: 10 }] },
        { vocacion: 'curioso' }
      );

      expect(comentario).toContain('matas');
      expect(comentario).toContain('¿Le hacemos seguimiento?');
    });
  });

  describe('mis_animales', () => {
    it('usa lenguaje técnico para perfil técnico', () => {
      const comentario = comentarioDeMundo(
        'mis_animales',
        { especies: [{ name: 'Gallinas', count: 20 }] },
        { vocacion: 'tecnico' }
      );

      expect(comentario).toContain('inventario pecuario');
      expect(comentario).toContain('parámetros de manejo');
    });

    it('usa lenguaje campesino para perfil campesino', () => {
      const comentario = comentarioDeMundo(
        'mis_animales',
        { especies: [{ name: 'Gallinas', count: 20 }] },
        { vocacion: 'campesino' }
      );

      expect(comentario).toContain('animales');
      expect(comentario).toContain('¿Revisamos cómo van?');
    });
  });

  describe('clima', () => {
    it('usa lenguaje técnico para perfil técnico', () => {
      const comentario = comentarioDeMundo(
        'clima',
        {
          snapshot: { alertas_locales: [{ type: 'helada' }] }
        },
        { vocacion: 'tecnico' }
      );

      expect(comentario).toContain('monitoreo climático');
      expect(comentario).toContain('análisis');
    });

    it('usa lenguaje campesino para perfil campesino', () => {
      const comentario = comentarioDeMundo(
        'clima',
        {
          snapshot: { alertas_locales: [{ type: 'helada' }] }
        },
        { vocacion: 'campesino' }
      );

      expect(comentario).toContain('parte del clima');
      expect(comentario).toContain('¿Se los muestro?');
    });
  });

  describe('vender', () => {
    it('usa lenguaje técnico para perfil técnico', () => {
      const comentario = comentarioDeMundo(
        'vender',
        { cultivos: [{ name: 'Café', count: 10 }] },
        { vocacion: 'tecnico' }
      );

      expect(comentario).toContain('comercializar');
      expect(comentario).toContain('costos');
      expect(comentario).toContain('estudio de mercado');
    });

    it('usa lenguaje campesino para perfil campesino', () => {
      const comentario = comentarioDeMundo(
        'vender',
        { cultivos: [{ name: 'Café', count: 10 }] },
        { vocacion: 'campesino' }
      );

      expect(comentario).toContain('vender');
      expect(comentario).toContain('sacar cuentas');
    });
  });

  describe('aprender', () => {
    it('menciona bibliografía para perfil técnico', () => {
      const comentario = comentarioDeMundo('aprender', {}, { vocacion: 'tecnico' });

      expect(comentario).toContain('bibliografía agroecológica');
    });

    it('usa lenguaje cercano para perfil campesino', () => {
      const comentario = comentarioDeMundo('aprender', {}, { vocacion: 'campesino' });

      expect(comentario).toContain('sin afán');
      expect(comentario).toContain('pregúnteme');
    });
  });

  describe('bosque', () => {
    it('menciona restauración ecológica para perfil restaurador', () => {
      const comentario = comentarioDeMundo('bosque', {}, { rol: 'restaurador' });

      expect(comentario).toContain('restauración ecológica');
      expect(comentario).toContain('protocolos');
    });

    it('usa marco conceptos para perfil técnico', () => {
      const comentario = comentarioDeMundo('bosque', {}, { vocacion: 'tecnico' });

      expect(comentario).toContain('marcos conceptuales');
    });
  });

  describe('paramo', () => {
    it('menciona servicios ecosistémicos para guía de glaciar', () => {
      const comentario = comentarioDeMundo('paramo', {}, { rol: 'guia_glaciar' });

      expect(comentario).toContain('servicios ecosistémicos');
      expect(comentario).toContain('nacimiento');
    });
  });
});
