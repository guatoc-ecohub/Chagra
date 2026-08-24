# Informe — zarigüeya agente: lámina-viva Gemini (2026-08-24)

Rama `feat/zariguya-gemini-integra` (sobre dev). Alcance de ESTA entrega: SOLO
la superficie 2D del AGENTE. El operador juzga con las capturas crudas de
`ops/informes/capturas/zariguya-gemini-2026-08-24/` — este informe NO
certifica nada.

## Follow-up de comportamiento: fixes 3a, 5, 2 y 1

Esta pasada no redibuja arte y no toca el roam global, `CompaiOverlay` ni la
política del FAB fijo.

- **Fix 3a, lip-sync real:** se reutilizó el contrato de
  `ChagraAgentAvatarAngelita.jsx`. `ChagraAgentAvatarZariguya` ahora recibe y
  reenvía `visema`, `estado`, `animated`, `tier` y `direccion`. El visema del
  host gana; `VISEMA_DE_STATE[state]` solo queda como fallback cuando el prop
  es nulo. `ZariguyaGeminiLaminaViva` sigue siendo quien convierte visema a
  mandíbula.
- **Fix 5, idle con sentido:** en la entrada `zariguya` de
  `vidaEstados.js` quedan `husmea` como dominante y `tanatosis` como gag raro.
  Se retiraron `reposo` y `crias` del selector natural, por lo que no se
  activa el swap de cuerpo `reposo` a `cute` ni aparece `crias` por azar.
  `vidaForzada="crias"` continúa disponible para el host.
- **Fix 2, fondo oscuro:** se conservó el `filter` del FAB y se le añadió un
  doble `drop-shadow`: rim claro por tema más sombra de tinta. El token
  `--chagra-fab-rim` vive en `agent-fab-skin.css`.
- **Fix 1, una sola presencia:** se retiró el avatar estático de
  `AgentHero` y `FincaVivaHero`; `AgentFab` ya incluye `dashboard` y solo se
  excluye en carga, login, onboarding y mockup.

### Verificación cruda de esta pasada

- Tests tocados: **5 archivos, 68 tests, 0 fallos**.
- Build: **`✓ built in 12.48s`**.
- Lint acotado a los seis archivos JS tocados con `--max-warnings=0`:
  **exit 0, sin salida de reglas**. El lint completo del repositorio agotó
  memoria primero con 4 GB y luego con 8 GB, sin llegar a reportar reglas.
- `vidaEstados.test.js` completo conserva un rojo preexistente de roster:
  espera claves antiguas frente a las 13 claves actuales de `CREATURES`; el
  diff de este follow-up no cambia claves del repertorio.
- Captura Chromium headless GPU: **no generada en este entorno**. Salida
  cruda del intento Playwright: `libglib-2.0.so.0: cannot open shared object
  file`; con Chromium Nix y Playwright: `SIGTRAP`; headed: `no X server`.
  No se usan capturas anteriores como evidencia de esta pasada y no se
  certifica el render visual.

## Qué se hizo

1. **Assets servibles** (`public/compai/laminas/zariguya-gemini-*.png`, 9
   archivos, ~883 KB): derivados del set aprobado
   (`SET-APROBADO-OPERADOR.md`, pool `pixel-cosecha/` — NO committeado, queda
   como cosecha en disco). Re-escalados a tamaño de avatar (≤800 px) y
   cuantizados a paleta (hero 259→80 KB, etc.).
2. **`src/visual/creatures/zariguyaGeminiLamina/`** (`anatomia.js`,
   `capas.js`, CSS, test): el método lámina-viva de la casa
   (jaguar→zariguya) aplicado a la HERO Gemini. Dato clave verificado: la
   hero del set es EL MISMO ENCUADRE 481×444 que `zariguya.png` (diff 0.36%
   de píxeles, concentrado en las manos) → la anatomía medida y aprobada de
   `zariguyaLamina/` se hereda VERBATIM, no se re-inventa. La diferencia
   real: la hero Gemini ya trae PATAS NATURALISTAS en los píxeles, así que la
   cirugía runtime `pielDePatas` (que oscurecía guantes) NO se porta —
   aplicarla habría embarrado las patas nuevas.
3. **`ZariguyaGeminiLaminaViva.jsx`** — dos planos que se componen:
   - *Lámina-rig*: hero horneada en 8 capas por alfa (cuerpo/cabeza/orejas/
     mandíbula/brazos/cola) + 2 párpados robados de la propia piel + los
     hooks de vida de la casa (`useVidaIdle`/`useRitmoPropio`/
     `useMiradaUsted`) + lip-sync de mandíbula.
   - *Poses plenas* (crossfade): `listening` → ciclo escucha 02→03→04→03
     (760 ms/paso; en avatar <120 px, el close-up 01); `thinking` →
     ver-lupa; idle+`tanatosis` → muerta (el gag firma); idle+`reposo` →
     cute de frente. Ninguna pose inventada: todas del set aprobado.
   - *Cola de RIG* (`rig/cola.png` del despiece): pieza completa montada en
     la grupa (colocación medida, `PARTE_COLA`) reemplaza a la cola horneada
     → se enrosca -4°..+7° sin abrir fondo (el corte rígido toleraba ±3°).
     La horneada queda de respaldo si el PNG de la pieza no carga.
4. **Cableado del agente**: `ChagraAgentAvatarZariguya.jsx` ahora renderiza
   `ZariguyaGeminiLaminaViva` (antes: el vector rubber-hose `Zariguya`, que
   dio asco en revisión). El vector NO se tocó (otros consumidores).
   Registrada como export en `visual/creatures/index.js`; el selector de
   avatar (`AgentAvatarSelector`) hereda la cara nueva por el adaptador sin
   cambios propios.
5. **Verificación**: vitest (13 tests nuevos; suite completa: 62 fallos
   PREEXISTENTES en dev, verificado con stash que 0 son de este cambio),
   eslint --max-warnings=0, `vite build` OK, y gate visual con chromium
   headless dsf=2 (vitrina reproducible: `_gate/zariguya-gemini/`,
   `npx vite --port 5199` + `node _gate/zariguya-gemini/shot-vitrina.mjs`).

## Evidencia cruda (mirar, no creer)

| Captura | Qué mirar |
|---|---|
| `vitrina-8-estados-2-fondos.png` | los 8 estados sobre fondo oscuro Y claro (halos) |
| `lupa-boca-ANTES-barra-granate.png` | DEFECTO encontrado: interior sintético como barra granate plana |
| `lupa-boca-DESPUES-tinta.png` | fix: paleta de tinta + rampa de opacidad con la apertura |
| `lupa-cola-rig-costura.png` | la base de la pieza de rig entrando tras el cuerpo |
| `escucha-frame-03.png` / `escucha-frame-04.png` | dos pasos reales del ciclo (probe DOM: 03→04→03→02… ✓) |
| `gag-tanatosis-muerta.png` | la muerta tendida al piso del stage, lengua afuera |
| `reposo-cute.png` | el reposo de frente |
| `escucha-closeup-80px.png` | listening en avatar chico: el close-up 01 |

## Autocrítica — defectos nombrados (no "listo")

1. **Interior de boca**: corregido de barra granate a tinta oscura con rampa
   (capturas antes/después), pero sigue siendo un rectángulo sintético con
   clip-path, no un dibujo de fauces del set. A 220 px lee como sombra de
   boca; con lupa se nota plano. Cura real: pedir al set una pose "hablando
   boca abierta" (ya listada como faltante en el contrato del operador).
2. **Cola de rig ≠ cola de la hero**: la C de la pieza es más redonda y
   gorda que la original de la lámina (compárese con la hero cruda). No hay
   costura visible en las capturas — la base peluda entra POR DETRÁS del
   cuerpo — pero la silueta de cola cambió. El muñón desvanecido del corte
   viejo queda debajo de la pieza (no se observó en captura; con la pieza a
   +7° podría asomar 1-2 px en la banda x≈336-368 — no verificado a esa
   amplitud exacta).
3. **Cambios de pose = crossfade de dibujos completos** (~240 ms): en el
   cruce hay doble exposición breve, y entre frames de escucha la figura
   "respira" de escala (bbox de contenido 426→455 px de ancho entre 02 y
   04). El anclaje al piso lo amortigua; no es interpolación de esqueleto y
   no se disfraza de tal.
4. **escucha-01 excluido del ciclo**: es un close-up (otro encuadre);
   metido en el ciclo era un corte de cámara. Se usa solo <120 px. Decisión
   discutible — el operador puede pedirlo como "punch-in" al entrar a
   listening.
5. **ver-lupa encaja por ancho** (lámina 800×588 en stage cuadrado): la
   figura queda ~14% más chica que la hero. Se nota al cruzar
   idle→thinking.
6. **Piezas de rig NO usadas** (decisión mirada, documentada en
   `anatomia.js`): `mano.png` trae GUANTES BLANCOS cartoon y la hero
   aprobada tiene patas naturalistas — mezclarlos cambia el personaje a
   mitad de gesto; `cabeza.png` mira al lado contrario con otra expresión;
   `pata-1..3` son para marcha (kart/valle, trabajo aparte).
7. **Primer listening puede demorar** unos ms el cambio de cuerpo si el PNG
   de la pose no terminó de bajar (gate de honestidad: nunca media pose; se
   queda la lámina-rig). Con precarga al montar, en la práctica no se vio.
8. **Cuantización a paleta** (quality 80-90) de los PNG servidos: a dsf=2 no
   se observó banding en las capturas, pero no se inspeccionó píxel a píxel
   contra los originales del pool.
9. **Parpadeo y mirada** verificados por probe DOM y por herencia del método
   aprobado, NO por captura (una foto estática no los muestra). El gate en
   vivo del operador manda.

## Superficies que FALTAN (trabajo aparte, mismo set)

- **`CREATURES.zariguya`** (fauna del valle / selector de criaturas) sigue
  apuntando a `ZariguyaLaminaViva` — la lámina VIEJA con guantes blancos.
  Migrarla al carril Gemini es un cambio de una línea + gate visual propio.
- **Selector/comparador**: heredan la cara nueva por el adaptador; falta
  gate visual en la app real (no solo la vitrina).
- **Chagra Kart** (piloto) y **valle 3D**: pendientes; ahí entran las
  `pata-1..3` y el walk-cycle ×7 del set.
- ~~**Las crías al lomo** — decisión de dirección pendiente del operador.~~
  RESUELTO 2026-08-24: pose especial, NO hero — ver el follow-up abajo.
- Poses faltantes del contrato: saludar/señalar, hablando boca abierta,
  perfil idle, dormida (autorizado generar por Pixel).

---

# Follow-up — crías al lomo como POSE ESPECIAL (2026-08-24, mismo día)

Decisión NUEVA del operador: las crías (la firma de identidad de la
zarigüeya) **NO van en la hero** — la hero queda la investigadora sola. Las
crías aparecen SOLO como pose especial / momento ocasional. Commit aditivo
en la misma rama.

## Qué se hizo

1. **Asset**: `SET-LIMPIO/zariguya-crias.png` (943×725 RGBA, madre + 5 crías,
   aprobada) → `public/compai/laminas/zariguya-gemini-crias.png`, re-escalada
   a 800×615 y cuantizada a paleta indexada como el resto del set (sharp
   `palette:true` q90: 1027→246 KB; q80 solo ahorraba 11 KB; delta medio vs
   resize sin paleta: 1.33/canal). Es el PNG más pesado del set — 6 animales
   de grabado denso, más entropía que cualquier otra lámina.
2. **Momento de vida `crias`** (`vidaEstados.js`, repertorio zariguya):
   `dur 5200 ms, peso 0.5` — MÁS raro que husmea (2.5) y reposo (1), del
   orden de la tanatosis (0.6). El mismo mecanismo del gag firma: idle-cerebro
   → momento ocasional → pose plena. En la lámina VIEJA y el vector el
   momento pasa en silencio (data-vida sin regla CSS = identidad serena
   ~5 s) — documentado en el comentario del repertorio; NO se tocaron esos
   archivos.
3. **Pose plena `crias`** (`anatomia.POSES` + `poseDeseada` en el JSX): entra
   SOLO en idle, por el momento natural o por `vidaForzada='crias'` — ese es
   el canal del momento POSITIVO: al celebrar, el host la fuerza (misma
   mecánica que la vitrina usa para tanatosis/reposo). Hero, idle base y las
   demás poses: sin cambios. Nota: el estado rico 'contenta' del FAB hoy se
   traduce a la baja a 'speaking' ANTES de llegar a este avatar
   (`STATE_DE_ESTADO_RICO`, ChagraAgentAvatar.jsx) — cablear contenta→crias
   de punta a punta exige la migración de vocabulario rico ya anotada allí
   para todo el elenco angosto; fuera del alcance de este commit.
4. **Micro-vida CSS** (`zgl-crias-carga`, 4.2 s): respira más hondo que la
   cute y se mece ±0.35° — la carga se nota. Cambio de pose = el crossfade de
   240 ms de la casa.
5. **Verificación**: vitest de los specs tocados (capas 14 tests, todos
   verdes, incluye uno nuevo del contrato data-vida/honestidad-de-pose;
   `vidaEstados.test.js` 9/10 — el rojo es PREEXISTENTE, verificado con
   stash: el registro CREATURES creció a 19 bichos y el test aún espera 8,
   nada que ver con este cambio), eslint --max-warnings=0, `vite build` OK,
   gate visual chromium headless (vite :5199 + shot-vitrina.mjs, ahora 9
   celdas × 2 fondos, viewport 2290).

## Evidencia cruda (mirar, no creer)

`ops/informes/capturas/zariguya-gemini-2026-08-24/`:

| Captura | Qué mirar |
|---|---|
| `vitrina-9-estados-2-fondos.png` | los 9 estados en oscuro Y claro — las 8 poses previas INTACTAS + crías |
| `pose-crias-fondo-oscuro-x4.png` / `-claro-x4.png` | la celda crías a dsf=4 en ambos fondos (halos) |
| `lupa-crias-cabeza.png` | borde de testa/hocico de la madre contra fondo oscuro |
| `lupa-crias-lomo.png` | las 5 crías: caras, manitas, bordes entre cuerpos |
| `lupa-crias-cola.png` | el rulo de cola de ESTA pose (≠ pieza de rig de la hero) |
| `lupa-crias-piso.png` | garras y línea de piso (anclaje 50% 100%) |

Probe DOM del gate: celda 7 = `estado:idle, modo:pose, pose:crias,
vida:crias`; las otras 8 celdas con su modo/pose de siempre (JSON en la
salida de shot-vitrina.mjs).

## Autocrítica — defectos nombrados (no "listo")

1. **Salto de escala idle→crias**: la lámina crias (800×615) contenida en el
   stage de la hero (aspecto 481:444) rinde 220×169 px — la MADRE queda
   ~19% más chica que en la hero (~165 vs ~203 px de figura). Es la misma
   clase de defecto que ver-lupa (~14%); en cuatro patas la figura es
   naturalmente más baja que erguida, pero el cruce SE NOTA como
   encogimiento, no solo como cambio de postura.
2. **Doble exposición en el crossfade** (~240 ms): heredada de todos los
   cambios de pose; con crias es MÁS visible porque el dibujo trae 6 caras
   — en el cruce hay un instante de "11 zarigüeyas". No capturada en foto
   fija; se ve en vivo.
3. **La cola de la pose ≠ la cola de rig de la hero**: otro rulo, otro
   grosor (compárese `lupa-crias-cola.png` con `lupa-cola-rig-costura.png`).
   Entre poses el espectador tolera el cambio (encuadre distinto), pero es
   una discontinuidad real de silueta.
4. **246 KB**: el PNG más pesado del set (3× la hero). Se precarga al montar
   junto a las otras 7 poses — en red lenta el primer momento crias puede
   quedarse en la lámina-rig (gate de honestidad, sin media pose), y son
   ~250 KB más de transferencia para un momento que pesa 0.5.
5. **Sin captura del momento NATURAL**: el gate fuerza `vidaForzada='crias'`;
   el disparo por idle-cerebro (peso 0.5, descanso 3-7.2 s) se verificó por
   herencia del mecanismo (tanatosis usa el mismo camino) y por el test del
   contrato, NO por observación de minutos de idle real. El gate en vivo del
   operador manda.
6. **'contenta' NO llega**: el momento positivo real del FAB (tap →
   'contenta') hoy muere en la traducción angosta (→'speaking'). Hasta la
   migración de vocabulario rico, las crías solo salen por idle-cerebro o
   por un host que pase `vidaForzada` — el "celebra con crías" de punta a
   punta queda PENDIENTE, no entregado.
7. **En la lámina vieja el momento es un hueco de conducta**: ~5 s de
   identidad quieta cuando el idle-cerebro sortea 'crias' en
   `CREATURES.zariguya` (fauna del valle, aún en la lámina de guantes). Peso
   0.5 = raro, y "quedarse quieta" es digno, pero es un no-op real hasta
   migrar esa superficie al carril Gemini.
8. **404 de favicon en la consola del gate**: `/favicon.ico` — la vitrina no
   declara favicon (preexistente, cosmético, no es asset de la lámina).
