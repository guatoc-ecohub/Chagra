/*
 * useEntradaAbeja + AbejaEscena — LA COREOGRAFÍA COMPARTIDA de Angelita.
 *
 * El DR de mundos-3D pide que "la abeja baja y entra" viva UNA sola vez y la
 * herede toda escena-mundo (§4.4). Aquí está: extraída del `CompaneroAbeja` del
 * valle (Valle3D), generalizada para cualquier arquetipo. La ESCENA solo le pasa
 * el `foco` (posición del hotspot activo o el centro del diorama); el hook mueve
 * a Angelita con `lerp` hacia él, la hace flotar según su energía, y la voltea a
 * mirar hacia donde viaja. El CUERPO siempre es `<AbejaAngelita>` (la creature
 * de la librería): la escena POSEE la coreografía, la creature POSEE el cuerpo.
 *
 * Vive dentro de escenas/ (chunk perezoso `vendor-three`): importa @react-three
 * y three, así que NUNCA se importa desde el barrel base del framework.
 */
/* eslint-disable react-refresh/only-export-components -- este módulo (hook de
   coreografía + su componente de escena) se importa SIEMPRE perezoso dentro de
   un <Canvas> vía EscenaBase3D; no es hot-reload-sensible. Van juntos a propósito:
   la creature posee el cuerpo, la escena posee la coreografía (contrato del DR). */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { AbejaAngelita } from '../../creatures/AbejaAngelita.jsx';
import { SombraContacto } from './SombraContacto.jsx';
import { reaccionDeFinca } from './reaccionFinca.js';
import useHaptics from '../useHaptics.js';

/* Vuelo neutro: cuando la escena aún no pasa `estadoFinca` (contrato viejo),
   la coreografía se comporta EXACTO como antes (todos los multiplicadores en 1). */
const VUELO_NEUTRO = { altura: 1, velocidad: 1, vagar: 1, tiembla: 0 };

/**
 * Devuelve `{ ref, caraRef, sombraRef }` para colgar del `<group>` de la abeja,
 * de su cara (para el volteo) y de su sombra de contacto (el blob que la sigue
 * por el piso — auditoría 3D: la abeja no debe volar "a la deriva").
 * Corre `useFrame` (debe usarse DENTRO de un `<Canvas>`).
 *
 * @param {THREE.Vector3} foco  a dónde va la abeja (hotspot activo o centro).
 * @param {object} [opts]
 * @param {boolean} [opts.entrando=true]  entrando = se posa junto al foco; si no, ronda.
 * @param {number}  [opts.energia=1]      0..1 — vivacidad del vuelo (de la salud real).
 * @param {boolean} [opts.reducedMotion=false]  congela el vaivén a un fotograma.
 * @param {number}  [opts.piso=0]  y del suelo donde se proyecta la sombra.
 * @param {object}  [opts.vuelo]  modificadores de reaccionDeFinca: mojada vuela
 *   más bajo/lento, sed baja a buscar agua, comiendo tiembla mordisqueando.
 *   `{ altura, velocidad, vagar, tiembla }` — multiplicadores (1 = vuelo normal).
 */
export function useEntradaAbeja(foco, {
  entrando = true, energia = 1, reducedMotion = false, piso = 0, vuelo = VUELO_NEUTRO,
} = {}) {
  const ref = useRef(null);
  const caraRef = useRef(null);
  const sombraRef = useRef(null);
  const prevX = useRef(foco.x);
  // Háptica de "posarse" (DR-3D-HAPTICA): UNA sola vez por foco, al cruzar el
  // umbral de llegada. El foco solo cambia por tap del usuario (hotspot) o al
  // montar la escena (que nace de un tap para entrar al mundo) → gesto-derivado.
  const haptics = useHaptics({ reducedMotion });
  const posadaEn = useRef(null); // el foco ya celebrado (no repetir por frame)
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // El estado de la finca modula el vuelo: mojada pesa (baja/lenta), sed baja a
    // buscar agua, comiendo tiembla mordisqueando. Multiplicadores de reaccionDeFinca.
    const mAltura = vuelo?.altura ?? 1;
    const mVel = vuelo?.velocidad ?? 1;
    const mVagar = vuelo?.vagar ?? 1;
    const tiembla = reducedMotion ? 0 : (vuelo?.tiembla ?? 0);
    const brio = (0.35 + 0.65 * energia) * mVel; // la energía y el clima animan el vuelo
    const bob = reducedMotion ? 0 : Math.sin(t * (1.6 + brio)) * (0.06 + 0.12 * brio);
    // Temblor de sed/mordisco: sacudida rápida y corta (nervio, no vaivén).
    const tembleque = tiembla ? Math.sin(t * 13) * tiembla : 0;
    // Al reposo deriva en un círculo calmo; al entrar se posa junto al lugar.
    const vagarX = reducedMotion || entrando ? 0 : Math.sin(t * 0.55) * 0.6 * mVagar;
    const vagarZ = reducedMotion || entrando ? 0 : Math.cos(t * 0.55) * 0.4 * mVagar;
    // La altura sobre el foco se atenúa con `mAltura` (mojada/sed vuelan más bajo).
    const alto = (entrando ? 0.85 : 1.6) * mAltura;
    const dest = new THREE.Vector3(
      foco.x + (entrando ? 0.45 : 0.35 + vagarX) + tembleque,
      foco.y + alto + bob + tembleque * 0.5,
      foco.z + (entrando ? 0.6 : 0.55 + vagarZ),
    );
    ref.current.position.lerp(dest, (entrando ? 0.06 : 0.05) * mVel);
    // Angelita se posa: al cruzar el umbral de llegada al foco, un roce háptico
    // (una vez por foco — el ref evita repetir por frame; el gate del hook
    // apaga todo con reduced-motion, pref 'off' o sin soporte).
    if (entrando && posadaEn.current !== foco && ref.current.position.distanceTo(dest) < 0.3) {
      posadaEn.current = foco;
      haptics.abeja();
    }
    if (caraRef.current) {
      const vx = ref.current.position.x - prevX.current;
      if (Math.abs(vx) > 0.0015) caraRef.current.style.transform = `scaleX(${vx < 0 ? -1 : 1})`;
      prevX.current = ref.current.position.x;
    }
    // La sombra de contacto la sigue por el piso: más alto vuela, más ancha y
    // más tenue (peso visual sin shadow-maps). Mismo frame, cero loops extra.
    if (sombraRef.current) {
      const pos = ref.current.position;
      const h = Math.max(0, pos.y - piso);
      sombraRef.current.position.set(pos.x, piso + 0.03, pos.z);
      sombraRef.current.scale.setScalar(1 + h * 0.15);
      sombraRef.current.material.opacity = Math.max(0.06, 0.3 - h * 0.06);
    }
  });
  return { ref, caraRef, sombraRef };
}

/**
 * Angelita ya montada en una escena: usa `useEntradaAbeja` para la coreografía y
 * dibuja el cuerpo (`AbejaAngelita`) como billboard `<Html>`. Es la ÚNICA abeja
 * dentro de un mundo (la del footer se oculta): por eso REFLEJA EL HABLA —pulsa
 * cuando el agente narra (`hablando`)— y da un microrrebote al tocar un hotspot
 * (`rebote`, un contador que sube por toque). Tres transformaciones en tres capas
 * DOM que no se pisan: pulso (raíz), rebote (medio), volteo scaleX (cara, que el
 * useFrame maneja imperativo). Cualquier arquetipo la coloca con
 * `<AbejaEscena foco=… animo=… energia=… hablando=… rebote=… reducedMotion=… />`.
 */
export function AbejaEscena({
  foco, entrando = true, animo = 'sereno', energia = 1, reducedMotion = false, piso = 0,
  hablando = false, rebote = 0,
  // ── EL ESTADO REAL DE LA FINCA (auditoría §5b) ─────────────────────────────
  //    Angelita SIEMPRE refleja tu realidad: llueve→mojada, Niño/sequía→sed,
  //    cosecha→come de eso, ánimo por salud. Interfaz LIMPIA; hoy MUESTRA, codex
  //    cabla el dato real con useFincaViva. Si NO se pasa, la abeja usa el
  //    `animo`/`energia` sueltos de siempre (contrato viejo intacto).
  estadoFinca = null, hayAlerta = false,
}) {
  // La CAPA de reacción (pura, desacoplada de la especie): del estado real sale
  // el ánimo, la energía, y el repertorio (mojada/sed/comiendo) + modificadores
  // de vuelo. Con estadoFinca manda la reacción; sin él, el contrato viejo.
  const reaccion = useMemo(
    () => (estadoFinca ? reaccionDeFinca(estadoFinca, { hayAlerta }) : null),
    [estadoFinca, hayAlerta],
  );
  const animoReal = reaccion?.animo ?? animo;
  const energiaReal = reaccion?.energia ?? energia;
  const mojada = reaccion?.mojada ?? false;
  const sed = reaccion?.sed ?? false;
  const comiendo = reaccion?.comiendo ?? false;
  const { ref, caraRef, sombraRef } = useEntradaAbeja(foco, {
    entrando, energia: energiaReal, reducedMotion, piso, vuelo: reaccion?.vuelo,
  });
  // Microrrebote: cada toque de hotspot sube `rebote`; reiniciamos la animación
  // CSS (quitar → reflow → poner) para que dispare aun en toques seguidos. El
  // gate reduced-motion la deja quieta.
  const reboteRef = useRef(null);
  useEffect(() => {
    if (reducedMotion || rebote === 0 || !reboteRef.current) return undefined;
    const el = reboteRef.current;
    el.removeAttribute('data-rebote');
    void el.offsetWidth; // fuerza reflow → reinicia el keyframe
    el.setAttribute('data-rebote', '1');
    const t = setTimeout(() => el.removeAttribute('data-rebote'), 640);
    return () => clearTimeout(t);
  }, [rebote, reducedMotion]);
  const size = 40 + Math.round(energiaReal * 12);
  const vivo = !reducedMotion;
  return (
    <>
      <group ref={ref} position={[foco.x + 0.45, foco.y + 0.85, foco.z + 0.6]}>
        <Html center distanceFactor={7} zIndexRange={[40, 10]}>
          {/* Reacción al estado real, también en el wrapper (brillo mojado,
              temblor sediento, bamboleo de mordisco — rubber-hose). Gate RM. */}
          <div
            className="mundo-abeja"
            aria-hidden="true"
            data-hablando={hablando && vivo ? '1' : undefined}
            data-mojada={mojada && vivo ? '1' : undefined}
            data-sed={sed && vivo ? '1' : undefined}
            data-comiendo={comiendo && vivo ? '1' : undefined}
          >
            <div ref={reboteRef} className="mundo-abeja__rebote">
              <div ref={caraRef} className="mundo-abeja__cara">
                <AbejaAngelita
                  size={size}
                  animo={animoReal}
                  energia={energiaReal}
                  mojada={mojada}
                  sed={sed}
                  comiendo={comiendo}
                  animated={vivo}
                />
              </div>
            </div>
          </div>
        </Html>
      </group>
      {/* Su sombra: hermana (NO hija) del group — vive en el piso, no vuela. */}
      <SombraContacto
        refExt={sombraRef}
        pos={[foco.x + 0.45, piso + 0.03, foco.z + 0.6]}
        radio={0.3}
        opacidad={0.24}
        orden={3}
      />
    </>
  );
}
