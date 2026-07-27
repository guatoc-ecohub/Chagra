/**
 * EL CABLEADO del diagnóstico en dos pasos — que la pantalla LLAME al servicio.
 *
 * Por qué existe este archivo: el servicio `segundaOpinionFoto` quedó hecho y
 * probado (29 tests) pero **`AgentScreen` no lo invocaba**. Estaba *construido
 * pero no cableado* — la trampa que este proyecto persigue desde
 * [[feedback-construido-pero-no-cableado]] (6 casos en 24 h). Un servicio con
 * cobertura perfecta al que nadie llama es cobertura de nada.
 *
 * Se prueba sobre el TEXTO FUENTE, no rendereando: el propio repo ya decidió
 * que montar `AgentScreen` exige stubbear ~25 servicios y da tests frágiles
 * (ver `AgentScreen.queue.test.jsx`). Lo que estos tests protegen es la forma
 * del cableado — que esté en las dos rutas y en el orden correcto. Que además
 * FUNCIONE contra la GPU real se verificó en el navegador, no acá.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve('src/components/AgentScreen/AgentScreen.jsx'), 'utf8');

describe('AgentScreen — la segunda opinión está cableada', () => {
  it('importa el servicio y el modelo de revisión', () => {
    expect(source).toContain("from '../../services/segundaOpinionFoto'");
    expect(source).toMatch(/revisarFoliage/);
    expect(source).toMatch(/extraerDeRevision/);
  });

  it('la dispara en LAS DOS rutas de foto (inline y outbox), no en una sola', () => {
    // Cablear una sola dejaría sin segundo paso a la mitad de la gente: la
    // foto entra por el compositor del propio agente Y por la outbox del home.
    // La declaración es `const lanzarSegundaOpinionFoto = (blob, finding) =>`,
    // así que NO cae en este regex: lo que cuenta son invocaciones de verdad.
    const llamadas = (source.match(/lanzarSegundaOpinionFoto\(/g) || []).length;
    expect(llamadas).toBe(2); // foto inline del compositor + drenaje de la outbox
    expect((source.match(/const lanzarSegundaOpinionFoto = /g) || []).length).toBe(1);
  });

  it('⚠️ va DESPUÉS del await handleSubmit — nunca en paralelo con el RAG', () => {
    // No es estilo. `handleSubmit` corre el pipeline entero, embebedor del RAG
    // incluido; disparar ahí encima es la concurrencia que en alpha desalojó
    // al qwen3.5:4b pineado y le costó 8,56 s al mensaje siguiente.
    for (const m of source.matchAll(/lanzarSegundaOpinionFoto\(([^)]*)\)/g)) {
      if (m[1].includes('blob, finding')) continue; // la declaración
      const antes = source.slice(0, m.index);
      const ultimoAwait = antes.lastIndexOf('await handleSubmit(');
      const ultimoLanzar = antes.lastIndexOf('lanzarSegundaOpinionFoto(');
      expect(ultimoAwait).toBeGreaterThan(-1);
      // El `await handleSubmit` más cercano hacia atrás es posterior a
      // cualquier otra invocación previa ⇒ este disparo cuelga de ese await.
      expect(ultimoAwait).toBeGreaterThan(ultimoLanzar);
    }
  });

  it('no dispara sin foto ni sin hallazgo (no hay mata que juzgar)', () => {
    expect(source).toMatch(/if \(!blob \|\| !finding\) return;/);
  });

  it('espeja el canal: voz si el usuario habló, texto si escribió (SPEC #2)', () => {
    expect(source).toMatch(/const canal = ttsEnabled \? 'voz' : 'texto'/);
    expect(source).toMatch(/porDonde === 'voz'/);
  });

  it('protege la GPU: le pasa la sonda de residencia y el modelo del chat', () => {
    expect(source).toMatch(/guardas: \{ modelosResidentes, modeloChat: ENV\.CHAT_MODEL \}/);
  });
});

describe('AgentScreen — precalentar al abrir la cámara', () => {
  it('TODAS las puertas a la cámara pasan por abrirCamara', () => {
    // Si alguna abre el input a pelo, esa ruta se queda sin precalentado y el
    // usuario paga los 17,5 s en frío sin saber por qué.
    const crudas = (source.match(/cameraInputAgentRef\.current\?\.click\(\)/g) || []).length;
    expect(crudas).toBe(1); // sólo la de dentro de abrirCamara
    const dentroDeAbrir = /const abrirCamara = \(\) => \{[\s\S]*?cameraInputAgentRef\.current\?\.click\(\);/;
    expect(source).toMatch(dentroDeAbrir);
  });

  it('precalienta el modelo de REVISIÓN (el que está frío), no el del chat', () => {
    expect(source).toMatch(/warmVisionReviewModel\(/);
  });

  it('no precalienta si hay un turno en vuelo — esa concurrencia desaloja', () => {
    expect(source).toMatch(/ocupado: \(\) => isThinking \|\| state === STATE_RECORDING/);
  });
});
