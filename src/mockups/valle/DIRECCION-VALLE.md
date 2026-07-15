# DIRECCIÓN-VALLE — el valle mirado con ojo de director

> Rama `fable/direccion-valle` · base `dev` · 2026-07-14
>
> El valle 3D es LA CASA de Chagra: lo primero que ve el campesino y desde
> donde sale a todo. Tenía piezas buenas **sueltas** (cámara de director,
> aplane New Donk, ciclo diurno, criaturas, tiering); esta pasada las compone.
> La ley nueva vive como datos en `src/visual/mundo3d/direccion/composicionValle.js`;
> las piezas r3f en `src/mockups/valle/composicionValle3D.jsx`.

## Lo que estaba mal (diagnóstico)

1. **El valle no tenía casa.** La mirada de reposo (`MIRA_VALLE`) aterrizaba
   en pasto vacío: el ojo no tenía dónde descansar y el conjunto se leía como
   un menú de landmarks, no como una finca.
2. **Nada conectaba los lugares.** Sin senderos ni suelo trabajado: los
   11 lugares estaban *puestos*, no *compuestos*.
3. **El frente inferior amontonado.** Corral, semillero, eras y hongos a
   <2 u entre sí a la izquierda; el frente derecho vacío; el mercado tapando
   el centro-bajo del encuadre.
4. **Solo el rótulo era tocable.** Tocar la milpa o el corral (la cosa
   grande y obvia) no hacía nada.
5. **Los velos Odyssey aprobados estaban huérfanos.** `VeloOdyssey` (la pieza
   que el operador aprobó) solo se usaba en su demo; el flujo real usaba el
   velo genérico viejo (`TransicionMundo`).
6. **Entrar y volver se sentían igual** (misma velocidad de cámara), y la
   entrada real (`EntradaValle3D`) ni siquiera encendía la cámara de director
   — el barrido establishing solo corría en la escena del framework.
7. **La jerarquía de personajes no estaba escrita.** Angelita era central de
   facto, pero no había ley (tamaños, bordes, luz) ni hueco para los
   secundarios de tierra (el oso).

## Decisiones (qué se hizo y por qué)

### 1. Cámara
- **`camaraDirector` encendida en `EntradaValle3D`** (antes solo en
  `EscenaValle`): la primera impresión es el barrido cine de `DirectorValle`
  (6 s, acelerable con el primer gesto, una vez por sesión), no un plano seco.
  Gateado por tier/reduced-motion adentro — gama baja conserva el encuadre fijo digno.
- **El regreso exhala** (`CamaraViajera`): entrar es decidido (lerp 0.07),
  volver es más lento (0.042) y abre a 18 u — llegar a casa se siente
  distinto a salir de ella.
- El trabajo previo de `CamaraDirectorDemo` ya estaba absorbido por
  `CamaraDirector`/`DirectorValle`; no se duplicó nada.

### 2. Fluidez
- **VOLVER al valle ahora usa `VeloOdyssey`** (velo `luz`: "De vuelta a
  casa…"), con el contrato correcto: cubre → swap en la meseta
  (`onCubierto` → `completarViaje`) → **revela** el valle ya montado. Antes el
  swap iba al final del velo viejo = corte seco a pantalla descubierta.
- ENTRAR conserva el mural New Donk aprobado (aplane + destello); si el flag
  se apaga, cae al velo Odyssey del destino (identidad andina), no al genérico.
- El velo clásico queda SOLO como respaldo de viajes que nadie armó
  (deep-link inicial).
- **Qué es tocable se ve sin leer**: cada lugar navegable tiene su **patio de
  tierra pisada** (afordancia diegética, 1 draw call instanciado) y los
  **senderos llegan hasta él**; además **la geometría misma es botón**
  (tocar la milpa = entrar a cultivos) con cursor pointer en desktop.

### 3. Disposición (criterio real, no estético)
- **La casa campesina como ancla** (`CasaCampesina`): encalada, zócalo
  pintado, teja a dos aguas, ventana con luz cálida. No navegable: es el
  punto de silencio del cuadro, apenas a la izquierda de la mira de reposo
  (tercios). De noche es el corazón del valle.
- **Tres franjas de uso** (documentadas en `composicionValle.js`):
  lo **diario** rodea la casa al frente (corral, eras, semillero, huerta);
  lo **semanal** a media ladera (milpa, cafetal, agua); lo **contemplativo**
  al fondo (monte, veleta del páramo).
- **Movimientos** (`COMPOSICION_LUGARES`, override sin tocar `valleData`):
  mercado → borde derecho-frontal (la *salida* a la plaza, con su sendero que
  sale del cuadro); huerta → pegada a la casa (su propia narración lo decía);
  corral/semillero/eras/hongos → aire mínimo ~2 u; milpa cede un paso.
  `agua`, `cafe`, `disenio` y `clima` ya estaban bien contados: no se tocaron.
- **Senderos** (`SENDEROS_VALLE`): el circuito del trajín (casa→eras→
  semillero→corral), el camino de la plaza (casa→huerta→mercado→fuera del
  cuadro), la subida del lote y el viaje del balde. El camino dice qué se usa.

### 4. Jerarquía de personajes ⭐
- **La ley en números** (`JERARQUIA_PERSONAJES`): Angelita es la única
  protagonista — 44-58 px, primer plano, follow de cámara, y ahora **la única
  con luz propia** (pointLight cálida que la sigue, solo donde el perfil ya
  paga luces). Los secundarios: techo duro 30 px (~0.55×), bordes del valle,
  a ras de tierra, jamás capturan toques.
- **El hueco del oso, listo** (`SECUNDARIOS_TIERRA` + `SecundariosDeTierra`):
  registro-driven contra `CREATURES` — el oso andino de dev ya asoma en el
  borde del monte (junto al bosque) y el borugo en el matorral izquierdo;
  cuando `fable/oso-andino-completo` mergee, el dibujo mejora solo, sin tocar
  este mapa. Un slug ausente no monta nada.
- Registros respetados (GUIA-RUBBERHOSE, rama d4): los secundarios son
  personajes rubber-hose como billboards (igual que Angelita y las criaturas);
  la casa y los senderos son REALISTAS (geometría de mundo, sin tinta).

## Lo que NO pude arreglar (fuera de scope) — con el fix exacto

1. **Gemelo 2D y fallback divergen del mapa 3D.**
   `GemeloValle2D.jsx` (visual/mundo3d — rama activa) y `Valle2DFallback.jsx`
   leen `MUNDOS_VALLE` crudo → el mapa 2D no coincide con la composición.
   *Fix exacto*: en cada consumidor,
   `import { componerMundos } from '.../direccion/composicionValle.js'` y
   envolver: `componerMundos(MUNDOS_VALLE)`. En `GemeloValle2D` basta pasar
   `mundos={componerMundos(MUNDOS_VALLE)}` desde su host (acepta la prop).
2. **`EscenaValle` (framework) sigue con el velo del host que la monte.**
   El cableo de `VeloOdyssey` se hizo en `EntradaValle3D`; el host de
   `EscenaValle` (app-3d) debe montar el mismo patrón: estado local
   `{fase, destino}`, `onCubierto` → swap, `onFin` → desmontar.
3. **`micorrizas` no tiene ruta 2D** (`wire3DNav.js: micorrizas: null`,
   rama de wiring). *Fix*: mapear a `'subsuelo'` (el mundo subterráneo ya
   existe como vista) hasta que tenga pantalla propia.
4. **El mundo `clima` no puede entrarse** (`puedeEntrar` false → panel
   "pronto") aunque su escena YA existe como cielo táctil de `EscenaValle`.
   *Fix*: registrarlo en el registro de mundos como escena ambiental
   (`escena: 'valle'` + los toques de cielo), o mapear su CTA a
   `clima_boletin` como hace la montaña.
5. **El chip del compañero usa `AbejaAngelita` cruda**, no la Angelita v2 del
   agente (`src/visual/agente`, 9 estados, mirada que sigue). *Fix*: en
   `EntradaValle3D`, reemplazar el bloque `.valle-companero__cara` por
   `<Angelita estado={...} />` mapeando `gesto` → estado
   (`celebra`→`celebrando`, `reposo`→`descansando`, hablar→`hablando`).
   No lo hice porque `agente/` acaba de aterrizar y el mapeo de estados
   merece revisión del operador (es la cara de la IA).
6. **Los beats del director no corren en la entrada real**: `EntradaValle3D`
   no monta `FaunaAmbiental` ni pasa `beatsRef` (solo `EscenaValle` lo hace).
   *Fix*: copiar el patrón de `EscenaValle` (puntos + MutationObserver de
   `data-fase='gesto'` → `beatsRef`) o extraerlo a un hook
   `useBeatsDeFauna(raizRef)` compartido.
7. **`AcompananteMundo` y las posiciones de `valleData.LUGARES`** quedan como
   fuente cruda: si un frente agrega un lugar nuevo, decidir su sitio en
   `COMPOSICION_LUGARES` (o dejarlo sin override si nace bien puesto).
