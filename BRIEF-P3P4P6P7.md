# SPEC — compai P3+P4+P6+P7 (reglas de mensaje + interacción). LANE: codex.
Origen: AUDITORIA-COMPAI-MENSAJES-2D-3D-2026-08-23.md §7. Base: origin/dev. NO tocar P0/P1 (ya hechos). Trabajá en worktree propio desde origin/dev, rama feat/compai-P3P4P6P7-20260826.

- **P3 (cadencia hint):** el hint de ruta/idle debe mostrarse UNA vez al entrar a la pantalla (o al primer idle), con tope de repeticiones por sesión y respeto de cooldown del store. NUNCA en bucle por timer. (El spam venía de CompaiOverlay, ya retirado; asegurar que el hint que quede dentro del FAB/burbuja NO repita.)
- **P4 (R5 adaptación) — MENOR PRIORIDAD del bundle (hacer al final):** cablear que `resolverComportamiento` (`src/visual/agente/angelitaInteligencia.js:498`) reciba `perfil` + registro de la finca y COMPONGA el mensaje con datos reales (no genérico). El genérico solo como fallback cuando el cerebro no tiene nada adaptado.
- **P6 (R6 en 3D):** en rutas `categoria:'3D'`, ocultar/atenuar el FAB (y el compai de escena) al tocar/rotar el mundo. Considerar excluir el FAB de rutas 3D en `App.jsx:4350` para que el compai 3D viva solo en la escena. Reaparecer tras idle.
- **P7 (móvil):** dar affordance VISIBLE para "hablar" (long-press) en el FAB, sin depender de doble-tap (que en táctil colisiona con zoom). Confirmar que el TTS del susurro nocturno (canal C) tiene opt-in claro.

Cada uno cuelga del store único (P1), reusa `estaOcupado()`/`useAngelitaStore`. NO reinventar. Cero PII.
GATE (juez, no ojo): GPU-headed por caso (idle→muestra 1 vez · touch contenido→atenúa · 3D touch→oculta · long-press→affordance) + `gemini-vision.sh`. Entregá rama feature + capturas + veredicto. NO mergear.
