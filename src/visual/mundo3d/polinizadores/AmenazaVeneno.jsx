/*
 * AmenazaVeneno — LO QUE PASA CUANDO PASA.
 *
 * Sin sermón. Sin cartel rojo. Sin calavera. La regla de este componente es que
 * NADIE regañe a nadie: solo pasa una nube, y después la finca es otra.
 *
 * ── LO QUE SE VE ────────────────────────────────────────────────────────────
 * Una deriva pálida entra POR EL LADO, desde el lote de al lado. Eso no es un
 * capricho de dirección: es el caso más común y más injusto que hay — el vecino
 * fumiga y el producto se le viene encima a usted sin que usted haya hecho nada
 * mal. Cruza despacio, casi elegante, con un color que no es rojo de alarma sino
 * un verde-gris enfermizo, de esos que uno no sabe nombrar y le dan mala espina.
 *
 * Cuando pasa:
 *   · Los hilos que alcanza no se borran: se quedan colgando en CENIZA,
 *     parpadeando, y se van. Un tejido roto se ve peor que un tejido ausente.
 *   · Los bichos que alcanza no se desvanecen con gracia: simplemente YA NO
 *     ESTÁN. La finca se queda callada.
 *   · Y como la red se cayó, la fruta se cae con ella. Eso no lo hace este
 *     componente: lo hace la aritmética de la finca, que es lo que le da peso.
 *
 * ── LA HORA IMPORTA (y esto es lo accionable) ───────────────────────────────
 * El daño DEPENDE DE LA HORA, porque las abejas tienen horario y el veneno no.
 * Fumigar en plena mañana, con todo el mundo volando en la floración, arrasa.
 * Fumigar al atardecer o de noche, con las colonias recogidas, alcanza a muchas
 * menos. No es que sea inofensivo —el residuo queda en la flor y las alcanza al
 * otro día—, pero la diferencia es enorme y es GRATIS. Acá esa diferencia no está
 * escrita en ningún texto: está en la mecánica. Fumigue de noche en este mundo y
 * verá que el enjambre sobrevive. Esa es la clase entera.
 *
 * ── LO SISTÉMICO ────────────────────────────────────────────────────────────
 * Los neonicotinoides no se quedan encima de la hoja: la planta los CHUPA y
 * quedan adentro, en toda ella — incluido el néctar y el polen que la flor le
 * ofrece al que la visita. La flor se vuelve la trampa. Por eso, después de la
 * deriva, un tinte enfermo se queda un buen rato en el aire bajo de la finca,
 * mucho después de que la nube ya pasó: el veneno se fue, y sigue ahí.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { PAL, DANO_POR_HORA } from './polinizadoresIdentidad.js';
import { FINCA } from './sembrado.js';

/** Textura suave de la deriva, generada en runtime (cero assets). */
function texturaDeriva() {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.45, 'rgba(240,246,236,0.4)');
  g.addColorStop(1, 'rgba(240,246,236,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * La deriva del veneno.
 * @param {Object} props
 * @param {boolean} props.activa  arranca la pasada
 * @param {Object} props.telar    el telar (los hilos que corta)
 * @param {'dia'|'noche'} [props.momento]  LA HORA: decide cuánto alcanza
 * @param {'alto'|'medio'|'bajo'} [props.tier]
 * @param {boolean} [props.reducedMotion]
 * @param {(diezmado:number)=>void} [props.onDano]  cuánto del enjambre se llevó
 * @param {()=>void} [props.onFin]  la nube terminó de cruzar
 */
export default function AmenazaVeneno({
  activa = false,
  telar,
  momento = 'dia',
  tier = 'alto',
  reducedMotion = false,
  onDano,
  onFin,
}) {
  const { camera } = useThree();
  const tex = useMemo(() => texturaDeriva(), []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        color: PAL.veneno,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        fog: false,
      }),
    [tex],
  );
  const geo = useMemo(() => new THREE.PlaneGeometry(4.6, 2.6), []);

  /* Unas pocas cartas: la deriva es un frente, no una partícula. */
  const cartas = useMemo(() => {
    const n = tier === 'bajo' ? 3 : tier === 'medio' ? 5 : 8;
    return Array.from({ length: n }, (_, i) => ({
      dz: -4.4 + (i / Math.max(1, n - 1)) * 8.2,
      dy: 0.5 + (i % 3) * 0.55,
      fase: i * 1.7,
      retraso: (i % 4) * 0.12,
    }));
  }, [tier]);

  const grupo = useRef(null);
  /* El avance de la nube (0..1) y si ya cobró su daño en esta pasada. */
  const paso = useRef(0);
  const cobrado = useRef(false);
  const corrio = useRef(false);

  useLayoutEffect(() => {
    if (activa) {
      paso.current = 0;
      cobrado.current = false;
      corrio.current = true;
    }
  }, [activa]);

  useLayoutEffect(
    () => () => {
      tex.dispose();
      mat.dispose();
      geo.dispose();
    },
    [tex, mat, geo],
  );

  useFrame((state, dtCrudo) => {
    const g = grupo.current;
    if (!g) return;
    const dt = Math.min(dtCrudo, 0.05);
    const t = state.clock.elapsedTime;

    if (!activa && paso.current >= 1) {
      mat.opacity = 0;
      return;
    }
    if (!activa && !corrio.current) return;

    // Cruza en unos 9 segundos: despacio, casi elegante. Lo peor no llega
    // corriendo.
    paso.current = Math.min(1, paso.current + dt / (reducedMotion ? 1 : 9));
    const p = paso.current;

    // Entra por la derecha (el lote del vecino) y barre hacia la izquierda.
    const x0 = FINCA.radio + 3;
    const x1 = -FINCA.radio - 3;
    const x = x0 + (x1 - x0) * p;

    /* EL COBRO: cuando el frente llega al centro de la finca, alcanza a los que
       están trabajando. La hora decide cuántos. */
    if (!cobrado.current && p > 0.45) {
      cobrado.current = true;
      const dano = DANO_POR_HORA[momento] ?? DANO_POR_HORA.dia;
      if (telar) telar.cortar(dano);
      onDano?.(dano);
    }

    if (p >= 1) {
      mat.opacity = 0;
      corrio.current = false;
      onFin?.();
      return;
    }

    // La nube entra, se planta y se va; nunca del todo opaca (una deriva se ve
    // apenas, y eso es lo peor que tiene: casi no se nota que pasó).
    const entrada = Math.min(1, p / 0.12);
    const salida = Math.min(1, (1 - p) / 0.18);
    mat.opacity = 0.34 * entrada * salida;

    for (let i = 0; i < g.children.length; i++) {
      const carta = g.children[i];
      const c = cartas[i];
      const px = x + Math.sin(t * 0.3 + c.fase) * 0.5 + c.retraso * 3;
      const py = c.dy + (reducedMotion ? 0 : Math.sin(t * 0.4 + c.fase) * 0.12);
      carta.position.set(px, py, c.dz);
      carta.quaternion.copy(camera.quaternion); // cartas: se leen desde cualquier lado
    }
  });

  return (
    <group ref={grupo} renderOrder={3}>
      {cartas.map((c, i) => (
        <mesh key={i} geometry={geo} material={mat} position={[FINCA.radio + 3, c.dy, c.dz]} />
      ))}
    </group>
  );
}
