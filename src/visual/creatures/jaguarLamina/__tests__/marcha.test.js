/**
 * marcha.test.js — el motor del gait es MATEMÁTICA PURA (marcha.js), así que
 * aquí sí se verifica de verdad, sin GPU: que el IK reproduce la pose de
 * REPOSO medida (entrar/salir de la marcha sin tirón), que es consistente
 * con su FK (las rotaciones realmente llevan el pie al objetivo — piezas
 * rígidas que doblan por hueso, nunca estiradas), que la pisada apoyada
 * recorre el suelo a la velocidad EXACTA que anula el desplazamiento (cero
 * moonwalk) y que el ciclo cuadrúpedo mantiene siempre patas en el piso.
 */
import { describe, it, expect } from 'vitest';
import { PATAS, resolverIK, pieEnCiclo, periodoMarcha, poseMarcha } from '../marcha.js';
import { RIG_MARCHA, MARCHA, ANCHO } from '../anatomia.js';

const RAD = Math.PI / 180;

/** FK de control: aplica las rotaciones del IK sobre la cadena de reposo y
 *  devuelve dónde cae el pie (la MISMA cinemática que hacen los wrappers CSS
 *  anidados: rodilla dentro de cadera). */
function fkPie(pata, cadera, rodilla) {
  const a1 = pata.a1Reposo + cadera * RAD;
  const kx = pata.articulacion[0] + pata.L1 * Math.cos(a1);
  const ky = pata.articulacion[1] + pata.L1 * Math.sin(a1);
  const a2 = pata.a2Reposo + (cadera + rodilla) * RAD;
  return [kx + pata.L2 * Math.cos(a2), ky + pata.L2 * Math.sin(a2)];
}

describe('resolverIK — 2 huesos sobre los puntos medidos', () => {
  it('sobre el pie de REPOSO devuelve ~0°/0° en las 4 patas (sin tirón al entrar/salir de la marcha)', () => {
    for (const pata of Object.values(PATAS)) {
      const { cadera, rodilla } = resolverIK(pata, pata.pie[0], pata.pie[1]);
      expect(Math.abs(cadera)).toBeLessThan(1);
      expect(Math.abs(rodilla)).toBeLessThan(1.5);
    }
  });

  it('es consistente con su FK: las rotaciones llevan el pie al objetivo (±1px) en todo el barrido del ciclo', () => {
    for (const pata of Object.values(PATAS)) {
      const [ax, ay] = pata.anclaje;
      for (const dx of [-MARCHA.amplitud, -10, 0, 10, MARCHA.amplitud]) {
        for (const dy of [0, -pata.lift]) {
          const { cadera, rodilla } = resolverIK(pata, ax + dx, ay + dy);
          const [px, py] = fkPie(pata, cadera, rodilla);
          // Si el objetivo excede el alcance —o queda dentro del piso del
          // tope de flexión (dMin)— el IK proyecta sobre la misma recta (la
          // pata no se disloca ni se pliega de más): comparar contra el
          // proyectado.
          const d = Math.hypot(ax + dx - pata.articulacion[0], ay + dy - pata.articulacion[1]);
          const dOk = Math.min(Math.max(d, pata.dMin), pata.L1 + pata.L2 - 0.01);
          const eslon = dOk / d;
          const ox = pata.articulacion[0] + (ax + dx - pata.articulacion[0]) * eslon;
          const oy = pata.articulacion[1] + (ay + dy - pata.articulacion[1]) * eslon;
          expect(Math.hypot(px - ox, py - oy)).toBeLessThan(1);
        }
      }
    }
  });

  it('el vértice de flexión cae del lado anatómico (delanteras: carpo adelante −x; traseras: corvejón atrás +x)', () => {
    for (const pata of Object.values(PATAS)) {
      // flexión franca: pie levantado a medio vuelo, bajo la articulación.
      const fx = pata.articulacion[0];
      const fy = pata.anclaje[1] - pata.lift;
      const { cadera } = resolverIK(pata, fx, fy);
      const a1 = pata.a1Reposo + cadera * RAD;
      const kx = pata.articulacion[0] + pata.L1 * Math.cos(a1);
      // el vértice (rodilla) queda del lado `lado` respecto a la recta
      // articulación→pie (vertical en este objetivo).
      expect(Math.sign(kx - fx)).toBe(pata.lado);
    }
  });
});

describe('pieEnCiclo + periodoMarcha — la pisada anclada', () => {
  it('durante el APOYO el pie recorre el suelo a velocidad constante y a la altura del suelo (foot-plant)', () => {
    const pata = PATAS.trasCercana;
    const { duty, amplitud } = MARCHA;
    const a = pieEnCiclo(pata, 0);
    const m = pieEnCiclo(pata, duty * 0.5);
    const b = pieEnCiclo(pata, duty - 1e-9);
    expect(a.apoyo && m.apoyo && b.apoyo).toBe(true);
    // arranca adelante (−x: el jaguar mira a la izquierda), termina atrás.
    expect(a.x).toBeCloseTo(pata.anclaje[0] - amplitud, 5);
    expect(b.x).toBeCloseTo(pata.anclaje[0] + amplitud, 5);
    // velocidad constante: el punto medio cae exactamente en el medio.
    expect(m.x).toBeCloseTo(pata.anclaje[0], 5);
    // y clavada al suelo todo el apoyo.
    expect(a.y).toBe(pata.anclaje[1]);
    expect(m.y).toBe(pata.anclaje[1]);
    expect(b.y).toBe(pata.anclaje[1]);
  });

  it('el VUELO despega donde terminó el apoyo y aterriza donde arranca el siguiente (ciclo continuo, sin teletransporte)', () => {
    const pata = PATAS.delLejana;
    const { duty, amplitud } = MARCHA;
    const despegue = pieEnCiclo(pata, duty + 1e-6);
    expect(despegue.x).toBeCloseTo(pata.anclaje[0] + amplitud, 2);
    expect(despegue.y).toBeCloseTo(pata.anclaje[1], 1);
    const aterrizaje = pieEnCiclo(pata, 0.999999);
    expect(aterrizaje.x).toBeCloseTo(pata.anclaje[0] - amplitud, 2);
    expect(aterrizaje.y).toBeCloseTo(pata.anclaje[1], 1);
    // y a medio vuelo, levanta.
    const vuelo = pieEnCiclo(pata, duty + (1 - duty) / 2);
    expect(vuelo.apoyo).toBe(false);
    expect(pata.anclaje[1] - vuelo.y).toBeCloseTo(pata.lift, 1);
  });

  it('periodoMarcha anula el desplazamiento: velocidad del pie apoyado en pantalla = velocidad del roam', () => {
    for (const size of [48, 112, 240]) {
      const escala = size / ANCHO;
      const T = periodoMarcha(escala, MARCHA.velocidadPxS);
      // el pie apoyado retrocede 2·amplitud px de lámina en duty·T segundos;
      // en px de PANTALLA eso es exactamente lo que el roam avanza.
      const vPantalla = (2 * MARCHA.amplitud * escala) / (MARCHA.duty * T);
      expect(vPantalla).toBeCloseTo(MARCHA.velocidadPxS, 6);
    }
  });
});

describe('poseMarcha — el ciclo cuadrúpedo completo', () => {
  it('con peso 0 la pose ES el reposo (todos los ángulos 0, bob 0) — la rampa de entrada arranca de la lámina', () => {
    const pose = poseMarcha(0.37, 1, 0);
    expect(pose.bob).toBeCloseTo(0, 12);
    for (const ang of Object.values(pose.patas)) {
      expect(Math.abs(ang.cadera)).toBeLessThan(1);
      expect(Math.abs(ang.rodilla)).toBeLessThan(1.5);
    }
  });

  it('en todo instante hay al menos 2 patas apoyadas (marcha, no trote ni vuelo)', () => {
    for (let i = 0; i < 40; i++) {
      const ciclo = i / 40;
      let apoyadas = 0;
      for (const pata of Object.values(PATAS)) {
        const fase = (ciclo + 1 - pata.fase) % 1;
        if (fase < MARCHA.duty) apoyadas += 1;
      }
      expect(apoyadas).toBeGreaterThanOrEqual(2);
    }
  });

  it('devuelve ángulos acotados (piezas que doblan, no aspas de molino): cadera < 40°, rodilla < 42°', () => {
    // Los picos reales del ciclo tras el refino 2026-08-18: ~33° de cadera
    // trasera cercana (recogida del vuelo con el pivote del fémur adentro
    // del cuerpo) y 36° de rodilla delantera (el tope plieMax mordiendo a
    // medio vuelo). Lo que este test acota es el desastre (aspas girando
    // vueltas completas), no la flexión natural.
    const T = 1;
    for (const t of [0, 0.13, 0.29, 0.41, 0.57, 0.73, 0.89]) {
      const pose = poseMarcha(t * T, T, 1);
      for (const ang of Object.values(pose.patas)) {
        expect(Math.abs(ang.cadera)).toBeLessThan(40);
        expect(Math.abs(ang.rodilla)).toBeLessThan(42);
      }
    }
  });

  it('el tope de flexión (plieMax) se respeta en TODO el ciclo — la zarpa nunca se enrosca (el −59° del carpo que se leía "pata rota")', () => {
    const T = 1;
    for (let i = 0; i < 160; i++) {
      const pose = poseMarcha((i / 160) * T, T, 1);
      for (const [clave, ang] of Object.entries(pose.patas)) {
        // la rodilla FK es exactamente la rotación de la articulación de
        // rodilla sobre el reposo: su magnitud es el pliegue (o extensión).
        expect(Math.abs(ang.rodilla)).toBeLessThan(PATAS[clave].plieMax + 0.6);
      }
    }
  });

  it('el piso dMin del tope NUNCA muerde en apoyo: la pisada clavada no se sacrifica por el pliegue', () => {
    const T = 1;
    for (let i = 0; i < 400; i++) {
      const ciclo = i / 400;
      const bob = MARCHA.bob * Math.sin(4 * Math.PI * ciclo);
      for (const pata of Object.values(PATAS)) {
        const fase = (ciclo + 1 - pata.fase) % 1;
        const objetivo = pieEnCiclo(pata, fase);
        if (!objetivo.apoyo) continue;
        const d = Math.hypot(
          objetivo.x - pata.articulacion[0],
          objetivo.y - bob - pata.articulacion[1],
        );
        expect(d).toBeGreaterThan(pata.dMin);
      }
    }
  });

  it('las delanteras despegan sin quedar pegadas al tope de carpo', () => {
    for (let i = 0; i < 400; i++) {
      const ciclo = i / 400;
      const bob = MARCHA.bob * Math.sin(4 * Math.PI * ciclo);
      for (const pata of [PATAS.delLejana, PATAS.delCercana]) {
        const fase = (ciclo + 1 - pata.fase) % 1;
        const objetivo = pieEnCiclo(pata, fase);
        if (objetivo.apoyo) continue;
        const d = Math.hypot(
          objetivo.x - pata.articulacion[0],
          objetivo.y - bob - pata.articulacion[1],
        );
        expect(d).toBeGreaterThan(pata.dMin + 0.1);
      }
    }
  });
});
