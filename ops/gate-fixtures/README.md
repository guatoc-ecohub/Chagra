# Fixtures de gate con RESPUESTA CONOCIDA

> Creados 2026-08-23 00:2x. Son **controles**, no ejemplos. Cada uno tiene una respuesta
> ya medida a mano. Un instrumento que no reproduce estas respuestas **no mide** —
> no importa cuántos tests sintéticos propios pase.

La regla que los origina: *el medidor miente antes que el sujeto, y mide bien AL LADO.*
Un detector validado contra fixtures que él mismo genera se está midiendo a sí mismo.

## Los archivos

| archivo | qué es | RESPUESTA CONOCIDA |
|---|---|---|
| `jaguar-idle-1400x1100.png` | captura completa del jaguar, harness `jaguar-demo.html`, panel IDLE, commit `6cb6a4775` | tiene UNA muesca dorsal en x≈806..813 |
| `control-POSITIVO-muesca-jaguar.png` | recorte `left=770 top=200 w=90 h=120` de la anterior | **DEFECT** — contiene la muesca |
| `control-NEGATIVO-hombro-limpio.png` | recorte `left=725 top=190 w=45 h=120` (hombro monótono) | **PASS** — no hay muesca |
| `control-CALIBRACION-agujero-interior.png` | el control positivo con un cuadrado 5×5 de color de fondo punzado dentro del cuerpo en (x=36..40, y=68..72) | **DEFECT** — agujero interior explícito |

## Los números crudos

Fondo = `rgb(247,241,226)`. Cuerpo bajo el lomo = `rgb(134,83,34)` … `rgb(165,106,38)` (es un
**degradado**, no un color plano — un detector que compare contra un solo color de silueta con
tolerancia ±15 no va a encontrar nada).

Perfil dorsal de `jaguar-idle-1400x1100.png` (y del primer píxel no-fondo, por columna):

```
x=798:238  799:238  800:238  801:239  802:240  803:240  804:240  805:241  806:241
x=807:241  808:242  809:242  810:242  811:243  812:244  813:241  814:239  815:238
x=816:238  817:238  818:237  819:237  820:237
```

Baja hasta 244 en x=812 y **vuelve** a 238 en x=815. Esa V es la costura.

Control negativo, mismo perfil en x=735..760:

```
213,214,215,216,217,218,220,222,224,227,230,233,233,233,233,234,234,234,234,234,234,232,232,232,232,232
```

Sube monótono y se aplana. No vuelve. No es muesca.

## El criterio, escrito ANTES de mirar

Para una costura la métrica **no es la amplitud del escalón** sino si el fondo **perfora** la
silueta: ¿existe una columna cuyo perfil baja por debajo de sus dos vecinas y vuelve a subir?
Binario. Un umbral por amplitud (`dy >= 4px`) es ciego a costuras — ya falló una vez así.

## Cómo se usa esto

Cualquier candidato a sonda de costura corre contra los tres controles y **pega su stdout
literal**. Si da la misma respuesta en el positivo y en el negativo, no mide: descartar.

Historial: `ops/INFORME-SONDA-COSTURA-RECHAZO-179.md` documenta el primer intento, que
contestaba `PASS` a los tres.
