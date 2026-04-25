/**
 * repetitionGuard.js — Protección contra loops de IA (v0.7.2).
 * AGPL-3.0 © Chagra
 */

/**
 * Detecta si un texto tiene repeticiones excesivas de palabras consecutivas.
 * Si encuentra patrones tipo "palabra palabra palabra", trunca el texto en el último punto
 * antes de la repetición y añade una advertencia.
 * 
 * @param {string} text - El texto generado por la IA.
 * @returns {string} Texto sanitizado.
 */
export function detectAndTruncateRepetition(text) {
    if (!text || typeof text !== 'string') return '';

    // 1. Detección por regex: Triple repetición de la misma palabra (ej: "excelente excelente excelente")
    // Este es el loop más común en modelos 4b con baja repeat_penalty.
    const tripleRepeatRegex = /(\b\w+\b)\s+\1\s+\1/i;
    const match = text.match(tripleRepeatRegex);

    if (match) {
        const loopIndex = match.index;
        // Truncar al último punto antes del loop
        const lastPeriod = text.lastIndexOf('.', loopIndex);
        if (lastPeriod !== -1 && lastPeriod > 10) {
            return text.slice(0, lastPeriod + 1) + ' [Respuesta truncada por repetición detectada]';
        }
        // Si no hay punto cercano, truncar justo antes del loop
        return text.slice(0, loopIndex).trim() + '... [Respuesta truncada]';
    }

    // 2. Detección por densidad (opcional, para loops más largos)
    // Dividimos en tokens y miramos si hay ráfagas de repetición.
    const tokens = text.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (tokens.length > 10) {
        let repeats = 0;
        for (let i = 1; i < tokens.length; i++) {
            if (tokens[i] === tokens[i - 1]) repeats++;
        }
        if (repeats / tokens.length > 0.3) {
            return text.slice(0, text.length / 2) + '... [Respuesta truncada por densidad de repetición]';
        }
    }

    return text;
}
