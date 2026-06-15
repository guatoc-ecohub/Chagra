import { describe, it, expect } from 'vitest';
import {
  buildFincaGameState,
  detectLevelUp,
  narrarFinca,
  getWorldStage,
  worldStagesCoverGliessman,
  WORLD_STAGES,
  CREATURES,
  BADGES,
  MISSIONS,
  TOTAL_CREATURES,
} from '../fincaGameService';

// ─── Fixtures: procesos REALES de finca (mismo shape que farmProcessCache) ──

/** Finca rica: muchas especies, cosechas, biopreparados, observaciones. */
function fincaProspera() {
  const especies = [
    'coffea_arabica', 'theobroma_cacao', 'musa_paradisiaca', 'persea_americana',
    'phaseolus_vulgaris', 'zea_mays', 'inga_edulis', 'citrus_limon',
  ];
  return especies.map((slug, i) => ({
    process_id: `p${i}`,
    process_type: i % 2 === 0 ? 'sowing' : 'agroforestry',
    status: 'active',
    current_stage: ['vegetative', 'flowering', 'fruiting', 'mature'][i % 4],
    subject_slug: slug,
    companions: i < 3 ? ['inga_edulis'] : [],
    events: [
      { event_type: 'harvest_confirmed', payload: { quantity: 10 + i } },
      { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado bio' } },
    ],
  }));
}

describe('fincaGameService — modelo de mundos', () => {
  it('tiene exactamente 5 mundos (Gliessman 0-4)', () => {
    expect(WORLD_STAGES).toHaveLength(5);
    WORLD_STAGES.forEach((w, i) => expect(w.level).toBe(i));
  });

  it('cada mundo crece en árboles/vida respecto al anterior (o igual)', () => {
    for (let i = 1; i < WORLD_STAGES.length; i += 1) {
      expect(WORLD_STAGES[i].arboles).toBeGreaterThanOrEqual(WORLD_STAGES[i - 1].arboles);
      expect(WORLD_STAGES[i].vida).toBeGreaterThanOrEqual(WORLD_STAGES[i - 1].vida);
    }
  });

  it('getWorldStage hace clamp fuera de rango', () => {
    expect(getWorldStage(-3).level).toBe(0);
    expect(getWorldStage(99).level).toBe(4);
    expect(getWorldStage(2).level).toBe(2);
  });

  it('los mundos cubren todos los niveles Gliessman del viaje', () => {
    expect(worldStagesCoverGliessman()).toBe(true);
  });
});

describe('fincaGameService — estado VACÍO (cero fabricación)', () => {
  it('sin procesos → finca vacía, nivel 0, progreso 0', () => {
    const g = buildFincaGameState({ processes: [], observations: [] });
    expect(g.vacia).toBe(true);
    expect(g.nivel).toBe(0);
    expect(g.progreso).toBe(0);
    expect(g.mundo.level).toBe(0);
  });

  it('sin datos NO desbloquea ninguna criatura', () => {
    const g = buildFincaGameState({ processes: [] });
    expect(g.criaturasVivas).toBe(0);
    expect(g.criaturas.every((c) => !c.desbloqueada)).toBe(true);
  });

  it('sin datos NO gana ninguna insignia', () => {
    const g = buildFincaGameState({ processes: [] });
    expect(g.insigniasGanadas).toBe(0);
  });

  it('sin datos todas las misiones de acción están sin cumplir', () => {
    const g = buildFincaGameState({ processes: [] });
    const acciones = g.misiones.filter((m) => m.tipo === 'accion');
    expect(acciones.every((m) => !m.cumplida)).toBe(true);
    expect(g.proximaMision).toBeTruthy();
  });

  it('la finca vacía expone mundoSiguiente (hay a dónde crecer)', () => {
    const g = buildFincaGameState({ processes: [] });
    expect(g.mundoSiguiente).toBeTruthy();
    expect(g.mundoSiguiente.level).toBe(1);
  });
});

describe('fincaGameService — finca próspera desbloquea vida', () => {
  it('una finca rica sube de nivel (> 0)', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    expect(g.vacia).toBe(false);
    expect(g.nivel).toBeGreaterThan(0);
    expect(g.progreso).toBeGreaterThan(0);
  });

  it('desbloquea varias criaturas con biodiversidad real', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    expect(g.criaturasVivas).toBeGreaterThan(0);
    // mariposa requiere diversidad >= 1; con 8 especies debe estar
    const mariposa = g.criaturas.find((c) => c.id === 'mariposa');
    expect(mariposa.desbloqueada).toBe(true);
  });

  it('gana insignias reales (primera semilla siempre con procesos)', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    const primera = g.insignias.find((b) => b.id === 'primera_semilla');
    expect(primera.ganada).toBe(true);
    expect(g.insigniasGanadas).toBeGreaterThan(0);
  });

  it('el quetzal solo aparece en finca-bosque (nivel >= 3 + diversidad)', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    const quetzal = g.criaturas.find((c) => c.id === 'quetzal');
    // Coherente con el nivel: si nivel < 3, quetzal bloqueado.
    if (g.nivel >= 3) {
      expect(quetzal.desbloqueada).toBe(true);
    } else {
      expect(quetzal.desbloqueada).toBe(false);
    }
  });

  it('marca misiones de acción cumplidas según datos reales', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    const sembrar = g.misiones.find((m) => m.id === 'sembrar_planta');
    expect(sembrar.cumplida).toBe(true);
    const cosecha = g.misiones.find((m) => m.id === 'registrar_cosecha');
    expect(cosecha.cumplida).toBe(true);
  });
});

describe('fincaGameService — normaliza shape real (anidado en attributes)', () => {
  // El almacenamiento real guarda los campos bajo `attributes` y los eventos
  // anidados también. buildFincaGameState debe aplanarlos sin tocar el motor.
  function fincaRealAnidada() {
    return ['coffea_arabica', 'theobroma_cacao', 'musa_paradisiaca', 'persea_americana',
      'phaseolus_vulgaris', 'zea_mays', 'inga_edulis', 'citrus_limon'].map((slug, i) => ({
      process_id: `p${i}`,
      type: 'farm_process',
      attributes: {
        process_type: i % 2 === 0 ? 'sowing' : 'agroforestry',
        status: 'active',
        current_stage: ['vegetative', 'flowering', 'fruiting', 'mature'][i % 4],
        subject_slug: slug,
        companions: i < 3 ? ['inga_edulis'] : [],
      },
      events: [
        { event_id: 'e1', type: 'farm_process_event', attributes: { event_type: 'harvest_confirmed', payload: { quantity: 12 } } },
        { event_id: 'e2', type: 'farm_process_event', attributes: { event_type: 'pest_management_confirmed', payload: { method: 'biopreparado bio' } } },
      ],
    }));
  }

  it('una finca real anidada sube de nivel igual que la plana', () => {
    const g = buildFincaGameState({ processes: fincaRealAnidada() });
    expect(g.vacia).toBe(false);
    expect(g.nivel).toBeGreaterThan(0);
  });

  it('aplana eventos anidados → productividad/autodependencia reales', () => {
    const g = buildFincaGameState({ processes: fincaRealAnidada() });
    // harvest_confirmed → productividad; pest bio → autodependencia
    expect(g.evolution.mesmis.productividad).not.toBeNull();
    expect(g.evolution.mesmis.autodependencia).not.toBeNull();
    const cosecha = g.misiones.find((m) => m.id === 'registrar_cosecha');
    expect(cosecha.cumplida).toBe(true);
  });

  it('aplana diversidad desde attributes.subject_slug', () => {
    const g = buildFincaGameState({ processes: fincaRealAnidada() });
    expect(g.evolution.tape.diversidad).not.toBeNull();
    const mariposa = g.criaturas.find((c) => c.id === 'mariposa');
    expect(mariposa.desbloqueada).toBe(true);
  });
});

describe('fincaGameService — misiones de aprender (marcadas a mano)', () => {
  it('aprender_ficha sin marcar → no cumplida', () => {
    const g = buildFincaGameState({ processes: fincaProspera(), misionesHechas: [] });
    const aprender = g.misiones.find((m) => m.id === 'aprender_ficha');
    expect(aprender.cumplida).toBe(false);
  });

  it('aprender_ficha marcada (Set o array) → cumplida', () => {
    const gArr = buildFincaGameState({ processes: [], misionesHechas: ['aprender_ficha'] });
    expect(gArr.misiones.find((m) => m.id === 'aprender_ficha').cumplida).toBe(true);
    const gSet = buildFincaGameState({ processes: [], misionesHechas: new Set(['aprender_ficha']) });
    expect(gSet.misiones.find((m) => m.id === 'aprender_ficha').cumplida).toBe(true);
  });
});

describe('fincaGameService — detectLevelUp', () => {
  it('primera vez (nivelPrevio null) NO celebra', () => {
    expect(detectLevelUp(2, null).subio).toBe(false);
  });

  it('subir de nivel celebra', () => {
    const r = detectLevelUp(3, 1);
    expect(r.subio).toBe(true);
    expect(r.desde).toBe(1);
    expect(r.hasta).toBe(3);
  });

  it('mismo nivel o bajar NO celebra', () => {
    expect(detectLevelUp(2, 2).subio).toBe(false);
    expect(detectLevelUp(1, 3).subio).toBe(false);
  });

  it('hace clamp al rango de niveles', () => {
    expect(detectLevelUp(99, 0).hasta).toBe(4);
    expect(detectLevelUp(-5, 2).hasta).toBe(0);
  });
});

describe('fincaGameService — narración (TTS, texto alegre y corto)', () => {
  it('finca vacía invita a sembrar', () => {
    const g = buildFincaGameState({ processes: [] });
    const txt = narrarFinca(g);
    expect(txt.toLowerCase()).toContain('primera planta');
  });

  it('finca con vida describe el mundo y las criaturas', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    const txt = narrarFinca(g);
    expect(txt).toContain(g.mundo.nombreNino);
    expect(txt.toLowerCase()).toContain('criatura');
  });

  it('subida de nivel anuncia el nuevo mundo', () => {
    const g = buildFincaGameState({ processes: fincaProspera() });
    const txt = narrarFinca(g, { levelUp: true });
    expect(txt.toLowerCase()).toContain('subió de nivel');
    expect(txt).toContain(g.mundo.nombreNino);
  });

  it('narrarFinca con estado nulo no rompe', () => {
    expect(narrarFinca(null)).toBe('');
  });
});

describe('fincaGameService — robustez (no rompe con datos basura)', () => {
  it('no rompe con input vacío total', () => {
    expect(() => buildFincaGameState()).not.toThrow();
  });

  it('expone los conteos canónicos', () => {
    expect(TOTAL_CREATURES).toBe(CREATURES.length);
    expect(MISSIONS.length).toBeGreaterThan(0);
    expect(BADGES.length).toBeGreaterThan(0);
  });

  it('cada criatura/insignia/misión tiene id único', () => {
    const ids = (arr) => arr.map((x) => x.id);
    const uniq = (arr) => new Set(ids(arr)).size === arr.length;
    expect(uniq(CREATURES)).toBe(true);
    expect(uniq(BADGES)).toBe(true);
    expect(uniq(MISSIONS)).toBe(true);
  });
});
