/**
 * agentOutboxAttachment.js — lógica PURA del flujo "adjunto no-foto → agente".
 *
 * Incidente prod (2026-05-31): el operador le pasó su HOJA DE VIDA (PDF) con
 * "analiza". La rama `attachment` de processOutboxItem despachaba el caption al
 * pipeline agronómico SIN mirar el tipo de archivo, y el LLM —sin poder leer el
 * PDF— FABRICÓ consejos de finca: alucinó un cultivo inexistente ("tomate fresa
 * arandano") y un nombre de usuario inventado ("Dante").
 *
 * Fix (este módulo): clasificar el adjunto. Si NO es una imagen analizable
 * (PDF, documento, audio, zip, etc.), el agente debe RESPONDER HONESTO y CORTO
 * —"solo analizo fotos de plantas"— SIN correr el pipeline. Solo las imágenes
 * de verdad bajan al flujo de visión (donde un guard aparte —branch
 * feat/guard-vision-sin-foto— maneja la imagen-sin-planta).
 *
 * PURO y SÍNCRONO — sin React ni IndexedDB. Testeable sin montar el componente.
 */

/** Extensiones de imagen que el flujo de visión sí puede intentar analizar. */
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif|tiff?)$/i;

/**
 * ¿El adjunto es una imagen que el flujo de visión puede intentar analizar?
 *
 * Detecta por MIME (`image/*`) y, como respaldo, por extensión del fileName
 * (los navegadores a veces no setean el mime). Tolerante a null/forma rara:
 * ante la duda devuelve false (degradar al rechazo honesto es lo seguro — el
 * costo de un falso "no es imagen" es solo pedir la foto de nuevo; el costo de
 * un falso "sí es imagen" es alucinar sobre un PDF).
 *
 * @param {object|null} item — item outbox (kind 'attachment') con { mime, fileName }
 * @returns {boolean}
 */
export function isAnalyzableImageAttachment(item) {
  if (!item || typeof item !== 'object') return false;
  const mime = (item.mime || '').toString().toLowerCase().trim();
  if (mime.startsWith('image/')) return true;
  // Mime ausente o genérico (application/octet-stream): caer a la extensión.
  if (!mime || mime === 'application/octet-stream') {
    const fileName = (item.fileName || '').toString();
    return IMAGE_EXT_RE.test(fileName);
  }
  return false;
}

/**
 * Mensaje HONESTO y corto cuando el usuario adjunta algo que NO es una foto de
 * planta (PDF, hoja de vida, documento, audio…). NO inventa diagnóstico. En
 * castellano colombiano, sin voseo.
 *
 * @param {object|null} item — item outbox con { mime, fileName }
 * @returns {string} mensaje no vacío para mostrar/hablar al usuario.
 */
export function buildAttachmentRejection(item) {
  const fileName = item && item.fileName ? String(item.fileName).trim() : '';
  const mime = item && item.mime ? String(item.mime).toLowerCase() : '';
  const esPdf = mime.includes('pdf') || /\.pdf$/i.test(fileName);
  const tipo = esPdf ? 'documentos PDF ni hojas de vida' : 'documentos ni archivos';
  return `Solo puedo analizar fotos de plantas o cultivos, no ${tipo} 😅. Mándame una foto de tu planta y te ayudo.`;
}
