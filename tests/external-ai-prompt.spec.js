/**
 * external-ai-prompt.spec.js
 * Unit tests del servicio externalAiPromptBuilder (no E2E, no requiere browser).
 * Se ejecutan con Node.js directamente.
 */

import assert from 'node:assert/strict';
import { buildGuildExternalPrompt, buildDiagnosticExternalPrompt, buildOpenExternalPrompt } from '../src/services/externalAiPromptBuilder.js';

// --- buildGuildExternalPrompt ---
{
    const prompt = buildGuildExternalPrompt({
        speciesName: 'Papa criolla',
        scientificName: 'Solanum tuberosum Grupo Phureja',
        estrato: 'bajo',
        companions: ['Aliso andino', 'Ortiga'],
        antagonists: ['Tomate de árbol'],
        thermalZones: ['frio'],
        altitudMsnm: 2600,
        municipio: 'Zipaquirá, Cundinamarca',
    });

    assert.ok(prompt.includes('Papa criolla'), 'debe incluir nombre común');
    assert.ok(prompt.includes('Solanum tuberosum'), 'debe incluir nombre científico');
    assert.ok(prompt.includes('Aliso andino'), 'debe incluir companions');
    assert.ok(prompt.includes('Tomate de árbol'), 'debe incluir antagonistas');
    assert.ok(prompt.includes('2600'), 'debe incluir altitud');
    assert.ok(prompt.includes('frio'), 'debe incluir piso térmico');
    assert.ok(prompt.includes('JSON'), 'debe pedir JSON válido');
    console.log('✓ buildGuildExternalPrompt: OK');
}

// --- buildGuildExternalPrompt context vacío ---
{
    const prompt = buildGuildExternalPrompt({});
    assert.ok(typeof prompt === 'string', 'debe devolver string con context vacío');
    assert.ok(prompt.length > 0, 'debe tener contenido');
    console.log('✓ buildGuildExternalPrompt context vacío: OK');
}

// --- buildDiagnosticExternalPrompt ---
{
    const prompt = buildDiagnosticExternalPrompt({
        speciesName: 'Papa criolla',
        scientificName: 'Solanum tuberosum Grupo Phureja',
        thermalZones: ['frio'],
        altitudMsnm: 2600,
        municipio: 'Bogotá',
        humedad: 85,
        temperatura: 14,
        lluvia: 12,
        sintomas: 'manchas blancas en el envés de las hojas',
        fase: 'tuberización',
        diasDesdeSiembra: 60,
    });

    assert.ok(prompt.includes('fitopatólogo'), 'debe posicionarse como fitopatólogo');
    assert.ok(prompt.includes('85'), 'debe incluir humedad relativa');
    assert.ok(prompt.includes('tuberización'), 'debe incluir fase fenológica');
    assert.ok(prompt.includes('IFOAM'), 'debe mencionar normativa IFOAM');
    console.log('✓ buildDiagnosticExternalPrompt: OK');
}

// --- buildOpenExternalPrompt ---
{
    const prompt = buildOpenExternalPrompt({
        speciesName: 'Ortiga',
        thermalZones: ['templado'],
        altitudMsnm: 1800,
        pregunta: '¿Cuándo se recomienda hacer el primer corte?',
    });

    assert.ok(prompt.includes('Ortiga'), 'debe incluir especie');
    assert.ok(prompt.includes('templado'), 'debe incluir zona térmica');
    assert.ok(prompt.includes('¿Cuándo'), 'debe incluir la pregunta del usuario');
    console.log('✓ buildOpenExternalPrompt: OK');
}

console.log('\n✅ Todos los tests pasaron.\n');
