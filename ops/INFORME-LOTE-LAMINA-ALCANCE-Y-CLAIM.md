# Informe lote lámina-viva: alcance y claim de recomposición

Fecha de corrida: 2026-08-18.

## Método común

Se usó un único medidor, `ops/medir-recomposicion-lamina.mjs`, ejecutado contra
los cinco worktrees en los OID de las ramas de los PR. El script recompone las
capas con las máscaras y el orden de apilado del runtime, incluyendo el inpaint
del pecho de la zarigüeya y las capas pre-cortadas del rig del jaguar.

El denominador es el número de píxeles del PNG original cuyo alfa es mayor que
0. Se reportan cuatro magnitudes distintas:

1. hueco totalmente transparente: alfa compuesto exactamente 0;
2. déficit alfa mayor que 0,5/255;
3. déficit máximo en unidades de alfa de 8 bits;
4. mismatches de alfa al redondear el compuesto a 8 bits.

El alfa compuesto se calcula con composición `over`. El script está escrito
una sola vez y recibe `--creature` y `--worktree`.

## A. Alcance del PR #2937

Veredicto: **retirado por no ser necesario dentro del alcance auditado**.

El diff original de `origin/dev...origin/feat/oso-lamina-viva` tenía diez
archivos. `src/components/CompaiOverlay.jsx` era el único archivo fuera del
alcance declarado. Se hizo la prueba binaria en un worktree separado:

```text
Rama intacta, 3 archivos de test propios:
Test Files  3 passed (3)
Tests       60 passed (60)

Mismo árbol, solo CompaiOverlay.jsx restaurado a origin/dev:
Test Files  3 passed (3)
Tests       60 passed (60)
```

Comando usado en ambas corridas:

```text
npx vitest run src/visual/creatures/__tests__/OsoBastonLaminaViva.test.jsx src/visual/creatures/osoLamina/__tests__/capas.test.js src/components/__tests__/ChagraAgentAvatarElencoUnificado.test.jsx
```

El archivo se restauró y se publicó en la rama del PR mediante el commit
`4dce11e29` (`fix(oso): retirar ajuste de overlay fuera de alcance`). No se
mergeó el PR.

## B. Las dos definiciones de recomposición

| PR | Sujeto | Visibles | Huecos totalmente transparentes | Déficit alfa > 0,5/255 | Déficit máximo | Mismatches alfa a 8 bits |
|---|---|---:|---:|---:|---:|---:|
| #2935 | jaguar | 138.251 | 435 (0,315%) | 5.137 (3,716%) | 142,000/255 | 31.028 |
| #2937 | oso | 218.331 | 0 (0,000%) | 301 (0,138%) | 63,750/255 | 2.549 |
| #2938 | zarigüeya | 84.693 | 0 (0,000%) | 1.159 (1,368%) | 4,5004/255 | 10.676 |
| #2940 | luciérnaga | 78.065 | 0 (0,000%) | 1.778 (2,278%) | 63,750/255 | 5.145 |
| #2943 | chivito punk | 112.987 | 0 (0,000%) | 2.364 (2,092%) | 63,750/255 | 4.231 |

La etiqueta honesta para el oso, zarigüeya, luciérnaga y chivito es, por
ejemplo: “0,000% de huecos totalmente transparentes; N píxeles (X%) con
déficit alfa > 0,5/255 por las bandas de crossfade”. Para el jaguar la primera
cifra medida por este procedimiento es 0,315%, no 0,000%.

## Control del medidor

### Control positivo: imagen contra sí misma

```json
{
  "creature": "oso",
  "control": "self",
  "width": 615,
  "height": 630,
  "metrics": {
    "visible": 218331,
    "transparent": 0,
    "transparentPct": 0,
    "deficit": 0,
    "deficitPct": 0,
    "maxDeficit255": 0,
    "mismatch8": 0
  }
}
```

### Control negativo: recomposición con la capa `cabeza` retirada

```json
{
  "creature": "oso",
  "control": "drop",
  "drop": "cabeza",
  "width": 615,
  "height": 630,
  "metrics": {
    "visible": 218331,
    "transparent": 15734,
    "transparentPct": 7.206489229655889,
    "deficit": 18567,
    "deficitPct": 8.504060348736552,
    "maxDeficit255": 255,
    "mismatch8": 20015
  }
}
```

El control negativo da valores mayores que cero, por lo que el medidor sí
distingue un caso roto de la imagen contra sí misma.

## Comentarios publicados

- [PR #2935, comentario de medición](https://github.com/guatoc-ecohub/Chagra/pull/2935#issuecomment-5330456097)
- [PR #2937, comentario de alcance y medición](https://github.com/guatoc-ecohub/Chagra/pull/2937#issuecomment-5330456393)
- [PR #2938, comentario de medición](https://github.com/guatoc-ecohub/Chagra/pull/2938#issuecomment-5330456681)
- [PR #2940, comentario de medición](https://github.com/guatoc-ecohub/Chagra/pull/2940#issuecomment-5330456916)
- [PR #2943, comentario de medición](https://github.com/guatoc-ecohub/Chagra/pull/2943#issuecomment-5330457167)

Las cinco descripciones de PR también recibieron una sección de corrección
con la definición estrecha y el déficit alfa medido. Los cinco PR siguen draft;
no se hizo ningún merge.

## Lo que no pude verificar

- No hice juicio visual ni certifiqué que las criaturas se lean como deben en
  capturas. El informe es numérico y de alcance.
- No ejecuté un gate GPU ni comprobé las tres distancias visuales, semillas o
  baseline de post-proceso, porque no son necesarios para responder este claim
  factual y el encargo prohíbe certificar el arte.
- La medición cuenta alfa y mismatches de alfa; no certifica igualdad de color
  RGB ni ausencia de costuras perceptibles.
- No juzgué si los déficits alfa medidos son aceptables visualmente. Esa decisión
  queda para el operador.
