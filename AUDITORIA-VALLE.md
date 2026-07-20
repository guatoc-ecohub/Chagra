# Auditoría visual del valle 3D

Fecha de medición: 2026-07-20  
Objeto auditado: escena del commit `af52e933`, que corresponde al `HEAD` inicial de este worktree  
Ruta: `/?ciclo=12#/mockups/entrada-3d`  
Viewport de referencia: 1998 × 1248 px, tier alto, movimiento reducido para congelar la cámara  
Alcance: diagnóstico y medición. No se modificó arte.

## Dictamen

La escena no se ve incongruente por falta de trabajo ni por falta de especies. Se ve incongruente porque acumula detalle de muchas manos sin una ley común. El render de mediodía monta 6.057 instancias, 487 mallas, 473 geometrías únicas y 321 materiales únicos. Dibuja aproximadamente 1,13 millones de triángulos en 489 llamadas. A la vez, los objetos conservan siluetas muy simples y escalas de diorama.

Los tres bloqueantes que más explican la lectura de maqueta son:

1. No existe un contrato único de material y sombreado. El render mezcla 288 usos de `flatShading` con 199 usos de sombreado suave, además de `Standard`, `Lambert`, `Basic` y `Phong`. Los personajes SVG tienen contorno; la geometría 3D no.
2. No existe una referencia humana física común. La casa mide 1,47 unidades de alto y su puerta modelada, 0,58 unidades. Los campesinos no tienen altura 3D: son billboards DOM de 28 a 32 px. Los perros sí tienen alturas verosímiles de 0,59 y 0,35 unidades.
3. No hay primer plano. El primer impacto de terreno está a 12,8 unidades de la cámara; el cuadro es 94% terreno y solo 6% cielo. El terreno ocupa 27,4% del tercio superior, 45,7 veces la referencia de 0,6% documentada por la herramienta aprobada.

El ciclo horario sí está motivado y es coherente en posición y color. El mar de nubes, el crepúsculo, el mediodía cenital, la luna visible y la ronda de Dante y Oliver se deben conservar. El problema es que las tres luces escalan siempre en la misma proporción: el relleno combinado equivale a 90% de la luz direccional en todas las franjas. Cambia el tinte, pero casi no cambia la estructura de valor.

## Método y límites

Se usaron tres mediciones complementarias:

- Inventario estático de 58 archivos de valle, dirección, terreno, sierra y bosque. Cuenta recetas JSX, materiales, colores y `flatShading` por componente.
- Inspección del grafo Three.js montado. Cuenta mallas, instancias, triángulos, materiales, luces, niebla, alturas y bancos botánicos reales.
- Análisis de píxel sobre los cinco PNG oficiales. Mide luminancia Rec.709, saturación, recorte, contraste y bordes por tercio sobre un recorte constante que evita la mayor parte de la interfaz.

Los triángulos por banco botánico son exactos para el grafo montado. El promedio por instancia es una razón de presupuesto, no significa que todas las instancias de un banco tengan idéntica topología. Las posiciones proyectadas de un `InstancedMesh` se agrupan por banco; por eso la medición de planos se apoya también en rayos contra el terreno y no solo en el centro del banco.

## 1. Congruencia del lenguaje visual

### Hallazgo 1.1, cuatro modelos de material compiten en el mismo cuadro

Qué está mal: la escena no tiene un comportamiento de luz común. Unas piezas muestran facetas duras, otras gradientes suaves y otras son color sin iluminación. Un personaje dibujado con línea comparte plano con animales modelados, follaje facetado y halos transparentes.

Evidencia medida del render de mediodía:

| Métrica | Resultado |
|---|---:|
| Mallas visibles | 487 |
| Instancias | 6.057 |
| Geometrías únicas | 473 |
| Materiales únicos | 321 |
| Usos `MeshStandardMaterial` | 245 |
| Usos `MeshLambertMaterial` | 194 |
| Usos `MeshBasicMaterial` | 47 |
| Usos `MeshPhongMaterial` | 1 |
| Usos con `flatShading` | 288, 59,1% |
| Usos con sombreado suave | 199, 40,9% |
| Materiales transparentes | 45 |
| Colores visibles de material | 84 |
| `MeshToonMaterial` | 0 |
| Postproceso de contorno, SSAO o DoF | 0 encontrado |

El inventario estático amplía el problema: 314 declaraciones de material, 7 nombres de tipo de material contando variantes de creación, 260 recetas de geometría y 712 colores hex distintos en el conjunto que incluye meshes, SVG y estados horarios. Se encontraron 93 referencias a `strokeWidth`, `Outline`, `outline` o `linewidth`, concentradas en lenguaje 2D; no existe una regla equivalente de borde para el mundo 3D.

Por qué se ve amateur según las lentes: la estilización necesita menos decisiones, pero aplicadas con más disciplina. Aquí una misma luz produce faceta, gradiente y color plano según quién construyó la pieza. El ojo no interpreta variedad dentro de un lugar, sino activos de bibliotecas distintas.

Corrección concreta:

- Adoptar una sola familia de shader opaco para ambiente y arquitectura. Recomendación: tres bandas de luz con rampa común y variación por material, no cuatro modelos de respuesta.
- Reservar `MeshBasicMaterial` para cielo, luna, halos y señales realmente emisivas. No usarlo para objetos físicos.
- Definir una regla de borde explícita: sin contorno para paisaje; contorno color tinta de 1,5 px en pantalla solo para personajes e interactivos. Hoy el grosor depende del SVG.
- Reducir la paleta a 4 colores madre y entre 12 y 16 muestras de material aprobadas. Los estados horarios deben transformar valor y temperatura de esas muestras, no añadir paletas paralelas.
- Crear una hoja de prueba con una roca, un árbol, una casa, una persona, un animal y un portal bajo las cinco franjas. Ningún activo entra si rompe las bandas o el borde acordado.

### Hallazgo 1.2, “low-poly” en silueta pero no en presupuesto

Qué está mal: el espectador ve formas elementales, pero la GPU y el detalle interno trabajan como una escena mucho más densa. El costo se concentra en vegetación que termina fusionándose en masas.

Evidencia medida:

| Clase montada | Instancias | Triángulos | Promedio por instancia | Fracción de la escena |
|---|---:|---:|---:|---:|
| Bosque denso | 836 | 731.224 | 874,7 | 64,55% |
| Páramo | 128 | 161.808 | 1.264,1 | 14,28% |
| Detalle de suelo | 4.303 | 60.476 | 14,1 | 5,34% |
| Ladera alta | 142 | 45.062 | 317,3 | 3,98% |
| Cafetal | 62 | 38.080 | 614,2 | 3,36% |
| Vegetación de pisos del núcleo | 39 | 1.068 | 27,4 | 0,09% |

Solo esos seis conjuntos suman 91,6% de los triángulos. El render completo arroja 1.133.849 triángulos por cuadro en `gl.info.render`, mientras el recorrido de geometrías suma 1.132.878. La diferencia de 971 triángulos corresponde a elementos auxiliares del render.

El inventario por receta muestra otra discontinuidad. Arquitectura e infraestructura usa 20 recetas y 280 triángulos nominales antes de loops; fauna usa 9 recetas y 186 nominales; vegetación usa 67 recetas y 4.164 nominales. El nivel de detalle no se asignó por importancia narrativa, sino por el frente que produjo cada activo.

Por qué se ve amateur: el detalle fino no crea cine si no sobrevive al encuadre. El bosque usa casi dos tercios del presupuesto para formar un bloque verde. La casa, que debería ser el ancla, usa cajas mínimas. Esa inversión de prioridad crea ruido sin jerarquía.

Corrección concreta:

- Presupuesto inicial de aceptación para tier alto: máximo 250.000 triángulos visibles y 150 llamadas en el plano de reposo. Es una reducción aproximada de 4,5× y 3,3× sobre la base, suficiente para obligar una jerarquía real.
- Bosque: 150 a 450 triángulos por árbol cercano, 40 a 120 en fondo; dos o tres siluetas de copa por especie, no detalle foliar fusionado que no se lee.
- Páramo: 80 a 250 triángulos por frailejón cercano y billboard o agregado de colonia en fondo. El promedio actual de 1.264 es el más alto entre los bancos medidos.
- Detalle de suelo: conservar matojos de 4 a 12 triángulos solo dentro de 12 unidades de cámara; usar mancha de color o vertex color después de esa distancia.
- Arquitectura y animales principales: invertir más silueta por objeto que en una mata de fondo. La casa puede usar 1.500 a 3.000 triángulos si recupera proporción y lectura.

### Hallazgo 1.3, el lenguaje 2D funciona como una segunda película superpuesta

Qué está mal: campesinos, criaturas, Angelita y varios vecinos son SVG/DOM con línea y escala de pantalla. Casa, perros, hato y terreno viven en unidades físicas. Los iconos circulares también mantienen tamaño de pantalla. No hay una transición visual entre esos dos planos.

Evidencia:

- Los dos campesinos de mediodía miden 28,36 y 32,10 px, sin caja 3D medible.
- La guía declara un rango de 50 a 66 px, también como billboard.
- La casa sí tiene caja física de 1,47 unidades.
- Las capturas `base-mediodia-cenital.png` y `base-tarde-ronda-perros.png` muestran vecinos dibujados que no reciben la misma luz ni la misma niebla que los árboles junto a ellos.

Por qué se ve amateur: la escala constante en pantalla comunica interfaz, no habitante del valle. Cuando un personaje “vive” en el espacio pero no cambia como los objetos físicos, el cerebro lo lee pegado sobre el render.

Corrección concreta:

- Elegir una regla binaria. Interfaz: tamaño fijo, anillo y sin pretensión de ocupar suelo. Habitante: tamaño mundial, oclusión, niebla, contacto y respuesta al ciclo.
- Mantener billboards para rendimiento, pero darles un plano mundial con altura en metros y un shader que reciba niebla y tinte horario. El SVG puede seguir siendo el arte base.
- Durante el plano de establecimiento, mostrar máximo tres señales completas. El resto debe reducirse a punto o aparecer por foco.

## 2. Escala

### Hallazgo 2.1, la casa tiene tamaño de objeto, no de edificio

Qué está mal: si una unidad equivale a un metro, como asumen los comentarios y la herramienta de rayos, la casa es más baja que una persona. Si una unidad no equivale a un metro, los perros dejan de tener tamaño creíble. No existe una conversión coherente que salve ambos grupos.

Evidencia medida:

| Objeto | Altura o dimensión | Contra persona de 1,70 m |
|---|---:|---:|
| Casa, caja completa | 1,470 u | 0,86 personas |
| Puerta modelada | 0,582 u | 0,34 personas |
| Ancho de zócalo/casa | 1,702 u | 1,00 personas acostadas |
| Oliver | 0,595 u | 0,35 personas |
| Dante | 0,349 u | 0,21 personas |
| Relieve total del terreno | 5,919 u | 3,48 personas |
| Cordillera completa | 14,600 u | 8,59 personas |

Oliver y Dante están cerca de alturas reales de perro grande y perro bajo. La casa, la puerta y la “cordillera” son las piezas fuera de contrato. En una captura contrapicada la casa queda casi del tamaño visual de la guía y la cordillera se revela como cinco volúmenes de escenografía.

Por qué se ve amateur: la escala es la física silenciosa del cuadro. Una montaña de 8,6 alturas humanas y una puerta a la rodilla convierten el valle en maqueta aunque la cámara, la niebla y los colores sean atractivos.

Corrección concreta:

- Declarar `1 unidad = 1 metro` y añadir una referencia humana de 1,70 u visible solo en diagnóstico.
- Mantener como anclas a Oliver en aproximadamente 0,59 u y Dante en aproximadamente 0,35 u. No cambiar su ronda.
- Llevar la puerta a 2,0-2,1 u; alero a 2,4-2,7 u; cumbrera a 3,2-4,0 u. Ajustar el ancho de la casa después, no escalar el grupo ciegamente.
- Separar escala navegable y fondo. La cordillera no debe fingir 14,6 m: debe vivir en una capa de fondo con escala y distancia propias, o en una silueta atmosférica sin pretensión métrica.
- Añadir un test diagnóstico que falle si puerta, persona, perro y alero salen de rangos acordados.

### Hallazgo 2.2, la profundidad se comprime en una franja de 12 a 25 unidades

Qué está mal: la mayoría de la masa visual vive a distancia semejante. No hay un objeto cercano que establezca tamaño y parallax antes de la finca.

Evidencia:

- Cámara: `[10,5, 9,0, 13,5]`, mira `[0,0, 1,6, 1,4]`, FOV 40°.
- Primer impacto de terreno: 12,8 u.
- Distancia media de rayos al terreno: 19,7 u.
- Último impacto: 41,2 u.
- El centro de los bancos instanciados concentra 1.132.710 de 1.132.878 triángulos entre 10 y 25 u. Esta cifra sirve como señal de agrupación, no como área exacta en pantalla.

Por qué se ve amateur: el diorama enseña todo a una distancia cómoda. El cine usa una diferencia fuerte entre algo que casi toca el lente, un sujeto legible y un fondo que pierde información.

Corrección concreta:

- Introducir un primer plano de 3 a 7 u con una cerca, hoja o borde de sendero que ocupe entre 8% y 15% del cuadro.
- Colocar casa y actividad principal entre 9 y 18 u.
- Reservar más de 25 u para bosque alto y cordillera, con detalle y contraste reducidos.
- Mantener la navegación, pero definir una pose de autor que respete esas tres bandas antes de soltar `OrbitControls`.

## 3. Los tres planos

### Hallazgo 3.1, el cuadro está tapiado por la ladera

Qué está mal: la ladera cruza el tercio alto y elimina la respiración del horizonte. El espectador ve superficie continua, no un valle que se extiende.

Evidencia de `encuadre-mundo.mjs valle`:

| Métrica | Valle | Umbral documentado |
|---|---:|---:|
| Cielo/telón | 6,0% | aviso por debajo de 12% |
| Terreno | 94,0% | sin objetivo único |
| Terreno en tercio alto | 27,4% | referencia aprobada: 0,6% |
| Terreno en tercio medio | 33,3% |  |
| Terreno en tercio bajo | 33,3% |  |
| Casa ancla | tercio medio-centro | en cuadro |

La casa está en cuadro, pero no domina. Compite con bosque, quebrada, rótulos, hato, mercados y una ladera que ocupa los tres tercios casi por igual.

Por qué se ve amateur: sin vacío ni horizonte, cada objeto parece apoyado sobre el mismo tablero inclinado. Se pierde la diferencia entre “aquí”, “allá” y “muy lejos”.

Corrección concreta:

- Bajar la ocupación de terreno en el tercio alto por debajo de 8% como primer objetivo, sin exigir copiar el 0,6% de otro mundo.
- Subir cielo a 15%-25% en la pose de establecimiento.
- Abrir un corredor de valor desde la casa hacia el horizonte. No tiene que ser suelo vacío: puede ser quebrada, sendero o claro.
- Reencuadrar la segunda cordillera como silueta y evitar que conos individuales se crucen en ángulos laterales.

### Hallazgo 3.2, hay microdetalle por distancia, pero no perspectiva aérea suficiente

Qué está mal: el tercio bajo contiene más bordes pequeños, pero no tiene más contraste ni un foco. El fondo conserva árboles, pastos y siluetas con contraste alto. La reducción de detalle no produce una lectura limpia de tres planos.

Evidencia en los PNG oficiales:

| Franja | Densidad de borde bajo/alto | Contraste bajo/alto | Lectura |
|---|---:|---:|---|
| Amanecer | 1,09× | 0,60× | detalle casi igual, frente más plano |
| Mediodía | 2,47× | 0,54× | mucho microdetalle abajo, poco peso de valor |
| Crepúsculo | 1,23× | 0,70× | separación débil |
| Noche | 1,48× | 0,99× | planos casi con el mismo contraste |
| Tarde | 2,41× | 0,52× | textura abajo, foco arriba |

La niebla empieza a 12 u en todas las franjas. Su final varía: 34 al amanecer, 52 al mediodía, 32 al atardecer, 38 en la noche y 44 en la tarde. En mediodía, justamente cuando la atmósfera debería separar la enorme ladera de fondo, el rango es el más largo y el efecto relativo, el menor.

Por qué se ve amateur: aumentar el número de briznas en el frente no equivale a crear primer plano. El cine separa por tamaño, oclusión, valor, saturación, nitidez y movimiento diferencial al mismo tiempo.

Corrección concreta:

- Eliminar geometría de suelo en fondo y plano medio; no solo reducirla.
- Desaturar y enfriar el fondo entre 15% y 25% respecto al plano medio.
- Reducir el contraste local del fondo entre 25% y 40% respecto al sujeto.
- En tier alto, evaluar DoF muy leve solo para la toma de establecimiento. En todos los tiers, resolver primero con niebla, color y LOD.

## 4. Luz y valor

### Hallazgo 4.1, la hora cambia de color, no de relación luz/relleno

Qué está mal: la luz hemisférica y la ambiental suman siempre 90% de la direccional. Esa proporción fija mantiene una estructura plana durante todo el ciclo.

| Franja | Hemisférica | Ambiental | Direccional | Relleno/direccional | Fog final |
|---|---:|---:|---:|---:|---:|
| Amanecer | 0,523 | 0,333 | 0,950 | 0,90 | 34 |
| Mediodía | 0,743 | 0,473 | 1,350 | 0,90 | 52 |
| Atardecer | 0,495 | 0,315 | 0,900 | 0,90 | 32 |
| Noche | 0,396 | 0,252 | 0,720 | 0,90 | 38 |
| Tarde | 0,605 | 0,385 | 1,100 | 0,90 | 44 |

La dirección sí está motivada: cenital al mediodía, baja al amanecer/atardecer y nacida desde la luna en noche. Eso es un acierto y es intocable. El problema está en el relleno proporcional, no en la fuente.

Por qué se ve amateur: si el relleno sigue a la clave como una copia al 90%, las sombras cambian de color pero no modelan una escena distinta. La relación constante se siente como filtro horario sobre el mismo diorama.

Corrección concreta:

- Mantener posiciones, luna, cenital y duración del crepúsculo.
- Desacoplar relleno de clave. Objetivo de prueba: relleno/clave de 0,45-0,60 en día, 0,30-0,45 en amanecer/atardecer y 0,30-0,40 en noche, compensando exposición para no aplastar negros.
- Añadir oclusión de contacto barata en un solo lenguaje, horneada o por vertex color. Las sombras radiales actuales ayudan, pero no sustituyen AO en uniones de casa, cerca y vegetación.
- Definir el foco de cada franja. Mediodía: casa y actividad. Amanecer: silueta sobre el mar de nubes. Crepúsculo: corredor cálido. Noche: luna y una sola práctica de casa.

### Hallazgo 4.2, la noche recorta información y el día reparte demasiado el foco

Evidencia de histograma sobre los PNG oficiales:

| Franja | Luminancia media | P05-P95 | Saturación media | Negro <2% | Colores cuantizados 12-bit |
|---|---:|---:|---:|---:|---:|
| Amanecer | 0,424 | 0,706 | 0,365 | 0,09% | 837 |
| Mediodía | 0,507 | 0,792 | 0,384 | 0,00% | 922 |
| Crepúsculo | 0,368 | 0,569 | 0,547 | 0,04% | 795 |
| Noche | 0,131 | 0,259 | 0,658 | 5,31% | 775 |
| Tarde | 0,448 | 0,718 | 0,491 | 0,00% | 817 |

Qué está mal: la noche tiene mediana de luminancia 0,094 y 5,31% de píxeles por debajo de 2%, mientras conserva saturación alta de 0,658. Se pierde forma antes de perder color. En día, el rango es amplio pero hay muchos centros de contraste con peso similar: bosque, agua, alertas, portal, casa y animales.

Por qué se ve amateur: el negro cerrado elimina volumen; el exceso de pequeños máximos elimina foco. Una imagen cinematográfica puede ser oscura o compleja, pero necesita una ruta de mirada.

Corrección concreta:

- Noche: levantar el “toe” del tone mapping hasta bajar el negro recortado por debajo de 1%, sin aumentar la luna ni moverla.
- Mantener P95 por debajo de 0,95 fuera de la luna y prácticas justificadas.
- Crear una diferencia de luminancia de 15%-25% entre sujeto y entorno inmediato, medida en una máscara de pantalla, no por material aislado.
- Apagar halos o emisivos que no tengan fuente diegética. No se encontró `Bloom`; los puntos blancos actuales provienen de materiales y transparencias, por lo que deben controlarse en origen.

## 5. Fidelidad botánica y paisaje habitado

### Hallazgo 5.1, las especies son correctas pero la densidad las vuelve genéricas

Qué está bien:

- No se encontraron referencias a pino, ciprés, eucalipto o coníferas en el conjunto del valle auditado.
- Sí existen frailejón, yarumo, roble andino, aliso, gaque, encenillo, guadua, cafeto y gradiente altitudinal.
- Sí existen intervención humana y uso: casa, senderos, patios, cercas, terrazas, cultivos, hato y arriería.

Qué está mal: la siembra hace que especies distintas se fusionen en una pared continua. La firma botánica está en el código, pero no llega a la silueta del plano general.

Evidencia:

| Banco | Vecino más cercano medio | Desviación | Coeficiente de variación |
|---|---:|---:|---:|
| Bosque denso | 0,141 u | 0,085 u | 0,606 |
| Cafetal | 0,353 u | 0,164 u | 0,465 |
| Páramo | 0,344 u | 0,190 u | 0,551 |
| Ladera alta | 0,267 u | 0,159 u | 0,596 |

Si 1 u = 1 m, esos centros están demasiado juntos para árboles y arbustos adultos. En las capturas laterales, los yarumos blancos repiten la misma corona y el bosque forma una masa con borde casi continuo. El problema no es equidistancia perfecta; los coeficientes prueban variación. Es falta de distancia mínima y de claros.

Por qué se ve amateur: la aleatoriedad sin ecología se lee como “scatter”. Un bosque real agrupa por sucesión, agua, luz, borde y manejo. La silueta necesita emergentes, claros y ritmos, no solo variación de semilla.

Corrección concreta:

- Reemplazar scatter puro por Poisson disk con distancia mínima por porte. Después de fijar 1 u = 1 m: 2,5-4 u para troncos de dosel, 0,8-1,5 u para arbustos y 0,35-0,7 u para frailejones según edad.
- Reducir 50%-65% las instancias visibles del bosque en el plano general y conservar diversidad por agrupación, no por cantidad.
- Crear tres tipos de vacío: claro de manejo, corredor ripario y borde de regeneración. Deben leerse desde la cámara de reposo.
- Variar silueta de yarumo, no solo escala y rotación. Mostrar el envés blanco como acento discontinuo, no como coronas blancas repetidas.

### Hallazgo 5.2, el suelo domina por repetición

Qué está mal: 4.303 instancias de detalle de suelo equivalen a 71,04% de todas las instancias de la escena. Aunque solo consumen 5,34% de triángulos, cubren visualmente potreros y laderas con la misma unidad vertical repetida.

Evidencia: las cinco bases y los dos ángulos diagnósticos muestran briznas a densidad semejante sobre grandes superficies. La medición de píxel confirma que el tercio bajo tiene hasta 2,47 veces más bordes que el alto sin ganar contraste.

Por qué se ve amateur: el “césped de videojuego” delata escala y algoritmo. El paisaje trabajado debería mostrar pastoreo, barro, rastrojo, suelo pisado, bordes húmedos y crecimiento desigual.

Corrección concreta:

- Aplicar máscaras de exclusión estrictas en senderos, patios, base de casa, corrales y zonas muy pastoreadas.
- Sustituir parte de las briznas por manchas grandes de vertex color y cinco estados de suelo: pastoreado, húmedo, rastrojo, borde alto y tierra pisada.
- Concentrar geometría en primer plano y alrededor de agua; reducirla a cero en cordillera y ladera de fondo.
- Romper la orientación vertical uniforme con bancos acostados por viento y pendiente, sin mover el calendario de clima.

## Elementos intocables

No se recomienda cambiar:

- La existencia ni el horario corto del mar de nubes del amanecer.
- El crepúsculo tropical de aproximadamente 20 minutos.
- La ronda y el comportamiento de Dante y Oliver.
- La luna visible como fuente motivada de la noche.
- La luz cenital ecuatorial del mediodía.

Sí se recomienda ajustar lo que los rodea: escala, relleno, exposición, LOD, niebla, densidad y encuadre. Esos cambios fortalecen los cinco elementos en vez de reemplazarlos.

## Bugs objetivos

No se corrigió arte. No se encontró un material inequívocamente mal asignado ni un z-fighting reproducible que justificara una modificación barata. En el ángulo rasante, los picos de cordillera revelan intersecciones y siluetas triangulares; se clasifican como problema de composición y escala, no como bug aislado.

## Reproducción

```bash
node scripts/diag/inventario-valle-3d.mjs --source /ruta/al/worktree-del-valle --output /tmp/inventario-valle.json
node scripts/diag/encuadre-mundo.mjs valle
node scripts/diag/medir-imagen-valle.mjs base-*.png > /tmp/imagenes-valle.json
node scripts/diag/auditar-valle-runtime.mjs \
  --url http://127.0.0.1:43177/ \
  --output /tmp/valle-runtime.json \
  --capturas /tmp/capturas-valle
```

Para la medición runtime, la copia diagnóstica expuso temporalmente `{ gl, scene, camera }` como `window.__VALLE_AUDITORIA__`. Esa instrumentación no forma parte del arte ni de este commit. El script bloquea service workers y genera las cinco franjas más dos ángulos de mediodía, rasante y contracampo.

## Las cinco correcciones que más mueven la aguja

1. Unificar el shader y la regla de borde: una rampa de tres bandas, una paleta de 12-16 materiales y separación estricta entre habitantes e interfaz.
2. Fijar `1 unidad = 1 metro` y reconstruir escala desde persona, puerta, casa y cordillera, conservando las alturas actuales de Dante y Oliver como anclas.
3. Rehacer solo la composición de cámara y LOD para crear primer plano a 3-7 u, casa a 9-18 u, fondo a más de 25 u, cielo de 15%-25% y terreno alto por debajo de 8%.
4. Reducir el bosque y el suelo repetido: menos 50%-65% de instancias de bosque, distancias mínimas por porte y geometría de suelo solo cerca.
5. Desacoplar relleno de luz principal y definir foco por franja, manteniendo intactos mar de nubes, crepúsculo, luna, mediodía y ronda de perros.
