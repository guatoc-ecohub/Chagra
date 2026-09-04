# BUG-06: diagnóstico de latencia MCP, 2026-09-04

## Veredicto

La hipótesis «hay unas 13 llamadas MCP en serie antes del primer token» queda
**refutada para el `dev` inspeccionado**. Las siete guardas pre-LLM ya salen
juntas en un `Promise.all`; además, el chain NLU ya paraleliza sus pasos. Sí
había dos llamadas de relación seriales, que se solaparon de forma segura en
este worktree.

El recorrido que ejecuta esta consulta es:

```text
RAG local (no medido aquí) -> hybrid-retrieve ->
Promise.all(resolve + 6 guardas) ->
subgrafo -> multihop -> nlu -> get_calendario_siembra -> LLM
```

Por tanto, la suma serial de las 13 no explica por sí sola los 35--61 s ya
reportados. La muestra remota directa, caliente, da 2.840 y 3.062 ms hasta el
primer contenido de un LLM con prompt corto; no reproduce el camino completo
del navegador ni su prompt ensamblado. **No sé** qué tramo del cliente
autenticado completa explica aquellos 35--61 s: este entorno no tenía
credenciales FarmOS ni `storageState` para abrir esa sesión real, y no se
inventó un login. La autenticación propia del sidecar sí se usó contra `dev`.

Esto no invalida la medición remota por endpoint; sí limita cualquier cifra de
TTFT de punta a punta a una estimación, no a una confirmación del hecho ya
medido.

## Método y alcance

- Target: `https://chagra-dev.guatoc.co/`, query exacta: «¿Cuánto rinde la
  rúcula y cómo la siembro a 2200 msnm?».
- Fecha: 2026-09-04.
- Se llamaron los endpoints reales de `dev` con la autenticación de sidecar que
  trae el bundle desplegado. No se imprimieron ni persistieron secretos.
- R1, R2 y R3 abajo son números crudos, en ms. R1 arranca más frío; no se
  reemplazó por un promedio.
- `LLM` es el endpoint remoto real y se mide hasta el primer `delta.content`.
  Para no afirmar algo falso: usó la misma query, modelo y
  `reasoning_effort: none`, pero un prompt corto de diagnóstico, no el system
  prompt completo de una finca autenticada.
- `RAG local`, IndexedDB y el ensamblado de prompt no son MCP y no quedaron
  medidos en este entorno. Para cerrar el gap de 35--61 s hay que poner marcas
  de Performance en el navegador autenticado, no volver a medir un banco de
  pruebas.

## Reparto por llamada

| Llamada | R1 ms | R2 ms | R3 ms | ¿Bloquea al siguiente? | ¿Su resultado se usó realmente en esta respuesta? | Clasificación para esta query |
|---|---:|---:|---:|---|---|---|
| `hybrid-retrieve` | 477 | 296 | 293 | Sí: hoy se espera antes del bloque de guardas | Sí: devolvió 3 chunks que se inyectan al prompt | b. Necesaria, paralelizable |
| `resolve-entities` | 383 | 341 | 274 | No individualmente; barrera de `Promise.all` | Sí: resolvió `eruca_vesicaria` (0,95); la coincidencia Mucuna (0,667) queda como sugerida | a. Necesaria antes del primer token |
| `fermento-prefilter` | 909 | 242 | 236 | No individualmente; paralela | No: `is_fermento_intent=false` | d. Innecesaria para esta query |
| `biopreparado-grounding` | 709 | 355 | 184 | No individualmente; paralela | No: `has_biopreparado=false` | d. Innecesaria para esta query |
| `piso-termico-guard` | 971 | 359 | 306 | No individualmente; paralela | No: `has_mismatch=false` | a. Necesaria antes del primer token por la altitud explícita; no-op en esta corrida |
| `confusion-especie-guard` | 1.618 | 355 | 338 | No individualmente; paralela | No: `has_confusion=false` | d. Innecesaria para esta query |
| `toxic-safety-guard` | 964 | 354 | 306 | No individualmente; paralela | No: `has_toxic_mention=false` | d. Innecesaria para esta query |
| `pest-vs-disease-guard` | 961 | 653 | 305 | No individualmente; paralela | No: `has_classification=false` | d. Innecesaria para esta query |
| `get_subgrafo_relacional` | 269 | 222 | 210 | **Antes:** sí, frenaba multihop. **Ahora:** no; salen juntos | No: respondió `found=false`; el cliente no inyecta su bloque | d. Innecesaria para esta query |
| `get_multihop_companions` | 183 | 198 | 245 | **Antes:** esperaba a subgrafo. **Ahora:** no; salen juntos | No: `found=false`, `reason=missing_species` | d. Innecesaria para esta query |
| `nlu` | 191 | 228 | 282 | Sí: decide el tool siguiente | No por sí solo: seleccionó `get_calendario_siembra` | d. Innecesaria si se conserva el routing determinístico correcto para esta pregunta |
| `tools/get_calendario_siembra` | 227 (502) | 219 (502) | 248 (502) | Sí: se espera antes del LLM | No: al fallar no deja `toolEvidence` | d. Innecesaria tal como está hoy; es un fallo, no grounding útil |
| LLM, primer `delta.content` | 1.587 | 1.244 | 1.222 | Es el destino del TTFT | Sí | a. Necesaria antes del primer token |

Tiempos compuestos crudos del scheduler actual, sin RAG local/IDB/prompt
completo: pre-LLM = **2.998, 1.818, 1.618 ms**; proxy de primer token con el
prompt corto = **4.585, 3.062, 2.840 ms**.

Hallazgos funcionales relevantes de la misma corrida:

- `get_subgrafo_relacional` se llama para una pregunta no relacional y devuelve
  `found=false`.
- `get_multihop_companions` recibe `{ cultivo: "eruca_vesicaria" }`, pero en
  esta corrida devolvió `missing_species`; no aporta evidencia.
- NLU devolvió el plan cacheado `get_calendario_siembra` con `mes:""` y
  `piso_termico:""`; la llamada siguiente dio HTTP 502. No hay dato que pueda
  justificar esperar esa ida y vuelta antes de responder.

## Cambio seguro implementado

Se modificó `src/components/AgentScreen/AgentScreen.jsx` para ejecutar
`get_subgrafo_relacional` y `get_multihop_companions` mediante el helper ya
existente `executeToolChain`. Los dos reciben los mismos `relArgs`, no mutan
estado remoto y los bloques se siguen ensamblando en el orden subgrafo,
multihop. Ante fallo, sigue la degradación graceful original.

### A/B pareado, sidecar remoto, misma query y anclas

Tres corridas por lado; se descarta la primera de cada lado por calentamiento.
Es un A/B de scheduling de esas dos lecturas contra `dev`, no un A/B de UI
desplegada: el cambio vive solo en este worktree y no se desplegó.

| Lado | Corrida | Subgrafo ms | Multihop ms | Pared ms |
|---|---:|---:|---:|---:|
| Antes, serial | 1 (descartada) | 259 | 230 | 489 |
| Antes, serial | 2 | 208 | 196 | 404 |
| Antes, serial | 3 | 204 | 214 | 417 |
| Después, paralelo | 1 (descartada) | 202 | 566 | 566 |
| Después, paralelo | 2 | 235 | 235 | 237 |
| Después, paralelo | 3 | 242 | 207 | 242 |

Mediana de las dos corridas retenidas: serial **410,5 ms**, paralelo
**239,5 ms**, ahorro **171 ms**. El ahorro esperado es `min(subgrafo,
multihop)` por turno donde ambas llamadas sigan siendo necesarias; en las
mediciones completas R2/R3 era 198/210 ms.

Prueba automatizada ejecutada:

```text
vitest run src/services/__tests__/sidecarClient.toolChain.test.js
Test Files  1 passed (1)
Tests  26 passed (26)
```

La prueba `SPEED-5 (#257): ejecuta los pasos en PARALELO (no secuencial)`
verifica que las tres promesas salen en vuelo simultáneamente y que el orden de
evidencias queda estable; este cambio usa exactamente ese helper con las dos
lecturas relacionales.

## Diseño propuesto, ordenado por ahorro esperado / riesgo

| Prioridad | Cambio | Ahorro esperado en esta query | Riesgo |
|---|---|---:|---|
| 1 | No llamar las dos tools relacionales salvo intención relacional (asocios, controladores, plaga+cultivo, varios saltos) | ~240 ms adicionales después del cambio; ~410 ms antes | Bajo-medio: requiere un router explícito y casos de regresión |
| 2 | No ejecutar el plan NLU/tool con args vacíos; para siembra construir argumentos válidos de forma determinística o degradar sin la llamada | 447--530 ms | Medio: debe preservarse la respuesta sobre calendario y hacer visible el 502 |
| 3 | Lanzar `hybrid-retrieve` junto al `Promise.all` de guardas, no antes | hasta 293--296 ms en caliente; 477 ms en R1 | Bajo: ambas entradas solo dependen del texto y se consumen antes de armar el prompt |
| 4 | Cache de `hybrid-retrieve` por query normalizada + versión de corpus/TTL corto | 293--477 ms en hit | Medio: invalidez de corpus y memoria; no cachear respuestas de seguridad |
| 5 | Preclasificador local conservador para no iniciar fermento, biopreparado, confusión, tóxico y plaga/enfermedad cuando no hay léxico gatillo | hasta el máximo de las guardas no requeridas: 312 ms en R2, 31 ms en R3; no es suma porque ya están paralelas | Medio-alto: una falsa negativa es riesgo de seguridad; primero medir recall y preferir cache de no-op |
| 6 | Medir el prompt real y limitar corpus por presupuesto antes de culpar MCP | Desconocido; es el candidato pendiente para explicar 35--61 s | Bajo para instrumentar, alto para cambiar presupuesto |

No propongo mover a después del primer token los guards de seguridad que
puedan cambiar la primera frase (`resolve-entities`, piso térmico, toxicidad).
Tampoco es seguro mandar las siete guardas al stream sin rediseñar cómo se
corrige un token ya visible. Para esta query concreta, las cinco guardas no-op
sí deben evitarse mediante decisión/caché anterior, no después de empezar a
emitir.

## Instrumentación necesaria para cerrar el caso de 35--61 s

En el navegador con una sesión FarmOS real, añadir `performance.mark` al inicio
y fin de `retrieve`, `retrieveCorpus`, cada wrapper sidecar, cada tool, armado
de `assembleSystemContent`, inicio de `streamOpenAI` y primer callback de
token. Guardar por turno: nombre, inicio relativo, duración, estado HTTP,
`found/no-op`, tamaño del prompt y TTFT. Con ello se separan RAG local,
prefill del LLM y red; sin esa traza, atribuir 35--61 s a las llamadas MCP sería
una conjetura.

