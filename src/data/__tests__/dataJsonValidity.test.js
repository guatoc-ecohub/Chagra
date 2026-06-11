/**
 * dataJsonValidity.test.js — valida que TODOS los src/data/*.json
 * parsean como JSON valido. Mecanico, sin ollama, sin fabricacion.
 *
 * Task 1 (auditoria ministerio): social-aviso-legal.json estaba
 * roto (JSON invalido) y se shippeo a prod. Este test evita que
 * vuelva a pasar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', '..', 'data');

const jsonFiles = readdirSync(DATA_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();

describe('src/data/*.json — validez JSON mecanica', () => {
  for (const file of jsonFiles) {
    const path = resolve(DATA_DIR, file);
    it(`${file} parsea como JSON valido`, () => {
      const raw = readFileSync(path, 'utf8');
      expect(() => JSON.parse(raw)).not.toThrow();
      const parsed = JSON.parse(raw);
      expect(parsed).toBeTruthy();
    });
  }
});
