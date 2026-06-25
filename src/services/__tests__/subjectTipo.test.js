import { describe, it, expect } from 'vitest';
import { tipoDeSubject, TIPOS_PLANTA } from '../subjectTipo';

describe('subjectTipo — tipoDeSubject (derivación offline del tipo botánico)', () => {
  it('los casos insignia del operador caen al tipo correcto', () => {
    // Fresa floreciendo, aguacate fructificando, hortalizas, aromáticas.
    expect(tipoDeSubject('fragaria_ananassa')).toBe('frutal'); // fresa
    expect(tipoDeSubject('persea_americana')).toBe('frutal'); // aguacate
    expect(tipoDeSubject('solanum_lycopersicum')).toBe('hortaliza'); // tomate
    expect(tipoDeSubject('lactuca_sativa')).toBe('hortaliza'); // lechuga
    expect(tipoDeSubject('rosmarinus_officinalis')).toBe('aromatica'); // romero
  });

  it('frutales del catálogo → frutal (árbol con fruto)', () => {
    for (const slug of ['citrus_limon', 'musa_paradisiaca', 'psidium_guajava',
      'passiflora_edulis', 'rubus_glaucus', 'theobroma_cacao', 'coffea_arabica']) {
      expect(tipoDeSubject(slug)).toBe('frutal');
    }
  });

  it('huerta del catálogo → hortaliza (cama/era)', () => {
    for (const slug of ['zea_mays', 'phaseolus_vulgaris', 'daucus_carota',
      'brassica_oleracea_capitata', 'solanum_tuberosum', 'cucurbita_maxima',
      'allium_cepa']) {
      expect(tipoDeSubject(slug)).toBe('hortaliza');
    }
  });

  it('aromáticas/medicinales del catálogo → aromatica (mata compacta)', () => {
    for (const slug of ['mentha_piperita', 'ocimum_basilicum', 'calendula_officinalis',
      'cymbopogon_citratus', 'aloe_vera', 'origanum_vulgare']) {
      expect(tipoDeSubject(slug)).toBe('aromatica');
    }
  });

  it('árboles maderables/sombra/invasoras → otro (silueta neutra)', () => {
    for (const slug of ['cedrela_odorata', 'eucalyptus_globulus', 'tabebuia_rosea',
      'ulex_europaeus', 'alnus_acuminata']) {
      expect(tipoDeSubject(slug)).toBe('otro');
    }
  });

  it('especie fuera del mapa cae por substring del slug/nombre', () => {
    // No están en el mapa estático, pero el respaldo por término las clasifica.
    expect(tipoDeSubject('mangifera_indica', { nombre: 'Mango' })).toBe('frutal');
    expect(tipoDeSubject('thymus_vulgaris', { nombre: 'Tomillo' })).toBe('aromatica');
    expect(tipoDeSubject('cucumis_melo', { nombre: 'Melón' })).toBe('hortaliza');
  });

  it('usa la categoría del catálogo si el slug no está en el mapa', () => {
    expect(tipoDeSubject('especie_nueva_xyz', { categoria: 'frutales_perennes' })).toBe('frutal');
    expect(tipoDeSubject('especie_nueva_xyz', { categoria: 'hortalizas_hoja' })).toBe('hortaliza');
    expect(tipoDeSubject('especie_nueva_xyz', { categoria: 'medicinales_alelopaticas' })).toBe('aromatica');
  });

  it('sin señal alguna → otro (default seguro, nunca inventa frutal)', () => {
    expect(tipoDeSubject('zzz_desconocida_123')).toBe('otro');
    expect(tipoDeSubject('')).toBe('otro');
    expect(tipoDeSubject(null)).toBe('otro');
    expect(tipoDeSubject(undefined)).toBe('otro');
  });

  it('siempre devuelve un tipo válido del enum', () => {
    for (const slug of ['fragaria_ananassa', 'zea_mays', 'mentha_piperita',
      'cedrela_odorata', 'cualquier_cosa']) {
      expect(TIPOS_PLANTA).toContain(tipoDeSubject(slug));
    }
  });

  it('es tolerante a mayúsculas/tildes/espacios en el slug', () => {
    expect(tipoDeSubject('  Fragaria_Ananassa ')).toBe('frutal');
    expect(tipoDeSubject('Rosmarinus_Officinalis')).toBe('aromatica');
  });
});
