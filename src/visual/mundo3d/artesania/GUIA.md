# Artesanía andina — guía de adopción

Chagra podía verse como cualquier app 3D de agro. Lo que la vuelve
inconfundible es que su lenguaje de forma venga de **la mano campesina**:
lo tejido, lo torneado, lo trenzado, lo amarrado. Este módulo NO es un museo
de artesanías — es el **lenguaje extraído**, aplicable a paneles, marcos,
botones, contenedores, conectores y cercas de cualquier mundo.

## Las tres reglas (el porqué de todo lo demás)

1. **Nada es perfectamente recto.** El temblor es continuo y de baja
   frecuencia (la mano corrige despacio), jamás ruido blanco. En 3D:
   `amanar(geo)`. En CSS: esquinas con ocho radios desiguales.
2. **El remate se ve.** Lo hecho a mano termina en borde gordo (el rollo del
   canasto), en cruce que se pasa de largo (las varas del marco) o en amarra.
   Lo de fábrica termina en corte limpio — por eso se ve de fábrica.
3. **La gravedad es la firma.** La soga cuelga, el botón se aplasta al
   presionar. La tensión perfecta es de máquina.

Todo determinista por `seed`: la misma olla tiembla igual en cada visita.

## Qué hay en cada archivo

| Archivo                   | Qué trae                                          | ¿three? |
| ------------------------- | ------------------------------------------------- | ------- |
| `tramaAndina.js`          | `MANO`, `FIBRAS`, perfiles (guadua, canasto)      | no      |
| `texturasArtesania.js`    | tejido, guarda, fique, chamba (canvas, caché)     | sí      |
| `geometriasArtesania.js`  | `amanar`, cuerda trenzada, guadua, vasija, canasto| sí      |
| `materialesArtesania.js`  | recetas tier-safe con mapa del oficio             | sí      |
| `ArtesaniaKit.jsx`        | `<CercaTejida>`, `<PanelArtesanal>`, `<CuerdaFique>`… | sí  |
| `artesaniaUi.css`         | `.artes-panel/-boton/-cordon/-etiqueta` (DOM)     | no      |

Hermanos que este módulo NO reemplaza: `../artesaniaAndina.js` (el mismo
lenguaje en 2D/SVG: patrones de telar, siluetas de vasija — las siluetas 3D
salen de SU tabla, nunca divergen) y `../paleta/` (todos los colores de aquí
son derivados suyos con `mezclar`; ni un hex nuevo).

## Uso 3D (dentro de escenas/, chunk de three)

```jsx
import {
  CercaTejida, PanelArtesanal, CuerdaFique, VasijaChamba, CanastoAndino,
} from '../artesania';
import { perfilDeTier } from '../deviceTier.js';

const perfil = perfilDeTier(tier);

<CercaTejida largo={5} postes={5} perfil={perfil} position={[-2, 0, 1]} />
<CuerdaFique de={[0, 1.4, 0]} a={[2.2, 1.6, 0.4]} perfil={perfil} />
<PanelArtesanal ancho={1.8} alto={1.1} perfil={perfil}>
  {/* su contenido, apenas adelante de la tela */}
</PanelArtesanal>
<VasijaChamba nombre="cantaro" alto={0.5} perfil={perfil} />
```

Reglas de consumo:

- **`perfil` siempre**: sin él degrada a Lambert (correcto en gama baja,
  desperdicio en alta). Nada de este módulo corre por frame.
- **Conectores**: donde iba una línea/cilindro gris, va `<CuerdaFique>` con
  comba. El grafo ya probó que la trenza lee como vínculo vivo.
- **Contenedores del mundo**: letreros y tarjetas sobre `<PanelArtesanal>`;
  cosas guardadas, en `<CanastoAndino>` o `<VasijaChamba>`.
- **Geometría propia que deba sentirse a mano**: pásela por `amanar(geo,
  { seed })` al construirla. Es un solo recorrido de vértices al montaje.
- **Teardown**: los componentes liberan sus geometrías/materiales solos; las
  texturas son compartidas — `liberarTexturasArtesania()` al desmontar la
  escena madre, si hace falta.

## Uso UI (DOM, cero three)

```jsx
import '../artesania/artesaniaUi.css';

<section className="artes-panel">
  <span className="artes-etiqueta">Piso templado</span>
  <hr className="artes-cordon" />
  <button className="artes-boton artes-boton--acento">Sembrar</button>
</section>
```

El acento (`--acento`, la guarda del panel) va **a cucharadas**: una cinta,
un botón principal — jamás superficies grandes (regla de la paleta madre).

## Presupuesto (gama baja primero)

Lathes de 7–12 segmentos, tubos de 4–5 lados, canvases de 64–128 px con
NearestFilter. Una cerca completa ≈ 1.5k triángulos y 2 draw calls (postes
comparten geometría, TODAS las sogas van fundidas en una malla); una vasija
≈ 250 triángulos; las texturas se cachean por clave (mil canastos, una
textura). En gama baja bajá `tramos`/`radial` de las cuerdas si la escena
anda apretada — con 10–12 tramos la soga sigue digna.

## Límite ético

Solo formas del **oficio** (tejer, tornear, trenzar, amarrar) y geometría
abstracta de telar. Nada de iconografía sagrada, símbolos rituales ni motivos
identitarios de un pueblo específico. Herencia directa del módulo 2D; si una
pieza nueva le genera duda, no va.
