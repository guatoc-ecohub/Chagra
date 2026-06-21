/**
 * doomFincaEngine - motor raycaster puro para el nivel Doom agroecologico.
 *
 * Funciones puras: sin DOM, sin React, sin canvas. Toman estado, devuelven
 * estado nuevo. Totalmente testeable. Patron identico a defensoresGameEngine.
 *
 * Raycaster DDA clasico (Digital Differential Analyzer) estilo Wolfenstein 3D.
 * Sin librerias 3D, solo matematicas.
 *
 * Solo este repo. i18n: solo es-CO.
 */

import { MAPA, MAPA_FILAS, MAPA_COLS, CELDA, CONFIG_DOOM, PLAGAS_DOOM, BENEFICOS_DOOM } from '../components/juego/doomFincaData';

/**
 * Verifica si una coordenada del mundo es una pared.
 * @param {number[][]} mapa
 * @param {number} x
 * @param {number} y
 * @returns {boolean}
 */
export function isWall(mapa, x, y) {
  const mx = Math.floor(x);
  const my = Math.floor(y);
  if (mx < 0 || mx >= MAPA_COLS || my < 0 || my >= MAPA_FILAS) return true;
  return mapa[my][mx] !== 0;
}

/**
 * Resultado de un rayo individual.
 * @typedef {Object} RayoHit
 * @property {number} dist   Distancia perpendicular a la pared (corregida).
 * @property {number} cara   0=N, 1=S, 2=E, 3=O
 * @property {number} texX   Coordenada X de la textura (0-1) donde golpeo.
 * @property {number} tipo   Codigo de material de la celda (1=seto, 2=madera, ...).
 */

/**
 * Cast de un solo rayo DDA desde (ox, oy) con angulo `angle` (rad).
 * Devuelve la distancia perpendicular a la pared y la cara que golpeo.
 *
 * @param {number[][]} mapa
 * @param {number} ox    Origen X (mundo)
 * @param {number} oy    Origen Y (mundo)
 * @param {number} angle Angulo del rayo (rad)
 * @returns {RayoHit}
 */
export function castRay(mapa, ox, oy, angle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  // Mapa: en que celda estamos
  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);

  // Distancia que recorre el rayo para cruzar una celda en cada eje
  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(1 / dirY);

  // Direccion de paso (+1 o -1)
  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;

  // Distancia desde la posicion actual hasta el primer borde de celda
  let sideDistX;
  let sideDistY;
  if (dirX < 0) {
    sideDistX = (ox - mapX) * deltaDistX;
  } else {
    sideDistX = (mapX + 1.0 - ox) * deltaDistX;
  }
  if (dirY < 0) {
    sideDistY = (oy - mapY) * deltaDistY;
  } else {
    sideDistY = (mapY + 1.0 - oy) * deltaDistY;
  }

  // DDA loop: avanzar hasta chocar con una pared
  let side = 0; // 0 = vertical (E/W), 1 = horizontal (N/S)
  let tipo = 1;
  const MAX_STEPS = 64;
  for (let i = 0; i < MAX_STEPS; i += 1) {
    if (sideDistX < sideDistY) {
      sideDistX += deltaDistX;
      mapX += stepX;
      side = 0;
    } else {
      sideDistY += deltaDistY;
      mapY += stepY;
      side = 1;
    }
    if (mapX < 0 || mapX >= MAPA_COLS || mapY < 0 || mapY >= MAPA_FILAS) {
      break;
    }
    if (mapa[mapY][mapX] !== 0) {
      tipo = mapa[mapY][mapX];
      break;
    }
  }

  // Calcular distancia perpendicular (sin fish-eye)
  let perpDist;
  if (side === 0) {
    perpDist = (sideDistX - deltaDistX);
  } else {
    perpDist = (sideDistY - deltaDistY);
  }

  if (perpDist < 0.001) perpDist = 0.001;

  // Calcular coordenada de textura en la pared (donde golpeo exactamente)
  let wallX;
  if (side === 0) {
    wallX = oy + perpDist * dirY;
  } else {
    wallX = ox + perpDist * dirX;
  }
  wallX -= Math.floor(wallX);

  // Determinar la cara de la pared
  let cara;
  if (side === 0) {
    cara = dirX > 0 ? 3 : 2; // Oeste (mirando izq) o Este (mirando der)
  } else {
    cara = dirY > 0 ? 1 : 0; // Sur o Norte
  }

  return { dist: perpDist, cara, texX: wallX, tipo };
}

/**
 * Proyecta un sprite 3D (plaga) a coordenadas de pantalla 2D.
 *
 * @param {number} sx        X del sprite en el mundo
 * @param {number} sy        Y del sprite en el mundo
 * @param {number} px        X del jugador
 * @param {number} py        Y del jugador
 * @param {number} pAngle    Angulo del jugador (rad)
 * @param {number} fov       Campo de vision (rad)
 * @param {number} screenW   Ancho de pantalla logica
 * @param {number} screenH   Alto de pantalla logica
 * @returns {{ visible: boolean, screenX: number, screenY: number, size: number, dist: number }}
 */
export function projectSprite(sx, sy, px, py, pAngle, fov, screenW, screenH) {
  const dx = sx - px;
  const dy = sy - py;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Angulo del sprite relativo al jugador
  const spriteAngle = Math.atan2(dy, dx);
  let relativeAngle = spriteAngle - pAngle;

  // Normalizar a [-PI, PI]
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

  // Fuera del FOV
  if (Math.abs(relativeAngle) > fov / 2 + 0.2) {
    return { visible: false, screenX: 0, screenY: 0, size: 0, dist };
  }

  // Proyeccion en pantalla
  const screenX = (0.5 + relativeAngle / fov) * screenW;
  const size = Math.round(screenH / dist);

  return {
    visible: true,
    screenX: Math.round(screenX),
    screenY: Math.round(screenH / 2),
    size,
    dist,
  };
}

/**
 * Mueve al jugador con colision contra paredes.
 *
 * @param {number[][]} mapa
 * @param {{x:number, y:number, angulo:number}} player
 * @param {number} dx  Delta X (paralelo a la direccion)
 * @param {number} dy  Delta Y (perpendicular)
 * @returns {{ x: number, y: number }} Nueva posicion (mutada sobre player o copia)
 */
export function movePlayer(mapa, player, dx, dy) {
  const cAngle = player.angulo;
  const margin = 0.18;

  // Calcular movimiento en ejes del mundo
  const moveX = dx * Math.cos(cAngle) - dy * Math.sin(cAngle);
  const moveY = dx * Math.sin(cAngle) + dy * Math.cos(cAngle);

  let newX = player.x;
  let newY = player.y;

  // Deslizamiento: intentar mover en X primero, luego en Y
  const nextX = player.x + moveX;
  if (!isWall(mapa, nextX - margin, player.y - margin) &&
      !isWall(mapa, nextX - margin, player.y + margin) &&
      !isWall(mapa, nextX + margin, player.y - margin) &&
      !isWall(mapa, nextX + margin, player.y + margin)) {
    newX = nextX;
  }

  const nextY = player.y + moveY;
  if (!isWall(mapa, player.x - margin, nextY - margin) &&
      !isWall(mapa, player.x - margin, nextY + margin) &&
      !isWall(mapa, player.x + margin, nextY - margin) &&
      !isWall(mapa, player.x + margin, nextY + margin)) {
    newY = nextY;
  }

  return { x: newX, y: newY };
}

/**
 * Actualiza la posicion de una plaga: se mueve hacia el jugador
 * usando pathfinding simple (evita paredes).
 *
 * @param {Object} pest
 * @param {{x:number, y:number}} player
 * @param {number[][]} mapa
 * @param {number} deltaTime
 * @returns {{ x: number, y: number }} Nueva posicion de la plaga
 */
export function updatePest(pest, player, mapa) {
  const dx = player.x - pest.x;
  const dy = player.y - pest.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return { x: pest.x, y: pest.y };

  const dirX = dx / dist;
  const dirY = dy / dist;
  const step = pest.velocidad * 0.6; // mas lento que el jugador

  let newX = pest.x + dirX * step;
  let newY = pest.y + dirY * step;

  // Evitar paredes
  const m = 0.12;
  if (isWall(mapa, newX - m, pest.y - m) || isWall(mapa, newX - m, pest.y + m) ||
      isWall(mapa, newX + m, pest.y - m) || isWall(mapa, newX + m, pest.y + m)) {
    newX = pest.x;
  }
  if (isWall(mapa, pest.x - m, newY - m) || isWall(mapa, pest.x - m, newY + m) ||
      isWall(mapa, pest.x + m, newY - m) || isWall(mapa, pest.x + m, newY + m)) {
    newY = pest.y;
  }

  return { x: newX, y: newY };
}

/**
 * Lanza un benefico y verifica si alcanza alguna plaga.
 * El benefico viaja en linea recta en la direccion de la mira del jugador.
 *
 * @param {{x:number, y:number, angulo:number}} player
 * @param {string} beneficoId  ID del benefico lanzado
 * @param {Object[]} pests     Lista de plagas vivas
 * @param {number} maxDist     Alcance maximo
 * @returns {{ pests: Object[], eliminada: boolean, plagaEliminada: string|null, mensaje: string }}
 */
export function lanzarBenefico(player, beneficoId, pests, maxDist) {
  // El benefico tiene un area de efecto (cono estrecho hacia adelante)
  let mejorDist = maxDist;
  let plagaGolpeada = null;

  for (const p of pests) {
    if (!p.vivo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxDist) continue;

    // Verificar si la plaga esta en la direccion de la mira
    const pestAngle = Math.atan2(dy, dx);
    let diff = pestAngle - player.angulo;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;

    // Cono de ~20 grados
    if (Math.abs(diff) < 0.35 && dist < mejorDist) {
      // Verificar si el benefico controla esta plaga
      const plagaDef = PLAGAS_DOOM.find((pd) => pd.id === p.tipo);
      if (plagaDef && plagaDef.controladoPor === beneficoId) {
        mejorDist = dist;
        plagaGolpeada = p;
      }
    }
  }

  if (plagaGolpeada) {
    plagaGolpeada.vitalidad -= 1;
    if (plagaGolpeada.vitalidad <= 0) {
      plagaGolpeada.vivo = false;
      const plagaDef = PLAGAS_DOOM.find((pd) => pd.id === plagaGolpeada.tipo);
      const benefDef = BENEFICOS_DOOM.find((b) => b.id === beneficoId);
      return {
        pests,
        eliminada: true,
        plagaEliminada: plagaGolpeada.tipo,
        mensaje: `${benefDef?.nombre || beneficoId} controlo a ${plagaDef?.nombre || plagaGolpeada.tipo}. ${plagaDef?.dano || ''}`,
      };
    }
    return {
      pests,
      eliminada: false,
      plagaEliminada: null,
      mensaje: 'La plaga resiste. Lanza otra vez.',
    };
  }

  return {
    pests,
    eliminada: false,
    plagaEliminada: null,
    mensaje: 'No hay plaga que controlar con ese benefico en esa direccion.',
  };
}

/**
 * Verifica si alguna plaga alcanzo al jugador.
 *
 * @param {Object[]} pests
 * @param {{x:number, y:number}} player
 * @param {number} distUmbral  Distancia a la que la plaga "toca" al jugador
 * @returns {{ alcanzado: boolean, count: number }}
 */
export function checkPestReach(pests, player, distUmbral = 0.5) {
  let count = 0;
  for (const p of pests) {
    if (!p.vivo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < distUmbral) {
      count += 1;
    }
  }
  return { alcanzado: count > 0, count };
}

/**
 * Devuelve la decoracion de la finca que el jugador tiene en la mira
 * (al frente, dentro de un cono estrecho y un alcance corto), o null.
 * Sirve para mostrar su leccion agroecologica.
 *
 * @param {{x:number, y:number, angulo:number}} player
 * @param {Object[]} decoraciones  Lista con {x, y, ...}
 * @param {number} maxDist
 * @returns {Object|null}
 */
export function decoracionEnMira(player, decoraciones, maxDist = 3.5) {
  let best = null;
  let bestDist = maxDist;
  for (const d of decoraciones) {
    const dx = d.x - player.x;
    const dy = d.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) continue;
    let diff = Math.atan2(dy, dx) - player.angulo;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) < 0.30 && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Indica si el jugador apunta a una plaga viva y si el benefico equipado es
 * el correcto para controlarla. Sirve para colorear la mira (verde=correcto,
 * ambar=plaga pero benefico equivocado).
 *
 * @param {{x:number, y:number, angulo:number}} player
 * @param {string} beneficoId
 * @param {Object[]} pests
 * @param {number} maxDist
 * @returns {{ enMira: boolean, correcto: boolean }}
 */
export function plagaEnMira(player, beneficoId, pests, maxDist) {
  let best = null;
  let bestDist = maxDist;
  for (const p of pests) {
    if (!p.vivo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) continue;
    let diff = Math.atan2(dy, dx) - player.angulo;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    if (Math.abs(diff) < 0.22 && dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  if (!best) return { enMira: false, correcto: false };
  return { enMira: true, correcto: best.controladoPor === beneficoId };
}

/**
 * Crea el estado inicial del mundo de juego.
 *
 * @returns {Object} Estado inicial del mundo
 */
export function createWorld() {
  const player = {
    x: 2.5,
    y: 2.5,
    angulo: 0,
  };

  const pests = PLAGAS_DOOM.map((def) => ({
    tipo: def.id,
    nombre: def.nombre,
    emoji: def.emoji,
    color: def.color,
    x: 1.5 + Math.random() * 13,
    y: 1.5 + Math.random() * 11,
    velocidad: def.velocidad,
    vitalidad: def.vitalidad,
    vitalidadMax: def.vitalidad,
    vivo: true,
    controladoPor: def.controladoPor,
    dano: def.dano,
  }));

  // Distribuir plagas por el mapa en posiciones validas (no paredes)
  const spawns = [
    { x: 5.5, y: 5.5 },
    { x: 10.5, y: 4.5 },
    { x: 5.5, y: 9.5 },
    { x: 10.5, y: 9.5 },
    { x: 8.5, y: 7.5 },
    { x: 2.5, y: 8.5 },
    { x: 13.5, y: 8.5 },
    { x: 8.5, y: 2.5 },
  ];

  for (let i = 0; i < Math.min(pests.length, spawns.length); i += 1) {
    if (!isWall(MAPA, spawns[i].x, spawns[i].y)) {
      pests[i].x = spawns[i].x;
      pests[i].y = spawns[i].y;
    }
  }

  return {
    player,
    pests,
    vitalidad: CONFIG_DOOM.vitalidadInicial,
    vitalidadMax: CONFIG_DOOM.vitalidadMax,
    beneficoEquipado: 'trichogramma',
    cooldown: 0,
    plagasRestantes: pests.filter((p) => p.vivo).length,
    mensaje: '',
    mensajeTimer: 0,
    terminado: false,
    ganado: false,
    t: 0,
  };
}

/**
 * Avanza un frame de la simulacion (logica pura, sin render).
 *
 * @param {Object} world  Estado del mundo
 * @param {Object} input   Teclas presionadas { forward, backward, left, right, strafeLeft, strafeRight }
 * @returns {Object} Mundo actualizado
 */
export function tickWorld(world, input) {
  const w = { ...world };
  w.t += 1;

  // Cooldown del lanzamiento
  if (w.cooldown > 0) w.cooldown -= 1;

  // Timer de mensaje
  if (w.mensajeTimer > 0) {
    w.mensajeTimer -= 1;
    if (w.mensajeTimer === 0) w.mensaje = '';
  }

  if (w.terminado) return w;

  // Movimiento del jugador
  let dx = 0;
  let dyMove = 0;
  const vel = CONFIG_DOOM.velMovimiento;

  if (input.forward) dx += vel;
  if (input.backward) dx -= vel;
  if (input.strafeLeft) dyMove -= vel;
  if (input.strafeRight) dyMove += vel;

  // Rotacion
  if (input.left) w.player = { ...w.player, angulo: w.player.angulo - CONFIG_DOOM.velRotacion };
  if (input.right) w.player = { ...w.player, angulo: w.player.angulo + CONFIG_DOOM.velRotacion };

  const newPos = movePlayer(MAPA, w.player, dx, dyMove);
  w.player = { ...w.player, x: newPos.x, y: newPos.y };

  // Fuego (lanzar benefico)
  if (input.fire && w.cooldown <= 0) {
    const resultado = lanzarBenefico(w.player, w.beneficoEquipado, w.pests, CONFIG_DOOM.alcanceLanzamiento);
    w.pests = resultado.pests;
    w.mensaje = resultado.mensaje;
    w.mensajeTimer = 90; // ~1.5 segundos a 60fps
    w.cooldown = CONFIG_DOOM.cooldownLanzamiento;
  }

  // Mover plagas hacia el jugador
  for (const p of w.pests) {
    if (!p.vivo) continue;
    const newPestPos = updatePest(p, w.player, MAPA);
    p.x = newPestPos.x;
    p.y = newPestPos.y;
  }

  // Verificar si plagas alcanzan al jugador
  const reach = checkPestReach(w.pests, w.player);
  if (reach.alcanzado) {
    w.vitalidad -= CONFIG_DOOM.danoPorPlaga * reach.count;
    if (w.vitalidad < 0) w.vitalidad = 0;
    if (w.mensajeTimer <= 0) {
      w.mensaje = 'Una plaga dano el cultivo. Controlala rapido.';
      w.mensajeTimer = 60;
    }
  }

  // Contar plagas vivas
  w.plagasRestantes = w.pests.filter((p) => p.vivo).length;

  // Condiciones de fin
  if (w.vitalidad <= 0) {
    w.terminado = true;
    w.ganado = false;
  } else if (w.plagasRestantes === 0) {
    w.terminado = true;
    w.ganado = true;
  }

  return w;
}

/**
 * Cambia el benefico equipado.
 *
 * @param {Object} world
 * @param {string} beneficoId
 * @returns {Object}
 */
export function cambiarBenefico(world, beneficoId) {
  const existe = BENEFICOS_DOOM.some((b) => b.id === beneficoId);
  if (!existe) return world;
  return { ...world, beneficoEquipado: beneficoId };
}
