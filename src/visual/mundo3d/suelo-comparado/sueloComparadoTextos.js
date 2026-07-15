/*
 * sueloComparadoTextos — LA VOZ de la pieza. Todo el texto en un solo lugar,
 * cada afirmación con su fuente, y las exclusiones explícitas.
 *
 * ── EL REGISTRO (copiado del corpus, no inventado) ──────────────────────────
 * El corpus de Chagra tiene una voz muy precisa y hay que respetarla, porque es
 * la razón por la que le creen. Es sistemáticamente ANTI-PROMESA:
 *   - valida al campesino antes de contradecirlo: "Entiendo el afán, eso
 *     enmontado da rabia";
 *   - reconoce el costo de lo que propone: "Es más trabajo las primeras veces";
 *   - y se FRENA antes de exagerar: "no es magia", "No hay una cifra exacta que
 *     le pueda dar con certeza", "No conviene atribuirle todo a la micorriza",
 *     "Yo no le prometería que sus matas 'se avisan' como personas".
 *
 * Ese freno no es timidez: es el activo. La voz del veneno (el campo `rejected`
 * del DPO) es toda superlativos y calendarios fijos — "santo remedio",
 * "impecable", "en ocho días", "sin ninguna maleza visible". Si esta pieza habla
 * con superlativos, suena igualita al bulto y pierde. Gana por contraste de
 * registro, no por gritar más duro.
 *
 * Tono: USTED, colombiano, campesino. Nada de argentinismos, nada de
 * "toca cambiar el paradigma", nada de ONG. Frases cortas. Verbos de campo.
 *
 * ── HONESTIDAD: QUÉ NO DICE ESTA PIEZA ─────────────────────────────────────
 * (el detalle largo y las fuentes están en `sueloComparado.geom.js`)
 *   1. NADA de cáncer ni salud humana. La pieza va del SUELO. La salud humana
 *      está en disputa real y una disputa no se dibuja como hecho.
 *   2. NADA de quelación, manganeso, AMPA ni shikimato: CERO hits en el corpus
 *      (verificado por grep sobre los 20 .jsonl). No están → no se dicen.
 *   3. NADA de "resistencia de malezas": CERO hits. El círculo vicioso se cuenta
 *      con el REBROTE DEL RIZOMA del kikuyo [16], que sí está y es honesto.
 *   4. Las cifras de dosis SOLO aparecen marcadas como la voz del bulto, porque
 *      viven todas en el `rejected` del DPO.
 *   5. La concesión de [17] VA. Un arte que no concede nada no lo creen.
 */

/* ── El encabezado ───────────────────────────────────────────────────────── */
export const TITULO = {
  titulo: 'El mismo suelo, dos veces',
  bajada: 'Lo de arriba se ve igual. Lo de abajo no.',
};

/* ── Los dos lados. Ojo con el nombre: el lado castigado NO se llama "muerto".
      Se llama APAGADO, y eso es a propósito — un suelo apagado se puede volver a
      prender, y el corpus dice que sí [49]. Si lo llamamos muerto, cerramos la
      puerta que la pieza entera quiere dejar abierta. ─────────────────────── */
export const LADOS = {
  vivo: {
    id: 'vivo',
    nombre: 'Suelo con red',
    pie: 'La mata no come sola. Tiene con quién.',
  },
  apagado: {
    id: 'apagado',
    nombre: 'Suelo fumigado seguido',
    pie: 'La mata está viva. Lo que se apagó fue con quién.',
  },
};

/*
 * ── LOS HOTSPOTS ────────────────────────────────────────────────────────────
 * Cada uno: `punto` (dónde toca), `titulo` (lo que se lee de una), `texto` (la
 * explicación en voz de campo) y `fuente` (de dónde salió — NO se muestra en
 * pantalla, es para el que mantiene esto y para poder auditar la pieza).
 *
 * `lado` decide en qué X vive: 'vivo', 'apagado' o 'ambos' (los que cruzan).
 */
export const HOTSPOTS = [
  {
    id: 'intercambio',
    lado: 'vivo',
    titulo: 'El trato',
    texto:
      'La mata le paga al hongo con azúcar que ella fabrica con la luz del sol. '
      + 'El hongo no puede hacer fotosíntesis: sin esa azúcar se muere de hambre. '
      + 'A cambio le busca fósforo y agua donde la raíz sola nunca llegaría. '
      + 'No es un regalo que la debilite: es una inversión, y le sale ganancioso.',
    fuente: 'teacher-micorrizas [19], [20]',
  },
  {
    id: 'red',
    lado: 'vivo',
    titulo: 'La red',
    texto:
      'Estos hilos no se quedan en una mata: pasan de una a otra. Por eso el maíz, '
      + 'el fríjol y la ahuyama se ayudan por debajo, y por eso un palo grande le '
      + 'manda de lo suyo a las maticas de su sombra. Es la parte de la finca que '
      + 'trabaja calladita, sin pedir crédito — y por eso la más fácil de dañar sin '
      + 'darse cuenta.',
    fuente: 'teacher-micorrizas [3], [9]',
  },
  {
    id: 'raicilla',
    lado: 'vivo',
    titulo: 'El pelito blanco',
    texto:
      'Esas raíces finas blancas, como algodón, alrededor de la raíz: eso es la red '
      + 'agarrada. Cave un huequito y búsquelas. Es gratis y no tiene que creerle a '
      + 'nadie.',
    fuente: 'teacher-micorrizas [100], [103]',
  },
  {
    id: 'grumo',
    lado: 'ambos',
    titulo: 'Grumo o polvo',
    texto:
      'Agarre un puñado. Si se rompe en grumitos como migas de pan húmedas que no se '
      + 'deshacen fácil, hay algo vivo manteniendo esa tierra pegada. Si se le va en '
      + 'polvo suelto o sale un bloque duro, ya no.',
    fuente: 'teacher-micorrizas [6], [100], [105]',
  },
  {
    id: 'lombriz',
    lado: 'ambos',
    titulo: 'La lombriz',
    texto:
      'Cave y cuente. Si no aparece ninguna en un suelo que debería tenerlas, eso es '
      + 'una alerta — sea por químico, por sequedad o porque está muy apretado. Fíjese '
      + 'que el túnel queda: la casa está lista, la que no está es ella.',
    fuente: 'teacher-micorrizas [102]; dpo-frontera-agroecologica [0]',
  },
  {
    id: 'olor',
    lado: 'ambos',
    titulo: 'El olor',
    texto:
      'Huela un puñado húmedo. Debe oler a tierra de bosque. Si huele a podrido o a '
      + 'huevo dañado, le falta aire. Y ojo con esta: un suelo que no huele a nada '
      + 'puede ser un suelo con poca vida.',
    fuente: 'teacher-micorrizas [100], [101]',
  },
  {
    id: 'hilo-roto',
    lado: 'apagado',
    titulo: 'El hilo cortado',
    texto:
      'Los hilos del hongo son finísimos y se parten. Una vez partidos, tardan meses '
      + 'en volverse a tejer. Y el herbicida se lleva de golpe muchas raíces vivas: '
      + 'las que le daban de comer a la red.',
    fuente: 'teacher-micorrizas [36], [45]',
  },
  {
    id: 'fosforo-pegado',
    lado: 'apagado',
    titulo: 'El fósforo está ahí',
    texto:
      'Mírelo bien: el fósforo no se fue. Está ahí, quieto, pegado al hierro y a la '
      + 'arcilla — en suelo de ladera se pega así. El que lo soltaba era el hongo. '
      + 'Sin él, su mata tiene la comida a un centímetro y no la alcanza. Por eso '
      + 'toca comprarla en bulto.',
    fuente: 'teacher-micorrizas [21], [30]',
  },
  {
    id: 'trampa',
    lado: 'apagado',
    titulo: 'Ahí está la trampa',
    texto:
      'Fumiga seguido, el suelo queda más pobre en vida. Con el suelo pobre le toca '
      + 'comprar más insumo. Y mientras más compra, menos le hace falta la red — hasta '
      + 'que un día ya no la tiene y no puede parar de comprar. Lo más rápido hoy le '
      + 'sale más caro mañana.',
    fuente: 'dpo-frontera-agroecologica [18]; teacher-micorrizas [32]',
  },
  {
    id: 'rebrote',
    lado: 'apagado',
    titulo: 'Y vuelve a salir',
    texto:
      'El kikuyo se riega por rizoma. El químico se lo quema por encima, pero a las '
      + 'semanas rebrota de la raíz que quedó viva. Entonces toca volver a fumigar. Y '
      + 'otra vez. Cada vuelta le cuesta plata y le cuesta suelo.',
    fuente: 'dpo-frontera-agroecologica [16]',
  },
  {
    id: 'agua',
    lado: 'ambos',
    titulo: 'El agua escondida',
    texto:
      'Los hilos del hongo llegan a poros chiquiticos donde queda agua guardada '
      + 'después de que la superficie ya se secó. Esa es agua que su mata se toma en '
      + 'el verano y que sin la red se queda ahí sin que nadie la saque.',
    fuente: 'teacher-micorrizas [22]',
  },
  {
    id: 'espora',
    lado: 'apagado',
    titulo: 'Lo que no se apagó',
    texto:
      'Esas perlitas siguen prendidas hasta en lo más castigado: es el banco de '
      + 'esporas que ya está en su tierra. Si para, de ahí vuelve a arrancar la red — '
      + 'más si tiene un rastrojo o un monte cerquita que le mande más.',
    fuente: 'teacher-micorrizas [49], [65], [66]',
  },
];

/*
 * ── EL CIERRE ───────────────────────────────────────────────────────────────
 * La pieza NO termina en regaño. Termina en que se puede.
 *
 * Pero ojo con el orden, que es deliberado: primero la asimetría (perder es
 * rápido, ganar es lento), DESPUÉS la esperanza. Al revés sonaría a que no pasa
 * nada. Y la esperanza va con su precio puesto — "varias temporadas", "no es
 * magia" — porque una esperanza sin precio es una promesa, y las promesas son
 * el idioma del bulto, no el nuestro.
 */
export const CIERRE = {
  asimetria: {
    titulo: 'Se pierde más rápido de lo que se gana',
    texto:
      'Un par de pasadas fuertes le borran en poco tiempo lo que costó años armar. '
      + 'Los hilos cortados tardan meses en volver. Subir la materia orgánica un solo '
      + 'punto puede tomarle hasta veinte años con buen manejo. Así de disparejo es el '
      + 'trato.',
    fuente: 'teacher-micorrizas [36], [80]; teacher-agua-suelo [91]',
  },
  esperanza: {
    titulo: 'Pero vuelve',
    texto:
      'No es para siempre. Si cambia el manejo —menos arada, más cobertura, compost y '
      + 'tiempo— la red se vuelve a tejer. No es de un día para otro: puede tomar '
      + 'varias temporadas. Pero el suelo tiene memoria biológica, y la naturaleza '
      + 'sabe reconstruirse si uno deja de interrumpirla.',
    fuente: 'teacher-micorrizas [49], [82]',
  },
  primerPaso: {
    titulo: 'Lo primero es lo más barato',
    texto:
      'Dejar de dejar el suelo pelado. Lo que más falta hace no es comprar hongo: es '
      + 'dejar de dañar el que ya está ahí.',
    fuente: 'teacher-micorrizas [50], [63]',
  },
};

/*
 * ── LA CONCESIÓN ────────────────────────────────────────────────────────────
 * Esto NO es un descargo legal ni una debilidad de la pieza. Es la frase que
 * hace que le crean todo lo demás. Un campesino que ya oyó a cien predicadores
 * reconoce al que le está vendiendo algo: el que no concede NADA está vendiendo.
 * El corpus concede, y por eso el corpus convence. Se queda.
 */
export const CONCESION = {
  titulo: 'Sin fanatismo',
  texto:
    'Entiendo el afán: eso enmontado da rabia, y el químico es barato y sirve. En una '
    + 'invasión muy brava de una maleza que no sale con nada, una aplicación puntual y '
    + 'bien dirigida puede ser la única salida real, y no se la vamos a negar solo por '
    + 'principio. Eso es la excepción. Lo que no hacemos acá es recetarlo como rutina '
    + 'de calendario.',
  fuente: 'dpo-frontera-agroecologica [17]',
};

/*
 * ── LAS DOS CADENCIAS ───────────────────────────────────────────────────────
 * El hallazgo más lindo del corpus, y es una rima que estaba ahí sin que nadie
 * la buscara: LAS DOS PRÁCTICAS TIENEN EL MISMO CALENDARIO.
 *
 *   El bulto:  "repita la aplicación cada tres o cuatro semanas"   [rejected]
 *   La guadaña: "toca repetir el corte cada tres o cuatro semanas" [chosen]
 *
 * Mismo ritmo. Mismo trabajo. Una le apaga el suelo y la otra se lo abona. Puesto
 * lado a lado, el argumento se arma solo y sin que nadie regañe a nadie: no es
 * "trabaje más", es "el mismo trabajo, para otro lado".
 *
 * OJO CON LA CIFRA: "3-4 litros por hectárea" y "en ocho días ve el potrero
 * limpio" salen del `rejected` — son la voz que el corpus RECHAZA. Van marcadas
 * como cita del bulto (`esVozDelBulto: true`), NUNCA en boca de la pieza. Si
 * alguien las muestra sin esa marca, rompió la regla.
 */
export const CADENCIAS = {
  titulo: 'El mismo trabajo, para otro lado',
  bulto: {
    voz: 'Lo que dice el bulto',
    texto: 'Repita la aplicación cada tres o cuatro semanas.',
    esVozDelBulto: true,
    fuente: 'dpo-frontera-agroecologica [0, 5, 9, 18] — campo `rejected`',
  },
  guadana: {
    voz: 'Lo que hacemos acá',
    texto:
      'Corte antes de que la maleza florezca y déjela ahí encima como cobertura '
      + 'muerta: eso ahoga la que va naciendo y además abona. Toca repetir el corte '
      + 'cada tres o cuatro semanas. No es magia, pero el suelo se lo agradece con el '
      + 'tiempo.',
    esVozDelBulto: false,
    fuente: 'dpo-frontera-agroecologica [2] — campo `chosen`',
  },
};

/* ── El control (usted, colombiano) ──────────────────────────────────────── */
export const CONTROL = {
  apagar: 'Fumigar seguido',
  recuperar: 'Parar y dejarla volver',
  vivo: 'Suelo con red',
  apagado: 'Suelo fumigado',
  ayuda: 'Toque y arrastre para mover el suelo. Toque los puntos para leer.',
};

/** Los hotspots de un lado ('vivo' | 'apagado'), incluyendo los de 'ambos'. */
export const hotspotsDe = (lado) =>
  HOTSPOTS.filter((h) => h.lado === lado || h.lado === 'ambos');
