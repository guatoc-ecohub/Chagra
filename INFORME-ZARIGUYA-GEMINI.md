# Informe — zarigüeya agente: lámina-viva Gemini (2026-08-24)

Rama `feat/zariguya-gemini-integra` (sobre dev). Alcance de ESTA entrega: SOLO
la superficie 2D del AGENTE. El operador juzga con las capturas crudas de
`ops/informes/capturas/zariguya-gemini-2026-08-24/` — este informe NO
certifica nada.

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
- **Las crías al lomo** — la firma de identidad de la zarigüeya
  (`ZARIGUYA_FIRMA`) — NO están en la hero del set; `zariguya-crias.png`
  existe aprobada para integrarlas (¿badge/pose aparte?). Decisión de
  dirección pendiente del operador.
- Poses faltantes del contrato: saludar/señalar, hablando boca abierta,
  perfil idle, dormida (autorizado generar por Pixel).
