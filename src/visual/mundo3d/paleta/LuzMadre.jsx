/*
 * LuzMadre — la RECETA DE ILUMINACIÓN de la casa, como componente.
 *
 * EscenaBase3D ya monta esta luz para los mundos del framework, pero las
 * escenas que viven FUERA de la base (la galería de la sierra, un preview,
 * un mockup nuevo) venían calcando los números a mano — y cada calco deriva
 * (la sierra hoy ilumina 1.3 donde el valle ilumina 0.9). Este componente es
 * la receta exportada: cuatro luces, mismas proporciones, misma calidez
 * andina, en cualquier <Canvas>.
 *
 * La receta (proporciones de EscenaBase3D / cielosHoraData.dorada):
 *   1. hemisferio 0.55 — el domo dorado arriba, el rebote de tierra abajo.
 *      Es el 60% de la sensación: la luz "viene de un cielo", no de focos.
 *   2. ambiente   0.28 — un piso tibio para que la sombra nunca sea negra.
 *   3. sol        0.90 — la CLAVE direccional, dorada, baja ([6,9,4]).
 *      La única que proyecta sombra, y solo si el perfil lo permite (tier
 *      alto; en medio/bajo el shadow-map ni existe — DR FIX 1).
 *   4. relleno    0.22 — el contraluz FRÍO ([-5,4,-6]): el azul del cielo
 *      abierto que modela el lado en sombra sin aplanarlo.
 *
 * `madre` acepta cualquier preset con la forma de ATMOSFERA/CIELOS_HORA
 * (cielosHoraData): si trae sus propias intensidades por luz (hemisferio,
 * ambiente, sol, rellenoInt, solPos) se respetan — así la MISMA receta
 * amanece, dora o anochece sin tocar la escena.
 *
 * `cielo` es el tinte de FAMILIA del mundo (CIELOS.huerta, CIELOS.agua…):
 * se mezcla 60% hacia la madre con la ley de atmosferaMadre, igual que en
 * EscenaBase3D. Sin `cielo`, luce la madre pura.
 *
 * Costo: 4 luces y una mezcla memoizada. Nada por frame. El fondo y la
 * niebla NO van aquí (son de la escena): ver GUIA.md para el par de líneas.
 */
import { useMemo } from 'react';
import { ATMOSFERA, mezclarCielo } from '../atmosferaMadre.js';

/* Las proporciones de la casa, exportadas como dato (para consumidores no-r3f
   o para quien necesite leer la receta sin montar luces). */
export const LUZ_MADRE = {
  hemisferio: 0.55,
  ambiente: 0.28,
  sol: 0.9,
  relleno: 0.22,
  solPos: [6, 9, 4], // el sol dorado de la tarde (calca EscenaBase3D)
  rellenoPos: [-5, 4, -6], // el contraluz frío, opuesto y bajo
};

/**
 * @param {object} props
 * @param {object} [props.madre]   preset de atmósfera (ATMOSFERA o una franja
 *                                 de CIELOS_HORA). Default: la hora dorada.
 * @param {object} [props.cielo]   tinte de familia (CIELOS.huerta…); se mezcla
 *                                 60% hacia la madre. Default: madre pura.
 * @param {object} [props.perfil]  perfilDeTier(tier); decide castShadow.
 * @param {number} [props.escala]  atenuador global (1 = receta tal cual).
 */
export default function LuzMadre({
  madre = ATMOSFERA,
  cielo = null,
  perfil = null,
  escala = 1,
}) {
  /* La mezcla 60%-hacia-la-madre es la MISMA ley de EscenaBase3D (7 lerps,
     memoizados aquí): un consumidor standalone pinta IGUAL que el framework. */
  const c = useMemo(() => mezclarCielo(cielo, madre), [cielo, madre]);
  const k = (c.intensidad ?? 1) * escala;
  const sombras = !!(perfil && perfil.sombras);

  return (
    <>
      <hemisphereLight
        intensity={(madre.hemisferio ?? LUZ_MADRE.hemisferio) * k}
        color={c.cielo}
        groundColor={c.suelo}
      />
      <ambientLight
        intensity={(madre.ambiente ?? LUZ_MADRE.ambiente) * k}
        color={madre.luz}
      />
      <directionalLight
        position={madre.solPos ?? LUZ_MADRE.solPos}
        intensity={(madre.sol ?? LUZ_MADRE.sol) * k}
        color={madre.luz}
        castShadow={sombras}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight
        position={LUZ_MADRE.rellenoPos}
        intensity={(madre.rellenoInt ?? LUZ_MADRE.relleno) * escala}
        color={madre.relleno}
      />
    </>
  );
}
