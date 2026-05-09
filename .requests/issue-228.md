# Request #228

- Issue: https://github.com/guatoc-ecohub/Chagra/issues/228
- Title: [test] Tests unitarios para detectAndTruncateRepetition (repetitionGuard)
- Author: @guatoc-ecohub
- Status: awaiting code-generation

## Body

## Tipo
test

## Scope
tests/unit

## Descripción
Crear tests unitarios con Vitest para la función `detectAndTruncateRepetition` en `src/utils/repetitionGuard.js`.

## Criterios de aceptación
- [ ] Test para texto vacío que devuelva string vacío
- [ ] Test para input no-string que devuelva string vacío
- [ ] Test para texto normal sin repeticiones que devuelva el mismo texto
- [ ] Test para triple repetición de palabra que trunque al último punto previo
- [ ] Test para triple repetición sin punto cercano que trunque antes del loop
- [ ] Test para densidad de repetición mayor al 30% que trunque a la mitad
- [ ] Tests ubicados en `tests/unit/repetitionGuard.test.js`
- [ ] Seguir el setup existente en `tests/unit/setup.js`
- [ ] Usar Vitest como framework de testing

## Restricciones
No modificar src/db/dbCore.js, syncManager.js, payloadService.js, public/sw.js. No bumpear version ni CACHE_NAME.

## Prioridad
media

## Contexto
Transcrito de voz Telegram el 2026-05-09 11:45 — smoke test bridge bot end-to-end post-fix Bug 7 (claude-code binary name).


---

**Esto es un stub.** El agente de code-generation reemplazará este archivo y/o hará los cambios solicitados cuando sea invocado con la label `ready-to-generate` (flujo futuro).
