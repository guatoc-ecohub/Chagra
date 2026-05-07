/**
 * guildService.test.js — Tests del companion suggester (ADR-034).
 *
 * Caso baseline: bug reportado por usuario externo 2026-05-06 — Espinaca sugería
 * companions agronómicamente incompatibles (Café, Tomate árbol, Gulupa,
 * Granadilla, Curuba). Estos tests blindan que el fix funcional no se rompa.
 */

import { describe, it, expect } from 'vitest';
import { getSuggestedCompanions } from '../guildService.js';

describe('guildService — filtros funcionales (ADR-034 feedback usuario externo)', () => {
  describe('Espinaca (estrato bajo, ciclo anual 60d, sun-loving)', () => {
    const result = getSuggestedCompanions('spinacia_oleracea');
    const companionIds = result.companions.map((c) => c.id);

    it('NO sugiere café arábica (perenne, sombra alta)', () => {
      expect(companionIds).not.toContain('coffea_arabica');
    });

    it('NO sugiere tomate de árbol (perenne, sombra alta)', () => {
      expect(companionIds).not.toContain('solanum_betaceum');
    });

    it('NO sugiere gulupa, granadilla, ni curuba (enredaderas perennes densas)', () => {
      expect(companionIds).not.toContain('passiflora_edulis');
      expect(companionIds).not.toContain('passiflora_ligularis');
      expect(companionIds).not.toContain('passiflora_tarminiana');
    });

    it('NO sugiere árboles frutales perennes (manzano, peral, durazno, guayaba)', () => {
      expect(companionIds).not.toContain('malus_domestica');
      expect(companionIds).not.toContain('pyrus_communis');
      expect(companionIds).not.toContain('prunus_persica');
      expect(companionIds).not.toContain('psidium_guajava');
    });

    it('SÍ sugiere companions explícitos del catálogo (Capa 1)', () => {
      expect(companionIds).toContain('fragaria_ananassa');
      expect(companionIds).toContain('pisum_sativum');
      expect(companionIds).toContain('daucus_carota');
    });
  });

  describe('Lechuga (estrato bajo, ciclo anual 60d)', () => {
    const result = getSuggestedCompanions('lactuca_sativa');
    const companionIds = result.companions.map((c) => c.id);

    it('NO sugiere café ni frutales perennes', () => {
      expect(companionIds).not.toContain('coffea_arabica');
      expect(companionIds).not.toContain('passiflora_edulis');
      expect(companionIds).not.toContain('solanum_betaceum');
    });
  });

  describe('Tomate común (hortaliza fruto, estrato bajo, ciclo 4 meses)', () => {
    const result = getSuggestedCompanions('solanum_lycopersicum');
    const companionIds = result.companions.map((c) => c.id);

    it('NO sugiere café ni gulupa (sombra alta sobre hortaliza)', () => {
      expect(companionIds).not.toContain('coffea_arabica');
      expect(companionIds).not.toContain('passiflora_edulis');
    });

    it('SÍ sugiere albahaca (Capa 1, validada)', () => {
      expect(companionIds).toContain('ocimum_basilicum');
    });
  });

  describe('Café arábica (perenne medio, dosel)', () => {
    const result = getSuggestedCompanions('coffea_arabica');
    const companionIds = result.companions.map((c) => c.id);

    it('SÍ sugiere companions explícitos del catálogo', () => {
      expect(companionIds).toContain('zea_mays');
      expect(companionIds).toContain('phaseolus_vulgaris');
      expect(companionIds).toContain('psidium_guajava');
    });

    it('Capa 2 puede sugerir otros perennes compatibles (no está en bloqueo bidireccional)', () => {
      // Café como target (perenne) sí puede tener otras perennes como companions estructurales
      // — el bloqueo es asimétrico: solo herbáceas anuales rechazan perennes de sombra alta
      expect(result.companions.length).toBeGreaterThan(0);
    });
  });

  describe('Razones inline mejoradas (transparencia)', () => {
    const result = getSuggestedCompanions('spinacia_oleracea');

    it('cada companion tiene razón explícita', () => {
      for (const c of result.companions) {
        expect(c.reason).toBeTruthy();
        expect(c.reason.length).toBeGreaterThan(5);
      }
    });

    it('Capa 2 menciona criterios usados (estrato, gremio, ciclo)', () => {
      const layer2 = result.companions.filter((c) => c.score < 100);
      for (const c of layer2) {
        // Razón debe mencionar al menos uno de: estrato, gremio, ciclo
        expect(c.reason.toLowerCase()).toMatch(/estrato|ciclo|gremio|complementa|fijador|repelente|atrayente|productivo|cobertura|acumulador|productor/);
      }
    });
  });

  describe('Cebolla larga / cebollín (allium_fistulosum) — bug operador 2026-05-06', () => {
    const result = getSuggestedCompanions('allium_fistulosum');

    it('SÍ retorna companions (no vacío) — antes faltaba en speciesDefaults', () => {
      expect(result.companions.length).toBeGreaterThan(0);
    });

    it('SÍ retorna antagonistas (legumbres por alelopatía Allium)', () => {
      const ids = result.antagonists.map((a) => a.id);
      expect(ids).toContain('phaseolus_vulgaris');
    });

    it('NO sugiere perennes de gran porte (filtro ADR-034)', () => {
      const ids = result.companions.map((c) => c.id);
      expect(ids).not.toContain('coffea_arabica');
      expect(ids).not.toContain('passiflora_edulis');
      expect(ids).not.toContain('solanum_betaceum');
    });
  });

  describe('Cebollín francés / chives (allium_schoenoprasum)', () => {
    const result = getSuggestedCompanions('allium_schoenoprasum');

    it('SÍ retorna companions', () => {
      expect(result.companions.length).toBeGreaterThan(0);
    });

    it('SÍ incluye Capa 1 explícita (tomate, fresa, zanahoria)', () => {
      const ids = result.companions.map((c) => c.id);
      expect(ids).toContain('solanum_lycopersicum');
      expect(ids).toContain('fragaria_ananassa');
      expect(ids).toContain('daucus_carota');
    });
  });

  describe('Edge cases', () => {
    it('Especie inexistente devuelve listas vacías', () => {
      const result = getSuggestedCompanions('especie_inexistente_xyz');
      expect(result.companions).toEqual([]);
      expect(result.antagonists).toEqual([]);
    });

    it('No sugiere a la propia especie', () => {
      const result = getSuggestedCompanions('spinacia_oleracea');
      const ids = result.companions.map((c) => c.id);
      expect(ids).not.toContain('spinacia_oleracea');
    });

    it('Respeta antagonistas explícitos', () => {
      const result = getSuggestedCompanions('lactuca_sativa');
      const ids = result.companions.map((c) => c.id);
      // petroselinum_crispum es antagonista de lactuca_sativa
      expect(ids).not.toContain('petroselinum_crispum');
    });
  });
});
