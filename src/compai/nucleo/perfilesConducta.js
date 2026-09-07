/*
 * Fuente única de conducta de los seis compais canónicos que no son Angelita.
 * Valores copiados sin reinterpretar de
 * ops/PERFILES-CONDUCTA-7-COMPAIS-20260904.md §8 (2026-09-04).
 * Angelita conserva sus datos históricos en creatureIdle/angelitaEstados.
 */
export const PERFILES_CONDUCTA = Object.freeze({
  jaguar: {
    masa: 0.85, medio: 'suelo', poseBase: 'anda', poseDigna: 'echado',
    respira: { freq: 1.85, amp: 0.022, vaiven: 0.21, organo: 'flancos' },
    mira: { modo: 'seno', freq: 0.30, amp: 5, orejas: true },
    aseo: { base: 17, jitter: 4, dur: 1.8, tipos: ['lameZarpa', 'sacudeCabeza'] },
    vuelta: null, gesto: { base: 34, jitter: 6, dur: 2.2, alza: 0.05, incl: 6, nombre: 'alzaCabeza' },
    reposo: { base: 44, jitter: 8, dur: 11, pose: 'echado', entra: 0.9, sale: 1.1 },
    celebra: { dur: 1.9, grados: 0, gesto: 'alzaCabeza+ojosArden+colaLash3' },
    noche: { modo: 'activo', freq: 2.0, ojosArden: true, acechaPeso: 1.5, diaReposoDur: 1.3 },
    vida: { descanso: [4200, 9800], momentos: { acecha: { dur: 6400, peso: 2 }, ruge: { dur: 3200, peso: 1 }, reposo: { dur: 8800, peso: 1 }, bosteza: { dur: 2600, peso: 0.8 }, estira: { dur: 3000, peso: 0.7 }, slowBlink: { dur: 1800, peso: 1 } } },
    locomocion: { modo: 'camina', pasoS: 1.05, velCuerposS: 0.50, bob: 0.025, vertical: 'mistico', excursion: { radioX: 180, radioY: 0, dwellMs: 1400 } },
    habla: { organo: 'mandibula', jaw: { V1: 0, V2: 0.42, V3: 1, V4: 0.36 } }, mirada: 'pupila+orejas',
    entrada: { tipo: 'mistico-sombra', ojosMs: 300, cuerpoMs: 900, quietoMs: 1200, totalMs: 2400 }, salida: { cuerpoMs: 700, ojosMs: 400 }, aura: '#a855f7',
  },
  'oso-baston': {
    masa: 1.0, medio: 'suelo', poseBase: 'anda', poseDigna: 'de-pie-baston',
    respira: { freq: 1.43, amp: 0.045, vaiven: 0.23, organo: 'hombros', retrasoCabezaMs: 120 },
    mira: { modo: 'seno', freq: 0.28, amp: 6 }, aseo: { base: 15, jitter: 4, dur: 1.6, tipos: ['rascaPanza', 'sacudePelaje'] },
    vuelta: null, gesto: { base: 30, jitter: 6, dur: 2.4, alza: 0.06, incl: 9, nombre: 'bamboleo' },
    reposo: { base: 44, jitter: 8, dur: 8.5, pose: 'sentado', entra: 1.2, sale: 1.4 }, celebra: { dur: 2.0, grados: 0, gesto: 'yergue+florece+bote6' },
    noche: { modo: 'duerme', freq: 0.6, amp: 0.065, rot: -7 },
    vida: { descanso: [4200, 9800], momentos: { florece: { dur: 3400, peso: 2 }, resopla: { dur: 4500, peso: 1.5 }, reposo: { dur: 8800, peso: 1 }, seYergue: { dur: 3000, peso: 1 }, rascaPanza: { dur: 3000, peso: 1 }, bosteza: { dur: 3200, peso: 0.6 } } },
    locomocion: { modo: 'mistico', modoConMarcha: 'camina', pasoS: 1.3, velCuerposS: 0.35, bob: 0.04, balanceo: 3, vertical: 'mistico', excursion: { radioX: 120, radioY: 0, dwellMs: 1800 } },
    habla: { organo: 'boca', jaw: { V1: 0, V2: 0.45, V3: 1, V4: 0.40 } }, mirada: 'pupila+cabeza-lenta',
    entrada: { tipo: 'camina-o-mistico', caminaMs: 1400, plantaMs: 120, floreceMs: 1700, quietoMs: 1200 }, salida: { cuerpoMs: 700, coronaMs: 300 }, aura: '#43c24f',
  },
  zariguya: {
    masa: 0.45, medio: 'suelo', poseBase: 'anda', poseDigna: 'cuatro-patas',
    respira: { freq: 2.17, amp: 0.040, vaiven: 0.28, organo: 'pecho', criasContrafase: true },
    mira: { modo: 'seno', freq: 0.62, amp: 8, husmeoAireCadaS: 8 }, aseo: { base: 8, jitter: 2.5, dur: 1.1, tipos: ['lavaCara', 'sacude', 'acomodaCrias'] },
    vuelta: null, gesto: { base: 19, jitter: 4, dur: 1.5, alza: 0.07, incl: 8, nombre: 'seYergue' },
    reposo: { base: 33, jitter: 6, dur: 5.5, pose: 'enroscada', entra: 0.7, sale: 0.6, diaDur: 2 }, celebra: { dur: 1.7, grados: 0, gesto: 'brinco5+cute+colaEnrosca+crias' },
    noche: { modo: 'activo', freq: 1.6, amp: 0.05, rot: -2, husmeaPeso: 1.4, descanso: [2600, 6000], diaGestos: 0.6 },
    vida: { descanso: [3000, 7200], momentos: { husmea: { dur: 3150, peso: 2.5 }, tanatosis: { dur: 2600, peso: 0.6 }, reposo: { dur: 4400, peso: 1 }, colaEnrosca: { dur: 2100, peso: 1.2 }, lavaCara: { dur: 1100, peso: 1 }, acomodaCrias: { dur: 1300, peso: 0.8 }, mirausted: { dur: 2600, peso: 1.5 } } },
    locomocion: { modo: 'camina', pasoS: 0.8, zancadaCuerpo: 0.35, velCuerposS: 0.50, bob: 0.03, vertical: 'trepa|mistico', excursion: { radioX: 160, radioY: 60, dwellMs: 900 } },
    habla: { organo: 'mandibula', jaw: { V1: 0, V2: 0.42, V3: 1, V4: 0.36 }, vibrisasS: 0.28 }, mirada: 'pupila+hocico+orejas',
    entrada: { tipo: 'trote', troteMs: 1200, pasoS: 0.55, frenaSquash: 0.05, yergueMs: 1500 }, salida: { tipo: 'sale-corriendo', ms: 900 }, aura: '#ff9ecb',
  },
  luciernaga: {
    masa: 0.10, medio: 'aire', poseBase: 'vuela', poseDigna: 'posada-luz-0.7',
    respira: { freq: 1.85, amp: 0.015, vaiven: 0.40, organo: 'luz', luz: { min: 0.65, max: 1.0 } },
    mira: { modo: 'antenas', freq: 0.78, amp: 6 }, aseo: { base: 10, jitter: 3, dur: 0.9, tipos: ['limpiaAntenas', 'abreElitros'] },
    vuelta: null, gesto: { base: 14, jitter: 3, dur: 1.1, alza: 0.03, incl: 5, nombre: 'destello' }, reposo: { base: 34, jitter: 6, dur: 5.5, pose: 'posada', luz: 0.5, diaDur: 2 }, celebra: { dur: 1.5, grados: 0, gesto: 'triDestello(3x0.3,1.0->1.4)+brinco4' },
    noche: { modo: 'activo', freq: 1.2, linterna: 'fuerte', destellaPeso: 1.6, descanso: [2600, 6000], diaLinterna: 'apagada', diaGestos: 0.5 },
    vida: { descanso: [3000, 7200], momentos: { destella: { dur: 2600, peso: 2.5 }, lee: { dur: 3200, peso: 1.2 }, reposo: { dur: 4400, peso: 1 }, limpiaAntenas: { dur: 900, peso: 1 }, abreElitros: { dur: 500, peso: 0.6 }, mirausted: { dur: 2000, peso: 1.2 } } },
    locomocion: { modo: 'vuela', trayectoria: 'S', ampY: 0.06, periodoS: 2.2, velCuerposS: 0.80, luzPulsaS: 1.3, vertical: 'vuela', excursion: { radioX: 140, radioY: 160, dwellMs: 700 } },
    habla: { organo: 'luz', jaw: { V1: 0.65, V2: 0.85, V3: 1.15, V4: 0.95 }, debounceMinMs: 90 }, mirada: 'antenas',
    entrada: { tipo: 'luz-primero', luzMs: 400, cuerpoMs: 800, triParpadeo: true }, salida: { tipo: 'se-apaga-derivando-arriba', ms: 1200 }, aura: '#c7ff4e',
  },
  'chivito-punk': {
    masa: 0.15, medio: 'aire', poseBase: 'posado', poseDigna: 'posado',
    respira: { freq: 3.9, amp: 0.025, vaiven: 0.39, organo: 'tremor', barbaSway: true, crestaOla: true }, mira: { modo: 'sacada', hold: [0.8, 2.0], snapMs: 80, amp: 12, ladeo: 15 }, aseo: { base: 10, jitter: 2.5, dur: 1.0, tipos: ['acicalaPluma', 'esponja', 'estiraAlaPata'] },
    vuelta: null, gesto: { base: 15, jitter: 3, dur: 1.4, alza: 0.09, incl: 12, nombre: 'crestaBote' }, vuelo: { base: 20, jitter: 5, dur: 2.5, pose: 'vuela' }, celebra: { dur: 1.3, grados: 0, gesto: 'crestaPunk+bote9+rafaga0.3+crestaOla2', punk: true }, noche: { modo: 'torpor', freq: 0.35, amp: 0.02, rot: -3, esponjado: 1.06, gestos: 0, blink: false },
    vida: { descanso: [2400, 6000], momentos: { acicalaPluma: { dur: 1000, peso: 2 }, esponja: { dur: 600, peso: 1.5 }, crestaBote: { dur: 1400, peso: 1.5 }, mirausted: { dur: 2000, peso: 2 }, estiraAlaPata: { dur: 1200, peso: 1 }, liba: { dur: 1600, peso: 1.2, requierePoi: 'flor' }, reposo: { dur: 4400, peso: 1 } } },
    locomocion: { modo: 'vuela', trayectoria: 'dardo', rafagaMs: 300, hoverMs: 400, velCuerposS: 2.0, aleteoS: 0.075, terminaPosado: true, pasitos: { pasoS: 0.25, max: 3 }, vertical: 'vuela', excursion: { radioX: 180, radioY: 180, dwellMs: 600 } }, habla: { organo: 'pico', jaw: { V1: 0, V2: 0.35, V3: 0.70, V4: 0.30 }, stepsS: 0.17, punk: true }, mirada: 'cabeza-sacada', entrada: { tipo: 'dardo', dardoMs: 300, hoverMs: 400, posaMs: 250, squash: 0.04, crestaFlick: true }, salida: { tipo: 'dardo', ms: 300 }, aura: '#4be0d0',
  },
  guacamaya: {
    masa: 0.60, medio: 'aire', poseBase: 'posada', poseDigna: 'posada',
    respira: { freq: 1.31, amp: 0.045, vaiven: 0.24, organo: 'pecho' }, mira: { modo: 'sacada', hold: [1.5, 4.0], snapMs: 120, amp: 9, ladeoMonocular: { grados: 18, hold: 1.2, cadaS: 14 } }, aseo: { base: 15, jitter: 4, dur: 1.6, tipos: ['acicalaAla', 'esponjaSacude', 'estiraAlaPata'] },
    vuelta: null, gesto: { base: 18, jitter: 4, dur: 1.6, alza: 0.09, incl: 10, nombre: 'abreAlas', eyePin: true }, vuelo: { base: 42, jitter: 8, dur: 3.0, pose: 'vuela' }, celebra: { dur: 1.8, grados: 0, gesto: 'abreAlas+sana+eyePin+esponja+bote5' }, noche: { modo: 'duerme', freq: 0.65, amp: 0.06, rot: -5, cabezaBajoAla: true, unaPata: true, blink: false },
    vida: { descanso: [3400, 8200], momentos: { acicalaAla: { dur: 1600, peso: 2 }, ladeoMonocular: { dur: 1200, peso: 2 }, esponjaSacude: { dur: 800, peso: 1.2 }, estiraAlaPata: { dur: 1400, peso: 1 }, cabeceo: { dur: 1050, peso: 1.2 }, mirausted: { dur: 2600, peso: 1.5 }, bosteza: { dur: 2400, peso: 0.5 }, reposo: { dur: 4400, peso: 1 } } },
    locomocion: { modo: 'vuela-y-posa', trayectoria: 'recta', ondAmp: 0.04, ondS: 1.8, velCuerposS: 0.90, batidoS: 0.45, aterriza: { frenadoMs: 200, squash: 0.06 }, percha: { pasoLateral: true, picoTerceraPata: true }, vertical: 'recta', excursion: { radioX: 200, radioY: 120, dwellMs: 1200 } }, habla: { organo: 'pico', jaw: { V1: 0, V2: 0.30, V3: 0.60, V4: 0.25 }, lenguaV3: true }, mirada: 'cabeza-sacada+ladeo-monocular+eyePin', entrada: { tipo: 'teatral', asomaMs: 900, quietaMs: 1500, creceMs: 1300, brilloMs: 650, alternativa: { tipo: 'vuelo-recto', vueloMs: 1100, frenadoMs: 200 } }, salida: { tipo: 'GuacamayaSalida' }, aura: '#ff5a3c',
  },
});

export const overshootDe = (masa) => 0.10 * (1.2 - masa);
export const anticipoMsDe = (masa) => 150 + 120 * masa;
export const asientaMsDe = (masa) => 300 + 250 * masa;
export const squashImpactoDe = (masa) => 0.03 + 0.05 * masa;
