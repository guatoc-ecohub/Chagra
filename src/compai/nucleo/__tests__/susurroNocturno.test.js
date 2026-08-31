/**
 * susurroNocturno — de noche el compAI baja la voz (#108).
 *
 * Contratos que cuidamos:
 *   - esDeNoche: ventana horaria correcta (19:00-05:45 = noche).
 *   - susurroDeNoche: menciona la fase lunar y/o el clima si hay dato,
 *     invita a descansar, y JAMÁS habla de sembrar por luna.
 *   - mensajeSaberLunarCampesino: SIEMPRE etiqueta como saber popular + nota
 *     honesta — el candado científico duro (#108, DR agricultura lunar).
 *   - susurroDeNoche nunca invoca ni menciona la creencia de siembra lunar.
 */
import { describe, it, expect } from 'vitest';
import { esDeNoche, susurroDeNoche, mensajeSaberLunarCampesino } from '../susurroNocturno';

describe('esDeNoche', () => {
  it('9pm es de noche', () => {
    expect(esDeNoche(new Date('2026-07-30T21:00:00'))).toBe(true);
  });
  it('11pm es de noche', () => {
    expect(esDeNoche(new Date('2026-07-30T23:30:00'))).toBe(true);
  });
  it('3am es de noche (madrugada)', () => {
    expect(esDeNoche(new Date('2026-07-30T03:00:00'))).toBe(true);
  });
  it('mediodía NO es de noche', () => {
    expect(esDeNoche(new Date('2026-07-30T12:00:00'))).toBe(false);
  });
  it('6pm (18:00) todavía NO es de noche (margen de atardecer)', () => {
    expect(esDeNoche(new Date('2026-07-30T18:00:00'))).toBe(false);
  });
  it('6am ya NO es de noche', () => {
    expect(esDeNoche(new Date('2026-07-30T06:00:00'))).toBe(false);
  });
});

describe('susurroDeNoche', () => {
  it('sin fase ni clima, igual invita a descansar sin inventar nada más', () => {
    const s = susurroDeNoche();
    expect(s).not.toBeNull();
    expect(s.mensaje).toMatch(/descanse/i);
    expect(s.gesto).toBe('susurra');
  });

  it('con fase lunar real, la nombra', () => {
    const s = susurroDeNoche({ fase: { name: 'Luna llena' } });
    expect(s.mensaje).toMatch(/luna llena/i);
    expect(s.mensaje).toMatch(/descanse/i);
  });

  it('con reacción de clima real, la anexa tal cual (mismo dato de #111)', () => {
    const s = susurroDeNoche({
      fase: { name: 'Cuarto creciente' },
      reaccionClima: { tipo: 'helada', mensaje: 'Uy, mañana hiela.', severidad: 'alta' },
    });
    expect(s.mensaje).toMatch(/cuarto creciente/i);
    expect(s.mensaje).toMatch(/mañana hiela/i);
  });

  it('NUNCA menciona sembrar, plantar ni labores agrícolas por la luna', () => {
    const s = susurroDeNoche({ fase: { name: 'Luna nueva' } });
    expect(s.mensaje).not.toMatch(/sembr|plant|cosech|labor/i);
  });
});

describe('mensajeSaberLunarCampesino — el candado científico duro', () => {
  it('sin fase, no dice nada (anti-fabricación)', () => {
    expect(mensajeSaberLunarCampesino(null)).toBeNull();
  });

  it('SIEMPRE etiqueta como saber campesino ("los mayores dicen")', () => {
    const m = mensajeSaberLunarCampesino({ name: 'Cuarto menguante' });
    expect(m).toMatch(/mayores dicen/i);
  });

  it('SIEMPRE incluye la nota honesta de que la ciencia no lo confirma', () => {
    const m = mensajeSaberLunarCampesino({ name: 'Luna llena' });
    expect(m).toMatch(/ciencia.*no.*confirmado/i);
  });

  it('nunca afirma causalidad directa ("hace que", "provoca", "garantiza")', () => {
    const m = mensajeSaberLunarCampesino({ name: 'Luna nueva' });
    expect(m).not.toMatch(/garantiza|siempre (produce|da)|provoca|hace que crezca/i);
  });
});
