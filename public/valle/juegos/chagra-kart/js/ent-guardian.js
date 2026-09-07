// El Ent del páramo como GUARDIÁN del frailejonal en el Chagra-Kart.
//
// Composición, no arte nuevo: el Ent es el de lib3d/creatures/entParamo.js
// (rostro sabio v14, greñas, falda de necromasa) tal cual salió de su gate.
// Este módulo solo lo PLANTA en el claro del frailejonal, le da su papel de
// juego —"YOU SHALL NOT PASS": el carro que se mete al frailejonal queda
// atontado y el abuelo lo devuelve a la pista— y le presta la burbuja de
// diálogo que ya tenía el ent rescatador, para que la frase se DIGA en el
// mundo y no solo en el HUD.
//
// Papel de juego, tres piezas que ya existían:
//  · s.atontado (fisica.js): control ×0.35, tope de velocidad ×0.48, tambaleo.
//    La misma dosis del rescate (ATONTADO_RESCATE), para que "quedar tonto"
//    se sienta igual en todo el juego.
//  · s.empuje (colision.js): empuje de mundo que mueve la posición sin pasar
//    por el volante y decae solo. Reaplicado mientras el carro siga en el
//    claro, se lee como la mano lenta del abuelo barriéndote al asfalto.
//  · cuerpo estático (resolverTodos): el tronco no se atraviesa, ni el
//    jugador ni los rivales.
import { crearEntParamo } from '../../../lib3d/creatures/entParamo.js';
import { crearBurbuja } from './modelos/ent-frailejon.js';
import { ATONTADO_RESCATE } from './fisica.js';
import { ZONA } from './pista.js';

export const FRASE_GUARDIAN = 'YOU SHALL NOT PASS!';

// ── el claro: dónde se planta el abuelo ─────────────────────────────────────
// Determinista (nada de Math.random): se recorre el tramo de páramo de la
// pista y se puntúa cada candidato lateral. Gana el punto con pista a un solo
// lado (que ninguna otra vuelta del circuito pase cerca) y suelo parejo (que
// la falda asiente, no que cuelgue de un barranco).
function elegirClaro(pista, holgura) {
  let mejor = null;
  for (let f = 0.04; f <= 0.22; f += 0.01) {
    const p = pista.puntoEn(f);
    if (p.zona !== ZONA.PARAMO_ALTO) continue;
    const dist = p.w + holgura; // w es SEMI-ancho de pista (|lat|<=w = asfalto)
    const derX = Math.sin(p.hdg), derZ = -Math.cos(p.hdg);
    for (const lado of [1, -1]) {
      const x = p.x + derX * dist * lado;
      const z = p.z + derZ * dist * lado;
      const info = pista.infoLocal(x, z);
      const latReal = Math.abs(info.lat);
      // otra parte del circuito pasa más cerca que "mi" borde → descartado
      if (latReal < dist - 1.5) continue;
      const h0 = pista.alturaMundo(x, z);
      const pend = Math.max(
        Math.abs(pista.alturaMundo(x + 2.5, z) - h0),
        Math.abs(pista.alturaMundo(x, z + 2.5) - h0),
      );
      const puntaje = Math.min(latReal, 14) - pend * 4;
      if (!mejor || puntaje > mejor.puntaje) {
        mejor = { x, z, y: h0, f, puntaje, pista: { x: p.x, y: p.y, z: p.z } };
      }
    }
  }
  return mejor;
}

export function crearEntGuardian(THREE, pista, cfg = {}) {
  if (pista.mar || pista.chorrera) return null;

  const ESCALA = cfg.escala ?? 1.35;      // altoTotal ≈ 13,7 m: domina el claro
  const claro = elegirClaro(pista, cfg.holgura ?? 7.5);
  if (!claro) return null;

  const ent = crearEntParamo(THREE, {
    semilla: cfg.semilla ?? 20260806,     // la semilla canónica del arte
    detalle: cfg.movil ? 'medio' : 'alto',
    anisotropia: cfg.movil ? 2 : 8,
    escala: ESCALA,
  });
  // asentado en la turba: la falda muerde el terreno en vez de flotar sobre él
  ent.position.set(claro.x, claro.y - 0.35, claro.z);
  // el frente local es +z: el abuelo mira hacia su tramo de pista
  ent.rotation.y = Math.atan2(claro.pista.x - claro.x, claro.pista.z - claro.z);
  if (cfg.sombras === false) {
    ent.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  }

  // ── (v17) LA LUZ PROPIA DEL GUARDIÁN ──────────────────────────────────────
  // La escena del kart expone para el asfalto (sol 1,8 + ambiente 0,55 + cielo
  // quemado) y LAVA al Ent: la cara rendía plana por mucho que la talla se
  // hundiera (veredicto Pixel-Gemini sobre v16). Dos SpotLight con distancia
  // acotada — el falloff físico los muere antes del asfalto, así el resto del
  // mundo no se entera. Se eligen Spot A PROPÓSITO: refrescarLuz() del piloto
  // lámina suma Ambient/Hemi/Directional para su tinte y los Spot no entran.
  // En móvil no se montan (2 luces extra por fragmento en Mali no se pagan).
  // MEDIDO en la primera pasada (900/380 cd): a ese voltaje la luz DESTAPA la
  // doctrina de masa — los párpados se lavan a esclerótica de muñeco (lección
  // F21 de vuelta) y las hojas de la falda leen púas contables azul-frío. La
  // luz del guardián es un ACENTO (E≈0,5-0,6), no un reflector: modela, no
  // expone. Y el cono de la rasante va APRETADO a la zona del rostro.
  if (!cfg.movil) {
    const altoLocal = ent.userData.altoTotal;      // unidades locales del grupo
    const yCaraLocal = ent.userData.caraY;
    // contraluz detrás-arriba-izquierda, verde-páramo (no azul: sobre la
    // necromasa el azul lee plástico): recorta corona y hombros.
    const rim = new THREE.SpotLight(0xcfe0d4, 320, 45, 0.50, 0.7, 2);
    rim.position.set(-6.5, altoLocal + 7, -10);
    const rimMira = new THREE.Object3D();
    rimMira.position.set(0, yCaraLocal * 0.85, 0);
    ent.add(rimMira);
    rim.target = rimMira;
    ent.add(rim);
    // llave RASANTE cálida casi de perfil: roza la corteza de la cara (bump)
    // y deja la otra mitad del rostro EN sombra. Cono corto: cara, no falda.
    const rasante = new THREE.SpotLight(0xffe2b8, 170, 40, 0.30, 0.85, 2);
    rasante.position.set(11, yCaraLocal + 5, 3.0);
    const rasMira = new THREE.Object3D();
    rasMira.position.set(0, yCaraLocal, 0);
    ent.add(rasMira);
    rasante.target = rasMira;
    ent.add(rasante);
  }

  // burbuja del regaño: el MISMO dibujo del rescatador, escalada al porte del
  // abuelo. Vive oculta y solo aparece los segundos del "no pasarás".
  const burbuja = crearBurbuja(THREE, FRASE_GUARDIAN);
  const altoMundo = ent.userData.altoTotal * ESCALA;
  burbuja.scale.multiplyScalar(2.1);
  burbuja.position.set(0, altoMundo / ESCALA + 1.1, 0.6); // en espacio local del ent
  burbuja.visible = false;
  ent.add(burbuja);

  // ── estado del guardián ───────────────────────────────────────────────────
  const RADIO = cfg.radio ?? 15;          // el claro que cuida
  const R2 = RADIO * RADIO;
  const dentroPrevio = new WeakSet();     // edge-trigger del atontado, por kart
  let burbujaT = 0;
  let avisoPendiente = false;
  let impactoPendiente = false;           // el instante en que el pie aterriza
  let ultimoIntruso = null;
  let intrusos = 0;
  let tAnim = 0;

  // cuerpo estático para resolverTodos: el fuste + algo de falda. Masa de
  // obstáculo (los troncos del mar usan 4000) para que el impulso lo pague
  // entero el kart.
  const rTronco = ent.userData.radioTronco * ESCALA + 0.9;
  const cuerpoEstatico = {
    id: 'ent-guardian', tipo: 'obstaculo', estatico: true,
    x: claro.x, z: claro.z, y: 0, hdg: ent.rotation.y,
    vx: 0, vz: 0, masa: 4000, hl: rTronco, hw: rTronco,
  };

  // ── la guardia: un paso por frame ─────────────────────────────────────────
  // `karts` son estados de física del juego (jugador e invitado): tienen
  // x/z, info (infoLocal ya calculado por su propio paso), empuje y atontado.
  function actualizar(dt, camara, karts) {
    tAnim += dt;
    intrusos = 0;

    for (const s of karts) {
      if (!s) continue;
      const dx = s.x - claro.x, dz = s.z - claro.z;
      const d2 = dx * dx + dz * dz;
      const enClaro = d2 < R2;
      const fueraDeAsfalto = s.info ? Math.abs(s.info.lat) > (s.info.w ?? 8) + 0.5 : true;
      const intruso = enClaro && fueraDeAsfalto;

      if (intruso) {
        intrusos++;
        // primera pisada en el claro: el regaño, el atontado y el PISOTÓN
        // (40b: el repeler se LEE como pisotón de Ent — guiño a los Ents
        // pateando orcos; la chiva es campesina: imponente y con humor,
        // nunca violento)
        if (!dentroPrevio.has(s)) {
          dentroPrevio.add(s);
          s.atontado = Math.max(s.atontado ?? 0, ATONTADO_RESCATE);
          burbujaT = 2.6;
          avisoPendiente = true;
          ent.userData.darPisoton?.();
        }
        // la mano del abuelo: empuje sostenido hacia el centro de la pista.
        // Crece hacia el corazón del claro; el decaimiento de integrarEmpuje
        // (≈0,2 s) hace que soltar el claro suelte la mano.
        if (s.empuje && s.info) {
          const q = pista.puntoEn(s.info.f);
          const ux = q.x - s.x, uz = q.z - s.z;
          const len = Math.hypot(ux, uz) || 1;
          const fuerza = 7 + 7 * (1 - Math.sqrt(d2) / RADIO);
          s.empuje.x = (ux / len) * fuerza;
          s.empuje.z = (uz / len) * fuerza;
          ultimoIntruso = s;
        }
      } else if (dentroPrevio.has(s) && d2 > R2 * 1.44) {
        // histéresis: se rearma unos metros más allá para no re-atontar
        // en el borde del claro
        dentroPrevio.delete(s);
      }
    }

    // el anciano se inclina hacia el intruso — la reverencia lenta que ya
    // trae el arte (damping interno 0,012: tarda segundos, como debe ser)
    ent.userData.setInclinacion(intrusos > 0 ? 1 : 0);

    // el GOLPE del pisotón: cuando el pie-raíz aterriza (el arte marca el
    // impacto), el empujón se dobla ese instante — el barrido se siente
    // ANCLADO al pie, no a un campo invisible.
    if (ent.userData.tomarImpacto?.() && ultimoIntruso?.empuje) {
      ultimoIntruso.empuje.x *= 2.3;
      ultimoIntruso.empuje.z *= 2.3;
      impactoPendiente = true;
    }

    if (burbujaT > 0) {
      burbujaT -= dt;
      burbuja.visible = burbujaT > 0;
    }

    // presencia: la animación completa (ojos que te siguen, parpadeo,
    // respiración, greñas) solo cuando la cámara está a distancia de verla
    if (camara && camara.position.distanceToSquared(ent.position) < 170 * 170) {
      ent.userData.actualizar(tAnim, camara);
    }
  }

  function tomarAviso() {
    if (!avisoPendiente) return false;
    avisoPendiente = false;
    return true;
  }

  function tomarImpacto() {
    if (!impactoPendiente) return false;
    impactoPendiente = false;
    return true;
  }

  return {
    grupo: ent,
    frase: FRASE_GUARDIAN,
    actualizar,
    tomarAviso,
    tomarImpacto,
    cuerpo: () => cuerpoEstatico,
    radio: RADIO,
    claro,
    liberar: () => ent.userData.liberar(),
  };
}
