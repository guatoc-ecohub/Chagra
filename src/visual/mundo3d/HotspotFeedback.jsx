/*
 * HotspotFeedback — kit de micro-interacciones para hotspots 3D (game-feel).
 *
 * Tocar un punto de interes debe sentirse VIVO Y CONFIRMADO, no como apretar
 * un div. Este kit monta, sobre la posicion de cualquier hotspot, el gesto
 * completo de confirmacion:
 *
 *   1. HALO que respira mientras el hotspot esta activo (aro + disco en el
 *      suelo, el mismo lenguaje de las sombras de contacto del valle).
 *   2. ONDA/ripple: anillos que se expanden y desvanecen al momento del toque.
 *   3. CHISPA: estallido breve de particulas ambar que saltan y caen.
 *   4. DESTELLO: el halo brilla de mas justo al tocar y decae exponencial.
 *   5. TICK sonoro 0-KB opcional (WebAudio puro, quinta justa C5→G5; el motor
 *      vive en hotspotFeedbackConfig.js, sin tocar useAudioMundo).
 *
 * Y aparte, <HotspotPop>: envolvente de squash & stretch (resorte amortiguado)
 * para el mesh propio del hotspot — primero aplasta, luego estira con
 * overshoot y asienta. Se usan juntos pero no se obligan.
 *
 * CABLEO (para el host; este archivo no toca ninguna escena):
 *
 *   import HotspotFeedback, { HotspotPop } from './HotspotFeedback.jsx';
 *
 *   <HotspotFeedback
 *     activo={seleccionado === h.id}   // estado resaltado; el flanco de subida dispara el estallido
 *     pos={h.pos}                      // [x,y,z] del hotspot (el halo cae a ras de ese punto)
 *     tier={tier}                      // 'alto'|'medio'|'bajo' (contrato deviceTier)
 *     reducedMotion={reducedMotion}    // true → solo halo estatico, sin ondas ni chispas
 *     conSonido={sonidoActivo}         // tick WebAudio al confirmar (requiere gesto previo: el toque lo es)
 *     radio={0.5}                      // opcional: tamano del halo en unidades de mundo
 *     color={'#d9a13b'}                // opcional: tinte alterno (default: ambar canonico)
 *   />
 *
 *   <HotspotPop activo={seleccionado === h.id} reducedMotion={reducedMotion}>
 *     <mesh onClick={...}>...</mesh>   // el mesh del hotspot, intacto
 *   </HotspotPop>
 *
 * Presupuesto: geometrias declaradas UNA vez (r3f las libera al desmontar);
 * por frame solo se mutan escalas/opacidades/atributos via refs (cero
 * setState). Con `activo=false` y sin estallido en vuelo el grupo entero se
 * apaga (`visible=false`) y el costo es ~0. Tiers y tintes vienen de
 * hotspotFeedbackConfig.js; los materiales son Basic (sin luz, como pide el
 * contrato frugal del framework).
 *
 * reduced-motion: el kit respeta la calma — queda SOLO el estado resaltado
 * (halo fijo, sin pulso, sin ondas, sin particulas). El tick sonoro se
 * mantiene si `conSonido` (audio no es movimiento y confirma igual).
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mezclar } from './atmosferaMadre.js';
import {
  TINTE_FEEDBACK,
  TIEMPOS_FEEDBACK,
  POP_FEEDBACK,
  perfilFeedback,
  tocarTickHotspot,
} from './hotspotFeedbackConfig.js';

export default function HotspotFeedback({
  activo = false,
  pos = [0, 0, 0],
  tier = 'alto',
  reducedMotion = false,
  conSonido = false,
  radio = 0.5,
  color = null,
}) {
  const perfil = perfilFeedback(tier);

  /* Tintes: canonicos o derivados del override (la chispa siempre aclara). */
  const tintes = useMemo(() => {
    if (!color) return TINTE_FEEDBACK;
    return { halo: color, onda: color, chispa: mezclar(color, '#ffffff', 0.4) };
  }, [color]);

  /* refs mutables — todo lo por-frame vive aqui, nunca en estado React */
  const grupoRef = useRef(null);
  const aroRef = useRef(null);
  const discoRef = useRef(null);
  const ondasRef = useRef([]);
  const puntosRef = useRef(null);
  const velRef = useRef(null); // velocidades de chispas (se re-sortean por toque)
  const t0 = useRef(-1e9); // momento (clock) del ultimo toque
  const pedirEstallido = useRef(false);
  const prevActivo = useRef(false);

  /* Posiciones iniciales de las chispas (el frame las re-escribe via ref). */
  const posChispas = useMemo(
    () => new Float32Array(perfil.chispas * 3),
    [perfil.chispas],
  );

  /* Flanco de subida de `activo` → pedir estallido + tick. El estallido se
     ARMA aqui pero se dispara dentro de useFrame (alli vive el reloj). */
  useEffect(() => {
    if (activo && !prevActivo.current) {
      pedirEstallido.current = true;
      if (conSonido) tocarTickHotspot();
    }
    prevActivo.current = activo;
  }, [activo, conSonido]);

  /* Cola maxima del estallido: tras esto el grupo puede apagarse del todo. */
  const colaEstallido =
    Math.max(
      TIEMPOS_FEEDBACK.onda + TIEMPOS_FEEDBACK.ondaEscalon * (perfil.ondas - 1),
      TIEMPOS_FEEDBACK.chispa,
    ) + 0.1;

  useFrame((state) => {
    const g = grupoRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    /* disparo pendiente (pedido por el efecto de flanco) */
    if (pedirEstallido.current) {
      pedirEstallido.current = false;
      if (!reducedMotion) {
        t0.current = t;
        /* re-sortear chispas: hemisferio hacia arriba, abanico amable */
        if (!velRef.current || velRef.current.length !== perfil.chispas * 3) {
          velRef.current = new Float32Array(perfil.chispas * 3);
        }
        const vel = velRef.current;
        for (let i = 0; i < perfil.chispas; i++) {
          const ang = Math.random() * Math.PI * 2;
          const vh = (0.45 + Math.random() * 0.75) * radio * 2.2;
          vel[i * 3] = Math.cos(ang) * vh;
          vel[i * 3 + 1] = (1.1 + Math.random() * 1.3) * radio * 2.2;
          vel[i * 3 + 2] = Math.sin(ang) * vh;
        }
      }
    }

    const edad = t - t0.current;
    const enVuelo = edad < colaEstallido;
    g.visible = activo || enVuelo;
    if (!g.visible) return;

    const aro = aroRef.current;
    const disco = discoRef.current;

    /* reduced-motion: SOLO el estado resaltado, quieto. Nada mas se anima. */
    if (reducedMotion) {
      if (aro) {
        aro.visible = activo;
        aro.scale.setScalar(radio);
        aro.material.opacity = 0.62;
      }
      if (disco) {
        disco.visible = activo;
        disco.scale.setScalar(radio);
        disco.material.opacity = 0.14;
      }
      for (const onda of ondasRef.current) if (onda) onda.visible = false;
      if (puntosRef.current) puntosRef.current.visible = false;
      return;
    }

    /* 1+4) halo que respira + destello del toque (decae exponencial) */
    const destello = edad >= 0 ? Math.exp(-edad / TIEMPOS_FEEDBACK.destello) : 0;
    const pulso =
      1 +
      TIEMPOS_FEEDBACK.pulsoAmplitud *
        Math.sin(t * TIEMPOS_FEEDBACK.pulsoHz * Math.PI * 2);
    if (aro) {
      aro.visible = activo;
      aro.scale.setScalar(radio * pulso * (1 + destello * 0.12));
      aro.material.opacity = 0.5 + 0.45 * destello;
    }
    if (disco) {
      disco.visible = activo;
      disco.scale.setScalar(radio * pulso);
      disco.material.opacity = 0.1 + 0.22 * destello;
    }

    /* 2) ondas de expansion, escalonadas */
    for (let i = 0; i < ondasRef.current.length; i++) {
      const onda = ondasRef.current[i];
      if (!onda) continue;
      const p = (edad - i * TIEMPOS_FEEDBACK.ondaEscalon) / TIEMPOS_FEEDBACK.onda;
      if (p <= 0 || p >= 1) {
        onda.visible = false;
        continue;
      }
      onda.visible = true;
      onda.scale.setScalar(radio * (0.4 + 2.1 * p));
      onda.material.opacity = Math.pow(1 - p, 1.6) * 0.75;
    }

    /* 3) chispas: posicion analitica desde la edad (sin drift de Euler) */
    const puntos = puntosRef.current;
    if (puntos && velRef.current) {
      const pC = edad / TIEMPOS_FEEDBACK.chispa;
      if (pC <= 0 || pC >= 1) {
        puntos.visible = false;
      } else {
        puntos.visible = true;
        const attr = puntos.geometry.getAttribute('position');
        const vel = velRef.current;
        for (let i = 0; i < perfil.chispas; i++) {
          attr.array[i * 3] = vel[i * 3] * edad;
          attr.array[i * 3 + 1] = Math.max(
            0.02,
            vel[i * 3 + 1] * edad - 3.4 * edad * edad,
          );
          attr.array[i * 3 + 2] = vel[i * 3 + 2] * edad;
        }
        attr.needsUpdate = true;
        puntos.material.opacity = Math.pow(1 - pC, 1.7);
        puntos.material.size = radio * 0.16 * (1 - 0.4 * pC);
      }
    }
  });

  const blending = perfil.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending;

  return (
    <group ref={grupoRef} position={/** @type {[number, number, number]} */ (pos)} visible={false}>
      {/* disco suave de asiento (el "charco" de luz bajo el hotspot) */}
      <mesh ref={discoRef} rotation-x={-Math.PI / 2} position-y={0.015}>
        <circleGeometry args={[0.92, perfil.segmentos]} />
        <meshBasicMaterial
          color={tintes.halo}
          transparent
          opacity={0}
          depthWrite={false}
          blending={blending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* aro nitido que respira */}
      <mesh ref={aroRef} rotation-x={-Math.PI / 2} position-y={0.02}>
        <ringGeometry args={[0.82, 1, perfil.segmentos]} />
        <meshBasicMaterial
          color={tintes.halo}
          transparent
          opacity={0}
          depthWrite={false}
          blending={blending}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* ondas de expansion (una geometria unitaria por anillo, escalada) */}
      {Array.from({ length: perfil.ondas }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            ondasRef.current[i] = el;
          }}
          rotation-x={-Math.PI / 2}
          position-y={0.025}
          visible={false}
        >
          <ringGeometry args={[0.9, 1, perfil.segmentos]} />
          <meshBasicMaterial
            color={tintes.onda}
            transparent
            opacity={0}
            depthWrite={false}
            blending={blending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      {/* chispas de confirmacion (solo tiers con presupuesto) */}
      {perfil.chispas > 0 && (
        <points ref={puntosRef} key={perfil.chispas} visible={false}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={posChispas}
              count={perfil.chispas}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color={tintes.chispa}
            size={radio * 0.16}
            sizeAttenuation
            transparent
            opacity={0}
            depthWrite={false}
            blending={blending}
          />
        </points>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------------ *
 * <HotspotPop> — squash & stretch del mesh del hotspot.
 *
 * Envuelve al hijo en un grupo cuya escala sigue un resorte amortiguado
 * e^(-k·t)·sin(w·t): primero APLASTA (sy<1, sx/sz>1: conservacion de
 * volumen), luego estira con overshoot y asienta en 1. Con reduced-motion no
 * anima nada (grupo pasivo). Barato: un set de escala por frame y solo
 * durante ~0.85 s tras el toque.
 * ------------------------------------------------------------------------ */
export function HotspotPop({
  activo = false,
  reducedMotion = false,
  intensidad = 1,
  children,
}) {
  const ref = useRef(null);
  const t0 = useRef(-1e9);
  const pedirPop = useRef(false);
  const prevActivo = useRef(false);

  useEffect(() => {
    if (activo && !prevActivo.current) pedirPop.current = true;
    prevActivo.current = activo;
  }, [activo]);

  useFrame((state) => {
    const g = ref.current;
    if (!g || reducedMotion) return;
    const t = state.clock.elapsedTime;
    if (pedirPop.current) {
      pedirPop.current = false;
      t0.current = t;
    }
    const edad = t - t0.current;
    if (edad < 0 || edad > POP_FEEDBACK.duracion) {
      if (g.scale.x !== 1) g.scale.set(1, 1, 1);
      return;
    }
    const s =
      POP_FEEDBACK.amplitud *
      intensidad *
      Math.exp(-POP_FEEDBACK.amortiguacion * edad) *
      Math.sin(POP_FEEDBACK.frecuencia * edad);
    /* s>0 al arranque → squash primero; el seno amortiguado hace el resto */
    g.scale.set(1 + s * POP_FEEDBACK.ejeCruzado, 1 - s, 1 + s * POP_FEEDBACK.ejeCruzado);
  });

  return <group ref={ref}>{children}</group>;
}
