import { describe, it, expect } from 'vitest';
import {
  PISOS_TERMICOS,
  TEMPORADAS_ANIO,
  LUNA_FASES,
  LUNA_GRUPOS,
  LUNA_CAVEAT,
  FOTOS_ALMANAQUE,
  CREDITOS_FOTOS_ALMANAQUE,
  ventanaCosecha,
  regimenCultivo,
} from '../almanaqueFinca';
import { PERENNIAL_CYCLES } from '../perennialCycles';

describe('almanaqueFinca — grounding y honestidad', () => {
  it('los 4 pisos térmicos están presentes y ordenados de cálido a páramo', () => {
    const ids = PISOS_TERMICOS.map((p) => p.id);
    expect(ids).toEqual(['calido', 'templado', 'frio', 'paramo']);
    // El páramo NO tiene cultivos listados, pero sí una nota honesta.
    const paramo = PISOS_TERMICOS.find((p) => p.id === 'paramo');
    expect(paramo.cultivos).toHaveLength(0);
    expect(paramo.nota).toMatch(/agua|conserv|no se cultiva/i);
  });

  it('ventanaCosecha NUNCA inventa meses: refleja exactamente perennialCycles', () => {
    // Café: bimodal con meses firmes → debe devolver los mismos meses.
    const cafe = ventanaCosecha('coffea_arabica');
    expect(cafe).toBeTruthy();
    // abr · may · jun · sep · oct · nov · dic (7 meses del ciclo)
    expect(cafe.split('·').length).toBe(PERENNIAL_CYCLES.coffea_arabica.harvest_months.length);
  });

  it('ventanaCosecha devuelve null cuando el ciclo no lista meses (regime unknown)', () => {
    // Aguacate: regime 'unknown', sin harvest_months → no se inventa nada.
    expect(ventanaCosecha('persea_americana')).toBeNull();
    // Slug inexistente → null (no explota, no inventa).
    expect(ventanaCosecha('slug_que_no_existe')).toBeNull();
    expect(ventanaCosecha(null)).toBeNull();
  });

  it('regimenCultivo marca honestamente lo variable como pendiente', () => {
    expect(regimenCultivo('persea_americana').tone).toBe('pendiente');
    expect(regimenCultivo('coffea_arabica').tone).toBe('ok');
    expect(regimenCultivo(null).tone).toBe('pendiente');
  });

  it('cada cultivo con slug apunta a una especie real del catálogo de perennes', () => {
    for (const piso of PISOS_TERMICOS) {
      for (const c of piso.cultivos) {
        if (c.slug) {
          expect(PERENNIAL_CYCLES[c.slug], `slug desconocido: ${c.slug}`).toBeTruthy();
        }
      }
    }
  });

  it('el bloque lunar se enmarca como cultura, no receta (encuadre honesto)', () => {
    expect(LUNA_CAVEAT).toMatch(/no promete más cosecha/i);
    expect(LUNA_CAVEAT).toMatch(/cultura, no receta/i);
    // No debe prometer rendimiento ni hablar como ciencia dura.
    expect(LUNA_CAVEAT).not.toMatch(/%|por ?ciento|garantiza/i);
  });

  it('las 4 fases lunares y los 3 grupos folk están completos', () => {
    expect(LUNA_FASES.map((f) => f.id)).toEqual(['creciente', 'llena', 'menguante', 'nueva']);
    expect(LUNA_GRUPOS.map((g) => g.id)).toEqual(['hoja', 'fruto', 'raiz']);
    // Ataca el hueco etnolingüístico: la luna nueva se nombra "tierna".
    const nueva = LUNA_FASES.find((f) => f.id === 'nueva');
    expect(nueva.fase).toMatch(/tierna/i);
  });

  it('las temporadas cubren aguas y secas del régimen bimodal', () => {
    const tonos = new Set(TEMPORADAS_ANIO.map((t) => t.tono));
    expect(tonos.has('lluvia')).toBe(true);
    expect(tonos.has('seca')).toBe(true);
  });

  it('cada crédito de foto trae autor, licencia y fuente Wikimedia', () => {
    expect(CREDITOS_FOTOS_ALMANAQUE.length).toBe(Object.keys(FOTOS_ALMANAQUE).length);
    for (const cr of CREDITOS_FOTOS_ALMANAQUE) {
      expect(cr.autor).toBeTruthy();
      expect(cr.licencia).toMatch(/CC/);
      expect(cr.fuenteUrl).toMatch(/commons\.wikimedia\.org/);
    }
  });
});
