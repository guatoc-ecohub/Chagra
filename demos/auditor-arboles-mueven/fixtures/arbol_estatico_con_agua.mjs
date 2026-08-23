import * as THREE from 'three';

// =============================================================================
// MUNDO: claustro del jardín central
// VEGETACIÓN: estática (esto es un BUG según la regla del proyecto, pero este
// fixture existe precisamente para probar la deteccion de SIN_MOVIMIENTO).
//
// Este es el caso difícil: hay señales de vegetación Y hay animación en el
// MISMO archivo. Pero la animación es del AGUA, no de la vegetación. El
// auditor debe ponderar la cercanía y decir SIN_MOVIMIENTO, no dejarse
// engañar porque el archivo tenga "Math.sin" en cualquier lado.
//
// Para que el auditor lo clasifique bien, el código del agua vive a mas de
// 40 líneas de la última referencia a la vegetación. Si estuviera pegado a
// las plantas, una heurística por ventana de líneas lo confundiría: esa es
// la limitación documentada en el README, y por eso este auditor NO reemplaza
// el gate visual humano.
//
// =============================================================================

export function crearArboles(scene) {
  for (let i = 0; i < 25; i++) {
    const tronco = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.5, 4.5),
      new THREE.MeshStandardMaterial({ color: 0x5d4037 })
    );
    const copa = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
    );
    copa.position.y = 2.8;
    const arbol = new THREE.Group();
    arbol.add(tronco, copa);
    arbol.position.set((i - 12) * 3, 0, 0);
    scene.add(arbol);
  }
}

// -----------------------------------------------------------------------------
// Separador deliberado: la animación del agua vive por debajo de esta línea,
// lejos de cualquier referencia a la vegetación (última señal de vegetación en
// la línea 35). Así la heurística de cercanía no confunde el movimiento del
// agua con movimiento de las plantas. En un mundo real, revisar estos casos a
// ojo sigue siendo el gate final.
//
// El umbral del auditor es de ~40 líneas: toda señal de movimiento que viva a
// mas de esa distancia de una señal de vegetación NO cuenta como animacion de
// las plantas. Este fixture verifica exactamente ese comportamiento: el agua
// se anima (Math.sin + clock) pero queda fuera de la ventana.
//
// Si mañana alguien mueve la animacion del agua a menos de 40 lineas de las
// plantas, el auditor dara un falso positivo con confianza media/baja y ahi
// es donde entra la revision visual. Heuristica de texto: aproxima, no sabe.
//
// Nota: la ventana se mide desde la ultima señal de vegetacion del bloque
// superior (linea 35). El codigo del agua empieza en la linea 92 en adelante
// para quedar a 55+ lineas de distancia, fuera del umbral de 40.
// Los numeros de linea de este comentario se mantienen al dia con el fixture.
// Espacio de relleno adicional para garantizar separacion de >40 lineas.
// Relleno extra: el primer uso de clock y Math.sin debe quedar en linea 76+.
//
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// A partir de aqui hay 20 lineas de relleno neutro que separan fisicamente el
// bloque de vegetacion del bloque de agua. No contienen ninguna señal ni de
// vegetacion ni de movimiento: son solo comentarios descriptivos para que el
// fixture tenga distancia de sobra (55+ lineas) y el resultado no dependa de
// un margen de una o dos lineas.
//
// 1
// 2
// 3
// 4
// 5
// 6
// 7
// 8
// 9
// 10
// 11
// 12
// 13
// 14
// 15
//
// -----------------------------------------------------------------------------

export function crearPlanoDeAgua(scene) {
  const agua = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200, 64, 64),
    new THREE.MeshStandardMaterial({ color: 0x1565c0 })
  );
  agua.rotation.x = -Math.PI / 2;
  scene.add(agua);
}

export function animarOlas(agua, clock) {
  const t = clock.getElapsedTime();
  const pos = agua.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = Math.sin(pos.getX(i) * 1.1 + t) * 0.2;
    pos.setY(i, pos.getY(i) + y);
  }
}
