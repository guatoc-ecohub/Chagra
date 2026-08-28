# BRIEF RESULTADO: Angelita P1

## Estado

P0 y P1 quedaron implementados en la rama `feat/angelita-p1-species-param-20260828`. No se abrió PR, no se ejecutó captura GPU y no se tocó producción.

## P0.5: diagnóstico y correcciones

Las tres fallas eran bugs reales de código. No se cambió ningún test para esconder una regresión.

1. `useCompaiDraggable.js`: el handler táctil asumía que siempre existía `touches[0]`. Ahora resuelve coordenadas desde `touches`, `changedTouches` o el evento de mouse, y degrada sin lanzar si el evento no trae coordenadas. Se añadieron pruebas para fallback de mouse y movimiento touch real.
2. `ChagraAgentAvatarGuacamaya.jsx`: el adaptador descartaba el prop `visema` rico y lo reemplazaba por un valor derivado del `state` angosto. Ahora conserva el visema recibido y mantiene `V2` como fallback compatible para `state="speaking"`.
3. `AgentFab.jsx`: el botón de silencio permanecía con `display:none` durante hover/foco. El test no estaba stale: la condición de visibilidad contradecía la política accesible documentada. Ahora se revela al acercarse, enfocar, tocar o abrir el menú y sigue oculto en reposo.

P0 quedó verde:

```text
Test Files  21 passed (21)
Tests       246 passed (246)
```

## P1

### #8 elenco de siete compai

La base `dev` ya contenía el roster canónico exacto en `AVATAR_TYPES` y `ELENCO.enPWA`. Se conservó el contrato y se verificó que los siete tipos coinciden: Angelita, jaguar, oso del bastón, zarigüeya, luciérnaga, chivito punk y guacamaya.

### #52 entrada al mundo por especie

`CompaiEscena` y `compaiRegistry` ya enrutan la elección del usuario a una escena propia para los siete. Se completó el enabler de entrada: `useEntradaCompai` recibe `especie` y `presencia`, mientras `useEntradaAbeja` queda como alias compatible y `AbejaEscena` como adaptador exclusivo de Angelita. La coreografía ya no fija el perfil idle ni la presencia espacial a la abeja.

### #19 idle por especie

Los siete slugs canónicos tienen un perfil propio en `creatureIdle.js`. `chivito-punk` es ahora la llave canónica y `chivito` queda como alias compatible. La escena compartida de aves consume los perfiles de guacamaya y chivito para pose, squash/stretch y cadencia, sin redibujar sus rigs.

### Diez estados, cara, voz, clima y guía

Se añadió un resolver puro de estado visual por especie. Los diez estados canónicos se conservan en `data-agt-estado`; cada rig recibe una `data-pose` compatible con su medio y el visema real llega por `data-visema`. Los adaptadores de jaguar, oso, zarigüeya, luciérnaga, chivito y guacamaya ya no degradan silenciosamente el estado rico a cuatro valores ni hardcodean la voz.

### Patinaje

`AgentFab` usa `comportamiento.caminando` únicamente cuando el agente está en idle. Conversación, alerta, respuesta e interacción mantienen prioridad. Jaguar, oso y zarigüeya reciben marcha terrestre; Angelita, luciérnaga, guacamaya y chivito reciben locomoción aérea. La dirección también sale del motor de comportamiento y dejó de estar fija a la izquierda.

## Verificación

Set final afectado:

```text
Test Files  25 passed (25)
Tests       266 passed (266)
```

Además:

- ESLint focal sobre todos los archivos fuente y tests modificados: verde, cero warnings.
- `git diff --check`: verde.
- `tsc:check` global: rojo por deuda de base extensa fuera del alcance. El filtro por archivos de esta rama se usó para corregir los errores introducidos por P1; permanecen dos errores previos de tipado en líneas no modificadas de `EscenaBase3D.jsx`.
- No hay archivos eliminados.

## GPU verify pendiente

El orquestador debe validar con GPU headed:

1. Entrada 2D a 3D con cada uno de los siete cuerpos, sin aparición de Angelita como sustituto.
2. Cadencia idle diferenciada, especialmente guacamaya y chivito.
3. Los diez estados en cada rig: cara, pose de guía, clima/alerta y lip-sync.
4. Roaming sin patinaje: marcha visible de terrestres y desplazamiento aéreo de voladores.
5. Arrastre de `AgentFab` con mouse y touch, más revelado accesible del botón de silencio.

No se certifica resultado visual en este entorno sin display.
