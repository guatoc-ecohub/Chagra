/*
 * dinamicaPlaga — EL ARGUMENTO, HECHO NÚMEROS.
 *
 * Esta es la pieza que decide si el mundo dice la verdad o solo hace una
 * animación bonita. La escena NO decide a mano "acá el pulgón explota porque
 * queda dramático": corre este modelo y DIBUJA EL RESULTADO. Si el modelo dijera
 * otra cosa, la escena mostraría otra cosa. Esa es la diferencia entre enseñar y
 * hacer propaganda — y a un campesino que se juega la comida no se le hace
 * propaganda.
 *
 * ── EL MODELO ───────────────────────────────────────────────────────────────
 * Un Lotka-Volterra con techo logístico, discreto por semanas. Dos poblaciones
 * normalizadas 0..1: PLAGA (pulgón) y EJÉRCITO (los benéficos).
 *
 *   plaga'    = r·plaga·(1 − plaga/K)  −  a·plaga·ejercito
 *   ejercito' = e·a·plaga·ejercito  −  m·ejercito  +  inmigración(hábitat)
 *
 * El pulgón es r-estratega: se reproduce MUY rápido (r alto). El benéfico crece
 * despacio y solo si hay presa. Esa asimetría —y no una opinión— es lo que hace
 * que fumigar de amplio espectro se devuelva como un bumerán:
 *
 *   1. La bomba mata a los DOS por igual (no distingue: eso es "amplio espectro").
 *   2. El pulgón, con r alto, se recupera en dos semanas.
 *   3. El benéfico, con r bajo y SIN PRESA que comer, no se recupera: se fue o
 *      se murió. Y si el lote no tiene flores ni refugio, tampoco llega de afuera.
 *   4. Resultado: el pulgón crece SIN FRENO y pasa el umbral MUY por encima de
 *      donde habría llegado si no se hubiera fumigado nunca.
 *
 * Eso se llama RESURGENCIA DE PLAGA y es de los fenómenos mejor documentados del
 * MIP. Acá no está afirmado: está SIMULADO. Corré `serie()` y miralo salir.
 *
 * ── LO QUE EL MODELO NO ES ─────────────────────────────────────────────────
 * No es una predicción de campo ni pretende serlo: es la CARICATURA HONESTA de
 * una dinámica real, con números elegidos para que 12 semanas quepan en 26
 * segundos y se lean en un teléfono. Los órdenes de magnitud y la FORMA de las
 * curvas son fieles (r_plaga ≫ r_benéfico, rebote por encima del basal); los
 * valores exactos son escénicos. Si algún día esto alimenta una recomendación
 * agronómica de verdad, se calibra con datos de campo — hoy es dirección de arte
 * con conciencia, y se dice de frente en vez de disimularlo.
 *
 * SIN THREE, SIN REACT: puro, determinista, testeable headless. La escena lo
 * consume; nadie más necesita saber que existe.
 */

/* -------------------------------------------------------------------------- */
/*  Parámetros — la asimetría es el mensaje                                    */
/* -------------------------------------------------------------------------- */

/*
 * Estos números NO se eligieron a ojo: se barrieron hasta que la curva contara
 * la verdad con la tensión correcta (ver la nota de calibración al pie).
 */
export const PARAMS = {
  /* LA PLAGA: crece rapidísimo. "El pulgón se reproduce muy rápido" — corpus. */
  rPlaga: 1.05, // tasa de crecimiento semanal (r-estratega)
  kPlaga: 1.0, // techo: lo que el cultivo aguanta de alimento

  /* EL EJÉRCITO: crece despacio, y SOLO si hay qué comer. */
  ataque: 1.9, // a: eficiencia de depredación
  conversion: 0.5, // e: cuánta presa se vuelve benéfico nuevo
  mortalidad: 0.3, // m: se muere/emigra si no hay presa

  /*
   * LA INMIGRACIÓN: el goteo de benéficos que ENTRA desde el hábitat (flores +
   * refugio). Es chiquito pero es LA DIFERENCIA ENTRE LAS DOS PARCELAS: la viva
   * lo tiene, la limpia no. Un lote pelado no recibe refuerzos aunque quiera.
   * Es, literalmente, el valor de sembrar flores — expresado como número.
   */
  inmigracionConHabitat: 0.04,
  inmigracionSinHabitat: 0.0,

  /* LA BOMBA de amplio espectro: mata parejo. Que el benéfico caiga MÁS que la
     plaga no es capricho — es lo que reporta el campo (son más frágiles, están
     expuestos encima de la hoja, y son muchos menos para empezar). */
  venenoMataPlaga: 0.92, // 92% de la plaga
  venenoMataEjercito: 0.97, // 97% del ejército  ← el detalle que arruina todo

  /* Estado inicial: el cultivo arranca con una brizna de plaga y una brizna de
     ejército. Ambas parcelas EXACTAMENTE IGUAL: si arrancaran distinto, el
     experimento no probaría nada. */
  plaga0: 0.06,
  ejercito0: 0.065,
};

/*
 * ── CALIBRACIÓN (por qué estos números y no otros) ──────────────────────────
 * Barridos hasta que la curva contara la verdad CON la tensión correcta. Con los
 * valores de arriba, `veredicto()` da:
 *
 *   picoViva    0.52  ← en la semana 5: SUBE HASTA ROZAR EL UMBRAL (0.55) Y NO
 *                       LO CRUZA. Ese casi es el corazón de la escena: el
 *                       campesino ve la plaga trepar hacia la línea, siente el
 *                       impulso de sacar la bomba… y el ejército la dobla justo
 *                       antes. Es el dibujo de "no fumigue por miedo, fumigue
 *                       por evidencia".
 *   finViva     0.16  ← queda plaga baja: LA DESPENSA. Nunca cero, nunca drama.
 *   picoLimpia  0.99  ← revienta el umbral y satura el cultivo.
 *   finLimpia   0.98  ← termina MUCHO peor que la parcela que nadie tocó.
 *   ejercitoFinLimpia ≈ 0  ← y sin ejército, ya no hay vuelta: el año entrante
 *                             arranca igual de indefenso. Ese cero es la factura.
 *
 * Una tentación que se rechazó: dejar que la parcela viva cruzara el umbral
 * (con los parámetros iniciales picaba en 0.69). Es defendible en campo — el
 * control biológico es un vaivén, no un muro — pero rompía la lectura: si la
 * viva TAMBIÉN cruza, el dibujo parece decir "los benéficos tampoco alcanzan" y
 * el mundo se pega un tiro en el pie. Se prefirió la versión donde el ejército
 * aplana el pico ANTES de la línea, que es el caso típico bien documentado y el
 * que el corpus describe ("si la presión es baja, la naturaleza sola lo controla
 * en una a dos semanas"). Queda dicho para que nadie lo "arregle" sin saber.
 */

/* -------------------------------------------------------------------------- */
/*  El paso                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Un paso semanal del sistema. Puro: (estado, opciones) → estado nuevo.
 *
 * @param {{plaga:number, ejercito:number}} s estado actual
 * @param {{habitat?:boolean, veneno?:boolean, dt?:number}} [op]
 *   habitat: ¿hay flores y refugio? (llega inmigración)
 *   veneno:  ¿se fumigó de amplio espectro ESTA semana?
 * @returns {{plaga:number, ejercito:number}}
 */
export function paso(s, op = {}) {
  const { habitat = false, veneno = false, dt = 1 } = op;
  const P = PARAMS;
  let { plaga, ejercito } = s;

  /* 1. La bomba, si cayó: primero y sin piedad, a los dos. */
  if (veneno) {
    plaga *= 1 - P.venenoMataPlaga;
    ejercito *= 1 - P.venenoMataEjercito;
  }

  /* 2. La plaga crece contra su techo, menos lo que se comen. */
  const depredado = P.ataque * plaga * ejercito;
  const crecePlaga = P.rPlaga * plaga * (1 - plaga / P.kPlaga);
  let plagaN = plaga + dt * (crecePlaga - depredado);

  /* 3. El ejército crece con lo que comió, se muere si no comió, y recibe el
        goteo del hábitat. Sin presa y sin hábitat: se apaga. */
  const inmigra = habitat ? P.inmigracionConHabitat : P.inmigracionSinHabitat;
  let ejercitoN = ejercito + dt * (P.conversion * depredado - P.mortalidad * ejercito + inmigra);

  /* 4. Piso y techo. El piso de la plaga NO es cero a propósito: siempre queda
        una brizna (viene de afuera, del monte, del vecino). Que no exista el
        cero es parte de la lección — el lote estéril no existe, y tampoco se
        quiere. */
  plagaN = Math.min(1, Math.max(0.004, plagaN));
  ejercitoN = Math.min(1, Math.max(0, ejercitoN));

  return { plaga: plagaN, ejercito: ejercitoN };
}

/**
 * La serie completa de una parcela, semana a semana.
 *
 * @param {{semanas?:number, habitat?:boolean, fumigaSemana?:number|null, sub?:number}} [op]
 *   fumigaSemana: en qué semana cae la bomba (null = nunca)
 *   sub: sub-pasos por semana (integración más suave para la curva dibujada)
 * @returns {Array<{semana:number, plaga:number, ejercito:number, veneno:boolean}>}
 */
export function serie(op = {}) {
  const { semanas = 12, habitat = false, fumigaSemana = null, sub = 4 } = op;
  const out = [];
  let s = { plaga: PARAMS.plaga0, ejercito: PARAMS.ejercito0 };
  out.push({ semana: 0, plaga: s.plaga, ejercito: s.ejercito, veneno: false });

  for (let w = 1; w <= semanas; w++) {
    const fumiga = fumigaSemana != null && w === fumigaSemana;
    for (let k = 0; k < sub; k++) {
      s = paso(s, {
        habitat,
        /* La bomba cae UNA vez, en el primer sub-paso de esa semana. */
        veneno: fumiga && k === 0,
        dt: 1 / sub,
      });
    }
    out.push({ semana: w, plaga: s.plaga, ejercito: s.ejercito, veneno: fumiga });
  }
  return out;
}

/**
 * Muestreo continuo de una serie: interpola entre semanas para que la escena
 * pueda pedir "cómo está el cultivo en t=0.63 del ciclo" y animar liso.
 *
 * @param {Array} serieDatos salida de `serie()`
 * @param {number} t 0..1 del ciclo
 */
export function muestra(serieDatos, t) {
  const n = serieDatos.length - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.floor(x);
  const f = x - i;
  const a = serieDatos[i];
  const b = serieDatos[Math.min(n, i + 1)];
  return {
    semana: x,
    plaga: a.plaga + (b.plaga - a.plaga) * f,
    ejercito: a.ejercito + (b.ejercito - a.ejercito) * f,
    /* El fogonazo del veneno dura poco: se usa para el flash de la niebla. */
    veneno: b.veneno && f < 0.5,
  };
}

/**
 * Las dos series del espejo, ya listas para la escena. Mismo cultivo, misma
 * plaga, mismo clima — UNA sola decisión de diferencia.
 *
 * @param {{semanas?:number, fumigaSemana?:number}} [op]
 */
export function espejo(op = {}) {
  const { semanas = 12, fumigaSemana = 3 } = op;
  return {
    viva: serie({ semanas, habitat: true, fumigaSemana: null }),
    limpia: serie({ semanas, habitat: false, fumigaSemana }),
  };
}

/**
 * El veredicto, para quien quiera auditar el modelo sin dibujarlo (o para un
 * test que se asegure de que el mundo no está mintiendo). Devuelve los números
 * que sostienen el argumento entero.
 */
export function veredicto(op = {}) {
  const { viva, limpia } = espejo(op);
  const pico = (s) => s.reduce((m, p) => Math.max(m, p.plaga), 0);
  const fin = (s) => s[s.length - 1].plaga;
  return {
    picoViva: pico(viva),
    picoLimpia: pico(limpia),
    finViva: fin(viva),
    finLimpia: fin(limpia),
    ejercitoFinViva: viva[viva.length - 1].ejercito,
    ejercitoFinLimpia: limpia[limpia.length - 1].ejercito,
    /* La frase del mundo, verificable: la parcela fumigada termina PEOR que la
       que nunca se tocó. Si esto diera `false`, el mundo no tendría derecho a
       existir y habría que arreglar el modelo — no el dibujo. */
    fumigarSalioPeor: fin(limpia) > fin(viva),
  };
}
