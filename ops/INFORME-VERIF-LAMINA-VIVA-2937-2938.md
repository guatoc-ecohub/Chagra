# Informe de verificación, lámina viva PR #2937 y PR #2938

Fecha de corrida: 2026-08-18. Base declarada por ambos PR: `origin/dev` en `e786a490e28d07cfe1aef62c1abe3d216c80b5a6`.

## Método

- Se usaron worktrees separados en los OID exactos de cada PR.
- Se ejecutaron únicamente los archivos de test que cada rama agrega o modifica.
- Para el control negativo se restauraron solamente los archivos de producción del PR a `origin/dev`; los tests de la rama quedaron intactos.
- La recomposición se re-medió con `sharp` y las mismas fórmulas/máscaras de `capas.js` de cada rama, contra el PNG versionado. En jsdom no hay Canvas2D real, así que no se presentó como una captura de navegador.

## PR #2937, oso

### Tests propios

Archivos corridos:

```text
src/visual/creatures/__tests__/OsoBastonLaminaViva.test.jsx
src/visual/creatures/osoLamina/__tests__/capas.test.js
src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx
```

Resultado propio: **3 archivos, 60/60 tests verdes**.

La afirmación del PR de `239/239` en 31 archivos no fue reproducida: esta corrida cubre los tres archivos de test presentes en el diff de la rama.

### Control negativo

Se restauraron a `origin/dev` los siete archivos de producción del PR, incluyendo `oso.png`, `OsoBastonLaminaViva`, `osoLamina/*`, `ChagraAgentAvatarOsoBaston` y `CompaiOverlay`, dejando los tres archivos de test.

Resultado: **rojo**. Vitest reportó 3 suites fallidas; 2 no pudieron cargar por imports de archivos retirados y la suite del elenco quedó en **3 fallos y 27 pases de 30 tests**. El control sí detecta la ausencia del oso: no queda verde con el sujeto revertido.

### Alcance del diff

Diff `origin/dev...82562598a62e062c59b43bdd7fc0ea772596d551`: 10 archivos, 1.289 inserciones y 43 eliminaciones.

Archivo fuera del alcance permitido por el encargo:

```text
src/components/CompaiOverlay.jsx
```

Los otros nueve archivos están dentro de `src/visual/creatures/**`, `src/components/ChagraAgentAvatar*`, `public/compai/laminas/**` o `__tests__/**`.

### Recomposición

PNG: **615×630**, 218.331 píxeles con alfa > 0.

- Huecos de alfa final exactamente cero sobre píxeles originalmente opacos: **0**, equivalente a **0,000%** bajo esa definición.
- Déficit alfa mayor que 0,5: **301 píxeles**, **0,138%**.
- Déficit alfa mayor que 1: **279 píxeles**.
- Máximo déficit alfa medido: **63,75/255**.
- Mismatches de alfa tras redondear a 8 bits: **2.549**.

Por tanto, no se reproduce una igualdad alfa exacta. El `0,000%` solo es válido si “píxeles perdidos” significa “píxeles que quedaron totalmente transparentes”.

## PR #2938, zarigüeya

### Tests propios

Archivos corridos:

```text
src/visual/creatures/__tests__/ZariguyaLaminaViva.test.jsx
src/visual/creatures/zariguyaLamina/__tests__/capas.test.js
```

Resultado propio: **2 archivos, 32/32 tests verdes**.

### Control negativo

Se restauraron a `origin/dev` los seis archivos de producción del PR, incluyendo `zariguya.png`, `ZariguyaLaminaViva`, `zariguyaLamina/*` y `ChagraAgentAvatarZariguya`, dejando los dos archivos de test.

Resultado: **rojo**. Las 2 suites fallaron al resolver imports de producción retirados; Vitest reportó **0 tests ejecutados** en el control. El control no queda verde con el sujeto revertido.

### Alcance del diff

Diff `origin/dev...df2e37080588d05e2c4e52d292c3ba80174081f2`: 8 archivos, 1.483 inserciones y 40 eliminaciones. Todos están dentro del alcance permitido.

Los archivos de datos señalados en el encargo no entraron al commit ni al diff del PR:

```text
public/chagra-stats.json                 no aparece
public/cycle-content/manifest.json       no aparece
```

### Recomposición

PNG: **481×444**, 84.693 píxeles con alfa > 0. Se incluyeron las máscaras exportadas por la rama, el cuerpo-inpaint y los dos parches de párpado.

- Huecos de alfa final exactamente cero sobre píxeles originalmente opacos: **0**, equivalente a **0,000%** bajo esa definición.
- Déficit alfa mayor que 0,5: **1.125 píxeles**, **1,328%**.
- Déficit alfa mayor que 1: **989 píxeles**.
- Máximo déficit alfa medido: **4,5004/255**.
- Mismatches de alfa tras redondear a 8 bits: **14.328**.

Por tanto, tampoco se reproduce una igualdad alfa exacta. El `0,000%` vuelve a depender de contar únicamente huecos totalmente transparentes.

## Veredicto

| PR | Tests propios | Control negativo | Alcance del diff | Recomposición | Veredicto |
|---|---:|---|---|---|---|
| #2937 oso | 60/60 | ROJO | **FALLO DE ALCANCE**: `src/components/CompaiOverlay.jsx` | 0 huecos completos, pero 301 déficits alfa >0,5 (0,138%) | **QUÉ FALTA** |
| #2938 zarigüeya | 32/32 | ROJO | OK; sin archivos de datos accidentales | 0 huecos completos, pero 1.125 déficits alfa >0,5 (1,328%) | **QUÉ FALTA** |

Ninguno queda marcado como listo para merge con estas mediciones. Para #2937 falta justificar o retirar el cambio a `CompaiOverlay.jsx`. Para ambos, la afirmación de recomposición debe acotarse a “sin huecos totalmente transparentes” o aportar una medición que explique los déficits alfa observados. No se hizo juicio visual ni gate GPU porque el encargo pidió verificación factual de tests, control negativo, alcance y recomposición.
