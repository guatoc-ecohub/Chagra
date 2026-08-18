// ── hud.js — HUD DOM + minimapa canvas (vueltas, velocidad, derrape) ────────
// El marcado lo pone index.html; aquí solo se actualiza. El minimapa dibuja la
// polilínea de la pista UNA vez en un canvas fuera de pantalla y por frame
// blit + puntos (jugador, checkpoint) — sin redibujar la traza entera.

export function crearHud(cfg = {}) {
  let compacto = !!(cfg.compacto ?? cfg.movil);
  const el = cfg.el; // contenedor #hud

  const vVel = el.querySelector('[data-vel]');
  const vVuelta = el.querySelector('[data-vuelta]');
  const vTurbo = el.querySelector('[data-turbo]');
  const vDriftBar = el.querySelector('[data-drift-bar]');
  const vDriftFill = el.querySelector('[data-drift-fill]');
  const vMsg = el.querySelector('[data-msg]');

  const canvas = el.querySelector('[data-mapa]');
  const ctx = canvas.getContext('2d');

  // traza pre-dibujada
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');

  let mapa = null;
  let tamMini = 0;
  let cssMini = null;

  // El tamaño del minimapa se decidía UNA vez con `cfg.movil` y no se revisaba
  // nunca más. Ahora se recalcula cuando cambia el modo o la ventana, y en modo
  // compacto se mide contra el LADO CORTO del viewport: en un teléfono apaisado
  // (412 px de alto) el minimapa de 192 px tapaba media pantalla, encima de los
  // botones. El lado corto no cambia al rotar, así que el tamaño tampoco.
  function medidas() {
    if (!compacto) return { tam: 132, css: null };
    const corto = Math.min(innerWidth || 412, innerHeight || 412);
    return { tam: 96, css: Math.max(72, Math.min(104, Math.round(corto * 0.22))) };
  }

  /**
   * Recalcula el minimapa. Idempotente y barata: si nada cambió, sale enseguida.
   * @returns {boolean} true si hubo que redimensionar.
   */
  function reajustar(nuevoCompacto = compacto) {
    compacto = !!nuevoCompacto;
    const m = medidas();
    if (m.tam === tamMini && m.css === cssMini) return false;
    tamMini = m.tam;
    cssMini = m.css;
    canvas.width = tamMini * 2; // retina
    canvas.height = tamMini * 2;
    // Sin tamaño CSS el canvas se pinta a su tamaño intrínseco: los 2× de la
    // retina se gastaban en hacerlo el doble de grande. En escritorio se deja
    // como estaba (`css === null`) para no cambiar lo que hoy se ve bien.
    canvas.style.width = cssMini ? `${cssMini}px` : '';
    canvas.style.height = cssMini ? `${cssMini}px` : '';
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
    off.width = canvas.width; off.height = canvas.height;
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.scale(2, 2);
    mapa = null; // la traza se vuelve a trazar en el próximo cuadro
    return true;
  }
  reajustar(compacto);

  function dibujarTraza(minimapa) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of minimapa) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const escX = (tamMini * 0.92) / (x1 - x0 || 1);
    const escZ = (tamMini * 0.92) / (z1 - z0 || 1);
    const esc = Math.min(escX, escZ);
    octx.clearRect(0, 0, tamMini, tamMini);
    octx.strokeStyle = 'rgba(240,236,220,0.75)';
    octx.lineWidth = 3;
    octx.lineJoin = 'round';
    octx.beginPath();
    minimapa.forEach(([x, z], i) => {
      const px = tamMini / 2 + (x - cx) * esc;
      const py = tamMini / 2 + (z - cz) * esc;
      if (i === 0) octx.moveTo(px, py); else octx.lineTo(px, py);
    });
    octx.closePath();
    octx.stroke();
    // salida (marcador)
    const [sx, sz] = minimapa[0];
    const px = tamMini / 2 + (sx - cx) * esc;
    const py = tamMini / 2 + (sz - cz) * esc;
    octx.fillStyle = '#fff2c9';
    octx.beginPath(); octx.arc(px, py, 3, 0, Math.PI * 2); octx.fill();
    return { cx, cz, esc };
  }

  let fAnt = -1;
  let nivelAnt = -1;
  let turboFlash = 0;

  const COL_NIVEL = ['#c9d6c4', '#8fc8ff', '#ffa63d', '#c56bff'];

  function actualizar(s, pista, opts = {}) {
    if (!mapa && pista) mapa = dibujarTraza(pista.minimapa);

    // velocidad
    if (vVel) vVel.textContent = String(Math.round(s.velKmh()));

    // vueltas
    if (vVuelta) {
      const lap = Math.min(s.totalLaps, s.laps + 1);
      vVuelta.textContent = s.fin ? `¡Meta!` : `Vuelta ${lap}/${s.totalLaps}`;
    }

    // derrape: barra de carga + nivel
    if (vDriftBar && vDriftFill) {
      const pct = Math.round(s.drift.carga * 100);
      vDriftFill.style.width = `${pct}%`;
      vDriftFill.style.background = COL_NIVEL[s.drift.nivel] ?? '#c9d6c4';
      vDriftBar.classList.toggle('on', s.drift.act);
    }
    if (s.turbo && s.turbo.nivel !== nivelAnt && vTurbo) {
      turboFlash = 1;
      const nombre = opts.nombresTurbo?.[s.turbo.nivel] ?? '¡TURBO!';
      vTurbo.textContent = nombre;
      vTurbo.style.color = COL_NIVEL[s.turbo.nivel] ?? '#fff';
      vTurbo.style.opacity = 1;
    }
    nivelAnt = s.turbo ? s.turbo.nivel : -1;
    if (turboFlash > 0 && vTurbo) {
      turboFlash = Math.max(0, turboFlash - 0.06);
      vTurbo.style.opacity = Math.min(1, turboFlash * 4);
      if (turboFlash === 0) vTurbo.style.opacity = 0;
    }

    // minimapa
    if (ctx && mapa) {
      ctx.clearRect(0, 0, tamMini, tamMini);
      ctx.drawImage(off, 0, 0, tamMini, tamMini);
      // checkpoint
      const cp = puntoEn(pista.minimapa, s.fCheck);
      const cpx = tamMini / 2 + (cp[0] - mapa.cx) * mapa.esc;
      const cpy = tamMini / 2 + (cp[1] - mapa.cz) * mapa.esc;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(cpx, cpy, 2.6, 0, Math.PI * 2); ctx.fill();
      // jugador
      const ff = s.info ? s.info.f : 0;
      const pp = puntoEn(pista.minimapa, ff);
      const ppx = tamMini / 2 + (pp[0] - mapa.cx) * mapa.esc;
      const ppy = tamMini / 2 + (pp[1] - mapa.cz) * mapa.esc;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath(); ctx.arc(ppx, ppy, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#7a4d00'; ctx.lineWidth = 1;
      ctx.stroke();
      fAnt = ff;
    }

    // mensajes efímeros (respawn, vuelta)
    if (opts.msg && vMsg) {
      vMsg.textContent = opts.msg;
      vMsg.classList.add('show');
      clearTimeout(vMsg._t);
      vMsg._t = setTimeout(() => vMsg.classList.remove('show'), 1800);
    }
  }

  function mensaje(txt, dur = 1800) {
    if (vMsg) {
      vMsg.textContent = txt;
      vMsg.classList.add('show');
      clearTimeout(vMsg._t);
      vMsg._t = setTimeout(() => vMsg.classList.remove('show'), dur);
    }
  }

  return { actualizar, mensaje, dibujarTraza, reajustar };
}

function puntoEn(minimapa, f) {
  const n = minimapa.length;
  if (!Number.isFinite(f)) f = 0;
  const fx = f * n;
  const k = Math.floor(fx);
  const i = ((k % n) + n) % n;
  const j = (i + 1) % n;
  const t = fx - Math.floor(fx);
  const a = minimapa[i], b = minimapa[j];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
