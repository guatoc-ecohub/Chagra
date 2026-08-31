/*
 * cardumen — simulación boids reusable para peces de estanque.
 *
 * flocking reimplementado (Reynolds), inspirado por shoal (all-rights-reserved, no copiado)
 *
 * Es deliberadamente puro: sin Three ni React. El estado nace de una semilla,
 * se puede probar headless y el renderer decide cómo dibujar sus instancias.
 */

const LIMITE_DT = 1 / 20;

const limitar = (v, minimo, maximo) => Math.min(maximo, Math.max(minimo, v));

function crearRng(semilla) {
  let estado = (semilla * 2654435761) >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 4294967296;
  };
}

function limitarMagnitud(x, y, z, maximo) {
  const magnitud = Math.hypot(x, y, z);
  if (magnitud <= maximo || magnitud === 0) return [x, y, z];
  const escala = maximo / magnitud;
  return [x * escala, y * escala, z * escala];
}

/**
 * Crea un cardumen reproducible dentro de un volumen elíptico de agua.
 * La dirección inicial es tangencial para que el primer cuadro ya se lea como
 * nado, pero la evolución posterior es enteramente Reynolds.
 */
export function crearCardumen({ n, estanque, semilla = 1, fondo = 0 }) {
  const rnd = crearRng(semilla);
  const peces = [];
  for (let i = 0; i < n; i++) {
    const angulo = rnd() * Math.PI * 2;
    const radio = Math.sqrt(rnd()) * 0.66;
    const x = estanque.cx + Math.cos(angulo) * estanque.rx * radio;
    const z = estanque.cz + Math.sin(angulo) * estanque.rz * radio;
    const profundidad = fondo
      ? estanque.hondo * (0.7 + rnd() * 0.2)
      : estanque.hondo * (0.32 + rnd() * 0.42);
    const rumbo = angulo + Math.PI / 2 + (rnd() - 0.5) * 0.55;
    const rapidez = 0.18 + rnd() * 0.1;
    peces.push({
      x,
      y: estanque.ySup - profundidad,
      z,
      vx: Math.cos(rumbo) * rapidez,
      vy: (rnd() - 0.5) * 0.025,
      vz: -Math.sin(rumbo) * rapidez,
      fase: rnd() * Math.PI * 2,
      escala: 0.82 + rnd() * 0.35,
    });
  }
  return { estanque, peces };
}

/**
 * Avanza el estado in situ. Las fuerzas se calculan desde una fotografía del
 * cuadro anterior, así el resultado no depende del orden de los peces.
 *
 * `depredadorPunto` es opcional: { x, y, z, radio? }. Puede representar puntero,
 * mano u otro estímulo de la escena sin acoplar la simulación al renderer.
 */
export function avanzarCardumen(estado, dt, opciones = {}) {
  const paso = limitar(dt, 0, LIMITE_DT);
  if (paso === 0 || estado.peces.length === 0) return estado;

  const cfg = {
    vision: 1.05,
    separacionDistancia: 0.3,
    maximoAceleracion: 1.25,
    velocidadMaxima: 0.42,
    velocidadMinima: 0.1,
    separacion: 0.9,
    alineacion: 0.32,
    cohesion: 0.28,
    borde: 1.15,
    depredador: 1.45,
    ...opciones,
  };
  const previo = estado.peces.map((pez) => ({ ...pez }));
  const { estanque } = estado;
  const yMin = estanque.ySup - estanque.hondo * 0.94;
  const yMax = estanque.ySup - 0.09;

  for (let i = 0; i < previo.length; i++) {
    const pez = previo[i];
    let vecinos = 0;
    let centroX = 0, centroY = 0, centroZ = 0;
    let rumboX = 0, rumboY = 0, rumboZ = 0;
    let separaX = 0, separaY = 0, separaZ = 0;
    for (let j = 0; j < previo.length; j++) {
      if (i === j) continue;
      const otro = previo[j];
      const dx = otro.x - pez.x;
      const dy = otro.y - pez.y;
      const dz = otro.z - pez.z;
      const distancia = Math.hypot(dx, dy, dz);
      if (distancia === 0 || distancia > cfg.vision) continue;
      vecinos++;
      centroX += otro.x; centroY += otro.y; centroZ += otro.z;
      rumboX += otro.vx; rumboY += otro.vy; rumboZ += otro.vz;
      if (distancia < cfg.separacionDistancia) {
        const fuerza = (cfg.separacionDistancia - distancia) / (distancia * cfg.separacionDistancia);
        separaX -= dx * fuerza; separaY -= dy * fuerza; separaZ -= dz * fuerza;
      }
    }

    let ax = 0, ay = 0, az = 0;
    if (vecinos) {
      ax += separaX * cfg.separacion;
      ay += separaY * cfg.separacion;
      az += separaZ * cfg.separacion;
      ax += (rumboX / vecinos - pez.vx) * cfg.alineacion;
      ay += (rumboY / vecinos - pez.vy) * cfg.alineacion;
      az += (rumboZ / vecinos - pez.vz) * cfg.alineacion;
      ax += (centroX / vecinos - pez.x) * cfg.cohesion;
      ay += (centroY / vecinos - pez.y) * cfg.cohesion;
      az += (centroZ / vecinos - pez.z) * cfg.cohesion;
    }

    // Empuje suave desde la pared elíptica y desde fondo/superficie.
    const nx = (pez.x - estanque.cx) / estanque.rx;
    const nz = (pez.z - estanque.cz) / estanque.rz;
    const borde = Math.hypot(nx, nz);
    if (borde > 0.7) {
      const fuerza = ((borde - 0.7) / 0.3) * cfg.borde;
      ax -= nx * fuerza / estanque.rx;
      az -= nz * fuerza / estanque.rz;
    }
    if (pez.y < yMin + 0.12) ay += ((yMin + 0.12 - pez.y) / 0.12) * cfg.borde;
    if (pez.y > yMax - 0.12) ay -= ((pez.y - (yMax - 0.12)) / 0.12) * cfg.borde;

    if (cfg.depredadorPunto) {
      const amenaza = cfg.depredadorPunto;
      const dx = pez.x - amenaza.x;
      const dy = pez.y - amenaza.y;
      const dz = pez.z - amenaza.z;
      const distancia = Math.hypot(dx, dy, dz) || 0.0001;
      const radio = amenaza.radio || 1.25;
      if (distancia < radio) {
        const fuerza = ((radio - distancia) / radio) * cfg.depredador / distancia;
        ax += dx * fuerza; ay += dy * fuerza; az += dz * fuerza;
      }
    }

    [ax, ay, az] = limitarMagnitud(ax, ay, az, cfg.maximoAceleracion);
    let vx = pez.vx + ax * paso;
    let vy = pez.vy + ay * paso;
    let vz = pez.vz + az * paso;
    let rapidez = Math.hypot(vx, vy, vz);
    if (rapidez < cfg.velocidadMinima && rapidez > 0) {
      const escala = cfg.velocidadMinima / rapidez;
      vx *= escala; vy *= escala; vz *= escala;
    }
    [vx, vy, vz] = limitarMagnitud(vx, vy, vz, cfg.velocidadMaxima);

    const siguiente = estado.peces[i];
    siguiente.vx = vx; siguiente.vy = vy; siguiente.vz = vz;
    siguiente.x = pez.x + vx * paso;
    siguiente.y = limitar(pez.y + vy * paso, yMin, yMax);
    siguiente.z = pez.z + vz * paso;

    // Red de seguridad: la fuerza de borde es la conducta; esto sólo evita que
    // un delta grande o un depredador deje a un pez fuera del agua.
    const dx = (siguiente.x - estanque.cx) / estanque.rx;
    const dz = (siguiente.z - estanque.cz) / estanque.rz;
    const distanciaBorde = Math.hypot(dx, dz);
    if (distanciaBorde > 0.96) {
      const escala = 0.96 / distanciaBorde;
      siguiente.x = estanque.cx + dx * estanque.rx * escala;
      siguiente.z = estanque.cz + dz * estanque.rz * escala;
      siguiente.vx *= 0.75;
      siguiente.vz *= 0.75;
    }
  }
  return estado;
}
