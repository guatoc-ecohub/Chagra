/*
 * i18n: este minijuego se sirve solo en es-CO. La regla chagra-i18n es soft
 * (warn), aqui se desactiva por archivo completo.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import {
  Bug, Shield, RotateCcw, Crosshair, Sprout, Target, Trophy,
  GraduationCap, Play, ChevronRight, Heart, Zap,
} from 'lucide-react';
import { agentSounds, isSoundEnabled } from '../../services/agentSoundService';
import { recordGameStart, recordGameComplete } from '../../services/usageTelemetryService';
import {
  MAPA, PALETA, MATERIALES, DECORACIONES, CONFIG_DOOM,
  PLAGAS_DOOM, BENEFICOS_DOOM, ESCENARIOS, paletaPorTema,
} from './doomFincaData';
import { fincaVivaHomePerfilActivo } from '../../config/fincaVivaHomeFlag';
import { temaActivoDom, fvhSkinClass } from '../../config/fvhSkin';
import {
  castRay, projectSprite, createWorld, tickWorld, cambiarBenefico,
  decoracionEnMira, plagaObjetivo, avanzarRonda,
} from '../../services/doomFincaEngine';

const W = CONFIG_DOOM.resX;  // 240
const H = CONFIG_DOOM.resY;  // 180
const FOV = CONFIG_DOOM.fov;
const NIEBLA_INI = CONFIG_DOOM.nieblaInicio;
const NIEBLA_FIN = CONFIG_DOOM.nieblaFin;

/** Parte fraccionaria. */
function frac(n) { return n - Math.floor(n); }

/** Hash 2D determinista 0..1 (ruido para texturas de campo). */
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Diferencia angular normalizada a [-PI, PI]. */
function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Convierte '#rrggbb' a [r, g, b]. */
function hexRGB(h) {
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

/** Oscurece un color [r,g,b]. */
function darken(c, f) { return [c[0] * f, c[1] * f, c[2] * f]; }
/** Aclara un color [r,g,b] (clamp 255). */
function lighten(c, f) {
  return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
}

/**
 * Color de un pixel de pared segun material y coordenada de textura.
 */
function texturaPared(patron, tx, vy, base, sombra, luz) {
  switch (patron) {
    case 'madera': {
      const plank = Math.floor(vy * 5);
      if (frac(vy * 5) < 0.10) return sombra;
      return hash2(Math.floor(tx * 40), plank) > 0.7 ? luz : base;
    }
    case 'adobe': {
      const filas = 5;
      const by = Math.floor(vy * filas);
      const bx = frac(tx * 4 + (by % 2) * 0.5);
      if (frac(vy * filas) < 0.12 || bx < 0.08 || bx > 0.92) return sombra;
      return (by % 2 === 0) ? base : luz;
    }
    case 'seto': {
      const v = hash2(Math.floor(tx * 18), Math.floor(vy * 18)) * 0.6
              + hash2(Math.floor(tx * 7) + 3, Math.floor(vy * 9) + 5) * 0.4;
      if (v < 0.30) return sombra;
      if (v > 0.72) return luz;
      return base;
    }
    case 'compost': {
      if (frac(tx * 3) < 0.06) return sombra;
      const n = hash2(Math.floor(tx * 14), Math.floor(vy * 14));
      if (n < 0.33) return sombra;
      if (n > 0.80) return luz;
      return base;
    }
    case 'cultivo': {
      if (vy < 0.42) {
        return hash2(Math.floor(tx * 20), Math.floor(vy * 24)) > 0.45 ? luz : sombra;
      }
      if (vy < 0.50) return sombra;
      return frac(vy * 4) < 0.12 ? sombra : base;
    }
    default:
      return base;
  }
}

/**
 * Pinta un pixel (u,v en 0-1) de una PLAGA. Devuelve [r,g,b] o null.
 * Sprites grandes, contrastados y reconocibles, con contorno oscuro para
 * separarlos del fondo (la queja #1 fue "no se distingue nada").
 *
 * @param {string} forma
 * @param {number} u  0-1 horizontal
 * @param {number} v  0-1 vertical
 * @param {number[]} base color RGB de la especie
 * @returns {number[]|null}
 */
function pintarPlaga(forma, u, v, base) {
  const cx = u - 0.5;
  const dark = darken(base, 0.45);
  const lite = lighten(base, 1.4);
  switch (forma) {
    case 'oruga': {
      // gusano gordo segmentado, horizontal, con cabeza marcada y patas
      const segCenter = 0.55;
      const r = cx * cx * 1.7 + (v - segCenter) * (v - segCenter) * 7.5;
      if (r > 0.92) return null;
      if (r > 0.74) return dark;                                   // contorno
      if (u > 0.78) {                                              // cabeza a la derecha
        if (Math.abs(v - 0.50) < 0.07 && u > 0.84) return [20, 20, 20]; // ojo
        return darken(base, 0.7);
      }
      const seg = frac(u * 7);
      if (seg < 0.22) return dark;                                 // bandas
      if (v < segCenter - 0.05) return lite;                       // lomo iluminado
      if (v > 0.70 && frac(u * 7) < 0.4) return [40, 28, 16];      // patitas
      return base;
    }
    case 'mosca': {
      // mosca blanca: cuerpo claro + 2 alas en V + ojos rojizos
      const bodyR = cx * cx * 5 + (v - 0.52) * (v - 0.52) * 6;
      if (v > 0.34 && v < 0.80 && bodyR < 0.42) {
        if (v < 0.44 && Math.abs(cx) < 0.13) return [150, 40, 40]; // ojos
        if (bodyR > 0.32) return [120, 120, 120];                  // contorno
        return base;
      }
      if (Math.abs(cx) > 0.12 && Math.abs(cx) < 0.48 && v > 0.28 && v < 0.62) {
        const aw = (Math.abs(cx) - 0.12) / 0.36;
        if (aw < 0.85) return [248, 248, 252];                     // alas
      }
      return null;
    }
    case 'afido': {
      // colonia de pulgones: varias gotas verdes apinadas + antenas
      const blobs = [[0.42, 0.50, 1.0], [0.60, 0.55, 1.0], [0.51, 0.68, 0.9],
        [0.47, 0.36, 0.8], [0.64, 0.40, 0.7], [0.36, 0.62, 0.7]];
      for (const b of blobs) {
        const dx = u - b[0];
        const dy = v - b[1];
        const rr = (dx * dx * 11 + dy * dy * 16) / b[2];
        if (rr < 0.5) {
          if (rr > 0.38) return dark;                              // contorno gota
          return dy < 0 ? lite : base;
        }
      }
      if (v < 0.36 && Math.abs(cx + 0.04) < 0.02) return dark;     // antenas
      if (v < 0.36 && Math.abs(cx - 0.08) < 0.02) return dark;
      return null;
    }
    case 'escarabajo': {
      // broca: cuerpo ovalado oscuro, linea de elitros, brillo y patas
      const r = cx * cx * 2.6 + (v - 0.55) * (v - 0.55) * 3.6;
      if (r > 0.86 || v < 0.22) {
        if (v > 0.66 && v < 0.84 && Math.abs(cx) > 0.18 && Math.abs(cx) < 0.42) return [20, 14, 8]; // patas
        return null;
      }
      if (r > 0.70) return [10, 8, 4];                             // contorno
      if (Math.abs(cx) < 0.04) return darken(base, 0.4);          // linea elitros
      if (v < 0.40 && cx < 0) return lighten(base, 2.2);          // brillo
      if (v < 0.30) return darken(base, 0.7);                     // cabeza
      return base;
    }
    case 'acaro': {
      // arana roja: cuerpo redondo rojo + 8 patas radiales (muy distinto)
      const dx = u - 0.5;
      const dy = v - 0.5;
      const rr = dx * dx + dy * dy;
      for (let k = 0; k < 8; k += 1) {
        const ang = (k / 8) * Math.PI * 2 + 0.2;
        const t = Math.max(0, Math.min(1, ((u - 0.5) * Math.cos(ang) + (v - 0.5) * Math.sin(ang)) / 0.42));
        const legx = 0.5 + Math.cos(ang) * 0.42 * t;
        const legy = 0.5 + Math.sin(ang) * 0.42 * t;
        if ((u - legx) * (u - legx) + (v - legy) * (v - legy) < 0.0016 && rr > 0.018) return [60, 20, 16];
      }
      if (rr < 0.045) {
        if (rr > 0.032) return [80, 24, 18];                       // contorno
        if (dx < 0 && dy < 0) return lighten(base, 1.5);          // brillo
        if ((dx + 0.05) * (dx + 0.05) + dy * dy < 0.002) return [40, 12, 10]; // manchas
        if ((dx - 0.05) * (dx - 0.05) + dy * dy < 0.002) return [40, 12, 10];
        return base;
      }
      return null;
    }
    default:
      return (cx * cx * 2 + (v - 0.5) * (v - 0.5) * 2) < 0.8 ? base : null;
  }
}

/**
 * Pinta un pixel (u,v en 0-1) de una decoracion de la finca. Devuelve [r,g,b]
 * o null. Arbol, colmena, gallina, vaca, girasol, compostera (abono).
 */
function pintarDeco(tipo, u, v) {
  const cx = u - 0.5;
  switch (tipo) {
    case 'arbol': {
      if (v > 0.60 && Math.abs(cx) < 0.08) return [92, 62, 36];
      const copas = [[0.50, 0.28, 0.30], [0.34, 0.40, 0.22], [0.66, 0.40, 0.22], [0.50, 0.50, 0.24]];
      for (const co of copas) {
        const dx = u - co[0];
        const dy = v - co[1];
        if (dx * dx + dy * dy < co[2] * co[2]) {
          return hash2(Math.floor(u * 30), Math.floor(v * 30)) > 0.5 ? [74, 138, 63] : [54, 104, 46];
        }
      }
      return null;
    }
    case 'colmena': {
      if (v > 0.28 && v < 0.37 && Math.abs(cx) < 0.40) return [120, 80, 40];
      if (v < 0.35) {
        return (v < 0.32 && hash2(Math.floor(u * 40), Math.floor(v * 40)) > 0.93) ? [40, 30, 10] : null;
      }
      if (Math.abs(cx) > 0.34) return null;
      const caja = Math.floor((v - 0.35) / 0.20);
      if (frac((v - 0.35) / 0.20) < 0.10) return [110, 72, 36];
      if (caja === 2 && Math.abs(cx) < 0.12) return [30, 20, 10];
      return (caja % 2 === 0) ? [214, 176, 110] : [196, 156, 92];
    }
    case 'gallina': {
      if (v > 0.78 && v < 0.96 && Math.abs(cx) < 0.20) return [200, 150, 30];
      const dxh = u - 0.66;
      const dyh = v - 0.34;
      if (dxh * dxh * 4 + dyh * dyh * 5 < 0.40) {
        if (v < 0.27) return [210, 40, 40];
        if (u > 0.76 && Math.abs(dyh) < 0.05) return [240, 170, 30];
        if (dxh > 0.02 && dyh < 0 && dxh * dxh + dyh * dyh < 0.012) return [20, 20, 20];
        return [236, 232, 220];
      }
      if (cx * cx * 2.6 + (v - 0.56) * (v - 0.56) * 3.2 < 0.55 && v > 0.34) return [232, 226, 210];
      return null;
    }
    case 'vaca': {
      if (v > 0.80 && v < 0.98 && (Math.abs(cx - 0.22) < 0.06 || Math.abs(cx + 0.22) < 0.06)) return [40, 30, 28];
      if (cx * cx * 1.6 + (v - 0.56) * (v - 0.56) * 3.4 < 0.60 && v > 0.32 && v < 0.86) {
        return hash2(Math.floor(u * 9), Math.floor(v * 9)) > 0.55 ? [60, 44, 38] : [236, 232, 228];
      }
      const dxh = u - 0.16;
      const dyh = v - 0.52;
      if (dxh * dxh * 5 + dyh * dyh * 6 < 0.40) return [70, 52, 46];
      return null;
    }
    case 'girasol': {
      if (v > 0.50 && Math.abs(cx) < 0.05) return [60, 110, 40];
      if (v > 0.58 && v < 0.72 && Math.abs(cx) > 0.05 && Math.abs(cx) < 0.28) return [70, 128, 52];
      const dx = u - 0.5;
      const dy = v - 0.30;
      const rd = Math.sqrt(dx * dx + dy * dy);
      if (rd < 0.13) return [90, 56, 20];
      if (rd < 0.27) return frac(Math.atan2(dy, dx) / (Math.PI / 6)) < 0.6 ? [245, 200, 40] : [228, 174, 28];
      return null;
    }
    case 'abono': {
      const top = 0.45 + 0.18 * Math.cos(cx * 3.1);
      if (v < top || Math.abs(cx) > 0.45) {
        if (v < top && v > top - 0.18 && hash2(Math.floor(u * 20), Math.floor(v * 20) + 1) > 0.92) return [212, 212, 206];
        return null;
      }
      const n = hash2(Math.floor(u * 16), Math.floor(v * 16));
      if (n < 0.30) return [46, 32, 18];
      if (n > 0.85) return [96, 70, 40];
      return [70, 50, 28];
    }
    default:
      return null;
  }
}

/** Dimensiones del billboard por tipo (alto/ancho en multiplos de size, hover). */
const PLAGA_DIM = {
  oruga: { hf: 0.70, wf: 1.05, hover: 0.16 },
  mosca: { hf: 0.62, wf: 0.70, hover: 0.55 },
  afido: { hf: 0.72, wf: 0.85, hover: 0.10 },
  escarabajo: { hf: 0.60, wf: 0.72, hover: 0.08 },
  acaro: { hf: 0.66, wf: 0.66, hover: 0.10 },
};
const DECO_DIM = {
  arbol: { hf: 2.40, wf: 1.60, hover: 0 },
  colmena: { hf: 1.00, wf: 0.85, hover: 0 },
  gallina: { hf: 0.55, wf: 0.60, hover: 0 },
  vaca: { hf: 0.95, wf: 1.55, hover: 0 },
  girasol: { hf: 1.55, wf: 0.70, hover: 0 },
  abono: { hf: 0.55, wf: 1.15, hover: 0 },
};

/**
 * DoomFincaScreen - nivel Doom / Wolfenstein 3D agroecologico en primera
 * persona, reescrito para que las plagas sean RECONOCIBLES (sprites claros +
 * etiqueta con nombre comun y cientifico), con controles tactiles decentes,
 * onboarding, fichas educativas reales (control biologico del grafo de Chagra)
 * y un recap de lo aprendido.
 *
 * @param {{ onBack: Function, onHome: Function }} props
 */
export default function DoomFincaScreen({ onBack, onHome }) {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  // PIEL POR TEMA del cielo del raycaster (Fase 2 de temas). Con la flag ON, el
  // cielo/cordillera/sol se retiñen al tema activo (la tierra/jugabilidad NO);
  // con OFF queda la PALETA base (EXACTO como hoy). Se lee en el hot-loop vía
  // ref para no re-suscribir el rAF al cambiar de tema.
  const paletaRef = useRef(
    fincaVivaHomePerfilActivo() ? paletaPorTema(temaActivoDom()) : PALETA,
  );
  useEffect(() => {
    if (!fincaVivaHomePerfilActivo()) { paletaRef.current = PALETA; return undefined; }
    const sync = () => { paletaRef.current = paletaPorTema(temaActivoDom()); };
    sync();
    // El tema se escribe en <html data-theme>; observamos ese atributo para
    // repintar el cielo si el usuario cambia de tema con el Doom abierto.
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  const inputRef = useRef({
    forward: false, backward: false, left: false, right: false,
    strafeLeft: false, strafeRight: false, fire: false, mouseDown: false,
    // FEEL gated (dev-only): balance más amable (daño + combo). Con la flag OFF
    // el motor recibe feelOn=false → BALANCE EXACTO como hoy en producción.
    feelOn: fincaVivaHomePerfilActivo(),
  });
  const touchRef = useRef({
    joystickActive: false, joystickId: null, joystickX: 0, joystickY: 0,
    joystickOX: 0, joystickOY: 0, lookActive: false, lookId: null, lastLookX: 0,
  });

  const [fase, setFase] = useState('intro'); // intro | jugando | ronda | gano | perdio
  const [vitalidad, setVitalidad] = useState(CONFIG_DOOM.vitalidadInicial);
  const [beneficoSel, setBeneficoSel] = useState(ESCENARIOS[0].beneficosSugeridos[0]);
  const [plagasRestantes, setPlagasRestantes] = useState(ESCENARIOS[0].plagas.length);
  const [puntaje, setPuntaje] = useState(0);
  const [combo, setCombo] = useState(0);
  const [rondaIdx, setRondaIdx] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [mensajeTipo, setMensajeTipo] = useState('info');
  const [ficha, setFicha] = useState(null);
  const [objetivo, setObjetivo] = useState(null); // plaga apuntada (etiqueta HUD)
  const [aprendido, setAprendido] = useState([]);
  const [leccion, setLeccion] = useState('');
  const leccionRef = useRef('');
  const objetivoRef = useRef(null);

  const soundOn = useRef(isSoundEnabled());
  const beep = useCallback((kind) => {
    if (!soundOn.current) return;
    try {
      if (kind === 'acierto') agentSounds.acierto?.();
      else if (kind === 'fallo') agentSounds.fallo?.();
      else if (kind === 'seleccion') agentSounds.seleccion?.();
      else if (kind === 'victoria') agentSounds.victoria?.();
      else if (kind === 'derrota') agentSounds.derrota?.();
      else if (kind === 'fire') agentSounds.start?.();
    } catch { /* sonido opcional */ }
  }, []);

  const beneficoSelRef = useRef(beneficoSel);
  useEffect(() => { beneficoSelRef.current = beneficoSel; }, [beneficoSel]);
  const faseRef = useRef(fase);
  useEffect(() => { faseRef.current = fase; }, [fase]);

  // Inicializa el mundo
  useEffect(() => { worldRef.current = createWorld(); }, []);

  // Telemetría de uso ANÓNIMA: inicio del juego al montar (una vez).
  useEffect(() => { recordGameStart('doom_finca'); }, []);
  // Completado: cuando la fase llega a 'gano' (una sola vez).
  const completadoRef = useRef(false);
  useEffect(() => {
    if (fase === 'gano' && !completadoRef.current) {
      completadoRef.current = true;
      recordGameComplete('doom_finca');
    }
  }, [fase]);

  // Keyboard controls
  useEffect(() => {
    const down = (e) => {
      const inp = inputRef.current;
      switch (e.key) {
        case 'w': case 'ArrowUp': inp.forward = true; e.preventDefault(); break;
        case 's': case 'ArrowDown': inp.backward = true; e.preventDefault(); break;
        case 'a': inp.left = true; break;
        case 'd': inp.right = true; break;
        case 'q': inp.strafeLeft = true; break;
        case 'e': inp.strafeRight = true; break;
        case ' ': case 'f': inp.fire = true; e.preventDefault(); break;
        case '1': case '2': case '3': case '4': case '5': {
          const idx = Number(e.key) - 1;
          if (BENEFICOS_DOOM[idx]) {
            setBeneficoSel(BENEFICOS_DOOM[idx].id);
            worldRef.current = cambiarBenefico(worldRef.current, BENEFICOS_DOOM[idx].id);
            beep('seleccion');
          }
          break;
        }
        default: break;
      }
    };
    const up = (e) => {
      const inp = inputRef.current;
      switch (e.key) {
        case 'w': case 'ArrowUp': inp.forward = false; break;
        case 's': case 'ArrowDown': inp.backward = false; break;
        case 'a': inp.left = false; break;
        case 'd': inp.right = false; break;
        case 'q': inp.strafeLeft = false; break;
        case 'e': inp.strafeRight = false; break;
        case ' ': case 'f': inp.fire = false; break;
        default: break;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [beep]);

  // Mouse look (desktop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onMouseDown = (e) => {
      if (e.button === 0) { inputRef.current.mouseDown = true; inputRef.current.fire = true; }
    };
    const onMouseUp = (e) => {
      if (e.button === 0) { inputRef.current.mouseDown = false; inputRef.current.fire = false; }
    };
    const onMouseMove = (e) => {
      if (!document.pointerLockElement) return;
      const w = worldRef.current;
      if (!w || w.terminado) return;
      w.player = { ...w.player, angulo: w.player.angulo + e.movementX * 0.004 };
    };
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('click', () => {
      if (faseRef.current === 'jugando') canvas.requestPointerLock?.();
    });
    document.addEventListener('mousemove', onMouseMove);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.exitPointerLock?.();
    };
  }, []);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;

    // Pose del jugador expuesta solo para pruebas (dev o ?e2e en la URL).
    const e2eHook = (import.meta.env?.DEV)
      || (typeof window !== 'undefined' && window.location.search.includes('e2e'));

    let raf = 0;
    let running = true;
    let lastTick = 0;
    const TICK_MS = 16;

    const step = (timestamp) => {
      if (!running) return;
      raf = requestAnimationFrame(step);

      let w = worldRef.current;
      if (!w) return;

      const activo = faseRef.current === 'jugando';

      const delta = timestamp - lastTick;
      if (delta >= TICK_MS) {
        lastTick = timestamp - (delta % TICK_MS);

        if (activo) {
          const tj = touchRef.current;
          if (tj.joystickActive) {
            const inp = inputRef.current;
            const dz = 8;
            inp.forward = tj.joystickY < -dz;
            inp.backward = tj.joystickY > dz;
            inp.strafeLeft = tj.joystickX < -dz;
            inp.strafeRight = tj.joystickX > dz;
          }

          const prevFichaTimer = w.fichaTimer;
          const prevErrores = w.errores;
          w = tickWorld(w, inputRef.current);
          worldRef.current = w;

          if (w.fichaTimer > prevFichaTimer && w.ficha) beep('acierto');
          if (w.errores > prevErrores) beep('fallo');

          // Hook E2E (solo dev o ?e2e): expone la pose del jugador para que las
          // pruebas tactiles verifiquen movimiento REAL (no animacion de plagas).
          if (e2eHook) {
            // @ts-ignore e2e debug hook
            window.__doomPlayer = { x: w.player.x, y: w.player.y, angulo: w.player.angulo, t: w.t };
          }

          setVitalidad((p) => (p !== Math.round(w.vitalidad) ? Math.round(w.vitalidad) : p));
          setPlagasRestantes((p) => (p !== w.plagasRestantes ? w.plagasRestantes : p));
          setPuntaje((p) => (p !== w.puntaje ? w.puntaje : p));
          setCombo((p) => (p !== w.combo ? w.combo : p));
          setMensaje((p) => (p !== w.mensaje ? w.mensaje : p));
          setMensajeTipo((p) => (p !== w.mensajeTipo ? w.mensajeTipo : p));
          setFicha((p) => (p !== w.ficha ? w.ficha : p));
          setAprendido((p) => (p.length !== w.aprendido.length ? w.aprendido : p));

          if (w.rondaTransicion) {
            setRondaIdx(w.rondaIdx);
            setFase('ronda');
          }
          if (w.terminado) {
            const nuevo = w.ganado ? 'gano' : 'perdio';
            setFase(nuevo);
            beep(w.ganado ? 'victoria' : 'derrota');
          }
        }
      }

      // ── RENDER ──────────────────────────────────────────────────
      const p = w.player;
      const px = p.x;
      const py = p.y;
      const pa = p.angulo;
      const halfH = H / 2;
      const fovHalf = FOV / 2;

      const zBuffer = new Float64Array(W);
      const horizon = halfH;
      // Paleta del cielo según el tema activo (Fase 2). La tierra/surco/pasto/
      // mulch salen igual de esta paleta — con la flag OFF es la PALETA base.
      const pal = paletaRef.current || PALETA;
      const sky0 = pal.cieloAlto;
      const sky1 = pal.cieloBajo;
      const mtn = pal.montana;
      const mtnS = pal.montanaSombra;
      const sunC = pal.sol;
      const sunG = pal.solBrillo;
      const nube = pal.nube;
      const tierra = pal.tierra;
      const surco = pal.tierraSurco;
      const pasto = pal.pasto;
      const mulch = pal.mulch;

      for (let col = 0; col < W; col += 1) {
        const rayAngle = pa - fovHalf + (col / W) * FOV;
        const rcos = Math.cos(rayAngle);
        const rsin = Math.sin(rayAngle);
        const result = castRay(MAPA, px, py, rayAngle);

        const corrDist = result.dist * Math.cos(rayAngle - pa);
        zBuffer[col] = corrDist;

        const wallHf = H / corrDist;
        const trueTop = halfH - wallHf / 2;
        const wallTop = Math.max(0, Math.round(trueTop));
        const wallBot = Math.min(H - 1, Math.round(halfH + wallHf / 2));

        const mat = MATERIALES[result.tipo] || MATERIALES[1];
        const baseRGB = hexRGB(mat.base);
        const sombraRGB = hexRGB(mat.sombra);
        const luzRGB = hexRGB(mat.luz);

        const fog = Math.max(0, Math.min(1, (corrDist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
        const light = Math.max(0.45, 1.0 - corrDist * 0.04);
        const faceDim = result.cara <= 1 ? 0.78 : 1.0;
        const shade = light * faceDim;

        const ridge = (
          (Math.sin(rayAngle * 1.3) * 0.5 + 0.5) * 0.6 +
          (Math.sin(rayAngle * 2.7 + 1.5) * 0.5 + 0.5) * 0.3 +
          (Math.sin(rayAngle * 5.1 + 4.0) * 0.5 + 0.5) * 0.1
        ) * (horizon * 0.34);
        const dSun = Math.abs(angDiff(rayAngle, PALETA.solAzimut));

        for (let row = 0; row < H; row += 1) {
          const idx = (row * W + col) * 4;
          if (row < wallTop) {
            const t = row / horizon;
            let cr = sky0[0] + (sky1[0] - sky0[0]) * t;
            let cg = sky0[1] + (sky1[1] - sky0[1]) * t;
            let cb = sky0[2] + (sky1[2] - sky0[2]) * t;
            const sunRow = horizon * 0.42;
            const dvSun = Math.abs(row - sunRow) / horizon;
            const sunDist = Math.sqrt(dSun * dSun * 6 + dvSun * dvSun * 9);
            if (sunDist < 0.18) { cr = sunC[0]; cg = sunC[1]; cb = sunC[2]; }
            else if (sunDist < 0.6) {
              const gg = ((0.6 - sunDist) / 0.42) * 0.7;
              cr += (sunG[0] - cr) * gg; cg += (sunG[1] - cg) * gg; cb += (sunG[2] - cb) * gg;
            }
            if (t < 0.7) {
              const cloud = hash2(Math.floor(rayAngle * 26), Math.floor(row / 3)) * 0.5
                          + hash2(Math.floor(rayAngle * 13) + 7, Math.floor(row / 5)) * 0.5;
              if (cloud > 0.82) {
                const cf = ((cloud - 0.82) / 0.18) * 0.8;
                cr += (nube[0] - cr) * cf; cg += (nube[1] - cg) * cf; cb += (nube[2] - cb) * cf;
              }
            }
            if (row > horizon - ridge && row < horizon) {
              const nieve = (row - (horizon - ridge)) / (ridge + 0.001) < 0.25;
              const mc = nieve ? [230, 236, 244]
                : ((Math.floor(rayAngle * 8) % 2 === 0) ? mtn : mtnS);
              cr = mc[0] * 0.7 + cr * 0.3; cg = mc[1] * 0.7 + cg * 0.3; cb = mc[2] * 0.7 + cb * 0.3;
            }
            buf[idx] = cr; buf[idx + 1] = cg; buf[idx + 2] = cb; buf[idx + 3] = 255;
          } else if (row <= wallBot) {
            const vY = wallHf > 0.001 ? (row - trueTop) / wallHf : 0;
            const wcol = texturaPared(mat.patron, result.texX, vY, baseRGB, sombraRGB, luzRGB);
            const pr = wcol[0] * shade;
            const pg = wcol[1] * shade;
            const pb = wcol[2] * shade;
            buf[idx] = pr + (sky1[0] - pr) * fog;
            buf[idx + 1] = pg + (sky1[1] - pg) * fog;
            buf[idx + 2] = pb + (sky1[2] - pb) * fog;
            buf[idx + 3] = 255;
          } else {
            const floorDist = halfH / (row - halfH + 0.001);
            const fx = px + rcos * floorDist;
            const fy = py + rsin * floorDist;
            const ffog = Math.max(0, Math.min(1, (floorDist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
            const fl = Math.max(0.45, 1.0 - floorDist * 0.04);
            let fbase = tierra;
            if (frac(fy * 2.2) < 0.16) fbase = surco;
            const patch = hash2(Math.floor(fx * 1.6), Math.floor(fy * 1.6));
            if (patch > 0.86) fbase = pasto;
            else if (patch < 0.10) fbase = mulch;
            const grain = 0.88 + hash2(Math.floor(fx * 8), Math.floor(fy * 8)) * 0.18;
            const fr = fbase[0] * fl * grain;
            const fg = fbase[1] * fl * grain;
            const fb = fbase[2] * fl * grain;
            buf[idx] = fr + (sky1[0] - fr) * ffog;
            buf[idx + 1] = fg + (sky1[1] - fg) * ffog;
            buf[idx + 2] = fb + (sky1[2] - fb) * ffog;
            buf[idx + 3] = 255;
          }
        }
      }

      // ── BILLBOARDS: plagas + decoracion ──
      const billboards = [];
      for (const pest of w.pests) {
        if (!pest.vivo) continue;
        const proj = projectSprite(pest.x, pest.y, px, py, pa, FOV, W, H);
        if (proj.visible) {
          billboards.push({
            kind: 'plaga', forma: pest.forma, color: pest.color, proj,
            flashAcierto: pest.flashAcierto, flashEquivocado: pest.flashEquivocado,
            controladoPor: pest.controladoPor,
          });
        }
      }
      for (const deco of DECORACIONES) {
        const proj = projectSprite(deco.x, deco.y, px, py, pa, FOV, W, H);
        if (proj.visible) billboards.push({ kind: 'deco', tipo: deco.tipo, proj });
      }
      billboards.sort((a, b) => b.proj.dist - a.proj.dist);

      const plagaRects = [];

      for (const bb of billboards) {
        const { screenX, size, dist } = bb.proj;
        const dim = bb.kind === 'plaga'
          ? (PLAGA_DIM[bb.forma] || PLAGA_DIM.oruga)
          : (DECO_DIM[bb.tipo] || DECO_DIM.arbol);
        const spriteH = size * dim.hf;
        const spriteW = size * dim.wf;
        const floorRow = halfH + halfH / Math.max(dist, 0.3);
        const bottom = Math.round(floorRow - dim.hover * size);
        const top = Math.round(bottom - spriteH);
        const left = Math.round(screenX - spriteW / 2);
        const right = Math.round(screenX + spriteW / 2);

        const fogF = Math.max(0, Math.min(1, (dist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
        const sLight = Math.max(0.55, 1.0 - dist * 0.035);
        const baseRGB = bb.kind === 'plaga' ? hexRGB(bb.color) : null;
        const flashA = bb.kind === 'plaga' ? (bb.flashAcierto || 0) / 14 : 0;
        const flashE = bb.kind === 'plaga' ? (bb.flashEquivocado || 0) / 18 : 0;

        for (let row = top; row <= bottom; row += 1) {
          if (row < 0 || row >= H) continue;
          const v = (row - top) / Math.max(1, spriteH);
          for (let c = left; c <= right; c += 1) {
            if (c < 0 || c >= W) continue;
            if (zBuffer[c] < dist) continue;
            const u = (c - left) / Math.max(1, spriteW);
            const pix = bb.kind === 'plaga'
              ? pintarPlaga(bb.forma, u, v, baseRGB)
              : pintarDeco(bb.tipo, u, v);
            if (!pix) continue;
            const idx = (row * W + c) * 4;
            let pr = pix[0] * sLight;
            let pg = pix[1] * sLight;
            let pb = pix[2] * sLight;
            if (flashA > 0) { pr += (120 - pr) * flashA; pg += (255 - pg) * flashA; pb += (120 - pb) * flashA; }
            if (flashE > 0) { pr += (255 - pr) * flashE; pg += (60 - pg) * flashE; pb += (60 - pb) * flashE; }
            buf[idx] = pr + (sky1[0] - pr) * fogF;
            buf[idx + 1] = pg + (sky1[1] - pg) * fogF;
            buf[idx + 2] = pb + (sky1[2] - pb) * fogF;
            buf[idx + 3] = 255;
          }
        }

        if (bb.kind === 'plaga') {
          plagaRects.push({
            screenX, top, dist,
            correcto: bb.controladoPor === beneficoSelRef.current,
          });
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // ── Marcador de color sobre cada plaga cercana (verde/rojo) ──
      for (const r of plagaRects) {
        if (r.dist > 9) continue;
        const sx = r.screenX;
        const sy = Math.max(6, r.top - 4);
        ctx.fillStyle = r.correcto ? 'rgba(120,255,140,0.95)' : 'rgba(255,120,120,0.95)';
        ctx.beginPath();
        ctx.moveTo(sx, sy + 5);
        ctx.lineTo(sx - 3.5, sy);
        ctx.lineTo(sx + 3.5, sy);
        ctx.closePath();
        ctx.fill();
      }

      // ── VIEWMODEL: manos del campesino con el frasco del benefico ──
      const bSel = BENEFICOS_DOOM.find((b) => b.id === beneficoSelRef.current) || BENEFICOS_DOOM[0];
      const bob = Math.sin(w.t * 0.12) * 1.6;
      const recoil = w.cooldown > 0 ? (w.cooldown / CONFIG_DOOM.cooldownLanzamiento) * 7 : 0;
      const baseY = H - 2 + recoil + bob;
      ctx.fillStyle = '#3f6d34';
      ctx.beginPath();
      ctx.moveTo(W * 0.26, H);
      ctx.lineTo(W * 0.42, baseY - 16);
      ctx.lineTo(W * 0.58, baseY - 16);
      ctx.lineTo(W * 0.74, H);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#caa074';
      ctx.fillRect(W / 2 - 16, baseY - 18, 10, 9);
      ctx.fillRect(W / 2 + 6, baseY - 18, 10, 9);
      ctx.fillStyle = bSel.color;
      ctx.fillRect(W / 2 - 11, baseY - 28, 22, 18);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(W / 2 - 9, baseY - 26, 5, 14);
      ctx.fillStyle = '#5c4327';
      ctx.fillRect(W / 2 - 8, baseY - 32, 16, 5);
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bSel.emoji, W / 2, baseY - 18);

      // Mira central: verde = correcto, ambar = equivocado, blanco = sin objetivo
      const aim = plagaObjetivo(w.player, beneficoSelRef.current, w.pests, CONFIG_DOOM.alcanceLanzamiento);
      const miraColor = aim.plaga
        ? (aim.correcto ? 'rgba(130,255,130,0.98)' : 'rgba(255,180,70,0.98)')
        : 'rgba(255,255,255,0.7)';
      const ringR = aim.plaga ? 6 : 4;
      ctx.strokeStyle = miraColor;
      ctx.lineWidth = aim.plaga ? 1.4 : 1;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(W / 2 - 9, H / 2); ctx.lineTo(W / 2 - ringR - 1, H / 2);
      ctx.moveTo(W / 2 + ringR + 1, H / 2); ctx.lineTo(W / 2 + 9, H / 2);
      ctx.moveTo(W / 2, H / 2 - 9); ctx.lineTo(W / 2, H / 2 - ringR - 1);
      ctx.moveTo(W / 2, H / 2 + ringR + 1); ctx.lineTo(W / 2, H / 2 + 9);
      ctx.stroke();

      // Objetivo apuntado -> etiqueta de identificacion (estado React HUD)
      const nuevoObj = aim.plaga
        ? { nombre: aim.plaga.nombre, cientifico: aim.plaga.cientifico,
          cultivo: aim.plaga.cultivo, correcto: aim.correcto,
          controladoPor: aim.plaga.controladoPor }
        : null;
      const objKey = nuevoObj ? `${nuevoObj.nombre}|${nuevoObj.correcto}` : '';
      const prevKey = objetivoRef.current
        ? `${objetivoRef.current.nombre}|${objetivoRef.current.correcto}` : '';
      if (objKey !== prevKey) {
        objetivoRef.current = nuevoObj;
        setObjetivo(nuevoObj);
      }

      // Leccion de la decoracion mirada
      const deco = decoracionEnMira(w.player, DECORACIONES);
      const nuevaLeccion = deco ? deco.leccion : '';
      if (nuevaLeccion !== leccionRef.current) {
        leccionRef.current = nuevaLeccion;
        setLeccion(nuevaLeccion);
      }
    };

    lastTick = performance.now();
    raf = requestAnimationFrame(step);
    return () => { running = false; cancelAnimationFrame(raf); };
  }, [beep]);

  // ── Controles de flujo (intro / ronda / reiniciar) ──
  const empezar = useCallback(() => { setFase('jugando'); }, []);

  const siguienteRonda = useCallback(() => {
    worldRef.current = avanzarRonda(worldRef.current);
    const w = worldRef.current;
    setRondaIdx(w.rondaIdx);
    setBeneficoSel(w.beneficoEquipado);
    setPlagasRestantes(w.plagasRestantes);
    setVitalidad(Math.round(w.vitalidad));
    setCombo(0);
    setMensaje('');
    setFicha(null);
    if (w.terminado) { setFase('gano'); beep('victoria'); }
    else setFase('jugando');
  }, [beep]);

  const reiniciar = useCallback(() => {
    worldRef.current = createWorld();
    const w = worldRef.current;
    setVitalidad(CONFIG_DOOM.vitalidadInicial);
    setPlagasRestantes(ESCENARIOS[0].plagas.length);
    setBeneficoSel(w.beneficoEquipado);
    setPuntaje(0);
    setCombo(0);
    setRondaIdx(0);
    setMensaje('');
    setFicha(null);
    setObjetivo(null);
    objetivoRef.current = null;
    setAprendido([]);
    setLeccion('');
    leccionRef.current = '';
    setFase('intro');
  }, []);

  // ── Touch: dos zonas (mover izquierda / mirar derecha) + boton lanzar ──
  //
  // FIX movil (operador, telefono real): los controles tactiles NO movian al
  // jugador. Causa raiz: los handlers se cableaban como props JSX
  // (onTouchStart/Move/End), que React adjunta como listeners PASIVOS. En un
  // passive listener `preventDefault()` se ignora, asi que el navegador robaba
  // el gesto (scroll / pull-to-refresh) y el arrastre del joystick no llegaba.
  // Solucion: adjuntar listeners NATIVOS con { passive:false } y llamar
  // e.preventDefault() para que el dedo controle el juego, no el scroll.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onStart = (e) => {
      if (faseRef.current !== 'jugando') return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tj = touchRef.current;
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        const relX = (t.clientX - rect.left) / rect.width;
        if (relX < 0.5 && !tj.joystickActive) {
          tj.joystickActive = true;
          tj.joystickId = t.identifier;
          tj.joystickOX = t.clientX;
          tj.joystickOY = t.clientY;
          tj.joystickX = 0;
          tj.joystickY = 0;
        } else if (!tj.lookActive) {
          tj.lookActive = true;
          tj.lookId = t.identifier;
          tj.lastLookX = t.clientX;
        }
      }
    };

    const onMove = (e) => {
      const tj = touchRef.current;
      if (!tj.joystickActive && !tj.lookActive) return;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (t.identifier === tj.joystickId && tj.joystickActive) {
          tj.joystickX = t.clientX - tj.joystickOX;
          tj.joystickY = t.clientY - tj.joystickOY;
          const mag = Math.sqrt(tj.joystickX ** 2 + tj.joystickY ** 2);
          const cap = 48;
          if (mag > cap) { tj.joystickX = (tj.joystickX / mag) * cap; tj.joystickY = (tj.joystickY / mag) * cap; }
        }
        if (t.identifier === tj.lookId && tj.lookActive) {
          const delta = t.clientX - tj.lastLookX;
          const w = worldRef.current;
          if (w && !w.terminado) {
            w.player = { ...w.player, angulo: w.player.angulo + delta * CONFIG_DOOM.velRotacionTouch };
          }
          tj.lastLookX = t.clientX;
        }
      }
    };

    const onEnd = (e) => {
      const tj = touchRef.current;
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const t = e.changedTouches[i];
        if (t.identifier === tj.joystickId) {
          tj.joystickActive = false; tj.joystickId = null; tj.joystickX = 0; tj.joystickY = 0;
          inputRef.current.forward = false; inputRef.current.backward = false;
          inputRef.current.strafeLeft = false; inputRef.current.strafeRight = false;
        }
        if (t.identifier === tj.lookId) { tj.lookActive = false; tj.lookId = null; }
      }
      if (e.touches.length === 0) {
        inputRef.current.forward = false; inputRef.current.backward = false;
        inputRef.current.strafeLeft = false; inputRef.current.strafeRight = false;
      }
    };

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd, { passive: false });
    canvas.addEventListener('touchcancel', onEnd, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('touchcancel', onEnd);
    };
  }, []);

  const dispararTouch = useCallback(() => {
    if (faseRef.current !== 'jugando') return;
    inputRef.current.fire = true;
    beep('fire');
    setTimeout(() => { inputRef.current.fire = false; }, 90);
  }, [beep]);

  const vitalidadPct = Math.round((vitalidad / CONFIG_DOOM.vitalidadMax) * 100);
  const escenarioActual = ESCENARIOS[rondaIdx] || ESCENARIOS[0];
  const sugeridos = escenarioActual.beneficosSugeridos;
  // En la transicion ('ronda') el rondaIdx todavia apunta a la ronda ya
  // completada; mostramos el preview de la SIGUIENTE ronda.
  const escenarioPreview = ESCENARIOS[rondaIdx + 1] || escenarioActual;
  const escIntro = fase === 'ronda' ? escenarioPreview : escenarioActual;
  const numRondaIntro = fase === 'ronda' ? rondaIdx + 2 : rondaIdx + 1;

  return (
    <ScreenShell title="Doom de la Finca" icon={Crosshair} onBack={onBack} onHome={onHome}>
      {/*
        FIX movil (operador, telefono real): antes el canvas tenia aspect-ratio
        fijo 4:3 y el contenido se apilaba con `pb-6`, dejando ~40% de la
        pantalla en negro abajo. Ahora el juego es una columna flex de altura
        completa: HUD + vitalidad arriba (shrink-0), el lienzo crece para llenar
        el alto disponible (flex-1, canvas absolute inset-0) y la barra inferior
        (selector + ayuda) queda fija abajo. El -mb compensa el padding-bottom
        que ScreenShell reserva para los FAB de otras pantallas (aqui sobra).
      */}
      <div className={fvhSkinClass('jp-ambiente flex flex-col gap-2 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] w-full max-w-lg mx-auto h-full min-h-0 -mb-[max(env(safe-area-inset-bottom),0px)_+_120px]')}>

        {/* ── HUD superior: ronda, plagas, puntaje, combo ── */}
        <div className="jp-doom-hud flex items-center justify-between gap-2 text-xs font-bold shrink-0">
          <span className="flex items-center gap-1 text-emerald-200 whitespace-nowrap">
            <span aria-hidden="true">{escenarioActual.icono}</span>
            <span>Ronda {rondaIdx + 1}/{ESCENARIOS.length}</span>
          </span>
          <span className="flex items-center gap-1 text-amber-300 whitespace-nowrap" aria-label={`${plagasRestantes} plagas restantes`}>
            <Bug size={13} aria-hidden="true" />{plagasRestantes}
          </span>
          <span className="flex items-center gap-1 text-lime-300 whitespace-nowrap" aria-label={`Puntaje ${puntaje}`}>
            <Trophy size={13} aria-hidden="true" />{puntaje}
          </span>
          {combo > 1 && (
            <span className="flex items-center gap-0.5 text-orange-300 whitespace-nowrap" aria-label={`Combo ${combo}`}>
              <Zap size={13} aria-hidden="true" />x{combo}
            </span>
          )}
        </div>

        {/* Barra de vitalidad */}
        <div className="jp-doom-vital flex items-center gap-2 text-xs font-bold shrink-0">
          <Heart size={13} className="text-emerald-300" aria-hidden="true" />
          <div className="jp-doom-vital-riel flex-1 h-3.5 bg-slate-800/60 rounded-full overflow-hidden border border-emerald-900/40">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-300"
              style={{ width: `${vitalidadPct}%` }}
            />
          </div>
          <span className="text-white w-9 text-right" aria-label={`Vitalidad ${vitalidadPct}%`}>{vitalidadPct}%</span>
        </div>

        {/* ── Canvas del juego (crece para llenar el alto disponible) ── */}
        <div className="jp-doom-lienzo relative flex-1 min-h-0 rounded-xl overflow-hidden border-2 border-emerald-700/50 bg-black shadow-lg shadow-emerald-900/30">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 w-full h-full block cursor-crosshair touch-none select-none"
            style={{ imageRendering: 'pixelated' }}
            role="img"
            aria-label="Vista en primera persona de la finca. Arrastra el lado izquierdo para moverte, el derecho para girar, y toca Soltar para aplicar el benefico."
          />

          {/* Etiqueta de identificacion del objetivo apuntado */}
          {fase === 'jugando' && objetivo && (
            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-center pointer-events-none border"
              style={{
                backgroundColor: objetivo.correcto ? 'rgba(6,78,59,0.92)' : 'rgba(67,20,7,0.92)',
                borderColor: objetivo.correcto ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)',
              }}
              role="status"
            >
              <div className="flex items-center justify-center gap-1.5">
                <Target size={12} className={objetivo.correcto ? 'text-emerald-300' : 'text-red-300'} aria-hidden="true" />
                <span className="text-sm font-black text-white leading-none">{objetivo.nombre}</span>
              </div>
              <div className="text-2xs italic text-white/70 leading-tight">{objetivo.cientifico}</div>
              <div
                className="text-2xs font-bold leading-tight mt-0.5"
                style={{ color: objetivo.correcto ? '#6ee7b7' : '#fca5a5' }}
              >
                {objetivo.correcto ? 'Benefico correcto: ¡suelta!' : 'Benefico equivocado'}
              </div>
            </div>
          )}

          {/* ── Onboarding / intro de ronda ── */}
          {(fase === 'intro' || fase === 'ronda') && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <span className="text-4xl" aria-hidden="true">{escIntro.icono}</span>
              <h3 className="text-lg font-black text-white">
                {fase === 'intro' ? 'Defiende tu finca con control biologico' : `Ronda ${numRondaIntro}: ${escIntro.nombre}`}
              </h3>
              <p className="text-xs text-emerald-100/90 max-w-xs leading-relaxed">
                {fase === 'intro'
                  ? 'Recorre la finca, identifica cada plaga (nombre y especie) y sueltale su enemigo natural correcto. Cada acierto te explica el por que. Las plagas reducen la vitalidad del cultivo: actua rapido.'
                  : escIntro.intro}
              </p>
              {fase === 'intro' && (
                <ul className="text-2xs text-emerald-200/80 text-left space-y-1 max-w-xs">
                  <li><b>Mover:</b> arrastra el lado izquierdo (o WASD).</li>
                  <li><b>Girar:</b> arrastra el lado derecho (o el raton).</li>
                  <li><b>Soltar benefico:</b> boton inferior derecho (o barra/F).</li>
                  <li><b>Mira verde</b> = benefico correcto · <b>ambar</b> = equivocado.</li>
                </ul>
              )}
              <button
                type="button"
                onClick={fase === 'intro' ? empezar : siguienteRonda}
                className="min-h-[52px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-base flex items-center gap-2"
              >
                <Play size={20} aria-hidden="true" />
                {fase === 'intro' ? 'Empezar' : 'Siguiente ronda'}
              </button>
            </div>
          )}

          {/* ── Ficha educativa al controlar bien una plaga ── */}
          {fase === 'jugando' && ficha && (
            <div
              className="jp-doom-ficha absolute inset-x-2 bottom-2 bg-emerald-950/95 border-2 border-emerald-400/60 rounded-xl p-3 shadow-xl"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="jp-acento-vida flex items-center gap-1 text-emerald-300 font-black text-xs">
                  <GraduationCap size={14} aria-hidden="true" /> ¡Control biologico!
                </span>
                <span className="jp-acento-vida text-lime-300 font-black text-xs">+{ficha.puntos}{ficha.combo > 1 ? ` · combo x${ficha.combo}` : ''}</span>
              </div>
              <p className="jp-tinta text-2xs text-white/90 leading-snug">
                <b className="jp-doom-benefico text-amber-200">{ficha.benefico}</b>
                <span className="jp-tinta-suave text-white/60"> ({ficha.beneficoCientifico})</span>
                <span className="jp-acento-vida text-emerald-300"> controla a </span>
                <b className="jp-doom-plaga text-red-200">{ficha.plaga}</b>
                {ficha.cultivo ? <span className="jp-tinta-suave text-white/70"> en {ficha.cultivo}</span> : null}.
              </p>
              {ficha.dano ? (
                <p className="jp-doom-plaga text-2xs text-red-200/80 leading-snug mt-1">
                  <b className="jp-doom-plaga text-red-300">El dano:</b> {ficha.dano}
                </p>
              ) : null}
              <p className="jp-tinta text-2xs text-emerald-100/90 leading-snug mt-1">
                <b className="jp-acento-vida text-emerald-300">Por que funciona:</b> {ficha.porQue}
              </p>
            </div>
          )}

          {/* ── Mensaje breve (acierto parcial / error / aviso) ── */}
          {fase === 'jugando' && mensaje && !ficha && (
            <div
              className="absolute inset-x-2 bottom-2 rounded-lg p-2 text-center border text-xs font-medium"
              style={{
                backgroundColor: mensajeTipo === 'error' ? 'rgba(67,20,7,0.92)'
                  : mensajeTipo === 'acierto' ? 'rgba(6,78,59,0.92)' : 'rgba(15,23,42,0.9)',
                borderColor: mensajeTipo === 'error' ? 'rgba(248,113,113,0.5)'
                  : mensajeTipo === 'acierto' ? 'rgba(52,211,153,0.5)' : 'rgba(148,163,184,0.3)',
                color: mensajeTipo === 'error' ? '#fecaca' : mensajeTipo === 'acierto' ? '#bbf7d0' : '#e2e8f0',
              }}
              role="status"
              aria-live="polite"
            >
              {mensaje}
            </div>
          )}

          {/* ── Fin de juego (gano / perdio) con RECAP ── */}
          {(fase === 'gano' || fase === 'perdio') && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-start gap-2 p-3 overflow-y-auto">
              <span className="text-4xl mt-1" aria-hidden="true">{fase === 'gano' ? '🌽🎉' : '🥀'}</span>
              <h3 className="text-lg font-black text-white text-center">
                {fase === 'gano' ? '¡Finca sana y productiva!' : 'El cultivo se enfermo'}
              </h3>
              <p className="text-xs text-emerald-100/80 text-center max-w-xs">
                {fase === 'gano'
                  ? `Controlaste las plagas con sus enemigos naturales. Puntaje: ${puntaje}.`
                  : 'La vitalidad llego a cero. Identifica la plaga y suelta su benefico correcto mas rapido.'}
              </p>
              {aprendido.length > 0 && (
                <div className="w-full max-w-xs bg-emerald-950/70 border border-emerald-700/40 rounded-lg p-2">
                  <p className="text-2xs font-black text-emerald-300 mb-1 flex items-center gap-1">
                    <GraduationCap size={12} aria-hidden="true" /> Lo que aprendiste:
                  </p>
                  <ul className="space-y-1.5">
                    {aprendido.map((a) => (
                      <li key={a.par} className="text-2xs text-white/85 leading-snug">
                        <b className="text-red-200">{a.plaga}</b>
                        <span className="text-emerald-400"> → </span>
                        <b className="text-amber-200">{a.benefico}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={reiniciar}
                className="min-h-[50px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-base flex items-center gap-2 mb-2"
              >
                <RotateCcw size={20} aria-hidden="true" /> Jugar otra vez
              </button>
            </div>
          )}

          {/* ── Controles tactiles visibles (solo mientras juega) ── */}
          {fase === 'jugando' && (
            <>
              <div className="absolute bottom-2 left-2 flex flex-col items-center gap-0.5 pointer-events-none opacity-70">
                <div className="w-12 h-12 rounded-full border-2 border-white/40 bg-white/5 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-white/30" />
                </div>
                <span className="text-white/70 text-2xs font-bold">Mover</span>
              </div>
              <div className="absolute bottom-2 right-2 flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={dispararTouch}
                  aria-label="Soltar el benefico equipado"
                  className="w-16 h-16 rounded-full border-2 border-amber-400/70 bg-amber-500/25 active:bg-amber-400/50 active:scale-90 transition flex items-center justify-center"
                >
                  <Shield size={26} className="text-amber-200" aria-hidden="true" />
                </button>
                <span className="text-white/70 text-2xs font-bold pointer-events-none">Soltar</span>
              </div>
            </>
          )}
        </div>

        {/* ── Tarjeta de la decoracion mirada (ciclo de la finca) ── */}
        {fase === 'jugando' && leccion && (
          <div className="jp-doom-leccion bg-amber-950/50 border border-amber-600/40 rounded-xl p-2.5 text-center" role="status">
            <Sprout size={13} className="inline-block mr-1 text-amber-300" aria-hidden="true" />
            <span className="jp-tinta text-xs text-amber-100 font-medium">{leccion}</span>
          </div>
        )}

        {/* ── Selector de beneficos ── */}
        <div className="flex gap-1.5 justify-center flex-wrap" role="group" aria-label="Elige el organismo benefico a soltar">
          {BENEFICOS_DOOM.map((b, i) => {
            const sel = beneficoSel === b.id;
            const recomendado = sugeridos.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBeneficoSel(b.id);
                  worldRef.current = cambiarBenefico(worldRef.current, b.id);
                  beep('seleccion');
                }}
                aria-pressed={sel}
                aria-label={`${b.nombre}. ${b.desc}${recomendado ? ' Recomendado esta ronda.' : ''}`}
                title={`${b.nombre} — ${b.desc}`}
                className="jp-doom-beneficio relative min-h-[54px] w-[60px] px-1 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition active:scale-95"
                style={{
                  borderColor: sel ? b.color : recomendado ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)',
                  backgroundColor: sel ? `${b.color}22` : 'rgba(255,255,255,0.05)',
                }}
              >
                <span className="jp-tinta-suave absolute top-0.5 left-1 text-2xs text-white/40 font-bold">{i + 1}</span>
                <span className="text-lg" aria-hidden="true">{b.emoji}</span>
                <span className="jp-tinta text-2xs font-bold text-white/80 leading-none text-center">{b.nombre.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
        <p className="jp-acento-vida text-2xs text-emerald-400/70 text-center -mt-1">
          Verde = recomendado para esta ronda. Toca para equipar.
        </p>

        {/* ── Controles desktop ── */}
        <div className="jp-tinta-suave text-2xs text-slate-500 text-center leading-relaxed">
          WASD = mover · Q/E = lateral · raton = girar · barra/F = soltar · 1-5 = elegir benefico
        </div>

        {/* ── Referencia: pares plaga-benefico reales (control biologico) ── */}
        <details className="jp-tinta-suave text-2xs text-slate-400">
          <summary className="jp-acento-vida cursor-pointer font-bold text-emerald-400/80">
            Pares plaga → control biologico (datos del grafo de Chagra)
          </summary>
          <ul className="mt-2 space-y-1.5 pl-1">
            {PLAGAS_DOOM.map((plaga) => {
              const benef = BENEFICOS_DOOM.find((b) => b.id === plaga.controladoPor);
              return (
                <li key={plaga.id} className="leading-snug">
                  <span className="flex items-center gap-1 flex-wrap">
                    <span aria-hidden="true">{plaga.emoji}</span>
                    <b className="jp-tinta text-white/85">{plaga.nombre}</b>
                    <span className="jp-tinta-suave text-slate-600 italic">({plaga.cientifico})</span>
                    {plaga.cultivo ? (
                      <span className="jp-tinta-suave text-amber-300/70">en {plaga.cultivo}</span>
                    ) : null}
                    <ChevronRight size={11} className="text-slate-600" aria-hidden="true" />
                    <span aria-hidden="true">{benef?.emoji}</span>
                    <span className="jp-acento-vida text-emerald-300">{benef?.nombre || plaga.controladoPor}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </ScreenShell>
  );
}
