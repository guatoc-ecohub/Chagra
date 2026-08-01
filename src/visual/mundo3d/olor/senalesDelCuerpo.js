/*
 * senalesDelCuerpo — cómo se lee una cochera sin un solo aparato.
 *
 * "Confíe en sus sentidos, son buenos indicadores: si al entrar no le arden los
 *  ojos ni la nariz de entrada, si la cama al apretarla con la mano se siente
 *  húmeda pero no gotea, y si no hay nubes de mosca sobre el material, va bien.
 *  El buen manejo se nota, no hay que esperar un análisis de laboratorio para
 *  saber si algo anda mal."
 *
 * ────────────────────────────────────────────────────────────────────────────
 * POR QUÉ ACÁ NO HAY NI UN NÚMERO
 *
 * Esto no es una omisión ni una simplificación para campesinos: es la tesis del
 * maestro, y hay que defenderla.
 *
 * En los 56 pares del corpus sobre olores NO HAY UNA SOLA CIFRA. No da ppm de
 * amoníaco. No da la relación carbono:nitrógeno. No da centímetros de cama ni
 * días de la mosca ni porcentaje de pendiente. Y no es que no sepa: es que
 * cuando se lo preguntan, contesta cosas como "no le voy a inventar un
 * porcentaje exacto sin conocer su terreno" y remite a la UMATA. En vez del
 * número, entrega SIEMPRE una señal del cuerpo:
 *
 *   ¿cuántos centímetros de cama?   → apriete un puñado; si gotea, le falta seco
 *   ¿cuándo la cambio?              → "no es un número de días fijo": el olor
 *   ¿cuánto amoníaco es mucho?      → ¿le arden los ojos al entrar?
 *   ¿ya está listo el compost?      → huele a tierra, no a huevo podrido
 *
 * Eso es coherente, no rústico. Un ppm exige un aparato que no hay, un
 * laboratorio que queda a cuatro horas y una plata que no está. El puño está
 * siempre. La pedagogía del maestro es deliberadamente PORTÁTIL.
 *
 * Ponerle a esta pieza un HUD con "NH₃: 34 ppm" habría sido traicionar el
 * material dos veces: inventando un dato que él se negó a dar, y cambiando un
 * saber que el campesino puede usar mañana por una cifra que solo puede mirar.
 *
 * Así que lo que se lee acá abajo es lo que se siente en el cuerpo. Nada más.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * Y SIN REGAÑO.
 *
 * Ni una sola de estas frases dice qué hacer, ni usa "debe", ni "no debe", ni
 * "recuerde que". Son descripciones de lo que está pasando ahí, ahora. El
 * campesino no tiene la culpa de que su cochera huela — nadie le explicó — y el
 * que llega a explicarle con el dedo levantado ya perdió.
 *
 * Se le muestra. Él saca la cuenta.
 *
 * En "usted", como toda la UI de la casa.
 */

/* ------------------------------------------------------------------ */
/* Las paradas del riel — no son pantallas, son puntos del camino.     */
/* ------------------------------------------------------------------ */

/*
 * Cuatro paradas. Los textos cuentan QUÉ PASA (física), nunca qué hacer
 * (orden). Y ninguna se llama "mal" o "bien": se llaman por lo que hay.
 */
export const PARADAS = [
  {
    clave: 'pelado',
    carbono: 0,
    titulo: 'Piso pelado',
    texto:
      'Estiércol y orín revueltos, lavados con manguera. Mezclados se pudren juntos, y de ahí sale el olor fuerte. Ese amoníaco es nitrógeno que se va al aire: abono que no va a llegar a la huerta.',
  },
  {
    clave: 'capita',
    carbono: 0.32,
    titulo: 'Una capa delgada',
    texto:
      'Ya hay algo seco que absorbe. El lodo cede y el olor baja, pero la capa no alcanza a cubrir donde más orinan: el nitrógeno sigue encontrando por dónde volarse.',
  },
  {
    clave: 'cubre',
    carbono: 0.66,
    titulo: 'Ya cubre',
    texto:
      'El material seco cubre toda el área. El nitrógeno encuentra carbono con qué amarrarse y se queda en la cama en vez de irse al aire. Las moscas se van quedando sin dónde poner.',
  },
  {
    clave: 'profunda',
    carbono: 1,
    titulo: 'Cama profunda',
    texto:
      'Un colchón grueso, seco y suelto. Fermenta despacio, genera algo de calor y huele a tierra. Todo ese oro que se estaba volando ahora está guardado ahí abajo: sale como abono semicompostado.',
  },
];

/** La parada más cercana al carbono actual. */
export function paradaDe(carbono) {
  let mejor = PARADAS[0];
  let dist = Infinity;
  for (const p of PARADAS) {
    const d = Math.abs(p.carbono - carbono);
    if (d < dist) {
      dist = d;
      mejor = p;
    }
  }
  return mejor;
}

/* ------------------------------------------------------------------ */
/* Las tres señales — puño, ojos, mosca.                               */
/* ------------------------------------------------------------------ */

/*
 * LA PRUEBA DEL PUÑO. El laboratorio del maestro: gratis, portátil, en la mano.
 *
 *   "Si al apretar un puñado de la cama sale mojada goteando o huele fuerte, le
 *    falta material seco. Vaya agregando poco a poco y observando."
 *
 *   "Si la cama al apretarla con la mano se siente húmeda pero no gotea (...),
 *    va bien."
 *
 * OJO CON LA ASIMETRÍA — acá se cometía un error fácil. En la PILA DE COMPOST
 * pasarse de seco sí existe: "si se desmorona completamente seco, le falta agua
 * y el proceso se frena". Pero eso es de la pila, no de la CAMA. Sobre la cama
 * el maestro nunca dice "se pasó de cascarilla"; dice lo contrario: "cualquier
 * material carbonado seco es mejor que no echar nada".
 *
 * Por eso acá solo hay tres estados y el último es el bueno: en la cama, el puño
 * detecta EXCESO DE AGUA, no falta. Una cama profunda viva siempre conserva su
 * humedad (fermenta, calienta), así que "se desmorona seca" no existe en esta
 * pieza — y si existiera, estaríamos regañando al que hizo todo bien.
 */
export function senalPuno(a) {
  /* Los cortes están calzados con las paradas del riel, no puestos a ojo: el
     lodo deja de chorrear justo cuando la primera capa de seco ya absorbe
     ("Una capa delgada": el lodo cede), y la bola aparece cuando el material
     alcanza a cubrir ("Ya cubre"). Si el puño y el texto de la parada dijeran
     cosas distintas, el que mira le creería al puño — y con razón. */
  if (a.humedad > 0.86) return { texto: 'Chorrea agua entre los dedos', bien: false };
  if (a.humedad > 0.64) return { texto: 'Sale pastosa y le mancha la mano', bien: false };
  return { texto: 'Se pega en bola y no gotea', bien: true };
}

/*
 * EL ARDOR. La alarma que el cuerpo da gratis — y la frase madre del corpus:
 *
 *   "Significa que sus gallinas llevan horas respirando ese mismo amoníaco antes
 *    de que usted entrara (...). El ojo humano es sensible al amoníaco desde
 *    concentraciones bajas, así que si a usted le arde, para las gallinas —que
 *    están ahí todo el día con la cabeza cerca del piso— la exposición es mucho
 *    peor. Tómelo como una alarma real, no como una molestia pasajera."
 *
 * El `aparte` es esa frase, y aparece SOLO cuando arde. No es un consejo: es la
 * traducción de lo que uno está sintiendo en ese momento. Uno siente el ardor y
 * el texto le dice qué significa. Ese es el momento en que la escena hace clic —
 * y por eso está redactado como un dato y no como un reproche.
 */
export function senalOjos(a) {
  if (a.arde > 0.66)
    return {
      texto: 'Le arden los ojos apenas entra',
      bien: false,
      aparte: 'A usted le arde parado. La gallina lleva horas con la cabeza ahí abajo.',
    };
  if (a.arde > 0.3)
    return {
      texto: 'Al rato le pica la nariz',
      bien: false,
      aparte: 'Abajo, donde ella respira, está mucho más cargado.',
    };
  if (a.arde > 0.07) return { texto: 'Se alcanza a sentir, pero se aguanta', bien: false };
  return { texto: 'No arde. Huele a tierra', bien: true };
}

/*
 * LAS MOSCAS. Cuelgan de la humedad, no del olor — son primas, no hijas. Por
 * eso el texto del final nombra la cama y no la peste: el que entiende que la
 * mosca sale del material húmedo deja de comprar veneno.
 */
export function senalMosca(a) {
  if (a.moscas > 0.62) return { texto: 'Nube de moscas sobre el bebedero', bien: false };
  if (a.moscas > 0.3) return { texto: 'Hay moscas rondando el charco', bien: false };
  if (a.moscas > 0.08) return { texto: 'Alguna mosca suelta', bien: false };
  return { texto: 'Sin moscas: no tienen dónde poner', bien: true };
}

/*
 * EL VECINO. Aparece solo cuando el olor desborda el lindero, porque hasta
 * entonces no es asunto de nadie más. Y cuando el manejo ya está bueno pero la
 * nube todavía va llegando, dice lo que hay que decir:
 *
 *   "Mostrarle que ya empezó a actuar (aunque el resultado tarde unas semanas)
 *    suele calmar más al vecino que una promesa vaga."
 */
export function senalVecino(a) {
  if (a.vecino > 0.45) return { texto: 'El olor le está pasando la cerca', bien: false };
  if (a.vecino > 0.12) return { texto: 'Llega apenas al lindero', bien: false };
  return null;
}

/*
 * EL POZO. Solo habla cuando hay encharcamiento — y entonces cambia de tono,
 * porque cambió de tema. Acá se rompe la regla de "sin alarma" a propósito: el
 * amoníaco roba, el sulfhídrico mata, y con eso no se hace pedagogía suave.
 *
 *   "Puede noquear o matar a una persona en segundos (...). Ha habido casos
 *    donde muere la primera persona por los gases y luego mueren quienes entran
 *    a rescatarla sin protección."
 *
 * Es el único texto de la pieza que sí es una advertencia. Un maestro que no
 * avisa de esto no es amable: es cómplice.
 */
export function senalPozo(a) {
  if (a.sulfhidrico > 0.35)
    return {
      texto: 'Huele a huevo podrido en la fosa',
      bien: false,
      aparte: 'Ese gas pesa y se queda en el hueco. No avisa: a lo último deja de olerse. A esa fosa no se asoma nadie solo.',
    };
  if (a.sulfhidrico > 0.06)
    return { texto: 'Un tufo raro cerca de la fosa', bien: false };
  return null;
}

/** Todas las señales que hay que mostrar, en orden de lectura. */
export function senalesDe(a) {
  return [senalPuno(a), senalOjos(a), senalMosca(a), senalVecino(a), senalPozo(a)].filter(Boolean);
}
