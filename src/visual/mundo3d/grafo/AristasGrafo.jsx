/**
 * AristasGrafo.jsx — las relaciones, que son lo que este mapa vino a contar.
 *
 * Los nodos son sustantivos; las aristas son los VERBOS. Si las cinco relaciones
 * se dibujaran con la misma cuerda gris, el mapa diría "aquí hay 900 vínculos"
 * —cero información— en vez de "el maíz y el frijol se sostienen, esta avispa se
 * come ese gusano que se está comiendo su papa". Así que cada relación tiene un
 * TRAZO con carácter, y el carácter carga el significado (la tabla manda desde
 * `grafoPaleta.js`; aquí solo se obedece):
 *
 *   se ayudan    → cuerda verde GRUESA y TRENZADA (dos hebras que se cruzan),
 *                  combada hacia el cerro: se abrazan. La milpa se ve milpa.
 *   se estorban  → trazo rojo ROTO (el hilo no llega) y arqueado hacia afuera.
 *   ataca a      → degradado rojo→mata que CUELGA. El ataque pesa.
 *   controla a   → degradado maíz→rojo que SUBE. La ayuda levanta.
 *   cuida a      → añil fino y roto: es mano humana, no fuerza de la naturaleza.
 *
 * TRES DECISIONES TÉCNICAS QUE SON DECISIONES DE ARTE
 * ──────────────────────────────────────────────────
 * 1. LÍNEA CON GROSOR REAL. WebGL ignora `linewidth` en las líneas normales:
 *    todo sale en telaraña de 1 px. Sin grosor no hay rubber-hose y, peor, no
 *    hay jerarquía — la milpa pesaría lo mismo que el último biopreparado. Por
 *    eso se usa `LineSegments2` (de `three/addons`, cero dependencias nuevas),
 *    que sí da grosor en píxeles y mantiene el peso del trazo al alejar la
 *    cámara. Todas las aristas de un tipo caben en UNA malla → 5 draw calls.
 *
 * 2. LA FLECHA ES EL DEGRADADO. Poner un cono en la punta de 700 aristas es
 *    absurdo (geometría, draw calls, y un erizo ilegible). Un vértice que nace
 *    rojo plaga y muere en el color de la mata YA dice de dónde a dónde va, y
 *    cuesta cero. Además genera la regla de lectura del mapa completo:
 *    degradado = alguien le hace algo a alguien; color plano = son mutuos.
 *
 * 3. EL PUNTEADO SE TALLA, NO SE PINTA. El material sabe hacer guiones, pero en
 *    `LineSegments2` los reinicia en cada tramo de la curva y sale un desastre.
 *    Aquí el hueco se hace NO EMITIENDO los tramos apagados. Sale exacto, no
 *    necesita `computeLineDistances`, y la línea rota es además la más barata
 *    del mapa — que es justo lo que uno quiere de la relación menos importante.
 */

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { TIPOS_ARISTA, ARISTAS_ORDEN, FANTASMA, colorDeNodo } from './grafoPaleta.js';

/** Tramos por curva. En gama baja son 2: casi recta, y se nota poco porque allá
 *  el mapa ya es corto. La curva es lujo de gama alta, no requisito. */
const TRAMOS = { alto: 14, medio: 8, bajo: 2 };

/* El punteado, en tramos: 2 encendidos, 1 apagado. */
const RITMO_PUNTEADO = 3;
const PUNTEADO_APAGADO = 2;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _ctrl = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0);
const _cA = new THREE.Color();
const _cB = new THREE.Color();
const _cT = new THREE.Color();
const _cFantasma = new THREE.Color(FANTASMA.color);

/** Punto de una bezier cuadrática. */
function bezier(out, p0, ctrl, p1, t) {
  const u = 1 - t;
  out.set(
    u * u * p0.x + 2 * u * t * ctrl.x + t * t * p1.x,
    u * u * p0.y + 2 * u * t * ctrl.y + t * t * p1.y,
    u * u * p0.z + 2 * u * t * ctrl.z + t * t * p1.z,
  );
  return out;
}

/**
 * Dónde se comba la cuerda. `hacia` decide contra qué se dobla:
 *  · centro → hacia el eje del cerro (se abraza)
 *  · afuera → lejos del eje (se repele)
 *  · cero   → vertical (sube si arco>0, cuelga si arco<0)
 */
function puntoControl(out, a, b, estilo) {
  _mid.copy(a).add(b).multiplyScalar(0.5);
  const dist = a.distanceTo(b) || 0.001;

  if (estilo.hacia === 'cero') {
    return out.copy(_mid).addScaledVector(_UP, estilo.arco * dist * 0.5);
  }

  // Dirección radial desde el eje del cerro (x/z), en la mitad de la cuerda.
  _dir.set(_mid.x, 0, _mid.z);
  if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
  _dir.normalize();
  const signo = estilo.hacia === 'centro' ? -1 : 1;
  return out.copy(_mid).addScaledVector(_dir, signo * estilo.arco * dist * 0.5);
}

/**
 * Teselado de TODAS las aristas de un tipo a un par de arreglos planos listos
 * para `LineSegmentsGeometry`. Se recorre una vez por tipo, no una por arista.
 *
 * @returns {{ pos: Float32Array, col: Float32Array } | null}
 */
function tejerTipo(aristas, tipo, grafo, posiciones, tramos, enfocado, relacionados) {
  const estilo = TIPOS_ARISTA[tipo];
  const delTipo = aristas.filter((ar) => ar.tipo === tipo);
  if (!delTipo.length) return null;

  const hebras = estilo.trenza ? 2 : 1;
  const pos = [];
  const col = [];

  for (const ar of delTipo) {
    const pa = posiciones.get(ar.de);
    const pb = posiciones.get(ar.a);
    if (!pa || !pb) continue;

    const nodoA = grafo.porId.get(ar.de);
    const nodoB = grafo.porId.get(ar.a);
    if (!nodoA || !nodoB) continue;

    _a.set(pa[0], pa[1], pa[2]);
    _b.set(pb[0], pb[1], pb[2]);
    puntoControl(_ctrl, _a, _b, estilo);

    /* Los colores de las dos puntas. Si la relación tiene dirección, la punta
       que EMITE lleva el color del tipo de relación y la que RECIBE lleva el
       color de quien recibe: el degradado es la flecha. Si es mutua, color
       plano de punta a punta — sin emisor, sin víctima. */
    if (estilo.dir) {
      _cA.set(estilo.color);
      _cB.set(colorDeNodo(nodoB));
    } else {
      _cA.set(estilo.color);
      _cB.set(estilo.color);
    }

    /* Fantasma: si hay algo enfocado y esta cuerda no lo toca, se hunde en la
       niebla. Las aristas se borran MÁS que los nodos porque son ellas las que
       arman el plato de espagueti: al enfocar, lo primero que tiene que
       desaparecer es la maraña, no las matas. */
    if (enfocado && !(relacionados.has(ar.de) && relacionados.has(ar.a))) {
      _cA.lerp(_cFantasma, FANTASMA.mezclaArista);
      _cB.lerp(_cFantasma, FANTASMA.mezclaArista);
    }

    // Perpendicular para separar las hebras de la trenza.
    if (hebras > 1) {
      _dir.copy(_b).sub(_a).normalize();
      _perp.crossVectors(_dir, _UP);
      if (_perp.lengthSq() < 1e-6) _perp.set(1, 0, 0);
      _perp.normalize();
    }

    for (let h = 0; h < hebras; h++) {
      /* La trenza: las hebras se apartan en la mitad y se juntan en las puntas
         (por eso el seno). Son dos cuerdas amarradas, no dos rayas paralelas —
         que es exactamente lo que hace el frijol trepando el maíz. */
      const lado = hebras > 1 ? (h === 0 ? 1 : -1) : 0;

      for (let i = 0; i < tramos; i++) {
        // El hueco del punteado: no se dibuja, y por eso se ve roto.
        if (estilo.punteada && i % RITMO_PUNTEADO === PUNTEADO_APAGADO) continue;

        const t0 = i / tramos;
        const t1 = (i + 1) / tramos;
        bezier(_p, _a, _ctrl, _b, t0);
        bezier(_q, _a, _ctrl, _b, t1);

        if (lado !== 0) {
          _p.addScaledVector(_perp, lado * 0.05 * Math.sin(t0 * Math.PI));
          _q.addScaledVector(_perp, lado * 0.05 * Math.sin(t1 * Math.PI));
        }

        pos.push(_p.x, _p.y, _p.z, _q.x, _q.y, _q.z);
        _cT.copy(_cA).lerp(_cB, t0);
        col.push(_cT.r, _cT.g, _cT.b);
        _cT.copy(_cA).lerp(_cB, t1);
        col.push(_cT.r, _cT.g, _cT.b);
      }
    }
  }

  if (!pos.length) return null;
  return { pos: new Float32Array(pos), col: new Float32Array(col) };
}

/**
 * Todas las aristas del grafo.
 *
 * @param {object} props
 * @param {object} props.grafo
 * @param {Map<string, number[]>} props.posiciones
 * @param {'alto'|'medio'|'bajo'} props.tier
 * @param {string|null} props.enfocado
 * @param {Set<string>} props.relacionados
 */
export default function AristasGrafo({ grafo, posiciones, tier, enfocado, relacionados }) {
  const tamano = useThree((s) => s.size);
  const tramos = TRAMOS[tier] ?? TRAMOS.medio;

  /* En gama baja no se paga `LineSegments2`: se usa la línea de 1 px de toda la
     vida. Se pierde el grosor (y con él parte del rubber-hose), pero allá el
     mapa ya viene recortado a lo esencial y lo que NO se puede perder es que el
     teléfono responda. Degradar es renunciar a algo a propósito, no a ciegas. */
  const simple = tier === 'bajo';

  const mallas = useMemo(() => {
    if (!grafo?.aristas?.length) return [];
    const out = [];

    for (const tipo of ARISTAS_ORDEN) {
      const tejido = tejerTipo(grafo.aristas, tipo, grafo, posiciones, tramos, enfocado, relacionados);
      if (!tejido) continue;
      const estilo = TIPOS_ARISTA[tipo];

      if (simple) {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(tejido.pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(tejido.col, 3));
        const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92 });
        out.push({ tipo, objeto: new THREE.LineSegments(geo, mat), mat });
        continue;
      }

      const geo = new LineSegmentsGeometry();
      geo.setPositions(tejido.pos);
      geo.setColors(tejido.col);
      const mat = new LineMaterial({
        vertexColors: true,
        linewidth: estilo.grosor, // píxeles: el trazo no adelgaza con la distancia
        transparent: true,
        opacity: 0.95,
        worldUnits: false,
        /* Sin escribir profundidad: con ~900 cuerdas cruzándose, el z-fighting
           entre trazos hace un moiré horrible. Que se mezclen es más honesto —
           y más rubber-hose: tinta sobre tinta. */
        depthWrite: false,
      });
      mat.resolution.set(tamano.width, tamano.height);
      out.push({ tipo, objeto: new LineSegments2(geo, mat), mat });
    }

    return out;
    // `tamano` a propósito NO va aquí: cambiar de tamaño no debe re-tejer 900
    // curvas, solo actualizar un uniform (ver el efecto de abajo).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grafo, posiciones, tramos, enfocado, relacionados, simple]);

  // La resolución del material (para el grosor en píxeles) sí sigue al viewport.
  useEffect(() => {
    for (const m of mallas) m.mat.resolution?.set(tamano.width, tamano.height);
  }, [mallas, tamano]);

  // Liberar GPU al re-tejer o desmontar: si no, cada enfoque filtra ~900 curvas.
  useEffect(() => () => {
    for (const m of mallas) {
      m.objeto.geometry?.dispose();
      m.mat.dispose();
    }
  }, [mallas]);

  return (
    <group>
      {mallas.map((m) => (
        <primitive key={m.tipo} object={m.objeto} />
      ))}
    </group>
  );
}
