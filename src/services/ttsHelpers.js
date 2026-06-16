import { filterVoseo } from './voseoFilter.js';
import { resolveUserRegion } from './agentService.js';

export function applyVoseoGuard(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  try {
    let region = null;
    try { region = resolveUserRegion(); } catch (_) { region = null; }
    return filterVoseo(text, { formality: 'usted', telemetry: false, region });
  } catch (_) {
    return text;
  }
}

export function sanitizeForTTS(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/(?<![A-Za-z0-9])_([^_\n]+)_(?![A-Za-z0-9])/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/```[a-z]*\n?([\s\S]*?)```/gi, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+[.)]\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[\s]*>\s+/gm, '')
    .replace(/^[\s]*[-=*]{3,}[\s]*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/[*`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const SENTENCE_END_RE = /([.!?…])([\s\n]+|$)/;

export function splitIntoSentences(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const sentences = [];
  let buffer = '';
  let remaining = text;
  while (remaining.length > 0) {
    const match = SENTENCE_END_RE.exec(remaining);
    if (!match) {
      buffer += remaining;
      break;
    }
    const idx = match.index + match[1].length;
    buffer += remaining.slice(0, idx);
    remaining = remaining.slice(idx + (match[2] === '' ? 0 : match[2].length));
    if (buffer.trim().length >= 40) {
      sentences.push(buffer.trim());
      buffer = '';
    } else {
      buffer += ' ';
    }
  }
  if (buffer.trim().length > 0) sentences.push(buffer.trim());
  return sentences.filter((s) => s.length > 0);
}
