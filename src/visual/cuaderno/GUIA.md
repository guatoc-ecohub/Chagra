# El cuaderno vivo — guía de adopción

La columna educativa de Chagra es una frase del operador: **observación +
fracaso + paciencia, sin gamificación**. Este módulo es esa frase hecha
objeto: el cuaderno de finca que el campesino ya conoce — tapa de cabuya,
lomo cosido, renglón azuloso, margen destiñido — devolviéndole su propia
tierra con claridad. No es que la IA le enseñe: es que **su finca le habla
porque él la escuchó**.

## El ciclo que este módulo hace visible

| Momento      | Pieza                        | Cómo se ve                                             |
| ------------ | ---------------------------- | ------------------------------------------------------ |
| **Observar** | `GlifoMirada` + `MIRADAS`    | cuatro gestos de método: envés, cogollo, suelo, vecina |
| **Registrar**| `PaginaCuaderno`             | fecha, clima a pulso, texto en la voz del que anota    |
| **Aprender** | `EcoDelCuaderno`             | la página vieja vuelve al margen, en índigo, citada    |
| **Aprender** | `TresTemporadas`             | la misma era, tres años lado a lado, y la lección      |
| **El fracaso**| `tipo: 'fracaso'` + `HojaPrensada` | página digna: tinta vieja, hoja seca de reliquia |
| **La paciencia**| `LaPaciencia`             | renglones por año; la tinta envejece, no hay barra     |

## Las reglas duras (contrato, no opinión)

1. **CERO gamificación.** Ni puntos, ni rachas, ni medallas, ni niveles,
   ni "¡va muy bien!". El cuaderno refleja; no premia. Si una feature
   nueva necesita celebrar algo, no va en este módulo.
2. **El fracaso es dato digno.** La página de pérdida usa EL MISMO papel
   que las demás: tinta envejecida (como le toca por edad), su hoja
   prensada, su remate sobrio. Nada rojo, nada de ícono de error, nada de
   "¡inténtelo de nuevo!". Una pérdida escrita no se pierde dos veces.
3. **El eco cita, no receta.** Cuando el cuaderno "habla"
   (`EcoDelCuaderno`), habla SIEMPRE con palabras textuales que el propio
   campesino escribió antes (`eco.cita`). La IA es el puente que trae la
   página vieja a tiempo — jamás la maestra que da cátedra en el margen.
4. **El tiempo se pinta, no se cuenta.** La edad de una anotación va en
   `temporadasAtras` y se vuelve color con `tintaPorEdad` (fresca →
   asentada → desteñida). Nada de "hace 347 días" ni contadores.
5. **Tono usted, campesino colombiano.** Todo texto nuevo sigue la voz de
   `cuadernoData.js`: directa, en usted, sin diminutivos de coach, sin
   argentinismos.

## Cómo consumir

```jsx
import CuadernoVivo from './visual/cuaderno';

<CuadernoVivo reducedMotion={reducedMotion} />
```

Sin props muestra el cuaderno de muestra (`DEMO_CUADERNO`). Para cablear
datos reales (los logs de la finca → páginas; correspondencias de fechas
entre temporadas → ecos), pase `data` con el mismo shape — este módulo es
pura vista y **nunca fabrica estado**:

```jsx
<CuadernoVivo data={{ ...DEMO_CUADERNO, paginas: paginasReales }} />
```

Piezas sueltas para otras vistas (una página suelta en el valle, el glifo
de clima en una lámina):

```jsx
import { PaginaCuaderno, GlifoClima, TINTAS } from './visual/cuaderno';
```

## El ADN heredado (de dónde sale cada cosa)

- **Colores**: calcados de `paleta/paletaMadre.js` y `PALETA_ANDINA`, con
  fuente comentada en `cuadernoTokens.js`. Se calca en vez de importar
  porque `mezclar` de la paleta usa `THREE.Color` y este módulo es del
  bundle base — mismo precedente que `artesaniaAndina.js`. El CSS
  (`cuadernoVivo.css`) espeja esos valores; si toca uno, toque ambos.
- **Forma**: las tres reglas de la artesanía andina — nada perfectamente
  recto (ocho radios desiguales, giro determinista por página), el remate
  se ve (lomo cosido, hilo del eco), la gravedad es la firma (sombras
  corridas, la hoja prensada pesa).
- **Trazo**: `lineaQueRespira` y `rngArtesania` de
  `mundo3d/artesaniaAndina.js` (three-free por contrato). Todo temblor es
  determinista por seed: la misma página cuelga igual en cada visita.

## Presupuesto

DOM/SVG puro del bundle base: cero three, cero imágenes, cero fuentes
externas (la voz manuscrita es serif itálica del sistema; la mano está en
el temblor del layout, no en un font kitsch). Animación: una sola entrada
suave por pieza (`transform`/`opacity`), apagada por `prefers-reduced-motion`
o `data-reduced`. Los SVG se generan una vez por render con paths cortos.

## Antipatrones (visto una vez, no repetir)

- Barra de progreso o porcentaje en La Paciencia ("el aliso va al 60%").
- Rojo de error o tachones en la página de fracaso.
- El eco parafraseado o "mejorado" por la IA en vez de citado textual.
- Felicitaciones en cualquier remate ("¡excelente registro!").
- Hex nuevos sin pariente en la paleta madre ni comentario de fuente.
