/**
 * detector-confusion-taxonomica.test.mjs
 * ================================================================
 * Tests para el detector de confusión taxonómica.
 *
 * Casos de prueba:
 * 1. Gulupa mapeada incorrectamente a Guayaba (Passiflora → Psidium)
 * 2. Aguacate mapeado incorrectamente a Guayaba (Persea → Psidium)
 * 3. Variante de grafía: curuba/curubo
 * 4. Variante de grafía: uchuva/uvilla
 * 5. Par CORRECTO (no debe detectar como confusión)
 * 6. Log vacío
 * ================================================================
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';

const SCRIPT_PATH = resolve('scripts/detector-confusion-taxonomica.mjs');
const CATALOG_PATH = resolve('catalog/chagra-catalog-oss-subset-v3.2.json');

describe('Detector de confusión taxonómica', () => {
  let tempLogFile;
  
  beforeEach(() => {
    // Crear archivo temporal para cada test
    tempLogFile = resolve(tmpdir(), `test-detector-${Date.now()}.jsonl`);
  });
  
  function cleanup() {
    if (existsSync(tempLogFile)) {
      unlinkSync(tempLogFile);
    }
  }
  
  function runDetector(logFile, json = false) {
    const args = json ? '--json' : '';
    try {
      const output = execSync(`node ${SCRIPT_PATH} ${logFile} ${args}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      return { success: true, output };
    } catch (error) {
      return { success: false, output: error.stdout || error.stderr, exitCode: error.status };
    }
  }
  
  it('debería detectar gulupa mapeada incorrectamente a guayaba', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Qué propiedades tiene gulupa (Psidium guajava)?' }
      ],
      chosen: [
        { role: 'assistant', content: 'gulupa (Psidium guajava) es...' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    expect(result.output).toContain('gulupa');
    expect(result.output).toContain('Psidium');
    expect(result.output).toContain('Passiflora');
    expect(result.success).toBe(false); // Debe exit con 1
  });
  
  it('debería detectar aguacate mapeado incorrectamente a guayaba', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Cómo cultivar aguacate (Psidium guajava)?' }
      ],
      chosen: [
        { role: 'assistant', content: 'aguacate (Psidium guajava) requiere...' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    expect(result.output).toContain('aguacate');
    expect(result.output).toContain('Psidium');
    expect(result.output).toContain('Persea');
    expect(result.success).toBe(false);
  });
  
  it('debería detectar variantes de grafía: curuba/curubo', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Qué plagas afectan curubo (Solanum phureja)?' }
      ],
      chosen: [
        { role: 'assistant', content: 'curubo (Solanum phureja) es afectado por...' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    // Curubo debería estar asociado con Passiflora, no Solanum
    expect(result.output).toMatch(/curubo|curuba/i);
    expect(result.success).toBe(false);
  });
  
  it('debería detectar variantes de grafía: uchuva/uvilla', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Cómo sembrar uvilla (Physalis peruviana) cuando realmente me refiero a uchuva?' }
      ],
      chosen: [
        { role: 'assistant', content: 'uvilla (Physalis peruviana) se cultiva en...' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    // Uchuva = Physalis peruviana, Uvilla = Pourouma cecropiifolia (son diferentes)
    // Detecta que Physalis peruviana corresponde a uchuva, no uvilla
    expect(result.output).toMatch(/uchuva|uvilla|Physalis/i);
    expect(result.success).toBe(false);
  });
  
  it('NO debería detectar un par CORRECTO como confusión', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Qué propiedades tiene la Gulupa (Passiflora edulis f. edulis Sims)?' }
      ],
      chosen: [
        { role: 'assistant', content: 'La Gulupa (Passiflora edulis f. edulis Sims) es una planta trepadora...' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    // No debería detectar ninguna confusión
    expect(result.output).toContain('No se detectaron confusiones');
    expect(result.success).toBe(true);
  });
  
  it('debería manejar log vacío correctamente', () => {
    writeFileSync(tempLogFile, '');
    
    const result = runDetector(tempLogFile);
    
    cleanup();
    
    expect(result.output).toContain('No se detectaron confusiones');
    expect(result.success).toBe(true);
  });
  
  it('debería detectar múltiples confusiones en un solo archivo', () => {
    const logLines = [
      {
        prompt: [
          { role: 'system', content: 'Eres un asistente.' },
          { role: 'user', content: '¿Qué es la Gulupa (Psidium guajava)?' }
        ]
      },
      {
        prompt: [
          { role: 'system', content: 'Eres un asistente.' },
          { role: 'user', content: '¿Cómo se cultiva el Aguacate (Psidium friedrichsthalianum)?' }
        ]
      }
    ];

    writeFileSync(tempLogFile, logLines.map(l => JSON.stringify(l)).join('\n') + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    // Debe detectar al menos una confusión
    expect(result.output).toMatch(/confusión|confusiones/i);
    expect(result.success).toBe(false);
  });
  
  it('debería output JSON cuando se pasa --json', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente agroecológico.' },
        { role: 'user', content: '¿Qué es la Gulupa (Psidium guajava)?' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile, true);

    cleanup();

    // Verificar que es JSON válido
    expect(() => JSON.parse(result.output)).not.toThrow();

    const jsonOutput = JSON.parse(result.output);
    expect(jsonOutput).toHaveProperty('logFile');
    expect(jsonOutput).toHaveProperty('issues');
    expect(Array.isArray(jsonOutput.issues)).toBe(true);
  });
  
  it('debería ignorar líneas JSON inválidas sin crash', () => {
    const logContent = JSON.stringify({ prompt: [{ role: 'user', content: '¿Qué es Gulupa (Psidium guajava)?' }] }) + '\n' +
                       'esto no es json\n' +
                       JSON.stringify({ prompt: [{ role: 'user', content: '¿Qué es Aguacate (Psidium guajava)?' }] }) + '\n';

    writeFileSync(tempLogFile, logContent);

    const result = runDetector(tempLogFile);

    cleanup();

    // Debe detectar confusión en las líneas válidas
    expect(result.output).toMatch(/confusión|confusiones/i);
  });

  it('debería manejar nombre científico antes del común (orden invertido)', () => {
    const logLine = {
      prompt: [
        { role: 'system', content: 'Eres un asistente.' },
        { role: 'user', content: '¿Qué es (Psidium guajava) Gulupa?' }
      ]
    };

    writeFileSync(tempLogFile, JSON.stringify(logLine) + '\n');

    const result = runDetector(tempLogFile);

    cleanup();

    // Debe detectar la confusión incluso en orden invertido
    expect(result.output).toMatch(/gulupa/i);
    expect(result.output).toMatch(/Passiflora/i);
  });
});
