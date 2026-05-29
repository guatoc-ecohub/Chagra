/**
 * photoAnalysis — armado del mensaje del agente para FEAT-2 (#291): análisis
 * de foto inline en el chat. Combina la identificación de especie (grounded
 * contra el catálogo Chagra vía AGE) con el diagnóstico fitosanitario del
 * follaje en un solo turno del asistente.
 *
 * El armado del texto + metadata se aísla aquí (sin llamar al modelo) para
 * poder testearlo unitariamente sin Ollama. AgentScreen llama a la pipeline
 * de visión (recognizeSpeciesGrounded + analyzeFoliage) y pasa los resultados
 * crudos a `buildPhotoAnalysisMessage`.
 */

/**
 * Mapa de estados de grounding (de `recognizeSpeciesGrounded._grounded.status`)
 * a una etiqueta corta para el usuario campesino colombiano. Wording sobrio,
 * cero hype — el catálogo está en construcción.
 */
const GROUNDED_LABELS = {
  verified: 'Verificado en el catálogo Chagra',
  'partial-match': 'Base verificada en el catálogo (variedad sin confirmar)',
  rejected: 'No encontrado en el catálogo, revísalo con calma',
  offline: 'Sin conexión, no se pudo verificar contra el catálogo',
  'no-binomial': 'Nombre científico poco claro, tómalo como aproximado',
  'sidecar-disabled': 'Verificación de catálogo deshabilitada',
  'sidecar-error': 'No se pudo consultar el catálogo en este momento',
};

/**
 * Formatea el porcentaje de confianza (0..1) a un entero legible. Si no es un
 * número válido, devuelve null para que el caller lo omita.
 */
function formatConfidence(confidence) {
  if (typeof confidence !== 'number' || Number.isNaN(confidence)) return null;
  const pct = Math.round(Math.max(0, Math.min(1, confidence)) * 100);
  return `${pct}%`;
}

/**
 * Construye el contenido textual + metadata del turno del asistente a partir
 * de los resultados crudos de la pipeline de visión.
 *
 * @param {Object} args
 * @param {Object|null} args.species   - salida de recognizeSpeciesGrounded
 *   (common_name_es, scientific_name, confidence, _grounded: { status, reason }).
 *   null si la identificación falló.
 * @param {Object|null} args.diagnosis - salida de analyzeFoliage
 *   (score, issues[], treatment_suggestion). null si el diagnóstico falló.
 * @returns {{ content: string, metadata: { tool_used: string, grounded: boolean } }}
 */
export function buildPhotoAnalysisMessage({ species, diagnosis }) {
  const lines = [];

  // --- Bloque identificación de especie ---
  if (species && (species.common_name_es || species.scientific_name)) {
    const common = (species.common_name_es || '').trim();
    const scientific = (species.scientific_name || '').trim();

    // Nombre común capitalizado para presentación (el servicio lo devuelve
    // en minúsculas). Si no hay común, usamos el científico como título.
    const commonTitle = common
      ? common.charAt(0).toUpperCase() + common.slice(1)
      : '';

    let header = '🌱 ';
    if (commonTitle && scientific) {
      header += `Parece **${commonTitle}** (${scientific})`;
    } else if (commonTitle) {
      header += `Parece **${commonTitle}**`;
    } else {
      header += `Parece *${scientific}*`;
    }
    lines.push(header + '.');

    const confLabel = formatConfidence(species.confidence);
    if (confLabel) {
      lines.push(`Confianza de la identificación: ${confLabel}.`);
    }

    const groundedStatus = species._grounded?.status;
    const groundedLabel = GROUNDED_LABELS[groundedStatus];
    if (groundedLabel) {
      lines.push(`Catálogo: ${groundedLabel}.`);
    }
  } else {
    lines.push('🌱 No logré identificar la especie con seguridad en esta foto.');
  }

  // --- Bloque diagnóstico fitosanitario ---
  if (diagnosis && typeof diagnosis.score === 'number') {
    lines.push('');
    lines.push(`🩺 Diagnóstico del follaje: ${diagnosis.score}/100.`);

    const issues = Array.isArray(diagnosis.issues) ? diagnosis.issues : [];
    if (issues.length > 0) {
      lines.push('Lo que observo:');
      for (const issue of issues) {
        lines.push(`• ${issue}`);
      }
    } else {
      lines.push('No detecté problemas evidentes en el follaje.');
    }

    const treatment = (diagnosis.treatment_suggestion || '').trim();
    if (treatment) {
      lines.push(`Recomendación: ${treatment}`);
    }
  } else if (!species) {
    // Ni ID ni diagnóstico — la pipeline falló entera.
    lines.push('');
    lines.push('Tampoco pude analizar el estado del follaje. Intenta de nuevo con una foto más cercana y con buena luz.');
  } else {
    lines.push('');
    lines.push('No pude evaluar el estado del follaje esta vez.');
  }

  // --- Metadata para el badge de fuente (SourceBadge) ---
  // Reusamos la misma forma { tool_used, grounded } que computeSourceMetadata
  // produce para los turnos de texto. Marcamos grounded:true solo cuando el
  // catálogo confirmó la especie ('verified' o 'partial-match'), igual que
  // el resto del agente. Así la burbuja hereda el styling verde existente.
  const groundedStatus = species?._grounded?.status;
  const grounded = groundedStatus === 'verified' || groundedStatus === 'partial-match';

  return {
    content: lines.join('\n'),
    metadata: { tool_used: 'validate_visual_match', grounded },
  };
}

export default buildPhotoAnalysisMessage;
