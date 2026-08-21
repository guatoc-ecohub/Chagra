// ── multijugador.js — sala LAN tonta para Chagra Kart ───────────────────────
// Maneja el WebSocket, la sala, el estado de presencia y la interpolación de
// los estados recibidos. No sabe de física ni de rendering.

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function wrapA(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function lerp(a, b, t) { return a + (b - a) * t; }

function lerpA(a, b, t) {
  const d = wrapA(b - a);
  return wrapA(a + d * t);
}

function clone(obj) {
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}

function normalizarCodigo(txt) {
  return String(txt || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
}

// `local` es un detalle de UI de la punta que simula el kart; nunca cruza la
// red. La identidad que sí viaja es estable: el rol dueño del kart.
export function serializarEstadoKarts(karts) {
  return (karts || []).map((k) => {
    const { local, ...serializable } = k;
    return {
      ...serializable,
      // efectos es el único campo con objetos mutables que se retiene como
      // datos; se corta para que el snapshot no comparta referencias locales.
      efectos: Array.isArray(k.efectos) ? k.efectos.map((e) => ({ tipo: e.tipo, t: e.t })) : [],
    };
  });
}

// No hay fallback intencional: si falta el kart de esta punta, copiar el del
// otro sería exactamente el bug que este contrato evita.
export function resolverKartPropio(snapshot, ownerId) {
  if (!snapshot || !Array.isArray(snapshot.karts) || !ownerId) return null;
  return snapshot.karts.find((kart) => kart?.ownerId === ownerId) || null;
}

// Un relay publicado se monta detrás del mismo origen: HTTPS se traduce a WSS
// y no depende de una IP privada de una casa. `urlBase` permite inyectar el
// relay explícitamente en desarrollo o en un despliegue futuro.
export function resolverUrlRelay(cfg = {}, ubicacion = globalThis.location) {
  if (cfg.urlBase) return String(cfg.urlBase).replace(/\/$/, '');
  if (!ubicacion?.host) return '';
  const protocolo = ubicacion.protocol === 'https:' ? 'wss:' : 'ws:';
  // El servidor estático del valle no hace proxy WebSocket. En HTTP local/LAN
  // el relay vive en 8899; detrás de HTTPS queda el endpoint histórico del
  // mismo origen, que es el punto que debe publicar el reverse proxy.
  if (ubicacion.protocol === 'https:') return `${protocolo}//${ubicacion.host}/kart-relay`;
  const host = ubicacion.hostname || ubicacion.host.split(':')[0];
  return `${protocolo}//${host}:8899`;
}

export function serializarSnapshotHost(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const out = { ...snapshot };
  if (Array.isArray(snapshot.karts)) out.karts = serializarEstadoKarts(snapshot.karts);
  if (Array.isArray(snapshot.rivals)) out.rivals = serializarEstadoKarts(snapshot.rivals);
  return out;
}

export function resolverSnapshotParaRol(snapshot, ownerId) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const out = { ...snapshot };
  out.propio = resolverKartPropio(out, ownerId);
  out.peer = Array.isArray(out.karts)
    ? out.karts.find((kart) => kart?.ownerId && kart.ownerId !== ownerId) || null
    : null;
  return out;
}

export function crearMultijugador(cfg = {}) {
  const base = resolverUrlRelay(cfg);
  const onStatus = typeof cfg.onStatus === 'function' ? cfg.onStatus : () => {};
  const estado = {
    activo: false,
    rol: 'solo',
    codigo: '',
    conectado: false,
    peerConectado: false,
    listoLocal: false,
    listoPeer: false,
    ultimoError: '',
    ultimoMsg: '',
    miembros: 0,
    hostPresente: false,
    guestPresente: false,
  };
  let ws = null;
  let role = 'solo';
  let codigo = '';
  let cola = [];
  let controlRemoto = { gas: false, freno: false, izq: false, der: false, derrapar: false, saltar: false, poder: false, giro: 0 };
  let metaLocal = null;
  let metaRemota = null;
  const muestras = [];
  let ultimoPulso = 0;

  function emitir() {
    onStatus({ ...estado });
  }

  function cerrar() {
    if (ws) {
      try { ws.close(1000, 'salida'); } catch {}
    }
    ws = null;
    cola = [];
    muestras.length = 0;
    metaLocal = null;
    metaRemota = null;
    controlRemoto = { gas: false, freno: false, izq: false, der: false, derrapar: false, saltar: false, poder: false, giro: 0 };
    ultimoPulso = 0;
    estado.activo = false;
    estado.conectado = false;
    estado.peerConectado = false;
    estado.rol = 'solo';
    role = 'solo';
    codigo = '';
    estado.codigo = '';
    emitir();
  }

  function enviar(obj) {
    const payload = JSON.stringify(obj);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      return true;
    }
    cola.push(payload);
    return false;
  }

  function drenarCola() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (cola.length) {
      ws.send(cola.shift());
    }
  }

  function conectar(path, nuevoRol, codigoSala = '') {
    cerrar();
    role = nuevoRol;
    codigo = codigoSala;
    estado.activo = true;
    estado.rol = nuevoRol;
    estado.codigo = codigoSala;
    estado.ultimoError = '';
    estado.ultimoMsg = '';
    estado.listoLocal = false;
    estado.listoPeer = false;
    estado.conectado = false;
    estado.peerConectado = false;
    estado.miembros = 0;
    estado.hostPresente = false;
    estado.guestPresente = false;
    muestras.length = 0;
    controlRemoto = { gas: false, freno: false, izq: false, der: false, derrapar: false, saltar: false, poder: false, giro: 0 };
    emitir();

    if (!base) {
      estado.ultimoError = 'No hay relevo configurado para esta carrera';
      emitir();
      return;
    }

    ws = new WebSocket(`${base}${path}`);
    ws.addEventListener('open', () => {
      estado.conectado = true;
      drenarCola();
      if (metaLocal) enviar({ type: 'meta', meta: metaLocal });
      emitir();
    });
    ws.addEventListener('message', (ev) => {
      let data = null;
      try {
        data = JSON.parse(ev.data);
      } catch {
        estado.ultimoMsg = String(ev.data || '');
        emitir();
        return;
      }
      if (!data || typeof data !== 'object') return;
      if (data.type === 'room') {
        if (data.code) {
          codigo = normalizarCodigo(data.code);
          estado.codigo = codigo;
        }
        if (data.role) {
          role = data.role;
          estado.rol = data.role;
        }
        if (Number.isFinite(data.members)) estado.miembros = data.members;
        estado.peerConectado = (data.members ?? 0) > 1;
        emitir();
        return;
      }
      if (data.type === 'presence') {
        if (Number.isFinite(data.members)) estado.miembros = data.members;
        if (Array.isArray(data.roles)) {
          estado.hostPresente = data.roles.includes('host');
          estado.guestPresente = data.roles.includes('guest');
          estado.peerConectado = data.roles.length > 1;
        }
        if (typeof data.listoHost === 'boolean') estado.listoPeer = role === 'guest' ? data.listoHost : estado.listoPeer;
        if (typeof data.listoGuest === 'boolean') estado.listoPeer = role === 'host' ? data.listoGuest : estado.listoPeer;
        emitir();
        return;
      }
      if (data.type === 'meta') {
        metaRemota = clone(data.meta);
        if (metaRemota && typeof metaRemota.ready === 'boolean') {
          estado.listoPeer = !!metaRemota.ready;
        }
        emitir();
        return;
      }
      if (data.type === 'controls') {
        controlRemoto = {
          gas: !!data.controls?.gas,
          freno: !!data.controls?.freno,
          izq: !!data.controls?.izq,
          der: !!data.controls?.der,
          derrapar: !!data.controls?.derrapar,
          saltar: !!data.controls?.saltar,
          poder: !!data.controls?.poder,
          giro: Number.isFinite(data.controls?.giro) ? data.controls.giro : 0,
        };
        estado.peerConectado = true;
        estado.miembros = Math.max(estado.miembros, 2);
        emitir();
        return;
      }
      if (data.type === 'state') {
        const recibido = data.state || data.snapshot || data;
        if (recibido) {
          muestras.push({ at: performance.now(), state: clone(recibido) });
          while (muestras.length > 4) muestras.shift();
        }
        return;
      }
      if (data.type === 'ready') {
        if (data.from && data.from !== role) {
          estado.listoPeer = !!data.ready;
          emitir();
        }
        return;
      }
      if (data.type === 'close') {
        estado.ultimoMsg = data.msg || 'desconectado';
        emitir();
        return;
      }
      if (data.type === 'error') {
        estado.ultimoError = data.msg || 'La sala rechazó la conexión';
        emitir();
      }
    });
    ws.addEventListener('close', () => {
      estado.conectado = false;
      estado.peerConectado = false;
      emitir();
    });
    ws.addEventListener('error', () => {
      estado.ultimoError = 'No se pudo abrir la sala';
      emitir();
    });
  }

  function crearSala(codigoFijo = '') {
    const fijo = normalizarCodigo(codigoFijo);
    conectar(`/create${fijo ? `?code=${fijo}` : ''}`, 'host');
  }

  function unirse(cod) {
    const c = normalizarCodigo(cod);
    if (c.length !== 4) {
      estado.ultimoError = 'El código debe tener 4 letras';
      emitir();
      return false;
    }
    conectar(`/${c}`, 'guest', c);
    return true;
  }

  function setMeta(meta) {
    metaLocal = { ...meta };
    if (role !== 'solo') enviar({ type: 'meta', meta: metaLocal });
    emitir();
  }

  function setListo(on) {
    if (role === 'solo') return;
    metaLocal = { ...(metaLocal || {}), ready: !!on };
    estado.listoLocal = !!on;
    enviar({ type: 'meta', meta: metaLocal });
    enviar({ type: 'ready', from: role, ready: !!on });
    emitir();
  }

  function enviarControles(controls) {
    if (role === 'guest') {
      enviar({ type: 'controls', controls: { ...controls } });
      ultimoPulso = performance.now();
    } else if (role === 'host') {
      controlRemoto = { ...controlRemoto, ...controls };
    }
  }

  function recibirControlesHost() {
    return { ...controlRemoto };
  }

  function enviarEstado(state) {
    if (role !== 'host') return;
    enviar({ type: 'state', state: serializarSnapshotHost(state) });
  }

  function estadisticaIntermedia(a, b, t) {
    return {
      id: b.id || a.id,
      ownerId: b.ownerId || a.ownerId,
      piloto: b.piloto || a.piloto,
      vehiculo: b.vehiculo || a.vehiculo,
      x: lerp(a.x ?? 0, b.x ?? 0, t),
      y: lerp(a.y ?? 0, b.y ?? 0, t),
      z: lerp(a.z ?? 0, b.z ?? 0, t),
      hdg: lerpA(a.hdg ?? 0, b.hdg ?? 0, t),
      vel: lerp(a.vel ?? 0, b.vel ?? 0, t),
      lap: Math.round(lerp(a.lap ?? 0, b.lap ?? 0, t)),
      laps: Math.round(lerp(a.laps ?? 0, b.laps ?? 0, t)),
      ready: !!(b.ready ?? a.ready),
      conectado: b.conectado !== false,
      efectos: Array.isArray(b.efectos) ? b.efectos.map((e) => ({ tipo: e.tipo, t: e.t })) : [],
      drift: b.drift || a.drift || { act: false, carga: 0, nivel: 0 },
      turbo: b.turbo || a.turbo || null,
      fin: !!(b.fin ?? a.fin),
      totalLaps: b.totalLaps ?? a.totalLaps ?? 3,
      info: b.info || a.info || null,
    };
  }

  function obtenerEstadoInterpolado() {
    if (!muestras.length) return null;
    if (muestras.length === 1) return resolverSnapshotParaRol(clone(muestras[0].state), role);
    const b = muestras[muestras.length - 1];
    const a = muestras[muestras.length - 2];
    const dt = Math.max(1, b.at - a.at);
    const t = clamp((performance.now() - a.at) / dt, 0, 1);
    const base = clone(a.state);
    const out = { ...base };
    const lista = Array.isArray(base.karts) ? base.karts : [];
    const listaB = Array.isArray(b.state?.karts) ? b.state.karts : [];
    out.karts = lista.map((k, i) => estadisticaIntermedia(k, listaB[i] || k, t));
    if (Array.isArray(b.state?.rivals)) {
      out.rivals = b.state.rivals.map((r, i) => {
        const aa = a.state?.rivals?.[i] || r;
        return estadisticaIntermedia(aa, r, t);
      });
    }
    out.timestamp = lerp(a.state.timestamp ?? 0, b.state.timestamp ?? 0, t);
    return resolverSnapshotParaRol(out, role);
  }

  function ping() {
    const now = performance.now();
    if (role !== 'guest' || now - ultimoPulso < 250) return;
    enviar({ type: 'controls', controls: controlRemoto });
  }

  return {
    estado,
    crearSala,
    unirse,
    cerrar,
    setMeta,
    setListo,
    enviarControles,
    recibirControlesHost,
    enviarEstado,
    obtenerEstadoInterpolado,
    obtenerMetaLocal: () => clone(metaLocal),
    obtenerMetaRemota: () => clone(metaRemota),
    ping,
    normalizarCodigo,
  };
}
