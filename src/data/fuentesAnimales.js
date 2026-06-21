/**
 * fuentesAnimales — catálogo de FUENTES PÚBLICAS y oficiales del módulo Animales.
 *
 * Solo dominios OFICIALES y reconocidos que con certeza existen, enlazando a su
 * home o a una sección estable (NO artículos/DOIs profundos inventados):
 *   - ICA (ica.gov.co)            — sanidad animal, notificación obligatoria
 *   - AGROSAVIA (agrosavia.co)    — investigación agropecuaria pública
 *   - CIPAV (cipav.org.co)        — sistemas silvopastoriles / agroecología
 *   - FEDEGAN (fedegan.org.co)    — ganadería bovina
 *   - Fenavi (fenavi.org)         — avicultura
 *   - FAO (fao.org)               — alimentación y agricultura, polinizadores
 *   - SENA (sena.edu.co)          — formación técnica gratuita
 *
 * Los enlaces se renderizan con target="_blank" rel="noopener noreferrer".
 */
export const FUENTES_OFICIALES = {
  ica: { nombre: 'ICA — Instituto Colombiano Agropecuario', url: 'https://www.ica.gov.co/', desc: 'Sanidad animal y enfermedades de notificación obligatoria' },
  agrosavia: { nombre: 'AGROSAVIA', url: 'https://www.agrosavia.co/', desc: 'Investigación agropecuaria pública de Colombia' },
  cipav: { nombre: 'CIPAV', url: 'https://www.cipav.org.co/', desc: 'Sistemas silvopastoriles y producción agroecológica' },
  fedegan: { nombre: 'FEDEGAN', url: 'https://www.fedegan.org.co/', desc: 'Ganadería bovina' },
  fenavi: { nombre: 'Fenavi', url: 'https://fenavi.org/', desc: 'Avicultura (huevo y pollo)' },
  fao: { nombre: 'FAO', url: 'https://www.fao.org/', desc: 'Alimentación, agricultura y polinizadores' },
  sena: { nombre: 'SENA', url: 'https://www.sena.edu.co/', desc: 'Formación técnica agropecuaria gratuita' },
};
