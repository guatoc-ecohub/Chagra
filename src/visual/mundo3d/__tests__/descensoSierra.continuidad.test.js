/*
 * PUERTA DEL PASO 3 — «continuidad end-to-end, sin saltos de luz ni de niebla
 * entre bandas», hecha medición y no impresión.
 *
 * La escena 3D es viva: dos corridas idénticas cambian ~45 % de los píxeles,
 * así que un diff de capturas NO puede demostrar continuidad. Lo que sí puede
 * es esto: muestrear el descenso milisegundo a milisegundo y acotar el salto
 * máximo de cada magnitud óptica. Si alguna banda conmutara un preset, aquí
 * aparecería un pico. El gate visual (capturas crudas) queda para el operador;
 * este test es el instrumento, y mide AL LADO de lo que juzga.
 */
import { describe, it, expect } from 'vitest';
import {
  BANDAS_DESCENSO,
  COTA_SIN_UBICACION,
  DURACION_DESCENSO_MS,
  bandaDominante,
  camaraEnMsnm,
  cotaDestino,
  duracionDescenso,
  estadoDescenso,
  franjaCondensacion,
  fxEnMsnm,
  msnmEnMs,
  opticaEnMsnm,
  pesosBanda,
  planDescenso,
} from '../sierra/descensoSierra.js';
import { CUMBRE_M } from '../sierra/sierraRelieve.js';

const COTA_USUARIO = 2640; // la finca del diseño (§4.3)

function muestrear(cota, opts = {}) {
  const plan = planDescenso(cota, 'alto');
  const filas = [];
  for (let ms = 0; ms <= plan.total; ms += 1) {
    filas.push(estadoDescenso(ms, { plan, tier: 'alto', ...opts }));
  }
  return { plan, filas };
}

/** Salto máximo entre muestras consecutivas para una magnitud. */
function saltoMax(filas, leer) {
  let peor = 0;
  let dondeMs = 0;
  for (let i = 1; i < filas.length; i++) {
    const d = Math.abs(leer(filas[i]) - leer(filas[i - 1]));
    if (d > peor) {
      peor = d;
      dondeMs = filas[i].ms;
    }
  }
  return { peor, dondeMs };
}

describe('descenso — la curva de altitud', () => {
  it('arranca en la cumbre y frena EXACTAMENTE en la cota del usuario', () => {
    const plan = planDescenso(COTA_USUARIO, 'alto');
    expect(msnmEnMs(0, plan)).toBeCloseTo(CUMBRE_M, 3);
    expect(msnmEnMs(plan.total, plan)).toBeCloseTo(COTA_USUARIO, 3);
  });

  it('es monótona decreciente: nunca sube de vuelta', () => {
    const { plan, filas } = muestrear(COTA_USUARIO);
    for (let i = 1; i < filas.length; i++) {
      expect(filas[i].msnm).toBeLessThanOrEqual(filas[i - 1].msnm + 1e-6);
    }
    expect(plan.total).toBe(DURACION_DESCENSO_MS.alto);
  });

  it('el descenso arranca desde la Sierra COMPLETA, no desde la cota del usuario', () => {
    // Decisión del operador: el encuadre inicial es «mar y nieve en el mismo
    // cuadro». Si arrancara en la cota del usuario, no habría escala.
    for (const cota of [300, 1500, 2640, 3900]) {
      expect(msnmEnMs(0, planDescenso(cota, 'alto'))).toBeCloseTo(CUMBRE_M, 3);
    }
  });

  it('sin ubicación para en la banda templada y lo declara', () => {
    const sin = cotaDestino(undefined);
    expect(sin.conUbicacion).toBe(false);
    expect(sin.cota).toBe(COTA_SIN_UBICACION);
    expect(sin.cota).toBeGreaterThanOrEqual(1000);
    expect(sin.cota).toBeLessThan(2000);
    // NUNCA inventa un clima ni una cota falsa a partir de basura.
    expect(cotaDestino('no-es-un-numero').conUbicacion).toBe(false);
    expect(cotaDestino(-40).conUbicacion).toBe(false);
    // `Number(null)` es 0: sin este guardia, «no sé dónde vive» se leía como
    // «vive al nivel del mar, confirmado».
    expect(cotaDestino(null).conUbicacion).toBe(false);
    expect(cotaDestino(undefined).conUbicacion).toBe(false);
    expect(cotaDestino('').conUbicacion).toBe(false);
    expect(cotaDestino(0)).toEqual({ cota: 0, conUbicacion: true }); // el mar SÍ es una cota
    expect(cotaDestino(99999).conUbicacion).toBe(false);
    expect(cotaDestino(2640)).toEqual({ cota: 2640, conUbicacion: true });
  });

  it('respeta el reloj por tier y el corte de reduced-motion', () => {
    expect(duracionDescenso('alto')).toBe(4200);
    expect(duracionDescenso('medio')).toBe(2800);
    expect(duracionDescenso('bajo')).toBe(1400);
    expect(duracionDescenso('alto', true)).toBe(160);
  });
});

describe('PUERTA — continuidad de luz y niebla entre bandas', () => {
  const { filas } = muestrear(COTA_USUARIO);

  it('la altitud no salta (< 4 m por milisegundo)', () => {
    const { peor } = saltoMax(filas, (f) => f.msnm);
    expect(peor).toBeLessThan(4);
  });

  it('la NIEBLA no salta entre bandas (< 0.5 % por ms)', () => {
    const { peor, dondeMs } = saltoMax(filas, (f) => f.optica.niebla);
    expect({ peor: peor < 0.005, dondeMs }).toEqual({ peor: true, dondeMs });
  });

  it('la densidad de niebla de escena no salta (< 0.001 por ms)', () => {
    expect(saltoMax(filas, (f) => f.optica.nieblaDensidad).peor).toBeLessThan(0.001);
  });

  it('la LUZ no salta: intensidad, calidez y dureza de sombra', () => {
    expect(saltoMax(filas, (f) => f.optica.luzIntensidad).peor).toBeLessThan(0.005);
    expect(saltoMax(filas, (f) => f.optica.luzCalidez).peor).toBeLessThan(0.005);
    expect(saltoMax(filas, (f) => f.optica.sombraDureza).peor).toBeLessThan(0.006);
  });

  it('los parámetros del cielo no saltan (rayleigh, mie, turbidez, ozono)', () => {
    expect(saltoMax(filas, (f) => f.optica.rayleigh).peor).toBeLessThan(0.01);
    expect(saltoMax(filas, (f) => f.optica.mie).peor).toBeLessThan(0.02);
    expect(saltoMax(filas, (f) => f.optica.turbidez).peor).toBeLessThan(0.06);
    expect(saltoMax(filas, (f) => f.optica.ozono).peor).toBeLessThan(0.005);
  });

  it('la CÁMARA no salta: posición, objetivo ni FOV', () => {
    for (const eje of [0, 1, 2]) {
      expect(saltoMax(filas, (f) => f.camara.pos[eje]).peor).toBeLessThan(0.02);
      expect(saltoMax(filas, (f) => f.camara.objetivo[eje]).peor).toBeLessThan(0.06);
    }
    expect(saltoMax(filas, (f) => f.camara.fov).peor).toBeLessThan(0.02);
  });

  it('encender FX POR BANDA tampoco salta: los pesos cruzan, no conmutan', () => {
    const claves = Object.keys(filas[0].fx);
    expect(claves.length).toBeGreaterThan(4);
    for (const k of claves) {
      const { peor, dondeMs } = saltoMax(filas, (f) => f.fx[k] ?? 0);
      expect({ fx: k, salta: peor > 0.01, dondeMs }).toEqual({ fx: k, salta: false, dondeMs });
    }
  });

  it('los pesos de banda suman 1 en TODO el recorrido (sin huecos)', () => {
    for (const f of filas) {
      const suma = Object.values(f.pesos).reduce((s, v) => s + v, 0);
      expect(suma).toBeCloseTo(1, 6);
    }
  });

  it('el efecto CENTRAL corre: cieloMsnm recorre la columna de aire entera', () => {
    expect(filas[0].optica.columna).toBeCloseTo(0, 3);
    const finalCol = filas[filas.length - 1].optica.columna;
    expect(finalCol).toBeGreaterThan(0.5); // 2 640 m ⇒ 54 % de columna recorrida
    // Y el cielo se aclara por FÍSICA: más aire encima ⇒ más Rayleigh.
    expect(filas[filas.length - 1].optica.rayleigh).toBeGreaterThan(filas[0].optica.rayleigh);
  });
});

describe('bandas y hero shot', () => {
  it('atraviesa las 7 bandas cuando el destino es la costa', () => {
    const { filas } = muestrear(0);
    const vistas = new Set(filas.map((f) => f.banda.id));
    expect(vistas.size).toBe(BANDAS_DESCENSO.length);
    expect(BANDAS_DESCENSO.length).toBe(7);
  });

  it('el HERO SHOT cae en el bosque de niebla: ahí la niebla es máxima', () => {
    const { filas } = muestrear(0);
    let mejor = filas[0];
    for (const f of filas) if (f.optica.niebla > mejor.optica.niebla) mejor = f;
    expect(mejor.banda.id).toBe('frio');
    expect(mejor.msnm).toBeGreaterThan(2000);
    expect(mejor.msnm).toBeLessThan(3000);
  });

  it('la banda nival NO monta flora: sobre 4 800 m no crece nada', () => {
    const fx = fxEnMsnm(5400, 'alto');
    expect(fx.flora).toBeLessThan(0.05);
    const { banda } = bandaDominante(5400);
    expect(banda.id).toBe('nival');
  });

  it('en tier bajo NO se montan los módulos con cuadro negro medido en Mali', () => {
    const fx = fxEnMsnm(2500, 'bajo');
    // horizonteSylva y taaSylva: GL_INVALID_OPERATION 1282 medido 2026-09-02.
    expect('horizonte' in fx).toBe(false);
    expect('taa' in fx).toBe(false);
    expect('dof' in fx).toBe(false);
    expect('godRays' in fx).toBe(false);
    // El piso mínimo NUNCA se apaga: niebla de altura y flora de masa.
    expect(fx.niebla).toBeGreaterThan(0);
    expect(fx.flora).toBeGreaterThan(0);
  });

  it('en tier medio no hay horizonte ni dof (bucle de profundidad)', () => {
    const fx = fxEnMsnm(2500, 'medio');
    expect('horizonte' in fx).toBe(false);
    expect('dof' in fx).toBe(false);
  });
});

describe('El Niño — la corrección del climatólogo (§7.2)', () => {
  it('bajo El Niño la franja de niebla SUBE y se ADELGAZA', () => {
    const neutral = franjaCondensacion('neutral');
    const nino = franjaCondensacion('el_nino');
    expect(nino.cota).toBeGreaterThan(neutral.cota); // sube
    expect(nino.sigma).toBeLessThan(neutral.sigma); // se adelgaza
    expect(nino.amplitud).toBeLessThan(neutral.amplitud); // y se rala
  });

  it('bajo La Niña baja, engorda y densifica', () => {
    const neutral = franjaCondensacion('neutral');
    const nina = franjaCondensacion('la_nina');
    expect(nina.cota).toBeLessThan(neutral.cota);
    expect(nina.sigma).toBeGreaterThan(neutral.sigma);
    expect(nina.amplitud).toBeGreaterThan(neutral.amplitud);
  });

  it('el bosque de niebla se queda SIN niebla bajo El Niño, a su misma cota', () => {
    const cotaNiebla = 2500;
    const base = opticaEnMsnm(cotaNiebla, { fase: 'neutral' }).niebla;
    const seco = opticaEnMsnm(cotaNiebla, { fase: 'el_nino' }).niebla;
    expect(seco).toBeLessThan(base * 0.75);
  });

  it('bajo El Niño el descenso SIGUE siendo continuo (no rompe la puerta)', () => {
    const { filas } = muestrear(COTA_USUARIO, { fase: 'el_nino' });
    expect(saltoMax(filas, (f) => f.optica.niebla).peor).toBeLessThan(0.005);
    expect(saltoMax(filas, (f) => f.optica.luzIntensidad).peor).toBeLessThan(0.005);
  });

  it('la humedad real del dato vivo mueve la cota, no un color horneado (§6-C)', () => {
    const humedo = franjaCondensacion('neutral', 92);
    const seco = franjaCondensacion('neutral', 35);
    expect(humedo.cota).toBeLessThan(seco.cota);
    expect(humedo.amplitud).toBeGreaterThan(seco.amplitud);
  });
});

describe('cámara y encuadre', () => {
  it('el frame 0 mira el macizo entero desde el norte y por encima de la cumbre', () => {
    const optica = opticaEnMsnm(CUMBRE_M);
    const cam = camaraEnMsnm(CUMBRE_M, optica);
    expect(cam.pos[1]).toBeGreaterThan(5.0); // por encima de la cima (world 5.0)
    expect(cam.pos[2]).toBeLessThan(-12); // lejos, sobre el mar Caribe
    expect(cam.objetivo[2]).toBeGreaterThan(0); // mirando al sur, al macizo
  });

  it('en el hero shot la mirada BAJA para que el mar entre en cuadro', () => {
    const alto = opticaEnMsnm(4500);
    const niebla = opticaEnMsnm(2500);
    const camAlto = camaraEnMsnm(4500, alto);
    const camNiebla = camaraEnMsnm(2500, niebla);
    const caidaAlto = 4500 / 1155 - camAlto.objetivo[1];
    const caidaNiebla = 2500 / 1155 - camNiebla.objetivo[1];
    expect(caidaNiebla).toBeGreaterThan(caidaAlto + 0.5);
  });
});

describe('pesos de banda', () => {
  it('en el centro de una banda esa banda domina claramente', () => {
    expect(pesosBanda(2500).frio).toBeGreaterThan(0.9);
    expect(pesosBanda(3500).paramo).toBeGreaterThan(0.9);
    expect(pesosBanda(5300).nival).toBeGreaterThan(0.9);
  });
  it('justo en el borde las dos vecinas se reparten el peso', () => {
    const p = pesosBanda(3000); // frontera páramo ↔ bosque de niebla
    expect(p.paramo).toBeGreaterThan(0.3);
    expect(p.frio).toBeGreaterThan(0.3);
    expect(p.paramo + p.frio).toBeGreaterThan(0.9);
  });
});

/*
 * CONTRATO TEMPORAL DE LOS TRAMOS — los tramos del plan nacen COMPLETOS: cada
 * uno trae sus msInicio/msFin desde la construcción (los tramos se arman con
 * sus tiempos en un solo paso, no mutándolos después). La escena lee esa línea
 * de tiempo por cuadro; si un tramo llegara a nacer sin tiempos o con huecos,
 * el viaje se cortaría o se saltaría una banda y este test lo ve.
 */
describe('plan del descenso — contrato temporal de los tramos', () => {
  it('cada tramo trae msInicio/msFin contiguos, monótonos y cerrados en total', () => {
    for (const cota of [0, 300, 1500, 2640, 3900]) {
      const plan = planDescenso(cota, 'alto');
      expect(plan.tramos.length).toBeGreaterThan(0);
      expect(plan.tramos[0].msInicio).toBe(0);
      let msFinAnterior = null;
      for (const t of plan.tramos) {
        expect(typeof t.msInicio).toBe('number');
        expect(typeof t.msFin).toBe('number');
        expect(t.msFin).toBeGreaterThan(t.msInicio);
        if (msFinAnterior !== null) {
          expect(t.msInicio).toBe(msFinAnterior); // contiguo: sin huecos
        }
        msFinAnterior = t.msFin;
      }
      // Cierra EXACTO en el total (sin residuo de coma flotante).
      expect(plan.tramos[plan.tramos.length - 1].msFin).toBe(plan.total);
    }
  });

  it('sin ubicación confirmada el plan conserva el mismo contrato', () => {
    const plan = planDescenso(COTA_SIN_UBICACION, 'alto');
    expect(plan.tramos.length).toBeGreaterThan(0);
    expect(plan.tramos[0].msInicio).toBe(0);
    expect(plan.tramos[plan.tramos.length - 1].msFin).toBe(plan.total);
    for (const t of plan.tramos) {
      expect(t.msFin).toBeGreaterThan(t.msInicio);
    }
  });
});
