import CARBONO from '../data/carbono-alertas.json';

/**
 * Detecta si un texto menciona bonos/créditos de carbono y retorna alerta educativa.
 * @param {string|null} texto
 * @returns {object|null}
 */
export function detectarAlertaCarbono(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase();
  const detectado = /\b(bonos?|carbono|pagar\s+por\s+sembrar|cr[eé]ditos?\s+de\s+carbono)\b/.test(t);
  if (!detectado) return null;
  return {
    alerta: CARBONO.alerta_principal,
    trampas: CARBONO.trampas,
    recomendacion: CARBONO.recomendacion,
    que_hacer: CARBONO.que_hacer,
  };
}
