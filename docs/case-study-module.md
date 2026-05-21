# Módulo Casos de Estudio

> **Status**: MVP 2026-05-17 · **Driver**: caso David invernadero trozador

## Qué resuelve

Seguimiento estructurado de problemas agronómicos (plagas, enfermedades, déficits) desde detección hasta cierre, con timeline, tratamientos aplicados del catálogo de biopreparados, y lecciones aprendidas. Caso testigo: David sembró 1000 tomates en invernadero, al día siguiente 10 estaban atacados por trozador (*Agrotis ipsilon*), 10 reemplazos. Antes del módulo: este flujo quedaba como texto libre en logs, sin agregación ni learning. Después del módulo: un caso primera-clase con state machine, tratamientos linkados al catálogo, y entrada en "top problemas activos".

## Estado MVP (qué hace hoy)

✅ Crear caso con título, finca, zona (free text), problema (free text + severity), conteos opcionales (total/afectados).
✅ State machine `open → in_treatment → monitoring → closed_resolved | closed_failed | escalated`.
✅ Append-only state history (ADR-019 compliant).
✅ Registrar tratamientos aplicados (lista de 12 biopreparados del catálogo).
✅ Auto-transition `open → in_treatment` al registrar primer tratamiento.
✅ Cerrar caso con outcome (`final_count_affected`, `lessons_learned`).
✅ Lista "Top N problemas activos" ordenada por severidad × % afectados × tiempo × treatment-status.
✅ Historico (casos cerrados) en sección colapsable.
✅ Storage offline-first en localStorage (zustand persist).
✅ Tests 11/11 passing (`useCaseStudyStore.test.js`).

## Estado MVP (qué NO hace aún)

❌ Photos linking (existe `PhotoCaptureField` reusable; queda para post-MVP).
❌ Sync con FarmOS (cases viven solo localStorage por ahora; DR-044 sub-i decide entity formal).
❌ Vinculación a `cohort_id` formal (DR-041 lo modela; pre-DR-041 usa `count_total`/`count_affected` libres).
❌ Vinculación a `pest_id` formal (DR-040 lo modela; pre-DR-040 usa `problem.name_freetext`).
❌ Export PDF para MinAmbiente / agrónomo / usuaria piloto.
❌ Cross-case similarity ("muestra casos similares pasados" RAG).
❌ Multi-finca aggregation cross-finca con privacy (depende ADR-036 MF-1..5 + DR-042).
❌ Push notifications de alta severidad.
❌ Auto-suggest treatments desde `catalog.species[].enfermedades_criticas` mapeado a biopreparados (depende DR-040).
❌ Typeahead biopreparados desde catalog (UI lista hardcodeada actual, refactorizable).

## Arquitectura MVP

```
┌──────────────────┐
│  DashboardView   │  tile "Casos" → navigate('casos')
│  (NAV_TILES)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐         ┌──────────────────────┐
│CaseStudyScreen   │ select  │  CaseStudyDetail     │
│  - top active    │────────▶│  - state controls    │
│  - new case form │         │  - treatment form    │
│  - histórico     │         │  - state history     │
└─────────┬────────┘         │  - close form        │
          │ uses             └──────────┬───────────┘
          ▼                             │ uses
   ┌──────────────────────────────────┐ │
   │  useCaseStudyStore (zustand)     │◀┘
   │  - cases: Case[]                 │
   │  - createCase()                  │
   │  - addTreatment()                │
   │  - transitionState()             │
   │  - closeCase()                   │
   │  - linkLog() / linkPhoto()       │
   │  - getById / getActive / getTopN │
   │                                  │
   │  Persist: localStorage           │
   │  (chagra:case-study)             │
   └──────────────────────────────────┘
```

## Schema MVP del Case

```js
Case = {
  id: ULID,                          // local; post-FarmOS sync se sincroniza
  title: string,
  finca_slug: string,                // ref public/fincas-publicas.json
  zone_freetext: string,
  subject: {
    species_ids: string[],           // refs catalog.species[]
    count_total: number | null,      // pre-DR-041 cohort
    count_affected: number | null,
  },
  problem: {
    name_freetext: string,           // ej. "Trozador (Agrotis ipsilon)"
    pest_id: string | null,          // DR-040 lo llena
    severity: 'low'|'medium'|'high'|'critical',
    detected_at: ISO_8601,
  },
  treatments_applied: [{
    biopreparado_id: string,         // ref catalog.biopreparados[]
    applied_at: ISO_8601,
    dose: string,
    notes: string,
  }],
  event_log_ids: string[],           // refs a logs FarmOS/IDB (ADR-019)
  photo_asset_ids: string[],         // refs a media FarmOS
  state: 'open'|'in_treatment'|'monitoring'|'closed_resolved'|'closed_failed'|'escalated',
  state_history: [{state, at, notes}],
  outcome: {
    closed_at: ISO_8601 | null,
    final_count_affected: number | null,
    lessons_learned: string,
  },
  created_at: ISO_8601,
  created_by_did: string | null,     // ADR-036 multi-finca did:key
  updated_at: ISO_8601,
}
```

## State machine

```
        ┌──── escalated ◀────┐
        │                    │
   open ──▶ in_treatment ──▶ monitoring
        │       │                │
        │       │                │
        ▼       ▼                ▼
       closed_failed       closed_resolved
```

Transiciones:
- `open → in_treatment`: automática al `addTreatment` primero, o manual.
- `in_treatment → monitoring`: manual cuando tratamiento terminó.
- `monitoring → closed_resolved`: manual con outcome positivo.
- `* → closed_failed`: manual cuando outcome negativo.
- `* → escalated`: manual cuando requiere experto externo.

## API del store

```js
const store = useCaseStudyStore.getState();

// Crear
const id = store.createCase({
  title: 'Trozador invernadero David 2026-05-17',
  finca_slug: 'guatoc',
  zone_freetext: 'invernadero-david',
  subject: { species_ids: ['solanum_lycopersicum_cerasiforme'], count_total: 1000, count_affected: 10 },
  problem: { name_freetext: 'Trozador (Agrotis ipsilon)', severity: 'high' },
});

// Tratamiento (auto-transition open → in_treatment)
store.addTreatment(id, { biopreparado_id: 'bacillus_thuringiensis', dose: '1g/L', notes: 'foliar atardecer' });

// Transition manual
store.transitionState(id, 'monitoring', 'BT aplicado hace 3d, observando 7d antes de cerrar');

// Cerrar
store.closeCase(id, {
  resolved: true,
  final_count_affected: 0,
  lessons_learned: 'BT funcionó. Próxima vez prevenir con Trichogramma temprano + collares de cartón.',
});

// Selectors
const top = store.getTopActiveProblems(10);
const c = store.getById(id);
const active = store.getActive();
const guatoc = store.getByFinca('guatoc');
```

## Tests

```bash
npm run test:unit -- src/store/__tests__/useCaseStudyStore.test.js
```

11 tests cubren: creación, validación, append-only state history, auto-transitions, close outcome, link logs/photos, getTopActiveProblems ranking.

## Roadmap post-MVP (depende DRs)

| Feature | Bloqueador | Fase |
|---|---|---|
| Photo gallery integrada | `PhotoCaptureField` ya existe — wiring | semana próxima |
| Voice → caso (extract pest from speech) | DR-040 sub-vi | post-DR-040 merge |
| Auto-suggest biopreparados desde catalog | DR-040 sub-iv | post-DR-040 merge |
| Cohort link formal (drill-down 1000→10) | DR-041 sub-i | post-DR-041 merge |
| Sync FarmOS (cases as log--case_study) | DR-044 sub-i | post-DR-044 merge |
| Export PDF evidencia | DR-044 sub-iv | post-DR-044 merge |
| Cross-case similarity RAG | DR-044 sub-v + GPU sm_52 | post-GPU build |
| Multi-finca privacy aggregation | ADR-036 MF-1..5 + DR-042 | Pro tier roadmap |
| Push notifications alta severidad | DR-041 sub-x | nuevo workflow |

## Filosofía de diseño

- **MVP usable HOY**: el operador puede registrar el caso David inmediatamente, sin esperar DRs futuros.
- **Refactor-friendly**: campos `_freetext` con sufijo claro para refactor a refs formales post-DR.
- **Append-only**: state_history + treatments_applied jamás se mutan; cumple ADR-019.
- **Offline-first**: localStorage persist; sync queda opcional via DR-044.
- **Tipado runtime**: validation de estados/severidades en `createCase` y `transitionState`.

## Referencias cruzadas

- `src/store/useCaseStudyStore.js` — store + tests
- `src/components/CaseStudyScreen.jsx` — lista + crear
- `src/components/CaseStudyDetail.jsx` — detalle + state machine
- `src/App.jsx:51` — lazy import + routes `casos` y `caso_detail`
- `src/App.jsx:79` — NAV_TILES entry
- `catalog/chagra-catalog-seed-v3.1.json` — biopreparados refs (post Track C: BT, Trichogramma, neem agregados)
- Audit walk-through caso "trozador" (gap análisis, doc interno)
- Deep research: pest catalog first-class (doc interno)
- Deep research: cohort tracking (doc interno)
- Deep research: case study module (doc interno)
