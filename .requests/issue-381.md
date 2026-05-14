# Request #381

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/381
- Title: [feat][multi-finca] MF-4 schema log v1→v2 expand-contract migrator + tooling drift
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

ADR-036 sub-ix Fase 1 (~USD 4k). Expand-Contract pattern v1 (MVP) → v2 (multi-finca).

Tarea:

1. src/services/schemas/logShapeV2.js: campos v1 + operator_did opcional + finca_did opcional + idempotency_key. JSON Schema validable.

2. src/services/migrations/v1_to_v2.js: upgradeV1ToV2 asigna operator_did='did:legacy:<hash(operator_id)>'. Determinístico.

3. Wrapper src/services/payloadService.js: detecta versión, aplica adapter v1→v2 si necesario antes de devolver. Marca shape en metadata.

4. src/scripts/drift.mjs: drift status / drift migrate / drift verify (lossless check dataset sintético 1000 logs v1).

5. Tests vitest.

NO modificar logs existentes en disco — solo adapter lectivo. AGPL puro.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
