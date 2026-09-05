import { describe, expect, it } from 'vitest';
import {
  PERFILES,
  PERFILES_COMPAI,
  cuerpoDeClima,
} from '../creatureClimaCuerpo.js';

const CANONICOS = [
  'abeja-angelita',
  'jaguar',
  'oso-baston',
  'zariguya',
  'luciernaga',
  'chivito-punk',
  'guacamaya',
];

describe('creatureClima — contrato de los siete compai', () => {
  it('declara exactamente los siete perfiles canónicos y sus medios', () => {
    expect(Object.keys(PERFILES)).toEqual(CANONICOS);
    expect(PERFILES_COMPAI).toBe(PERFILES);
    for (const slug of CANONICOS) {
      expect(PERFILES[slug], `falta perfil de ${slug}`).toBeDefined();
      expect(PERFILES[slug].medio).toBeTruthy();
      expect(['aire', 'suelo']).toContain(PERFILES[slug].medio);
    }
  });

  it('conserva aliases de slug sin agregar identidades enumerables', () => {
    expect(PERFILES.angelita).toBe(PERFILES['abeja-angelita']);
    expect(PERFILES.chivito).toBe(PERFILES['chivito-punk']);
    expect(PERFILES['oso-andino']).toBeDefined();
    expect(PERFILES['rana-andina']).toBeDefined();
  });

  it('distingue lluvia, niebla, noche y Niño para cada especie', () => {
    for (const slug of CANONICOS) {
      const perfil = PERFILES[slug];
      const lluvia = cuerpoDeClima('lluvia', { perfil });
      const niebla = cuerpoDeClima('niebla', { perfil });
      const noche = cuerpoDeClima('noche', { perfil });
      const nino = cuerpoDeClima('soleado', { enso: 'nino', perfil });

      expect(lluvia.humedad).toBeGreaterThanOrEqual(0);
      expect(niebla.opacidad).toBeLessThan(1);
      expect(noche.tinte).toContain('brightness');
      expect(nino.tinte).toContain('sepia');
    }
  });

  it('las especies de suelo nunca reciben velocidad de alas', () => {
    for (const slug of CANONICOS) {
      const cuerpo = cuerpoDeClima('lluvia', { perfil: PERFILES[slug] });
      if (PERFILES[slug].medio === 'suelo') expect(cuerpo.velocidadAlas).toBe(1);
      else expect(cuerpo.velocidadAlas).not.toBe(1);
    }
  });

  it('tier bajo quita el blur de niebla sin perder la señal de opacidad', () => {
    for (const slug of CANONICOS) {
      const cuerpo = cuerpoDeClima('niebla', { perfil: PERFILES[slug], tier: 'bajo' });
      expect(cuerpo.tinte || '').not.toContain('blur(');
      expect(cuerpo.opacidad).toBeLessThan(1);
    }
  });
});
