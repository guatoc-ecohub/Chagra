/**
 * NodosGrafo.jsx — los cuatro habitantes del mapa.
 *
 * LA FORMA DICE QUÉ ES; EL COLOR DICE DÓNDE VIVE
 * ─────────────────────────────────────────────
 *   mata         → icosaedro facetado. Redondo = vivo, amable, se toca. Es lo
 *                  único que crece, así que es lo único redondo. Su color es su
 *                  ALTURA (terracota abajo, verde en el frío, hueso en la nieve).
 *   plaga        → octaedro puntudo. El pico ES la advertencia: se lee amenaza
 *                  aunque usted no distinga el rojo (y en un teléfono barato al
 *                  sol de las 11 a. m., no lo distingue).
 *   biopreparado → LA VASIJA. No un icono de frasco: la silueta andina de
 *                  `artesaniaAndina.js`, la misma tabla que ya alimenta la
 *                  cerámica 2D del proyecto — base ancha, hombro en el tercio
 *                  áureo, cuello que cierra. El remedio ES la olla donde se
 *                  prepara, y se ve tallado por la misma mano que el resto.
 *   controlador  → un anillo. El aliado que rodea y contiene.
 *
 * Una malla instanciada por tipo → 4 draw calls para todo el mapa, sea de 90 o
 * de 360 nodos. El color por instancia (`setColorAt`) es lo que permite apagar
 * medio grafo al enfocar sin tocar una sola geometría.
 *
 * POR QUÉ APAGAR ES MEZCLAR Y NO TRANSPARENTAR: con instancing, la opacidad por
 * instancia no existe sin escribir un shader propio, y transparentar 300 cuerpos
 * obliga a ordenarlos por profundidad cada cuadro. Hundir el color hacia la
 * niebla cuesta un lerp, se ve igual de bien —el aire ya es niebla dorada, no
 * negro— y jamás rompe el orden de dibujado.
 */

import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { puntosSilueta, SEGMENTOS_SILUETA, rngArtesania } from '../artesaniaAndina.js';
import { TIPOS_NODO, TIPOS_ORDEN, FANTASMA, REALCE, colorDeNodo, realzar } from './grafoPaleta.js';

const _m = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _eul = new THREE.Euler();
const _esc = new THREE.Vector3();
const _col = new THREE.Color();
const _realce = new THREE.Color();
const _fantasma = new THREE.Color(FANTASMA.color);

/**
 * La geometría de cada tipo. Pocos segmentos A PROPÓSITO: el facetado ES el
 * look (misma ley que el resto del mundo 3D), y de paso cabe en gama baja.
 */
function geometriaDe(tipo, tier) {
  const { radio } = TIPOS_NODO[tipo];
  const rico = tier === 'alto';

  switch (TIPOS_NODO[tipo].geo) {
    case 'mata':
      // detail 1 en gama alta (80 caras, se redondea); 0 en el resto (20 caras).
      return new THREE.IcosahedronGeometry(radio, rico ? 1 : 0);
    case 'plaga':
      return new THREE.OctahedronGeometry(radio * 1.15, 0);
    case 'vasija': {
      /* La MISMA tabla de silueta que la cerámica 2D. Si mañana alguien corrige
         el hombro de la vasija, se corrige aquí solo. `puntosSilueta` devuelve
         pares [r, y]; se centra en el eje para que la olla gire sobre su propio
         centro y no cabecee al escalarla. */
      const pts = puntosSilueta('vasija', { alto: radio * 2.6 })
        .map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y - radio * 1.3));
      return new THREE.LatheGeometry(pts, rico ? SEGMENTOS_SILUETA : 8);
    }
    case 'anillo':
      return new THREE.TorusGeometry(radio, radio * 0.36, rico ? 7 : 5, rico ? 14 : 9);
    default:
      return new THREE.IcosahedronGeometry(radio, 0);
  }
}

export default function NodosGrafo({
  grafo, posiciones, tier, enfocado, relacionados, reducedMotion, onTocar, onSobre,
}) {
  const refs = useRef({});

  /* Nodos agrupados por tipo, con su rotación propia ya sorteada. La rotación
     determinista (misma semilla → mismo mapa) es lo que le quita el aire de
     "renderizado por computador": ninguna mata mira igual que su vecina, como
     en un cultivo de verdad. */
  const grupos = useMemo(() => {
    const rnd = rngArtesania(1808);
    const out = {};
    for (const tipo of TIPOS_ORDEN) out[tipo] = [];
    for (const n of grafo?.nodos || []) {
      const p = posiciones.get(n.id);
      if (!p) continue;
      const lista = out[n.tipo];
      if (!lista) continue;
      lista.push({
        nodo: n,
        p,
        /* La vasija se para derecha (una olla acostada no es una olla): solo
           gira sobre su eje. Lo demás rueda libre. */
        rot: n.tipo === 'biopreparado'
          ? [0, rnd() * Math.PI * 2, 0]
          : [rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2],
        fase: rnd() * Math.PI * 2, // para que no respiren todas al tiempo
      });
    }
    return out;
  }, [grafo, posiciones]);

  const geometrias = useMemo(() => {
    const out = {};
    for (const tipo of TIPOS_ORDEN) out[tipo] = geometriaDe(tipo, tier);
    return out;
  }, [tier]);

  useEffect(() => () => {
    for (const g of Object.values(geometrias)) g.dispose();
  }, [geometrias]);

  /* Matrices y colores. Se recalculan al cambiar el enfoque, NO por cuadro:
     enfocar es un evento del dedo (unas pocas veces por minuto), no una
     animación. Todo lo caro se paga en el evento y el bucle de render queda
     libre — que es lo que sostiene los 30 fps en un teléfono de gama baja. */
  useLayoutEffect(() => {
    for (const tipo of TIPOS_ORDEN) {
      const malla = refs.current[tipo];
      const lista = grupos[tipo];
      if (!malla || !lista?.length) continue;

      for (let i = 0; i < lista.length; i++) {
        const { nodo, p, rot } = lista[i];
        const esEnfocado = enfocado === nodo.id;
        const esVecino = !!enfocado && relacionados.has(nodo.id) && !esEnfocado;
        const apagado = !!enfocado && !esEnfocado && !esVecino;

        let escala = 1;
        if (esEnfocado) escala = REALCE.escalaEnfocado;
        else if (esVecino) escala = REALCE.escalaVecino;
        else if (apagado) escala = FANTASMA.escala;

        /* El grado engorda un poco la mata: lo que más se relaciona pesa más en
           el dibujo. Es jerarquía visual sacada del dato, no del capricho —
           la papa se ve importante porque ES importante. */
        if (nodo.tipo === 'especie') escala *= 1 + Math.min(nodo.grado, 40) * 0.012;

        _pos.set(p[0], p[1], p[2]);
        _eul.set(rot[0], rot[1], rot[2]);
        _quat.setFromEuler(_eul);
        _esc.setScalar(escala);
        _m.compose(_pos, _quat, _esc);
        malla.setMatrixAt(i, _m);

        const base = colorDeNodo(nodo);
        _col.set(base);
        /* Al enfocado se le sube el color hacia la luz de la hora dorada: así
           brilla SIN depender del bloom, y por eso en gama baja —donde no hay
           bloom— el enfoque se sigue leyendo igual de claro. */
        if (esEnfocado) _col.lerp(_realce.set(realzar(base, 1)), REALCE.brillo);
        else if (apagado) _col.lerp(_fantasma, FANTASMA.mezcla);
        malla.setColorAt(i, _col);
      }

      malla.count = lista.length;
      malla.instanceMatrix.needsUpdate = true;
      if (malla.instanceColor) malla.instanceColor.needsUpdate = true;
      /* `setColorAt` CREA `instanceColor` la primera vez. Si el material ya se
         compiló sin él, el shader no trae el define y los colores no salen (el
         mapa entero blanco). Un `needsUpdate` lo recompila una sola vez. */
      if (malla.material) malla.material.needsUpdate = true;
      malla.computeBoundingSphere();
    }
  }, [grupos, enfocado, relacionados]);

  /* La única animación por cuadro, y solo en gama alta: una respiración lenta.
     Rubber-hose = nada está nunca del todo quieto. En gama media/baja se apaga
     entera (y con `prefers-reduced-motion` también): un mapa quieto sigue
     siendo el mismo mapa, un teléfono ahogado no. */
  const animar = tier === 'alto' && !reducedMotion;
  useFrame((state) => {
    if (!animar) return;
    const t = state.clock.elapsedTime;
    for (const tipo of TIPOS_ORDEN) {
      const malla = refs.current[tipo];
      const lista = grupos[tipo];
      if (!malla || !lista?.length) continue;

      for (let i = 0; i < lista.length; i++) {
        const { nodo, p, rot, fase } = lista[i];
        const esEnfocado = enfocado === nodo.id;
        const esVecino = !!enfocado && relacionados.has(nodo.id) && !esEnfocado;
        const apagado = !!enfocado && !esEnfocado && !esVecino;

        let escala = esEnfocado ? REALCE.escalaEnfocado : esVecino ? REALCE.escalaVecino : apagado ? FANTASMA.escala : 1;
        if (nodo.tipo === 'especie') escala *= 1 + Math.min(nodo.grado, 40) * 0.012;
        // El enfocado late; el resto solo respira.
        escala *= esEnfocado ? 1 + Math.sin(t * 2.4) * 0.06 : 1 + Math.sin(t * 0.8 + fase) * 0.022;

        _pos.set(p[0], p[1] + Math.sin(t * 0.55 + fase) * 0.035, p[2]);
        _eul.set(rot[0], rot[1] + (esEnfocado ? t * 0.5 : 0), rot[2]);
        _quat.setFromEuler(_eul);
        _esc.setScalar(escala);
        _m.compose(_pos, _quat, _esc);
        malla.setMatrixAt(i, _m);
      }
      malla.instanceMatrix.needsUpdate = true;
    }
  });

  const alTocar = (tipo) => (e) => {
    e.stopPropagation(); // que OrbitControls no se robe el toque
    const lista = grupos[tipo];
    const item = lista?.[e.instanceId];
    if (item) onTocar?.(item.nodo);
  };

  const alSobre = (tipo) => (e) => {
    e.stopPropagation();
    const item = grupos[tipo]?.[e.instanceId];
    onSobre?.(item?.nodo || null);
  };

  return (
    <group>
      {TIPOS_ORDEN.map((tipo) => {
        const lista = grupos[tipo];
        if (!lista?.length) return null;
        return (
          <instancedMesh
            key={tipo}
            ref={(el) => { refs.current[tipo] = el; }}
            args={[geometrias[tipo], undefined, lista.length]}
            onPointerDown={alTocar(tipo)}
            onPointerOver={alSobre(tipo)}
            onPointerOut={() => onSobre?.(null)}
            castShadow={false}
            receiveShadow={false}
          >
            {/* Lambert + flatShading: la ley de materiales de `atmosferaMadre`.
                Barato y con la faceta a la vista, que es el look. */}
            <meshLambertMaterial flatShading vertexColors={false} />
          </instancedMesh>
        );
      })}
    </group>
  );
}
