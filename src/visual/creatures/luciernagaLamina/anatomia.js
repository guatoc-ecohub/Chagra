/**
 * luciernagaLamina/anatomia — la anatomía MEDIDA de `luciernaga.png` (la
 * lámina aprobada del elenco compai, 367×507): la luciérnaga científica DE
 * PIE, frontal ¾, con el lápiz alzado en la mano izquierda (del espectador),
 * el cuaderno abrazado contra el pecho, botas, los élitros desplegados a los
 * dos flancos y la linterna (abdomen-glow) encendida entre las piernas.
 *
 * QUÉ ES ESTO (corte C4, orden del operador 2026-08-19): la PIEL tiene que
 * ser la lámina exacta (nunca redibujada) cortada en capas de rig sobre el
 * esqueleto — extremidades+alas · abdomen-glow separado · cara ·
 * cuerpo-inpaint. Dos reglas duras NUEVAS respecto al corte anterior:
 *   🔴 NO SE CORTA CUELLO NI CABEZA. La testa viaja FUSIONADA al cuerpo
 *      (capa `cuerpo` = cuerpo COMPLETO con cabeza): la costura de cuello
 *      del corte anterior desaparece porque el corte desaparece. La CARA
 *      vive por parches chicos (párpados + mandíbula + interior sintético),
 *      nunca por decapitación.
 *   🔴 CUERPO COMPLETO: si ninguna pieza de encima carga, la capa `cuerpo`
 *      sola ya muestra el bicho entero digno (gate fail-closed).
 *
 * CÓMO SE MIDIÓ (honestidad del método — no ciencia exhaustiva): sobre
 * `luciernaga.png` (367×507, confirmado con el header PNG y `sharp`) se
 * midieron NUMÉRICAMENTE los runs de alfa por fila (bordes externos de las
 * alas = la propia silueta) y A OJO sobre recortes con grilla de coordenadas
 * los contornos internos (ala vs armadura/farol/cuaderno) — el mismo método
 * que documentan `jaguarLamina/anatomia.js` y `piloto-lamina.js`. La
 * garantía dura la da la recomposición offline (0 huecos / 0 déficit /
 * 0 exceso) + el candado vitest que importa las MISMAS fórmulas.
 *
 * LAS PIEZAS (más el cuerpo, que es el resto CON la cabeza):
 *   - alaIzq / alaDer: los élitros con su ala membranosa (su firma de
 *     insecto volador). Viven DEBAJO del cuerpo (emergen de detrás de la
 *     hombrera y del tórax): aletean por giro chico desde la raíz. Cada ala
 *     lleva RESPALDO DE VIAJE: la textura del ala se extiende por dilatación
 *     unos px bajo el contorno que la ocluye (armadura, farol, cuaderno,
 *     brazo) — oculto en reposo, emerge con el giro y el flanco nunca abre
 *     fondo. Ese respaldo es el "cuerpo-inpaint" de este corte: el relleno
 *     viaja con la pieza móvil, no con el fondo (lección del jaguar).
 *   - antenaIzq / antenaDer: las dos antenas filiformes — cajas en X
 *     disjuntas × desvanecido hacia la BASE en la frente. ANTI-HUECO igual
 *     que antes: del cuerpo se restan solo por su parte alta (`baseSub`);
 *     la base queda también en el cuerpo de respaldo.
 *   - mandibula: el mentón DEBAJO de la línea de la sonrisa. Al hablar baja
 *     y revela el interior sintético (BOCA, el único píxel no-lámina).
 *   - manoLapiz: el tarso con el lápiz — caja en X × techo × desvanecido en
 *     la MUÑECA, y ahora EXCLUYE el borde de ataque del ala izquierda (el
 *     corte anterior arrastraba ese filo del élitro al gesticular).
 *   - linterna: el abdomen-glow (su alma) — elipse suave EXCLUYENDO las dos
 *     franjas de PIERNA que la cruzan por delante. LATE por filtro, jamás
 *     se mueve.
 *   - parpados: parches de la propia frente sobre cada ojo (capas.js).
 *   - cuadernoBrazo: NO se corta (abrazado al pecho, identidad de la pose).
 *     Se mueve CON el cuerpo. Las piernas + botas quedan plantadas en el
 *     cuerpo (detrás de ellas no hay píxeles — límite documentado).
 *
 * LÍMITE HONESTO DEL ORDEN Z: donde el codo del brazo del lápiz se mete
 * DETRÁS del élitro izquierdo (~x105-122, y270-290), la lámina pone el ala
 * al frente pero la capa `cuerpo` (con el brazo) pinta ENCIMA del ala-capa.
 * Con el giro chico del aleteo (±2,5°) la inversión es subpíxel a tamaño de
 * avatar; se documenta en vez de disfrazarse.
 *
 * Los pivotes (`pivote`) son puntos en coordenadas de PÍXEL DE LA LÁMINA
 * (0..ANCHO, 0..ALTO), el mismo espacio que usa `capas.js` para las
 * máscaras — el componente los convierte a % del stage para el
 * `transform-origin` CSS.
 *
 * @module visual/creatures/luciernagaLamina/anatomia
 */

export const CARPETA_LAMINA = '/compai/laminas/';
export const ARCHIVO_LAMINA = 'luciernaga.png';
export const ANCHO = 367;
export const ALTO = 507;

/**
 * Los DOS ojos de la cara cartoon (grandes, con ceja pícara). Medidos a ojo
 * sobre el recorte 4×: el blanco del ojo izquierdo (del espectador) va de
 * x140-176 / y127-158 y el derecho de x197-237 / y125-155; el radio toma el
 * ojo completo con su contorno de tinta. Alimentan los parches de párpado
 * (capas.js): piel de la propia frente que baja a tapar el ojo — parpadeo
 * real, nunca un párpado dibujado.
 */
export const OJO = { cx: 158, cy: 142, r: 20 };
export const OJO_2 = { cx: 212, cy: 138, r: 20 };

/**
 * MANDÍBULA / mentón. La línea de la sonrisa (comisuras en ≈(127,167) y
 * ≈(228,166), panza en y≈190) queda ENTERA en el cuerpo: esta pieza es solo
 * lo de DEBAJO del labio inferior — se desvanece hacia arriba en la banda
 * `labio` y hacia abajo en `menton`. El `pivote` es la charnela al centro
 * de la boca: al hablar baja + rota apenas.
 *
 * HONESTIDAD (heredada del jaguar): la lámina es un retrato de BOCA
 * CERRADA sonriendo. Al bajar el mentón se abre un hueco sin píxeles de
 * boca detrás; lo tapa el interior sintético (`BOCA`).
 */
export const MANDIBULA = {
  box: { x0: 130, x1: 224, xFade: 10 },
  labio: { y0: 176, y1: 190 },
  menton: { y0: 202, y1: 216 },
  pivote: [177, 184],
};

/** Centro de la boca para el interior sintético (se convierte a % del stage). */
export const BOCA = { cx: 177, cy: 190, ancho: 70 };

/**
 * ANTENA IZQUIERDA (lado izquierdo de la lámina, x pequeño): el hilo de
 * cuentas que arranca en la frente (base ≈(178,104)) y arquea hasta la
 * punta en ≈(15,45). Caja en X × desvanecido hacia la BASE (opaca arriba,
 * se funde donde nace de la frente). ANTI-HUECO: del cuerpo se resta solo
 * la parte ALTA (`baseSub`); la base queda también en el cuerpo de
 * respaldo, así el giro desde el pivote no abre fondo. Giro CHICO y sin
 * levantar.
 */
export const ANTENA_IZQ = {
  box: { x0: 0, x1: 190, xFade: 8 },
  base: { y0: 96, y1: 114 },
  baseSub: { y0: 76, y1: 94 },
  pivote: [178, 104],
};

/** ANTENA DERECHA (x grande): base ≈(207,102); la punta llega hasta x≈356
 *  (medido por banda de alfa y0-60), por eso la caja abre hasta el borde. */
export const ANTENA_DER = {
  box: { x0: 196, x1: 367, xFade: 8 },
  base: { y0: 94, y1: 112 },
  baseSub: { y0: 74, y1: 92 },
  pivote: [207, 102],
};

/**
 * ALA IZQUIERDA (élitro + ala membranosa del flanco izquierdo del
 * espectador). Medidas:
 *   - `borde` (frente/borde de ataque, puntos [y,x]): separa el ala del
 *     guante/lápiz/brazo — por runs de alfa el frente va de (155,y200) a
 *     (109,y270); bajo y≈292 ya no hay nada a su izquierda (el brazo
 *     terminó) y el frente ES la silueta.
 *   - `interior` (puntos [y,x]): el contorno de tinta contra la armadura
 *     del tórax (x≈137, y212-260) y luego el flanco del farol
 *     (x≈143→172, y296-390); remata en la punta baja (y≈420).
 *   - la silueta externa la pone el propio alfa del PNG (x mínimo ≈91 en
 *     y340-360, punta inferior ≈(125-157, y400-415)).
 * El `pivote` es la RAÍZ del ala bajo la hombrera: el aleteo es giro chico
 * (± pocos grados), nunca traslación.
 */
export const ALA_IZQ = {
  techo: { y0: 206, y1: 218 },
  fondo: { y0: 414, y1: 430 },
  borde: [[200, 152], [220, 131], [240, 119], [262, 110], [292, 99]],
  interior: [[212, 148], [238, 158], [268, 162], [292, 152], [310, 155], [352, 166], [388, 172], [420, 156]],
  pivote: [150, 215],
};

/**
 * ALA DERECHA (flanco derecho): emerge de detrás de la hombrera derecha y
 * del cuaderno. `interior` sigue la armadura (x≈237-241, y212-288), el
 * flanco derecho del farol (x≈257-272, y336-400) y cierra hacia la punta
 * baja (y≈424). La silueta externa (x máximo ≈363 en y370-380) la pone el
 * alfa. El CUADERNO + el guante que lo sujeta se quedan en el cuerpo
 * (CUADERNO_GUANTE los excluye del ala).
 */
export const ALA_DER = {
  techo: { y0: 208, y1: 222 },
  fondo: { y0: 416, y1: 432 },
  interior: [[216, 252], [242, 272], [268, 284], [300, 294], [340, 288], [378, 268], [400, 278], [424, 300]],
  pivote: [252, 220],
};

/**
 * El CUADERNO abrazado + el guante/tarso que lo sujeta: OCLUSOR del ala
 * derecha que se queda en el cuerpo (la pose-identidad no se desarma).
 * `quad` son las 4 esquinas medidas a ojo, en orden horario de pantalla.
 */
export const CUADERNO_GUANTE = {
  quad: [[251, 306], [337, 341], [320, 402], [252, 375]],
};

/**
 * MANO DEL LÁPIZ: el tarso (x≈28-115, y≈198-262) + el lápiz que cruza en
 * diagonal (de ≈(14,212) a ≈(100,187)). Caja en X × desvanecido en la
 * MUÑECA (la pieza es opaca arriba y se funde donde el tarso remata en el
 * antebrazo) × EXCLUSIÓN del borde de ataque del ala izquierda (capas.js:
 * el filo del élitro en x≈109-122/y220-278 era píxel del ala que el corte
 * anterior arrastraba al gesticular). El `pivote` es la muñeca: el gesto
 * es un giro chico (escribe/saluda).
 */
export const MANO_LAPIZ = {
  // x0 negativo = sin desvanecido al borde izquierdo: la punta del lápiz
  // llega hasta x≈2 (medido por banda de alfa y180-280) y a su izquierda
  // no hay nada que separar.
  box: { x0: -10, x1: 122, xFade: 8 },
  // `techo`: la pieza aparece DEBAJO de y≈180 (el lápiz arranca en y≈183).
  // Sin este tope la caja reclamaba el arco de la ANTENA izquierda que pasa
  // por arriba (x52-120, y5-40).
  techo: { y0: 165, y1: 180 },
  muneca: { y0: 252, y1: 278 },
  pivote: [100, 262],
};

/**
 * LA LINTERNA (abdomen-glow, su alma): elipse suave sobre el farol
 * amarillo-verde (x≈162-258, y≈308-458). Las dos franjas de PIERNA que lo
 * cruzan por delante se EXCLUYEN de la pieza (se quedan en el cuerpo): la
 * linterna late por FILTRO (brillo/halo), jamás se mueve — así el latido
 * no arrastra las piernas ni abre huecos. Cada pierna es una banda con
 * borde suave a lo largo del segmento medido (cadera→bota).
 */
export const LINTERNA = { cx: 210, cy: 385, rx: 48, ry: 76 };
// Los segmentos siguen la pierna HASTA el puño de la bota (y≈450): con el
// corte en la rodilla/caña, la elipse medio-reclamaba el puño de la bota
// izquierda y el latido lo habría hecho pulsar.
export const PIERNA_IZQ = { x0: 162, y0: 315, x1: 186, y1: 450, medio: 12 };
export const PIERNA_DER = { x0: 250, y0: 335, x1: 264, y1: 452, medio: 12 };

/**
 * Pivote del CUERPO para la respiración (`llv-respira`): el centro de masa
 * del tórax acorazado, entre los hombros (~y230) y la cadera (~y340).
 */
export const CUERPO_PIVOTE = [195, 290];

export default {
  CARPETA_LAMINA,
  ARCHIVO_LAMINA,
  ANCHO,
  ALTO,
  OJO,
  OJO_2,
  MANDIBULA,
  BOCA,
  ANTENA_IZQ,
  ANTENA_DER,
  ALA_IZQ,
  ALA_DER,
  CUADERNO_GUANTE,
  MANO_LAPIZ,
  LINTERNA,
  PIERNA_IZQ,
  PIERNA_DER,
  CUERPO_PIVOTE,
};
