/*
 * CielosHora — el cielo del valle según la HORA DEL DÍA (componente r3f).
 *
 * Aplica un preset de cielosHoraData dentro de un <Canvas>: fondo, niebla,
 * hemisferio cielo/suelo, ambiente, sol direccional (que arquea con la hora)
 * y relleno frío opuesto — el MISMO esquema de luces de EscenaBase3D, para
 * que una escena iluminada por este kit se lea como hermana de las existentes.
 * De noche siembra estrellas (presupuesto del tier × fracción del preset).
 *
 * NO está cableado a nada: es un módulo autocontenido que se monta por props.
 *
 * CABLEO (para quien integre — no toca este archivo):
 *   1. Dentro de un <Canvas> cualquiera:
 *        <CielosHora hora="noche" tier={tier} reducedMotion={reducedMotion} />
 *      Reemplaza (no suma) al bloque fondo/fog/luces de la escena: montar los
 *      dos duplicaría luces. En una escena nueva, este componente ES el cielo.
 *   2. `hora` fija por escena, o `hora="auto"` para derivarla del reloj real
 *      (franjas de horaDeReloj; se refresca sola cada minuto).
 *   3. `tier`/`reducedMotion` vienen de decidirTier() como en <Mundo>: el
 *      perfil del tier decide niebla sí/no y el presupuesto de estrellas.
 *   4. Exportarlo en mundo3d/index.js si se quiere lazy-load con el resto.
 *
 * TRANSICIÓN: al cambiar `hora`, todos los valores (colores, intensidades,
 * posición del sol, niebla) se amortiguan exponencialmente hacia el preset
 * nuevo (~`duracion` segundos): el día "gira" en vez de saltar. Con
 * `reducedMotion` no hay animación: el preset entra directo (snap), que es
 * exactamente la calma que pide la preferencia.
 *
 * RENDIMIENTO: el estado animado vive en refs y se escribe imperativamente en
 * useFrame (cero setState por frame, cero alocación por frame: los Color y
 * Vector3 se mutan in-place). Los props declarativos usan el preset del PRIMER
 * montaje, que nunca cambia: un re-render del padre no pisa la animación.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { presetDeHora, horaDeReloj, TRANSICION } from './cielosHoraData.js';
import { perfilDeTier } from './deviceTier.js';

/* La direccional de relleno vive fija al lado opuesto del valle (como en
   EscenaBase3D); solo su color e intensidad cambian con la hora. */
const RELLENO_POS = [-5, 4, -6];

/* Convierte un preset (hex + números) a objetos three mutables in-place. */
function estadoDesde(p) {
  return {
    fondo: new THREE.Color(p.fondo),
    cielo: new THREE.Color(p.cielo),
    suelo: new THREE.Color(p.suelo),
    luz: new THREE.Color(p.luz),
    relleno: new THREE.Color(p.relleno),
    niebla: new THREE.Color(p.niebla),
    solPos: new THREE.Vector3(...p.solPos),
    intensidad: p.intensidad,
    hemisferio: p.hemisferio,
    ambiente: p.ambiente,
    sol: p.sol,
    rellenoInt: p.rellenoInt,
    nieblaCerca: p.nieblaCerca,
    nieblaLejos: p.nieblaLejos,
  };
}

/* Escribe el estado en los nodos three ya montados (los null se saltan: la
   niebla puede no existir en tier bajo). Todas las intensidades por luz van
   multiplicadas por la intensidad global de la hora, como en EscenaBase3D. */
function pintar(n, e) {
  if (n.fondo.current) n.fondo.current.copy(e.fondo);
  if (n.fog.current) {
    n.fog.current.color.copy(e.niebla);
    n.fog.current.near = e.nieblaCerca;
    n.fog.current.far = e.nieblaLejos;
  }
  if (n.hemi.current) {
    n.hemi.current.intensity = e.hemisferio * e.intensidad;
    n.hemi.current.color.copy(e.cielo);
    n.hemi.current.groundColor.copy(e.suelo);
  }
  if (n.amb.current) {
    n.amb.current.intensity = e.ambiente * e.intensidad;
    n.amb.current.color.copy(e.luz);
  }
  if (n.sol.current) {
    n.sol.current.intensity = e.sol * e.intensidad;
    n.sol.current.color.copy(e.luz);
    n.sol.current.position.copy(e.solPos);
  }
  if (n.rell.current) {
    n.rell.current.intensity = e.rellenoInt * e.intensidad;
    n.rell.current.color.copy(e.relleno);
  }
}

/* Amortigua `actual` hacia `objetivo` con factor k (colores, números y sol). */
function amortiguar(actual, objetivo, k) {
  actual.fondo.lerp(objetivo.fondo, k);
  actual.cielo.lerp(objetivo.cielo, k);
  actual.suelo.lerp(objetivo.suelo, k);
  actual.luz.lerp(objetivo.luz, k);
  actual.relleno.lerp(objetivo.relleno, k);
  actual.niebla.lerp(objetivo.niebla, k);
  actual.solPos.lerp(objetivo.solPos, k);
  for (const c of ['intensidad', 'hemisferio', 'ambiente', 'sol', 'rellenoInt', 'nieblaCerca', 'nieblaLejos']) {
    actual[c] += (objetivo[c] - actual[c]) * k;
  }
}

/**
 * El cielo por hora del día. Montar DENTRO de un <Canvas>.
 *
 * @param {object} props
 * @param {'amanecer'|'manana'|'mediodia'|'tarde'|'dorada'|'atardecer'|'noche'|'auto'} [props.hora='dorada']
 *        Momento del día; 'auto' lo deriva del reloj real (horaDeReloj).
 * @param {'alto'|'medio'|'bajo'} [props.tier='medio']
 *        Tier del equipo (decidirTier); gobierna niebla y estrellas.
 * @param {boolean} [props.reducedMotion=false]
 *        true → sin transición animada: el preset entra directo.
 * @param {number} [props.duracion] Segundos de la transición entre horas.
 */
export default function CielosHora({
  hora = 'dorada',
  tier = 'medio',
  reducedMotion = false,
  duracion = TRANSICION.duracion,
}) {
  const perfil = perfilDeTier(tier);

  // 'auto': la hora sale del reloj y se refresca sola cada minuto.
  const [horaReloj, setHoraReloj] = useState(() => horaDeReloj());
  useEffect(() => {
    if (hora !== 'auto') return undefined;
    const id = setInterval(() => setHoraReloj(horaDeReloj()), 60000);
    return () => clearInterval(id);
  }, [hora]);
  const horaEfectiva = hora === 'auto' ? horaReloj : hora;

  const objetivo = useMemo(() => estadoDesde(presetDeHora(horaEfectiva)), [horaEfectiva]);

  // El preset del PRIMER montaje, congelado (lazy useState): alimenta los
  // valores declarativos del JSX, que nunca deben cambiar tras montar. Es
  // dato plano (hex + números), NO una ref: leerlo en render es legal.
  const [ini] = useState(() => presetDeHora(horaEfectiva));
  // Estado animado: objetos three mutables, estables entre renders (nunca se
  // hace setState, solo se mutan in-place en useFrame/efecto).
  const [actual] = useState(() => estadoDesde(ini));

  // Refs de los nodos three, individuales (el bundle en objeto lo arma cada
  // callback en runtime): su `.current` SOLO se toca dentro de useFrame/
  // efectos, nunca en render.
  const fondoRef = useRef(null);
  const fogRef = useRef(null);
  const hemiRef = useRef(null);
  const ambRef = useRef(null);
  const solRef = useRef(null);
  const rellRef = useRef(null);
  const bundle = () => ({
    fondo: fondoRef,
    fog: fogRef,
    hemi: hemiRef,
    amb: ambRef,
    sol: solRef,
    rell: rellRef,
  });

  // Calma pedida → snap: el preset nuevo entra completo, sin animar.
  useEffect(() => {
    if (!reducedMotion) return;
    amortiguar(actual, objetivo, 1);
    pintar(bundle(), actual);
  });

  // Transición viva: amortiguación exponencial estable en dt variable.
  useFrame((_, dt) => {
    if (reducedMotion) return;
    const k = 1 - Math.exp((-3 / Math.max(duracion, 0.001)) * Math.min(dt, 0.1));
    amortiguar(actual, objetivo, k);
    pintar(bundle(), actual);
  });

  // Estrellas: presupuesto del tier × fracción de la hora DESTINO (aparecen
  // al pedir la noche; drei las funde suave con `fade`). Quietas en calma.
  const preset = presetDeHora(horaEfectiva);
  const nEstrellas = Math.round(perfil.estrellas * preset.estrellas);

  return (
    <group>
      <color ref={fondoRef} attach="background" args={[ini.fondo]} />
      {perfil.fog && (
        <fog ref={fogRef} attach="fog" args={[ini.niebla, ini.nieblaCerca, ini.nieblaLejos]} />
      )}
      <hemisphereLight
        ref={hemiRef}
        intensity={ini.hemisferio * ini.intensidad}
        color={ini.cielo}
        groundColor={ini.suelo}
      />
      <ambientLight ref={ambRef} intensity={ini.ambiente * ini.intensidad} color={ini.luz} />
      <directionalLight
        ref={solRef}
        position={ini.solPos}
        intensity={ini.sol * ini.intensidad}
        color={ini.luz}
      />
      <directionalLight
        ref={rellRef}
        position={RELLENO_POS}
        intensity={ini.rellenoInt * ini.intensidad}
        color={ini.relleno}
      />
      {nEstrellas > 0 && (
        <Stars
          radius={80}
          depth={40}
          count={nEstrellas}
          factor={3}
          saturation={0}
          fade
          speed={reducedMotion ? 0 : 0.5}
        />
      )}
    </group>
  );
}
