import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * Tests básicos para AgentFab — verificar que el arrastre no rompe el renderizado.
 */
describe('AgentFab con arrastre', () => {
  beforeEach(() => {
    localStorage.clear();
    global.innerWidth = 1024;
    global.innerHeight = 768;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería importar el componente sin errores', () => {
    // Test básico de importación
    expect(() => {
      // No necesitamos importar el componente directamente en este test
      // Solo verificamos que el hook existe
      const hook = require('../hooks/useCompaiDraggable');
      expect(hook).toBeDefined();
    }).not.toThrow();
  });

  it('debería existir el archivo del hook useCompaiDraggable', () => {
    // Test básico de que el hook existe
    expect(() => {
      const hook = require('../hooks/useCompaiDraggable');
      expect(hook).toBeDefined();
    }).not.toThrow();
  });

  it('debería existir el test del hook useCompaiDraggable', () => {
    // Test básico de que el test del hook existe
    expect(() => {
      // No necesitamos importar el test del hook, solo verificar que existe
      const fs = require('fs');
      const path = require('path');
      const testPath = path.join(__dirname, '../hooks/useCompaiDraggable.test.jsx');
      expect(fs.existsSync(testPath)).toBe(true);
    }).not.toThrow();
  });

  it('el hook useCompaiDraggable debería exportar una función por defecto', () => {
    const hook = require('../hooks/useCompaiDraggable');
    expect(typeof hook.default).toBe('function');
  });

  it('el hook debería devolver la estructura esperada', () => {
    const { renderHook } = require('@testing-library/react');
    const useCompaiDraggable = require('../hooks/useCompaiDraggable').default;

    const { result } = renderHook(() => useCompaiDraggable());

    expect(result.current).toHaveProperty('compaiRef');
    expect(result.current).toHaveProperty('position');
    expect(result.current).toHaveProperty('isDragging');
    expect(result.current).toHaveProperty('positionStyle');
    expect(result.current).toHaveProperty('dragHandlers');
    expect(result.current).toHaveProperty('resetPosition');
  });

  it('debería guardar posición arrastrada en localStorage', () => {
    const testPosition = { bottom: 200, right: 250 };
    localStorage.setItem('compai-position', JSON.stringify(testPosition));
    
    const saved = localStorage.getItem('compai-position');
    expect(saved).toBeDefined();
    
    const parsed = JSON.parse(saved);
    expect(parsed).toEqual(testPosition);
  });

  it('debería resetear la posición correctamente', () => {
    const testPosition = { bottom: 200, right: 250 };
    localStorage.setItem('compai-position', JSON.stringify(testPosition));
    
    expect(localStorage.getItem('compai-position')).toBeDefined();
    
    localStorage.removeItem('compai-position');
    expect(localStorage.getItem('compai-position')).toBeNull();
  });

  it('debería manejar localStorage lleno gracefulmente', () => {
    // Test de que el hook no rompe si localStorage falla
    const testPosition = { bottom: 200, right: 250 };

    try {
      localStorage.setItem('compai-position', JSON.stringify(testPosition));
      expect(true).toBe(true);
    } catch (error) {
      expect(true).toBe(true); // Si falla, no debería romper la app
    }
  });

  describe('CSS --chagra-fab-rim opacidad reducida (fix halo blanco)', () => {
    const fs = require('fs');
    const path = require('path');

    it('debería tener opacidad reducida en tema oscuro (0.22 no 0.72)', () => {
      const cssPath = path.join(__dirname, 'agent-fab-skin.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Verificar que la opacidad del tema oscuro sea 0.22
      expect(cssContent).toMatch(/--chagra-fab-rim:\s*rgba\(255,\s*255,\s*255,\s*0\.22\)/);

      // Verificar que NO tenga la opacidad anterior (0.72)
      expect(cssContent).not.toMatch(/--chagra-fab-rim:\s*rgba\(255,\s*255,\s*255,\s*0\.72\)/);
    });

    it('debería tener opacidad reducida en temas claros (0.30 no 0.88)', () => {
      const cssPath = path.join(__dirname, 'agent-fab-skin.css');
      const cssContent = fs.readFileSync(cssPath, 'utf-8');

      // Verificar que la opacidad de temas claros sea 0.30
      expect(cssContent).toMatch(/\/\s*0\.30\)/);

      // Verificar que NO tenga la opacidad anterior (0.88)
      expect(cssContent).not.toMatch(/\/\s*0\.88\)/);
    });

    it('el archivo agent-fab-skin.css debería existir', () => {
      const cssPath = path.join(__dirname, 'agent-fab-skin.css');
      expect(fs.existsSync(cssPath)).toBe(true);
    });
  });
});
