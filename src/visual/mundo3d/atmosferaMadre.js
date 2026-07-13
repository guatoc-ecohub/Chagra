/*
 * atmosferaMadre — la DIRECCIÓN DE ARTE compartida de todos los mundos 3D.
 *
 * Antes cada escena inventaba su cielo con hexes sueltos y EscenaBase3D
 * guardaba la hora dorada encerrada en una constante local: nueve mundos que
 * se sentían de nueve juegos. Este módulo es la fuente única de esa atmósfera
 * (la misma `CLIMAS.dorada` de valleData — el valle ES la hora madre) para que
 * entrar a cualquier mundo se sienta como ACERCARSE dentro del mismo atardecer,
 * no como abrir otra app.
 *
 * Tres piezas, tres responsabilidades:
 *   - ATMOSFERA : la hora dorada (sol, relleno frío, niebla, sombra). La aplica
 *                 EscenaBase3D; ningún arquetipo la toca.
 *   - CIELOS    : el tinte propio de cada FAMILIA de mundo (agua fresca, plaza
 *                 tibia, páramo brumoso…). Es el 40% de identidad que sobrevive
 *                 a la mezcla del 60% hacia la madre en EscenaBase3D. Los que
 *                 eran francamente fríos (agua, ladera, alba) vienen ya
 *                 entibiados: identidad sí, choque no.
 *   - PALETA    : los materiales low-poly canónicos (madera, tierra, follaje…)
 *                 que se repiten entre dioramas. Un solo marrón de madera en
 *                 todo el juego = el ojo lee "mismo lugar". Los grises fabriles
 *                 puros no existen aquí a propósito: bajo un sol dorado hasta
 *                 el concreto se tiñe (concreto/lamina son grises CÁLIDOS).
 *
 * Y dos piezas de coherencia derivadas (mismo contrato, cero costo por frame):
 *   - mezclarCielo : la receta 60%-hacia-la-madre que usa EscenaBase3D, como
 *                    ley exportada — cualquier consumidor nuevo pinta IGUAL.
 *   - BLOOM        : los parámetros del bloom sutil del tier alto. Dirección
 *                    de arte central, no un número suelto por escena.
 *
 * Rendimiento: solo constantes y una mezcla de Color memoizable — nada de esto
 * cuesta por frame ni rompe el device-tier (la base decide qué enciende).
 */
import * as THREE from 'three';

/* La hora dorada del valle (CLIMAS.dorada de valleData): la atmósfera base que
   TODOS los mundos heredan. El `cielo` propio del arquetipo solo la tiñe. */
export const ATMOSFERA = {
  fondo: '#f2d9a8', // fondo cálido de tarde
  cielo: '#f7c66b', // domo dorado (hemisferio, arriba)
  suelo: '#8a6b4a', // rebote tierra (hemisferio, abajo)
  luz: '#ffd79a', // el sol bajo, dorado (direccional principal)
  relleno: '#9db8d9', // relleno frío de cielo abierto (direccional opuesta, tenue)
  niebla: '#f0c98d', // la niebla dorada del valle
  sombra: '#3a2a18', // tinte de las sombras de contacto
};

/* Mezcla dos hex hacia `t` (0 = a, 1 = b). Barato; memoizar en quien llama. */
export function mezclar(a, b, t) {
  return `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
}

/* La RECETA de coherencia valle↔mundo, como ley única: el cielo propio del
   arquetipo mezclado 60% hacia la MADRE (B6). Antes vivía inline en
   EscenaBase3D; aquí es parte de la dirección de arte — si un consumidor nuevo
   (minimapa, preview, thumbnail) necesita "cómo se ve la familia X bajo la
   madre", llama esto y sale IGUAL que la escena. Barato (7 lerps); memoizar
   en quien llama por `cielo` (+ `madre` si varía).

   CICLO DIURNO VIVO: `madre` por defecto es la hora dorada (ATMOSFERA), pero
   EscenaBase3D ahora pasa el preset de la FRANJA REAL del día (CIELOS_HORA de
   cielosHoraData vía useCicloDia): el mundo hereda el amanecer, el mediodía o
   la noche del valle sin que ningún arquetipo se entere. La identidad propia
   (el 40%) sobrevive igual. La intensidad del mundo se MULTIPLICA por la de la
   madre (la noche baja todo). */
export function mezclarCielo(cielo, madre = ATMOSFERA) {
  const propio = { ...CIELOS.neutro, ...(cielo || {}) };
  return {
    fondo: mezclar(propio.fondo, madre.fondo, 0.6),
    cielo: mezclar(propio.cielo, madre.cielo, 0.6),
    suelo: mezclar(propio.suelo, madre.suelo, 0.6),
    niebla: mezclar(propio.fondo, madre.niebla, 0.7),
    alfombra: mezclar(propio.suelo, madre.suelo, 0.5),
    intensidad: (propio.intensidad ?? 1) * (madre.intensidad ?? 1),
  };
}

/* El bloom de la hora dorada (tier alto): parámetros de dirección de arte, no
   de cada escena. `umbral` alto = solo los brillos francos (sol en el agua,
   ámbar de señal, cal al sol) florecen; `fuerza` baja = un velo tibio, jamás
   neón. Un solo bloom en todo el juego = la luz se siente del mismo atardecer. */
export const BLOOM = {
  fuerza: 0.18, // sutil: abraza los brillos, no los revienta
  radio: 0.55, // difusión corta — halo pegado a la fuente
  umbral: 0.85, // solo lo francamente luminoso entra al pase
};

/* El cielo propio de cada familia de mundo. EscenaBase3D lo MEZCLA 60% hacia
   ATMOSFERA, así que estos valores son el acento, no el resultado final.
   `alba` no trae `fondo`: la bóveda lo calcula por hora del día (veracidad). */
export const CIELOS = {
  /* la acuarela neutra heredada del valle (default si el arquetipo no elige) */
  neutro: { fondo: '#ece0c7', cielo: '#f5e9d2', suelo: '#b49873', intensidad: 1 },
  /* agua viva: fresco pero ya no azul-gris — salvia que dora bien */
  agua: { fondo: '#dfe6d5', cielo: '#ecf2e0', suelo: '#7f9270', intensidad: 1.1 },
  /* el perfil de suelo: tierra abierta, cálida de entrada */
  tierra: { fondo: '#e7d7ba', cielo: '#f3e6cc', suelo: '#7a5a38', intensidad: 1.05 },
  /* corral y cafetal: tarde de finca */
  corral: { fondo: '#ecdcc2', cielo: '#f6ead2', suelo: '#8a6a44', intensidad: 1.05 },
  /* plaza de mercado a media mañana */
  plaza: { fondo: '#f0dcb4', cielo: '#f6e8c8', suelo: '#9a7a4a', intensidad: 1.05 },
  /* huerta sana: verde fresco que la mezcla entibia sola */
  huerta: { fondo: '#dbe7c4', cielo: '#eef4dc', suelo: '#7e8a4a', intensidad: 1.05 },
  /* sotobosque de la milpa/bosque: verde hondo */
  sotobosque: { fondo: '#d7e6c9', cielo: '#eaf2df', suelo: '#5f4a2e', intensidad: 1.1 },
  /* la ladera del páramo: bruma sí, pero verde-plata, no celeste frío */
  ladera: { fondo: '#d6e0d2', cielo: '#eaf0e2', suelo: '#6b5236', intensidad: 1.12 },
  /* la bóveda del clima: hemisferio marfil tibio; el fondo lo pone la hora */
  alba: { cielo: '#f2f0e0', suelo: '#757c54', intensidad: 1.05 },
};

/* Los materiales low-poly canónicos (para `MeshLambert` + flatShading). Sacados
   de los tonos que los dioramas ya compartían de facto — esto los vuelve LEY.
   Si un mundo nuevo necesita madera, es ESTA madera. */
export const PALETA = {
  madera: '#7a5a38', // tronco, poste, mango de herramienta
  maderaClara: '#a98a5c', // tabla curada, mesón de mercado
  maderaOscura: '#5a4326', // viga vieja, estaca húmeda
  tierra: '#6b4a2e', // cama de siembra, tierra removida
  tierraClara: '#8a6a44', // suelo seco, camino
  follaje: '#5f8a3f', // el verde de trabajo (surco, mata)
  follajeClaro: '#7a9a3f', // brote, pasto al sol
  follajeOscuro: '#3f6f3a', // copa en sombra, monte
  agua: '#3f8fb0', // el agua viva (acento; el único azul con permiso)
  piedra: '#9a8b74', // tanque, roca de río (gris pardo)
  concreto: '#a89a84', // bocatoma, obra civil — gris CÁLIDO, nunca neutro
  lamina: '#8b8578', // barril, zinc, herraje — ídem
  ambar: '#d9a13b', // señal, fruto seco, alerta amable (nunca rojo catástrofe)
  cal: '#efe7d8', // pared encalada
};
