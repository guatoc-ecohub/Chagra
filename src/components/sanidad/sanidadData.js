/*
 * i18n (ADR-050): copy campesino en español Colombia, pendiente de migrar a
 * src/config/messages.js — mismo criterio que mundosFinca.js / DashboardLive.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * sanidadData — el corazón de la mini-app "Sanidad de la mata".
 *
 * Mapea el SÍNTOMA FOLK que dice el campesino ("gota", "candelilla", "polvillo",
 * "se seca de la punta") → la CAUSA (binomio) → el MANEJO AGROECOLÓGICO
 * (biopreparado / control biológico / cultural) → el UMBRAL si existe.
 *
 * GROUNDING (fuentes verificadas, DR 2026-07-04):
 *   · deepresearch/2026-07-04-sanidad-fitopatologia-folk-nacional-CO.md (AGROSAVIA,
 *     ICA, Cenicafé, SciELO Colombia) — tabla §4 graph-ready.
 *   · deepresearch/2026-07-04-ipm-pest-disease-international.md (FAO, CABI, IPM).
 *
 * REGLA ANTI-ALUCINACIÓN (inviolable):
 *   1. Ninguna arista síntoma→causa sin fuente citada (campo `fuente`).
 *   2. La polisemia regional se marca (`pregunta`) y NUNCA se cierra sin
 *      preguntar el cultivo ("candelilla"/"viruela") o el detalle del síntoma.
 *   3. "Amarillamiento" es la entrada peligrosa → desambiguación FORZADA
 *      (`ambigua: true`), nunca un solo binomio de una.
 *   4. Cifras de fuente única o confianza baja se presentan SUAVE (`notaSuave`),
 *      nunca como dato duro (ej. "96% control neem+Beauveria" → "buen control").
 *   5. Las DOSIS exactas de biopreparados quedan como GROUNDED-PENDIENTE
 *      (`dosisPendiente: true`) — el DR no las transcribió para no inventar.
 *
 * `confianza`: alta (fuente institucional/par directa) | media (secundaria o
 * polisemia acotada) | baja (mapeo variable, requiere desambiguar).
 * `tipo`: hongo | oomiceto | bacteria | virus | insecto | nematodo | complejo |
 *         deficiencia.
 */

/* ── Diccionario de CAUSAS (binomio + manejo por los 3 pilares) ──────────────
   Keyed por id para que síntomas polisémicos y guías reutilicen la misma causa
   sin duplicar (una causa, una fuente). */
export const CAUSAS = {
    phytophthora_infestans: {
        binomio: 'Phytophthora infestans',
        nombreComun: 'gota / tizón tardío',
        tipo: 'oomiceto',
        manejo: {
            biopreparado: 'Caldo bordelés (sulfato de cobre + cal), preventivo, antes de que llegue la humedad.',
            biologico: null,
            cultural: 'Variedades tolerantes (Pastusa Suprema, ICA Única), buen drenaje, eliminar focos y guiarse por el aviso de clima.',
        },
        umbral: 'Preventivo/climático: aplicar ANTES de la humedad + tiempo fresco (12–18 °C), no cuando ya está la mancha.',
        prevencion: 'Semilla/tubérculo sano, no sembrar en lo encharcado, aireación entre matas.',
        confianza: 'alta',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
    },
    alternaria_solani: {
        binomio: 'Alternaria solani',
        nombreComun: 'tizón temprano / candelilla temprana',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Caldo bordelés preventivo.',
            biologico: null,
            cultural: 'Rotación, nutrición equilibrada y retirar las hojas viejas de abajo. Sube en tiempo de sequía y calor.',
        },
        umbral: 'Preventivo; vigile más en sequía + calor (ahí reemplaza a la gota).',
        prevencion: 'No mojar el follaje de noche, quitar residuos de la cosecha anterior.',
        confianza: 'alta',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
    },
    mycena_citricolor: {
        binomio: 'Mycena citricolor',
        nombreComun: 'ojo de gallo / gotera',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Té de vermicompost (bioinsumo supresor documentado).',
            biologico: null,
            cultural: 'Regular la sombra (el EXCESO de sombra lo favorece), distancias amplias, almácigos sanos y buena nutrición.',
        },
        umbral: 'Preventivo, al inicio del período húmedo.',
        prevencion: 'Semilla certificada, controlar arvenses y mejorar la aireación del cafetal.',
        confianza: 'alta',
        fuente: 'Cenicafé',
        dosisPendiente: true,
    },
    cercospora_coffeicola: {
        binomio: 'Cercospora coffeicola',
        nombreComun: 'mancha de hierro',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Caldo bordelés oportuno si la incidencia sube.',
            biologico: null,
            cultural: 'Es MARCADOR de déficit y de sol: dé sombra, materia orgánica al sustrato, buena nutrición y controle nematodos.',
        },
        umbral: 'Preventivo — aparece cuando la hoja se estresa por sol o falta de nutrición.',
        prevencion: 'Semilla seleccionada, sustratos con materia orgánica, sombra en el almácigo.',
        confianza: 'alta',
        fuente: 'Cenicafé',
        dosisPendiente: true,
    },
    hemileia_vastatrix: {
        binomio: 'Hemileia vastatrix',
        nombreComun: 'roya del café',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Cobre (caldo bordelés) como complemento preventivo.',
            biologico: null,
            cultural: 'La palanca #1 es la GENÉTICA: variedades resistentes Castillo® o Colombia (Cenicafé). Nutrición y regular sombra.',
        },
        umbral: 'Manejo por incidencia + resistencia genética; aplicar cobre oportuno.',
        prevencion: 'Renovar con variedad resistente, nutrición completa, no dejar el lote sobre-sombreado.',
        confianza: 'alta',
        fuente: 'Cenicafé',
        dosisPendiente: true,
    },
    hypothenemus_hampei: {
        binomio: 'Hypothenemus hampei',
        nombreComun: 'broca del café',
        tipo: 'insecto',
        manejo: {
            biopreparado: null,
            biologico: 'Beauveria bassiana (mezcla Cenicafé) y Metarhizium anisopliae.',
            cultural: 'RE-RE: recolección oportuna y bien hecha + "repase" de los frutos del suelo. Trampas de captura.',
        },
        umbral: 'SÍ tiene umbral citable: infestación mayor al 2 % de los frutos, con más del 50 % de la broca en posición A y/o B (Cenicafé).',
        prevencion: 'No dejar frutos maduros ni caídos, cosechar parejo, trampas desde el inicio.',
        confianza: 'alta',
        fuente: 'Cenicafé',
        dosisPendiente: false,
    },
    moniliophthora_roreri: {
        binomio: 'Moniliophthora roreri',
        nombreComun: 'monilia / moniliasis del cacao',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Remoción FRECUENTE de los frutos enfermos, poda y regular la sombra. Es un manejo sanitario que no para.',
        },
        umbral: 'Sanitario continuo: revise y retire mazorcas enfermas cada semana.',
        prevencion: 'Podas de aireación, drenaje, recoger y enterrar/tapar los frutos enfermos.',
        confianza: 'alta',
        fuente: 'SciELO Colombia',
        dosisPendiente: true,
    },
    moniliophthora_perniciosa: {
        binomio: 'Moniliophthora perniciosa',
        nombreComun: 'escoba de bruja del cacao',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Poda fitosanitaria de las escobas verdes y secas + variedades tolerantes (CCN-51, TSH-1188). No hay fungicida específico.',
        },
        umbral: 'Sanitario: retirar las escobas antes de que esporulen.',
        prevencion: 'Podas de formación, material tolerante, recoger las escobas del suelo.',
        confianza: 'alta',
        fuente: 'Agronomía Colombiana',
        dosisPendiente: true,
    },
    colletotrichum_lindemuthianum: {
        binomio: 'Colletotrichum lindemuthianum',
        nombreComun: 'antracnosis / quema del grano (fríjol)',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Se pasa POR LA SEMILLA → semilla certificada es el control central. Rotación, variedades resistentes, retirar residuos.',
        },
        umbral: 'Preventivo — arranca con semilla sana.',
        prevencion: 'No guardar semilla de lotes enfermos, rotar con no-hospederas.',
        confianza: 'alta',
        fuente: 'SciELO',
        dosisPendiente: true,
    },
    colletotrichum_mora: {
        binomio: 'Colletotrichum spp.',
        nombreComun: 'antracnosis de la mora ("viruela")',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Caldo bordelés preventivo en época húmeda.',
            biologico: null,
            cultural: 'Podas de aireación, retirar frutos y ramas enfermas, buen tutorado para que seque rápido.',
        },
        umbral: 'Preventivo/climático — sube con lluvia y alta humedad.',
        prevencion: 'Material sano, drenaje, cosecha oportuna.',
        confianza: 'media',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
    },
    pseudocercospora_griseola: {
        binomio: 'Pseudocercospora griseola',
        nombreComun: 'mancha angular (fríjol)',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Semilla certificada, rotación y variedades resistentes. También viaja por semilla.',
        },
        umbral: 'Preventivo — semilla sana.',
        prevencion: 'Rotar, no reusar semilla de lote enfermo.',
        confianza: 'alta',
        fuente: 'Zamorano',
        dosisPendiente: true,
    },
    oidio_erysiphales: {
        binomio: 'Erysiphe / Podosphaera / Leveillula / Oidium spp.',
        nombreComun: 'oídio / cenicilla / mildeo polvoso',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Caldo sulfocálcico (azufre + cal), clásico contra el polvillo blanco.',
            biologico: null,
            cultural: 'Aireación, evitar exceso de nitrógeno y retirar las hojas más afectadas.',
        },
        umbral: 'Preventivo — bajar la humedad sobre el haz de la hoja.',
        prevencion: 'Distancias de siembra, poda de aireación, riego que no moje el follaje.',
        confianza: 'media',
        fuente: 'PLM Colombia',
        dosisPendiente: true,
        // El polvo BLANCO está en el HAZ (cara de arriba). Si el vello está en el
        // envés y es grisáceo → es mildeo velloso (otro bicho, ver causa).
    },
    mildeo_velloso: {
        binomio: 'Peronospora / Pseudoperonospora / Plasmopara / Bremia',
        nombreComun: 'mildeo velloso / mildiú velloso',
        tipo: 'oomiceto',
        manejo: {
            biopreparado: 'Caldo bordelés (cobre), preventivo.',
            biologico: null,
            cultural: 'Drenaje, aireación, evitar el rocío prolongado y variedades tolerantes.',
        },
        umbral: 'Preventivo/climático: tiempo fresco (15–23 °C) y muy húmedo (>85 %).',
        prevencion: 'No mojar el follaje de tarde, distancias amplias.',
        confianza: 'media',
        fuente: 'ADAMA Colombia',
        dosisPendiente: true,
        // El vello GRIS-morado está en el ENVÉS. Ojo: NO es el mismo bicho que el
        // oídio (ese es polvo blanco en el haz).
    },
    geminivirus_cuchara: {
        binomio: 'Complejo geminivirus (TYLCV / begomovirus)',
        nombreComun: 'virus de la cuchara / hoja enrollada',
        tipo: 'virus',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'El virus NO se cura: se maneja el VECTOR, la mosca blanca. Semilleros con malla, barreras, eliminar hospederos y plantas enfermas.',
        },
        umbral: 'Umbral MUY bajo: una sola mosca blanca por planta puede infectar el 100 %. Prevenga sobre el vector, no espere.',
        prevencion: 'Semillero protegido, arrancar y sacar las plantas enfermas, control de mosca blanca desde temprano.',
        confianza: 'alta',
        fuente: 'SciELO Colombia',
        dosisPendiente: false,
    },
    spodoptera_frugiperda: {
        binomio: 'Spodoptera frugiperda',
        nombreComun: 'cogollero / gusano del cogollo (maíz)',
        tipo: 'insecto',
        manejo: {
            biopreparado: 'Neem (aplicado AL COGOLLO, temprano en la infestación y en la tarde para que no lo queme el sol).',
            biologico: 'Beauveria bassiana y enemigos naturales; Bacillus thuringiensis (Bt) vigilando la resistencia.',
            cultural: 'Aplicación localizada en el cogollo y oportuna; conservar enemigos naturales.',
        },
        umbral: 'Monitoreo del daño en el cogollo (referencia internacional indicativa: ~1–2 larvas por cogollo, o 15 % de cogollos con daño). Aplicar localizado.',
        prevencion: 'Siembra pareja, control de arvenses hospederas, revisar el cogollo seguido.',
        confianza: 'alta',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
        notaSuave: 'Se ha reportado BUEN control combinando neem + Beauveria; el dato preciso de una sola fuente se toma con reserva.',
    },
    premnotrypes_vorax: {
        binomio: 'Premnotrypes vorax',
        nombreComun: 'gusano blanco de la papa',
        tipo: 'insecto',
        manejo: {
            biopreparado: null,
            biologico: 'Hongos entomopatógenos (Beauveria bassiana, Metarhizium anisopliae).',
            cultural: 'Trampas de cajón/escalón, aporque y recoger residuos de cosecha.',
        },
        umbral: 'Monitoreo por captura en trampa de cajón.',
        prevencion: 'Semilla sana, rotación, no dejar tubérculos en el lote.',
        confianza: 'alta',
        fuente: 'SciELO Colombia',
        dosisPendiente: true,
    },
    tecia_solanivora: {
        binomio: 'Tecia solanivora',
        nombreComun: 'polilla / palomilla guatemalteca (papa)',
        tipo: 'insecto',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Trampas de feromona para monitorear, semilla sana, aporque alto y buen manejo del almacenamiento.',
        },
        umbral: 'Monitoreo por captura con trampa de feromona.',
        prevencion: 'Almacenamiento protegido, aporque alto, no guardar semilla infestada.',
        confianza: 'alta',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
    },
    mycosphaerella_fijiensis: {
        binomio: 'Mycosphaerella fijiensis',
        nombreComun: 'sigatoka negra / raya negra (plátano)',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Sombra de al menos 20 % baja la severidad; deshoje y despunte temprano de las hojas afectadas; buen drenaje.',
        },
        umbral: 'Preventivo/monitoreo foliar — actuar sobre las primeras hojas con raya.',
        prevencion: 'Deshoje sanitario, drenaje, densidad adecuada.',
        confianza: 'alta',
        fuente: 'SciELO Colombia',
        dosisPendiente: true,
    },
    ralstonia_moko: {
        binomio: 'Ralstonia solanacearum',
        nombreComun: 'moko / madurabiche (plátano)',
        tipo: 'bacteria',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Erradicar los focos, desinfectar las herramientas, controlar los insectos de las flores y NO reusar material enfermo.',
        },
        umbral: 'Sanitario: erradicación de focos apenas se detecta.',
        prevencion: 'Desinfección de herramienta entre plantas, material sano, control de insectos florales.',
        confianza: 'media',
        fuente: 'DANE-SIPSA',
        dosisPendiente: true,
    },
    damping_off: {
        binomio: 'Rhizoctonia / Pythium / Fusarium / Phytophthora',
        nombreComun: 'mal de talluelo / chupadera / quema del semillero',
        tipo: 'complejo',
        manejo: {
            biopreparado: null,
            biologico: 'Trichoderma spp. (antagonista de los hongos del suelo del semillero).',
            cultural: 'Sustrato pasteurizado, riego moderado, buen drenaje y menos nitrógeno; buena ventilación.',
        },
        umbral: 'Preventivo — todo se juega en el manejo del semillero.',
        prevencion: 'Sustrato aireado, no sembrar denso, no encharcar, semilla sana.',
        confianza: 'alta',
        fuente: 'Intagri',
        dosisPendiente: true,
    },
    capnodium_negrilla: {
        binomio: 'Capnodium spp. (saprófito)',
        nombreComun: 'negrilla / fumagina / tizne',
        tipo: 'hongo',
        manejo: {
            biopreparado: 'Jabón potásico dirigido al INSECTO chupador (no al hollín).',
            biologico: 'Conservar/soltar enemigos del pulgón y la mosca blanca.',
            cultural: 'REGLA: la negrilla es un síntoma-espejo — el hollín negro crece sobre la MELAZA del pulgón/mosca blanca/escama. Se maneja el insecto, no el hongo.',
        },
        umbral: 'Manejo dirigido al insecto de la melaza.',
        prevencion: 'Controlar temprano los chupadores, hormigas que los "pastorean" y limpiar melaza.',
        confianza: 'media',
        fuente: 'Agrobase Colombia',
        dosisPendiente: true,
    },
    meloidogyne: {
        binomio: 'Meloidogyne spp.',
        nombreComun: 'nematodo del nudo de la raíz',
        tipo: 'nematodo',
        manejo: {
            biopreparado: null,
            biologico: 'Hongos y bacterias nematófagas.',
            cultural: 'Rotación, abonos orgánicos, coberturas, barbecho/inundación y variedades resistentes.',
        },
        umbral: 'Muestreo de raíz cada 20–30 días; la señal es la marchitez de día pese a haber humedad.',
        prevencion: 'Material sano, rotar con no-hospederas, subir la materia orgánica.',
        confianza: 'alta',
        fuente: 'Acta Agronómica UNAL',
        dosisPendiente: true,
    },
    mosca_blanca: {
        binomio: 'Bemisia tabaci / Trialeurodes vaporariorum',
        nombreComun: 'mosca blanca / palomilla blanca',
        tipo: 'insecto',
        manejo: {
            biopreparado: 'Jabón potásico o aceites; neem en infestación temprana.',
            biologico: 'Trampas amarillas + enemigos naturales.',
            cultural: 'Barreras, eliminar hospederas y plantas enfermas. Importa sobre todo por su papel de VECTOR de virus.',
        },
        umbral: 'Monitoreo; muy bajo por su rol de vector (transmite el virus de la cuchara).',
        prevencion: 'Semillero protegido, mallas, control temprano.',
        confianza: 'alta',
        fuente: 'SciELO Colombia',
        dosisPendiente: true,
    },
    ustilago_maydis: {
        binomio: 'Ustilago maydis',
        nombreComun: 'carbón / cintas / huitlacoche (maíz)',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Rotación, semilla sana y retirar las agallas ANTES de que revienten y suelten el polvo negro.',
        },
        umbral: 'Sanitario — sacar las agallas a tiempo.',
        prevencion: 'Rotar, semilla sana, no herir las matas.',
        confianza: 'media',
        fuente: 'Corteva',
        dosisPendiente: true,
    },
    mancha_asfalto: {
        binomio: 'Phyllachora maydis + Monographella maydis',
        nombreComun: 'mancha de asfalto / ojo de pescado (maíz)',
        tipo: 'complejo',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Monitoreo, variedades resistentes, buenas prácticas agronómicas y rotación.',
        },
        umbral: 'Preventivo/monitoreo.',
        prevencion: 'Rotación, residuos manejados, material resistente.',
        confianza: 'media',
        fuente: 'Intagri',
        dosisPendiente: true,
    },
    mocis_latipes: {
        binomio: 'Mocis latipes',
        nombreComun: 'gusano medidor / falso medidor (pastos)',
        tipo: 'insecto',
        manejo: {
            biopreparado: null,
            biologico: 'Enemigos naturales; Bacillus thuringiensis (Bt).',
            cultural: 'Monitoreo de la defoliación del potrero.',
        },
        umbral: 'Monitoreo de defoliación.',
        prevencion: 'Rotación de potreros, conservar enemigos naturales.',
        confianza: 'media',
        fuente: 'AGROSAVIA',
        dosisPendiente: true,
    },
    /* ── Causas del árbol de AMARILLAMIENTO (desambiguación forzada) ────────── */
    deficiencia_n: {
        binomio: 'Falta de nitrógeno (N)',
        nombreComun: 'hambre de nitrógeno',
        tipo: 'deficiencia',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Es una carencia, no un bicho: el amarillo parejo en las hojas VIEJAS es N móvil. Abono nitrogenado orgánico o rotación con leguminosa.',
        },
        umbral: 'No aplica — es nutrición, no plaga.',
        prevencion: 'Materia orgánica, abonos verdes/leguminosas, no lavar el suelo.',
        confianza: 'alta',
        fuente: 'MSU Extension / ECHO',
        dosisPendiente: true,
    },
    deficiencia_fe: {
        binomio: 'Falta de hierro/magnesio (Fe/Mg)',
        nombreComun: 'clorosis de hoja nueva',
        tipo: 'deficiencia',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'Amarillo ENTRE las venas de las hojas NUEVAS, con las venas todavía verdes = Fe/Mg (inmóvil). Suele ser pH: corregir la disponibilidad, no echar más.',
        },
        umbral: 'No aplica — es nutrición/pH, no plaga.',
        prevencion: 'Manejar el pH, materia orgánica, no encalar de más.',
        confianza: 'alta',
        fuente: 'MSU Extension / ECHO',
        dosisPendiente: true,
    },
    virosis_generica: {
        binomio: 'Virosis (mosaico)',
        nombreComun: 'enfermedad de virus',
        tipo: 'virus',
        manejo: {
            biopreparado: null,
            biologico: null,
            cultural: 'El dibujo de mosaico (verde y amarillo mezclados) apunta a VIRUS. No se cura: arranque las plantas enfermas y controle el insecto que lo trae (mosca blanca, áfidos, trips).',
        },
        umbral: 'Arrancar apenas se detecta + manejar el vector.',
        prevencion: 'Semilla/material sano, control del vector, sacar hospederas.',
        confianza: 'media',
        fuente: 'ECHO / SciELO',
        dosisPendiente: false,
    },
    marchitez_vascular: {
        binomio: 'Fusarium oxysporum / Ralstonia',
        nombreComun: 'marchitez vascular',
        tipo: 'hongo',
        manejo: {
            biopreparado: null,
            biologico: 'Trichoderma spp. en el suelo/semillero.',
            cultural: 'Si se marchita de día y los vasos del tallo están oscuros (sin nuditos en raíz): rotación, material sano y buen drenaje.',
        },
        umbral: 'Sanitario/preventivo — no hay cura de la planta enferma.',
        prevencion: 'Rotación larga, material resistente, drenaje, no mover suelo contaminado.',
        confianza: 'media',
        fuente: 'ECHO / AGROSAVIA',
        dosisPendiente: true,
    },
};

/* ── Cultivos (para las preguntas de desambiguación) ─────────────────────── */
export const CULTIVOS = {
    cafe: { label: 'Café', emoji: '☕' },
    tomate: { label: 'Tomate', emoji: '🍅' },
    papa: { label: 'Papa', emoji: '🥔' },
    maiz: { label: 'Maíz', emoji: '🌽' },
    frijol: { label: 'Fríjol', emoji: '🫘' },
    mora: { label: 'Mora', emoji: '🫐' },
    cacao: { label: 'Cacao', emoji: '🍫' },
    platano: { label: 'Plátano', emoji: '🍌' },
    pastos: { label: 'Pastos', emoji: '🌾' },
};

/* ── SÍNTOMAS FOLK ───────────────────────────────────────────────────────────
   Cada síntoma resuelve por UN nodo:
     · { causa: '<id>' }                         → directa.
     · { pregunta: { texto, opciones:[{ ... }] }}→ desambiguación (cultivo,
       ubicación del polvo, etc.). Una opción lleva a { causa } o a otra
       { pregunta } (recursivo → árbol del amarillamiento).
   `terminos`: sinónimos folk normalizados que reconoce el buscador.
   `polisemica`: pide el cultivo antes de cerrar (candelilla/viruela).
   `ambigua`: entrada peligrosa → banner de desambiguación forzada. */
export const SINTOMAS = [
    {
        id: 'gota',
        label: 'Gota / gotera / lancha / rancha',
        emoji: '💧',
        vineta: 'manchaHumeda',
        terminos: ['gota', 'gotera', 'lancha', 'rancha', 'chispeado', 'tizon tardio', 'gotiando', 'se esta gotiando'],
        pista: 'Manchas húmedas pardo-oscuras que se extienden rápido; en clima fresco y húmedo salen con un vellito blanco en el envés.',
        // "gotera" es POLISÉMICA (DR sanidad §2.1/§2.2): en papa/tomate es la
        // gota (Phytophthora); en CAFÉ, "gotera" es el ojo de gallo (Mycena
        // citricolor), otra enfermedad. Por eso el síntoma pregunta el cultivo.
        nota: 'Ojo con "gotera": en papa y tomate es la gota (Phytophthora). En CAFÉ, "gotera" es el ojo de gallo (Mycena citricolor), otra enfermedad. Y en tomate con SEQUÍA y calor ya no es la gota sino el tizón temprano (Alternaria): manchitas cafés con anillos.',
        pregunta: {
            texto: '¿En qué mata la vio?',
            tipo: 'cultivo',
            opciones: [
                { cultivo: 'papa', causa: 'phytophthora_infestans' },
                { cultivo: 'tomate', causa: 'phytophthora_infestans' },
                { cultivo: 'cafe', causa: 'mycena_citricolor' },
            ],
        },
    },
    {
        id: 'candelilla',
        label: 'Candelilla',
        emoji: '🕯️',
        vineta: 'manchaOjo',
        terminos: ['candelilla', 'candeliada', 'candeliao', 'esta candeliada'],
        pista: 'Nombre TRAMPA: cambia según el cultivo. Por eso hay que preguntar en qué mata la vio antes de decir qué es.',
        polisemica: true,
        pregunta: {
            texto: '"Candelilla" es distinta en cada cultivo. ¿En cuál la vio?',
            tipo: 'cultivo',
            opciones: [
                { cultivo: 'cafe', causa: 'mycena_citricolor' },
                { cultivo: 'tomate', causa: 'alternaria_solani' },
                { cultivo: 'mora', causa: 'colletotrichum_mora' },
                { cultivo: 'pastos', causa: 'mocis_latipes' },
            ],
        },
    },
    {
        id: 'viruela',
        label: 'Viruela / ojo de pavo real',
        emoji: '🦚',
        vineta: 'manchaOjo',
        terminos: ['viruela', 'ojo de pavo real', 'ojo de pavo', 'pavo real'],
        pista: 'Otro nombre TRAMPA: en café es el ojo de gallo; en mora es antracnosis. Hay que preguntar el cultivo.',
        polisemica: true,
        pregunta: {
            texto: '"Viruela" también cambia según el cultivo. ¿En cuál la vio?',
            tipo: 'cultivo',
            opciones: [
                { cultivo: 'cafe', causa: 'mycena_citricolor' },
                { cultivo: 'mora', causa: 'colletotrichum_mora' },
            ],
        },
    },
    {
        id: 'ojo_de_gallo',
        label: 'Ojo de gallo (café)',
        emoji: '🎯',
        vineta: 'manchaOjo',
        terminos: ['ojo de gallo', 'gotera del cafe', 'gotera cafe'],
        pista: 'Manchas redondas con centro claro y borde marcado; caen hojas y frutos. Lo favorece el EXCESO de sombra y la humedad.',
        causa: 'mycena_citricolor',
    },
    {
        id: 'roya',
        label: 'Roya / polvillo amarillo (café)',
        emoji: '🟠',
        vineta: 'polvoAmarillo',
        terminos: ['roya', 'polvillo amarillo', 'polvo amarillo', 'polvillo naranja'],
        pista: 'Polvito fino amarillo-naranja en el ENVÉS de la hoja del café; luego se defolia.',
        causa: 'hemileia_vastatrix',
    },
    {
        id: 'mancha_hierro',
        label: 'Mancha de hierro (café)',
        emoji: '🟤',
        vineta: 'manchaOjo',
        terminos: ['mancha de hierro', 'mancha hierro'],
        pista: 'Manchitas pardo-rojizas con centro blancuzco y anillo rojizo. Marca falta de sombra y de nutrición.',
        causa: 'cercospora_coffeicola',
    },
    {
        id: 'broca',
        label: 'Broca (café)',
        emoji: '🔩',
        vineta: 'frutoBroca',
        terminos: ['broca', 'gorgojo del cafe', 'barrenador del cafe'],
        pista: 'Un huequito en la punta del grano; por dentro va comida. Es el ÚNICO caso con umbral numérico citable.',
        causa: 'hypothenemus_hampei',
    },
    {
        id: 'polvillo_blanco',
        label: 'Polvillo blanco / ceniza',
        emoji: '⚪',
        vineta: 'polvoBlanco',
        terminos: ['polvillo blanco', 'ceniza', 'cenicilla', 'oidio', 'mildeo polvoso', 'polvo blanco', 'ceniciento'],
        pista: 'Polvo blanco como talco. OJO: hay que ver DÓNDE está el polvo — no es lo mismo el oídio que el mildeo velloso.',
        pregunta: {
            texto: '¿Dónde está el polvo y de qué color?',
            tipo: 'detalle',
            opciones: [
                { label: 'Blanco, en la cara de ARRIBA de la hoja (haz)', emoji: '⬆️', causa: 'oidio_erysiphales' },
                { label: 'Velloso y grisáceo, por DEBAJO de la hoja (envés)', emoji: '⬇️', causa: 'mildeo_velloso' },
            ],
        },
    },
    {
        id: 'mildeo_velloso',
        label: 'Mildeo velloso',
        emoji: '🌫️',
        vineta: 'polvoBlanco',
        terminos: ['mildeo velloso', 'mildiu velloso', 'vello gris', 'velloso'],
        pista: 'Manchas amarillas en el haz y un vello gris-morado por DEBAJO. Es un oomiceto, no el oídio.',
        causa: 'mildeo_velloso',
    },
    {
        id: 'cuchara',
        label: 'Hoja de cuchara / enrollada (tomate)',
        emoji: '🥄',
        vineta: 'hojaEnrollada',
        terminos: ['cuchara', 'hoja de cuchara', 'hoja enrollada', 'encrespamiento', 'enrollado', 'hoja abarquillada', 'virus de la cuchara'],
        pista: 'La hoja se enrolla hacia arriba como cuchara, amarillea y la mata se enana. Es virus que trae la mosca blanca.',
        causa: 'geminivirus_cuchara',
    },
    {
        id: 'cogollero',
        label: 'Cogollero (maíz)',
        emoji: '🐛',
        vineta: 'hojaMordida',
        terminos: ['cogollero', 'gusano del cogollo', 'cogollo comido', 'gusano cogollero'],
        pista: 'El cogollo del maíz aparece comido, raído, con aserrín (excremento) adentro.',
        causa: 'spodoptera_frugiperda',
    },
    {
        id: 'mancha_asfalto',
        label: 'Mancha de asfalto / ojo de pescado (maíz)',
        emoji: '⚫',
        vineta: 'manchaOjo',
        terminos: ['mancha de asfalto', 'ojo de pescado', 'asfalto'],
        pista: 'Puntos negros abultados y brillantes en la hoja; a veces con un halo claro tipo "ojo de pescado".',
        causa: 'mancha_asfalto',
    },
    {
        id: 'carbon',
        label: 'Carbón / cintas (maíz)',
        emoji: '🌽',
        vineta: 'frutoBroca',
        terminos: ['carbon', 'cintas', 'huitlacoche', 'carbon del maiz'],
        pista: 'Bolas/agallas que reemplazan los granos, tapadas por una piel blanca que luego suelta polvo negro.',
        causa: 'ustilago_maydis',
    },
    {
        id: 'gusano_blanco',
        label: 'Gusano blanco (papa)',
        emoji: '🪱',
        vineta: 'raizNudo',
        terminos: ['gusano blanco', 'gusano de la papa', 'gusano blanco de la papa'],
        pista: 'Galerías y huecos en el tubérculo; la larva blanca por dentro. Puede dañar hasta el 100 %.',
        causa: 'premnotrypes_vorax',
    },
    {
        id: 'polilla_papa',
        label: 'Polilla guatemalteca (papa)',
        emoji: '🦋',
        vineta: 'frutoBroca',
        terminos: ['polilla', 'palomilla', 'polilla guatemalteca', 'palomilla guatemalteca', 'polilla de la papa'],
        pista: 'La papa aparece minada por dentro, con galerías y excremento; daño fuerte en almacenamiento.',
        causa: 'tecia_solanivora',
    },
    {
        id: 'sigatoka',
        label: 'Raya / sigatoka negra (plátano)',
        emoji: '🍌',
        vineta: 'hojaRaya',
        terminos: ['sigatoka', 'raya negra', 'raya', 'sigatoka negra'],
        pista: 'Rayas y manchas oscuras que corren en la hoja del plátano y la secan; baja el racimo.',
        causa: 'mycosphaerella_fijiensis',
    },
    {
        id: 'moko',
        label: 'Moko / madurabiche (plátano)',
        emoji: '🍌',
        vineta: 'marchita',
        terminos: ['moko', 'madurabiche', 'maduraviche'],
        pista: 'La planta se marchita y el fruto madura por dentro antes de tiempo. Es bacteria: se erradica el foco.',
        causa: 'ralstonia_moko',
    },
    {
        id: 'damping_off',
        label: 'Mal de talluelo / chupadera (semillero)',
        emoji: '🌱',
        vineta: 'marchita',
        terminos: ['mal de talluelo', 'chupadera', 'damping off', 'quema del semillero', 'se cae la plantula', 'volcamiento'],
        pista: 'Las plántulas del semillero se estrangulan al ras del suelo y se caen; la raíz se pudre.',
        causa: 'damping_off',
    },
    {
        id: 'negrilla',
        label: 'Negrilla / fumagina / tizne',
        emoji: '⬛',
        vineta: 'hojaNegra',
        terminos: ['negrilla', 'fumagina', 'tizne', 'cenizo negro', 'hollin', 'hollín'],
        pista: 'Capa negra como hollín sobre hojas y frutos. NO parasita: crece sobre la melaza de un insecto chupador.',
        nota: 'Síntoma-espejo: el remedio va contra el pulgón / mosca blanca / escama, NO contra el hollín.',
        causa: 'capnodium_negrilla',
    },
    {
        id: 'mosca_blanca',
        label: 'Mosca blanca / palomilla blanca',
        emoji: '🦟',
        vineta: 'hojaMordida',
        terminos: ['mosca blanca', 'palomilla blanca', 'moscas blancas', 'nube blanca'],
        pista: 'Nubecita de moscas blancas que vuelan al sacudir la mata; dejan melaza. Importa como VECTOR de virus.',
        causa: 'mosca_blanca',
    },
    {
        id: 'monilia',
        label: 'Monilia (cacao)',
        emoji: '🍫',
        vineta: 'frutoBroca',
        terminos: ['monilia', 'moniliasis', 'monilla'],
        pista: 'La mazorca del cacao se mancha, se pudre y se cubre de un polvo cremoso. Se retiran los frutos enfermos.',
        causa: 'moniliophthora_roreri',
    },
    {
        id: 'escoba_bruja',
        label: 'Escoba de bruja (cacao)',
        emoji: '🧹',
        vineta: 'hojaMordida',
        terminos: ['escoba de bruja', 'escoba', 'escobas'],
        pista: 'Brotes deformes tipo escoba vieja por proliferación de yemas; luego se secan. Se podan las escobas.',
        causa: 'moniliophthora_perniciosa',
    },
    {
        id: 'antracnosis_frijol',
        label: 'Antracnosis / quema del grano (fríjol)',
        emoji: '🫘',
        vineta: 'manchaOjo',
        terminos: ['antracnosis', 'quema del grano', 'quema del frijol', 'mancha del frijol'],
        pista: 'Manchas hundidas oscuras en vaina y grano del fríjol. Se pasa por la semilla.',
        causa: 'colletotrichum_lindemuthianum',
    },
    {
        id: 'mancha_angular',
        label: 'Mancha angular (fríjol)',
        emoji: '📐',
        vineta: 'manchaOjo',
        terminos: ['mancha angular', 'angular'],
        pista: 'Manchas con forma de ángulo, limitadas por las venas de la hoja del fríjol.',
        causa: 'pseudocercospora_griseola',
    },
    {
        id: 'gusano_medidor',
        label: 'Gusano medidor (pastos)',
        emoji: '📏',
        vineta: 'hojaMordida',
        terminos: ['gusano medidor', 'falso medidor', 'medidor', 'pelador de pastos'],
        pista: 'Oruga que "mide" al caminar y defolia el potrero.',
        causa: 'mocis_latipes',
    },
    /* ── LA ENTRADA PELIGROSA: amarillamiento ─────────────────────────────────
       No cierra a un binomio de una: pregunta hasta separar hambre / virus /
       nematodo / marchitez. (DR: hallazgo #7, confianza baja del término crudo.) */
    {
        id: 'amarillamiento',
        label: 'Amarillamiento / se seca de la punta',
        emoji: '🟡',
        vineta: 'hojaAmarilla',
        terminos: ['amarillamiento', 'amarillera', 'amarillo', 'se seca de la punta', 'se seca la punta', 'esta amarilla', 'amarilleando', 'clorosis'],
        pista: 'El amarillo tiene MUCHAS causas (hambre, virus, nematodo, exceso de agua, helada). Vamos a mirarlo con calma antes de decir qué es.',
        ambigua: true,
        pregunta: {
            texto: '¿Cómo se ve el amarillo? Mírelo bien:',
            tipo: 'detalle',
            opciones: [
                { label: 'En las hojas de ABAJO (viejas), parejo', emoji: '⬇️', causa: 'deficiencia_n' },
                { label: 'En las hojas de ARRIBA (nuevas), con las venas aún verdes', emoji: '⬆️', causa: 'deficiencia_fe' },
                { label: 'En dibujo/mosaico que se mezcla verde y amarillo', emoji: '🧩', causa: 'virosis_generica' },
                {
                    label: 'Toda la mata se marchita al sol aunque haya humedad',
                    emoji: '🥀',
                    pregunta: {
                        texto: 'Arranque una matica y mírele la raíz:',
                        tipo: 'detalle',
                        opciones: [
                            { label: 'La raíz tiene nuditos o bolitas', emoji: '🔗', causa: 'meloidogyne' },
                            { label: 'Sin nuditos, pero los vasos del tallo están oscuros', emoji: '🟤', causa: 'marchitez_vascular' },
                        ],
                    },
                },
            ],
        },
    },
];

/* ── Lógica determinista ─────────────────────────────────────────────────── */

/** Normaliza texto: minúsculas, sin tildes, sin puntuación, espacios colapsados. */
export function normalizar(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // quita tildes/diacríticos
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Busca el síntoma que mejor case con lo que escribió el campesino.
 * Puntaje determinista: término exacto > el texto empieza por el término >
 * el texto contiene el término > el término contiene al texto (≥4 letras).
 * @param {string} texto  lo que escribió/dijo el campesino.
 * @returns {{ sintoma: object, termino: string }|null}
 */
export function buscarSintoma(texto) {
    const q = normalizar(texto);
    if (!q || q.length < 2) return null;
    let mejor = null;
    let mejorPuntaje = 0;
    for (const s of SINTOMAS) {
        for (const t of s.terminos) {
            const tn = normalizar(t);
            let p = 0;
            if (q === tn) p = 100;
            else if (q.startsWith(tn + ' ') || q.endsWith(' ' + tn) || q.includes(' ' + tn + ' ')) p = 80;
            else if (q.includes(tn)) p = 60;
            else if (tn.includes(q) && q.length >= 4) p = 40;
            // desempate: término más largo (más específico) gana.
            if (p > 0) p += Math.min(tn.length, 20) / 100;
            if (p > mejorPuntaje) {
                mejorPuntaje = p;
                mejor = { sintoma: s, termino: t };
            }
        }
    }
    return mejor;
}

/** Trae una causa por id (null si no existe). */
export function getCausa(id) {
    return CAUSAS[id] || null;
}

/** El nodo raíz de resolución de un síntoma ({causa} directa o {pregunta}). */
export function nodoInicial(sintoma) {
    if (!sintoma) return null;
    if (sintoma.causa) return { causa: sintoma.causa };
    if (sintoma.pregunta) return { pregunta: sintoma.pregunta };
    return null;
}

/** ¿El síntoma se resuelve de una (sin preguntar)? */
export function esDirecto(sintoma) {
    return !!(sintoma && sintoma.causa && !sintoma.pregunta);
}

/** Etiqueta legible de una confianza. */
export const CONFIANZA_META = {
    alta: { label: 'Confianza alta', dots: 3 },
    media: { label: 'Confianza media', dots: 2 },
    baja: { label: 'Confianza baja — desambigüe', dots: 1 },
};

/** Etiqueta legible de un tipo de causa. */
export const TIPO_META = {
    hongo: { label: 'Hongo', emoji: '🍄' },
    oomiceto: { label: 'Oomiceto (tipo hongo de agua)', emoji: '💧' },
    bacteria: { label: 'Bacteria', emoji: '🧫' },
    virus: { label: 'Virus', emoji: '🧬' },
    insecto: { label: 'Insecto', emoji: '🐛' },
    nematodo: { label: 'Nematodo (gusanito del suelo)', emoji: '🪱' },
    complejo: { label: 'Varios juntos', emoji: '🕸️' },
    deficiencia: { label: 'Carencia (no es plaga)', emoji: '🍽️' },
};
