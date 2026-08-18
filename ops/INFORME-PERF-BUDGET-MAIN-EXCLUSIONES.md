CAUSA=plaga-images sin excluir en main, MERGE-DE-DEV=arregla

# Informe de Performance Budget: `main` frente a `dev`

## Veredicto

La hipótesis queda confirmada por el control cruzado. `origin/main` falla porque su copia de `scripts/check-perf-budget.mjs` no excluye `dist/plaga-images`. La misma lógica de `dev`, aplicada al mismo `dist` de `main`, pasa. `dist/valle` no causa el rojo de `main`.

El run histórico también fue verificado:

```text
run=31655908540
name=Performance Budget
event=push
headBranch=main
headSha=80e0ebeeaba8f9c956f4e25346703eb6b6c36086
conclusion=failure
Total dist (arranque, budget): 57.1 MB / 27.5 MB
Excluido lazy (modo campo #2088): 13.1 MB (cache-on-use, no en arranque)
BUDGET EXCEEDED:
  - TOTAL dist exceeds budget: 57.1 MB
```

## Control cruzado

Referencias construidas:

```text
origin/main = 80e0ebeeaba8f9c956f4e25346703eb6b6c36086
origin/dev  = 372a3a8ce1fa4f0d37c48d5f6e1697c5bc2a61a5
```

Se construyó `origin/main` sin fuente local del valle, reproduciendo el runner de `main`, y `origin/dev` con la fuente local del valle disponible, reproduciendo el artefacto que reporta el lazy excluido de `dev`. En cada columna se mantuvo el mismo `dist` y solo se cambió la copia del script.

| `dist` construido desde | Script ejecutado | Salida | Total budget, bytes crudos | Lazy excluido, bytes crudos |
|---|---|---:|---:|---:|
| `origin/main` | `main` | falla | `59,827,553` | `13,763,315` |
| `origin/main` | `dev` | pasa | `26,169,353` | `47,421,515` |
| `origin/dev` | `dev` | pasa | `27,740,701` | `70,215,158` |
| `origin/dev` | `main` | falla | `78,250,108` | `19,705,751` |

Salidas formateadas por el gate:

```text
main dist + main script: 57.1 MB / 27.5 MB, exit=1
main dist + dev script:  25.0 MB / 27.5 MB, exit=0
dev dist + dev script:   26.5 MB / 27.5 MB, exit=0
dev dist + main script:  74.6 MB / 27.5 MB, exit=1
```

La cuarta celda incluye los `16,851,207` bytes de `dist/valle` en el cálculo de `main`, porque `main` tampoco excluye ese prefijo. Esto no cambia el veredicto: el `dev` script pasa en su propio `dist` y el `main` script falla.

## Brecha y atribución

Comparando los dos casos que representan cada rama con su propio script:

```text
59,827,553 - 27,740,701 = 32,086,852 bytes de brecha
32,086,852 - 33,658,200 = -1,571,348 bytes de residuo después de plaga-images
```

`dist/plaga-images` pesa exactamente `33,658,200` bytes. Por tanto explica toda la brecha mostrada como aproximadamente 31 MB y la sobreexplica en `1,571,348` bytes. No queda residuo positivo sin explicar: el saldo negativo se debe a que el build no lazy de `dev`, una vez retirada la misma carpeta de plagas, es `1,571,348` bytes más grande que el de `main`.

El saldo entre esos builds, por entradas no lazy, es:

```text
assets:            +1,145,050
botica:               +75,975
compai:              +417,853
demos:                +20,387
grafo-relations:      -94,648
index.html:            +1,390
mercado.html:             +87
species-visor.html:     +5,254
total:             +1,571,348 bytes
```

## Corrección del informe previo sobre `public/valle`

La conclusión de `ops/INFORME-MAIN-VS-DEV-31MB.md` no se sostiene para este budget. En el control, `dist/valle` pesa `16,851,207` bytes y aparece en el build de `dev`, no en el de `main`. El script de `dev` lo excluye, por lo que no infla su total de arranque. La diferencia de disco total, sin aplicar el criterio del budget, va en la dirección opuesta a la conclusión previa:

```text
dist completo de main: 73,590,868 bytes
dist completo de dev:  97,955,859 bytes
valle dentro de dev:    16,851,207 bytes
dev completo - main completo: +24,364,991 bytes
```

Ese `du -b` de disco total no decide el número de arranque. El control que cambia únicamente el script sí decide: `plaga-images` es la exclusión faltante en `main`.

## PR de promoción #2649

La relación entre las referencias se verificó con Git:

```text
$ git merge-base origin/main origin/dev
efd57b1a13d1f02e612605fe6c48da9e9c397f47

$ git log --oneline origin/main..origin/dev -- scripts/check-perf-budget.mjs
c1cfaf42f feat(valle): marco de entrada opcional al valle 3D vanilla vía iframe (#2891)
d06a18977 fix(ci): destrabar merge queue ... excluir plaga-images del perf-budget (#2846)
```

Además, ambos commits son ancestros de `origin/dev` y ninguno lo es de `origin/main`:

```text
d06a18977 in origin/dev  = yes
c1cfaf42f in origin/dev  = yes
d06a18977 in origin/main = no
c1cfaf42f in origin/main = no
```

Sí: promover `dev` a `main` lleva los dos commits y arregla este rojo del budget. La promoción no sube el umbral ni agrega una exclusión nueva fuera de las dos que ya están en `dev`.

## NO PUDE VERIFICAR

No se proporcionó un identificador de un run histórico independiente de `dev`; por eso no afirmo que el filesystem exacto de ese runner sea idéntico al local. Sí se reprodujo localmente su salida relevante de `26.5 MB / 27.5 MB` y `67.0 MB` lazy usando la fuente del valle disponible. No se pusheó, mergeó ni modificó ninguna PR remota.
