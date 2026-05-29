/**
 * regional-label-schema.ts
 * ================================================================
 * Schema TypeScript v3.3 para regional labels del catálogo Chagra.
 * Parte del DR-LANG-2: sinónimos y regionalismos agrícolas colombianos.
 *
 * Tipos principales:
 * - Region: enum de 20 regiones colombianas
 * - RegionalLabel: etiquetas regionales con metadata de confianza
 * - ConfusionWarning: advertencias de ambigüedad peligrosa
 *
 * Este schema se usa para validar data/catalog/regional-labels-v3.3.json
 * ================================================================
 */

/**
 * Enum de 20 regiones colombianas según ALEC + división geopolítica.
 * Basado en isoglosas del Atlas Lingüístico-Etnográfico de Colombia.
 */
export type Region =
  // Región Andina
  | 'andina_norte'     // Norte de Santander, Boyacá, parte de Cundinamarca
  | 'andina_centro'    // Antioquia, Eje Cafetero (Caldas, Quindío, Risaralda)
  | 'andina_sur'       // Nariño, Cauca, sur del Huila
  | 'antioquia'        // Antioquia específicamente (distinto del Eje Cafetero)
  | 'eje_cafetero'     // Caldas, Quindío, Risaralda (zona cafetera核)
  | 'cundiboyacense'   // Altiplano Cundiboyacense
  // Región Caribe
  | 'caribe'           // Caribe general
  | 'caribe_sabanero'  // Sabanas de Córdoba, Sucre
  | 'guajira'          // La Guajira
  | 'cesar'            // Cesar
  | 'magdalena'        // Magdalena
  // Región Pacífica
  | 'pacifica'         // Pacífico general (Chocó, Valle del Cauca litoral)
  | 'choco'            // Chocó específico
  | 'palenque'         // Palenque de San Basilio
  // Región Orinoquía
  | 'orinoquia'        // Orinoquía general
  | 'meta'             // Meta
  | 'casanare'         // Casanare
  | 'arauca'           // Arauca
  // Región Amazonía
  | 'amazonia'         // Amazonía general
  | 'putumayo'         // Putumayo
  | 'caqueta'          // Caquetá
  // Transversal
  | 'transversal';     // Zonas transversales (valles interandinos, etc.)

/**
 * Etiqueta regional con metadata de confianza y trazabilidad.
 * Representa un nombre vernáculo usado por campesinos para referirse
 * a una especie, labor, biopreparado o unidad de medida.
 */
export interface RegionalLabel {
  /** Etiqueta regional (ej: "palta", "guineo", "choclo", "platear") */
  label: string;

  /** ID de la especie canónica si aplica (FK a Species) */
  species_id?: string;

  /** Tipo de entidad: species | labor | biopreparado | unidad | plaga */
  entity_type: 'species' | 'labor' | 'biopreparado' | 'unidad' | 'plaga';

  /** Lista de regiones donde se usa esta etiqueta */
  regions: Region[];

  /** Nivel de confianza en la identificación */
  confidence: 'alto' | 'medio' | 'bajo';

  /** Fuente de la información */
  source: 'ALEC' | 'ICA' | 'AGROSAVIA' | 'CENICAFE' | 'CORPOICA' | 'BERNAL_GALEANO' | 'DR_LANG_2' | 'CAMPO';

  /** Fecha de adición al catálogo (ISO 8601) */
  added_at: string;

  /** Notas adicionales contextuales */
  notes?: string;

  /** IDs de confusiones relacionadas (FK a ConfusionWarning[]) */
  confusion_ids?: string[];
}

/**
 * Advertencia de ambigüedad peligrosa.
 * Captura polisemias que pueden causar errores graves en recomendaciones.
 */
export interface ConfusionWarning {
  /** ID único de la advertencia (slug: kebab-case) */
  id: string;

  /** Etiqueta ambigua que causa confusión */
  label_ambiguo: string;

  /** Significado correcto en contexto agroecológico */
  meaning_correct: string;

  /** Significados erróneos comunes (oportunidad de alucinación IA) */
  meaning_wrong: string[];

  /** Regiones donde esta confusión es crítica (null = todas) */
  region_specific: Region[] | null;

  /** Severidad del impacto si se confunde */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Ejemplo de query donde esta confusión es probable */
  example_query: string;

  /** Explicación detallada del riesgo */
  explanation: string;

  /** Referencias bibliográficas o fuentes */
  sources?: string[];

  /** Fecha de adición */
  added_at: string;
}

/**
 * Estructura raíz del archivo regional-labels-v3.3.json
 */
export interface RegionalLabelsCatalog {
  /** Versión del schema (semver) */
  schema_version: string;

  /** Fecha de generación */
  generated_at: string;

  /** Generador (ej: "glm-4.6-task-199") */
  generated_by: string;

  /** Descripción del catálogo */
  description: string;

  /** Estadísticas del catálogo */
  stats: {
    total_regional_labels: number;
    total_confusion_warnings: number;
    regions_covered: number;
    high_confidence_entries: number;
  };

  /** Lista de etiquetas regionales */
  regional_labels: RegionalLabel[];

  /** Lista de advertencias de confusión */
  confusion_warnings: ConfusionWarning[];

  /** Mapa de regiones con metadata (opcional) */
  region_metadata?: Record<Region, {
    name: string;
    description: string;
    main_departamentos: string[];
  }>;
}

/**
 * Tipos de utilidad para validación
 */
export type EntityCategory = RegionalLabel['entity_type'];
export type ConfidenceLevel = RegionalLabel['confidence'];
export type SeverityLevel = ConfusionWarning['severity'];
export type SourceType = RegionalLabel['source'];
