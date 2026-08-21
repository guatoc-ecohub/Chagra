# SSOT — Comportamientos por bicho compai

> Fuente única de verdad: qué comportamiento tiene o no tiene cada compai (bicho
> compañero/agente de Chagra), verificado celda por celda contra el código real en
> `origin/dev` (auditoría hecha en un worktree limpio parado en `origin/dev`, commit
> `529f7a2eb`). Cero adivinar: toda celda trae la ruta del archivo — y símbolo/línea
> cuando aplica — que la prueba. Si algo no se pudo verificar contra código, queda
> marcado como tal, nunca como ✅ ni ❌ por comodidad.
>
> El roster auditado es el de 7 compai seleccionables como agente en la PWA
> (`src/hooks/useAgentAvatarType.js` → `AVATAR_TYPES`): **angelita, jaguar,
> oso-bastón, zarigüeya, luciérnaga, chivito(-punk), guacamaya**. "Oso andino" no es
> uno de los 7 — ver la nota de la fila Oso.

## Leyenda

- ✅ **tiene** — verificado en código, funciona como se describe.
- ❌ **no tiene** — verificado que NO existe (se buscó explícitamente y no apareció).
- 🔶 **parcial** — existe pero incompleto, inerte, o wireado a otra cosa (ver nota).
- N/D **no disponible en este repo** — el código relevante vive fuera de `chagra`
  (el "sistema del valle") y no se pudo auditar desde este worktree.

Columnas: **(1)** idle vivo · **(2)** hablar/lip-sync · **(3)** entrada épica ·
**(4)** salida épica · **(5)** aparece/desaparece místico · **(6)** transición
2D→3D · **(7)** gestos (señala/celebra) · **(8)** estados de agente (los 10 de
angelita) · **(9)** gafas · **(10)** reacción al clima · **(11)** lámina viva 3D
realista · **(12)** presencia como agente en la PWA.

## Hallazgo que condiciona toda la auditoría: el "sistema del valle" no vive en este repo

Las rutas que se pidió auditar `public/valle/compai/rigs/*.{rig.svg,css}` y
`public/valle/juegos/bestiario/criaturas/*.js` **no existen en `origin/dev`**.
`.gitignore` línea 98 lo documenta: `/public/valle/` es un árbol **generado** por
`scripts/sync-valle.mjs` en el prebuild, sincronizado desde un checkout local externo
del valle (`~/demos/3d` o `$VALLE_SRC_DIR`) — no es fuente de este repo, se
resincroniza en cada build y comitearlo lo dejaría stale. `docs/compai/` existe en
`dev` pero está **vacía**: ni `BRIEF-guacamaya-behaviors-2026-08-21.md` ni la demo
`demos/guacamaya-repertorio/` llegaron a `dev`. Todo lo referido al sistema del valle
queda marcado **N/D** en la tabla — no ❌ — porque no se pudo verificar, no porque se
haya comprobado que falta. Para auditar esa capa hay que hacerlo directo contra
`~/demos/3d/compai/` o corriendo `scripts/sync-valle.mjs`.

(Nota aparte para el operador, fuera del alcance de esta tabla: en un checkout previo
de `chagra/` — rama `feat/jaguar-front-paws-clean` — existía un `public/valle/`
poblado con contenido real de rigs/bestiario/elenco, como archivos **sin trackear**.
Es exactamente el árbol gitignored de arriba, sincronizado ahí por una sesión
anterior — no es código "perdido": es el resultado normal de `sync-valle.mjs`, vive
en `~/demos/3d`, no en `chagra`.)

## Tabla

| Bicho | (1) Idle vivo | (2) Hablar/lip-sync | (3) Entrada épica | (4) Salida épica | (5) Místico | (6) Transición 2D→3D | (7) Gestos | (8) Estados agente (10) | (9) Gafas | (10) Clima | (11) Lámina viva 3D | (12) Presencia PWA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Angelita** (abeja) | ✅ `angelitaEstados.js` MOMENTOS_IDLE + idle-cerebro en `Angelita.jsx` | ✅ `visema`→`BocaVisema`, `useLipSync.js` | ✅ `AngelitaEntrada.jsx`, wireada en `src/mockups/AngelitaViva.jsx` (ruta real `App.jsx`) | ❌ `AngelitaSalida.jsx` no existe en dev | ❌ `RevelacionMistica.jsx` no existe en dev | ✅ nativa — `useEntradaAbeja`, `AbejaTransicion.jsx` default | ✅ `POSE_DE_ESTADO` senala/celebra, `creatures.css` rh-senala/rh-celebra | ✅ **10/10 completo** — es el vocabulario de referencia | ✅ `AngelitaGafas.jsx` (GafasSol+CejasRubber) | ✅ piel (`cuerpoDeClima`+`PERFIL_ABEJA`) — vestuario existe en `AbejaAngelita.jsx` pero el agente no lo activa | ❌ no existe lámina 2D-realista para angelita | ✅ avatar por defecto, `ChagraAgentAvatarAngelita.jsx` |
| **Jaguar** | ✅ `vidaEstados.js` L91-98 (acecha/ruge/reposo), `JaguarLaminaViva.jsx` | ✅ visema→mandíbula real, `jaguarLamina.css` L158-165 | 🔶 no hay `JaguarEntrada.jsx`; coreografía inline en `JaguarCompaiEscena.jsx` L104-155 | 🔶 vía señal genérica (`senalSalidaAbeja.js`), `JaguarCompaiEscena.jsx` L131-143 | ✅ auto-contenido: props `revelacion`/`aparicion`, `creatures.css` L1433-1528 | 🔶 escena 3D propia, pero portal 2D usa Angelita — `compaiRegistry.js` L110 `PortalComponent:null` | ✅ `Jaguar.jsx` pose anda/celebra/reposo/señala/camina, `rh-g-*` en `creatures.css` | ✅ 4 angostos con diferencia visual real — `jaguarLamina.css` L158-238 | ❌ sin accesorio; anteojos son marca facial de especie, no opt-in | ✅ piel (`PERFIL_JAGUAR`) + ropa (`ROPA_PERFIL_POR_BICHO['jaguar']`), suprime sudor a propósito | ✅ `jaguarLamina/` (PNG horneado, 2D realista) — es el avatar PWA real | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarJaguar.jsx`→`JaguarLaminaViva` |
| **Oso** (oso-bastón — el seleccionable; ver nota) | ✅ `vidaEstados.js` L51-58 (florece/resopla/reposo) | ✅ visema→`BocaVisema`, `OsoBaston.jsx` L236-237 | 🔶 sin `OsoBastonEntrada.jsx`; inline en `OsoBastonCompaiEscena.jsx` L109-158 | 🔶 señal genérica, `OsoBastonCompaiEscena.jsx` L135-147 | ❌ sin props `revelacion`/`aparicion` en `OsoBaston.jsx` (grep vacío) | 🔶 escena 3D propia, portal 2D cae a Angelita — `compaiRegistry.js` L115 | ✅ pose anda/camina/celebra/reposo/señala, alza el bastón en celebra | ✅ 4 angostos reales — `ChagraAgentAvatarOsoBaston.jsx` L26-39 (3 poses + vaho) | ❌ sin accesorio; "anteojos" es marca facial horneada, no opt-in | 🔶 piel sí (`PERFIL_OSO_BASTON`); **vestuario NO** — sin entrada en `ROPA_PERFIL_POR_BICHO` | 🔶 `osoLamina/` existe y está registrada (`index.js` L295) pero el adaptador PWA usa el vector `OsoBaston.jsx`, no la lámina | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarOsoBaston.jsx`→`OsoBaston.jsx` |
| **Zarigüeya** | ✅ `.rh-boil` + `Zariguya.jsx` L212, gestos husmea/tanatosis `creatures.css` L2947-3031 | ✅ `BocaVisema`, `useLipSync` real en `ZariguyaCompaiEscena.jsx` L308 | ✅ bespoke, fase oculta→trote `ZariguyaCompaiEscena.jsx` L100-145 | ✅ "sale corriendo" `ZariguyaCompaiEscena.jsx` L123-132 | ❌ `RevelacionMistica.jsx` no existe | ✅ **completa** — `compaiRegistry.js`: `EscenaComponent` Y `PortalComponent` propios (única, junto a angelita) | ✅ parcial real — `data-pose` celebra/reposo funciona; `señala` está en el prop pero el adaptador de agente nunca lo dispara | ✅ 3 poses + husmea + visema, `ChagraAgentAvatarZariguya.jsx` L29-43 | ❌ sin accesorio equivalente | 🔶 piel sí (`PERFIL_ZARIGUYA`, cuida no tapar las crías al lomo); vestuario NO (sin entrada en `ROPA_PERFIL_POR_BICHO`) | 🔶 `zariguyaLamina/` es 2D (PNG+pivotes, no 3D) y está wireada al selector de AVATAR DEL USUARIO (`AvatarSelector.jsx`), no al agente | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarZariguya.jsx` |
| **Luciérnaga** | ✅ `.rh-boil`, mismo patrón que zarigüeya | ✅ `BocaVisema` + `useLipSync` real, `LuciernagaCompaiEscena.jsx` L338 | ✅ bespoke, fase oculta→enciende con tri-parpadeo, L145-155/196-204 | ✅ "se apaga derivando hacia arriba", L130-141 | ❌ `RevelacionMistica.jsx` no existe | ✅ **completa** — `EscenaComponent` Y `PortalComponent` propios | ✅ gesto firma linterna (leer/sano/pacto/degradado), `creatures.css` L3265-3338 | ✅ 4 estados diferenciados, `ChagraAgentAvatarLuciernaga.jsx` L25-38 | ❌ sin accesorio equivalente | 🔶 piel sí (`PERFIL_LUCIERNAGA`); vestuario NO | 🔶 `luciernagaLamina/` es 2D, wireada al selector de avatar del USUARIO, no al agente | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarLuciernaga.jsx` |
| **Guacamaya** | ✅ ambiente (bob/respiración/parpadeo) real vía `GuacamayaCompai.jsx` L37-43, NO depende de `:host` | ❌ visualmente inerte — regla existe pero `:host([data-estado="hablar"])` no aplica en light DOM (`arte-valle/guacamaya.css` L177) | ❌ `compaiRegistry.js`: `EscenaComponent:null`, `pendienteFable:true` | ❌ sin `EscenaComponent`, sin lógica de salida | ❌ `RevelacionMistica.jsx` no existe | ❌ sin escena 3D propia; cae 100% a Angelita en el mundo | 🔶 CSS define señalar/sana/dispersar/amenaza/pacto (L156-304) pero TODO `:host(...)`-gated → muerto en light DOM | 🔶 el adaptador escribe `data-estado`/`data-visema` pero CERO diferencia visual hoy (mismo problema de `:host`) | ❌ sin accesorio equivalente | ❌ sin `cuerpoDeClima`, sin prop `clima`, sin entrada en `ROPA_PERFIL_POR_BICHO` | ❌ no existe `guacamayaLamina/` en absoluto | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarGuacamaya.jsx`→`GuacamayaCompai.jsx` |
| **Chivito** (chivito-punk) | ✅ mismo patrón ambiente que guacamaya, `ChivitoPunk.jsx` + `arte-valle/chivito.css` | ❌ mismo problema `:host` — `#picoBajo` gated por `:host([data-estado="hablar"])` (`arte-valle/chivito.css` L146), inerte | ❌ `compaiRegistry.js`: `EscenaComponent:null`, `pendienteFable:true` | ❌ sin `EscenaComponent`, sin lógica de salida | ❌ `RevelacionMistica.jsx` no existe | ❌ sin escena 3D propia; cae 100% a Angelita | 🔶 CSS define señalar/libar/tejer/cresta-punk-al-hablar (L137-233), todo `:host(...)`-gated → muerto | 🔶 mismo caso que guacamaya: el adaptador mapea pero sin efecto visual | ❌ sin accesorio equivalente | ❌ sin `cuerpoDeClima`, sin entrada en `ROPA_PERFIL_POR_BICHO` | 🔶 `chivitoLamina/` SÍ existe (misma técnica PNG+pivotes) pero wireada al selector de avatar del USUARIO, no al agente (el agente usa `ChivitoPunk.jsx`, el rig arte-valle) | ✅ `AVATAR_TYPES`, `ChagraAgentAvatarChivitoPunk.jsx`→`ChivitoPunk.jsx` |

## Notas por celda parcial / hallazgos importantes

### El hallazgo más grave: CSS "muerto" en guacamaya y chivito-punk

Ambos reusan el rig del valle (`src/visual/creatures/arte-valle/{guacamaya,chivito}.css`),
escrito originalmente para correr en **Shadow DOM** (selectores `:host([data-estado="…"])`
— 47 de 47 reglas de estado en guacamaya son `:host`-scoped, sin excepción). El
componente que los consume hoy (`GuacamayaCompai.jsx`, `ChivitoPunk.jsx`) inyecta ese
CSS con `<style>{css}</style>` en **light DOM**, no en un `shadowRoot`. El propio
código lo documenta con honestidad (`GuacamayaCompai.jsx` líneas 37, 42, 66): las
animaciones que NO dependen de `:host` (idle base, balanceo de cola) sí corren; todo
lo que sí depende de `:host` — hablar, señalar, sana, pacto, amenaza, dispersar —
está "sembrado para cuando el rig corra en Shadow DOM" pero **hoy no tiene efecto
visual**. Los tests existentes (`__tests__/GuacamayaCompai.test.jsx`,
`__tests__/ChivitoPunk.test.jsx`) solo comprueban que el atributo `data-estado` se
escribe, nunca que produzca un cambio visible — por eso el gap no lo agarra CI.
Consecuencia: en la práctica, hoy guacamaya y chivito(-punk) como agente conversacional
se ven **idénticos en cualquier estado** (idle, pensando, hablando, escuchando):
solo respiran/parpadean, nunca actúan el estado.

### "Lámina viva 3D realista" no es 3D en ningún caso encontrado

Para jaguar, oso-bastón, zarigüeya, luciérnaga y chivito-punk existe una carpeta
`xxxLamina/` (`anatomia.js` + `capas.js` + css) que recorta una foto real (PNG) por
capas con piezas rígidas que rotan desde un pivote — cero three.js, cero geometría 3D.
Es una técnica de "parallax de foto", no un modelo 3D. Además, **solo el jaguar usa
su lámina como cuerpo del agente conversacional** (`JaguarLaminaViva.jsx`, wireada en
`ChagraAgentAvatarJaguar.jsx`). Las láminas de oso-bastón, zarigüeya y chivito-punk
existen, están terminadas y registradas en `src/visual/creatures/index.js`, pero están
wireadas al selector "Elija su animal" (`AvatarSelector.jsx` — el avatar de **perfil
del usuario**, una feature distinta), no al agente: el agente conversacional de esos
tres sigue usando el dibujo vectorial rubber-hose. Guacamaya no tiene ninguna carpeta
`guacamayaLamina/`: no existe en ninguna forma.

### "Entrada épica" / "salida épica" — ningún bicho tiene el par completo tipo Angelita

Ni siquiera Angelita tiene el par completo: `AngelitaEntrada.jsx` existe y está
wireada (aunque solo a la vitrina `/mockups/angelita-viva`, no al arranque real de la
app); `AngelitaSalida.jsx` **no existe en `dev`** — no hay ningún componente "espejo"
para ella ni para nadie. Jaguar, oso-bastón, zarigüeya y luciérnaga sí tienen
coreografías bespoke de llegada/salida (inline en sus `XxxCompaiEscena.jsx`, el nivel
de la escena 3D), pero son piezas de código distintas entre sí, no una reutilización
de un componente genérico. Guacamaya y chivito-punk no tienen ninguna de las dos.

### Transición 2D→3D — tres niveles reales, no dos

1. **Completa** (escena 3D propia + portal 2D propio): angelita (nativa), zarigüeya.
2. **Parcial** (escena 3D propia, pero el cruce visual 2D→3D sigue mostrando el cuerpo
   de Angelita): jaguar, oso-bastón, luciérnaga — documentado en el propio
   `compaiRegistry.js` (`PortalComponent: null`, comentario "sigue pendiente").
3. **Ninguna** (cae 100% a la coreografía y cuerpo de Angelita en el mundo 3D):
   guacamaya, chivito-punk (`EscenaComponent: null`, `pendienteFable: true`).

### Reacción al clima — dos capas independientes, casi nadie tiene las dos

`cuerpoDeClima` (tinte de piel + velocidad de alas/aleteo, perfil en `PERFILES` de
`creatureClimaCuerpo.js`) y `ropaDeClimaBicho` (ruana/sombrero/sudor, perfil en
`ROPA_PERFIL_POR_BICHO`) son mecanismos separados. Angelita y jaguar son los únicos
con evidencia de ambas capas (jaguar suprime sudor a propósito, por piso térmico
cálido). Oso-guardián (el oso NO seleccionable como agente, ver más abajo) tiene las
dos capas completas, incluida una `RuanaGuardian.jsx` propia. Oso-bastón, zarigüeya y
luciérnaga solo tienen la capa de piel; guacamaya y chivito-punk no tienen ninguna.

### Nota sobre "Oso": tres/cuatro osos distintos, una sola fila posible

- **oso-bastón** (`OsoBaston.jsx`) — el ÚNICO seleccionable como agente
  (`AVATAR_TYPES`), etiquetado "Oso de anteojos" en el selector. Es la fila usada
  arriba porque es el comparable real con los otros 6 bichos.
- **oso-guardián** (`OsoGuardian.jsx`) — la dirección "vigente" en el registro
  ambiental `CREATURES` (`src/visual/creatures/index.js`), pero **no** es
  seleccionable como agente conversacional. Tiene el sistema de clima más completo de
  todo el roster (ver arriba) y su propio `RuanaGuardian.jsx`.
- **oso-andino** / **oso-anteojos** (`OsoAndino.jsx`, `OsoAnteojos.jsx`) — archivados
  por decisión del operador ("feos"), fuera del registro `CREATURES`, código completo
  y funcional en disco pero no se surfacea en ningún selector.
- El propio `src/compai/nucleo/elenco.js` documenta la decisión: *"'oso' (Oso andino
  genérico) NUNCA tuvo cuerpo propio en la PWA — sigue sin uno a propósito (decisión
  del operador 2026-08-14: 'NO crees un oso nuevo')"*. "Oso andino" tal cual, como
  nombre de agente, no existe ni debe crearse.

## Fuera de alcance de esta tabla (existen, no son de los 7)

- **Maíz** (`MaizCompai.jsx`) — tuvo cuerpo de agente hasta el 2026-08-14; el
  operador lo retiró del roster (migra solo a Angelita, ver `SLUGS_JUBILADOS` en
  `elenco.js`). El componente sigue en el repo pero ya no es una opción elegible.
- **Gallina** (`Gallina.jsx`) — existe en el registro `CREATURES` ambiental
  (`src/visual/creatures/index.js`) pero nunca estuvo en el roster de agente-PWA.
- Ambos quedaron fuera de la auditoría columna por columna porque no son agentes
  seleccionables hoy — si se quiere la misma tabla para ellos, es trabajo aparte.

## Documentos relacionados (no duplicados aquí)

- `docs/AUDITORIA-ANGELITA.md` — auditoría de diseño de personaje (Miss Minutes) y UX
  de Angelita, de otra naturaleza (crítica de diseño, no matriz de comportamientos).
  No se duplicó contenido; esta tabla es el complemento "qué existe", no "qué tan bien
  está hecho lo que existe".

## Cómo se verificó

Worktree dedicado (`git worktree add … origin/dev`, sin mezclar con ramas WIP),
lectura directa de cada archivo citado (no de comentarios de terceros sin
confirmar — dos afirmaciones iniciales resultaron ser código sin commitear en otro
checkout y se descartaron: `src/visual/creatures/behaviors/compaiBehaviors.js` y
`src/visual/creatures/RevelacionMistica.jsx` no existen en `dev`). Los hallazgos más
señalados (CSS `:host` inerte, `PortalComponent:null`, ausencia de
`AngelitaSalida.jsx`) se verificaron con `grep`/`find` directo antes de publicarse
en esta tabla, no solo por reporte de subagente.
