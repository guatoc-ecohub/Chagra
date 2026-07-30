/**
 * vocabularioAgroecologico.js — Dataset de vocabulario agroecológico colombiano
 * 
 * Conjunto de 30-40 términos agroecológicos fundamentados en el catálogo
 * chagra-catalog-seed-v3.1.json. Cada término incluye pista educativa basada
 * en información real del catálogo (valor_pedagogico, descripciones técnicas).
 * 
 * Todas las pistas están fundamentadas en fuentes Tier A del catálogo:
 * - AGROSAVIA (Centro de investigación agropecuaria)
 * - GBIF Backbone Taxonomy (taxonomía verificada)
 * - POWO Kew (Royal Botanic Gardens)
 * - ICA Resoluciones (normativa colombiana)
 * - FAO (Organización de las Naciones Unidas para la Agricultura)
 * - Literatura técnica especializada
 * 
 * Español colombiano (tú/usted). Sin voseo (guarda lefthook).
 */

/* ──────────────────────────────────────────────────────────────────────────
 * CATEGORÍAS del vocabulario agroecológico
 * ────────────────────────────────────────────────────────────────────────── */
export const CATEGORIAS = {
  cultivos_tradicionales: {
    id: 'cultivos_tradicionales',
    label: 'Cultivos tradicionales andinos',
    descripcion: 'Cultivos nativos andinos con siglos de historia en la chagra colombiana',
    emoji: '🌾',
  },
  sombra_agroforestal: {
    id: 'sombra_agroforestal',
    label: 'Sombra agroforestal',
    descripcion: 'Especies que proveen sombra y beneficios ecológicos en sistemas agroforestales',
    emoji: '🌳',
  },
  manejo_suelo: {
    id: 'manejo_suelo',
    label: 'Manejo del suelo',
    descripcion: 'Coberturas, abonos verdes y leguminosas para nutrir y proteger el suelo',
    emoji: '🌱',
  },
  plantas_medicinales: {
    id: 'plantas_medicinales',
    label: 'Hierbas medicinales aromaticas',
    descripcion: 'Hierbas medicinales aromaticas tradicionales',
    emoji: '🌿',
  },
  especies_invasoras: {
    id: 'especies_invasoras',
    label: 'Especies invasoras',
    descripcion: 'Especies exoticas invasiveoras',
    emoji: '🚫',
  },
  frutales_andinos: {
    id: 'frutales_andinos',
    label: 'Frutales andinos',
    descripcion: 'Frutales tropicales y andinos de importancia agroecológica',
    emoji: '🍎',
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 * TERMINOS — vocabulario agroecológico (30-40 términos)
 * ────────────────────────────────────────────────────────────────────────── */
export const TERMINOS = [
  /* ── CULTIVOS TRADICIONALES ANDINOS ────────────────────────────────────── */
  {
    palabra: 'QUINUA',
    categoria: 'cultivos_tradicionales',
    pista: 'Pseudocereal andino de alta montaña con proteína completa (14-18%). Cultivado en Boyacá, Nariño y Cundinamarca entre 2.500-3.500 msnm. Resiste sequía y heladas leves.',
  },
  {
    palabra: 'AMARANTO',
    categoria: 'cultivos_tradicionales',
    pista: 'Pseudocereal andino con grano rico en lisina, aminoácido limitante en cereales convencionales. Inflorescencias rojas colgantes contienen miles de semillas brillantes.',
  },
  {
    palabra: 'ARRACACHA',
    categoria: 'cultivos_tradicionales',
    pista: 'Tubérculo andino por excelencia de la chagra muisca. Raíz de textura suave, alta digestibilidad y recomendada en dietas infantiles. Ciclo largo de 10-14 meses.',
  },
  {
    palabra: 'MORA ANDINA',
    categoria: 'cultivos_tradicionales',
    pista: 'También llamada mora de Castilla. Rubus andino con espinas protectoras que demuestran cómo las defensas naturales de las plantas tienen propósito ecológico.',
  },
  {
    palabra: 'UCHUVA',
    categoria: 'cultivos_tradicionales',
    pista: 'Physalis peruviana, fruto andino con cáliz protector que lo conserva naturalmente. Cultivado en zona fría andina con alto valor antioxidante.',
  },
  {
    palabra: 'TOMATE DE ARBOL',
    categoria: 'cultivos_tradicionales',
    pista: 'Solanum betaceum, solanáceo andino de arbusto 2-4 metros. Fruto dulce-acidez usado en jugos y postres de la tradición andina.',
  },
  {
    palabra: 'MAIZ CRIOLLO',
    categoria: 'cultivos_tradicionales',
    pista: 'Zea mays variedades tradicionales adaptadas a pisos térmicos colombianos. Base de la chacra andina asociada con frijol y quinua (milpa andina).',
  },

  /* ── SOMBRA AGROFORESTAL ─────────────────────────────────────────────────── */
  {
    palabra: 'ALISO ANDINO',
    categoria: 'sombra_agroforestal',
    pista: 'Alnus acuminata, árbol nativo de los Andes fijador de nitrógeno (150-200 kg N/ha/año) mediante simbiosis con Frankia. Caducifolio hasta 20-25 metros, ideal para sombra de café.',
  },
  {
    palabra: 'GUAMO',
    categoria: 'sombra_agroforestal',
    pista: 'Inga edulis, leguminosa arbórea fijadora de nitrógeno con rizobios. Vainas con pulpa dulce comestible. Sombra tradicional de cacao y café entre 0-2.000 msnm.',
  },
  {
    palabra: 'CHACHAFRUTO',
    categoria: 'sombra_agroforestal',
    pista: 'Erythrina edulis, leguminosa andina conocida como balú. Semillas grandes comestibles rico en proteína. Árbol de sombra rápida 10-15 metros para sistemas agroforestales.',
  },
  {
    palabra: 'CAFE CATURRA',
    categoria: 'sombra_agroforestal',
    pista: 'Coffea arabica variedad emblemática colombina. Requiere sombra parcial 35-50%, suelos francos pH 5.0-5.5. Cultivo agroindustrial principal entre 1.200-2.000 msnm.',
  },
  {
    palabra: 'CACAO',
    categoria: 'sombra_agroforestal',
    pista: 'Theobroma cacao, árbol cauliflor (flores en tronco) nativo amazónico. Necesita sombra de plátano, cítricos o maderables. Cultivado en Santander, Magdalena Medio y Pacífica.',
  },

  /* ── MANEJO DEL SUELO ────────────────────────────────────────────────────── */
  {
    palabra: 'TREBOL BLANCO',
    categoria: 'manejo_suelo',
    pista: 'Trifolium repens, leguminosa rastrera fijadora de nitrógeno. Cobertura viva que protege el suelo, mejora estructura y aporta N orgánico.',
  },
  {
    palabra: 'FRIJOL TERCIOPLEO',
    categoria: 'manejo_suelo',
    pista: 'Centrosema macrocarpum, leguminosa trepadora perenne. Cobertura verde que suprime malezas, fija nitrógeno y puede usarse como forraje.',
  },
  {
    palabra: 'GANDUL',
    categoria: 'manejo_suelo',
    pista: 'Cajanus cajan, arbusto leguminoso fijador de nitrógeno. Usado en callejones vivos, sombríos temporales y como barrera rompeviento.',
  },
  {
    palabra: 'CHOCHO',
    categoria: 'manejo_suelo',
    pista: 'Lupinus mutabilis, leguminosa andina de grano rico en proteína (40-45%). Abono verde con raíz profunda que recicla nutrientes del subsuelo.',
  },
  {
    palabra: 'FRIJOL ARBUSTIVO',
    categoria: 'manejo_suelo',
    pista: 'Phaseolus vulgaris, leguminosa de grano básica. Fija nitrógeno atmosférico con rizobios, asocia con maíz en chacra andina (milpa).',
  },

  /* ── PLANTAS MEDICINALES Y AROMATICAS ─────────────────────────────────────── */
  {
    palabra: 'OREGANO',
    categoria: 'plantas_medicinales',
    pista: 'Origanum vulgare, aromática perenne de uso culinario y medicinal. Aceites esenciales digestivos, repelente de plagas en huertos diversificados.',
  },
  {
    palabra: 'TORONJIL',
    categoria: 'plantas_medicinales',
    pista: 'Melissa officinalis, aromática lamiácea calmante tradicional. Infusión para ansiedad y problemas digestivos. Planta compañera en huertos.',
  },
  {
    palabra: 'YERBABUENA',
    categoria: 'plantas_medicinales',
    pista: 'Mentha spicata, menta dulce aromática. Digestiva, repelente de insectos, compañera en huertos por aceites esenciales.',
  },
  {
    palabra: 'CALENDULA',
    categoria: 'plantas_medicinales',
    pista: 'Calendula officinalis, asterácea de flores anaranjadas. Atractora de polinizadores, propiedades antiinflamatorias cutáneas.',
  },
  {
    palabra: 'ORTIGA',
    categoria: 'plantas_medicinales',
    pista: 'Urtica dioica, planta con tricomas urticantes (defensa). Bioestimulante líquido por fermentación (purín) que fortalece cultivos.',
  },
  {
    palabra: 'CILANTRO',
    categoria: 'plantas_medicinales',
    pista: 'Coriandrum sativum, apiácea aromática de uso culinario universal. Acompañante de hortalizas, atrae insectos benéficos al huerto.',
  },

  /* ── ESPECIES INVASORAS ────────────────────────────────────────────────────── */
  {
    palabra: 'KIKUYO',
    categoria: 'especies_invasoras',
    pista: 'Cenchrus clandestinus, pastura africana invasora de los Andes. Competidor agresivo que desplaza flora nativa, favorecido por sobrepastoreo.',
  },
  {
    palabra: 'HELECHO MARRANERO',
    categoria: 'especies_invasoras',
    pista: 'Pteridium aquilinum, helecho cosmopolita invasor de potreros y claros. Expande por rizoma, carcinógeno potencial para ganado, difícil de erradicar.',
  },
  {
    palabra: 'EUCALIPTO BLANCO',
    categoria: 'especies_invasoras',
    pista: 'Eucalyptus globulus, árbol australiano de crecimiento rápido. Alelopático que inhibe vegetación nativa, consume mucha agua, afecta microcuencas.',
  },
  {
    palabra: 'RETAMO ESPINOSO',
    categoria: 'especies_invasoras',
    pista: 'Ulex europaeus, arbusto espinoso europeo. Invasor agresivo de zonas altas andinas que desplaza vegetación nativa y reduce biodiversidad.',
  },

  /* ── FRUTALES ANDINOS ──────────────────────────────────────────────────────── */
  {
    palabra: 'FRESA',
    categoria: 'frutales_andinos',
    pista: 'Fragaria ananassa, herbácea perenne de fruto agregado. Cultivo en zonas frías andinas (2.000-3.000 msnm), sensible a inundaciones.',
  },
  {
    palabra: 'GUANABANA',
    categoria: 'frutales_andinos',
    pista: 'Annona muricata, anonácea tropical de fruto grande pulposo. Árbol 4-8 metros en zonas cálidas (0-1.200 msnm), susceptible a bicho caballo (Cerconota anonella).',
  },
  {
    palabra: 'BATATA',
    categoria: 'frutales_andinos',
    pista: 'Ipomoea batatas, convolvulácea rastrera de tubérculo dulce. Cultivo Tropical-subtropical (0-2.000 msnm), vitaminas A y C, alternativa diversa a papa.',
  },
];

/* ──────────────────────────────────────────────────────────────────────────
 * TERMINOS_POR_CATEGORIA — índice por categoría para conveniencia
 * ────────────────────────────────────────────────────────────────────────── */
export const TERMINOS_POR_CATEGORIA = {
  cultivos_tradicionales: TERMINOS.filter((t) => t.categoria === 'cultivos_tradicionales'),
  sombra_agroforestal: TERMINOS.filter((t) => t.categoria === 'sombra_agroforestal'),
  manejo_suelo: TERMINOS.filter((t) => t.categoria === 'manejo_suelo'),
  plantas_medicinales: TERMINOS.filter((t) => t.categoria === 'plantas_medicinales'),
  especies_invasoras: TERMINOS.filter((t) => t.categoria === 'especies_invasoras'),
  frutales_andinos: TERMINOS.filter((t) => t.categoria === 'frutales_andinos'),
};

export default {
  CATEGORIAS,
  TERMINOS,
  TERMINOS_POR_CATEGORIA,
};
