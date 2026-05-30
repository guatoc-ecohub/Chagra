# Testing — Estado y Deuda E2E

Documento canónico del estado de cobertura testing en Chagra. Auditado 2026-05-30 (sweep de cobertura test-first servicios/utils/stores puros).

---

## Stack testing

- **Unit:** Vitest + @testing-library/react
- **E2E:** Playwright Chromium (1 worker, retries=2)
- **CI gates:** CodeQL SAST + Playwright Offline-first E2E (bloqueante merge)
- **Pre-commit:** lefthook 5 hooks (secret-scan + infra-refs + Pro-import + ESLint + strategic-content)

## Cobertura Vitest unit

**137 archivos test unit (~2360 tests pasando).** Cobertura amplia en servicios,
utils y stores. Patrón establecido: test-first para toda funcionalidad nueva
(política XP), foco en lógica pura verificable sin Ollama/red.

Áreas con cobertura sólida (no exhaustivo):
- **Servicios IA/agente:** `llmGuardrails`, `llmRouter`, `agentIntentParser`,
  `externalAiPromptBuilder`, `voseoFilter`, `queryComplexityAnalyzer`,
  `aiInferenceParser`, `entityMatcher`, `regionalismsService`
- **Voz/telemetría:** `visionWarmService`, `llmTelemetryService`,
  `gpuTelemetryService`, `caseStudyVoiceExtractor`
- **Datos/sync:** `inventoryService`, `inventoryEvents`, `notificationsService`,
  `operatorIdentityService` (HMAC ADR-027.v, cubierto), `fincaActiveStore`,
  `splitService`, `iotMockService`
- **Utils puros:** `fuzzySearch`, `dateFormatter`, `assetRelationships`,
  `blobUrl`, `tipsService`, `agentSoundService`, `pushService`, `usePrefsStore`

**Cobertura aún precaria (IO/red-coupled, requieren mocks pesados):**
- `voiceService` (Whisper STT) — flujo de red
- `entityExtractor` (JSON output) — acoplado a prompt/system cache
- `payloadService` / `assetService` — escriben a FarmOS (sendToFarmOS)
- `voiceTelemetryService` — IndexedDB-coupled (parte pura de agregación pendiente)
- `VoiceCapture` / `AgentScreen` (componentes RAG) — sin tests de componente dedicados

## Cobertura Playwright E2E

30 spec files total. Gate CI: **Playwright Offline-first E2E (bloqueante)**. Desde
2026-05-30 corren con `reducedMotion: 'reduce'` global (congela colibrí 3D +
animaciones que respetan `prefers-reduced-motion`) para reducir flake y habilitar
regresión visual futura (`toHaveScreenshot`).

### Specs ACTIVOS (2)

| Spec | Cobertura | Bloqueante CI |
|---|---|---|
| `offline.spec.js` | DB_VERSION v12 + pending_transactions IndexedDB + offline→online sync (test canónico ADR-019) | **SÍ** |
| `themes.spec.js` | Theme switching UI | NO (passa siempre) |
| `task-log.spec.js` | Task log + asset log workflow | VERIFICACIÓN_PENDIENTE |
| `plan-generator.spec.js` | PlanGenerator service flow | VERIFICACIÓN_PENDIENTE |
| `external-ai-prompt.spec.js` | Externalize AI prompt builder | VERIFICACIÓN_PENDIENTE |

### Specs SKIPPED (13) — deuda E2E explícita

| Spec | Razón skip | Prioridad reactivar | Plazo |
|---|---|---|---|
| `asset-status-enum.spec.js` | Issue #90 setup pendiente | P2 backlog | Post-Diana Fase 1 |
| `telemetry-llm-bounds.spec.js` | Harness completo no listo + cobertura unitaria del repetition guard ya suficiente | P3 backlog | Post Fase 2 |
| `catalog-sqlite.spec.js` | Test carga 7 especies legacy v3.0; necesita actualización a 175 v3.1 | **P1** (reactivar) | Pre-Fase 1 |
| `invasive.spec.js` | ADR-019 Phase 1 flujo invasoras+sustitución; requiere runner real iterado | P1 reactivar | Pre-Diana si tiempo |
| `ai-inference.spec.js` | ADR-019 Phase 3 flujo inferencia + revisión humana; necesita endpoint stubs | **P1** reactivar | Pre-Fase 1 |
| `date-field.spec.js` | iOS Safari emulation específica | P3 (iOS no es Android-first piloto) | Post Fase 2 |
| `inventory-lww.spec.js` | ADR-019 Phase 4 LWW IndexedDB; requiere IDB+sync setup | P1 reactivar | Pre-Fase 1 |
| `photo-capture-field.spec.js` | Componente PhotoCaptureField específico | P2 | Post-Diana |
| `plant-asset-validation.spec.js` | Issue #89 validación asset; setup pendiente | P2 | Post-Diana |
| `geolocation-ios.spec.js` | Issue #83 iOS Safari fix | P3 (Android-first) | Post Fase 2 |

### Decisión por spec — pre-Diana / Fase 1

**P1 reactivar Pre-Fase 1** (3 specs críticos):

- `catalog-sqlite.spec.js` — actualizar a v3.1 (177 species, tier sources). Quemar 2-3h dev.
- `ai-inference.spec.js` — stub endpoints Whisper + Ollama + Kokoro en CI; reactivar flow voz → JSON entity. Quemar 4-6h dev.
- `inventory-lww.spec.js` — esencial para multi-finca Automerge Fase 1; reactivar antes de codificar federación. Quemar 4-6h.

**P1 reactivar Pre-Diana si hay tiempo** (1 spec):

- `invasive.spec.js` — flujo invasoras + sustitución nativa es palanca pitch Diana ("Resolución 684/2018 MADS + IAvH"). Si Lili tiene 2h sábado-domingo, reactivar. Si no, post-Diana.

**P2/P3 mantener skipped** (9 specs):
- Documentación clara en este TESTING.md de por qué siguen skipped.
- No bloquear merge por estos. Reactivar oportunamente.

## CI gates obligatorios merge

Branch protection activa desde 2026-04-26:

1. **CodeQL SAST** — `javascript-typescript` + queries `security-extended` + `security-and-quality`
2. **Playwright E2E** — `Offline-first E2E` job sobre `tests/offline.spec.js`
3. **lefthook pre-commit** (local) — bloqueante para developers

## Roadmap testing Fase 1 (post-Diana)

- Reactivar 3 specs P1 (catalog-sqlite + ai-inference + inventory-lww)
- Agregar tests dedicados core no cubierto: voiceService, entityExtractor, VoiceCapture, AgentScreen, operatorIdentityService
- Tests E2E multi-finca específicos (finca A escribe → finca B lee vía Automerge P2P)
- Tests crypto-shred DEK por sujeto (ADR-027.v Capas 2-4)
- Tests HMAC integration (post PR #391 activación)
- Cobertura objetivo Fase 1: 60% lines + 80% critical paths

## Verificación pendiente

- ⚠️ `gh api repos/guatoc-ecohub/Chagra/branches/main/protection` reglas exactas no verificadas script automation (gh api JSON parsing error)
- ⚠️ Tasa pass real Playwright E2E último mes (último deploy fde28c9 → chagra-fde28c9 pass)
- ⚠️ CodeQL alerts abiertos: `gh api repos/guatoc-ecohub/Chagra/code-scanning/alerts` — requiere chequeo manual

---

**Documento canónico testing. Actualizar cada vez que se reactive/skipped un spec o se agregue cobertura nueva. Referenciado en CONTRIBUTING.md y AGENTS.md.**
