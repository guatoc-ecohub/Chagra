/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup 3D con UI en español intencional; migración ADR-050 i18n pendiente para todo el árbol mundo3d */
/*
 * CicloMata — el CICLO DE VIDA de una mata, tocable (sembrar → brotar → crecer →
 * florecer → cosechar) como un time-lapse que el usuario avanza CON EL DEDO.
 *
 * La lección NO es un juego: es que la agricultura es PACIENCIA y OBSERVACIÓN.
 * El tiempo es una escala continua `t` en [0..4]; deslizarla hace crecer la mata
 * de verdad (el tallo sube, las hojas se abren, las flores asoman y no todas
 * cuajan, el fruto madura de color). No hay puntajes ni recompensas: hay días que
 * pasan y una planta que responde. Cada etapa trae una nota de qué OBSERVAR.
 *
 * AUTOCONTENIDO y montable por props — Opus lo cablea; este componente NO se
 * importa desde `Mundo.jsx` ni toca ningún otro archivo del árbol `mundo3d`.
 *
 *   // Cárguelo PEREZOSO: importa `three`/@react-three → chunk `vendor-three`.
 *   const CicloMata = React.lazy(() => import('src/visual/mundo3d/CicloMata.jsx'));
 *   <Suspense fallback={null}>
 *     <CicloMata especie="tomate" etapaInicial={0} tier="alto" reducedMotion={false} />
 *   </Suspense>
 *
 * Props:
 *   especie       'tomate' | 'frijol' | 'maiz' | 'generico'  (default 'tomate')
 *   etapaInicial  índice 0..4 o id de etapa ('sembrar'…'cosechar')  (default 0)
 *   tier          'alto' | 'medio' | 'bajo' | '2d'  — menos partículas/geometría
 *                 en gama baja  (default 'alto')
 *   reducedMotion true → SIN animación automática ni vaivén; solo avance manual
 *   autoplay      arrancar reproduciendo el time-lapse (ignorado si reducedMotion)
 *   onEtapa       (indice, etapa) => void  — al cambiar de etapa legible
 *   className     clase extra para el contenedor
 *
 * Perf (contrato del framework, DR §6): SOLO `MeshLambert`/`MeshBasic`, sin
 * sombras, sin post-proceso, `dpr=[1,1.5]`, `AdaptiveDpr`, geometría 100%
 * procedural (cero GLTF/HDR/fuentes remotas), `frameloop='demand'` con
 * reduced-motion. Los controles del tiempo son DOM normal (táctiles) fuera del
 * Canvas: una barra deslizable, fichas por etapa y un botón reproducir/pausar.
 */
import {
  Suspense, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import './CicloMata.css';

/* ── utilidades puras ─────────────────────────────────────────────────────── */

const clamp01 = (n) => Math.max(0, Math.min(1, n));
/** rampa suave 0→1 entre `a` y `b` (smoothstep). */
const rampa = (x, a, b) => {
  if (b === a) return x < a ? 0 : 1;
  const k = clamp01((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};

/* PRNG determinista: la misma mata siempre, sin azar por frame. */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* ── las cinco etapas legibles ────────────────────────────────────────────── */

const ETAPAS = [
  {
    id: 'sembrar', nombre: 'Sembrar', emoji: '🌰',
    texto:
      'Puso la semilla en la tierra húmeda. Por fuera no pasa nada: bajo el suelo '
      + 'empieza el trabajo. Riegue con cuidado y espere. La paciencia es la primera labor.',
  },
  {
    id: 'brotar', nombre: 'Brotar', emoji: '🌱',
    texto:
      'Asoma el primer brote, apenas un hilo verde buscando la luz. Es frágil: '
      + 'obsérvelo cada día, note su color y hacia dónde se inclina. No lo apure.',
  },
  {
    id: 'crecer', nombre: 'Crecer', emoji: '🌿',
    texto:
      'La mata gana hojas y firmeza. Aquí se juega la salud: mire el envés de las '
      + 'hojas, el grosor del tallo, la humedad de la tierra. Crecer toma su tiempo.',
  },
  {
    id: 'florecer', nombre: 'Florecer', emoji: '🌼',
    texto:
      'Aparecen las flores: son la promesa, todavía no el fruto. Cuide los '
      + 'polinizadores y el riego parejo. Algunas flores no cuajarán, y está bien.',
  },
  {
    id: 'cosechar', nombre: 'Cosechar', emoji: '🍅',
    texto:
      'Llega la cosecha. Recójala a tiempo y guarde semilla. Anote lo que observó: '
      + 'la próxima siembra empieza en lo que aprendió de esta.',
  },
];

/* Días aproximados en los que se ALCANZA cada etapa (para transmitir el tiempo
   real; cifras redondas y honestas, no exactas). */
const DIAS = {
  tomate: [0, 8, 28, 55, 80],
  frijol: [0, 6, 22, 42, 65],
  maiz: [0, 7, 30, 60, 95],
  generico: [0, 7, 26, 50, 78],
};

/* Cada especie aporta colores + porte + el nombre de su cosecha. La MORFOLOGÍA
   es una sola (parametrizada): tallo, hojas, flores, frutos low-poly. */
const ESPECIES = {
  tomate: {
    nombre: 'Tomate', emoji: '🍅', porte: 1.8,
    tallo: '#5c7d3a', hoja: '#4f8f3f', flor: '#f2c945',
    frutoJoven: '#7ba13e', frutoMaduro: '#d6472e', cosecha: 'tomate',
  },
  frijol: {
    nombre: 'Fríjol', emoji: '🫘', porte: 2.1,
    tallo: '#5f7f45', hoja: '#4e8a41', flor: '#b58fd6',
    frutoJoven: '#6f9a45', frutoMaduro: '#b7913f', cosecha: 'vaina',
  },
  maiz: {
    nombre: 'Maíz', emoji: '🌽', porte: 2.6,
    tallo: '#6d8a3c', hoja: '#5c9440', flor: '#d8c98a',
    frutoJoven: '#7fae4a', frutoMaduro: '#e6b93f', cosecha: 'mazorca',
  },
  generico: {
    nombre: 'La mata', emoji: '🌱', porte: 1.9,
    tallo: '#5c7d3a', hoja: '#4f8f3f', flor: '#eec24a',
    frutoJoven: '#7ba13e', frutoMaduro: '#c9522f', cosecha: 'fruto',
  },
};

/* Cuánta geometría/partículas por tier (gama baja = más sobria, DR §4.4/§6). */
const PRESUPUESTO = {
  alto: { hojas: 9, flores: 6, frutos: 5, polen: 14 },
  medio: { hojas: 6, flores: 4, frutos: 3, polen: 8 },
  bajo: { hojas: 4, flores: 3, frutos: 2, polen: 0 },
};
const presupuestoDe = (tier) => PRESUPUESTO[tier === '2d' ? 'bajo' : tier] || PRESUPUESTO.alto;

/**
 * El estado de crecimiento en función del tiempo continuo `t` (0..4). Todo lo
 * visible se deriva de aquí: así el dedo del usuario "es" el paso del tiempo.
 */
function crecimiento(t) {
  return {
    // el tallo sube desde el brote (t≈0.6) hasta su porte pleno (t≈2.6)
    tallo: rampa(t, 0.6, 2.7),
    // la semilla visible se desvanece cuando brota
    semilla: 1 - rampa(t, 0.2, 0.85),
    // las hojas se abren entre brotar y crecer
    hojas: rampa(t, 0.8, 2.6),
    // las flores asoman en florecer y ceden al llegar el fruto
    flores: rampa(t, 2.4, 3.1) * (1 - rampa(t, 3.5, 3.9)),
    // el fruto crece tras la flor
    frutos: rampa(t, 3.2, 3.9),
    // y madura de color hacia la cosecha
    madurez: rampa(t, 3.6, 4.0),
  };
}

/* ── piezas del diorama ───────────────────────────────────────────────────── */

/* La maceta de barro + su tierra (el punto de partida, cálido y humilde). */
function Maceta() {
  return (
    <group>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[0.92, 0.72, 0.72, 20]} />
        <meshLambertMaterial color="#b5764f" flatShading />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.94, 0.9, 0.14, 20]} />
        <meshLambertMaterial color="#a86a45" flatShading />
      </mesh>
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.82, 0.82, 0.12, 20]} />
        <meshLambertMaterial color="#4a3627" flatShading />
      </mesh>
    </group>
  );
}

/* Una hoja: un octaedro aplanado (rombo low-poly), barato y legible. Crece con
   `k` y se orienta alrededor del tallo, inclinada hacia la luz. */
function Hoja({ base, angulo, k, color }) {
  const escala = Math.max(0.0001, k);
  return (
    <group position={[0, base, 0]} rotation={[0, angulo, 0]}>
      <group rotation={[0, 0, -0.9]} position={[0.16 * escala, 0, 0]}>
        <mesh scale={[escala * 0.9, escala * 0.5, escala * 0.16]} position={[0.28, 0, 0]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshLambertMaterial color={color} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* Una flor: un disco central cálido rodeado de pétalos low-poly. */
function Flor({ pos, k, color }) {
  const escala = Math.max(0.0001, k);
  const petalos = 5;
  return (
    <group position={pos} scale={escala}>
      <mesh>
        <icosahedronGeometry args={[0.055, 0]} />
        <meshLambertMaterial color="#f6d658" flatShading />
      </mesh>
      {Array.from({ length: petalos }).map((_, i) => {
        const a = (i / petalos) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1]} rotation={[Math.PI / 2, 0, a]}>
            <coneGeometry args={[0.05, 0.11, 5]} />
            <meshLambertMaterial color={color} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

/* Un fruto: un elipsoide que crece y madura de color (joven → maduro). */
function Fruto({ pos, k, colorJoven, colorMaduro, madurez }) {
  const escala = Math.max(0.0001, k);
  const color = useMemo(
    () => new THREE.Color(colorJoven).lerp(new THREE.Color(colorMaduro), clamp01(madurez)),
    [colorJoven, colorMaduro, madurez],
  );
  return (
    <mesh position={pos} scale={[escala * 0.16, escala * 0.19, escala * 0.16]}>
      <icosahedronGeometry args={[1, 1]} />
      <meshLambertMaterial color={color} flatShading />
    </mesh>
  );
}

/* Motas de polen: puntos cálidos que derivan alrededor de la floración. Solo en
   gama media/alta y con movimiento; `reducedMotion` o tier bajo → ninguna. */
function Polen({ cantidad, visible, reducedMotion }) {
  const ref = useRef(null);
  const semillas = useMemo(() => {
    const r = rng(41);
    return Array.from({ length: cantidad }, () => ({
      x: (r() - 0.5) * 2.2, y: 0.8 + r() * 1.8, z: (r() - 0.5) * 2.2, f: 0.3 + r() * 0.7,
    }));
  }, [cantidad]);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((m, i) => {
      const s = semillas[i];
      m.position.y = s.y + Math.sin(t * s.f + i) * 0.18;
      m.position.x = s.x + Math.cos(t * s.f * 0.7 + i) * 0.12;
    });
  });
  if (!cantidad || visible <= 0.02) return null;
  return (
    <group ref={ref}>
      {semillas.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <icosahedronGeometry args={[0.02, 0]} />
          <meshBasicMaterial color="#f7e6a2" transparent opacity={0.55 * visible} />
        </mesh>
      ))}
    </group>
  );
}

/* La mata entera: lee `t`, se arma con las piezas y respira si hay movimiento. */
function Mata({ t, especie, presupuesto, reducedMotion }) {
  const g = crecimiento(t);
  const sp = especie;
  const alturaMax = sp.porte;
  const grupo = useRef(null);

  // vaivén de viento (apagado con reduced-motion); crece con la planta
  useFrame((state) => {
    if (reducedMotion || !grupo.current) return;
    const tt = state.clock.elapsedTime;
    grupo.current.rotation.z = Math.sin(tt * 0.9) * 0.03 * g.tallo;
  });

  const alturaTallo = Math.max(0.02, g.tallo * alturaMax);

  // colocaciones deterministas (una sola vez por presupuesto/especie)
  const { hojas, flores, frutos } = useMemo(() => {
    const r = rng(7);
    const nH = presupuesto.hojas;
    const hj = Array.from({ length: nH }, (_, i) => ({
      key: i,
      frac: 0.18 + (i / Math.max(1, nH - 1)) * 0.72, // fracción de altura
      angulo: i * 2.399 + r() * 0.4, // filotaxis áurea aproximada
      demora: i / nH, // las de arriba abren después
    }));
    const nF = presupuesto.flores;
    const fl = Array.from({ length: nF }, (_, i) => ({
      key: i,
      frac: 0.55 + r() * 0.4,
      angulo: r() * Math.PI * 2,
      radio: 0.28 + r() * 0.18,
      demora: (i / nF) * 0.5,
    }));
    const nFr = presupuesto.frutos;
    const fr = Array.from({ length: nFr }, (_, i) => ({
      key: i,
      frac: 0.42 + r() * 0.38,
      angulo: r() * Math.PI * 2,
      radio: 0.24 + r() * 0.16,
      demora: (i / nFr) * 0.5,
    }));
    return { hojas: hj, flores: fl, frutos: fr };
  }, [presupuesto]);

  return (
    <group ref={grupo}>
      {/* la semilla, visible antes de brotar */}
      {g.semilla > 0.02 && (
        <mesh position={[0, 0.02, 0]}>
          <icosahedronGeometry args={[0.1, 0]} />
          <meshLambertMaterial color="#7a5a38" flatShading transparent opacity={g.semilla} />
        </mesh>
      )}

      {/* el tallo */}
      {g.tallo > 0.01 && (
        <mesh position={[0, alturaTallo / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.06, alturaTallo, 7]} />
          <meshLambertMaterial color={sp.tallo} flatShading />
        </mesh>
      )}

      {/* las hojas, abriéndose de abajo hacia arriba */}
      {hojas.map((h) => {
        const k = clamp01((g.hojas - h.demora * 0.5) / 0.5);
        if (k <= 0.02) return null;
        return (
          <Hoja
            key={h.key}
            base={alturaTallo * h.frac}
            angulo={h.angulo}
            k={k}
            color={sp.hoja}
          />
        );
      })}

      {/* las flores (no todas cuajan: la escala máxima varía por flor) */}
      {flores.map((f) => {
        const k = clamp01((g.flores - f.demora) / 0.6);
        if (k <= 0.02) return null;
        const y = alturaTallo * f.frac;
        return (
          <Flor
            key={f.key}
            pos={[Math.cos(f.angulo) * f.radio, y, Math.sin(f.angulo) * f.radio]}
            k={k}
            color={sp.flor}
          />
        );
      })}

      {/* los frutos, madurando de color */}
      {frutos.map((f) => {
        const k = clamp01((g.frutos - f.demora * 0.4) / 0.6);
        if (k <= 0.02) return null;
        const y = alturaTallo * f.frac;
        return (
          <Fruto
            key={f.key}
            pos={[Math.cos(f.angulo) * f.radio, y, Math.sin(f.angulo) * f.radio]}
            k={k}
            colorJoven={sp.frutoJoven}
            colorMaduro={sp.frutoMaduro}
            madurez={g.madurez}
          />
        );
      })}

      <Polen cantidad={presupuesto.polen} visible={g.flores + g.frutos * 0.4} reducedMotion={reducedMotion} />
    </group>
  );
}

/* Fuerza un repintado cuando cambia `t` en modo `frameloop='demand'` (reduced-
   motion): sin bucle continuo, hay que invalidar a mano al deslizar. */
function Invalidador({ t }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => { invalidate(); }, [t, invalidate]);
  return null;
}

/* ── el componente público ────────────────────────────────────────────────── */

const idxEtapaInicial = (etapaInicial) => {
  if (typeof etapaInicial === 'number') return Math.max(0, Math.min(4, Math.round(etapaInicial)));
  const i = ETAPAS.findIndex((e) => e.id === etapaInicial);
  return i >= 0 ? i : 0;
};

export default function CicloMata({
  especie = 'tomate',
  etapaInicial = 0,
  tier = 'alto',
  reducedMotion = false,
  autoplay = false,
  onEtapa,
  className = '',
}) {
  const sp = ESPECIES[especie] || ESPECIES.generico;
  const presupuesto = presupuestoDe(tier);
  const dias = DIAS[especie] || DIAS.generico;

  const [t, setT] = useState(() => idxEtapaInicial(etapaInicial));
  const [reproduciendo, setReproduciendo] = useState(autoplay && !reducedMotion);
  const idxEtapa = Math.min(4, Math.round(t));
  const etapa = ETAPAS[idxEtapa];

  // avisar al cablear cuando cambia la etapa legible
  const etapaPrev = useRef(idxEtapa);
  useEffect(() => {
    if (etapaPrev.current !== idxEtapa) {
      etapaPrev.current = idxEtapa;
      onEtapa?.(idxEtapa, ETAPAS[idxEtapa]);
    }
  }, [idxEtapa, onEtapa]);

  // reproducción automática del time-lapse (nunca con reduced-motion)
  useEffect(() => {
    if (!reproduciendo || reducedMotion) return undefined;
    let raf;
    let ultimo = performance.now();
    const DUR = 16; // segundos para recorrer el ciclo completo (paciencia)
    const paso = (ahora) => {
      const dt = (ahora - ultimo) / 1000;
      ultimo = ahora;
      setT((prev) => {
        const sig = prev + (dt * 4) / DUR;
        if (sig >= 4) { setReproduciendo(false); return 4; }
        return sig;
      });
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [reproduciendo, reducedMotion]);

  const irAEtapa = useCallback((i) => {
    setReproduciendo(false);
    setT(i);
  }, []);

  const alReproducir = useCallback(() => {
    setReproduciendo((r) => {
      if (r) return false;
      // si está al final, reinicia desde la siembra
      setT((prev) => (prev >= 3.98 ? 0 : prev));
      return true;
    });
  }, []);

  const alDeslizar = useCallback((e) => {
    setReproduciendo(false);
    setT(parseFloat(e.target.value));
  }, []);

  return (
    <div className={`ciclo-mata${reducedMotion ? ' ciclo-mata--calma' : ''} ${className}`.trim()}>
      <Canvas
        className="ciclo-mata__lienzo"
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: [1.9, 1.9, 3.4], fov: 42 }}
        frameloop={reducedMotion ? 'demand' : 'always'}
      >
        <color attach="background" args={['#eae0c8']} />
        <hemisphereLight intensity={1} color="#f5e9d2" groundColor="#8a6a44" />
        <ambientLight intensity={0.5} color="#f5e9d2" />
        <Suspense fallback={null}>
          <group position={[0, -0.8, 0]}>
            <Maceta />
            <Mata t={t} especie={sp} presupuesto={presupuesto} reducedMotion={reducedMotion} />
          </group>
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={2.6}
          maxDistance={7}
          minPolarAngle={0.35}
          maxPolarAngle={1.45}
          enableDamping={!reducedMotion}
          dampingFactor={0.09}
          target={[0, 0.4, 0]}
        />
        <AdaptiveDpr pixelated />
        {reducedMotion && <Invalidador t={t} />}
      </Canvas>

      {/* ── los controles del tiempo (DOM táctil, fuera del Canvas) ── */}
      <div className="ciclo-panel">
        <header className="ciclo-panel__cab">
          <span className="ciclo-panel__especie">{sp.emoji} {sp.nombre}</span>
          <span className="ciclo-panel__dia">día ~{dias[idxEtapa]}</span>
        </header>

        <div className="ciclo-etapa">
          <h3 className="ciclo-etapa__titulo">
            <span aria-hidden="true">{etapa.emoji}</span> {etapa.nombre}
          </h3>
          <p className="ciclo-etapa__texto">{etapa.texto}</p>
        </div>

        {/* la barra del tiempo: deslícela con el dedo para ver pasar los días */}
        <label className="ciclo-tiempo">
          <span className="ciclo-tiempo__ayuda">
            {reducedMotion
              ? 'Toque cada etapa o deslice para avanzar el tiempo.'
              : 'Deslice para ver pasar el tiempo, o reproduzca el ciclo.'}
          </span>
          <input
            className="ciclo-tiempo__barra"
            type="range"
            min={0}
            max={4}
            step={0.01}
            value={t}
            onChange={alDeslizar}
            aria-label="Línea de tiempo del ciclo de la mata"
            aria-valuetext={`${etapa.nombre}, día aproximado ${dias[idxEtapa]}`}
          />
        </label>

        <div className="ciclo-fichas" role="group" aria-label="Etapas del ciclo">
          {!reducedMotion && (
            <button
              type="button"
              className="ciclo-ficha ciclo-ficha--play"
              onClick={alReproducir}
              aria-pressed={reproduciendo}
            >
              {reproduciendo ? '⏸ Pausar' : '▶ Reproducir'}
            </button>
          )}
          {ETAPAS.map((e, i) => (
            <button
              key={e.id}
              type="button"
              className={`ciclo-ficha${i === idxEtapa ? ' ciclo-ficha--activa' : ''}`}
              onClick={() => irAEtapa(i)}
              aria-current={i === idxEtapa ? 'step' : undefined}
              title={e.nombre}
            >
              <span className="ciclo-ficha__emoji" aria-hidden="true">{e.emoji}</span>
              <span className="ciclo-ficha__txt">{e.nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Exportado por si el cableador quiere listar/etiquetar etapas o especies. */
export { ETAPAS, ESPECIES };
