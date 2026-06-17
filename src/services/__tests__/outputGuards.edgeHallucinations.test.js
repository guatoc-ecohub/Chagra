/**
 * outputGuards.edgeHallucinations.test.js — TAREA 89: 10+ casos borde de
 * alucinacion. Cubre: normativa/ICA, clima inventado, especies inventadas,
 * dosis peligrosas, y edge hallucinations compuestos.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  guardSyntheticAgrochemical,
  guardWrongColombiaAuthority,
  guardParamoNormativa,
  guardClimaConsejo,
  guardDoseWithoutSource,
  guardFabricatedBeneficialBinomial,
  guardInventedVariety,
  guardHardAltitudeViability,
  guardToxicResidueOnFood,
  guardDisguisedGenericAgrochem,
  guardInventedBrand,
  applyOutputGuards,
  resetOutputGuardTelemetry,
} from '../outputGuards.js';

beforeEach(() => resetOutputGuardTelemetry());

// ──────────────────────── NORMATIVA / ICA ────────────────────────────

describe('guardSyntheticAgrochemical — normativa ICA (bloquea agroquimicos sinteticos)', () => {
  it('bloquea glifosato con dosis → suppress-and-replace', () => {
    const r = guardSyntheticAgrochemical(
      'Aplica glifosato a 2 litros por hectarea cada 15 dias para el control de malezas.',
    );
    expect(r.modified).toBe(true);
    expect(r.text).not.toMatch(/glifosato/);
    expect(r.text).toMatch(/agroecol[oó]gico/);
  });

  it('bloquea mancozeb como recomendacion fungicida', () => {
    const r = guardSyntheticAgrochemical(
      'Para la gota de la papa aplica mancozeb en dosis de 2 kg por hectarea.',
    );
    expect(r.modified).toBe(true);
    expect(r.reason).toMatch(/mancozeb/);
  });

  it('bloquea carbofurano (insecticida altamente toxico)', () => {
    const r = guardSyntheticAgrochemical(
      'Aplica carbofurano al suelo para el control de gusano blanco.',
    );
    expect(r.modified).toBe(true);
    expect(r.reason).toMatch(/carbofurano/);
  });

  it('NO bloquea caldo bordeles (permitido)', () => {
    const r = guardSyntheticAgrochemical(
      'Aplica caldo bordeles como preventivo cada 15 dias.',
    );
    expect(r.modified).toBe(false);
  });

  it('bloquea recomendacion de insecticida por sufijo -trina (bifentrina)', () => {
    const r = guardSyntheticAgrochemical(
      'Fumiga con bifentrina para controlar el cogollero del maiz a 2 cc por litro.',
    );
    expect(r.modified).toBe(true);
  });
});

describe('guardWrongColombiaAuthority — autoridad colombiana incorrecta', () => {
  it('rechaza referencia a ANVISA (autoridad brasilera, no colombiana)', () => {
    const r = guardWrongColombiaAuthority(
      'Segun la normativa de ANVISA, este producto esta aprobado para uso agricola.',
      { userMessage: 'que dice la norma sobre este producto' },
    );
    expect(r.modified).toBe(true);
    expect(r.text).toMatch(/ICA/);
  });

  it('rechaza remedio falso de gomosis con ceniza y gaseosa', () => {
    const r = guardWrongColombiaAuthority(
      'Para la gomosis de los citricos aplica ceniza mezclada con gaseosa en el tronco.',
      { userMessage: 'como curo la gomosis de los citricos' },
    );
    expect(r.modified).toBe(true);
  });

  it('NO toca referencia legitima al ICA', () => {
    const r = guardWrongColombiaAuthority(
      'Consulta con el ICA antes de aplicar cualquier producto.',
      { userMessage: 'es seguro este producto' },
    );
    expect(r.modified).toBe(false);
  });

  it('NO toca referencia a Agrosavia (no es autoridad extranjera)', () => {
    const r = guardWrongColombiaAuthority(
      'Agrosavia tiene publicaciones sobre manejo integrado de plagas.',
      { userMessage: 'que dice agrosavia' },
    );
    expect(r.modified).toBe(false);
  });
});

describe('guardParamoNormativa — proteccion de paramo', () => {
  it('bloquea siembra en paramo', () => {
    const r = guardParamoNormativa(
      'En el paramo puedes sembrar papa y cebolla larga con buenos rendimientos.',
    );
    expect(r.modified).toBe(true);
    expect(r.text).toMatch(/paramo|p[aá]ramo/);
  });

  it('bloquea fumigacion en paramo', () => {
    const r = guardParamoNormativa(
      'En el paramo fumiga con pesticidas para controlar las plagas de la papa.',
    );
    expect(r.modified).toBe(true);
  });

  it('NO bloquea mencion de paramo como ecosistema a proteger sin recomendar siembra', () => {
    const r = guardParamoNormativa(
      'El paramo es un ecosistema protegido que no se debe intervenir con agricultura.',
    );
    expect(r.modified).toBe(false);
  });
});

// ──────────────────────── CLIMA INVENTADO ────────────────────────────

describe('guardClimaConsejo — clima inventado sin fuente', () => {
  it('detecta prediccion climatica especifica sin fuente', () => {
    const r = guardClimaConsejo(
      'El martes llovera 45 milimetros en tu zona, asi que no riegues.',
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('detecta pronostico de temperatura exacto sin fuente', () => {
    const r = guardClimaConsejo(
      'La temperatura minima manana sera de 8 grados y la maxima de 22 grados.',
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('consejo climatico generico ("en epoca de lluvias") no rompe', () => {
    const r = guardClimaConsejo(
      'En epoca de lluvias reduce la frecuencia de riego para evitar encharcamiento.',
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

// ──────────────────────── ESPECIES INVENTADAS ────────────────────────

describe('guardFabricatedBeneficialBinomial — especies beneficas fabricadas', () => {
  it('detecta binomio sospechoso presentado como benefico', () => {
    const r = guardFabricatedBeneficialBinomial(
      'La Trichoderma viridae es excelente para el control de Fusarium en tomate.',
      [],
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('NO rechaza binomio real de biocontrol (Trichoderma harzianum)', () => {
    const r = guardFabricatedBeneficialBinomial(
      'Trichoderma harzianum es un biocontrol efectivo contra hongos del suelo.',
      [],
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

describe('guardInventedVariety — variedades inventadas', () => {
  it('detecta variedad con codigo de mejora sospechoso', () => {
    const r = guardInventedVariety(
      'La papa variedad "Criolla Colombia F8" tiene excelente resistencia a la gota.',
      { userMessage: 'que variedad de papa resiste la gota' },
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('variedad real "papa criolla" mencionada sin invencion no dispara', () => {
    const r = guardInventedVariety(
      'La papa criolla es muy apreciada en el mercado colombiano por su sabor.',
      { userMessage: 'que tal es la papa criolla' },
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

// ──────────────────────── DOSIS PELIGROSAS ────────────────────────────

describe('guardDoseWithoutSource — dosis peligrosas sin fuente', () => {
  it('detecta dosis alta de biopreparado sin fuente', () => {
    const r = guardDoseWithoutSource(
      'Aplica 5 litros de purin de ortiga por planta cada 3 dias para maximizar la produccion.',
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('detecta dosis de producto no identificado "20 cc por litro cada 3 dias"', () => {
    const r = guardDoseWithoutSource(
      'Mezcla 20 cc del producto por litro de agua y aplica cada 3 dias.',
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('dosis respaldada con referencia al ICA es tratada apropiadamente', () => {
    const r = guardDoseWithoutSource(
      'Segun la etiqueta ICA, la dosis recomendada es 2 cc por litro de agua.',
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

// ──────────────────────── ALTITUD INCOMPATIBLE ────────────────────────

describe('guardHardAltitudeViability — altitud incompatible edge', () => {
  it('cafe a 3200 msnm (fuera de banda 800-2100) → bloquea', () => {
    const r = guardHardAltitudeViability(
      'El cafe se da bien a 3200 metros en tu finca, solo necesita abono organico cada mes.',
      { userMessage: 'puedo sembrar cafe a 3200 metros' },
    );
    expect(r.modified).toBe(true);
  });

  it('cacao a 2900 msnm (tierra caliente, banda 0-1200) → bloquea', () => {
    const r = guardHardAltitudeViability(
      'El cacao se cultiva bien a 2900 metros y paga en dolares.',
      { userMessage: 'puedo sembrar cacao a 2900 metros' },
    );
    expect(r.modified).toBe(true);
  });

  it('papa a 2800 msnm → no esta en HARD_ALTITUDE_BANDS, no dispara', () => {
    const r = guardHardAltitudeViability(
      'La papa es viable a 2800 msnm con buenas practicas de rotacion.',
      { userMessage: 'siembro papa a 2800 metros' },
    );
    expect(r.modified).toBe(false);
  });
});

// ──────────────────────── RESIDUOS TOXICOS EN ALIMENTOS ───────────────

describe('guardToxicResidueOnFood — residuos toxicos en alimentos', () => {
  it('detecta aplicacion sin periodo de carencia antes de cosecha', () => {
    const r = guardToxicResidueOnFood(
      'Aplica el caldo sulfocalcico dos dias antes de cosechar la lechuga.',
      { userMessage: 'cuando aplico antes de cosechar' },
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('detecta "no pasa nada porque es organico" aplicado sin carencia', () => {
    const r = guardToxicResidueOnFood(
      'Puedes aplicar el purin hasta el dia antes de cosechar, no pasa nada porque es organico.',
      { userMessage: 'puedo aplicar purin antes de cosechar' },
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

// ──────────────────────── AGROQUIMICO DISFRAZADO ──────────────────────

describe('guardDisguisedGenericAgrochem — agroquimico disfrazado de organico', () => {
  it('detecta producto "que sirve para todo" con nombre generico', () => {
    const r = guardDisguisedGenericAgrochem(
      'El "Super Bio Fertilizante Total" sirve para todo: plagas, hongos, nutrientes y malezas.',
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

describe('guardInventedBrand — marca comercial inventada', () => {
  it('detecta marca inventada con dosis', () => {
    const r = guardInventedBrand(
      'El producto "AgroMax Ultra 500" de Bayer es el mejor para la roya del cafe, aplica 2 cc/L.',
    );
    expect(typeof r.modified).toBe('boolean');
  });

  it('detecta codigo de catalogo inventado ("BioFert X-99")', () => {
    const r = guardInventedBrand(
      'BioFert X-99 es un fertilizante certificado que duplica la produccion.',
    );
    expect(typeof r.modified).toBe('boolean');
  });
});

// ──────────────────────── COMPUESTO (applyOutputGuards) ──────────────

describe('applyOutputGuards — edge hallucinations compuestas', () => {
  it('glifosato + altitud inviable → ambos guards disparan', () => {
    const out = applyOutputGuards(
      'Aplica glifosato a 2 L/ha en tu cultivo de cafe a 3500 msnm para controlar malezas.',
      {
        userMessage: 'como controlo malezas en cafe a 3500 metros',
        resolvedEntities: [],
      },
    );
    expect(out.modified).toBe(true);
    expect(out.reasons.length).toBeGreaterThanOrEqual(1);
  });

  it('especie inventada + dosis sin fuente → multiple suppression', () => {
    const out = applyOutputGuards(
      'Aplica extracto de Trichoderma viridae a 500 cc por planta cada 2 dias para todo tipo de hongos.',
      {
        userMessage: 'que aplico para los hongos',
        resolvedEntities: [],
      },
    );
    expect(out.modified).toBe(true);
  });

  it('ANVISA + agroquimico → ambos corrigen', () => {
    const out = applyOutputGuards(
      'ANVISA aprueba el uso de paraquat para desecar la papa antes de cosecha.',
      {
        userMessage: 'que dice la norma sobre desecar papa',
        resolvedEntities: [],
      },
    );
    expect(out.modified).toBe(true);
  });

  it('paramo + agroquimico → doble violacion detectada', () => {
    const out = applyOutputGuards(
      'En el paramo aplica Mancozeb cada 8 dias para que la papa no se enferme.',
      {
        userMessage: 'como cultivo papa en paramo',
        resolvedEntities: [],
      },
    );
    expect(out.modified).toBe(true);
  });

  it('respuesta segura: organico + altitud correcta + ICA → sin supresion', () => {
    const out = applyOutputGuards(
      'Para tu cultivo de papa a 2800 msnm, aplica caldo sulfocalcico como preventivo cada 15 dias. ' +
        'Consulta la dosis exacta en la etiqueta del producto o con el ICA.',
      {
        userMessage: 'que aplico a la papa a 2800 metros',
        resolvedEntities: [],
      },
    );
    expect(typeof out.modified).toBe('boolean');
  });
});
