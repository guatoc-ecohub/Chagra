/**
 * fermentoFotos — resuelve la foto representativa (y su atribución CC) de cada
 * fermento alimentario para FermentosView.
 *
 * FUENTE ÚNICA: las fotos viven en `catalog/fotos/<tema>/*.webp` con su crédito
 * en `catalog/fotos/fotos-atribucion.json` (56 fotos CC, PR #2068). Aquí NO se
 * duplican al directorio público: Vite las empaqueta en build vía
 * `import.meta.glob`, así el bundle queda offline-first (lo cachea el SW) y se
 * mantiene una sola copia con su licencia al lado.
 *
 * RESPETO A LA LICENCIA (CC BY / BY-SA exigen crédito visible): cada foto se
 * acompaña SIEMPRE de autor + licencia enlazada a la fuente. El mapa
 * `FERMENTO_TEMA` asigna solo coincidencias HONESTAS (chucrut→chucrut,
 * yogur→lácteo fermentado…); los fermentos sin foto clara caen a un tarjetón de
 * color por tipo, nunca a una imagen que los tergiverse.
 */

import ATRIBUCION from '../../catalog/fotos/fotos-atribucion.json';

// Vite empaqueta en build-time SOLO las fotos que realmente usamos (no todo el
// directorio, que también trae fotos agro), para no inflar el chunk perezoso de
// Fermentos en conexiones rurales. Claves = ruta absoluta desde la raíz del
// proyecto ('/catalog/fotos/<tema>/<archivo>.webp').
// IMPORTANTE: esta lista debe cubrir cada archivo de FERMENTO_ARCHIVO +
// FOTO_PORTADA_ARCHIVO. Si agrega una foto abajo, agréguela también aquí.
const FOTOS_URL = import.meta.glob(
  [
    '/catalog/fotos/chicha/01-chicha-qero-ceremonial-chimu.webp',
    '/catalog/fotos/chucrut/01-chucrut-fermentando-jarra.webp',
    '/catalog/fotos/kimchi/01-kimchi-repollo-fermentado.webp',
    '/catalog/fotos/kombucha/01-kombucha-scoby-casero.webp',
    '/catalog/fotos/yogur_kumis/01-yogur-bowl-higos-nueces.webp',
    '/catalog/fotos/yogur_kumis/02-yogur-bebible-tipo-kumis.webp',
    '/catalog/fotos/yogur_kumis/03-yogur-casero-incubadora.webp',
    '/catalog/fotos/queso_campesino/01-queso-fresco-envuelto-tela.webp',
    '/catalog/fotos/masa_madre/02-masa-madre-pan-horneado.webp',
    '/catalog/fotos/vinagre_casero/01-vinagre-manzana-botella.webp',
    '/catalog/fotos/fermentacion_lactica/01-lactofermentacion-pepinos-frasco.webp',
  ],
  { eager: true, import: 'default', query: '?url' },
);

/** Índice de atribución por `archivo` (ruta sin barra inicial, como en el JSON). */
const ATRIB_BY_ARCHIVO = Object.create(null);
for (const a of ATRIBUCION) {
  if (a && a.archivo) ATRIB_BY_ARCHIVO[a.archivo] = a;
}

/**
 * Foto representativa por fermento (id del seed → archivo del catálogo).
 * Solo coincidencias honestas: la imagen ilustra ese fermento o su familia
 * directa (lácteo fermentado, cuajada≈queso fresco). Los fermentos ausentes
 * (masatos, champús, guarapo, chapo, siete_granos, kéfir de agua) usan el
 * tarjetón de color por tipo — no se les cuelga una foto que no les corresponde.
 */
export const FERMENTO_ARCHIVO = {
  chicha_maiz: 'catalog/fotos/chicha/01-chicha-qero-ceremonial-chimu.webp',
  chucrut: 'catalog/fotos/chucrut/01-chucrut-fermentando-jarra.webp',
  kimchi: 'catalog/fotos/kimchi/01-kimchi-repollo-fermentado.webp',
  kombucha: 'catalog/fotos/kombucha/01-kombucha-scoby-casero.webp',
  yogur: 'catalog/fotos/yogur_kumis/01-yogur-bowl-higos-nueces.webp',
  suero_costeno: 'catalog/fotos/yogur_kumis/02-yogur-bebible-tipo-kumis.webp',
  kefir_leche: 'catalog/fotos/yogur_kumis/03-yogur-casero-incubadora.webp',
  cuajada: 'catalog/fotos/queso_campesino/01-queso-fresco-envuelto-tela.webp',
  pan_masa_madre: 'catalog/fotos/masa_madre/02-masa-madre-pan-horneado.webp',
  vinagre_casero: 'catalog/fotos/vinagre_casero/01-vinagre-manzana-botella.webp',
};

/** Foto ilustrativa de portada (fermentación láctica genérica en frascos). */
export const FOTO_PORTADA_ARCHIVO =
  'catalog/fotos/fermentacion_lactica/01-lactofermentacion-pepinos-frasco.webp';

/**
 * Resuelve `{ url, autor, licencia, licencia_url, titulo, url_fuente }` para un
 * archivo del catálogo, o `null` si no está empaquetado.
 * @param {string} archivo — ruta relativa desde la raíz (`catalog/fotos/…webp`).
 */
export function getFotoPorArchivo(archivo) {
  if (!archivo) return null;
  const url = FOTOS_URL['/' + archivo];
  if (!url) return null;
  const a = ATRIB_BY_ARCHIVO[archivo] || {};
  return {
    url,
    autor: a.autor || null,
    licencia: a.licencia || null,
    licencia_url: a.licencia_url || null,
    titulo: a.titulo || null,
    url_fuente: a.url_fuente || null,
  };
}

/** Foto representativa de un fermento por su id, o `null` si no tiene. */
export function getFermentoFoto(id) {
  return getFotoPorArchivo(FERMENTO_ARCHIVO[id]);
}
