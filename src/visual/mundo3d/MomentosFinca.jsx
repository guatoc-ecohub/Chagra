/*
 * MomentosFinca — el kit de MOMENTOS del espejo vivo.
 *
 * Cuatro beats reutilizables que celebran que el DATO REAL cambió, con el
 * lenguaje rubber-hose de la casa (anticipación → overshoot → asentar):
 *
 *   · <MomentoNace/>    — una semilla BROTA de la tierra: el montículo se
 *                         abomba, el tallo sube con overshoot, dos hojas se
 *                         despliegan, halo cálido + motas.
 *   · <MomentoCrece/>   — una mata SUBE un escalón: squash de impulso,
 *                         estirón con overshoot (Y adelante, XZ con retraso),
 *                         onda-anillo en la base y una hoja nueva.
 *   · <MomentoCosecha/> — un fruto se RECOGE: se mece en la rama, ¡pop!,
 *                         arco parabólico al canasto, el canasto recibe con
 *                         squash y saltan chispitas tibias.
 *   · <MomentoVende/>   — un producto/animal se VENDE: se orienta al camino,
 *                         trota a saltitos, llega, mira atrás, hace una VENIA
 *                         (el adiós) y se desvanece hacia arriba, suave.
 *
 * CONTRATO (los cuatro comparten props):
 *   activo        — el gatillo del beat. false → no se dibuja nada. true →
 *                   corre UNA vez, queda en su estado final y llama onFin().
 *   tier          — 'alto'|'medio'|'bajo' (decidirTier). En 'bajo' no se anima.
 *   reducedMotion — true → estado FINAL directo, sin animación (y onFin()).
 *   onFin         — callback al terminar (animado o directo). Úselo para
 *                   apagar el gatillo / encolar el siguiente beat.
 *   claveBeat     — (opcional) cambie este valor para RE-DISPARAR el mismo
 *                   momento sin desmontar (p. ej. dos cosechas seguidas).
 *   position      — base del momento en la escena; origen/destino son LOCALES.
 *
 * TERMINA LIMPIO: al final todo brillo queda en opacidad 0 y toda mota
 * invisible; el estado final es información quieta (el brote entero, la mata
 * ya crecida, el fruto dentro del canasto, el vendido ya despedido).
 *
 * CABLEO (para el host — no toca ninguna escena existente):
 *   1. Montar DENTRO del <Canvas> de una escena con luz (EscenaBase3D ya la
 *      tiene): los cuerpos usan meshLambertMaterial como el resto del mundo.
 *   2. Disparo típico: un efecto que observa el dato real y arma el beat —
 *        <MomentoCosecha
 *          activo={!!beat} claveBeat={beat?.id}
 *          origen={[0, 1.05, 0]} destino={[0.85, 0, 0.5]}
 *          tier={tier} reducedMotion={reducedMotion}
 *          onFin={() => setBeat(null)}
 *        />
 *   3. Bajo reduced-motion el frameloop del host suele ir en 'demand':
 *      por eso el reposo (p=1) se aplica en useLayoutEffect, nunca en useFrame
 *      (mismo patrón que AnimalMomento).
 *   4. La partitura (duraciones, fases, colores) vive en ./momentosData.js.
 */
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PALETA } from './atmosferaMadre.js';
import {
  clamp01,
  lerp,
  easeOutCubic,
  easeInCubic,
  easeInOutSine,
  easeOutBack,
  fase,
  respiro,
  DUR_MOMENTO,
  FASES_MOMENTO,
  AJUSTE_MOMENTO,
  LUZ_MOMENTO,
} from './momentosData.js';

/* ------------------------------------------------------------------ el beat */

/*
 * useBeat — el reloj compartido de los cuatro momentos.
 *
 * Animando: useFrame lleva p∈[0,1] contra el reloj de la escena y llama
 * aplicar(p) por frame; al llegar a 1 dispara onFin UNA vez y se apaga.
 * En reposo (reduced-motion o tier bajo): aplica p=1 en el layout y difiere
 * onFin a un tick (el padre puede desmontar sin pisar el commit de React).
 * aplicar/onFin viajan por ref (patrón latest-ref) para no re-armar el beat
 * cuando el padre re-renderiza con closures nuevas.
 */
function useBeat({ activo, animar, dur, claveBeat, aplicar, onFin }) {
  const inicio = useRef(null);
  const listo = useRef(false);
  const aplicarRef = useRef(aplicar);
  const onFinRef = useRef(onFin);

  useLayoutEffect(() => {
    aplicarRef.current = aplicar;
    onFinRef.current = onFin;
  });

  useLayoutEffect(() => {
    inicio.current = null;
    listo.current = false;
    if (!activo) return undefined;
    if (!animar) {
      aplicarRef.current(1);
      listo.current = true;
      const id = setTimeout(() => onFinRef.current && onFinRef.current(), 0);
      return () => clearTimeout(id);
    }
    aplicarRef.current(0);
    return undefined;
  }, [activo, animar, claveBeat]);

  useFrame((state) => {
    if (!activo || !animar || listo.current) return;
    if (inicio.current == null) inicio.current = state.clock.elapsedTime;
    const p = clamp01((state.clock.elapsedTime - inicio.current) / dur);
    aplicarRef.current(p);
    if (p >= 1) {
      listo.current = true;
      if (onFinRef.current) onFinRef.current();
    }
  });
}

/* Motas tenues que suben y se desvanecen (el mismo gesto tibio del corral).
   El dueño las mueve por ref con `subirMotas`; aquí solo se dibujan. */
function MotasBeat({ refGrupo, color, position = /** @type {[number, number, number]} */([0, 0, 0]) }) {
  return (
    <group ref={refGrupo} position={position} visible={false}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={/** @type {[number, number, number]} */([(k - 1) * 0.09, 0, (k - 1) * 0.05])}>
          <octahedronGeometry args={[0.032, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/* t∈[0,1] local de las motas: suben desde `base` y respiran en opacidad.
   A t≥1 el grupo queda invisible (el beat termina limpio). */
function subirMotas(grupo, t, base) {
  if (!grupo) return;
  grupo.visible = t > 0 && t < 0.98;
  grupo.children.forEach((mo, i) => {
    const f = clamp01(t * 1.4 - i * 0.12);
    mo.position.y = base + f * (base * 0.8 + 0.45);
    if (mo.material) mo.material.opacity = 0.8 * Math.sin(f * Math.PI);
  });
}

const animarBeat = (reducedMotion, tier) => !reducedMotion && tier !== 'bajo';

/* ======================================================================= 1 */
/* MomentoNace — la semilla brota. Estado final: el brote entero, dos hojas. */
export function MomentoNace({
  activo = false,
  tier = 'alto',
  reducedMotion = false,
  onFin,
  claveBeat,
  position = /** @type {[number, number, number]} */([0, 0, 0]),
  colorBrote = PALETA.follajeClaro,
}) {
  const monticulo = useRef(null);
  const cascara = useRef(null);
  const brote = useRef(null); // tallo + hojas (balanceo del asentar)
  const tallo = useRef(null);
  const hojasG = useRef(null); // viaja a la punta del tallo mientras crece
  const hojaIzq = useRef(null);
  const hojaDer = useRef(null);
  const halo = useRef(null);
  const motas = useRef(null);

  const animar = animarBeat(reducedMotion, tier);
  const F = FASES_MOMENTO.nace;
  const { altoTallo, aperturaHoja, plegadaHoja } = AJUSTE_MOMENTO.nace;

  const aplicar = (p) => {
    if (!tallo.current) return;
    const ant = fase(p, F.anticipa[0], F.anticipa[1]);
    const bro = fase(p, F.brota[0], F.brota[1]);
    const abr = fase(p, F.abre[0], F.abre[1]);
    const ase = fase(p, F.asienta[0], F.asienta[1]);

    // la tierra se abomba: algo empuja desde abajo (anticipación)
    if (monticulo.current) {
      const abomba = Math.sin(ant * Math.PI) * (1 - bro);
      monticulo.current.scale.set(1 + 0.06 * abomba, 0.55 + 0.14 * abomba, 1 + 0.06 * abomba);
    }

    // la cascarita se ladea y se entierra al paso del tallo
    if (cascara.current) {
      const c = cascara.current;
      c.rotation.z = 1.2 * easeOutCubic(bro);
      c.position.set(0.06 * bro, 0.1 - 0.12 * easeInCubic(bro), 0);
      c.scale.setScalar(Math.max(0.001, 1 - 0.9 * bro));
      c.visible = bro < 0.95;
    }

    // el tallo sube con overshoot; las hojas viajan en su punta
    const crece = Math.max(0.001, easeOutBack(bro));
    tallo.current.scale.set(0.7 + 0.3 * crece, crece, 0.7 + 0.3 * crece);
    if (hojasG.current) hojasG.current.position.y = altoTallo * crece;

    // las hojas se despliegan (cada una con su propio overshoot)
    const abre = easeOutBack(abr);
    const sHoja = Math.max(0.001, 0.2 + 0.8 * abre);
    if (hojaIzq.current) {
      hojaIzq.current.rotation.z = plegadaHoja - aperturaHoja * abre;
      hojaIzq.current.scale.setScalar(sHoja);
    }
    if (hojaDer.current) {
      hojaDer.current.rotation.z = -(plegadaHoja - aperturaHoja * abre);
      hojaDer.current.scale.setScalar(sHoja);
    }

    // el respiro final: el brote se mece y se aquieta
    if (brote.current) brote.current.rotation.z = respiro(ase, 3, 0.07);

    // halo cálido que se expande y muere en 0 (limpio)
    if (halo.current) {
      halo.current.scale.setScalar(0.3 + 1.6 * easeOutCubic(ase));
      halo.current.material.opacity = ase > 0 ? 0.45 * (1 - ase) : 0;
    }
    subirMotas(motas.current, ase, altoTallo * 0.6);
  };

  useBeat({ activo, animar, dur: DUR_MOMENTO.nace, claveBeat, aplicar, onFin });

  if (!activo) return null;
  return (
    <group position={position}>
      {/* el montículo de tierra removida */}
      <mesh ref={monticulo} position={/** @type {const} */([0, 0.02, 0])}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshLambertMaterial color={PALETA.tierra} flatShading />
      </mesh>

      {/* la cascarita de la semilla, que se ladea al brotar */}
      <mesh ref={cascara} position={/** @type {const} */([0, 0.1, 0])}>
        <sphereGeometry args={[0.055, 8, 6]} />
        <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
      </mesh>

      {/* el brote: tallo que crece desde la base + hojas en la punta */}
      <group ref={brote} position={/** @type {const} */([0, 0.08, 0])}>
        <group ref={tallo}>
          <mesh position={/** @type {[number, number, number]} */([0, altoTallo / 2, 0])}>
            <cylinderGeometry args={[0.018, 0.028, altoTallo, 5]} />
            <meshLambertMaterial color={colorBrote} flatShading />
          </mesh>
        </group>
        <group ref={hojasG}>
          <group ref={hojaIzq}>
            <mesh position={/** @type {const} */([-0.1, 0.01, 0])} rotation={[0, 0, 0.3]} scale={[1, 0.35, 0.6]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshLambertMaterial color={colorBrote} flatShading />
            </mesh>
          </group>
          <group ref={hojaDer}>
            <mesh position={/** @type {const} */([0.1, 0.01, 0])} rotation={[0, 0, -0.3]} scale={[1, 0.35, 0.6]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              <meshLambertMaterial color={colorBrote} flatShading />
            </mesh>
          </group>
        </group>
      </group>

      {/* el brillo del nacimiento */}
      <mesh ref={halo} position={/** @type {const} */([0, 0.3, 0])}>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshBasicMaterial color={LUZ_MOMENTO.halo} transparent opacity={0} depthWrite={false} />
      </mesh>

      <MotasBeat refGrupo={motas} color={LUZ_MOMENTO.motaTibia} />
    </group>
  );
}

/* ======================================================================= 2 */
/*
 * MomentoCrece — la mata sube UN escalón (escalaDe → escalaA).
 * Con `children` anima ESA mata (envuélvala aquí y pase sus escalas);
 * sin children dibuja una mata genérica de la casa. Estado final: la mata
 * en escalaA con su hoja nueva encendida.
 */
export function MomentoCrece({
  activo = false,
  tier = 'alto',
  reducedMotion = false,
  onFin,
  claveBeat,
  position = /** @type {const} */([0, 0, 0]),
  escalaDe = 1,
  escalaA = 1.35,
  colorCopa = PALETA.follaje,
  children,
}) {
  const cuerpo = useRef(null);
  const anillo = useRef(null);
  const hojaNueva = useRef(null);
  const motas = useRef(null);

  const animar = animarBeat(reducedMotion, tier);
  const F = FASES_MOMENTO.crece;
  const { dipAnticipa, contraXZ, radioAnillo } = AJUSTE_MOMENTO.crece;

  const aplicar = (p) => {
    const c = cuerpo.current;
    if (!c) return;
    const ant = fase(p, F.anticipa[0], F.anticipa[1]);
    const est = fase(p, F.estira[0], F.estira[1]);
    const ase = fase(p, F.asienta[0], F.asienta[1]);

    // Y sube con overshoot; XZ lo sigue con retraso → el estirón se SIENTE
    let sy = lerp(escalaDe, escalaA, easeOutBack(est));
    let sxz = lerp(escalaDe, escalaA, easeOutCubic(est));

    // anticipación: se agacha (Y baja, XZ se abre — conserva el volumen)
    const dip = Math.sin(ant * Math.PI) * (1 - est);
    sy *= 1 - dipAnticipa * dip;
    sxz *= 1 + contraXZ * dip;

    // el respiro del asentar
    sy *= 1 + respiro(ase, 3, 0.04);
    c.scale.set(sxz, Math.max(0.001, sy), sxz);

    // la onda-anillo que emana de la base
    if (anillo.current) {
      anillo.current.scale.setScalar(0.2 + 1.5 * easeOutCubic(ase));
      anillo.current.material.opacity = ase > 0 && ase < 1 ? 0.4 * (1 - ase) : 0;
      anillo.current.visible = ase > 0 && ase < 1;
    }

    // la hoja nueva se enciende arriba, con su mini-overshoot
    if (hojaNueva.current) {
      const h = easeOutBack(fase(p, 0.74, 0.94));
      hojaNueva.current.scale.setScalar(Math.max(0.001, h));
    }
    subirMotas(motas.current, ase, 0.55 * escalaA);
  };

  useBeat({ activo, animar, dur: DUR_MOMENTO.crece, claveBeat, aplicar, onFin });

  if (!activo) return null;
  return (
    <group position={position}>
      <group ref={cuerpo}>
        {children || (
          <group>
            <mesh position={/** @type {const} */([0, 0.16, 0])}>
              <cylinderGeometry args={[0.03, 0.045, 0.32, 5]} />
              <meshLambertMaterial color={PALETA.madera} flatShading />
            </mesh>
            <mesh position={/** @type {const} */([0, 0.4, 0])}>
              <sphereGeometry args={[0.19, 9, 7]} />
              <meshLambertMaterial color={colorCopa} flatShading />
            </mesh>
            <mesh position={/** @type {const} */([0.12, 0.32, 0.06])}>
              <sphereGeometry args={[0.12, 8, 6]} />
              <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
            </mesh>
            <mesh position={/** @type {const} */([-0.11, 0.34, -0.05])}>
              <sphereGeometry args={[0.11, 8, 6]} />
              <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
            </mesh>
          </group>
        )}
        {/* la hoja nueva del escalón: brota en la copa al asentar */}
        <mesh ref={hojaNueva} position={/** @type {const} */([0.02, 0.58, 0.04])} scale={0.001}>
          <sphereGeometry args={[0.055, 7, 6]} />
          <meshLambertMaterial color={PALETA.follajeClaro} flatShading />
        </mesh>
      </group>

      {/* la onda que emana de la base */}
      <mesh ref={anillo} position={/** @type {const} */([0, 0.02, 0])} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radioAnillo, 0.02, 6, 24]} />
        <meshBasicMaterial
          color={LUZ_MOMENTO.anillo}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      <MotasBeat refGrupo={motas} color={LUZ_MOMENTO.motaBrote} />
    </group>
  );
}

/* ======================================================================= 3 */
/*
 * MomentoCosecha — el fruto viaja de la rama al canasto.
 * `origen` = de dónde cuelga el fruto; `destino` = pie del canasto (ambos
 * LOCALES a `position`). Estado final: fruto dentro del canasto.
 */
export function MomentoCosecha({
  activo = false,
  tier = 'alto',
  reducedMotion = false,
  onFin,
  claveBeat,
  position = /** @type {[number, number, number]} */([0, 0, 0]),
  origen = /** @type {const} */([0, 1.05, 0]),
  destino = /** @type {const} */([0.85, 0, 0.5]),
  colorFruto = LUZ_MOMENTO.fruto,
}) {
  const pivoteRama = useRef(null); // rama + fruto colgando (el vaivén)
  const fruto = useRef(null);
  const canasto = useRef(null);
  const motas = useRef(null);

  const animar = animarBeat(reducedMotion, tier);
  const F = FASES_MOMENTO.cosecha;
  const { alturaArco, estironVuelo, squashCanasto } = AJUSTE_MOMENTO.cosecha;

  // el fruto asienta ADENTRO del canasto, no en su pie
  const posada = [destino[0], destino[1] + 0.16, destino[2]];

  const aplicar = (p) => {
    const f = fruto.current;
    if (!f) return;
    const ant = fase(p, F.anticipa[0], F.anticipa[1]);
    const des = fase(p, F.desprende[0], F.desprende[1]);
    const vue = fase(p, F.vuela[0], F.vuela[1]);
    const pos = fase(p, F.posa[0], F.posa[1]);

    // la rama se mece cargando el gesto, y rebota al soltar (follow-through)
    if (pivoteRama.current) {
      const carga = Math.sin(ant * Math.PI * 3) * 0.24 * ant * (1 - des);
      const rebote = respiro(fase(p, 0.34, 0.72), 4, 0.16);
      pivoteRama.current.rotation.z = carga + rebote;
    }

    if (vue <= 0) {
      // colgando: el ¡pop! del desprendimiento es un estirón hacia arriba
      const estiron = Math.sin(des * Math.PI) * 0.3;
      f.position.set(origen[0], origen[1] + 0.08 * easeOutCubic(des), origen[2]);
      f.scale.set(1 - estiron * 0.4, 1 + estiron, 1 - estiron * 0.4);
    } else {
      // el arco al canasto: stretch en pleno vuelo, squash al tocar
      const e = easeInOutSine(vue);
      const arco = Math.sin(Math.PI * e) * alturaArco;
      f.position.set(
        lerp(origen[0], posada[0], e),
        lerp(origen[1] + 0.08, posada[1], e) + arco,
        lerp(origen[2], posada[2], e),
      );
      const st = Math.sin(Math.PI * e) * estironVuelo;
      f.scale.set(1 - st * 0.5, 1 + st, 1 - st * 0.5);
    }

    // el canasto recibe con squash y su propio respiro
    if (canasto.current) {
      const sq = pos > 0 && pos < 1 ? 1 - squashCanasto * Math.sin(pos * Math.PI) : 1;
      canasto.current.scale.set(2 - sq, sq, 2 - sq);
    }
    subirMotas(motas.current, pos, posada[1] + 0.1);
  };

  useBeat({ activo, animar, dur: DUR_MOMENTO.cosecha, claveBeat, aplicar, onFin });

  if (!activo) return null;
  return (
    <group position={position}>
      {/* la ramita de la que cuelga el fruto */}
      <group ref={pivoteRama} position={/** @type {[number, number, number]} */([origen[0], origen[1] + 0.12, origen[2]])}>
        <mesh rotation={[0, 0, 1.15]} position={/** @type {const} */([-0.1, 0.04, 0])}>
          <cylinderGeometry args={[0.014, 0.02, 0.3, 5]} />
          <meshLambertMaterial color={PALETA.follajeOscuro} flatShading />
        </mesh>
      </group>

      {/* el fruto que viaja */}
      <mesh ref={fruto} position={origen}>
        <sphereGeometry args={[0.09, 9, 7]} />
        <meshLambertMaterial color={colorFruto} flatShading />
      </mesh>

      {/* el canasto que recibe */}
      <group ref={canasto} position={destino}>
        <mesh position={/** @type {const} */([0, 0.11, 0])}>
          <cylinderGeometry args={[0.21, 0.15, 0.22, 9]} />
          <meshLambertMaterial color={PALETA.maderaClara} flatShading />
        </mesh>
        <mesh position={/** @type {const} */([0, 0.22, 0])} rotation={[-Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.21, 0.022, 6, 14]} />
          <meshLambertMaterial color={PALETA.madera} flatShading />
        </mesh>
      </group>

      {/* las chispas nacen donde POSA el fruto, no en la rama */}
      <MotasBeat refGrupo={motas} color={LUZ_MOMENTO.chispa} position={/** @type {[number, number, number]} */([posada[0], 0, posada[2]])} />
    </group>
  );
}

/* ======================================================================= 4 */
/*
 * MomentoVende — el producto/animal VIAJA y se DESPIDE. Trota a saltitos de
 * `origen` a `destino`, mira atrás, hace una venia (sube el adiós tibio) y se
 * desvanece hacia arriba. Con `children` despide ESE cuerpo (p. ej. las
 * partes de un animal del corral); sin children despide un costalito de
 * cosecha. Estado final: ya partió (nada queda — solo el dato viajó).
 */
export function MomentoVende({
  activo = false,
  tier = 'alto',
  reducedMotion = false,
  onFin,
  claveBeat,
  position = /** @type {[number, number, number]} */([0, 0, 0]),
  origen = /** @type {const} */([0, 0, 0]),
  destino = /** @type {const} */([2.2, 0, -1.4]),
  colorBulto = PALETA.ambar,
  children = null,
}) {
  const raiz = useRef(null); // posición en el mundo
  const cuerpo = useRef(null); // squash/stretch, giro y venia
  const motas = useRef(null);

  const animar = animarBeat(reducedMotion, tier);
  const F = FASES_MOMENTO.vende;
  const { saltos, altoSalto, venia, subidaAdios } = AJUSTE_MOMENTO.vende;

  // hacia dónde mira al partir (convención r3f: atan2(dx, dz))
  const rumbo = Math.atan2(destino[0] - origen[0], destino[2] - origen[2]);

  const aplicar = (p) => {
    const r = raiz.current;
    const c = cuerpo.current;
    if (!r || !c) return;
    const ant = fase(p, F.anticipa[0], F.anticipa[1]);
    const via = fase(p, F.viaja[0], F.viaja[1]);
    const desp = fase(p, F.despide[0], F.despide[1]);
    const parte = fase(p, F.parte[0], F.parte[1]);

    // viaje a saltitos: cada brinco estira al subir y aplasta al caer
    const e = easeInOutSine(via);
    const brinco = Math.abs(Math.sin(e * Math.PI * saltos)) * (via > 0 && via < 1 ? 1 : 0);
    r.position.set(
      lerp(origen[0], destino[0], e),
      lerp(origen[1], destino[1], e) + brinco * altoSalto + subidaAdios * easeInCubic(parte),
      lerp(origen[2], destino[2], e),
    );

    // anticipación: se agacha y toma rumbo; al despedirse mira ATRÁS
    const agacha = Math.sin(ant * Math.PI) * (1 - via);
    c.rotation.y = rumbo * easeOutCubic(ant) + Math.PI * easeInOutSine(desp);
    c.rotation.x = venia * Math.sin(desp * Math.PI); // la venia, y vuelve

    // squash&stretch del trote + el agache + la partida (se encoge a nada)
    const chico = Math.max(0.001, 1 - easeInCubic(parte));
    const sy = (1 - 0.16 * agacha + 0.3 * brinco) * chico;
    const sxz = (1 + 0.1 * agacha - 0.14 * brinco) * chico;
    c.scale.set(sxz, sy, sxz);
    c.visible = parte < 1;

    // el adiós tibio que sube mientras hace la venia
    if (motas.current) motas.current.position.copy(r.position);
    subirMotas(motas.current, desp, 0.5);
  };

  useBeat({ activo, animar, dur: DUR_MOMENTO.vende, claveBeat, aplicar, onFin });

  if (!activo) return null;
  return (
    <group position={position}>
      <group ref={raiz}>
        <group ref={cuerpo}>
          {children || (
            <group>
              {/* el costalito de cosecha: panza, boca amarrada y su nudito */}
              <mesh position={/** @type {const} */([0, 0.16, 0])} scale={[1, 1.15, 0.92]}>
                <sphereGeometry args={[0.16, 9, 7]} />
                <meshLambertMaterial color={colorBulto} flatShading />
              </mesh>
              <mesh position={/** @type {const} */([0, 0.33, 0])}>
                <cylinderGeometry args={[0.045, 0.075, 0.09, 6]} />
                <meshLambertMaterial color={colorBulto} flatShading />
              </mesh>
              <mesh position={/** @type {const} */([0, 0.39, 0])}>
                <sphereGeometry args={[0.035, 7, 6]} />
                <meshLambertMaterial color={PALETA.maderaOscura} flatShading />
              </mesh>
            </group>
          )}
        </group>
      </group>

      <MotasBeat refGrupo={motas} color={LUZ_MOMENTO.motaTibia} />
    </group>
  );
}
