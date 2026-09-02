# Recibo de escritura Sylva en AGE

Fecha de ejecución: 2026-09-01, hora local del carril.

## Resultado medido

| Medición | Conteo |
|---|---:|
| `:Task` antes de escribir | 103 |
| `:Task` después de la primera corrida | 153 |
| Sylva antes | 0 |
| Sylva escritas | 50 |
| `:Task` antes de la corrida de control | 153 |
| `:Task` después de la corrida de control | 153 |
| ids `:Task` duplicados | 0 |
| ids Sylva duplicados | 0 |

La corrida de control repitió los 50 upserts y no aumentó el conteo. El writer
usado fue `ops/ssot/kg-task.sh`, con el lock de escritura de la API SSOT. El
backup del grafo se tomó antes de escribir y quedó validado con tamaño de
53.166.797 bytes en almacenamiento local protegido.

## Mapeo al contrato SSOT vigente

El contrato live de `:Task` exige `task_id=tsk_<24 hex>` y un conjunto cerrado
de propiedades. Por eso no se añadieron propiedades libres que el validador
rechazaría. Cada tarea quedó así:

- `task_id`: id canónico determinista derivado del título.
- `titulo`: título del catálogo/backlog.
- `estado=PEND`: representación SSOT de `status=pending`.
- `carril` y `modelo`: valores de `pending.txt`.
- `aliases`: id corto (`sylva-sNN`), slug completo, `tier:Tn`, `mali:*`,
  `status:pending` y `origen:sylva`.
- `source_ids`: `sylva:sNN` y `sylva:<slug>`.
- `estado_razon`: conserva `pending`, origen, tier y Mali de cada entrada.

Así quedan consultables los ocho datos del encargo sin romper el contrato
canónico ni modificar las 103 tareas preexistentes.

## Distribución registrada

| Tier | Cantidad |
|---|---:|
| T1 | 5 |
| T2 | 9 |
| T3 | 9 |
| T4 | 8 |
| T5 | 10 |
| T6 | 9 |

| Carril | Cantidad |
|---|---:|
| codex | 29 |
| fable | 21 |

| Mali | Cantidad |
|---|---:|
| green | 33 |
| yellow | 10 |
| red | 5 |
| existing | 1 |
| unspecified | 1 |

Los ids cortos verificados son `sylva-s01` hasta `sylva-s50`.

## No pude verificar

- No hubo gate visual ni FPS: es una escritura de metadata, no una escena 3D.
  El script `./_gate/herramientas/gate-x-estado.sh` no existe dentro de este
  workspace, por lo que no se reporta ningún estado visual inventado.
- No se modificó `pending.txt` ni el catálogo. La fuente local contiene 50
  entradas Sylva y el grafo quedó con 50 correspondencias verificadas.
