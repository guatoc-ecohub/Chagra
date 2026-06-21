/*
 * i18n: este minijuego se sirve solo en es-CO. La regla chagra-i18n es soft
 * (warn), aqui se desactiva por archivo completo.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScreenShell } from '../common/ScreenShell';
import { Sprout, Bug, Shield, RotateCcw, Crosshair } from 'lucide-react';
import { agentSounds, isSoundEnabled } from '../../services/agentSoundService';
import {
  MAPA, MAPA_COLS, MAPA_FILAS, PALETA, CONFIG_DOOM,
  PLAGAS_DOOM, BENEFICOS_DOOM,
} from './doomFincaData';
import {
  castRay, projectSprite, createWorld,
  tickWorld, cambiarBenefico,
} from '../../services/doomFincaEngine';

const W = CONFIG_DOOM.resX;  // 240
const H = CONFIG_DOOM.resY;  // 180
const FOV = CONFIG_DOOM.fov;
const NIEBLA_INI = CONFIG_DOOM.nieblaInicio;
const NIEBLA_FIN = CONFIG_DOOM.nieblaFin;

/**
 * DoomFincaScreen - nivel Doom / Wolfenstein 3D agroecologico en primera
 * persona. Motor raycaster propio en Canvas 2D. Recorres un invernadero/cultivo,
 * identificas plagas reales y las controlas lanzando el benefico CORRECTO.
 *
 * @param {{ onBack: Function, onHome: Function }} props
 */
export default function DoomFincaScreen({ onBack, onHome }) {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const inputRef = useRef({
    forward: false, backward: false, left: false, right: false,
    strafeLeft: false, strafeRight: false, fire: false,
    mouseDown: false,
  });
  const touchRef = useRef({ joystickActive: false, joystickId: null,
    joystickX: 0, joystickY: 0, lookActive: false, lookId: null, lookX: 0,
    lastLookX: 0 });

  const [vitalidad, setVitalidad] = useState(CONFIG_DOOM.vitalidadInicial);
  const [beneficoSel, setBeneficoSel] = useState('trichogramma');
  const [plagasRestantes, setPlagasRestantes] = useState(
    PLAGAS_DOOM.length,
  );
  const [mensaje, setMensaje] = useState(
    'Elimina todas las plagas. Cada una solo cae con su controlador real.',
  );
  const [estado, setEstado] = useState('jugando'); // jugando | gano | perdio
  const [_frameCount, setFrameCount] = useState(0);

  const soundOn = useRef(isSoundEnabled());
  const beep = useCallback((kind) => {
    if (!soundOn.current) return;
    try {
      if (kind === 'good') agentSounds.chime?.();
      else if (kind === 'hit') agentSounds.error?.();
      else if (kind === 'fire') agentSounds.start?.();
    } catch { /* sonido opcional */ }
  }, []);

  const beneficoSelRef = useRef(beneficoSel);
  useEffect(() => { beneficoSelRef.current = beneficoSel; }, [beneficoSel]);

  // Inicializa el mundo
  useEffect(() => {
    worldRef.current = createWorld();
  }, []);

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
  }, []);

  // Mouse look (desktop)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMouseDown = (e) => {
      if (e.button === 0) {
        inputRef.current.mouseDown = true;
        inputRef.current.fire = true;
      }
    };
    const onMouseUp = (e) => {
      if (e.button === 0) {
        inputRef.current.mouseDown = false;
        inputRef.current.fire = false;
      }
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
      if (estado === 'jugando') canvas.requestPointerLock?.();
    });

    document.addEventListener('mousemove', onMouseMove);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.exitPointerLock?.();
    };
  }, [estado]);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const imageData = ctx.createImageData(W, H);
    const buf = imageData.data;

    let raf = 0;
    let running = true;
    let lastTick = 0;
    const TICK_MS = 16; // ~60fps

    const step = (timestamp) => {
      if (!running) return;
      raf = requestAnimationFrame(step);

      let w = worldRef.current;
      if (!w) return;

      // Tick del mundo a paso fijo
      const delta = timestamp - lastTick;
      if (delta >= TICK_MS) {
        lastTick = timestamp - (delta % TICK_MS);

        // Procesar touch joystick como input
        const tj = touchRef.current;
        if (tj.joystickActive) {
          const inp = inputRef.current;
          const deadZone = 10;
          const jx = tj.joystickX;
          const jy = tj.joystickY;
          inp.forward = jy < -deadZone;
          inp.backward = jy > deadZone;
          inp.strafeLeft = jx < -deadZone;
          inp.strafeRight = jx > deadZone;
        }

        w = tickWorld(w, inputRef.current);
        worldRef.current = w;

        // Actualizar estado React (solo cuando cambia)
        setVitalidad((prev) => prev !== w.vitalidad ? w.vitalidad : prev);
        setPlagasRestantes((prev) => prev !== w.plagasRestantes ? w.plagasRestantes : prev);
        if (w.mensaje) setMensaje((prev) => prev !== w.mensaje ? w.mensaje : prev);
        if (w.terminado) {
          setEstado((prev) => {
            const nuevo = w.ganado ? 'gano' : 'perdio';
            return prev !== nuevo ? nuevo : prev;
          });
          if (w.ganado) beep('good');
        }
      }

      // ── RENDER ──────────────────────────────────────────────────
      const p = w.player;
      const px = p.x;
      const py = p.y;
      const pa = p.angulo;
      const halfH = H / 2;
      const fovHalf = FOV / 2;

      // Pre-calcular rayos y guardar distancias por columna (para sprites)
      const zBuffer = new Float64Array(W);

      for (let col = 0; col < W; col += 1) {
        const rayAngle = pa - fovHalf + (col / W) * FOV;
        const result = castRay(MAPA, px, py, rayAngle);

        // Fish-eye correction
        const corrDist = result.dist * Math.cos(rayAngle - pa);
        zBuffer[col] = corrDist;

        // Altura de la pared en pantalla
        const wallH = Math.round(H / corrDist);
        const wallTop = Math.max(0, Math.round(halfH - wallH / 2));
        const wallBot = Math.min(H - 1, Math.round(halfH + wallH / 2));

        // Color de la pared segun la cara y la distancia
        let baseColor;
        switch (result.cara) {
          case 0: baseColor = PALETA.paredNorte; break;
          case 1: baseColor = PALETA.paredSur; break;
          case 2: baseColor = PALETA.paredEste; break;
          case 3: baseColor = PALETA.paredOeste; break;
          default: baseColor = '#999'; break;
        }

        // Oscurecer por distancia (iluminacion + niebla)
        const fogFactor = Math.max(0, Math.min(1,
          (corrDist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
        const lightFactor = Math.max(0.15, 1.0 - corrDist * 0.08);

        // Convertir hex a RGB
        const r = parseInt(baseColor.slice(1, 3), 16);
        const g = parseInt(baseColor.slice(3, 5), 16);
        const b = parseInt(baseColor.slice(5, 7), 16);

        const litR = Math.round(r * lightFactor * (1 - fogFactor));
        const litG = Math.round(g * lightFactor * (1 - fogFactor));
        const litB = Math.round(b * lightFactor * (1 - fogFactor));

        // Oscurecimiento extra para caras N/S vs E/W
        const faceDim = result.cara <= 1 ? 0.7 : 1.0;

        const finalR = Math.round(litR * faceDim);
        const finalG = Math.round(litG * faceDim);
        const finalB = Math.round(litB * faceDim);

        // Dibujar columna: cielo arriba, pared, piso abajo
        for (let row = 0; row < H; row += 1) {
          const idx = (row * W + col) * 4;

          if (row < wallTop) {
            // Cielo (gradiente)
            const t = row / halfH;
            const skyR = Math.round(100 + t * 35);
            const skyG = Math.round(180 + t * 15);
            const skyB = Math.round(220 - t * 60);
            buf[idx] = skyR;
            buf[idx + 1] = skyG;
            buf[idx + 2] = skyB;
            buf[idx + 3] = 255;
          } else if (row <= wallBot) {
            // Pared
            buf[idx] = finalR;
            buf[idx + 1] = finalG;
            buf[idx + 2] = finalB;
            buf[idx + 3] = 255;
          } else {
            // Piso (tierra, oscurece con la distancia)
            const floorDist = H / (2 * (row - halfH) + 0.001);
            const floorFog = Math.max(0, Math.min(1,
              (floorDist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
            const fLight = Math.max(0.12, 1.0 - floorFog);

            const fr = parseInt(PALETA.piso.slice(1, 3), 16);
            const fg = parseInt(PALETA.piso.slice(3, 5), 16);
            const fb = parseInt(PALETA.piso.slice(5, 7), 16);

            // Patron de rejilla para dar textura al piso
            const gridX = Math.floor((px + Math.cos(pa - fovHalf + (col / W) * FOV) * floorDist));
            const gridY = Math.floor((py + Math.sin(pa - fovHalf + (col / W) * FOV) * floorDist));
            const gridPattern = (gridX + gridY) % 2 === 0 ? 0.85 : 1.0;

            buf[idx] = Math.round(fr * fLight * gridPattern);
            buf[idx + 1] = Math.round(fg * fLight * gridPattern);
            buf[idx + 2] = Math.round(fb * fLight * gridPattern);
            buf[idx + 3] = 255;
          }
        }

        // Borde oscuro en la parte inferior de la pared (sombra)
        if (wallBot - wallTop > 4) {
          for (let row = wallBot - 2; row <= wallBot; row += 1) {
            if (row >= 0 && row < H) {
              const idx = (row * W + col) * 4;
              buf[idx] = Math.max(0, buf[idx] - 30);
              buf[idx + 1] = Math.max(0, buf[idx + 1] - 30);
              buf[idx + 2] = Math.max(0, buf[idx + 2] - 30);
            }
          }
        }
      }

      // Sprites (plagas) - billboard, ordenar por distancia
      const sprites = [];
      for (const pest of w.pests) {
        if (!pest.vivo) continue;
        const proj = projectSprite(pest.x, pest.y, px, py, pa, FOV, W, H);
        if (proj.visible) {
          sprites.push({ ...pest, proj });
        }
      }
      // Ordenar lejos -> cerca para dibujar atras primero
      sprites.sort((a, b) => b.proj.dist - a.proj.dist);

      for (const spr of sprites) {
        const { screenX, size, dist } = spr.proj;
        const halfSize = Math.round(size / 2);
        const top = Math.round(H / 2 - halfSize * 0.7);
        const bot = Math.round(H / 2 + halfSize * 0.7);
        const left = screenX - halfSize;
        const right = screenX + halfSize;

        const fogF = Math.max(0, Math.min(1, (dist - NIEBLA_INI) / (NIEBLA_FIN - NIEBLA_INI)));
        const sLight = Math.max(0.25, 1.0 - fogF);

        // Color base de la plaga
        const sr = parseInt(spr.color.slice(1, 3), 16);
        const sg = parseInt(spr.color.slice(3, 5), 16);
        const sb = parseInt(spr.color.slice(5, 7), 16);

        for (let row = top; row <= bot; row += 1) {
          if (row < 0 || row >= H) continue;
          for (let c = left; c <= right; c += 1) {
            if (c < 0 || c >= W) continue;
            if (zBuffer[c] < dist) continue; // ocluido por pared

            const idx = (row * W + c) * 4;

            // Forma mas o menos circular/ovalada de la plaga
            const cx = (c - screenX) / halfSize;
            const cy = (row - H / 2) / (halfSize * 0.7);
            const shape = cx * cx + cy * cy;
            if (shape > 0.85) continue;

            // Detalles simples (ojos, patas)
            if (shape > 0.55) {
              // Borde del cuerpo
              buf[idx] = Math.round(sr * sLight * 0.5);
              buf[idx + 1] = Math.round(sg * sLight * 0.5);
              buf[idx + 2] = Math.round(sb * sLight * 0.5);
            } else if (shape < 0.05 && row < H / 2) {
              // "Ojo" (punto brillante)
              buf[idx] = 255;
              buf[idx + 1] = 255;
              buf[idx + 2] = 255;
            } else if (cy > 0.15 && Math.abs(cx) < 0.3 && shape < 0.4) {
              // "Boca" o detalle
              buf[idx] = Math.round(sr * sLight * 0.7);
              buf[idx + 1] = Math.round(sg * sLight * 0.3);
              buf[idx + 2] = Math.round(sb * sLight * 0.3);
            } else {
              buf[idx] = Math.round(sr * sLight);
              buf[idx + 1] = Math.round(sg * sLight);
              buf[idx + 2] = Math.round(sb * sLight);
            }
            buf[idx + 3] = 255;
          }
        }
      }

      // Put pixel data
      ctx.putImageData(imageData, 0, 0);

      // Mira central (crosshair)
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 8, H / 2);
      ctx.lineTo(W / 2 - 3, H / 2);
      ctx.moveTo(W / 2 + 3, H / 2);
      ctx.lineTo(W / 2 + 8, H / 2);
      ctx.moveTo(W / 2, H / 2 - 8);
      ctx.lineTo(W / 2, H / 2 - 3);
      ctx.moveTo(W / 2, H / 2 + 3);
      ctx.lineTo(W / 2, H / 2 + 8);
      ctx.stroke();

      // Punto central
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 2, 0, Math.PI * 2);
      ctx.fill();

      setFrameCount((prev) => (prev + 1) % 120);
    };

    lastTick = performance.now();
    raf = requestAnimationFrame(step);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
    };
  }, [beep]);

  // Reiniciar
  const reiniciar = useCallback(() => {
    worldRef.current = createWorld();
    setVitalidad(CONFIG_DOOM.vitalidadInicial);
    setPlagasRestantes(PLAGAS_DOOM.length);
    setMensaje('Elimina todas las plagas. Cada una solo cae con su controlador real.');
    setEstado('jugando');
    setBeneficoSel('trichogramma');
  }, []);

  // Touch: joystick virtual izquierdo
  const handleTouchStart = useCallback((e) => {
    const t = e.changedTouches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    const relX = x / rect.width;
    const relY = y / rect.height;

    if (relX < 0.4) {
      // Joystick izquierdo
      touchRef.current.joystickActive = true;
      touchRef.current.joystickId = t.identifier;
      touchRef.current.joystickX = (relX - 0.2) * rect.width;
      touchRef.current.joystickY = (relY - 0.5) * rect.height;
    } else if (relX > 0.6) {
      // Boton de fuego
      inputRef.current.fire = true;
      setTimeout(() => { inputRef.current.fire = false; }, 100);
    } else {
      // Look (arrastrar)
      touchRef.current.lookActive = true;
      touchRef.current.lookId = t.identifier;
      touchRef.current.lookX = t.clientX;
      touchRef.current.lastLookX = t.clientX;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    const tj = touchRef.current;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const t = e.changedTouches[i];
      const canvas = canvasRef.current;
      if (!canvas) continue;
      const rect = canvas.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const relX = x / rect.width;

      if (t.identifier === tj.joystickId && tj.joystickActive) {
        tj.joystickX = (relX - (tj.joystickX / rect.width + 0.2)) * rect.width;
        tj.joystickY = (t.clientY - rect.top - 0.5 * rect.height);
        // Recalcular con centro
        const cx = rect.width * 0.2;
        const cy = rect.height * 0.5;
        tj.joystickX = t.clientX - rect.left - cx;
        tj.joystickY = t.clientY - rect.top - cy;
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
  }, []);

  const handleTouchEnd = useCallback((e) => {
    const tj = touchRef.current;
    for (let i = 0; i < e.changedTouches.length; i += 1) {
      const t = e.changedTouches[i];
      if (t.identifier === tj.joystickId) {
        tj.joystickActive = false;
        tj.joystickId = null;
        tj.joystickX = 0;
        tj.joystickY = 0;
        inputRef.current.forward = false;
        inputRef.current.backward = false;
        inputRef.current.strafeLeft = false;
        inputRef.current.strafeRight = false;
      }
      if (t.identifier === tj.lookId) {
        tj.lookActive = false;
        tj.lookId = null;
      }
    }
    // Si todos los dedos se levantaron
    if (e.touches.length === 0) {
      inputRef.current.forward = false;
      inputRef.current.backward = false;
      inputRef.current.strafeLeft = false;
      inputRef.current.strafeRight = false;
    }
  }, []);

  // Id para la vitalidad
  const vitalidadPct = Math.round((vitalidad / CONFIG_DOOM.vitalidadMax) * 100);
  const _beneficoActual = BENEFICOS_DOOM.find((b) => b.id === beneficoSel);

  return (
    <ScreenShell title="Doom de la Finca" icon={Crosshair} onBack={onBack} onHome={onHome}>
      <div className="flex flex-col gap-3 px-3 pt-2 pb-6 max-w-lg mx-auto">
        {/* Subtitulo */}
        <p className="text-xs text-emerald-200/80 leading-snug text-center">
          Recorre el invernadero en primera persona. Lanza el benefico correcto
          sobre cada plaga para controlarla. Protege la vitalidad del cultivo.
        </p>

        {/* HUD retro */}
        <div className="flex items-center justify-between gap-3 text-xs font-bold">
          {/* Vitalidad */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-emerald-300 whitespace-nowrap">Vitalidad</span>
            <div className="flex-1 h-4 bg-slate-800/60 rounded-full overflow-hidden border border-emerald-900/40">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full transition-all duration-300"
                style={{ width: `${vitalidadPct}%` }}
              />
            </div>
            <span className="text-white w-10 text-right">{vitalidadPct}%</span>
          </div>
          {/* Plagas restantes */}
          <div className="flex items-center gap-1 text-amber-300 whitespace-nowrap">
            <Bug size={14} />
            <span>{plagasRestantes}</span>
          </div>
        </div>

        {/* Canvas del juego */}
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-700/50 bg-black shadow-lg shadow-emerald-900/30">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="w-full block cursor-crosshair touch-none"
            style={{ imageRendering: 'pixelated', aspectRatio: `${W}/${H}` }}
            role="img"
            aria-label="Vista en primera persona del invernadero. Mira para apuntar, toca el lado derecho para lanzar."
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />

          {/* Overlay de fin de juego */}
          {estado !== 'jugando' && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 p-4">
              <span className="text-5xl" aria-hidden="true">
                {estado === 'gano' ? '🌽🎉' : '🐛💔'}
              </span>
              <h3 className="text-xl font-black text-white">
                {estado === 'gano' ? 'Cultivo limpio' : 'El cultivo sufrio'}
              </h3>
              <p className="text-sm text-emerald-100/80 text-center max-w-xs">
                {estado === 'gano'
                  ? 'Controlaste todas las plagas con sus enemigos naturales. El cultivo esta sano y productivo.'
                  : 'La vitalidad del cultivo se agoto. La proxima vez lanza el benefico correcto mas rapido.'}
              </p>
              <button
                type="button"
                onClick={reiniciar}
                className="min-h-[56px] px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition text-emerald-950 font-black text-lg flex items-center gap-2"
              >
                <RotateCcw size={22} aria-hidden="true" />
                Jugar otra vez
              </button>
            </div>
          )}

          {/* Indicadores touch: joystick virtual (solo mobile, indicado visualmente) */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
            <div className="w-14 h-14 rounded-full border-2 border-white/30 bg-white/5 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-white/20" />
            </div>
            <span className="text-white/60 text-2xs">Mover</span>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
            <span className="text-white/60 text-2xs">Lanzar</span>
            <div className="w-14 h-14 rounded-full border-2 border-amber-400/50 bg-amber-500/10 flex items-center justify-center">
              <Shield size={20} className="text-amber-300" />
            </div>
          </div>
        </div>

        {/* Mensaje (leccion) */}
        {mensaje && (
          <div
            className="bg-emerald-950/60 border border-emerald-700/40 rounded-xl p-3 text-center"
            role="status"
          >
            <Bug size={14} className="inline-block mr-1 text-emerald-400" aria-hidden="true" />
            <span className="text-sm text-emerald-100 font-medium">{mensaje}</span>
          </div>
        )}

        {/* Selector de beneficos */}
        <div className="flex gap-2 justify-center flex-wrap" role="group" aria-label="Elige el organismo benefico">
          {BENEFICOS_DOOM.map((b) => (
            <button
              key={b.id}
              type="button"
              data-selected={beneficoSel === b.id}
              onClick={() => {
                setBeneficoSel(b.id);
                worldRef.current = cambiarBenefico(worldRef.current, b.id);
              }}
              aria-pressed={beneficoSel === b.id}
              className="min-h-[52px] px-3 rounded-xl border-2 flex flex-col items-center gap-0.5 transition active:scale-95"
              style={{
                borderColor: beneficoSel === b.id ? b.color : 'rgba(255,255,255,0.15)',
                backgroundColor: beneficoSel === b.id ? `${b.color}20` : 'rgba(255,255,255,0.05)',
              }}
            >
              <span className="text-xl" aria-hidden="true">{b.emoji}</span>
              <span className="text-2xs font-bold text-white/80 leading-tight">{b.nombre}</span>
            </button>
          ))}
        </div>

        {/* Controles desktop */}
        <div className="text-2xs text-slate-500 text-center leading-relaxed">
          WASD = mover | Q/E = lateral | Click = apuntar + lanzar | Raton = girar
        </div>

        {/* Info par plaga-benefico */}
        <details className="text-2xs text-slate-400">
          <summary className="cursor-pointer font-bold text-emerald-400/80">
            Pares plaga-benefico (control biologico real)
          </summary>
          <ul className="mt-2 space-y-1 pl-3">
            {PLAGAS_DOOM.map((plaga) => {
              const benef = BENEFICOS_DOOM.find((b) => b.id === plaga.controladoPor);
              return (
                <li key={plaga.id} className="flex items-center gap-1">
                  <span>{plaga.emoji}</span>
                  <span className="text-white/80">{plaga.nombre}</span>
                  <span className="text-slate-500">→</span>
                  <span>{benef?.emoji}</span>
                  <span className="text-emerald-300">{benef?.nombre || plaga.controladoPor}</span>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </ScreenShell>
  );
}
