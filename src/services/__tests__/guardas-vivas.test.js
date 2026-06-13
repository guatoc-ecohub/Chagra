import { describe, it, expect } from 'vitest';
import { diagnosticarSuelo } from '../soilDiagnostic';
import { diagnosticarAgua } from '../waterDiagnostic';
import { diagnosticarAnimal } from '../animalDiagnostic';
import { diagnosticarRestauracion } from '../restauracionDiagnostic';

describe('guardas — todas vivas (ninguna muerta)', () => {
  it('suelo: vinagre -> MITO', () => {
    const d = diagnosticarSuelo('le eche vinagre a la tierra para medir el ph');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('vinagre'))).toBe(true);
  });
  it('suelo: bicarbonato -> MITO', () => {
    const d = diagnosticarSuelo('hice la prueba del bicarbonato');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('bicarbonato'))).toBe(true);
  });
  it('suelo: aguacate+mal drenaje -> ALERTA CRITICA', () => {
    const d = diagnosticarSuelo('quiero sembrar aguacate y el terreno se empoza');
    expect(d.advertencias.some((a) => a.includes('ALERTA CRITICA') && a.includes('Phytophthora'))).toBe(true);
  });
  it('agua: lunar -> MITO', () => {
    const d = diagnosticarAgua('debo regar en luna menguante');
    expect(d.advertencias.some((a) => a.includes('MITO') && a.includes('lunar'))).toBe(true);
  });
  it('agua: hidrogel -> NO AGROECOLOGICO', () => {
    const d = diagnosticarAgua('puedo usar hidrogel para retener agua');
    expect(d.advertencias.some((a) => a.includes('NO AGROECOLOGICO'))).toBe(true);
  });
  it('agua: siempre incluye guarda marchitez mediodia', () => {
    const d = diagnosticarAgua('se me seca el cultivo');
    expect(d.advertencias.some((a) => a.includes('marchitez') || a.includes('punado'))).toBe(true);
  });
  it('animal: leucaena a cerdo -> PROHIBIDA', () => {
    const d = diagnosticarAnimal('les doy leucaena a los marranos');
    expect(d.guardas.some((g) => g.includes('PROHIBIDA'))).toBe(true);
  });
  it('animal: leucaena NO prohibida a rumiantes', () => {
    const d = diagnosticarAnimal('tengo vacas lecheras');
    expect(d.guardas.some((g) => g.includes('PROHIBIDA'))).toBe(false);
  });
  it('restauracion: pino -> guarda anti-exoticas', () => {
    const d = diagnosticarRestauracion('voy a sembrar pino para restaurar');
    expect(d.alertas.some((a) => a.includes('Pino') || a.includes('NO son restauracion'))).toBe(true);
  });
  it('restauracion: carbono -> alerta', () => {
    const d = diagnosticarRestauracion('me quieren pagar por sembrar arboles');
    expect(d.alertas.some((a) => a.includes('BONOS') || a.includes('carbono'))).toBe(true);
  });
});
