/**
 * doomFincaEngine - motor raycaster puro para el nivel Doom agroecologico.
 *
 * Funciones puras: sin DOM, sin React, sin canvas. Toman estado, devuelven
 * estado nuevo. Totalmente testeable.
 *
 * Raycaster DDA clasico (Digital Differential Analyzer) estilo Wolfenstein 3D.
 * Sin librerias 3D, solo matematicas.
 *
 * El loop ahora es por ESCENARIOS (rondas): cada ronda tiene su cultivo y sus
 * plagas reales con su controlador biologico correcto. El jugador identifica,
 * apunta y suelta el benefico correcto. Acierto = ficha educativa + puntos;
 * error = la plaga aguanta + aviso educativo. Al final, recap de lo aprendido.
 *
 * Solo este repo. i18n: solo es-CO.
 */

import {
  MAPA, MAPA_FILAS, MAPA_COLS, CONFIG_DOOM, PLAGAS_DOOM, BENEFICOS_DOOM,
  ESCENARIOS, JUGADOR_INICIAL,
} from '../components/juego/doomFincaData';

/** Busca la definicion de una plaga por id. */
function plagaDef(id) { return PLAGAS_DOOM.find((p) => p.id === id) || null; }
/** Busca la definicion de un benefico por id. */
function beneficoDef(id) { return BENEFICOS_DOOM.find((b) => b.id === id) || null; }

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
 * Cast de un solo rayo DDA desde (ox, oy) con angulo `angle` (rad).
 * @returns {{dist:number, cara:number, texX:number, tipo:number}}
 */
export function castRay(mapa, ox, oy, angle) {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  let mapX = Math.floor(ox);
  let mapY = Math.floor(oy);

  const deltaDistX = dirX === 0 ? 1e30 : Math.abs(1 / dirX);
  const deltaDistY = dirY === 0 ? 1e30 : Math.abs(1 / dirY);

  const stepX = dirX < 0 ? -1 : 1;
  const stepY = dirY < 0 ? -1 : 1;

  let sideDistX;
  let sideDistY;
  if (dirX < 0) sideDistX = (ox - mapX) * deltaDistX;
  else sideDistX = (mapX + 1.0 - ox) * deltaDistX;
  if (dirY < 0) sideDistY = (oy - mapY) * deltaDistY;
  else sideDistY = (mapY + 1.0 - oy) * deltaDistY;

  let side = 0;
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
    if (mapX < 0 || mapX >= MAPA_COLS || mapY < 0 || mapY >= MAPA_FILAS) break;
    if (mapa[mapY][mapX] !== 0) {
      tipo = mapa[mapY][mapX];
      break;
    }
  }

  let perpDist;
  if (side === 0) perpDist = (sideDistX - deltaDistX);
  else perpDist = (sideDistY - deltaDistY);
  if (perpDist < 0.001) perpDist = 0.001;

  let wallX;
  if (side === 0) wallX = oy + perpDist * dirY;
  else wallX = ox + perpDist * dirX;
  wallX -= Math.floor(wallX);

  let cara;
  if (side === 0) cara = dirX > 0 ? 3 : 2;
  else cara = dirY > 0 ? 1 : 0;

  return { dist: perpDist, cara, texX: wallX, tipo };
}

/**
 * Proyecta un sprite 3D a coordenadas de pantalla 2D.
 * @returns {{ visible: boolean, screenX: number, screenY: number, size: number, dist: number, relativeAngle: number }}
 */
export function projectSprite(sx, sy, px, py, pAngle, fov, screenW, screenH) {
  const dx = sx - px;
  const dy = sy - py;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const spriteAngle = Math.atan2(dy, dx);
  let relativeAngle = spriteAngle - pAngle;
  while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
  while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;

  if (Math.abs(relativeAngle) > fov / 2 + 0.25) {
    return { visible: false, screenX: 0, screenY: 0, size: 0, dist, relativeAngle };
  }

  const screenX = (0.5 + relativeAngle / fov) * screenW;
  const size = Math.round(screenH / dist);

  return {
    visible: true,
    screenX: Math.round(screenX),
    screenY: Math.round(screenH / 2),
    size,
    dist,
    relativeAngle,
  };
}

/**
 * Mueve al jugador con colision contra paredes (deslizamiento).
 * @returns {{ x: number, y: number }}
 */
export function movePlayer(mapa, player, dx, dy) {
  const cAngle = player.angulo;
  const margin = 0.18;

  const moveX = dx * Math.cos(cAngle) - dy * Math.sin(cAngle);
  const moveY = dx * Math.sin(cAngle) + dy * Math.cos(cAngle);

  let newX = player.x;
  let newY = player.y;

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
 * Actualiza la posicion de una plaga: deambula y se acerca lento al jugador.
 * @returns {{ x: number, y: number }}
 */
export function updatePest(pest, player, mapa) {
  const dx = player.x - pest.x;
  const dy = player.y - pest.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return { x: pest.x, y: pest.y };

  // mezcla de acercamiento + deambular para que no se peguen todas al jugador
  const wob = Math.sin((pest.faseWobble || 0)) * 0.5;
  const dirX = (dx / dist) * Math.cos(wob) - (dy / dist) * Math.sin(wob);
  const dirY = (dx / dist) * Math.sin(wob) + (dy / dist) * Math.cos(wob);
  const step = pest.velocidad * 0.55;

  let newX = pest.x + dirX * step;
  let newY = pest.y + dirY * step;

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
 * Identifica la plaga viva que esta al frente del jugador (cono estrecho,
 * dentro de alcance), si hay, junto con si el benefico equipado es correcto.
 * Devuelve la plaga objetivo y metadatos para la HUD (etiqueta + ficha).
 *
 * @returns {{ plaga: Object|null, dist: number, correcto: boolean }}
 */
export function plagaObjetivo(player, beneficoId, pests, maxDist) {
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
    // cono que se ensancha cuando la plaga esta cerca (mas facil apuntar)
    const cono = 0.16 + Math.min(0.30, 0.6 / Math.max(dist, 0.5));
    if (Math.abs(diff) < cono && dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  if (!best) return { plaga: null, dist: maxDist, correcto: false };
  return { plaga: best, dist: bestDist, correcto: best.controladoPor === beneficoId };
}

/**
 * Compat: indica si el jugador apunta a una plaga viva y si el benefico es
 * correcto. Conserva la firma vieja para tests.
 * @returns {{ enMira: boolean, correcto: boolean }}
 */
export function plagaEnMira(player, beneficoId, pests, maxDist) {
  const t = plagaObjetivo(player, beneficoId, pests, maxDist);
  return { enMira: !!t.plaga, correcto: t.correcto };
}

/**
 * Devuelve la decoracion de la finca que el jugador tiene en la mira, o null.
 * @returns {Object|null}
 */
export function decoracionEnMira(player, decoraciones, maxDist = 3.8) {
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
    if (Math.abs(diff) < 0.28 && dist < bestDist) {
      best = d;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Verifica si alguna plaga alcanzo al jugador (le esta haciendo dano).
 * @returns {{ alcanzado: boolean, count: number }}
 */
export function checkPestReach(pests, player, distUmbral = 0.7) {
  let count = 0;
  for (const p of pests) {
    if (!p.vivo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) < distUmbral) count += 1;
  }
  return { alcanzado: count > 0, count };
}

/**
 * Suelta un benefico y verifica si controla la plaga objetivo.
 * Acierto = baja vitalidad de la plaga (la "controla"); con benefico
 * equivocado, la plaga aguanta y se devuelve un aviso educativo.
 *
 * @returns {{ resultado: 'acierto'|'control'|'equivocado'|'vacio', plaga: Object|null }}
 */
export function lanzarBenefico(player, beneficoId, pests, maxDist) {
  const obj = plagaObjetivo(player, beneficoId, pests, maxDist);
  if (!obj.plaga) return { resultado: 'vacio', plaga: null };

  const p = obj.plaga;
  const def = plagaDef(p.tipo);
  const correcto = def && def.controladoPor === beneficoId;

  if (!correcto) {
    // marca de feedback visual "equivocado" sobre la plaga
    p.flashEquivocado = 18;
    return { resultado: 'equivocado', plaga: p };
  }

  p.vitalidad -= 1;
  p.flashAcierto = 14;
  if (p.vitalidad <= 0) {
    p.vivo = false;
    return { resultado: 'control', plaga: p };
  }
  return { resultado: 'acierto', plaga: p };
}

/**
 * Construye la lista de plagas para un escenario dado.
 * @param {Object} esc  Escenario de ESCENARIOS
 * @returns {Object[]}
 */
function crearPlagasEscenario(esc) {
  return esc.plagas.map((plagaId, i) => {
    const def = plagaDef(plagaId);
    const spawn = esc.spawns[i] || esc.spawns[esc.spawns.length - 1];
    let { x, y } = spawn;
    if (isWall(MAPA, x, y)) { x = 7.5; y = 6.5; }
    return {
      tipo: def.id,
      nombre: def.nombre,
      cientifico: def.cientifico,
      emoji: def.emoji,
      forma: def.forma,
      color: def.color,
      cultivo: def.cultivo,
      x,
      y,
      velocidad: def.velocidad,
      vitalidad: def.vitalidad,
      vitalidadMax: def.vitalidad,
      vivo: true,
      controladoPor: def.controladoPor,
      dano: def.dano,
      porQue: def.porQue,
      faseWobble: Math.random() * Math.PI * 2,
      flashAcierto: 0,
      flashEquivocado: 0,
    };
  });
}

/**
 * Crea el estado inicial del mundo de juego (arranca en la ronda 0).
 * @returns {Object}
 */
export function createWorld() {
  const esc = ESCENARIOS[0];
  const player = { ...JUGADOR_INICIAL };
  const pests = crearPlagasEscenario(esc);

  return {
    player,
    pests,
    rondaIdx: 0,
    escenario: esc,
    vitalidad: CONFIG_DOOM.vitalidadInicial,
    vitalidadMax: CONFIG_DOOM.vitalidadMax,
    beneficoEquipado: esc.beneficosSugeridos[0],
    cooldown: 0,
    plagasRestantes: pests.filter((p) => p.vivo).length,
    puntaje: 0,
    combo: 0,
    aciertos: 0,
    errores: 0,
    mensaje: '',
    mensajeTipo: 'info',  // info | acierto | error
    mensajeTimer: 0,
    ficha: null,          // ficha educativa al controlar bien una plaga
    fichaTimer: 0,
    aprendido: [],        // pares plaga->benefico aprendidos (recap)
    rondaTransicion: false,
    terminado: false,
    ganado: false,
    t: 0,
  };
}

/**
 * Avanza a la siguiente ronda (escenario). Si no hay mas, gana el juego.
 * @param {Object} w
 * @returns {Object}
 */
export function avanzarRonda(w) {
  const next = w.rondaIdx + 1;
  if (next >= ESCENARIOS.length) {
    return { ...w, terminado: true, ganado: true, rondaTransicion: false };
  }
  const esc = ESCENARIOS[next];
  const pests = crearPlagasEscenario(esc);
  return {
    ...w,
    rondaIdx: next,
    escenario: esc,
    pests,
    player: { ...JUGADOR_INICIAL },
    beneficoEquipado: esc.beneficosSugeridos[0],
    plagasRestantes: pests.filter((p) => p.vivo).length,
    combo: 0,
    cooldown: 0,
    rondaTransicion: false,
    // bonus de vitalidad por completar ronda (premio, no castigo)
    vitalidad: Math.min(CONFIG_DOOM.vitalidadMax, w.vitalidad + 20),
    ficha: null,
    fichaTimer: 0,
  };
}

/**
 * Avanza un frame de la simulacion (logica pura, sin render).
 * @param {Object} world
 * @param {Object} input  { forward, backward, strafeLeft, strafeRight, left, right, fire }
 * @returns {Object}
 */
export function tickWorld(world, input) {
  const w = { ...world };
  w.t += 1;

  if (w.cooldown > 0) w.cooldown -= 1;
  if (w.mensajeTimer > 0) {
    w.mensajeTimer -= 1;
    if (w.mensajeTimer === 0) w.mensaje = '';
  }
  if (w.fichaTimer > 0) {
    w.fichaTimer -= 1;
    if (w.fichaTimer === 0) w.ficha = null;
  }

  if (w.terminado || w.rondaTransicion) return w;

  // Movimiento del jugador
  let dx = 0;
  let dyMove = 0;
  const vel = CONFIG_DOOM.velMovimiento;
  if (input.forward) dx += vel;
  if (input.backward) dx -= vel;
  if (input.strafeLeft) dyMove -= vel;
  if (input.strafeRight) dyMove += vel;

  if (input.left) w.player = { ...w.player, angulo: w.player.angulo - CONFIG_DOOM.velRotacion };
  if (input.right) w.player = { ...w.player, angulo: w.player.angulo + CONFIG_DOOM.velRotacion };

  const newPos = movePlayer(MAPA, w.player, dx, dyMove);
  w.player = { ...w.player, x: newPos.x, y: newPos.y };

  // Soltar benefico
  if (input.fire && w.cooldown <= 0) {
    const r = lanzarBenefico(w.player, w.beneficoEquipado, w.pests, CONFIG_DOOM.alcanceLanzamiento);
    w.cooldown = CONFIG_DOOM.cooldownLanzamiento;
    const benef = beneficoDef(w.beneficoEquipado);

    if (r.resultado === 'vacio') {
      w.mensaje = 'No hay plaga al frente. Acercate y apunta al bicho.';
      w.mensajeTipo = 'info';
      w.mensajeTimer = 60;
      w.combo = 0;
    } else if (r.resultado === 'equivocado') {
      const correcto = beneficoDef(r.plaga.controladoPor);
      w.mensaje = `${benef?.nombre} no controla a ${r.plaga.nombre}. Prueba: ${correcto?.nombre}.`;
      w.mensajeTipo = 'error';
      w.mensajeTimer = 110;
      w.errores += 1;
      w.combo = 0;
    } else if (r.resultado === 'acierto') {
      w.mensaje = `Bien: ${benef?.nombre} es el control de ${r.plaga.nombre}. Insiste.`;
      w.mensajeTipo = 'acierto';
      w.mensajeTimer = 70;
    } else if (r.resultado === 'control') {
      // controlada -> ficha educativa + puntos + recap
      w.aciertos += 1;
      w.combo += 1;
      const pts = 100 + (w.combo - 1) * 25;
      w.puntaje += pts;
      w.ficha = {
        plaga: r.plaga.nombre,
        cientifico: r.plaga.cientifico,
        cultivo: r.plaga.cultivo,
        benefico: benef?.nombre,
        beneficoCientifico: benef?.cientifico,
        porQue: r.plaga.porQue,
        mecanismo: benef?.mecanismo,
        puntos: pts,
        combo: w.combo,
      };
      w.fichaTimer = 260;
      w.mensaje = '';
      w.mensajeTimer = 0;
      // registrar para el recap (sin duplicar el par)
      const par = `${r.plaga.nombre}__${benef?.nombre}`;
      if (!w.aprendido.some((a) => a.par === par)) {
        w.aprendido = [...w.aprendido, {
          par,
          plaga: r.plaga.nombre,
          cientifico: r.plaga.cientifico,
          benefico: benef?.nombre,
          porQue: r.plaga.porQue,
        }];
      }
    }
  }

  // Mover plagas + decaer flashes
  for (const p of w.pests) {
    if (p.flashAcierto > 0) p.flashAcierto -= 1;
    if (p.flashEquivocado > 0) p.flashEquivocado -= 1;
    if (!p.vivo) continue;
    p.faseWobble = (p.faseWobble || 0) + 0.05;
    const np = updatePest(p, w.player, MAPA);
    p.x = np.x;
    p.y = np.y;
  }

  // Dano de plagas al jugador
  const reach = checkPestReach(w.pests, w.player);
  if (reach.alcanzado) {
    w.vitalidad -= CONFIG_DOOM.danoPorPlaga * reach.count * 0.4;
    if (w.vitalidad < 0) w.vitalidad = 0;
    if (w.mensajeTimer <= 0 && w.fichaTimer <= 0) {
      w.mensaje = 'Una plaga esta encima del cultivo: controlala ya.';
      w.mensajeTipo = 'error';
      w.mensajeTimer = 50;
    }
  }

  w.plagasRestantes = w.pests.filter((p) => p.vivo).length;

  // Fin de ronda / juego
  if (w.vitalidad <= 0) {
    w.terminado = true;
    w.ganado = false;
  } else if (w.plagasRestantes === 0) {
    if (w.rondaIdx + 1 >= ESCENARIOS.length) {
      w.terminado = true;
      w.ganado = true;
    } else {
      // pasar de ronda: marcar transicion (la UI muestra la intro siguiente)
      w.rondaTransicion = true;
    }
  }

  return w;
}

/**
 * Cambia el benefico equipado.
 * @returns {Object}
 */
export function cambiarBenefico(world, beneficoId) {
  const existe = BENEFICOS_DOOM.some((b) => b.id === beneficoId);
  if (!existe) return world;
  return { ...world, beneficoEquipado: beneficoId };
}
