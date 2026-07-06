/**
 * almacenamientoCalculator — lógica DETERMINISTA y datos GROUNDED de la mini-app
 * "Almacenamiento y Conservación de Alimentos" (mundo Mercado y despensa).
 *
 * EXTIENDE / absorbe poscosechaCalculator.js: la poscosecha ya cubre cosechar en
 * punto, secar el grano a humedad segura, curado, daño por frío y transformación
 * (mermeladas, panela, queso, café). Este módulo profundiza en lo que faltaba:
 *   1. ESTRUCTURAS de almacenamiento (troja, silo metálico hermético,
 *      ferrocemento) con capacidad y densidad de llenado + métodos tradicionales.
 *   2. CONSERVAR (salado, ahumado, fermentación, conserva) con el UMBRAL DE
 *      BOTULISMO (pH 4,6 / olla a presión) — el mensaje de seguridad más duro.
 *   3. PLAGAS DE ALMACÉN a nivel de especie + control físico sin veneno.
 *   4. MICOTOXINAS (aflatoxinas, fumonisinas) con límites y señales de descarte.
 *
 * Filosofía (inviolable, alineada con poscosechaCalculator.js / soilDiagnostic.js):
 *   - La MATEMÁTICA es determinista y estándar (proporción, geometría, balance).
 *     Se calcula, no se inventa.
 *   - Los PARÁMETROS de referencia salen del deep research con su fuente y nivel
 *     de confianza. Lo que el DR marca "sin respaldo suficiente" (límites exactos
 *     de la Resolución 4506/2013, parámetros de salado/ahumado, dosis 10:1 de
 *     ceniza) va como GROUNDED-PENDIENTE honesto — NUNCA inventado.
 *   - El botulismo es riesgo de muerte: cero ambigüedad, autoridad INSTITUCIONAL
 *     (CDC / USDA / INVIMA), jamás como opinión de una persona.
 *
 * Grounding:
 *   - deepresearch/2026-07-04-almacenamiento-conservacion-alimentos-TRIPLE.md
 *   - deepresearch/2026-07-04-poscosecha-conservacion-nacional-CO.md
 *   - deepresearch/2026-07-04-postharvest-storage-international.md
 */

/* ═══════════════ 1. PÉRDIDA POR MÉTODO — el gancho (proporción exacta) ═══════
 * Ensayo Guanajuato (México, SciELO Agrociencia): silo hermético vs
 * almacenamiento tradicional del agricultor sobre el MISMO lote de grano seco.
 *   - Pérdida: 3,94 % (hermético) vs 16,58 % (tradicional).
 *   - Germinación de la semilla: cae ~15 % en 6 meses dentro del silo vs ~50 %
 *     fuera.
 * Mecanismo: la respiración de grano e insectos sube el CO₂ y baja el O₂ hasta
 * matar la plaga SIN químico. Requisito indispensable: grano ≤ 12 % de humedad.
 * La aritmética (cantidad × tasa) es exacta; las tasas son grounded (R5).
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Tasas de pérdida y germinación por método de guardado de grano seco.
 * Confianza ALTA (ensayo controlado); cifra de México, análoga y aplicable a
 * Colombia (el DR pide un dato colombiano equivalente si aparece).
 */
export const PERDIDA_ALMACENAMIENTO = {
  tradicional: { label: 'Bodega o costal tradicional', perdidaPorc: 16.58, germinacionCaidaPorc: 50 },
  hermetico: { label: 'Silo metálico o bolsa hermética', perdidaPorc: 3.94, germinacionCaidaPorc: 15 },
  humedadMaxima: 12, // % — requisito para el hermético
  fuente: 'SciELO México (Agrociencia), Guanajuato; DR TRIPLE §1.3',
  confianza: 'alta',
};

/**
 * Compara cuánto grano se pierde guardando tradicional vs hermético, sobre una
 * cantidad dada. Proporción exacta: perdido = cantidad × tasa/100.
 *
 * @param {number|string} cantidad  Cantidad de grano seco (misma unidad de salida).
 * @returns {null | {
 *   cantidad: number,
 *   perdidaTradicional: number,
 *   perdidaHermetico: number,
 *   granoSalvado: number,
 *   puntosMenos: number,
 * }}  null si la cantidad no es válida (> 0).
 */
export function calcularPerdidaAlmacenamiento(cantidad) {
  const q = num(cantidad);
  if (q == null || q <= 0) return null;
  const perdidaTradicional = (q * PERDIDA_ALMACENAMIENTO.tradicional.perdidaPorc) / 100;
  const perdidaHermetico = (q * PERDIDA_ALMACENAMIENTO.hermetico.perdidaPorc) / 100;
  return {
    cantidad: redondear(q, 2),
    perdidaTradicional: redondear(perdidaTradicional, 2),
    perdidaHermetico: redondear(perdidaHermetico, 2),
    granoSalvado: redondear(perdidaTradicional - perdidaHermetico, 2),
    puntosMenos: redondear(
      PERDIDA_ALMACENAMIENTO.tradicional.perdidaPorc - PERDIDA_ALMACENAMIENTO.hermetico.perdidaPorc,
      2,
    ),
  };
}

/* ═══════════════ 2. ESTRUCTURAS Y CAPACIDAD — geometría × densidad ═══════════
 * FAO x5050s: densidad de llenado por grano (kg/m³), capacidad de la troja
 * (450–500 kg de mazorca/m³) y de los silos. La geometría (volumen) es exacta;
 * las densidades son grounded (R1).
 * ────────────────────────────────────────────────────────────────────────── */

/** Densidad de llenado del grano suelto (kg/m³). Confianza ALTA — FAO x5050s. */
export const DENSIDAD_LLENADO = {
  maiz: { label: 'Maíz', rango: [680, 740], medio: 710 },
  arroz: { label: 'Arroz cáscara', rango: [500, 630], medio: 565 },
  trigo: { label: 'Trigo', rango: [740, 840], medio: 790 },
  frijol: { label: 'Fríjol', rango: [760, 800], medio: 780 },
};

/** Capacidad de la troja: mazorca ventilada (no grano suelto). FAO x5050s. */
export const TROJA_KG_MAZORCA_M3 = 475; // punto medio de 450–500 kg/m³

/**
 * Ancho máximo recomendado de la troja según la humedad relativa del clima
 * (para que ventile y la mazorca no se enmohezca). FAO x5050s. Confianza ALTA.
 */
export const TROJA_ANCHO_POR_CLIMA = [
  { hrMin: 80, anchoCm: 60, clima: 'muy húmedo (HR ≥ 80 %)' },
  { hrMin: 75, anchoCm: 100, clima: 'húmedo (HR 75–80 %)' },
  { hrMin: 0, anchoCm: 150, clima: 'semihúmedo (HR < 75 %)' },
];

/**
 * Ancho máximo de troja recomendado para una HR dada. Determinista.
 * @param {number|string} hr  Humedad relativa del clima (%).
 * @returns {null | { anchoCm: number, clima: string }}
 */
export function anchoTrojaRecomendado(hr) {
  const h = num(hr);
  if (h == null || h < 0 || h > 100) return null;
  const regla = TROJA_ANCHO_POR_CLIMA.find((r) => h >= r.hrMin);
  return regla ? { anchoCm: regla.anchoCm, clima: regla.clima } : null;
}

/** Fichas de estructura (capacidad por tamaño). FAO x5050s / CIMMYT. */
export const ESTRUCTURAS = [
  {
    id: 'troja',
    titulo: 'Troja / troje (para mazorca)',
    resumen: 'Estructura ventilada para mazorca con cáscara, no para grano suelto. Barata (troncos, tablas, alambre).',
    parametro: 'Capacidad ~450–500 kg de mazorca por m³. Entre más húmedo el clima, MÁS ANGOSTA (60 cm si HR ≥ 80 %).',
    ejemplo: 'Ejemplo 4 m × 0,60 m × 1,80 m ≈ 2,1 t de mazorca ≈ 1,8 t de grano.',
    fuente: 'FAO x5050s; DR TRIPLE §1.1',
    confianza: 'alta',
  },
  {
    id: 'silo_metalico',
    titulo: 'Silo metálico hermético (familiar)',
    resumen: 'La tecnología estrella para el pequeño productor: mata el gorgojo sin veneno. Requisito indispensable: grano seco (≤ 12 % de humedad).',
    parametro: 'Capacidades típicas 1,4 m³ (3 hojas), 2,4 m³ (4 hojas), 3,9 m³ (5 hojas, máximo). Base sobre piedra/cemento y tapaderas obturadas.',
    ejemplo: 'Baja la pérdida de ~16,6 % a ~3,9 % y conserva la germinación. Guarda maíz y fríjol por años.',
    fuente: 'FAO x5050s / CIMMYT / SciELO; DR TRIPLE §1.3',
    confianza: 'alta',
  },
  {
    id: 'ferrocemento',
    titulo: 'Silo de ferrocemento (comunitario)',
    resumen: 'Para excedente familiar o comunitario de mayor volumen. Curar/secar la estructura al menos mes y medio antes de llenarla.',
    parametro: 'Capacidad por diámetro: 1 m Ø ≈ 900 kg · 2 m Ø ≈ 6,6 t · 3 m Ø ≈ 22,4 t de maíz. Tapa hermética con neumático de bicicleta viejo.',
    ejemplo: 'Piso en declive hacia el tubo de salida (≥ 15 cm de diámetro).',
    fuente: 'FAO x5050s; DR TRIPLE §1.4',
    confianza: 'media-alta',
  },
];

/**
 * Capacidad de una estructura de almacenamiento. Geometría exacta × densidad
 * grounded.
 *   - troja:         volumen (largo×ancho×alto en m) × 475 kg mazorca/m³.
 *   - silo cilíndrico: volumen (π (d/2)² × alto) × densidad del grano suelto.
 *
 * @param {Object} p
 * @param {string} p.forma            'troja' | 'silo' (otro valor → null)
 * @param {number|string} [p.largo]     m (troja)
 * @param {number|string} [p.ancho]     m (troja)
 * @param {number|string} [p.alto]      m (ambas)
 * @param {number|string} [p.diametro]  m (silo)
 * @param {string} [p.grano]            clave de DENSIDAD_LLENADO (silo); inválida → null
 * @returns {null | { volumenM3: number, capacidadKg: number, densidad: number }}
 */
export function calcularCapacidad({ forma, largo, ancho, alto, diametro, grano }) {
  const a = num(alto);
  if (a == null || a <= 0) return null;

  if (forma === 'troja') {
    const l = num(largo);
    const w = num(ancho);
    if (l == null || l <= 0 || w == null || w <= 0) return null;
    const volumen = l * w * a;
    return {
      volumenM3: redondear(volumen, 3),
      capacidadKg: redondear(volumen * TROJA_KG_MAZORCA_M3, 0),
      densidad: TROJA_KG_MAZORCA_M3,
    };
  }

  if (forma === 'silo') {
    const d = num(diametro);
    if (d == null || d <= 0) return null;
    const info = DENSIDAD_LLENADO[grano];
    if (!info) return null;
    const volumen = Math.PI * (d / 2) ** 2 * a;
    return {
      volumenM3: redondear(volumen, 3),
      capacidadKg: redondear(volumen * info.medio, 0),
      densidad: info.medio,
    };
  }

  return null;
}

/**
 * Métodos tradicionales de bajo costo, verificados y SIN químicos peligrosos.
 * Sirven cuando no hay silo metálico. La dosis 10:1 de ceniza/cal está
 * respaldada por INIAP (Ecuador) pero FALTA una ficha AGROSAVIA/ICA colombiana
 * → se marca grounded-pendiente para no emitirla como norma dura.
 */
export const METODOS_TRADICIONALES = [
  {
    id: 'ceniza_cal',
    titulo: 'Ceniza o cal (polvo de recubrimiento)',
    como: 'Mezcle el grano con ceniza de leña o cal apagada hasta cubrirlo.',
    porque: 'El polvo abrasa y deshidrata al insecto y tapa los espacios donde pone huevos. Mismo principio físico que la tierra de diatomeas. No deja residuo tóxico.',
    dosis: '~10 libras de grano por 1 libra de cal o ceniza (relación 10:1)',
    fuente: 'INIAP (Ecuador); DR TRIPLE §2',
    confianza: 'media-alta',
    pendiente: 'La dosis 10:1 la respalda INIAP; falta una ficha AGROSAVIA/ICA colombiana que la confirme para nuestras condiciones.',
  },
  {
    id: 'frasco_o2',
    titulo: 'Frasco hermético con el oxígeno quemado',
    como: 'Humedezca un algodón con alcohol, préndalo y métalo un instante en el frasco de grano antes de taparlo.',
    porque: 'El fuego consume el oxígeno y los insectos mueren por asfixia. Es el mismo principio del silo hermético, en pequeño.',
    dosis: null,
    fuente: 'Red de Guardianes de Semillas; DR TRIPLE §2',
    confianza: 'media',
    pendiente: null,
  },
  {
    id: 'aceite',
    titulo: 'Película de aceite vegetal',
    como: 'Una capa fina de aceite sobre el fríjol o el maíz.',
    porque: 'Impide que el insecto deposite huevos en la superficie del grano.',
    dosis: null,
    fuente: 'Red de Guardianes de Semillas; DR TRIPLE §2',
    confianza: 'media',
    pendiente: null,
  },
  {
    id: 'arena_pondo',
    titulo: 'Arena seca y pondos de barro',
    como: 'Estratifique grano y arena fina seca; o guarde la semilla en vasija de barro parcialmente enterrada.',
    porque: 'La arena hace barrera física a la oviposición; el pondo enterrado da un ambiente estable y fresco que conserva la semilla.',
    dosis: null,
    fuente: 'Red de Guardianes de Semillas (etnográfico); DR TRIPLE §2',
    confianza: 'media',
    pendiente: null,
  },
];

/* ═══════════════ 3. CONSERVAR — botulismo (el umbral crítico del módulo) ═════
 * Triangulado CDC + USDA-FSIS + NCHFP (Univ. de Georgia). pH 4,6 es la línea de
 * vida: Clostridium botulinum no crece ni forma toxina a pH ≤ 4,6. Autoridad
 * INSTITUCIONAL, jamás opinión de una persona.
 * ────────────────────────────────────────────────────────────────────────── */

/** El umbral y las dos rutas de conserva. Confianza ALTA (3 autoridades). */
export const GUARD_BOTULISMO = {
  phLinea: 4.6,
  acido: {
    label: 'Alimentos ÁCIDOS (pH ≤ 4,6)',
    ejemplos: 'frutas, mermeladas, encurtidos, tomate acidificado',
    metodo: 'Baño de agua hirviendo (100 °C)',
    detalle: 'Se pueden procesar al baño maría por el tiempo indicado. El bajo pH impide que la bacteria crezca.',
  },
  pocoAcido: {
    label: 'Alimentos POCO ÁCIDOS (pH > 4,6)',
    ejemplos: 'todas las verduras, maíz, fríjol, carnes, aves, pescado',
    metodo: 'SOLO olla a presión (116–121 °C, 10–15 PSI)',
    detalle: 'Las ESPORAS de Clostridium botulinum sobreviven al agua hirviendo. Al baño maría (sin olla a presión) dan botulismo: es peligro de MUERTE.',
  },
  reglaOro: 'Un fríjol, una arveja o un trozo de carne en frasco "al baño maría" es peligro de muerte. Esto no es opinión: lo dicen el CDC, la USDA y el INVIMA.',
  autoridad: 'CDC / USDA-FSIS / NCHFP (Univ. de Georgia) / INVIMA',
  fuente: 'CDC + USDA-FSIS + NCHFP; DR TRIPLE §3.3',
  confianza: 'alta',
};

/**
 * Clasifica una conserva por su pH y devuelve el método SEGURO y obligatorio.
 * Determinista, atado directo a la regla de inocuidad (no inventa).
 *
 * @param {number|string} ph  pH medido de la preparación.
 * @returns {null | {
 *   clase: 'acido' | 'poco_acido',
 *   label: string,
 *   metodo: string,
 *   critico: boolean,
 *   mensaje: string,
 * }}
 */
export function clasificarAcidezConserva(ph) {
  const v = num(ph);
  if (v == null || v < 0 || v > 14) return null;
  if (v <= GUARD_BOTULISMO.phLinea) {
    return {
      clase: 'acido',
      label: GUARD_BOTULISMO.acido.label,
      metodo: GUARD_BOTULISMO.acido.metodo,
      critico: false,
      mensaje: `pH ${v} ≤ 4,6: es ácido. Puede procesarlo al ${GUARD_BOTULISMO.acido.metodo.toLowerCase()}.`,
    };
  }
  return {
    clase: 'poco_acido',
    label: GUARD_BOTULISMO.pocoAcido.label,
    metodo: GUARD_BOTULISMO.pocoAcido.metodo,
    critico: true,
    mensaje: `pH ${v} > 4,6: es poco ácido. ${GUARD_BOTULISMO.pocoAcido.metodo}. Al baño maría es peligro de MUERTE por botulismo.`,
  };
}

/**
 * Métodos de conservación (fuera del enlatado). El salado/ahumado usa fuentes
 * artesanales → parámetros GROUNDED-PENDIENTE; el ahumado casero de cárnicos se
 * encuadra con advertencia institucional. La fermentación queda del lado ácido.
 */
export const CONSERVACION = [
  {
    id: 'secado',
    titulo: 'Secado / deshidratado',
    resumen: 'Quitar el agua frena hongos y bacterias. Es la conservación más barata y universal.',
    parametro: 'Deje el producto a < 12 % de humedad (actividad de agua aw < 0,50) y empáquelo sellado.',
    fuente: 'DR nacional §5.1; DR TRIPLE §5',
    confianza: 'media-alta',
    pendiente: null,
  },
  {
    id: 'salado',
    titulo: 'Salado y salazón (carne, pescado)',
    resumen: 'La sal reduce el agua disponible e impide el desarrollo de patógenos. En seco (bacalao) o en salmuera.',
    parametro: 'Contenido de sal reportado 2–4 %; salmuera de curación 18–23 %, pieza ~2 h antes de secar.',
    fuente: 'Fuentes artesanales; DR TRIPLE §3.1–3.2',
    confianza: 'media',
    pendiente: 'Los parámetros de salado (18–23 % salmuera, 2–4 % sal, ~2 h) son de fuentes gastronómicas, no institucionales. Verifique con guía FAO/INVIMA antes de usarlos como receta.',
  },
  {
    id: 'ahumado',
    titulo: 'Ahumado',
    resumen: 'Se combina con el salado. Use humo de maderas NO resinosas (roble, haya, laurel); nunca pino.',
    parametro: 'Contenido de sal 2–4 %.',
    fuente: 'Fuentes artesanales; DR TRIPLE §3.2',
    confianza: 'media',
    pendiente: 'El ahumado casero de cárnicos SIN control de curado y temperatura tiene riesgo de Clostridium botulinum. Remítase a la autoridad sanitaria (INVIMA / BPM); no es una receta "de una persona".',
  },
  {
    id: 'fermentacion',
    titulo: 'Fermentación láctica (encurtidos, chucrut)',
    resumen: 'Sal + descenso de pH por el ácido láctico. El producto queda ÁCIDO, así que es seguro al baño maría.',
    parametro: 'Sal 1,5–2,5 % en salmuera; acidez final ≥ 2 %; chucrut ~22 días a temperatura ambiente. Se puede pasteurizar para alargar la vida de anaquel.',
    fuente: 'Infoagro / IFAPA / FAO; DR TRIPLE §3.4',
    confianza: 'media-alta',
    pendiente: null,
  },
];

/* ═══════════════ 4. PLAGAS DE ALMACÉN — especie, daño y control sin veneno ═══
 * FAO / literatura arbitrada. Ciclo huevo→adulto 23–40 días en clima cálido:
 * una infestación explota rápido. A nivel mundial 5–10 % de la producción se
 * pierde por insectos de almacén.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Plagas de almacén a nivel de ESPECIE (primarias perforan grano sano = peor;
 * secundarias aprovechan grano roto o harina). Confianza media-alta a alta.
 */
export const PLAGAS_ALMACEN = [
  { id: 'sitophilus_zeamais', especie: 'Sitophilus zeamais', comun: 'Gorgojo del maíz', tipo: 'primaria', producto: 'Maíz, arroz, sorgo', danio: '30–40 % de pérdida en maíz almacenado en Latinoamérica.', fuente: 'DR TRIPLE §4.1 (R20)' },
  { id: 'prostephanus', especie: 'Prostephanus truncatus', comun: 'Taladrador mayor de los granos', tipo: 'primaria', producto: 'Maíz en mazorca, yuca seca', danio: 'La más grave: 9–45 % en maíz y hasta 100 % en yuca seca. Barrena y deja polvo. Desgranar antes de guardar.', fuente: 'DR TRIPLE §4.1 (R21,R22)' },
  { id: 'brúquidos_frijol', especie: 'Acanthoscelides obtectus / Zabrotes subfasciatus', comun: 'Gorgojos del fríjol', tipo: 'primaria', producto: 'Fríjol', danio: '~35 % de pérdida en México/Centroamérica. Guardado en vaina protege ~3 meses.', fuente: 'DR TRIPLE §4.1 (R23,R24)' },
  { id: 'sitotroga_rhyzopertha', especie: 'Sitotroga cerealella / Rhyzopertha dominica', comun: 'Polilla y barrenador menor de los granos', tipo: 'primaria', producto: 'Cereales', danio: 'La larva se desarrolla dentro del grano; producen mucho polvo.', fuente: 'DR TRIPLE §4.1 (R19,R25)' },
  { id: 'plodia_tribolium', especie: 'Plodia interpunctella / Tribolium spp.', comun: 'Polilla india y escarabajo de la harina', tipo: 'secundaria', producto: 'Harinas, grano quebrado, frutos secos', danio: 'Aprovechan grano ya roto o molido; hasta ~10 % de pérdida en bodega.', fuente: 'DR TRIPLE §4.1 (R19,R25)' },
];

/**
 * Control físico sin químicos peligrosos, en ESCALERA DE COSTO (primero lo
 * barato). Confianza alta salvo el control biológico (línea de I+D en Colombia).
 */
export const CONTROL_PLAGAS = [
  { id: 'hermeticidad', titulo: 'Hermeticidad (silo / bolsa)', como: 'Grano seco (≤ 12 %) en recipiente bien tapado.', porque: 'El O₂ baja y el CO₂ sube: la plaga muere sin químico. Es la primera línea.', costo: 'gratis–barato', confianza: 'alta' },
  { id: 'ceniza_diatomeas', titulo: 'Ceniza / cal o tierra de diatomeas', como: 'Espolvoree sobre el grano. Diatomeas: 0,25–2 g por kg de grano.', porque: 'Abrasa la cutícula y deshidrata al insecto. FALLA con humedad relativa alta: funciona en grano y ambiente SECOS.', costo: 'barato', confianza: 'alta' },
  { id: 'calor_solar', titulo: 'Calor solar (asoleo en capa fina)', como: 'Tienda el grano al sol en capa delgada sobre tendal.', porque: '≥ 50 °C es letal: el gorgojo del maíz adulto muere ~5 min a 50 °C. Desinfesta y seca gratis.', costo: 'gratis', confianza: 'alta' },
  { id: 'frio', titulo: 'Frío / congelación', como: '−18 a −20 °C.', porque: 'Mata el gorgojo: grano desnudo ~8 min, empacado ~100 min. Los insectos no se reproducen fuera de 0–45 °C.', costo: 'medio', confianza: 'media-alta' },
  { id: 'biologico', titulo: 'Control biológico', como: 'Depredador Teretrius nigrescens contra Prostephanus; hongo Beauveria bassiana contra gorgojos del fríjol.', porque: 'Documentado en investigación (África/LatAm). Trátelo como línea de I+D, sin despliegue masivo en Colombia todavía.', costo: 'I+D', confianza: 'media' },
  { id: 'higiene', titulo: 'Higiene preventiva (transversal, gratis)', como: 'Limpie y desinfecte la bodega/silo ANTES de llenar; desgrane el maíz antes de guardar; inspeccione buscando polvo, calor y grano perforado.', porque: 'Elimina los focos de la cosecha anterior. La señal de infestación activa es polvo + calor + grano perforado.', costo: 'gratis', confianza: 'alta' },
];

/* ═══════════════ 5. MICOTOXINAS — veneno invisible con límite legal ═════════
 * La defensa #1 es secar y guardar seco. Aquí van los productores del hongo, los
 * límites y las señales de descarte. Los límites colombianos exactos (Res.
 * 4506/2013) provienen de fuentes secundarias → GROUNDED-PENDIENTE.
 * ────────────────────────────────────────────────────────────────────────── */

export const MICOTOXINAS = [
  {
    id: 'aflatoxinas',
    titulo: 'Aflatoxinas (Aspergillus)',
    hongo: 'Aspergillus flavus, A. parasiticus, A. nomius',
    donde: 'Maíz y MANÍ húmedos y calientes (el caso clásico).',
    defensa: 'Seque por debajo de 13 % de humedad y guarde seco: el crecimiento de moho es despreciable.',
    fuente: 'INS Colombia; DR TRIPLE §6.1',
    confianza: 'alta',
  },
  {
    id: 'fumonisinas',
    titulo: 'Fumonisinas (Fusarium verticillioides)',
    hongo: 'Fusarium verticillioides',
    donde: 'Maíz — predomina en el almacenamiento (incidencia media 15–17 %).',
    defensa: 'Mantenga la humedad por debajo de 12 % para frenar la producción de toxina.',
    fuente: 'SciELO; DR TRIPLE §6.2',
    confianza: 'media',
  },
];

/**
 * Límites legales de micotoxinas. El Codex (maní 15 µg/kg; leche M1 0,5 µg/kg)
 * es GROUNDED (confianza alta). Los límites colombianos (Res. 4506/2013) son
 * GROUNDED-PENDIENTE: cifras de fuente secundaria; falta leer el texto primario.
 */
export const LIMITES_MICOTOXINA = [
  {
    id: 'codex_mani',
    ambito: 'Codex Alimentarius (internacional)',
    detalle: 'Aflatoxinas totales en maní/frutos secos para procesamiento: 15 µg/kg. Aflatoxina M1 en leche: 0,5 µg/kg.',
    fuente: 'FAO / Codex CXS 193-1995; DR TRIPLE §6.1',
    confianza: 'alta',
    pendiente: false,
  },
  {
    id: 'colombia_4506',
    ambito: 'Colombia (Resolución 4506 de 2013 / NTC 3581)',
    detalle: 'Maíz de consumo humano: AFB1 ≤ 5 µg/kg y aflatoxinas totales ≤ 10 µg/kg. Fumonisinas ≤ 4 mg/kg para consumo humano.',
    fuente: 'MinSalud Res. 4506/2013 (fuente secundaria); DR TRIPLE §6.1–6.2, §9',
    confianza: 'media',
    pendiente: true,
  },
];

/** Señales de descarte: si aparecen, NO consumir ni vender. Confianza alta. */
export const SENALES_DESCARTE = [
  'Moho visible: polvo verde-amarillento (Aspergillus) o blanco-rosado (Fusarium).',
  'Grano decolorado, apelmazado o "terroso".',
  'Olor a humedad, moho o rancio.',
  'El grano "se calienta" en el montón o el silo (hay hongos e insectos activos).',
];

/** Nota dura de honestidad: la aflatoxina no siempre se ve ni se huele. */
export const MICOTOXINA_NOTA = 'La aflatoxina no siempre se ve ni se huele. Por eso la prevención (secar a < 13 % y guardar seco) manda sobre la inspección.';

/* ═══════════════ 6. VIDA ÚTIL — producto × método × condición ═══════════════
 * No es un número único. Consolidado del DR (cada fila trazable). Confianza media
 * salvo indicación; varía por variedad, clima y estado del lote.
 * ────────────────────────────────────────────────────────────────────────── */

export const VIDA_UTIL = [
  { producto: 'Maíz / fríjol (grano seco)', metodo: 'Silo o bolsa hermética', vida: 'Años', condicion: 'Grano a 12–13 % de humedad, hermético', fuente: 'DR TRIPLE §5' },
  { producto: 'Maíz / fríjol (grano seco)', metodo: 'Bodega / costal abierto', vida: 'Meses (pérdida > 5 %/año)', condicion: 'Fresco, seco, ventilado', fuente: 'DR previo' },
  { producto: 'Fríjol en vaina', metodo: 'Guardado en vaina (zona húmeda)', vida: '~3 meses', condicion: 'Protege del gorgojo Zabrotes', fuente: 'DR TRIPLE §5' },
  { producto: 'Cebolla (curada seca)', metodo: 'Frío o ambiente seco', vida: '6–9 meses', condicion: '0–4 °C, HR baja 65–80 %', fuente: 'DR TRIPLE §5' },
  { producto: 'Zanahoria madura', metodo: 'Refrigeración húmeda', vida: 'Hasta 6 meses', condicion: '0–1 °C, HR 95–98 %', fuente: 'DR TRIPLE §5' },
  { producto: 'Yuca fresca', metodo: 'Refrigerada en bolsa', vida: '~10 días', condicion: 'Frío + barrera de humedad', fuente: 'DR TRIPLE §5' },
  { producto: 'Yuca', metodo: 'Trozos congelados', vida: '3+ meses', condicion: 'Congelación', fuente: 'DR TRIPLE §5' },
  { producto: 'Deshidratados (fruta/hortaliza)', metodo: 'Empaque sellado', vida: 'Meses a años', condicion: '< 12 % humedad, aw < 0,50', fuente: 'DR previo' },
  { producto: 'Encurtido fermentado', metodo: 'Frasco, opcional pasteurizado', vida: 'Meses', condicion: 'Sal 1,5–2,5 %, acidez ≥ 2 %', fuente: 'DR TRIPLE §3.4' },
];

/* ═══════════════ 7. MAGNITUD / GANCHO ═══════════════════════════════════════ */

/** El argumento de venta del módulo (cifra contundente del silo). */
export const GANCHO_ALMACENAMIENTO = {
  perdidaTradicional: 16.58,
  perdidaHermetico: 3.94,
  puntosMenos: 12.64,
  perdidaMundialPlagas: '5–10 %',
  fuente: 'SciELO México / FAO; DR TRIPLE §1.3, §4',
  confianza: 'alta',
};

/* ────────────────────────────── utilidades ──────────────────────────────── */

/** Convierte a número aceptando coma decimal; null si no es finito. */
function num(s) {
  if (s === '' || s == null) return null;
  const n = Number.parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Redondeo estable a n decimales. */
function redondear(x, n) {
  const f = 10 ** n;
  return Math.round(x * f) / f;
}
