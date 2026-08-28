Tarea: CONSTRUIR el shell `CampesinoHome` para campesino.guatoc.co. ALTA PRIORIDAD, ALTO CUIDADO, ALTA CALIDAD técnica/producto/visual/funcional/estética, ESPECIAL CURACIÓN pensada para el CAMPESINO. Base: origin/dev, worktree propio rama feat/campesino-home-20260826.

SEGUÍ EL PLAN (no improvisar): `/home/kortux/Workspace/Chagra-strategy/ops/PLAN-CAMPESINO-HOME-2026-08-26.md` (leelo COMPLETO: decisión de producto, qué reusar A.1-A.4, jerarquía B, mínimo nuevo C, wireframe D).

QUÉ CONSTRUIR (mínimo, es composición no sistema nuevo):
1. `CampesinoHome` — composición de portada que REUSA (NO reinventa): `FincaVivaHero` (variante campesina), `AgentHero` (voz/foto, modo Campesino default), `AgentRedMenu` (mano, 3-4 acciones primero), chips de `profileChipSelector` (orden campesino). NO guardar estado derivado.
2. Tarjeta "ACCIÓN DEL DÍA": una sola tarjeta que traduce una alerta/pendiente REAL a un verbo concreto (usa useAngelitaStore/datos reales, NO inventar). Si no hay datos: tranquilidad honesta + CTA "Registrar".
3. Jerarquía del primer fold móvil (del wireframe D): Hoy en su finca + ubicación + offline honesto → burbuja compai con dato real (Ver/Escuchar/×, UNA sola presencia) → CTA de voz grande "Cuénteme qué pasó" (+foto) → tarjeta "El día en su finca" (clima + ⚠ acción) → "¿Qué necesita hacer?" (puertas P0: hoy_finca/sembrar/cosechar/clima).
4. Resolvé la ambigüedad de rutas ANTES de exponer (mercado vs mercados, voz vs registro_unificado) — una navegación canónica, sin aliases nuevos.

CALIDAD (el operador la exige explícita): campesino-first REAL (no "experto disfrazado"), voz-first, targets grandes, legible, offline honesto. Visual limpio y estético, accesible (WCAG: contraste, tamaños táctiles ≥44px), responsive móvil-primero. Español colombiano usted/sumercé, NUNCA voseo. Datos REALES, cero invención. Cero PII, cero nombres de terceros.

GATE: `npx vite build` limpio + tests + capturas shot3d --headed (móvil + desktop) a _gate/. El gate VISUAL final lo hago yo con juez + el operador — vos entregá build+capturas y reportá qué reusaste vs qué construiste nuevo. Entregá en rama feature, NO mergees.
