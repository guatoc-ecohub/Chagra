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
import { useState, useMemo, useCallback } from 'react';
import todasLasCards from '../data/agro-insight-cards.json';

// Mapa de palabras clave → entity_slug
// Incluye nombres comunes colombianos y variaciones regionales.
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
 * Hook principal.
 *
 * @param {string} textoChat
 * @param {string[]} insightsVistos
 */
export default function useInsightProactivo(textoChat, insightsVistos = []) {
  const [estado, setEstado] = useState('idle'); // 'idle' | 'ofreciendo' | 'aceptado' | 'rechazado'

  const slug = useMemo(() => detectarSlugEnTexto(textoChat), [textoChat]);
  const insight = useMemo(() => {
    if (!slug) return null;
    return elegirInsight(slug, insightsVistos);
  }, [slug, insightsVistos]);

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
