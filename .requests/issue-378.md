# Request #378

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/378
- Title: [feat][multi-finca] MF-1 storage refactor single → multi-finca con feature flag
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

ADR-036 sub-v Fase 1 (~USD 3k). Refactor storage layer PWA para multi-finca con feature flag VITE_MULTI_FINCA.

Reglas inviolables:
- ADR-036 sub-v: DB-per-finca en OPFS namespaced por did:key del dueño.
- NO romper MVP single-finca existente. Toggle por env.
- ADR-019 append-only mantenido. ADR-020 operator_id plaintext NUNCA fuera device.

Tarea técnica:

1. src/services/multiFincaStorage.js (nuevo): abstrae OPFS path por finca:
   - getFincaDB(fincaDid): SQLite-WASM instance en /fincas/finca-{did:key}/chagra.sqlite
   - listFincas(), setActiveFinca(fincaDid), registerFinca({did, nombre, slug})

2. Modificar src/db/dbCore.js: si VITE_MULTI_FINCA=true usa multiFincaStorage. Fallback path single-finca actual.

3. UI selector finca activa en TopBar (solo si >=2 registradas).

4. Tests vitest: open/close 2 fincas, sin cross-contamination.

NO incluir todavía: cifrado AES-GCM clave DEK (Fase 1.5), did:key generation (MF-2).

CONTRIBUTING.md §1-§2. No hardcoding. AGPL puro.

---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
