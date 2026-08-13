/**
 * useInsightProactivo — hook de opt-in proactivo de insights.
 *
 * Detecta el entity_slug de un cultivo en el texto del chat
 * y ofrece un insight verificado que el usuario aún no ha visto.
 *
 * Nunca muestra el insight sin el opt-in del usuario.
 *
 * @param {string} textoChat — texto del mensaje del agente o del usuario
 * @param {string[]} insightsVistos — ids de insight ya vistos por el usuario
 * @returns {{ oferta: object|null, aceptar: () => void, rechazar: () => void }}
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import todasLasCards from '../data/agro-insight-cards.json';
import { findCropInText } from '../services/speciesResolver';
import { datoAgroecologicoReal } from '../compai/nucleo/agroecologia.js';

// Alias de compatibilidad para las cards históricas. La detección nueva no
// depende de esta lista: consulta findCropInText contra el catálogo vivo.
const SLUG_KEYWORDS = {
  cafe: ['café', 'cafe', 'cafeto', 'coffea', 'cafetal', 'broca', 'roya', 'guamo cafetero'],
  papa: ['papa', 'potato', 'tubérculo', 'tuberculo', 'gota', 'tecia', 'polilla guatemalteca'],
  maiz: ['maíz', 'maiz', 'choclo', 'corn', 'cogollero', 'barrenador', 'mazorca', 'milpa'],
  frijol: ['frijol', 'fríjol', 'bean', 'caraota', 'fríjoles', 'habichuela'],
  tomate: ['tomate', 'tomato', 'tuta', 'licopersico', 'lycopersicum'],
  trigo: ['trigo', 'wheat', 'triticum', 'jawahir'],
  cebada: ['cebada', 'barley', 'hordeum'],
};

/**
 * Detecta el primer entity_slug presente en el texto.
 * Retorna null si no encuentra ninguno.
 *
 * @param {string} texto
 * @returns {string|null}
 */
export function detectarSlugEnTexto(texto) {
  if (!texto || typeof texto !== 'string') return null;
  const lower = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  // Normaliza también los keywords para comparación
  for (const [slug, keywords] of Object.entries(SLUG_KEYWORDS)) {
    for (const kw of keywords) {
      const kwNorm = kw.normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (lower.includes(kwNorm)) {
        return slug;
      }
    }
  }
  return null;
}

/**
 * Elige el insight más relevante para un slug dado que el usuario no ha visto.
 * Prioriza non_co=false (datos colombianos) sobre non_co=true.
 *
 * @param {string} slug
 * @param {string[]} insightsVistos
 * @returns {object|null}
 */
export function elegirInsight(slug, insightsVistos = []) {
  if (!slug) return null;
  const candidatos = todasLasCards.filter(
    (c) => c.entity_slug === slug && !insightsVistos.includes(c.id)
  );
  if (candidatos.length === 0) return null;
  // Primero los colombianos (non_co=false)
  const co = candidatos.filter((c) => !c.non_co);
  return co.length > 0 ? co[0] : candidatos[0];
}

/**
 * Convierte un dato estructurado del catálogo en una oferta de insight. La
 * card es derivada de campos verificables, no una ficha nueva ni un resumen de
 * prosa libre.
 *
 * @param {{species: object, slug: string, matchedName: string}} match
 * @param {string[]} insightsVistos
 * @returns {object|null}
 */
export function insightDesdeCatalogo(match, insightsVistos = []) {
  if (!match?.slug || insightsVistos.includes(`catalogo-${match.slug}-agro`)) return null;
  const especie = match.species || {};
  const nombre = especie.nombre_comun || especie.name_es || match.matchedName;
  // El núcleo conserva copy histórico con separadores largos; la tarjeta es
  // UI nueva y respeta la convención pública de no usar em dash.
  const dato = datoAgroecologicoReal(nombre, especie)?.replace(/\s+—\s+/g, ', ');
  if (!dato) return null;
  const fuentes = Array.isArray(especie.source_ids) ? especie.source_ids.filter(Boolean) : [];
  return {
    id: `catalogo-${match.slug}-agro`,
    entity_slug: match.slug,
    titulo: `Un dato de ${nombre}`,
    dato,
    fuente: fuentes.length > 0 ? `Catálogo Chagra: ${fuentes.join(', ')}` : 'Catálogo Chagra',
    non_co: false,
    region_analoga: null,
    leccion_base: 'asociaciones',
  };
}

/**
 * Busca una oferta para cualquier cultivo nombrado explícitamente en el
 * catálogo real. Primero conserva la prioridad de las cards curadas; cuando no
 * hay card, deriva una oferta sólo si existe un dato estructurado utilizable.
 *
 * @param {string} texto
 * @param {string[]} insightsVistos
 * @returns {Promise<{slug:string, insight:object}|null>}
 */
export async function detectarInsightCatalogo(texto, insightsVistos = []) {
  const match = await findCropInText(texto);
  if (!match) return null;
  const curado = elegirInsight(match.slug, insightsVistos);
  const insight = curado || insightDesdeCatalogo(match, insightsVistos);
  return insight ? { slug: match.slug, insight } : null;
}

/**
 * Hook principal.
 *
 * @param {string} textoChat
 * @param {string[]} insightsVistos
 */
export default function useInsightProactivo(textoChat, insightsVistos = []) {
  const [estado, setEstado] = useState('idle'); // 'idle' | 'ofreciendo' | 'aceptado' | 'rechazado'
  const [catalogo, setCatalogo] = useState(null);

  const slugLegacy = useMemo(() => detectarSlugEnTexto(textoChat), [textoChat]);
  const insightCurado = useMemo(() => {
    if (!slugLegacy) return null;
    return elegirInsight(slugLegacy, insightsVistos);
  }, [slugLegacy, insightsVistos]);

  useEffect(() => {
    let vivo = true;
    if (insightCurado) {
      setCatalogo(null);
      return () => { vivo = false; };
    }
    setCatalogo(null);
    detectarInsightCatalogo(textoChat, insightsVistos)
      .then((resultado) => { if (vivo) setCatalogo(resultado); })
      .catch(() => { if (vivo) setCatalogo(null); });
    return () => { vivo = false; };
  }, [textoChat, insightsVistos, insightCurado]);

  const slug = slugLegacy || catalogo?.slug || null;
  const insight = useMemo(() => {
    if (!slug) return null;
    return insightCurado || catalogo?.insight || elegirInsight(slug, insightsVistos);
  }, [slug, insightCurado, catalogo, insightsVistos]);

  // Oferta activa solo si hay insight disponible y no hemos decidido
  const oferta = (insight && estado === 'idle') ? insight : null;

  const aceptar = useCallback(() => {
    setEstado('aceptado');
  }, []);

  const rechazar = useCallback(() => {
    setEstado('rechazado');
  }, []);

  // Nota: el reset de estado se gestiona externamente pasando un textoChat
  // diferente en cada mensaje. El llamador es responsable del ciclo de vida.

  return {
    /** El insight disponible para oferta (null si no hay o ya se decidió) */
    oferta,
    /** El insight seleccionado si se aceptó */
    insightAceptado: estado === 'aceptado' ? insight : null,
    /** El slug detectado en el texto */
    slugDetectado: slug,
    /** Llama esto cuando el usuario acepta ver el insight */
    aceptar,
    /** Llama esto cuando el usuario rechaza la oferta */
    rechazar,
    /** Estado actual del hook */
    estado,
  };
}
