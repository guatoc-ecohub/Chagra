/*
 * PozoQueCalla — el ácido sulfhídrico. El que no hace espectáculo.
 *
 * "El H₂S es traicionero porque a concentraciones muy altas anula el sentido del
 *  olfato, así que uno deja de olerlo justo cuando es más peligroso, y además es
 *  más pesado que el aire, así que se acumula en pozos, fosas y espacios bajos
 *  cerrados."
 *
 * "Ha habido casos donde muere la primera persona por los gases y luego mueren
 *  quienes entran a rescatarla sin protección."
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA FÍSICA OPUESTA ES LA LECCIÓN
 *
 * Este archivo existe para contradecir al de al lado. Todo lo que hace el
 * amoníaco, el sulfhídrico lo hace al revés — y esas oposiciones NO son estilo:
 * son las dos químicas, dibujadas.
 *
 *   Amoníaco (VeloQuePesa)          Sulfhídrico (este archivo)
 *   ─────────────────────           ──────────────────────────
 *   SUBE, se va por el caballete    BAJA, se sienta en el hueco
 *   dorado: se ve venir             pardo muerto: el ojo le resbala
 *   ronda, ondula, está vivo        QUIETO. No se mueve nunca.
 *   arde: AVISA                     no huele a nada: CALLA
 *   sale del descuido               sale del encharcamiento (otra causa)
 *   es plata que se pierde          es una persona que se muere
 *
 * Uno le roba a usted. El otro lo mata.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA DECISIÓN DE ARTE MÁS RARA DE LA PIEZA: que casi no se vea.
 *
 * La tentación era pintarlo alarmante — morado brillante, calaveras, pulso
 * rojo. Sería traicionar el dato: si el H₂S se viera, no mataría a nadie. Mata
 * PORQUE no se ve y porque deja de olerse justo cuando abunda.
 *
 * Así que acá el peligro es una lámina pardo-violácea, opaca y absolutamente
 * inmóvil, que llena el hueco hasta el ras del brocal — como si la fosa
 * estuviera llena de un agua que no refleja. No hay burbujas, no hay volutas,
 * no pasa nada. El que se asoma mete la cabeza adentro sin enterarse.
 *
 * La quietud, al lado del oro que revolotea a tres metros, es lo más inquietante
 * que se podía dibujar. Que el ojo del que mira la escena pase de largo por la
 * fosa es EXACTAMENTE lo que le pasa al que se asoma a la fosa.
 *
 * Y por eso el borde del líquido es lo único con un poco de contraste: es la
 * línea que uno tiene que aprender a ver.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COLORES, COCHERA } from './olor.geom.js';

/* El hueco de la fosa, en metros. Coincide con `geomFosa`. */
const FOSA = { x: COCHERA.fosaX, z: 1.2, w: 0.95, d: 1.72, boca: 0.02, fondo: -0.16 };

/**
 * El gas que se acuesta en la fosa.
 *
 * @param {{ aireRef: { current: any }, n?: number }} props
 */
export default function PozoQueCalla({ aireRef, n = 4 }) {
  const grupo = useRef(null);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(FOSA.w, FOSA.d);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);

  /*
   * Cuatro láminas apiladas en catorce centímetros. Todas del mismo color, sin
   * degradé: el gas pesado no se ralea con la altura como el amoníaco — se
   * queda macizo hasta el borde y ahí se corta. Es un líquido invisible.
   */
  const mats = useMemo(
    () =>
      Array.from(
        { length: n },
        () =>
          new THREE.MeshBasicMaterial({
            color: COLORES.sulfhidrico,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            side: THREE.DoubleSide,
            fog: false,
          }),
      ),
    [n],
  );

  const alturas = useMemo(
    () => Array.from({ length: n }, (_, i) => FOSA.fondo + ((i + 1) / n) * (FOSA.boca - FOSA.fondo)),
    [n],
  );

  useLayoutEffect(
    () => () => {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  useFrame(() => {
    const g = grupo.current;
    const a = aireRef.current;
    if (!g || !a) return;

    /*
     * Umbral, no rampa: no aparece porque la cama esté regular. Aparece cuando
     * hay agua empozada pudriéndose sin aire. Mientras tanto NO EXISTE — y esa
     * es la otra mitad del dato: el descuido leve huele a amoníaco, no a huevo
     * podrido. Son diagnósticos distintos.
     */
    g.visible = a.sulfhidrico > 0.02;
    if (!g.visible) return;

    for (let i = 0; i < g.children.length; i++) {
      const lam = /** @type {THREE.Mesh & { material: THREE.MeshBasicMaterial }} */ (g.children[i]);
      /* La de más arriba, la del ras del brocal, es la más opaca: es el borde
         que hay que aprender a ver antes de asomarse. */
      const alRas = i / Math.max(1, n - 1);
      lam.material.opacity = a.sulfhidrico * (0.3 + alRas * 0.42);
      /*
       * SIN useFrame que lo mueva. Ni una oscilación, ni un pulso, ni un
       * titileo. Está escrito así a propósito y no es un pendiente: la quietud
       * absoluta ES el personaje. Si esto respirara, avisaría — y no avisa.
       */
    }
  });

  return (
    <group ref={grupo}>
      {alturas.map((y, i) => (
        <mesh key={i} geometry={geo} material={mats[i]} position={[FOSA.x, y, FOSA.z]} renderOrder={20 + i} />
      ))}
    </group>
  );
}
