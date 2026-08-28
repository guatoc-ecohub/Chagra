# TAREA — codex·SOL · Angelita P1 (parametrizar por especie la capa de agente)

Sos codex-sol. Objetivo: ejecutar **P1 (FOUNDATION / el enabler)** del spec
`/home/kortux/Workspace/Chagra-strategy/ops/specs/2026-08-28-compai-107-todos-los-compai/spec.md`:
generalizar la capa de agente de **Angelita** a **parametrizada por especie**, para que los 7 compai
canónicos (angelita, jaguar, oso-baston, zariguya, luciernaga, chivito-punk, guacamaya) hereden sus
comportamientos. HOY solo Angelita tiene la capa completa (10 estados, cara/voz/clima/guía); los otros
6 son el mismo rig recoloreado. NO reinventar; partir de lo que YA está en dev; ADITIVO; CERO regresión.

**cwd = este worktree** (`/home/kortux/Workspace/chagra-angelita-p1`, rama
`feat/angelita-p1-species-param-20260828` off `dev`). Todo lo que toques vive acá. NO salgas del cwd.

## P0 GATE (primero, obligatorio)
Verificá que la base arranca: `npm run test:unit` de los módulos que vas a tocar debe estar verde ANTES.
Si algo está roto de base, NO construyas encima: documentá el roto en `BRIEF-RESULTADO.md` y detente.

## P1 — hacer (aditivo, quirúrgico)
1. **#8 Unificar el elenco:** `src/hooks/useAgentAvatarType.js` hoy expone ~2 tipos → exponer los **7**
   seleccionables como compai de la PWA. Mantené/extendé el contrato de
   `src/hooks/__tests__/useAgentAvatarType.contract.test.jsx` (NO romperlo).
2. **#52 Entrada al mundo con CUALQUIER guía:** `src/visual/mundo3d/escenas/useEntradaAbeja.jsx` importa
   fijo `AbejaAngelita` → parametrizá por especie (que funcione con el avatar elegido, no solo la abeja).
3. **#19 Perfiles idle por especie:** jaguar/guacamaya/chivito/luciernaga hoy caen al idle de la abeja →
   cada especie con su idle.
4. **Los 10 estados de agente** (`src/visual/agente/angelitaEstados.js`) + cara/voz/clima/guía deben
   leerse por `data-agt-estado`+`data-pose` del rig de cada especie, **NO hardcodeados** a `AbejaAngelita`.
5. **Root-cause patinaje:** `AgentFab` no cablea `caminando` → cablearlo para los 7, respetando que
   angelita/guacamaya/luciernaga son **voladores** (su "caminando" = locomoción aérea, no gait de patas).

## Reglas duras
- ADITIVO, **cero regresión**. NO borres comportamientos existentes de dev. NO redibujes arte. NO toques prod.
- Corré los tests afectados (`npm run test:unit -- <patrón>`) y dejalos **verdes**. Cambios mínimos por archivo.
- **NO podés hacer captura GPU** (no hay display en tu entorno): **NO certifiques nada visual**. Dejá los
  cambios committeados en la rama; la verificación GPU-headed + juez la hace el orquestador.
- Commit por sub-tarea, mensaje convencional en español colombiano (`feat(compai): P1 #8 elenco 7 compai`).
  **NO abras PR** (lo hace el orquestador tras GPU-verify).
- Español colombiano en comentarios/commits, **NUNCA voseo**. Anti-leak: cero nombres de terceros/empresas.
- Al terminar escribí `BRIEF-RESULTADO.md` en el cwd: qué hiciste (#8/#52/#19/estados/patinaje), tests
  corridos + resultado, pendientes, y qué necesita GPU-verify.
