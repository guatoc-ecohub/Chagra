import { describe, it, expect } from 'vitest';
import { resolveSipsaProduct, resolveProductoFromSlug } from '../sipsaPriceMap.js';

describe('resolveSipsaProduct', () => {
  it('match exacto minusculas', () => {
    expect(resolveSipsaProduct('papa')).toBe('solanum_tuberosum');
  });

  it('match exacto con mayusculas', () => {
    expect(resolveSipsaProduct('Papa')).toBe('solanum_tuberosum');
  });

  it('match con tildes', () => {
    expect(resolveSipsaProduct('Limón')).toBe('citrus_latifolia');
  });

  it('match con tildes y espacios extra', () => {
    expect(resolveSipsaProduct('  Tomate árbol  ')).toBe('solanum_betaceum');
  });

  it('match producto compuesto', () => {
    expect(resolveSipsaProduct('cebolla larga')).toBe('allium_fistulosum');
  });

  it('producto inexistente retorna null', () => {
    expect(resolveSipsaProduct('mandarina')).toBeNull();
  });

  it('producto inexistente con tildes retorna null', () => {
    expect(resolveSipsaProduct('Mandarina común')).toBeNull();
  });

  it('string vacio retorna null', () => {
    expect(resolveSipsaProduct('')).toBeNull();
  });

  it('alias mismo slug sandia y patilla', () => {
    const sandia = resolveSipsaProduct('sandia');
    const patilla = resolveSipsaProduct('patilla');
    expect(sandia).toBe(patilla);
    expect(sandia).toBe('citrullus_lanatus');
  });

  it('banano y platano mismo slug', () => {
    expect(resolveSipsaProduct('banano')).toBe('musa_paradisiaca');
    expect(resolveSipsaProduct('platano')).toBe('musa_paradisiaca');
  });

  it('frijol y habichuela mismo slug', () => {
    expect(resolveSipsaProduct('frijol')).toBe('phaseolus_vulgaris');
    expect(resolveSipsaProduct('habichuela')).toBe('phaseolus_vulgaris');
  });

  it('papa criolla varietal distinto de papa', () => {
    const papa = resolveSipsaProduct('papa');
    const criolla = resolveSipsaProduct('papa criolla');
    expect(papa).toBe('solanum_tuberosum');
    expect(criolla).toBe('solanum_phureja');
  });

  it('null input retorna null', () => {
    expect(resolveSipsaProduct(null)).toBeNull();
  });

  it('undefined input retorna null', () => {
    expect(resolveSipsaProduct(undefined)).toBeNull();
  });
});

describe('resolveProductoFromSlug (índice inverso slug→producto)', () => {
  it('slug de especie → producto SIPSA: solanum_tuberosum → papa', () => {
    expect(resolveProductoFromSlug('solanum_tuberosum')).toBe('papa');
  });

  it('solanum_phureja → papa criolla', () => {
    expect(resolveProductoFromSlug('solanum_phureja')).toBe('papa criolla');
  });

  it('persea_americana → aguacate', () => {
    expect(resolveProductoFromSlug('persea_americana')).toBe('aguacate');
  });

  it('round-trip: producto → slug → producto base', () => {
    const slug = resolveSipsaProduct('tomate');
    expect(resolveProductoFromSlug(slug)).toBe('tomate');
  });

  it('especie sin producto SIPSA mapeado → null (honesto)', () => {
    expect(resolveProductoFromSlug('coffea_arabica')).toBeNull();
  });

  it('slug compartido (musa_paradisiaca: platano/banano) → primero declarado', () => {
    // 'banano' aparece antes que 'platano' en el JSON fuente → gana banano.
    expect(resolveProductoFromSlug('musa_paradisiaca')).toBe('banano');
  });

  it('input inválido → null', () => {
    expect(resolveProductoFromSlug('')).toBeNull();
    expect(resolveProductoFromSlug(null)).toBeNull();
    expect(resolveProductoFromSlug(undefined)).toBeNull();
  });

  // Tests de nuevos mapeos agregados (verificados contra catálogo v3.2)
  it('mapeos nuevos: frutales tropicales', () => {
    expect(resolveSipsaProduct('pitaya')).toBe('hylocereus_undatus');
    expect(resolveSipsaProduct('pitahaya')).toBe('selenicereus_megalanthus');
    expect(resolveSipsaProduct('uchuva')).toBe('physalis_peruviana');
    expect(resolveSipsaProduct('feijoa')).toBe('acca_sellowiana');
    expect(resolveSipsaProduct('coco')).toBe('cocos_nucifera');
    expect(resolveSipsaProduct('chirimoya')).toBe('annona_cherimola');
    expect(resolveSipsaProduct('anon')).toBe('annona_squamosa');
  });

  it('mapeos nuevos: hortalizas adicionales', () => {
    expect(resolveSipsaProduct('berenjena')).toBe('solanum_melongena');
    expect(resolveSipsaProduct('calabaza')).toBe('cucurbita_maxima');
    expect(resolveSipsaProduct('zapallo')).toBe('cucurbita_maxima');
    expect(resolveSipsaProduct('perejil')).toBe('petroselinum_crispum');
    expect(resolveSipsaProduct('cebollin')).toBe('allium_schoenoprasum');
    expect(resolveSipsaProduct('puerro')).toBe('allium_ampeloprasum');
    expect(resolveSipsaProduct('nabo')).toBe('brassica_rapa');
  });

  it('mapeos nuevos: aromáticas y condimentos', () => {
    expect(resolveSipsaProduct('jengibre')).toBe('zingiber_officinale');
    expect(resolveSipsaProduct('curcuma')).toBe('curcuma_longa');
    expect(resolveSipsaProduct('romero')).toBe('rosmarinus_officinalis');
    expect(resolveSipsaProduct('hierbabuena')).toBe('mentha_spicata');
    expect(resolveSipsaProduct('eneldo')).toBe('anethum_graveolens');
    expect(resolveSipsaProduct('tomillo')).toBe('thymus_vulgaris');
    expect(resolveSipsaProduct('origano')).toBe('origanum_vulgare');
  });

  it('mapeos nuevos: variedades de papa', () => {
    expect(resolveSipsaProduct('papa sabanera')).toBe('solanum_tuberosum_sabanera');
    expect(resolveSipsaProduct('papa pastusa')).toBe('solanum_tuberosum_pastusa_suprema');
  });

  it('mapeos nuevos: leguminosas adicionales', () => {
    expect(resolveSipsaProduct('lenteja')).toBe('lens_culinaris_andina');
    expect(resolveSipsaProduct('garbanzo')).toBe('cicer_arietinum');
    expect(resolveSipsaProduct('haba')).toBe('vicia_faba');
  });

  it('mapeos nuevos: cereales', () => {
    expect(resolveSipsaProduct('trigo')).toBe('triticum_aestivum');
    expect(resolveSipsaProduct('cebada')).toBe('hordeum_vulgare');
    expect(resolveSipsaProduct('centeno')).toBe('secale_cereale');
  });

  it('mapeos nuevos: andinos y tubérculos', () => {
    expect(resolveSipsaProduct('quinua')).toBe('chenopodium_quinoa');
    expect(resolveSipsaProduct('amaranto')).toBe('amaranthus_caudatus');
    expect(resolveSipsaProduct('malanga')).toBe('xanthosoma_sagittifolium');
    expect(resolveSipsaProduct('name')).toBe('dioscorea_rotundata');
    expect(resolveSipsaProduct('taro')).toBe('colocasia_esculenta');
    expect(resolveSipsaProduct('jicama')).toBe('pachyrhizus_erosus');
    expect(resolveSipsaProduct('yacon')).toBe('smallanthus_sonchifolius');
    expect(resolveSipsaProduct('achira')).toBe('canna_edulis');
  });
});
