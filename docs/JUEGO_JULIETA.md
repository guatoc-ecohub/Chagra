# Mi Finca Viva — la capa lúdica de Chagra para niñas y niños

> Un regalo para Julieta (y para cualquier niña que quiera ver crecer su finca).
> Una capa de juego **encima** del motor de evolución agroecológica que ya
> existe — **no** un juego paralelo con datos inventados.

## 1. La idea en una frase

La finca es un **mundo vivo que florece de verdad** a medida que la familia
trabaja: cada planta sembrada, cada cosecha registrada y cada cuidado sin
venenos hace que el mundo del juego crezca, lleguen criaturas y se cumplan
misiones. El "puntaje" no es inventado: es la suma de los indicadores reales que
el motor agroecológico ya calcula.

## 2. Principio fundacional: CERO FABRICACIÓN

Igual que el resto de Chagra, este juego **no inventa progreso**. Toda criatura,
insignia, nivel del mundo o misión cumplida se **deriva** de
`evaluarEvolucionFinca()` (el motor `fincaEvolutionService`) sobre datos reales
de la finca. Si no hay datos, el mundo arranca vacío y el juego **invita** a
sembrar — nunca muestra un mundo falsamente lleno.

- Sin procesos registrados → finca vacía → "¡Sembrá tu primera planta!".
- Una criatura aparece solo cuando un indicador real cruza su umbral.
- El nivel del mundo (0–4) **es** el nivel de Gliessman real de la finca.

Esto respeta el contrato anti-paternalista de
`MiFincaEvolucionScreen` ("acá no hay puntos ni medallas"): el juego es una
**lectura alegre** de la misma verdad, pensada para que una niña la entienda y
la disfrute, no una capa de XP arbitraria.

## 3. Mecánicas

### 3.1 El mundo que crece (5 etapas = nivel Gliessman 0–4)

El escenario ilustrado (`FincaWorldScene`, SVG inline + CSS, offline-first) se
transforma visiblemente según el nivel: más árboles, más plantas en el suelo,
colores más vivos, frutos en los árboles, y las criaturas reales sobrevolando.

| Nivel | Nombre para la niña | Término real (Gliessman) |
|------:|---------------------|--------------------------|
| 0 | La tierra que despierta | Convencional |
| 1 | El primer verde | Reducción de insumos |
| 2 | La tierra viva | Sustitución orgánica |
| 3 | El bosque de comida | Rediseño del sistema |
| 4 | La finca que comparte | Conexión social y económica |

El juego enseña con cariño: muestra el nombre alegre **y** el término
agroecológico real ("tu finca está en la etapa «Sustitución orgánica»").

### 3.2 Criaturas coleccionables (biodiversidad real)

Aparecen cuando los indicadores reales suben — son la biodiversidad que de
verdad llega a una finca sana. Se ven en la galería (`CriaturaCollection`): las
desbloqueadas a color, las que faltan en silueta con una **pista** honesta de
qué acción real las atrae. Cada una tiene audio (TTS) para niñas que leen poco.

| Criatura | Aparece cuando… (indicador real) |
|----------|----------------------------------|
| 🪱 Lombriz | Empieza el cuidado del suelo sin venenos (autodependencia ≥ 1) |
| 🦋 Mariposa | Hay varias plantas distintas (diversidad ≥ 1) |
| 🐝 Abeja | Las plantas se ayudan / hay buena diversidad (sinergias ≥ 1 o diversidad ≥ 3) |
| 🐸 Rana | El sistema es resiliente y variado (resiliencia ≥ 2) |
| 🐦 Colibrí | Hay muchas flores y plantas (diversidad ≥ 3) |
| 🐞 Mariquita | Se cuida sin químicos (autodependencia ≥ 2) |
| 🦜 Quetzal | **La cumbre**: finca-bosque madura (nivel ≥ 3 + diversidad ≥ 3) |

### 3.3 Misiones (acciones reales + aprender con GUATOC)

Cada misión empuja a una **acción real** de la finca o a aprender una ficha
GUATOC. Completar la acción real mueve los indicadores → sube la finca.

| Misión | Tipo | Rutea a | Se cumple con… |
|--------|------|---------|----------------|
| 🌱 Sembrá una planta | acción | `sembrar` | ≥ 1 proceso registrado |
| 📖 Aprendé sobre una planta | aprender | `ciclo` (GUATOC) | la niña marca "Ya lo aprendí" |
| 🌻 Sembrá plantas amigas | acción | `sembrar` | diversidad ≥ 1 |
| 🧪 Preparale comida natural | acción | `insumos` | autodependencia ≥ 1 (biopreparado) |
| 🧺 Recogé tu cosecha | acción | `cosechar` | productividad ≥ 1 |
| 🔎 Mirá tu finca | acción | `observacion` | una observación registrada |

Las misiones de **acción** se marcan solas (leen los indicadores). Las de
**aprender** se marcan a mano (leer una ficha no deja rastro en los
indicadores), y eso se persiste por finca.

### 3.4 Insignias

Reconocimiento de hitos reales (no XP): Primera semilla, Jardín diverso, Amiga
del suelo, Primera cosecha, Guardiana del bosque. Cada una tiene su `check(ev)`
puro sobre datos reales.

### 3.5 Recompensas y celebración

Al subir de nivel: overlay de fiesta (`LevelUpCelebration`) con confeti,
**sonido** (`agentSoundService.chime`) y **narración por audio** (TTS kokoro /
Web Speech). Se dispara **una sola vez** por subida (se compara el nivel actual
contra el último visto, persistido por finca).

### 3.6 Accesibilidad (pensado para una niña)

- Botones grandes (44–56 px), alto contraste, textos cortos.
- **Audio en todo**: narración de la finca, logros de criaturas y misiones por
  TTS, para una niña que lee poco. Botón grande de encender/apagar sonido.
- Animaciones suaves (CSS) que respetan `prefers-reduced-motion`.
- Todo offline-first; degrada limpio en modo privado (sin localStorage).

## 4. Arquitectura (reúso, no reinvención)

```
fincaEvolutionService.js   ← MOTOR existente (puro, cero-fabricación)
        │  evaluarEvolucionFinca({processes, observations})
        ▼
fincaGameService.js        ← NUEVO: traduce indicadores → mundo/criaturas/misiones
        │                     (normaliza el shape real anidado→plano sin tocar el motor)
        ▼
MiFincaVivaScreen.jsx      ← NUEVO: pantalla del juego (ruta 'juego')
   ├─ FincaWorldScene.jsx       (el mundo SVG que crece)
   ├─ CriaturaCollection.jsx    (galería de criaturas)
   ├─ MisionCard.jsx            (misiones → acciones reales / GUATOC)
   └─ LevelUpCelebration.jsx    (fiesta + sonido + TTS)

fincaGameStateService.js   ← NUEVO: persiste lo mínimo (último nivel visto +
                              misiones de "aprender" marcadas), por finca.
```

- **No se tocó** `fincaEvolutionService` ni `MiFincaEvolucionScreen`: el modo
  serio sigue intacto. El juego es una vista nueva (`case 'juego'` en `App.jsx`).
- Entrada: una tarjeta colorida "Mi Finca Viva" en **Hoy en finca**, debajo de
  la tarjeta de evolución.
- **Puente de datos**: el almacenamiento real guarda los procesos anidados en
  `attributes` y los eventos en otro store; `fincaGameService` los aplana al
  shape plano que el motor espera (`flattenProcess`/`flattenEvent`) y la
  pantalla hidrata los eventos (`getFarmEvents`) — sin modificar el motor.

## 5. Pruebas

- `src/services/__tests__/fincaGameService.test.js` — mundos, estado vacío,
  desbloqueo de criaturas/insignias, misiones (acción y aprender), normalización
  del shape real anidado, `detectLevelUp`, narración. (28 tests)
- `src/services/__tests__/fincaGameStateService.test.js` — persistencia,
  idempotencia, independencia por finca, JSON corrupto. (7 tests)
- `src/components/juego/__tests__/MiFincaVivaScreen.test.jsx` — montaje, estado
  vacío vs próspero, celebración de subida de nivel, marcar misión, audio,
  navegación a acciones reales. (14 tests)

Verificación visual con Playwright (chromium del nix-store, datos sembrados en
IndexedDB): ver `scripts/juego-julieta-shots.mjs`. Screenshots de los 3 estados
(finca vacía, finca próspera, celebración) en `/tmp/juego-julieta-*.png`.

## 6. Cómo jugar

1. **Hoy en finca** → tarjeta **"Mi Finca Viva"** (o ruta `'juego'`).
2. Si la finca está vacía: tocá **"Sembrar mi primera planta"**.
3. A medida que registrás trabajo real (sembrar, cosechar, biopreparados,
   observaciones), el mundo crece, llegan criaturas y se cumplen misiones.
4. Tocá el botón de **audio** para que la finca te cuente cómo va.
5. Cuando subís de nivel: **¡fiesta!** 🎉
