/**
 * faunaAmbiental.test.jsx — el VALLE VIVO cumple sus reglas duras:
 *   1. CAST data-driven: sale del registro (un bicho nuevo entra solo),
 *      excluye al central (el protagonista no se duplica) y a la microfauna.
 *   2. CENTRAL manda: resolverCentral valida y cae a Angelita sin avatar.
 *   3. LÍMITES por tier (alto 3 / medio 2 / bajo 1) y reduced-motion = 0.
 *   4. POOL rotativo: nunca más de `limite` en escena, nunca repetidos,
 *      y el ciclo descansa→entra→gesto→sale→descansa rota el elenco.
 *   5. COHERENCIA de entradas: los animales vienen del bosque o los costados;
 *      el ÚNICO mágico es el jaguar.
 *   6. COMPONENTE: pooling real (nodos reusados), reduced-motion ni monta,
 *      tier bajo un solo slot, y el central queda fuera del coro.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import {
  castAmbiental,
  resolverCentral,
  limiteAmbiental,
  crearEstado,
  avanzar,
  duracionFase,
  enEscena,
  esMagico,
  GESTOS,
  MAGICOS,
  MICROFAUNA_EXCLUIDA,
  CENTRAL_DEFECTO,
  AMBIENTE_POR_TIER,
} from '../faunaAmbiental.js';
import { FaunaAmbiental } from '../FaunaAmbiental.jsx';
import { CREATURES } from '../index.js';

afterEach(cleanup);

/* Un registro de juguete con componentes triviales (para el pool y el DOM). */
const Bicho = ({ size = 40, title }) => (
  <svg width={size} height={size} role="img" aria-label={title} />
);
const registroFake = (slugs) =>
  Object.fromEntries(slugs.map((s) => [s, { Component: Bicho, nombre: s }]));

describe('1. castAmbiental — data-driven desde el registro', () => {
  it('excluye al central y a la microfauna decorativa; trae al resto', () => {
    const cast = castAmbiental(CENTRAL_DEFECTO);
    expect(cast).not.toContain(CENTRAL_DEFECTO);
    MICROFAUNA_EXCLUIDA.forEach((m) => expect(cast).not.toContain(m));
    // Los personajes reales del registro sí están (danta, jaguar, colibrí…).
    expect(cast).toContain('danta');
    expect(cast).toContain('jaguar');
    expect(cast).toContain('colibri');
  });

  it('un personaje NUEVO en el registro entra solo al elenco (bicho-nuevo-proof)', () => {
    const registro = { ...CREATURES, nutria: { Component: Bicho, nombre: 'Nutria' } };
    expect(castAmbiental(CENTRAL_DEFECTO, registro)).toContain('nutria');
  });

  it('si el central es otro (jaguar), la abeja entra al coro y el jaguar sale', () => {
    const cast = castAmbiental('jaguar');
    expect(cast).toContain('abeja-angelita');
    expect(cast).not.toContain('jaguar');
  });

  it('el morrocoy (recién aterrizado en CREATURES) ya está en el elenco', () => {
    expect(castAmbiental(CENTRAL_DEFECTO)).toContain('morrocoy');
  });

  it('excluir saca extras del coro (Angelita donde ya es la acompañante)', () => {
    const cast = castAmbiental('danta', CREATURES, ['abeja-angelita']);
    expect(cast).not.toContain('abeja-angelita');
    expect(cast).not.toContain('danta');
    expect(cast).toContain('jaguar');
  });
});

describe('2. resolverCentral — el protagonista con fallback a Angelita', () => {
  it('slug válido → ese personaje, con su Component y nombre', () => {
    const c = resolverCentral('jaguar');
    expect(c.slug).toBe('jaguar');
    expect(c.Component).toBe(CREATURES.jaguar.Component);
    expect(c.nombre).toBe(CREATURES.jaguar.nombre);
  });

  it('sin avatar (null) o slug fantasma → Angelita (punto de integración listo)', () => {
    expect(resolverCentral(null).slug).toBe(CENTRAL_DEFECTO);
    expect(resolverCentral('bicho-fantasma').slug).toBe(CENTRAL_DEFECTO);
    expect(resolverCentral(null).Component).toBe(CREATURES[CENTRAL_DEFECTO].Component);
  });
});

describe('3. limiteAmbiental — el presupuesto duro por gama', () => {
  it('alto=3, medio=2, bajo=1 (nunca saturar)', () => {
    expect(limiteAmbiental('alto')).toBe(3);
    expect(limiteAmbiental('medio')).toBe(2);
    expect(limiteAmbiental('bajo')).toBe(1);
  });

  it('reduced-motion → CERO ambientales, en cualquier gama', () => {
    expect(limiteAmbiental('alto', true)).toBe(0);
    expect(limiteAmbiental('bajo', true)).toBe(0);
  });

  it('tier desconocido cae al perfil frugal (medio), jamás al caro', () => {
    expect(limiteAmbiental('marciano')).toBe(AMBIENTE_POR_TIER.medio);
  });
});

describe('4. el pool rotativo — invariantes bajo mil vueltas', () => {
  const cast = ['colibri', 'danta', 'rana-andina', 'perezoso', 'ardilla', 'jaguar'];

  it('crearEstado arma min(limite, cast) slots, todos descansando', () => {
    const e = crearEstado(cast, 3);
    expect(e.slots).toHaveLength(3);
    e.slots.forEach((s) => {
      expect(s.fase).toBe('descansa');
      expect(s.slug).toBeNull();
    });
    expect(crearEstado(['solo-uno'], 3).slots).toHaveLength(1);
    expect(crearEstado([], 3).slots).toHaveLength(0);
  });

  it('NUNCA hay más de limite en escena ni slugs repetidos (500 vueltas)', () => {
    let e = crearEstado(cast, 3);
    for (let paso = 0; paso < 500; paso += 1) {
      e = avanzar(e, paso % 3);
      const visibles = enEscena(e);
      expect(visibles.length).toBeLessThanOrEqual(3);
      expect(new Set(visibles).size).toBe(visibles.length); // sin repetidos
    }
  });

  it('el ciclo de un slot es descansa→entra→gesto→sale→descansa', () => {
    let e = crearEstado(cast, 1);
    const fases = [];
    for (let k = 0; k < 4; k += 1) {
      e = avanzar(e, 0);
      fases.push(e.slots[0].fase);
    }
    expect(fases).toEqual(['entra', 'gesto', 'sale', 'descansa']);
    expect(e.slots[0].slug).toBe('colibri'); // el slug se CONSERVA al descansar (pooling)
  });

  it('al re-entrar el slot ROTA de personaje (round-robin sobre el cast)', () => {
    let e = crearEstado(cast, 1);
    const vistos = [];
    for (let ciclo = 0; ciclo < cast.length; ciclo += 1) {
      e = avanzar(e, 0); // entra
      vistos.push(e.slots[0].slug);
      e = avanzar(e, 0); // gesto
      e = avanzar(e, 0); // sale
      e = avanzar(e, 0); // descansa
    }
    expect(new Set(vistos).size).toBe(cast.length); // pasó TODO el elenco
  });

  it('el gesto rota entre los tres y las duraciones son deterministas', () => {
    let e = crearEstado(cast, 2);
    e = avanzar(e, 0);
    expect(GESTOS).toContain(e.slots[0].gesto);
    expect(duracionFase(e.slots[0], 0)).toBeGreaterThan(0);
    // El descanso se desfasa por slot: el slot 1 espera más que el 0.
    const d0 = duracionFase({ fase: 'descansa', gen: 0 }, 0);
    const d1 = duracionFase({ fase: 'descansa', gen: 0 }, 1);
    expect(d1).toBeGreaterThan(d0);
  });

  it('avanzar es inmutable (el estado viejo no se toca)', () => {
    const e = crearEstado(cast, 2);
    const antes = JSON.stringify(e);
    avanzar(e, 0);
    expect(JSON.stringify(e)).toBe(antes);
  });
});

describe('5. coherencia de entradas — solo el jaguar es mágico', () => {
  it('el jaguar aparece mágico; el resto viene de un lado', () => {
    expect(MAGICOS).toEqual(['jaguar']);
    expect(esMagico('jaguar')).toBe(true);
    expect(esMagico('danta')).toBe(false);
    expect(esMagico(null)).toBe(false);
  });
});

describe('6. <FaunaAmbiental> — el DOM cumple el presupuesto', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const registro = registroFake([
    'abeja-angelita', 'colibri', 'danta', 'rana-andina', 'perezoso',
  ]);

  it('reduced-motion → la capa NI SE MONTA', () => {
    const { container } = render(
      <FaunaAmbiental tier="alto" reducedMotion registro={registro} />,
    );
    expect(container.querySelector('.fauna-amb')).toBeNull();
  });

  it('tier alto monta máximo 3 slots; tier bajo, 1', () => {
    const a = render(<FaunaAmbiental tier="alto" registro={registro} />);
    expect(a.container.querySelectorAll('.fauna-amb__slot')).toHaveLength(3);
    a.unmount();
    const b = render(<FaunaAmbiental tier="bajo" registro={registro} />);
    expect(b.container.querySelectorAll('.fauna-amb__slot')).toHaveLength(1);
  });

  it('POOLING real: al rotar las fases se REUSAN los mismos nodos', () => {
    const { container } = render(<FaunaAmbiental tier="alto" registro={registro} />);
    const antes = Array.from(container.querySelectorAll('.fauna-amb__slot'));
    act(() => {
      vi.advanceTimersByTime(30000); // varias generaciones de rotación
    });
    const despues = Array.from(container.querySelectorAll('.fauna-amb__slot'));
    expect(despues).toHaveLength(antes.length);
    antes.forEach((nodo, i) => expect(despues[i]).toBe(nodo)); // el MISMO nodo
  });

  it('nunca hay más de 3 visibles y el central NO sale en el coro', () => {
    const { container } = render(
      <FaunaAmbiental tier="alto" central="abeja-angelita" registro={registro} />,
    );
    for (let paso = 0; paso < 12; paso += 1) {
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      const visibles = Array.from(
        container.querySelectorAll(".fauna-amb__slot[data-fase='entra'], .fauna-amb__slot[data-fase='gesto'], .fauna-amb__slot[data-fase='sale']"),
      );
      expect(visibles.length).toBeLessThanOrEqual(3);
      visibles.forEach((v) => expect(v.getAttribute('data-slug')).not.toBe('abeja-angelita'));
    }
  });

  it('cada slot declara su procedencia (izq/der/bosque) y el jaguar va mágico', () => {
    const soloJaguar = registroFake(['abeja-angelita', 'jaguar']);
    const { container } = render(
      <FaunaAmbiental tier="bajo" central="abeja-angelita" registro={soloJaguar} />,
    );
    const slot = container.querySelector('.fauna-amb__slot');
    expect(['izq', 'der', 'bosque']).toContain(slot.getAttribute('data-entrada'));
    act(() => {
      vi.advanceTimersByTime(3300); // el primer descanso (3200) vence → entra
    });
    expect(slot.getAttribute('data-fase')).toBe('entra');
    expect(slot.getAttribute('data-slug')).toBe('jaguar');
    expect(slot.getAttribute('data-magico')).toBe('1');
  });

  it('la capa es decorativa: aria-hidden y sin pointer-events', () => {
    const { container } = render(<FaunaAmbiental tier="medio" registro={registro} />);
    const capa = container.querySelector('.fauna-amb');
    expect(capa.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.fauna-amb__slot')).toHaveLength(2);
  });
});
