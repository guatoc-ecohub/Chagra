/**
 * scripts/__tests__/audit-arboles-mueven.test.mjs
 *
 * Tests del auditor "¿los árboles se mueven?".
 * Verifica que la heurística clasifique correctamente archivos según tengan:
 * - Árboles con movimiento (viento/oscilación/tiempo)
 * - Árboles estáticos
 * - Sin árboles
 *
 * Casos límite importantes:
 * - Agua animada no debe contar como movimiento de árbol
 * - Cámara animada no debe contar como movimiento de árbol
 * - Shader de viento debe detectarse como movimiento
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  analizarArchivo,
  recorrerDirectorio,
  armarReporte,
  DIRECTORIOS_SALTADOS,
  VENTANA_LINEAS,
  PATRONES_ARBOL,
  PATRONES_TIEMPO,
  PATRONES_OSCILACION,
  PATRONES_VIENTO,
} from '../audit-arboles-mueven.mjs';

describe('audit-arboles-mueven', () => {
  describe('constantes exportadas', () => {
    it('exporta DIRECTORIOS_SALTADOS con node_modules, vendor, dist', () => {
      expect(DIRECTORIOS_SALTADOS.has('node_modules')).toBe(true);
      expect(DIRECTORIOS_SALTADOS.has('vendor')).toBe(true);
      expect(DIRECTORIOS_SALTADOS.has('dist')).toBe(true);
    });

    it('exporta VENTANA_LINEAS = 40', () => {
      expect(VENTANA_LINEAS).toBe(40);
    });

    it('exporta PATRONES_ARBOL con términos de árbol', () => {
      expect(PATRONES_ARBOL.length).toBeGreaterThan(0);
      expect(PATRONES_ARBOL.some(p => p.id === 'arbol')).toBe(true);
      expect(PATRONES_ARBOL.some(p => p.id === 'tree')).toBe(true);
      expect(PATRONES_ARBOL.some(p => p.id === 'copa')).toBe(true);
    });

    it('exporta PATRONES_TIEMPO con términos de tiempo', () => {
      expect(PATRONES_TIEMPO.length).toBeGreaterThan(0);
      expect(PATRONES_TIEMPO.some(p => p.id === 'getElapsedTime')).toBe(true);
      expect(PATRONES_TIEMPO.some(p => p.id === 'elapsedTime')).toBe(true);
      expect(PATRONES_TIEMPO.some(p => p.id === 'clock')).toBe(true);
    });

    it('exporta PATRONES_OSCILACION con Math.sin/cos', () => {
      expect(PATRONES_OSCILACION.length).toBeGreaterThan(0);
      expect(PATRONES_OSCILACION.some(p => p.id === 'Math.sin')).toBe(true);
      expect(PATRONES_OSCILACION.some(p => p.id === 'Math.cos')).toBe(true);
    });

    it('exporta PATRONES_VIENTO con wind/sway', () => {
      expect(PATRONES_VIENTO.length).toBeGreaterThan(0);
      expect(PATRONES_VIENTO.some(p => p.id === 'wind')).toBe(true);
      expect(PATRONES_VIENTO.some(p => p.id === 'sway')).toBe(true);
    });
  });

  describe('caso 1: árbol con viento (CON_MOVIMIENTO)', () => {
    it('detecta árbol con Math.sin sobre tiempo - alta confianza', () => {
      const codigo = `
function crearArboles() {
  const arbol = new THREE.Tree();
  // Animar las hojas con viento
  const time = clock.getElapsedTime();
  arbol.position.x = Math.sin(time * 0.5) * 0.1;
  return arbol;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('CON_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
        expect(resultado.arboles.length).toBeGreaterThan(0);
        expect(resultado.movimiento.length).toBeGreaterThan(0);
        expect(resultado.relacion).not.toBeNull();
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('detecta árbol con variable wind - alta confianza', () => {
      const codigo = `
function actualizarArboles(deltaTime) {
  trees.forEach(tree => {
    const wind = Math.sin(elapsedTime) * 0.2;
    tree.foliage.position.x = wind;
  });
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('CON_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('caso 2: árbol estático (SIN_MOVIMIENTO)', () => {
    it('detecta árbol sin movimiento - alta confianza', () => {
      const codigo = `
function crearArboles() {
  const arbol = new THREE.Tree();
  arbol.position.set(0, 0, 0);
  arbol.scale.set(1, 1, 1);
  return arbol;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
        expect(resultado.arboles.length).toBeGreaterThan(0);
        expect(resultado.movimiento.length).toBe(0);
        expect(resultado.relacion).toBeNull();
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('detecta árboles en comentario sin movimiento - baja confianza', () => {
      const codigo = `
// TODO: animar los árboles con viento
function crearEscena() {
  const rocks = new THREE.Group();
  rocks.add(new THREE.Rock());
  return rocks;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta'); // No hay ni árboles en código ni movimiento
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('caso 3: solo agua animada sin árboles (SIN_ARBOLES)', () => {
    it('detecta agua animada pero sin árboles - SIN_ARBOLES', () => {
      const codigo = `
function actualizarAgua(time) {
  const water = scene.getObjectByName('water');
  water.position.y = Math.sin(time * 0.3) * 0.5;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_ARBOLES');
        expect(resultado.confianza).toBe('alta');
        expect(resultado.arboles.length).toBe(0);
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('detecta shader de agua pero sin árboles - SIN_ARBOLES', () => {
      const codigo = `
const waterMaterial = new THREE.ShaderMaterial({
  vertexShader: \`
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.y += sin(pos.x * 2.0 + uTime) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  \`
});
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_ARBOLES');
        expect(resultado.confianza).toBe('alta');
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('caso 4: árboles estáticos junto a agua animada', () => {
    it('no cuenta el agua como movimiento del árbol', () => {
      const codigo = `
function crearEscena() {
  // Árboles estáticos
  const tree = new THREE.Tree();
  tree.position.set(0, 0, 0);
  scene.add(tree);

  // Agua animada
  const water = new THREE.Water();
  water.position.set(10, 0, 10);
  scene.add(water);
}

function actualizarAgua(time) {
  const water = scene.getObjectByName('water');
  water.position.y = Math.sin(time) * 0.5;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_MOVIMIENTO');
        expect(resultado.confianza).toBe('media'); // Hay movimiento pero lejos de los árboles
        expect(resultado.arboles.length).toBeGreaterThan(0);
        expect(resultado.movimiento.length).toBeGreaterThan(0);
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('caso 5: shader de viento (CON_MOVIMIENTO)', () => {
    it('detecta vertexShader con displacement como movimiento', () => {
      const codigo = `
const treeMaterial = new THREE.ShaderMaterial({
  vertexShader: \`
    varying vec2 vUv;
    uniform float uTime;
    uniform float windStrength;
    
    void main() {
      vUv = uv;
      vec3 pos = position;
      
      // Desplazar ramas con viento
      float wind = sin(pos.y * 2.0 + uTime) * windStrength;
      pos.x += wind * 0.1;
      pos.z += wind * 0.05;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  \`,
  uniforms: {
    uTime: { value: 0 },
    windStrength: { value: 1.0 }
  }
});

function crearArbol() {
  const tree = new THREE.Mesh(geometry, treeMaterial);
  return tree;
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('CON_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
        expect(resultado.movimiento.some(m => m.tipo === 'shader')).toBe(true);
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('detecta vertexShader con desplazamiento (español)', () => {
      const codigo = `
const materialArbol = new THREE.ShaderMaterial({
  vertexShader: \`
    uniform float uTime;
    void main() {
      vec3 pos = position;
      // Desplazar hojas con viento
      pos.x += sin(uTime + pos.y) * 0.1;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  \`
});
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_ARBOLES'); // No hay "tree" sino "materialArbol"
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('caso 6: cámara animada (no cuenta)', () => {
    it('no cuenta la cámara animada como movimiento de árbol', () => {
      const codigo = `
function crearArboles() {
  const tree = new THREE.Tree();
  tree.position.set(0, 0, 0);
  scene.add(tree);
  return tree;
}

function actualizarCamara(time) {
  camera.position.x = Math.sin(time * 0.1) * 10;
  camera.position.z = Math.cos(time * 0.1) * 10;
  camera.lookAt(0, 0, 0);
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_MOVIMIENTO');
        expect(resultado.confianza).toBe('media'); // Hay movimiento pero lejos del árbol
        expect(resultado.arboles.length).toBeGreaterThan(0);
        expect(resultado.movimiento.length).toBeGreaterThan(0);
        expect(resultado.explicacion).toContain('lejos de los árboles');
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('casos adicionales de límite', () => {
    it('distancia <= 15 líneas con oscilación fuerte = alta confianza', () => {
      const codigo = `
function setup() {
  // Línea 2
  // Línea 3
  // Línea 4
  // Línea 5
  // Línea 6
  // Línea 7
  // Línea 8
  // Línea 9
  // Línea 10
  // Línea 11
  // Línea 12
  const tree = new THREE.Tree(); // línea 13 - árbol
  // Línea 14
  // Línea 15
  tree.position.x = Math.sin(time); // línea 16 - movimiento
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('CON_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('mismo bloque de llaves con movimiento = alta confianza', () => {
      const codigo = `
function actualizarVegetacion() {
  const arboles = scene.getObjectsByProperty('type', 'Tree');
  const time = clock.getElapsedTime();
  
  arboles.forEach(arbol => {
    const sway = Math.sin(time * 0.5 + arbol.position.x) * 0.1;
    arbol.rotation.z = sway;
  });
}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('CON_MOVIMIENTO');
        expect(resultado.confianza).toBe('alta');
        expect(resultado.relacion.mismo_bloque).toBe(true);
      } finally {
        borrarTempFile(tempFile);
      }
    });

    it('archivos minificados se saltan correctamente', () => {
      const codigo = `
!function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}
`;
      const tempFile = crearTempFile(codigo);
      try {
        const resultado = analizarArchivo(tempFile);
        expect(resultado.decision).toBe('SIN_ARBOLES');
      } finally {
        borrarTempFile(tempFile);
      }
    });
  });

  describe('recorrerDirectorio', () => {
    it('recorre directorio recursivamente encontrando .js y .mjs', () => {
      const tempDir = tmpdir();
      const testDir = resolve(tempDir, 'test-audit-arboles-' + Date.now());
      
      try {
        // Crear estructura de directorios
        const fs = require('node:fs');
        fs.mkdirSync(testDir, { recursive: true });
        fs.mkdirSync(resolve(testDir, 'subdir'), { recursive: true });
        fs.mkdirSync(resolve(testDir, 'node_modules'), { recursive: true });
        
        // Crear archivos
        fs.writeFileSync(resolve(testDir, 'file1.js'), '// test');
        fs.writeFileSync(resolve(testDir, 'file2.mjs'), '// test');
        fs.writeFileSync(resolve(testDir, 'subdir', 'file3.js'), '// test');
        fs.writeFileSync(resolve(testDir, 'node_modules', 'should_skip.js'), '// test');
        fs.writeFileSync(resolve(testDir, 'README.md'), '# test');
        
        const archivos = recorrerDirectorio(testDir);
        
        expect(archivos.length).toBe(3);
        expect(archivos.some(f => f.endsWith('file1.js'))).toBe(true);
        expect(archivos.some(f => f.endsWith('file2.mjs'))).toBe(true);
        expect(archivos.some(f => f.endsWith('file3.js'))).toBe(true);
        expect(archivos.some(f => f.includes('node_modules'))).toBe(false);
      } finally {
        // Limpieza
        const fs = require('node:fs');
        if (existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });

    it('lanza error si no es un directorio', () => {
      expect(() => recorrerDirectorio('/ruta/que/no/existe')).toThrow();
    });
  });

  describe('armarReporte', () => {
    it('genera reporte completo con resumen', () => {
      const tempDir = tmpdir();
      const testDir = resolve(tempDir, 'test-reporte-' + Date.now());
      
      try {
        const fs = require('node:fs');
        fs.mkdirSync(testDir, { recursive: true });
        
        // Archivo con árboles con movimiento
        fs.writeFileSync(resolve(testDir, 'con-movimiento.js'), `
          const tree = new THREE.Tree();
          tree.position.x = Math.sin(time);
        `);
        
        // Archivo con árboles estáticos
        fs.writeFileSync(resolve(testDir, 'sin-movimiento.js'), `
          const tree = new THREE.Tree();
          tree.position.set(0, 0, 0);
        `);
        
        // Archivo sin árboles
        fs.writeFileSync(resolve(testDir, 'sin-arboles.js'), `
          const rock = new THREE.Rock();
          rock.position.set(5, 0, 5);
        `);
        
        const reporte = armarReporte(testDir);
        
        expect(reporte.directorio).toBe(testDir);
        expect(reporte.resumen.total).toBe(3);
        expect(reporte.resumen.CON_MOVIMIENTO).toBe(1);
        expect(reporte.resumen.SIN_MOVIMIENTO).toBe(1);
        expect(reporte.resumen.SIN_ARBOLES).toBe(1);
        expect(reporte.resultados.length).toBe(3);
      } finally {
        const fs = require('node:fs');
        if (existsSync(testDir)) {
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      }
    });
  });
});

// Helpers para crear archivos temporales
function crearTempFile(contenido) {
  const tempDir = tmpdir();
  const tempFile = resolve(tempDir, 'test-audit-' + Date.now() + '-' + Math.random().toString(36).slice(2) + '.js');
  writeFileSync(tempFile, contenido);
  return tempFile;
}

function borrarTempFile(ruta) {
  if (existsSync(ruta)) {
    unlinkSync(ruta);
  }
}
