/*
 * solAgua — la dirección del sol DIBUJADO del mundo del agua.
 *
 * La CONTRALUZ de la tarde sobre la loma del nacimiento: el mismo azimut
 * donde este mundo siempre pintó su sol (el viejo SolDorado en
 * [-12, 4.6, -7.5]) y donde apunta la direccional de relleno de MundoAgua3D.
 * La comparten fondoAgua (bóveda, sol lejano, cordillera, niebla) y
 * chorreraReal (contraluz horneada del farallón + luz del agua): una sola
 * verdad — si el sol se mueve, TODO el atardecer se mueve con él.
 */
import * as THREE from 'three';

export const SOL_DIR = new THREE.Vector3(-9, 2.6, -8.5).normalize();
