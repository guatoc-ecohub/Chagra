# Re-gate de láminas compai con captura congelada

Fecha: 2026-08-23. Alcance: costuras y muesca dorsal que tenían un veredicto
visual o de composición registrado. No se modificó arte ni código de producto.

## Método y alcance

Antes de capturar:

- `./_gate/herramientas/gate-x-estado.sh`: **VIVO**.
- La sonda propia importó `./_gate/herramientas/gate-pantalla.mjs`.
- `pgrep -c chromium`: **1** proceso ajeno durante la medición. No se reporta
  FPS. La carga ajena queda declarada, pero la estabilidad de píxel del
  instrumento sí se midió.
- Cada harness se abrió con `capturar-congelado.mjs`, `--repeticiones 3`.
  El instrumento inyecta `animation:none`, `transition:none` y pausa las
  animaciones antes de esperar y capturar.

El censo separó dos cosas que el nombre de la rama podía mezclar:

- Las ramas `fix/costuras-lamina-{jaguar,oso,luciernaga,chivito,zariguya}` sí
  tienen un resultado específico en el informe de costuras del lote. Se
  re-midieron las cinco.
- `fix/jaguar-muesca-dorsal` tiene además un informe específico de perfil de
  silueta. Se re-midió con su harness exacto.
- `feat/{chivito-punk,oso,zariguya,luciernaga}-lamina-viva` fueron inspeccionadas.
  Sus archivos de rama sólo contienen el informe F26 compartido, o juicios de
  identidad que no son un gate de costuras. No se inventó un veredicto de
  costura para ellas.
- Las demás ramas `fix/*jaguar*`, `fix/*oso*` y `fix/*zariguya*` inspeccionadas
  no tienen un veredicto de costura comparable en `ops/` o `_gate/`; sus probes
  de brazo, párpado o guantes quedan fuera de este re-gate.

## Tabla de comparación

En la columna vieja, `PASS alfa` significa déficit y huecos cero en la
recomposición del informe del lote. Es una medición offline de capas, no una
prueba de que la captura viva fuera estable.

| Rama | Commit gateado | Veredicto viejo | Veredicto nuevo | ¿Estable 3/3? | Instrumento viejo |
|---|---|---|---|---|---|
| `fix/costuras-lamina-jaguar` | `a99f66b5e` | PASS alfa, déficit 0, huecos 0 | PASS visual acotado: sin hueco de fondo visible; se lee como jaguar | Sí | `medir.mjs` + `shot-pw.mjs`, captura viva |
| `fix/costuras-lamina-oso` | `dd339cece` | PASS alfa, déficit 0, huecos 0 | PASS visual acotado: masa continua; se lee como oso con bastón y brote | Sí | `medir.mjs` + `shot-pw.mjs`, captura viva |
| `fix/costuras-lamina-luciernaga` | `a5a60d138` | PASS alfa, déficit 0, huecos 0 | PASS visual acotado: sin perforación visible; se lee como insecto luminoso | Sí | `medir.mjs` + `shot-pw.mjs`, captura viva |
| `fix/costuras-lamina-chivito` | `09cc508d4` | PASS alfa, déficit 0, huecos 0 | PASS visual acotado: piel continua; se lee como ave punk | Sí | `medir.mjs` + `shot-pw.mjs`, captura viva |
| `fix/costuras-lamina-zariguya` | `3d1e07670` | PASS alfa, déficit 0, huecos 0 | PASS visual acotado: sin hueco visible; se lee como zarigüeya | Sí | `medir.mjs` + `shot-pw.mjs`, captura viva |
| `fix/jaguar-muesca-dorsal` | `ef2317535` | PASS de perfil, tras descartar capturas vivas | PASS de perfil en captura congelada; sin muesca dorsal visible | Sí | perfil por columna sobre captura viva |

Estos PASS nuevos son deliberadamente acotados a lo que se pudo mirar en el
fotograma congelado. No sustituyen el medidor offline de alfa ni certifican
FPS, interacción o todos los estados de vida.

## Stdout literal de la captura estable

Las siguientes son las salidas literales de cinco corridas, una por lámina.
Los nombres de salida son los artefactos locales de esta corrida.

### Jaguar

```text
_gate/regate-congelado/jaguar-1.png
_gate/regate-congelado/jaguar-2.png
_gate/regate-congelado/jaguar-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

### Oso

```text
_gate/regate-congelado/oso-1.png
_gate/regate-congelado/oso-2.png
_gate/regate-congelado/oso-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

### Luciérnaga

```text
_gate/regate-congelado/luciernaga-1.png
_gate/regate-congelado/luciernaga-2.png
_gate/regate-congelado/luciernaga-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

### Chivito

```text
_gate/regate-congelado/chivito-1.png
_gate/regate-congelado/chivito-2.png
_gate/regate-congelado/chivito-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

### Zarigüeya

```text
_gate/regate-congelado/zariguya-1.png
_gate/regate-congelado/zariguya-2.png
_gate/regate-congelado/zariguya-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

El harness exacto de `fix/jaguar-muesca-dorsal` también produjo:

```text
_gate/regate-congelado/jaguar-muesca-1.png
_gate/regate-congelado/jaguar-muesca-2.png
_gate/regate-congelado/jaguar-muesca-3.png

peor par (): 0 px distintos = 0.0000 %, delta máx de canal 0
✅ 3/3 capturas ESTABLES (≤2 de delta y ≤0.05 %) — los números se pueden leer.
```

## Control obligatorio del instrumento

Se tomó `jaguar-1.png`, una captura estable, y se fabricó un defecto en la
imagen de control: se punzó la columna `x=610`, desde `y=457` durante 9 px,
usando exactamente el fondo RGB `[233, 228, 214]`. La sonda inline importó
`gate-pantalla.mjs` antes de leer los píxeles.

Resultado literal:

```json
{
  "control": "jaguar stable capture",
  "pantalla": "VIVO",
  "fondo": [233, 228, 214],
  "muesca": { "x": 610, "y": 457, "alto": 9, "color": "exacto del fondo" },
  "perfilLimpioMaximos": [],
  "perfilRotoMaximos": [610],
  "detecta": true,
  "salida": "_gate/regate-congelado/control-jaguar-muesca.png"
}
```

El control responde en las dos direcciones: la captura limpia no inventa un
máximo local y la muesca fabricada sí dispara exactamente en `x=610`. Por lo
tanto, el nuevo PASS de perfil no es un guardián que siempre dice limpio.

## Lo que no pude verificar

- No medí FPS. Había un Chromium ajeno y este instrumento se usó para
  estabilidad de captura, no para rendimiento.
- No certifiqué interacción, estados hablados/caminando ni comportamiento
  temporal. El fotograma congelado sólo permite juzgar la costura en el estado
  `quieto` del harness.
- No reejecuté el medidor offline de alfa: el encargo era re-gatear la lectura
  de capturas con el instrumento estable. Por eso la comparación nueva no
  pretende reemplazar los números de recomposición.
- Las ramas `feat/*-lamina-viva` no tienen un veredicto específico de costura
  registrado en sus árboles versionados. Sus juicios de identidad o presencia
  3D no se transformaron en PASS/DEFECT de costura.
