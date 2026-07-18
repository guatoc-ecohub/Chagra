# `src/visual/creatures` — personajes de fauna reutilizables

Librería de **personajes de fauna de la chagra** como componentes SVG limpios,
parametrizables y sin dependencias nuevas. Nace para **dejar de redibujar el
mismo bicho** en cada mockup/escena: hoy el colibrí, la abeja angelita, la
lombriz, la mariposa y el escarabajo aparecían dibujados por separado en varios
sitios (`mockups/MockupGuardianesNarrativos`, `dashboard/Scene*`,
`FincaVivaHero`, `MundoVinetas`, `MundoSubsuelo`, avatares del colibrí…) con
calidad dispar. Aquí vive la **versión canónica** de cada uno.

## Regla de la casa

> **Antes de dibujar un personaje de fauna, búscalo aquí.**
> Si existe → **reúsalo** (y si podés, **mejorá** la versión canónica en su
> archivo, para que todos hereden la mejora).
> Si dibujás un personaje nuevo reutilizable → **agregalo aquí en el mismo PR**
> (componente + entrada en `index.js` + fila en esta tabla).

## Personajes

| Componente | Especie (binomio verificado) | Notas |
|---|---|---|
| `AbejaAngelita` | *Tetragonisca angustula* | Meliponino nativo **SIN aguijón** — NO *Apis*. Alitas de tul que baten. Rubber-hose. |
| `Colibri` | *Colibri coruscans* | Colibrí chillón andino. Pico largo, garganta violeta, alas que baten. **Rubber-hose** (adoptado). |
| `RanaAndina` | *Atelopus* spp. | Rana arlequín del páramo. Verde húmedo con manchas ocre, vientre dorado, ojos saltones y bocota. Rubber-hose. |
| `Perezoso` | *Bradypus variegatus* | Perezoso de tres dedos, templado. **Cuelga de una rama** por sus **garras largas** curvas, con **antifaz** y **tinte verdoso** de algas. La quietud extrema: todo en **cámara lenta** (mecerse zen, parpadeo larguísimo). Poder **turquesa**. Rubber-hose, showcase completo. |
| `Ardilla` | *Notosciurus granatensis* | Ardilla de cola roja del templado. Rufa con **línea dorsal** oscura (su firma), **cola tupida** y dientes de roedor. Ágil e inquieta: su firma es la **inspección invertida** (se cuelga de cabeza). De suelo, se sienta. Rubber-hose. |
| `Jaguar` | *Panthera onca* | Felino de tierra cálida. Leonado con **rosetas** (manchas de centro ocre — su firma), musculoso, mirada felina ámbar. Majestuoso y **acechador**: acecho de hombros, cola pesada, rugido. Aura **púrpura**. Rubber-hose. |
| `Morrocoy` | *Chelonoidis carbonarius* | Galápago de patas rojas de tierra cálida. Caparazón de **domo geométrico** (escudos **hexagonales** con anillos de edad — su firma), patas y cabeza **rojizas** con escamas naranja-fuego. **Ancestral, lento, sabio**: caparazón que respira, **retracción elástica** (cabeza y patas entran a la concha), asentimiento sabio. Aura **bronce**. Rubber-hose. |
| `Lombriz` | *Martiodrilus crassus* | Lombriz gigante nativa. Cuerpo segmentado con clitelo. Sin animación propia (su movimiento lo da la escena). |
| `Mariposa` | *Dione juno* | Pasionaria de alas largas. Cuatro alas que abren y cierran. |
| `Escarabajo` | *Dichotomius belus* | Estercolero colombiano. Élitros brillantes, cuerno, y bola de abono que rueda. |

## Props

Todos comparten la misma firma:

| Prop | Tipo | Defecto | Qué hace |
|---|---|---|---|
| `size` | `number \| string` | `64` | Ancho/alto en modo standalone (`<svg>`). Ignorado en modo `inline`. |
| `className` | `string` | — | Clase(s) del nodo raíz. En modo `inline` es donde la escena engancha su coreografía de entrada/posición. |
| `inline` | `boolean` | `false` | `false` → `<svg>` autónomo (avatares, catálogo, botones). `true` → solo un `<g>` para incrustar en una escena SVG existente. |
| `animated` | `boolean` | `true` | Activa la vida perpetua (aleteo, alas, bola, patas). `false` = quieto. Siempre reduced-motion-safe. |
| `title` | `string` | nombre del bicho | `aria-label` + `<title>` accesible. |

Props extra (`...rest`) se pasan al `<svg>` en modo standalone.

## Uso

```jsx
import { Colibri, AbejaAngelita } from '@/visual/creatures';

// Avatar / catálogo — SVG autónomo:
<Colibri size={48} title="Colibrí chillón" />
<AbejaAngelita size={40} animated={false} />

// Dentro de una escena SVG propia (la escena pone posición y entrada):
<svg viewBox="0 0 340 210">
  {/* …fondo, suelo… */}
  <g transform="translate(120 66)">
    <Colibri inline className="mi-entrada-volando" />
  </g>
</svg>
```

Consumidor de referencia: **`src/mockups/MockupGuardianesNarrativos.jsx`**
(usa las 5 criaturas en modo `inline`).

## KIT rubber-hose (Cuphead + Miss Minutes) — reutilizable

El lenguaje de animación **"de goma"** (Cuphead + Miss Minutes de Loki) fusionado
con la calidez campesina andina vive en **dos artefactos species-agnostic**, para
que **el oso andino y el colibrí lo hereden sin redibujar**:

- **`_rubberhose.jsx`** — RASGOS SVG de goma parametrizables:
  - `OjosRubber({ ojos, mirar, parpadea })` — ojos grandes con pupila de goma +
    brillo (catchlight); uno (perfil) o dos (3/4). Parpadean juntos (`rh-blink`).
  - `Cachetes({ puntos })` — chapetas coral (rubor campesino).
  - `Sonrisa({ cx, cy, w, prof })` — el arco amable de todo rubber-hose.
  - `Miembro({ d, punta, pie, sway, delay })` — brazo/pata de **manguera** con
    mitón/pie crema (la firma de Cuphead); `sway` = follow-through.
  - `AntenaRubber({ d, bulbo, sway })` — antena con bombillo que se mece.
  - Constantes: `RH_INK` (tinta cálida andina), `RH_GLOVE`, `RH_CHEEK`.
- **`creatures.css` → sección KIT** — la CADENCIA como clases `rh-*`:
  - `.rh-boil` — idle vivo: squash-&-stretch que respira (~12fps stepped, con
    anticipación + overshoot). Va al nodo-cuerpo.
  - `.rh-blink` — parpadeo seco de los ojos.
  - `.rh-sway` — follow-through (secondary motion) de antenas/brazos/patas.
  - `.rh-smear` — smear de miembro para golpes rápidos (p.ej. zarpazo del oso).
  - Aleteo (`.crt-wing`) ya lleva **smear** incorporado (estirón en el golpe).

**Gate obligatorio**: `prefers-reduced-motion` congela todo el KIT; `data-tier='bajo'`
(device-tier) apaga lo continuo (boil + follow-through) y conserva aleteo +
estados reactivos. Standalone (avatares/catálogo) sin `tier` = rubber-hose pleno.

**Estrenado por**: `AbejaAngelita` (referencia de composición del KIT).
**Ya adoptado por**: `Colibri`, `RanaAndina` y `Jaguar` — componen las mismas
piezas + clases `rh-*` con SUS proporciones (identidad en `faunaAndina.js`), y
heredan los gestos species-agnostic (`rh-g-celebra` / `rh-g-reposo` /
`rh-g-senala`) solo con `data-pose`. No se reinventa la cadencia.

**Showcase COMPLETO (toda la fundación transversal)**: `AbejaAngelita`
cablea además — sin duplicar código — el **lip-sync** (`visema` →
`BocaVisema`), el **modo poder** (`poder` → aura de 4 capas con su color
dorado), la **ropa por clima+hora** (`vestuario` →
`AccesoriosClima`), el **prop por mundo**
(`mundoId` → `PropEnMano`) y el **line-boil** (`lineBoil`). El **`Jaguar`** hace lo propio con su carácter de felino ACECHADOR:
boil controlado y elegante, **acecho de hombros** (los omóplatos suben —
`.jaguar-hombros`), **cola** que ondea con peso, **cejas fieras**, **rugido**
corporal (`ruge` → fauces con colmillos) y modo **acecho** (`acecha` → cabeza
baja + creep agazapado); su aura de poder es **púrpura**. Los demás bichos
heredan la misma fundación pasando sus parámetros.

La **`Ardilla`** cierra la misma fundación completa con su CARÁCTER opuesto —
pizpireta, ÁGIL, curiosa e INQUIETA: aura **ÁMBAR** en poder, boil VELOZ (no
pesado), **cola tupida** que se sacude, hocico que olfatea, dientes de roedor y
su gesto-FIRMA la **inspección invertida** (`inspecciona` → se cuelga de cabeza a
espiar) más el **roer** una semilla (`roe`). Templada, pero del contrato
compartido: **nunca suda** (se abriga de noche/frío, jamás gotea). Todo aditivo
en `creatures.css`, RM + tier-safe.

El **`Morrocoy`** cierra los OCHO con su carácter de galápago ANCESTRAL, LENTO,
SABIO y PACIENTE (el anciano de la chagra): aura **BRONCE** en poder, boil LENTO
de **paso pesado** (la sabiduría no corre), **caparazón de domo hexagonal** que
**respira** (`.morrocoy-caparazon`, escudos con anillos de edad — su firma),
**patas rojizas** con escamas naranja-fuego, y su gesto-FIRMA la **retracción
elástica** (`seRetrae` → cabeza y patas entran a la concha con squash&stretch)
más el **asentimiento sabio** (`asiente`). De tierra cálida y del contrato
compartido: **nunca suda**. Suma su capa ANCESTRAL permanente (resplandor cobrizo
+ shimmer de brasa). Todo aditivo en `creatures.css`, RM + tier-safe.

## El Ent del páramo — el árbol-maestro (no un bicho)

El **`EntFrailejon`** es el **corazón del "Bosque Vivo"**: un **frailejón gigante**
(*Espeletia* sp.), el árbol-guardián **vivo, ancestral y sabio** que ENSEÑA. NO es
fauna: es el **árbol central**, con **presencia GRANDE** e imponente. Traduce a los
Andes el alma de un árbol-guardián de la fantasía clásica: un **rostro sabio en la
corteza** (ojos hundidos entre las grietas, **cejas de corteza** serenas, boca en
la hendidura), tronco alto vestido con la **faldita** de hojas muertas, **corona en
roseta** de hojas plateadas y pubescentes (su cabellera) con **flores amarillas**, y
**raíces** que se asientan. Se mueve **LENTO y con peso** — quietud imponente, nada
hiperactivo.

Hereda la MISMA fundación transversal, **adaptada a su escala y su lentitud**:
- **Expresividad de árbol vivo** — `lineBoil` MUY lento (corteza ancestral),
  **balanceo** de todo el árbol, roseta que **respira y se mece** (`.ent-hoja`),
  parpadeo lento y raíces asentadas.
- **Lip-sync** — la boca entre las **grietas del tronco** (`visema` → `BocaVisema`)
  para cuando enseña/habla.
- **Modo-GUARDIÁN** (su "modo poder", `poder`) — cuando el páramo peligra el Ent se
  **yergue**: aura **verde-plateada** de 4 capas, la **roseta se abre** y brilla, las
  flores encienden; sobrio y épico.
- **Clima de páramo** (`vestuario`) — **ESCARCHA** en las hojas de noche/frío y
  **NEBLINA** que cruza el tronco; del contrato compartido pero **JAMÁS suda** (vive
  en el frío).
- **Enseñanza** — `useEntGuion()` trae el guion de botánica/clima/conservación/caza
  en **usted** colombiano; **fallback digno** de 4 snippets hasta que aterrice
  `src/data/entGuion.js` (punto de integración listo: `useEntGuion({ guion })`).

Todo aditivo en `creatures.css`, RM + tier-safe.

## Técnica

- SVG + CSS puros, **cero dependencias nuevas**; solo `transform`/`opacity`
  (GPU, Android gama baja). Familia visual del glow de `GuardianEspiritu`.
- Cada instancia genera **ids de filtro únicos** (`useId`), así se pueden
  repetir muchas criaturas en una misma página sin colisión.
- La **vida perpetua** vive en `creatures.css` (clases `crt-*`), es intrínseca
  a la criatura y **reduced-motion-safe** (sin animación → fotograma digno).
- La **coreografía de LLEGADA** (entrar volando, asomar del suelo, rodar) NO
  vive aquí: es responsabilidad de la escena que consume la criatura, sobre el
  `className` del modo `inline`.
