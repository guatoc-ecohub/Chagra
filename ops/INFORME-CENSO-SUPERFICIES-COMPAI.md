# INFORME CENSO: Superficies de cada compai

Fecha: 2026-08-18
Carril: opencode (censo por grep/lectura, sin cambios de produccion)

---

## Controles de validacion del instrumento

### Control positivo: jaguar + lamina-viva en PWA

**Resultado: PASS**

`grep JaguarLaminaViva src/components/ChagraAgentAvatarJaguar.jsx` encuentra:
- Linea 1: `import JaguarLaminaViva from '../visual/creatures/JaguarLaminaViva';`
- Linea 43: `<JaguarLaminaViva ...`

`JaguarLaminaViva.jsx` (src/visual/creatures/) es la lamina real de Humboldt
(`jaguar-natural.png`) recortada en capas por alfa y montada sobre un rig con
vida (useVidaIdle, useRitmoPropio, useMiradaUsted). Clasificacion:
**lamina-viva**.

### Control negativo: angelita + vector en PWA

**Resultado: PASS**

`grep Angelita src/components/ChagraAgentAvatarAngelita.jsx` encuentra:
- Linea 1: `import Angelita from '../visual/agente/Angelita';`
- Linea 49: `<Angelita ...>`

`Angelita.jsx` (src/visual/agente/) renderiza `AbejaAngelita.jsx` (SVG
rubber-hose, kit `_rubberhose.jsx`, contorno que respira, ojos de goma). NO
usa imagen PNG recortada. Clasificacion: **vector**.

Los controles pasan. El censon es valido.

---

## Elenco canonico (7 + oso base jubilado)

Fuente: `src/compai/nucleo/elenco.js` lineas 34-80

| # | Slug           | Nombre           | enPWA |
|---|----------------|------------------|-------|
| 1 | angelita       | Angelita         | true  |
| 2 | jaguar         | Jaguar           | true  |
| 3 | oso-baston     | Oso del baston   | true  |
| 4 | zariguya       | Zarigueya        | true  |
| 5 | luciernaga     | Luciernaga       | true  |
| 6 | chivito-punk   | Chivito          | true  |
| 7 | guacamaya      | Guacamaya        | true  |

Nota: `oso` (Oso andino generico) es slug base jubilado (`enPWA: false`), no
selectable. `oso-baston` es el slug seleccionable (mismo animal, Tremarctos
ornatus). En el kart se registra como `oso` (sin `-baston`).

---

## Tabla de superficies

Clasificaciones:
- **lamina-viva**: imagen real recortada en capas por alfa, montada sobre rig
  con vida (parpadeo, respiracion, squash-stretch). Solo jaguar la tiene hoy.
- **vector**: SVG rubber-hose animado via CSS (contorno que respira, ojos de
  goma, miembros de manguera). Kit reutilizable `_rubberhose.jsx`.
- **rig-valle**: rig SVG multi-pose reusado del valle (F24), inlineado via
  `?raw` + namespace de ids. Mismo arte que el valle, no redibujado.
- **vector 3D**: coreografia3D propia (CompaiEscena) con cuerpo SVG/DOM
  montado via billboard `<Html>` de drei.
- **fallback-angelita**: cae al cuerpo y coreografia de Angelita (AbejaEscena)
  porque `EscenaComponent: null` en compaiRegistry.
- **3D-rig**: modelo procedural 3D construido en pilotos-compai.js (rubber-hose
  three.js: esferas, torus, mangueras bezier).
- **lamina-kart**: recorte RGBA de PNG real con capas + billboard, activo solo
  con `?piloto2d=1` en URL del kart. Sin ese parametro, 3D-rig.

| Compai        | PWA (React src/)                          | Valle 3D (public/valle/)                   | Kart 2.5D (public/valle/juegos/chagra-kart/) |
|---------------|-------------------------------------------|--------------------------------------------|-----------------------------------------------|
| **angelita**  | vector                                    | vector 3D (coreo propia, fallback nativo)  | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarAngelita.jsx:1           | compaiRegistry.js:82 (EscenaComponent=null,| pilotos-manejando.js (AbejaEscena)            |
|               | → Angelita.jsx:249                        | es el fallback)                            | piloto-lamina.js:139 (angelita.png, opt-in)   |
|               | → AbejaAngelita.jsx:31                    | CompaiEscena monta AbejaEscena directo     |                                               |
| **jaguar**    | **lamina-viva**                           | vector 3D (coreo propia)                   | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarJaguar.jsx:1             | compaiRegistry.js:110 (JaguarCompaiEscena) | pilotos-compai.js:construirChivito (line 406) |
|               | → JaguarLaminaViva.jsx:95                 | JaguarCompaiEscena.jsx:252                 | piloto-lamina.js:86 (jaguar-natural.png)      |
| **oso-baston**| vector                                    | vector 3D (coreo propia)                   | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarOsoBaston.jsx:1          | compaiRegistry.js:115 (OsoBastonCompaiEscena)| pilotos-compai.js:construirOso (line 98)     |
|               | → OsoBaston.jsx:16                        | OsoBastonCompaiEscena.jsx:265              | piloto-lamina.js:111 (oso.png)                |
| **zariguya**  | vector                                    | vector 3D (coreo propia)                   | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarZariguya.jsx:1           | compaiRegistry.js:96 (ZariguyaCompaiEscena)| pilotos-compai.js:construirZariguya (line 188)|
|               | → Zariguya.jsx:50                         | ZariguyaCompaiEscena.jsx:241               | piloto-lamina.js:122 (zariguya.png)           |
| **luciernaga**| vector                                    | vector 3D (coreo propia)                   | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarLuciernaga.jsx:1         | compaiRegistry.js:120 (LuciernagaCompaiEscena)| pilotos-compai.js:construirLuciernaga (line 295)|
|               | → Luciernaga.jsx:46                       | LuciernagaCompaiEscena.jsx:265             | piloto-lamina.js:140 (luciernaga.png)         |
| **chivito-punk**| rig-valle                               | fallback-angelita                          | 3D-rig + lamina-kart                          |
|               | ChagraAgentAvatarChivitoPunk.jsx:1        | compaiRegistry.js:129 (EscenaComponent=null| pilotos-compai.js:construirChivito (line 406) |
|               | → ChivitoPunk.jsx:49 (rig F24 reusado)   | pendienteFable:true, cae a Angelita)       | piloto-lamina.js:151 (chivito-punk.png)       |
| **guacamaya** | rig-valle                                 | fallback-angelita                          | NO PRESENTE                                   |
|               | ChagraAgentAvatarGuacamaya.jsx:1          | compaiRegistry.js:128 (EscenaComponent=null| No esta en PILOTOS (pilotos.js) ni en         |
|               | → GuacamayaCompai.jsx:81 (rig F24 reusado)| pendienteFable:true, cae a Angelita)       | pilotos-compai.js. Sin piloto 3D ni lamina.   |

---

## Superficies detalladas

### PWA (React, src/)

Todos los 7 compai se renderizan via `ChagraAgentAvatar.jsx` (linea 75), el
dispatcher que resuelve el avatarType del usuario y delega al componente
adecuado:

- **angelita** → `ChagraAgentAvatarAngelita.jsx` → `Angelita.jsx` →
  `AbejaAngelita.jsx` (SVG rubber-hose vector)
- **jaguar** → `ChagraAgentAvatarJaguar.jsx` → `JaguarLaminaViva.jsx`
  (lamina-viva: PNG real + rig + vida)
- **oso-baston** → `ChagraAgentAvatarOsoBaston.jsx` → `OsoBaston.jsx`
  (SVG rubber-hose vector)
- **zariguya** → `ChagraAgentAvatarZariguya.jsx` → `Zariguya.jsx`
  (SVG rubber-hose vector)
- **luciernaga** → `ChagraAgentAvatarLuciernaga.jsx` → `Luciernaga.jsx`
  (SVG rubber-hose vector)
- **chivito-punk** → `ChagraAgentAvatarChivitoPunk.jsx` → `ChivitoPunk.jsx`
  (rig SVG F24 del valle, inlineado via `?raw`)
- **guacamaya** → `ChagraAgentAvatarGuacamaya.jsx` → `GuacamayaCompai.jsx`
  (rig SVG F24 del valle, inlineado via `?raw`)

Todos aparecen en `AgentAvatarSelector.jsx` (lineas 55-91) como opciones
seleccionables.

### Valle 3D (public/valle/)

El compai del mundo 3D se resuelve en `compaiRegistry.js` via
`resolverCompai(avatarType)`. 5 tienen coreografia3D propia (EscenaComponent
no-null):

1. **angelita**: fallback nativo (AbejaEscena, no registra EscenaComponent
   para evitar ciclo de imports)
2. **zariguya**: `ZariguyaCompaiEscena.jsx`
3. **jaguar**: `JaguarCompaiEscena.jsx`
4. **oso-baston**: `OsoBastonCompaiEscena.jsx`
5. **luciernaga**: `LuciernagaCompaiEscena.jsx`

2 quedan pendientes (`pendienteFable: true`, caen a Angelita):

6. **guacamaya**: `EscenaComponent: null` (linea 128)
7. **chivito-punk**: `EscenaComponent: null` (linea 129)

Cada uno tiene rig SVG en `public/valle/compai/rigs/` con su `.rig.svg`,
`.defs.svg`, `.css` y `.meta.json`. Los 7 rigs estan: angelita, jaguar,
oso, zariguya, luciernaga, guacamaya, chivito.

Laminas PNG de fallback en `public/valle/compai/laminas/` (para onboarding
y modo "solo lamina"): angelita, jaguar, oso, zariguya, luciernaga,
chivito-punk, chivito-normal.

### Kart 2.5D (public/valle/juegos/chagra-kart/)

El kart tiene DOS modos de renderizar pilotos:

**Modo default (3D-rig)**: `pilotos-manejando.js` construye cuerpos
rubber-hose en three.js (esferas, torus, mangueras bezier). Los compai con
rig propio en `pilotos-compai.js`:

- **oso** → `construirOso()` (linea 98)
- **zariguya** → `construirZariguya()` (linea 188)
- **luciernaga** → `construirLuciernaga()` (linea 295)
- **chivito / chivito-punk** → `construirChivito()` (linea 406)

Angelita y jaguar tienen constructores propios en pilotos-manejando.js (no
pasan por pilotos-compai.js).

**Modo opt-in (lamina-kart)**: `piloto-lamina.js` monta el recorte RGBA del
PNG real como plano orientado a camara, con capas (cuerpo/cabeza/brazo),
parpadeo por mascara de alfa y tinte de escena. Se activa SOLO con
`?piloto2d=1` en la URL. Sin ese parametro, el default es 3D-rig.

Compai con lamina registrada en `LAMINAS` (piloto-lamina.js:85-169):

- jaguar → jaguar-natural.png
- oso → oso.png
- zariguya → zariguya.png
- luciernaga → luciernaga.png
- chivito-punk → chivito-punk.png
- chivito → chivito-normal.png
- angelita → angelita.png

**guacamaya NO esta en el kart**: no aparece en `PILOTOS` (pilotos.js), ni
en `RASGOS_COMPAI` (pilotos-compai.js), ni en `LAMINAS` (piloto-lamina.js).
Es el unico compai canónico ausente del kart.

---

## HUECOS: compai con dibujo viejo donde ya existe lamina-viva

Solo hay UN caso de lamina-viva en todo el proyecto: el jaguar. No hay
"compai con dibujo viejo" en el sentido clasico del problema, porque la
lamina-viva del jaguar SÍ se usa donde debe (PWA via ChagraAgentAvatarJaguar).

Sin embargo, hay una inconsistencia menor:

- **jaguar en valle 3D**: `JaguarCompaiEscena.jsx` monta el cuerpo SVG
  vectorial (`Jaguar.jsx`, rubber-hose) via billboard `<Html>`, NO la
  lamina-viva. La lamina-viva del jaguar solo vive en la PWA (2.5D), no en
  el mundo 3D. Esto es por diseno (la escena 3D necesita un rig que se
  integre con la iluminacion three.js; la lamina-viva es un plano billboard
  orientado a camara). No es un hueco sino una decision de arquitectura.

- **guacamaya y chivito-punk en valle 3D**: tienen rig SVG reusado del valle
  en la PWA, pero en el valle3D caen a Angelita (EscenaComponent=null,
  pendienteFable:true). Si bien en la PWA el arte SI esta (rig F24), en 3D
  no tienen coreografia propia.

---

## NO MEDIDO

1. **Renders runtime**: Este censo es por lectura estatica de archivos
   (grep/lectura). No se verifico que los componentes carguen y renderizen
   correctamente en un navegador real. Un componente puede existir en codigo
   y no montarse por condicion de runtime (lazy loading, feature flags,
   bugs de import).

2. **Guacamaya en valle 3D sin medicion visual**: La clasificacion
   "fallback-angelita" se deduce de `EscenaComponent: null` en
   compaiRegistry.js:128. No se capturo una pantalla del valle3D con
   guacamaya seleccionada para verificar que efectivamente muestra a
   Angelita en su lugar.

3. **Kart sin `?piloto2d=1`**: La clasificacion "3D-rig + lamina-kart" se
   basa en que ambos modos existen en codigo. No se ejecuto el kart con
   ambos modos para verificar que ambos renderizan.

4. **Laminas PNG del valle**: `public/valle/compai/laminas/` tiene 15 PNGs.
   No se verifico visualmente que cada lamina corresponda al personaje
   correcto ni que no esten corruptos.

5. **gluacamaya.svg en PWA**: `GuacamayaCompai.jsx` inlines el rig F24 del
   valle via `?raw`. El CSS se extrae con `extraerCssDelRig`. No se
   verifico que el CSS extraido sea completo y no tenga reglas faltantes
   que hagan que la guacamaya se vea quieta o rota en la PWA.
