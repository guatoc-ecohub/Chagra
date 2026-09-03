/*
 * aireCargado — el MODELO del olor. Una sola variable manda: el material seco.
 *
 * Toda esta pieza cuelga de un número: `carbono` ∈ [0,1] — cuánto material seco
 * (aserrín, cascarilla de arroz, cisco de café, hoja seca) tiene la cama. No hay
 * cinco escenas pintadas a mano: hay UNA cochera y una cantidad de aserrín.
 * El amoníaco, las moscas, el charco, la nube que cruza la cerca y el pozo que
 * calla son CONSECUENCIAS calculadas de ese número, igual que en la ladera de
 * restauración todo colgaba de `dosel(anio)`.
 *
 * Por qué el carbono y no "el aseo": porque esa es la tesis del maestro, y es
 * contraintuitiva —
 *
 *   "Casi siempre el problema no es que limpie poco, sino que limpia sin
 *    agregar suficiente material carbonado nuevo."
 *
 * El campesino que lava con manguera todos los días está trabajando MÁS y
 * oliendo PEOR. Si el deslizador de esta pieza fuera "cuánto limpia", la pieza
 * mentiría. Es cuánto carbono. Ese es el reencuadre entero.
 *
 * LA LEY DE ESTE ARCHIVO — la conservación del nitrógeno:
 *
 *   nitrogeno.aire + nitrogeno.cama = 1   (siempre, para todo carbono)
 *
 * El nitrógeno no se crea ni se destruye: o se vuela como amoníaco, o queda
 * amarrado en la cama como abono. Por eso las motas doradas de la escena son UN
 * solo sistema de partículas: las mismas motas que se fugaban por el caballete
 * ahora se sedimentan y brillan dentro del colchón. El oro no desaparece —
 * cambia de lugar. Ese es el argumento de la pieza en una sola línea de código.
 *
 * SIN CIFRAS INVENTADAS. El corpus del maestro (56 pares sobre olores) es
 * deliberadamente pobre en números: no da ppm de amoníaco, ni relación C:N, ni
 * centímetros de cama, y cuando se lo preguntan responde "no le voy a inventar
 * un número" y remite a la UMATA. Su pedagogía está construida sobre señales
 * del cuerpo —la prueba del puño, el ardor de ojos, el olor a tierra— PRECISA-
 * MENTE en lugar de métricas. Así que acá no hay HUD con ppm ni barra de
 * "eficiencia": las curvas de abajo son dirección de ARTE (cómo se ve el gas),
 * no una tabla de laboratorio. El que juzga es el ojo, como en la finca.
 *
 * Puro: números adentro, números afuera. Cero three, cero costo por frame.
 */

/* ------------------------------------------------------------------ */
/* Las alturas — LA MEDIDA QUE ARGUMENTA.                              */
/* ------------------------------------------------------------------ */

/*
 * La escena está en metros (1 unidad = 1 m) y estas alturas son el corazón de
 * la pieza, no decoración:
 *
 *   "Si a usted le arden los ojos al entrar al gallinero, la gallina lleva
 *    horas así."
 *
 * El amoníaco no se reparte parejo: es denso abajo y ralo arriba. La gallina
 * vive con la cabeza a un palmo del piso — o sea, DENTRO del estrato malo, todo
 * el día. El humano entra, le arde, y su nariz está a metro y medio: le arde
 * estando AFUERA de lo peor. Ese contraste no se explica con texto en esta
 * pieza; se ve, porque los cuerpos están parados a su altura real y el velo
 * tiene un borde.
 */
export const ALTURAS = {
  cama: 0.0, // la superficie de la cama: donde nace todo
  gallina: 0.26, // cabeza de la gallina picoteando: adentro del velo
  cerdo: 0.38, // nariz del cerdo echado: adentro del velo
  nariz: 1.58, // nariz del que entra: por encima — y aun así le arde
  caballete: 2.9, // la salida de aire de arriba: por donde se fuga el oro
};

/* ------------------------------------------------------------------ */
/* Curvas — la forma de cada consecuencia.                             */
/* ------------------------------------------------------------------ */

const cortar = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const suave = (t) => t * t * (3 - 2 * t);

/**
 * Rampa suave entre dos umbrales (el `smoothstep` de la casa).
 * @param {number} a  donde empieza
 * @param {number} b  donde termina
 * @param {number} v  el valor
 */
export const rampa = (a, b, v) => suave(cortar((v - a) / (b - a)));

/* ------------------------------------------------------------------ */
/* EL MODELO.                                                          */
/* ------------------------------------------------------------------ */

/**
 * El estado del aire para una cantidad de material seco.
 *
 * @param {number} carbono  0 = piso pelado lavado con manguera (puro estiércol
 *                          y orín revueltos) · 1 = cama profunda bien hecha,
 *                          seca y suelta.
 * @returns {{
 *   carbono: number, saturacion: number, humedad: number, amoniaco: number,
 *   sulfhidrico: number,
 *   moscas: number, vecino: number, fermento: number, arde: number,
 *   nitrogeno: { aire: number, cama: number },
 *   alturaVelo: number,
 * }}
 */
export function aire(carbono) {
  const c = cortar(carbono);

  /*
   * SATURACIÓN — cuánta agua de más hay ahogando la cama.
   *
   * Es el motor de todo lo malo: el agua saca el aire de entre las partículas y
   * ahí empieza el problema. El material seco absorbe —ese es su primer oficio,
   * antes que el químico— y la curva cae rápido al principio (la primera palada
   * de aserrín se nota muchísimo: pasa de lodo a suelo pisable) y después se
   * aplana. De ahí la potencia 0.7 y no una recta.
   *
   *   "El agua desplaza el aire de los espacios entre el estiércol y la cama, y
   *    el proceso pasa de ser aeróbico (con aire, más limpio) a anaeróbico (sin
   *    aire, el que produce el ácido sulfhídrico y más amoníaco)."
   */
  const saturacion = Math.pow(1 - c, 0.7);

  /*
   * HUMEDAD — la del PUÑO, que es otra cosa, y confundirlas arruinaba la pieza.
   *
   * La cama profunda bien hecha NO está seca como un papel: está viva. Fermenta
   * suave, genera calor y para eso necesita humedad. El punto bueno es "húmeda
   * al tacto, se pega en bola, no gotea" — no cero.
   *
   * Por eso la humedad nunca baja de ~0.3 por más aserrín que uno eche: una cama
   * trabajando siempre tiene su agua. Si esto cayera a cero, la prueba del puño
   * marcaría "se desmorona seca" justo en el estado ideal, y la pieza terminaría
   * regañando al que hizo todo bien.
   *
   * Y ojo con la asimetría: en la PILA de compost pasarse de seco sí existe (el
   * proceso se frena sin agua). En la CAMA no: el maestro nunca dice "se pasó de
   * cascarilla", dice "cualquier material carbonado seco es mejor que no echar
   * nada". Acá más carbono nunca es peor. Por eso hay un piso y no un óptimo.
   */
  const humedad = 0.3 + 0.7 * saturacion;

  /*
   * AMONÍACO — el nitrógeno sin con qué amarrarse.
   *   "El estiércol solo es puro nitrógeno (poco carbono), y cuando el
   *    nitrógeno no tiene con qué 'amarrarse' se escapa como amoníaco oloroso."
   *
   * Dos factores que se multiplican, porque el maestro nombra dos oficios
   * distintos del mismo puñado de aserrín:
   *   - `libre`: el nitrógeno que no encontró carbono con qué quedarse.
   *   - `saturacion`: hasta el nitrógeno amarrado se vuela si el material está
   *     empapado (el agua saca el aire y dispara el olor amoniacal).
   * Por eso el carbono entra dos veces: absorbe Y amarra. Un solo puñado hace
   * los dos trabajos — y por eso la curva se desploma tan rápido.
   */
  const libre = Math.pow(1 - c, 1.35);
  const amoniaco = cortar(libre * (0.45 + 0.55 * saturacion));

  /*
   * ÁCIDO SULFHÍDRICO — el otro olor, que NO es el mismo problema.
   * Esto no es "más amoníaco": es otra química, la de lo podrido SIN AIRE.
   * Por eso tiene UMBRAL y no rampa: no aparece porque la cama esté regular,
   * aparece cuando hay agua empozada y el material se pudre ahogado. Mientras
   * quede algo de aire entre las partículas, sencillamente no existe. Un
   * descuido leve huele a amoníaco; solo el encharcamiento huele a huevo podrido.
   */
  const sulfhidrico = rampa(0.62, 0.98, saturacion);

  /*
   * MOSCAS — atención: NO cuelgan del amoníaco, cuelgan de la SATURACIÓN.
   *   "Las moscas no vienen atraídas por el olor en sí, sino por el mismo
   *    material húmedo, blando y rico en materia orgánica donde ese olor se
   *    produce. (...) Si tiene mucho olor, casi con seguridad también tiene
   *    mucha mosca; son la misma causa."
   *
   * Que en el código dependan de `saturacion` y no de `amoniaco` es lo que hace
   * honesta la escena: olor y mosca son PRIMOS (misma causa), no padre e hijo.
   * Por eso fumigar no sirve —mata la generación de hoy y la cama sigue siendo
   * criadero— y por eso el mismo puñado de aserrín apaga los dos a la vez.
   */
  const moscas = cortar(Math.pow(saturacion, 1.25));

  /*
   * EL VECINO — lo que cruza la cerca.
   * Va después del amoníaco: primero tiene que haber de sobra adentro para que
   * salga y viaje. Con manejo mediano el olor existe pero se queda en la
   * cochera; el conflicto arranca cuando desborda el lindero.
   */
  const vecino = cortar(rampa(0.28, 0.95, amoniaco));

  /*
   * FERMENTO — la cama buena no es "la ausencia de olor": está VIVA.
   *   "Bien manejada, la cama fermenta suavemente, genera algo de calor,
   *    controla el olor y al final se saca como abono ya semicompostado."
   * Aparece solo en el tramo bueno. Es la recompensa: donde había gas hay calor,
   * y ese calor huele a tierra. El final de la pieza no es un vacío — es trabajo.
   */
  const fermento = rampa(0.55, 1, c);

  /*
   * ARDE — la señal del cuerpo, lo único que el maestro acepta como medida.
   * No es un ppm: es "¿le arden los ojos al entrar?". Se enciende antes de que
   * el amoníaco esté al tope, porque el ojo humano es sensible desde
   * concentraciones bajas — y esa sensibilidad temprana es justamente la alarma.
   */
  const arde = rampa(0.18, 0.7, amoniaco);

  /*
   * LA CONSERVACIÓN — el corazón.
   * Lo que no se voló, está en la cama. Ni un grano se pierde en el camino:
   * `aire + cama === 1`. La escena pinta esta línea literalmente con las mismas
   * partículas doradas.
   */
  const nitrogeno = { aire: amoniaco, cama: 1 - amoniaco };

  /*
   * ALTURA DEL VELO — hasta dónde llega el aire cargado.
   * Con la cama empapada el estrato le pasa por encima a la gallina y le lame
   * la cara; con cama buena se hunde hasta ser una lámina al ras que ni ella
   * respira. Nunca llega a la nariz del humano: no hace falta para que le arda,
   * y fingir que sí sería el humito de caricatura que esta pieza evita.
   */
  const alturaVelo = 0.1 + amoniaco * 0.72;

  return {
    carbono: c,
    saturacion,
    humedad,
    amoniaco,
    sulfhidrico,
    moscas,
    vecino,
    fermento,
    arde,
    nitrogeno,
    alturaVelo,
  };
}

/**
 * Densidad del velo a una altura dada — la curva que ARGUMENTA la pieza.
 *
 * El gas no llena el galpón como un vaso de agua: se acuesta. Es denso contra
 * la cama (ahí nace) y se ralea hacia arriba. Esta función es la razón por la
 * que la gallina y el humano no viven en el mismo aire aunque estén en el mismo
 * cuarto — y por la que el humano cree que "no es para tanto".
 *
 * El exponente 2.4 no es tuneo: es lo que hace que a la altura de la gallina
 * (0.26 m) la densidad sea varias veces la que hay en la nariz del humano
 * (1.58 m). La distancia entre esos dos números es el mensaje de la pieza.
 *
 * @param {number} y      altura en metros sobre la cama
 * @param {number} techo  `alturaVelo` del estado del aire
 * @returns {number} 0..1
 */
export function densidadEnAltura(y, techo) {
  if (y <= 0) return 1;
  const t = cortar(y / Math.max(0.001, techo));
  /* Cola larga: por encima del velo el aire NO está limpio de golpe — queda un
     resto que sube hasta el caballete. Es lo que le arde al que entra. */
  const nucleo = Math.pow(1 - t, 2.4);
  const cola = 0.16 * Math.exp(-y * 0.55);
  return cortar(nucleo + cola);
}

/* ------------------------------------------------------------------ */
/* Tier — cuántas motas, cuántas moscas.                               */
/* ------------------------------------------------------------------ */

/*
 * La gama baja también tiene cochera. El argumento de la pieza no puede vivir
 * en el conteo de partículas: con 90 motas y 3 estratos la lectura es la misma
 * —el oro se va o se queda, el velo pesa a la altura de la gallina— y ese es el
 * único criterio que decide estos números.
 */
const CONTEOS = {
  alto: { motas: 420, moscas: 26, estratos: 7, cuerpos: true },
  medio: { motas: 200, moscas: 14, estratos: 5, cuerpos: true },
  bajo: { motas: 90, moscas: 7, estratos: 3, cuerpos: true },
};

/** @param {'alto'|'medio'|'bajo'} tier */
export const olorDeTier = (tier) => CONTEOS[tier] || CONTEOS.medio;
