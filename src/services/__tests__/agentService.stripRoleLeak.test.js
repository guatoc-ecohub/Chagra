/**
 * agentService.stripRoleLeak.test.js — BUG A (fuga de roles, prod 2026-05-30).
 *
 * El agente generó una respuesta catastrófica donde, tras su respuesta real,
 * el modelo siguió generando PASADO su turno e inventó un turno falso del
 * usuario ("Usuario: Hola Dante, gracias por tu consulta...") con contenido
 * de asistente, mezclando roles.
 *
 * Causa raíz: `conversationMemory.getContextString` inyecta el historial con
 * etiquetas "Usuario:" / "Asistente:" y la llamada al LLM NO pasaba stop
 * sequences. La defensa #1 son las stop sequences (llmRouter). Esta es la
 * defensa #2: un post-proceso determinístico que TRUNCA todo lo que venga
 * desde el primer turno falso en adelante — necesaria porque el path de
 * streaming del sidecar NO reenvía `stop`.
 */

import { describe, it, expect } from 'vitest';
import { stripRoleLeak } from '../agentService.js';

describe('stripRoleLeak — BUG A fuga de roles', () => {
  it('corta el incidente exacto de producción (turno "Usuario:" falso)', () => {
    const leaked =
      'El tomate de árbol (Solanum betaceum) se siembra a 1800-2600 msnm.\n' +
      'Usuario: Hola Dante, gracias por tu consulta. El nombre científico está mal...\n' +
      'Asistente: Tienes razón, corrijo...';
    const out = stripRoleLeak(leaked);
    expect(out).toBe(
      'El tomate de árbol (Solanum betaceum) se siembra a 1800-2600 msnm.',
    );
    expect(out).not.toMatch(/Usuario:/);
    expect(out).not.toMatch(/Asistente:/);
  });

  it('corta también la variante en inglés "User:" / "Assistant:"', () => {
    const leaked = 'Respuesta válida.\nUser: otra cosa\nAssistant: ...';
    expect(stripRoleLeak(leaked)).toBe('Respuesta válida.');
  });

  it('corta el marcador de chat-template de Ollama (<|im_start|>)', () => {
    const leaked = 'Respuesta válida.<|im_start|>user\nmás texto';
    expect(stripRoleLeak(leaked)).toBe('Respuesta válida.');
  });

  it('corta "Usuario :" con espacio antes de los dos puntos', () => {
    const leaked = 'Respuesta válida.\nUsuario : pregunta inventada';
    expect(stripRoleLeak(leaked)).toBe('Respuesta válida.');
  });

  it('NO toca respuestas legítimas que mencionan la palabra "usuario" en prosa', () => {
    const ok =
      'El usuario debe regar al atardecer. Recuerda que el riego del usuario es clave.';
    expect(stripRoleLeak(ok)).toBe(ok);
  });

  it('NO corta cuando "Asistente:" aparece a mitad de una oración (no inicio de línea)', () => {
    // Solo cortamos turnos falsos: etiqueta de rol al inicio de línea.
    const ok = 'Soy tu Asistente: te ayudo con tu cultivo.';
    expect(stripRoleLeak(ok)).toBe(ok);
  });

  it('es idempotente', () => {
    const leaked = 'Hola.\nUsuario: x';
    const once = stripRoleLeak(leaked);
    expect(stripRoleLeak(once)).toBe(once);
  });

  it('trimea el resultado y maneja entradas vacías / no-string', () => {
    expect(stripRoleLeak('')).toBe('');
    expect(stripRoleLeak(null)).toBe('');
    expect(stripRoleLeak(undefined)).toBe('');
    expect(stripRoleLeak('   hola  \n')).toBe('hola');
  });

  it('si TODO el output es un turno falso, devuelve string vacío (no propaga basura)', () => {
    const leaked = 'Usuario: pregunta inventada sin respuesta previa';
    expect(stripRoleLeak(leaked)).toBe('');
  });
});
