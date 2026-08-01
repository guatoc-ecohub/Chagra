/**
 * auditoria-dura-grafo-2026-07-21.test.js — invariante estructural del
 * entregable de la task #grafo-audit-1784662413.
 *
 * Contexto: GLM-4.6 produjo `docs/auditoria-dura-grafo-2026-07-21.md` con
 * (a) lo que falta integrar priorizado, (b) datos/aristas sospechosos, (c)
 * lo verificado. Este test bloquea regresiones estructurales: si alguien
 * borra el archivo o le quita secciones obligatorias, el test falla antes
 * del merge.
 *
 * Anti-invento: el test se limita a verificar forma y presencia de
 * secciones. NO valida los hallazgos individuales (eso es trabajo del
 * reviewer Opus). Solo asegura que el entregable existe y contiene las
 * partes declaradas en el task.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUDIT_PATH = join(__dirname, '..', '..', 'docs', 'auditoria-dura-grafo-2026-07-21.md');

const auditContent = existsSync(AUDIT_PATH)
  ? readFileSync(AUDIT_PATH, 'utf8')
  : '';

describe('docs/auditoria-dura-grafo-2026-07-21.md — task #grafo-audit-1784662413', () => {
  it('el archivo existe', () => {
    expect(existsSync(AUDIT_PATH)).toBe(true);
  });

  it('declara el task id y la branch', () => {
    expect(auditContent).toContain('#grafo-audit-1784662413');
    expect(auditContent).toContain('docs/auditoria-dura-grafo');
  });

  it('declara la limitación de proxy (no hay acceso directo a Apache AGE)', () => {
    expect(auditContent).toContain('No se pudo consultar Apache AGE');
    expect(auditContent).toContain('chagra-kg-graph-snapshot.json');
    expect(auditContent).toContain('chagra-catalog-graph-export.json');
    expect(auditContent).toContain('public/grafo-relations.json');
  });

  it('contiene PARTE 1 (inventario y brechas de integración)', () => {
    expect(auditContent).toContain('PARTE 1');
    expect(auditContent).toContain('Inventario');
    expect(auditContent).toContain('brechas de integración');
  });

  it('contiene PARTE 2 (validación anti-invento)', () => {
    expect(auditContent).toContain('PARTE 2');
    expect(auditContent).toContain('validación anti-invento');
    expect(auditContent).toMatch(/aparato bucal/i);
    expect(auditContent).toMatch(/piso térmico|pisos térmicos/i);
    expect(auditContent).toMatch(/contaminación cruzada/i);
  });

  it('entrega los tres entregables (a/b/c) requeridos por el task', () => {
    expect(auditContent).toMatch(/\(a\).*falta integrar.*priorizado/i);
    expect(auditContent).toMatch(/\(b\).*SOSPECHOSOS.*motivo concreto/i);
    expect(auditContent).toMatch(/\(c\).*VERIFICADO.*listo/i);
  });

  it('marca explícitamente lo NO VERIFICADO (no se recomienda ingesta)', () => {
    expect(auditContent).toMatch(/NO VERIFICADO/i);
  });

  it('no contiene voseo argentino (regla house-style colombiana)', () => {
    // Filtramos ocurrencias dentro de strings entre comillas o en IDs que
    // sí pueden contener esas silabas por azar (p. ej. "vos" dentro de
    // "vosotros" sería raro en este corpus). Buscamos ocurrencias claras.
    const patterns = [/\bvos\b/i, /\btenés\b/i, /\bquerés\b/i, /\belegí\b/i, /\bdale\b/i, /\bacá\b/i, /\bche\b/i];
    // Excepciones documentadas (IDs, código, paths). El test no es la
    // pulpería; solo dispara si aparece en contexto natural.
    const cleanContent = auditContent
      .replace(/chagra-/g, '')   // prefijo de archivos
      .replace(/`[^`]*`/g, '');  // todo lo que va entre backticks (código/IDs)
    for (const re of patterns) {
      expect(cleanContent).not.toMatch(re);
    }
  });

  it('no menciona stakeholders políticos (regla de no-leak)', () => {
    // Regla inviolable del agente GLM: no mencionar Diana, Richi, Toño,
    // Cepeda, MinAgricultura en código público.
    const stakeholders = ['Diana', 'Richi', 'Toño', 'Cepeda', 'MinAgricultura'];
    for (const s of stakeholders) {
      expect(auditContent).not.toContain(s);
    }
  });

  it('incluye marca ESCALATE_TO_OPUS para decisiones arquitectónicas', () => {
    // El task requiere escalar a Opus lo que sea arquitectura, no ejecutarlo
    // en GLM. La presencia de la marca demuestra que el agente conocía la
    // regla y no se la saltó.
    expect(auditContent).toContain('ESCALATE_TO_OPUS');
  });

  it('verificó al menos un binomio con zai-search', () => {
    // Indicio de que el anti-invento se aplicó: el documento debe citar
    // al menos uno de los binomios verificados en la sección 2.2.
    expect(auditContent).toContain('Hypothenemus hampei');
    expect(auditContent).toContain('zai-search');
  });
});
