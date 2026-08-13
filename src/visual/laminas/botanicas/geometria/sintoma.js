/*
 * sintoma — LAS SEÑALES. La parte más valiosa de la colección.
 *
 * Todo lo demás de esta librería es contexto: esto es el uso. El campesino
 * pone su hoja al lado de la lámina y compara. Si la lámina exagera, lo asusta
 * y fumiga de más; si la suaviza, llega tarde. Así que cada síntoma de acá
 * sale de una descripción LITERAL del corpus de plagas (135 pares), y las
 * cuatro reglas del oficio son:
 *
 *   1. EL SITIO ES DIAGNÓSTICO. Roya = envés. Gota = empieza por el BORDE y
 *      la PUNTA. Mancha angular = presa entre las nervaduras. Broca = entra
 *      por la CORONA del fruto. Dibujar la lesión en el lugar equivocado es
 *      peor que no dibujarla: enseña a mirar donde no es.
 *   2. LA FORMA DEL BORDE SEPARA HONGO DE BACTERIA. Borde definido con halo
 *      amarillo → hongo. Borde difuso y acuoso → bacteria. El corpus lo dice
 *      con esas palabras para la yuca, y vale como regla de lectura general.
 *   3. LA PROGRESIÓN ES EL DATO. La sigatoka empieza como RAYITAS y termina
 *      negra; la monilia empieza ACEITOSA y termina en harina. Una lámina que
 *      sólo pinta el final llega tarde, que es justo cuando ya no sirve.
 *      Por eso cada síntoma se dibuja en tres tiempos: temprano→medio→tarde.
 *   4. HAY QUE PODER DESCARTAR. Mildeo velloso (vellosidad gris-morada en el
 *      ENVÉS) vs oídio (polvo blanco seco en el HAZ) se confunden y se tratan
 *      distinto. La lámina los pone a los dos para que se puedan separar.
 *
 * Contrato uniforme: cada generador devuelve `{capas: [{d, fill, stroke, sw,
 * op}]}`, ya recortado contra el órgano por quien pinta. Se dibuja sobre la
 * caja del órgano que recibe, así el mismo síntoma sirve en hoja chica de
 * panel comparativo y en hoja grande de detalle.
 */
import { entre, tembleque, enteroEntre } from '../nucleo/rng.js';
import { suave, quebrado, lerp, sujeta } from '../nucleo/trazo.js';
import { borron, puntillismo, puntosAPath } from '../nucleo/trama.js';
import { SINTOMA } from '../nucleo/paletaLamina.js';

/** Reparte n lesiones dentro de la caja, con una preferencia de sitio.
 *  `sitio`: 'borde' | 'punta' | 'centro' | 'base' | 'regado' | 'nervio' */
function sitios(rng, caja, n, sitio = 'regado') {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    let u = rng();
    let v = rng();
    if (sitio === 'borde') {
      /* pegado al filo de la lámina: |v| tiende a 1 */
      v = rng() > 0.5 ? entre(rng, 0.78, 0.97) : entre(rng, 0.03, 0.22);
      u = entre(rng, 0.15, 0.9);
    } else if (sitio === 'punta') {
      u = entre(rng, 0.62, 0.96);
      v = entre(rng, 0.24, 0.76);
    } else if (sitio === 'base') {
      u = entre(rng, 0.06, 0.4);
      v = entre(rng, 0.24, 0.76);
    } else if (sitio === 'centro') {
      u = entre(rng, 0.3, 0.7);
      v = entre(rng, 0.32, 0.68);
    } else if (sitio === 'nervio') {
      v = 0.5 + tembleque(rng, 0.13);
      u = entre(rng, 0.2, 0.85);
    }
    out.push([caja.x + u * caja.w, caja.y + v * caja.h]);
  }
  return out;
}

/** El tamaño de la lesión según el avance (0 temprano, 1 tarde). */
const avanza = (etapa, min, max) => lerp(min, max, sujeta(etapa, 0, 1));

/* ------------------------------------------------------------------ */
/* ROYA DEL CAFÉ — Hemileia vastatrix.                                 */
/* "polvo fino amarillo-naranja en el ENVÉS, se pega en los dedos"     */
/* + mancha amarilla translúcida que se ve en el haz a contraluz.      */
/* ------------------------------------------------------------------ */
export function roya(rng, caja, op = {}) {
  const { etapa = 0.6, cara = 'enves' } = op;
  const capas = [];
  const focos = sitios(rng, caja, enteroEntre(rng, 3, 6), 'regado');
  for (const [cx, cy] of focos) {
    const r = avanza(etapa, caja.h * 0.08, caja.h * 0.2);
    /* el halo amarillo translúcido: se ve por las DOS caras */
    capas.push({
      d: suave(borron(rng, cx, cy, r * 1.24, 0.34), true, 0.5),
      fill: SINTOMA.royaHalo,
      op: 0.42,
    });
    if (cara === 'enves') {
      /* EL POLVO: la pústula naranja. Sólo en el envés. Es polvo, así que se
         dibuja con puntillismo suelto, nunca con una mancha maciza. */
      const pts = puntillismo(
        rng,
        { x: cx - r, y: cy - r, w: r * 2, h: r * 2 },
        (u, v) => sujeta(1 - Math.hypot(u - 0.5, v - 0.5) * 2.2, 0, 1) ** 0.7,
        { intentos: Math.round(r * r * 1.5), rMin: 0.4, rMax: 0.95 },
      );
      capas.push({ d: puntosAPath(pts), fill: SINTOMA.roya, op: 0.92 });
    } else {
      /* en el haz sólo se ve la mancha, y el campesino que sólo mira el haz
         llega tarde: por eso la lámina insiste en voltear la hoja */
      capas.push({
        d: suave(borron(rng, cx, cy, r * 0.8, 0.3), true, 0.5),
        fill: SINTOMA.roya,
        op: 0.22,
      });
    }
  }
  return { capas, voltea: cara === 'haz' };
}

/* ------------------------------------------------------------------ */
/* GOTA / TIZÓN TARDÍO — Phytophthora infestans.                       */
/* "manchas húmedas oscuras de BORDE IRREGULAR, empiezan como puntos y */
/* se expanden día a día; VELLOSIDAD BLANCA EN EL ENVÉS visible en     */
/* mañanas húmedas". Puede tumbar el cultivo en días.                  */
/* ------------------------------------------------------------------ */
export function gota(rng, caja, op = {}) {
  const { etapa = 0.6, cara = 'haz' } = op;
  const capas = [];
  /* empieza por el BORDE y la PUNTA: ahí se queda la gota de rocío. Ese es
     el sitio y por eso se mira ahí primero. */
  const focos = sitios(rng, caja, enteroEntre(rng, 2, 4), rng() > 0.5 ? 'borde' : 'punta');
  for (const [cx, cy] of focos) {
    const r = avanza(etapa, caja.h * 0.07, caja.h * 0.3);
    const forma = borron(rng, cx, cy, r, 0.62, 15); // MUY irregular: es su firma
    /* la aureola aceitosa: el tejido empapado que rodea la mancha negra */
    capas.push({ d: suave(forma.map(([x, y]) => [cx + (x - cx) * 1.3, cy + (y - cy) * 1.3]), true, 0.5), fill: SINTOMA.gotaBorde, op: 0.5 });
    capas.push({ d: suave(forma, true, 0.5), fill: SINTOMA.gota, op: 0.88 });
    if (cara === 'enves' && etapa > 0.35) {
      /* EL MOHO BLANCO: el anillo de pelusa en el filo de la mancha, del lado
         de abajo, y sólo con humedad. Verlo = confirmar la gota. */
      capas.push({
        d: suave(forma.map(([x, y]) => [cx + (x - cx) * 1.16, cy + (y - cy) * 1.16]), true, 0.5),
        fill: 'none',
        stroke: SINTOMA.vellosidadBlanca,
        sw: 2.6,
        op: 0.85,
      });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* TIZÓN TEMPRANO — Alternaria solani.                                 */
/* "manchitas cafés en HOJA VIEJA, halo amarillo, ANILLOS CONCÉNTRICOS */
/* tipo diana de tiro". Clima seco-caluroso, menos agresivo.           */
/* ------------------------------------------------------------------ */
export function alternaria(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 3, 6), 'regado')) {
    const r = avanza(etapa, caja.h * 0.05, caja.h * 0.14);
    capas.push({ d: suave(borron(rng, cx, cy, r * 1.5, 0.22), true, 0.5), fill: SINTOMA.amarilleo, op: 0.5 });
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.24), true, 0.5), fill: SINTOMA.alternaria, op: 0.8 });
    /* LA DIANA: los anillos concéntricos. Es el carácter que la separa de la
       gota, y se ve con lupa o a ojo pelado en la mancha grande. */
    for (let k = 1; k <= 3; k += 1) {
      capas.push({
        d: suave(borron(rng, cx, cy, r * (k / 3.6), 0.16), true, 0.5),
        fill: 'none',
        stroke: SINTOMA.necrosis,
        sw: 0.5,
        op: 0.75,
      });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MANCHA ANGULAR — Pseudocercospora griseola (frijol).                */
/* "lesiones ANGULARES DELIMITADAS POR LAS NERVADURAS (no redondas)".  */
/* Se transmite por semilla: no guardar semilla de planta enferma.     */
/* ------------------------------------------------------------------ */
export function manchaAngular(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 4, 7), 'regado')) {
    const r = avanza(etapa, caja.h * 0.05, caja.h * 0.13);
    /* ANGULAR de verdad: un polígono de 4-5 lados con vértices marcados, no
       un borrón. La vena la encajona y no la deja redondearse. */
    const lados = enteroEntre(rng, 4, 5);
    const pts = [];
    for (let i = 0; i < lados; i += 1) {
      const a = (i / lados) * Math.PI * 2 + tembleque(rng, 0.3);
      pts.push([cx + Math.cos(a) * r * entre(rng, 0.7, 1.3), cy + Math.sin(a) * r * entre(rng, 0.7, 1.3)]);
    }
    capas.push({ d: quebrado(pts, true), fill: SINTOMA.alternaria, op: 0.72 });
    capas.push({ d: quebrado(pts, true), fill: 'none', stroke: SINTOMA.necrosis, sw: 0.5, op: 0.9 });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* ANTRACNOSIS — Colletotrichum.                                       */
/* "manchas HUNDIDAS oscuras, borde bien definido, CENTRO ROSADO-SALMÓN */
/* (esporas)". En mora la llaman "viruela"; en tomate de árbol la      */
/* mancha SE AGRANDA DESPUÉS DE COSECHADO (ya venía infectado).        */
/* ------------------------------------------------------------------ */
export function antracnosis(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 2, 4), 'regado')) {
    const r = avanza(etapa, caja.h * 0.07, caja.h * 0.2);
    /* HUNDIDA: el hundimiento se dibuja con una sombra en creciente adentro
       del borde. Sin eso, es una mancha plana y pierde el diagnóstico. */
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.2), true, 0.5), fill: SINTOMA.necrosis, op: 0.9 });
    capas.push({
      d: suave(borron(rng, cx - r * 0.12, cy - r * 0.12, r * 0.84, 0.18), true, 0.5),
      fill: SINTOMA.hollin,
      op: 0.45,
    });
    /* borde bien definido = hongo (regla 2) */
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.2), true, 0.5), fill: 'none', stroke: SINTOMA.necrosis, sw: 0.8, op: 1 });
    if (etapa > 0.45) {
      /* EL CENTRO SALMÓN: la masa de esporas. Confirma antracnosis. */
      capas.push({ d: suave(borron(rng, cx, cy, r * 0.36, 0.3), true, 0.5), fill: SINTOMA.salmon, op: 0.95 });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MILDEO VELLOSO vs OÍDIO — el par que hay que saber separar.          */
/* Mildeo: AMARILLO EN EL HAZ + VELLOSIDAD GRIS-MORADA EN EL ENVÉS,    */
/* clima fresco muy húmedo. Oídio: POLVO BLANCO SECO EN EL HAZ, sin    */
/* vellosidad. Se tratan distinto: por eso van juntos en la lámina.    */
/* ------------------------------------------------------------------ */
export function mildeoVelloso(rng, caja, op = {}) {
  const { etapa = 0.6, cara = 'enves' } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 3, 5), 'regado')) {
    const r = avanza(etapa, caja.h * 0.08, caja.h * 0.22);
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.3), true, 0.5), fill: SINTOMA.amarilleo, op: 0.62 });
    if (cara === 'enves') {
      const pts = puntillismo(
        rng,
        { x: cx - r, y: cy - r, w: r * 2, h: r * 2 },
        (u, v) => sujeta(1 - Math.hypot(u - 0.5, v - 0.5) * 2.1, 0, 1) ** 0.8,
        { intentos: Math.round(r * r * 1.1), rMin: 0.5, rMax: 1.1 },
      );
      capas.push({ d: puntosAPath(pts), fill: SINTOMA.vellosidadGris, op: 0.72 });
    }
  }
  return { capas };
}

export function oidio(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 3, 5), 'regado')) {
    const r = avanza(etapa, caja.h * 0.1, caja.h * 0.26);
    /* POLVO BLANCO SECO, EN EL HAZ, sin halo amarillo: se limpia con el dedo.
       Esa es toda la diferencia con el mildeo, y decide el manejo. */
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.4), true, 0.5), fill: SINTOMA.harina, op: 0.82 });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* SIGATOKA NEGRA — Mycosphaerella fijiensis (plátano).                */
/* "empieza como RAYITAS PARDAS que se unen y ENNEGRECEN". La          */
/* progresión ES el diagnóstico: hay que verla en rayita para actuar.  */
/* ------------------------------------------------------------------ */
export function sigatoka(rng, caja, op = {}) {
  const { etapa = 0.5 } = op;
  const capas = [];
  const n = Math.round(lerp(10, 26, etapa));
  for (let i = 0; i < n; i += 1) {
    const x = caja.x + entre(rng, 0.1, 0.92) * caja.w;
    const y = caja.y + entre(rng, 0.08, 0.92) * caja.h;
    /* las rayitas corren PARALELAS A LAS VENAS de la hoja (que en Musa salen
       del nervio central hacia el borde): la lesión sigue la vena */
    const largo = lerp(caja.h * 0.06, caja.h * 0.2, etapa) * entre(rng, 0.7, 1.3);
    const ancho = lerp(0.9, 3.4, etapa);
    capas.push({
      d: `M${x.toFixed(1)} ${y.toFixed(1)} l${largo.toFixed(1)} ${tembleque(rng, 2).toFixed(1)}`,
      fill: 'none',
      stroke: etapa < 0.45 ? SINTOMA.alternaria : SINTOMA.hollin,
      sw: ancho,
      op: lerp(0.7, 0.95, etapa),
    });
  }
  if (etapa > 0.7) {
    /* tarde: las rayitas ya se unieron en parches negros y la hoja no
       fotosintetiza — el racimo sale chico. Ahí ya se perdió el tiempo. */
    for (const [cx, cy] of sitios(rng, caja, 3, 'regado')) {
      capas.push({ d: suave(borron(rng, cx, cy, caja.h * 0.18, 0.5), true, 0.5), fill: SINTOMA.hollin, op: 0.8 });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* OJO DE GALLO — Mycena citricolor (café).                            */
/* "mancha REDONDA con PUNTICO CENTRAL que luego bota un CUERPO        */
/* GELATINOSO tipo gota". Exceso de sombra y humedad. También le dicen */
/* gotera, candelilla, viruela — OJO: "viruela" en mora es antracnosis.*/
/* ------------------------------------------------------------------ */
export function ojoDeGallo(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 3, 6), 'regado')) {
    const r = avanza(etapa, caja.h * 0.06, caja.h * 0.15);
    /* REDONDA de verdad (a diferencia de la angular y de la gota) */
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.1), true, 0.5), fill: SINTOMA.alternaria, op: 0.5 });
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.1), true, 0.5), fill: 'none', stroke: SINTOMA.necrosis, sw: 0.6, op: 0.9 });
    capas.push({ d: suave(borron(rng, cx, cy, r * 0.2, 0.1), true, 0.5), fill: SINTOMA.necrosis, op: 0.9 });
    if (etapa > 0.6) {
      /* el cuerpo gelatinoso: el fósforo amarillo que cuelga y que en la
         noche, dicen, alumbra — de ahí "candelilla" */
      capas.push({ d: suave(borron(rng, cx, cy - r * 0.9, r * 0.3, 0.2), true, 0.5), fill: SINTOMA.amarilleo, op: 0.95 });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MINADOR — Liriomyza. "GALERÍAS SERPENTEANTES blancas/plateadas      */
/* DENTRO del tejido, se ensanchan progresivamente". La galería se     */
/* ensancha porque la larva crece mientras come: se lee como un reloj. */
/* ------------------------------------------------------------------ */
export function minador(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (let g = 0; g < enteroEntre(rng, 1, 3); g += 1) {
    let x = caja.x + entre(rng, 0.2, 0.7) * caja.w;
    let y = caja.y + entre(rng, 0.2, 0.8) * caja.h;
    let a = entre(rng, 0, Math.PI * 2);
    const pasos = Math.round(lerp(14, 34, etapa));
    /* la galería se dibuja como un trazo de ancho CRECIENTE: se hace con
       segmentos cortos de stroke-width en aumento */
    for (let i = 0; i < pasos; i += 1) {
      a += tembleque(rng, 1.1);
      const paso = caja.h * 0.045;
      const nx = x + Math.cos(a) * paso;
      const ny = y + Math.sin(a) * paso;
      capas.push({
        d: `M${x.toFixed(1)} ${y.toFixed(1)} L${nx.toFixed(1)} ${ny.toFixed(1)}`,
        fill: 'none',
        stroke: SINTOMA.galeria,
        sw: lerp(0.8, 2.8, i / pasos),
        op: 0.95,
        cap: 'round',
      });
      x = nx;
      y = ny;
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* TRIPS — "RASPADO PLATEADO o bronceado, hoja rasposa al tacto, sin   */
/* bicho visible a simple vista (se ve con lupa en el envés y en los   */
/* pliegues de la hoja nueva)".                                        */
/* ------------------------------------------------------------------ */
export function trips(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 4, 8), 'regado')) {
    const r = avanza(etapa, caja.h * 0.06, caja.h * 0.18);
    /* el raspado NO es una mancha: es una zona donde el bicho raspó la
       epidermis y quedó aire adentro — por eso PLATEA, como un espejo */
    capas.push({
      d: suave(borron(rng, cx, cy, r, 0.5, 9), true, 0.5),
      fill: SINTOMA.plateado,
      op: lerp(0.5, 0.85, etapa),
    });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* VIRUS DEL ENROLLAMIENTO AMARILLO (vector: mosca blanca).            */
/* "hoja se ENROSCA HACIA ARRIBA en forma de CUCHARA, amarillea con    */
/* MOSAICO, planta ENANA. No cura: se erradica." El síntoma cambia la  */
/* GEOMETRÍA, no sólo el color — por eso devuelve `deforma`.           */
/* ------------------------------------------------------------------ */
export function virusEnrollamiento(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  /* mosaico: parches amarillos y verdes entreverados, sin borde neto */
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 6, 10), 'regado')) {
    capas.push({
      d: suave(borron(rng, cx, cy, caja.h * entre(rng, 0.08, 0.18), 0.55), true, 0.5),
      fill: SINTOMA.amarilleo,
      op: lerp(0.3, 0.72, etapa),
    });
  }
  return {
    capas,
    /* la CUCHARA: el borde se enrolla hacia arriba. Quien pinta debe curvar
       la hoja, no sólo mancharla. */
    deforma: { tipo: 'cuchara', fuerza: etapa },
    enanismo: lerp(1, 0.58, etapa),
  };
}

/* ------------------------------------------------------------------ */
/* COGOLLERO — Spodoptera frugiperda (maíz).                           */
/* "daño en el COGOLLO (hojas nuevas enrolladas), HUECOS ALINEADOS EN  */
/* FILA al desenrollar la hoja, ASERRÍN de excremento visible".        */
/* Los huecos salen en fila porque la larva comió la hoja ENROLLADA:   */
/* un solo mordisco atraviesa todas las vueltas. Eso hay que verlo.    */
/* ------------------------------------------------------------------ */
export function cogollero(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  const filas = enteroEntre(rng, 2, 3);
  for (let f = 0; f < filas; f += 1) {
    const v = entre(rng, 0.25, 0.75);
    const n = enteroEntre(rng, 3, 6);
    for (let i = 0; i < n; i += 1) {
      const u = 0.2 + (i / n) * 0.6 + tembleque(rng, 0.02);
      const r = avanza(etapa, caja.h * 0.04, caja.h * 0.1);
      /* EL HUECO: no es una mancha, es un agujero — se pinta del color del
         PAPEL, con el borde comido y pardo */
      const forma = borron(rng, caja.x + u * caja.w, caja.y + v * caja.h, r, 0.45, 9);
      capas.push({ d: suave(forma, true, 0.5), fill: 'PAPEL', op: 1 });
      capas.push({ d: suave(forma, true, 0.5), fill: 'none', stroke: SINTOMA.necrosis, sw: 0.9, op: 0.9 });
    }
  }
  /* el aserrín: la caca de la larva, amontonada en el cogollo. Verlo fresco =
     la larva está adentro AHORA. */
  const pts = puntillismo(rng, { x: caja.x + caja.w * 0.3, y: caja.y + caja.h * 0.35, w: caja.w * 0.3, h: caja.h * 0.3 }, () => 0.6, {
    intentos: 60,
    rMin: 0.5,
    rMax: 1.2,
  });
  capas.push({ d: puntosAPath(pts), fill: SINTOMA.alternaria, op: 0.8 });
  return { capas };
}

/* ------------------------------------------------------------------ */
/* CARBÓN DEL MAÍZ — Ustilago maydis.                                  */
/* "AGALLAS gris-blancas en la mazorca que REVIENTAN soltando POLVO    */
/* NEGRO, reemplazan los granos". (Cuando está tierna y cerrada es el  */
/* huitlacoche comestible: la misma lámina sirve para las dos lecturas.)*/
/* ------------------------------------------------------------------ */
export function carbon(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 1, 3), 'centro')) {
    const r = avanza(etapa, caja.h * 0.2, caja.h * 0.5);
    /* la agalla: un bulto deforme que reemplaza granos. Gris-blanca y con la
       membrana tensa mientras no revienta. */
    const forma = borron(rng, cx, cy, r, 0.34, 13);
    capas.push({ d: suave(forma, true, 0.5), fill: SINTOMA.harina, op: 0.95 });
    capas.push({ d: suave(forma, true, 0.5), fill: 'none', stroke: SINTOMA.necrosis, sw: 0.9, op: 0.8 });
    if (etapa > 0.6) {
      /* REVENTADA: el polvo negro de esporas sale y vuela al lote vecino */
      const pts = puntillismo(rng, { x: cx - r, y: cy - r * 1.2, w: r * 2, h: r * 2 }, (u, v) => sujeta(1 - Math.hypot(u - 0.5, v - 0.4) * 1.9, 0, 1), {
        intentos: Math.round(r * r * 2),
        rMin: 0.4,
        rMax: 1.1,
      });
      capas.push({ d: puntosAPath(pts), fill: SINTOMA.polvoNegro, op: 0.9 });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MANCHA DE ASFALTO — complejo Phyllachora maydis.                    */
/* "puntos negros pequeños ABULTADOS, INCRUSTADOS en el tejido (NO se  */
/* desprenden al frotar con el dedo), al azar". La prueba del dedo es  */
/* el diagnóstico: por eso la lámina dibuja el relieve.                */
/* ------------------------------------------------------------------ */
export function manchaAsfalto(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  const n = Math.round(lerp(12, 40, etapa));
  for (let i = 0; i < n; i += 1) {
    const x = caja.x + rng() * caja.w;
    const y = caja.y + rng() * caja.h;
    const r = entre(rng, 0.9, 2.1);
    capas.push({ d: suave(borron(rng, x, y, r, 0.2, 8), true, 0.5), fill: SINTOMA.polvoNegro, op: 0.95 });
    /* el brillito de arriba: es lo que dice "abultado" y no "pintado" */
    capas.push({ d: suave(borron(rng, x - r * 0.25, y - r * 0.3, r * 0.3, 0.2, 6), true, 0.5), fill: '#6b6660', op: 0.55 });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* COCHINILLA HARINOSA (yuca) — "HILOS/ALGODÓN BLANCO CEROSO en tallo  */
/* y yema; bajo la cera hay cuerpo blando; hormigas pastoreando la     */
/* melaza; NEGRILLA (fumagina) negra encima de la melaza — NO ataca el */
/* tejido: se resuelve controlando el insecto, no con fungicida".      */
/* ------------------------------------------------------------------ */
export function cochinilla(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 3, 6), 'regado')) {
    const r = avanza(etapa, caja.h * 0.05, caja.h * 0.13);
    /* el algodón: mota de cera con filamentos, no una bolita lisa */
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.5, 13), true, 0.5), fill: SINTOMA.algodon, op: 0.95 });
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2;
      capas.push({
        d: `M${cx.toFixed(1)} ${cy.toFixed(1)} l${(Math.cos(a) * r * 1.5).toFixed(1)} ${(Math.sin(a) * r * 1.5).toFixed(1)}`,
        fill: 'none',
        stroke: SINTOMA.algodon,
        sw: 0.8,
        op: 0.85,
      });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* FUMAGINA / NEGRILLA — Capnodium. "capa NEGRA TIPO HOLLÍN sobre la   */
/* hoja; NO ataca el tejido: crece sobre la melaza de los chupadores.  */
/* Se resuelve controlando el insecto, no con fungicida." Se dibuja    */
/* como una película que TAPA, y por eso se le ve la hoja debajo.      */
/* ------------------------------------------------------------------ */
export function fumagina(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 2, 4), 'nervio')) {
    capas.push({
      d: suave(borron(rng, cx, cy, caja.h * avanza(etapa, 0.12, 0.3), 0.5), true, 0.5),
      fill: SINTOMA.hollin,
      /* translúcida a propósito: es una capa ENCIMA, se limpia y aparece la
         hoja sana debajo. Ese es todo el mensaje. */
      op: lerp(0.35, 0.7, etapa),
    });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MONILIA — Moniliophthora roreri (cacao).                            */
/* "empieza como MANCHAS ACEITOSAS oscuras en fruto joven, progresa a  */
/* PUDRICIÓN INTERNA con CAPA POLVORIENTA BLANQUECINA (como harina)".  */
/* Se lleva ~40% de la producción nacional si no se maneja.            */
/* ------------------------------------------------------------------ */
export function monilia(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  const cx = caja.x + caja.w * entre(rng, 0.4, 0.6);
  const cy = caja.y + caja.h * entre(rng, 0.5, 0.7);
  if (etapa < 0.4) {
    /* TEMPRANO: la mancha aceitosa. Acá todavía se puede cortar y enterrar. */
    capas.push({ d: suave(borron(rng, cx, cy, caja.w * 0.26, 0.4), true, 0.5), fill: SINTOMA.gotaBorde, op: 0.6 });
  } else {
    capas.push({ d: suave(borron(rng, cx, cy, caja.w * lerp(0.3, 0.6, etapa), 0.36), true, 0.5), fill: SINTOMA.necrosis, op: 0.85 });
    if (etapa > 0.65) {
      /* TARDE: la harina. Cada mazorca así siembra el lote entero: NO se
         deja en el suelo, se corta y se entierra. */
      const r = caja.w * 0.5;
      const pts = puntillismo(rng, { x: cx - r, y: cy - r, w: r * 2, h: r * 2 }, (u, v) => sujeta(1 - Math.hypot(u - 0.5, v - 0.5) * 2, 0, 1) ** 0.6, {
        intentos: Math.round(r * r * 1.4),
        rMin: 0.5,
        rMax: 1.3,
      });
      capas.push({ d: puntosAPath(pts), fill: SINTOMA.harina, op: 0.9 });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* ESCOBA DE BRUJA — Moniliophthora perniciosa (cacao).                */
/* "la rama forma un MANOJO DENSO de brotes DEFORMADOS, ENGROSADOS,    */
/* con ENTRENUDOS CORTOS, aspecto de escoba vieja, luego se seca. No   */
/* cura con fungicida: poda fitosanitaria." Cambia la ARQUITECTURA.    */
/* ------------------------------------------------------------------ */
export function escobaDeBruja(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  const cx = caja.x + caja.w * 0.5;
  const cy = caja.y + caja.h * 0.5;
  const n = Math.round(lerp(7, 16, etapa));
  for (let i = 0; i < n; i += 1) {
    const a = -Math.PI / 2 + tembleque(rng, 1.25);
    const l = caja.h * entre(rng, 0.2, 0.45);
    const ex = cx + Math.cos(a) * l;
    const ey = cy + Math.sin(a) * l;
    capas.push({
      d: `M${cx.toFixed(1)} ${cy.toFixed(1)} Q${(cx + Math.cos(a) * l * 0.5 + tembleque(rng, 6)).toFixed(1)} ${(cy + Math.sin(a) * l * 0.5).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`,
      fill: 'none',
      /* ENGROSADOS: el brote enfermo es más gordo que el sano. Ese engrose es
         el diagnóstico temprano, antes de que se seque. */
      stroke: etapa > 0.7 ? SINTOMA.necrosis : SINTOMA.alternaria,
      sw: lerp(1.4, 3, etapa),
      op: 0.9,
      cap: 'round',
    });
    /* entrenudos CORTOS: hojitas apretadas una tras otra */
    for (let k = 1; k <= 3; k += 1) {
      const t = k / 4;
      capas.push({
        d: `M${(cx + Math.cos(a) * l * t).toFixed(1)} ${(cy + Math.sin(a) * l * t).toFixed(1)} l${tembleque(rng, 5).toFixed(1)} ${(-3).toFixed(1)}`,
        fill: 'none',
        stroke: SINTOMA.alternaria,
        sw: 0.9,
        op: 0.75,
      });
    }
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MARCHITEZ VASCULAR — Fusarium / Ralstonia.                          */
/* "ANILLO OSCURO/CAFÉ DENTRO DEL TALLO al cortarlo por la base".      */
/* Es un síntoma que SÓLO se ve cortando: la lámina lo muestra en      */
/* corte transversal, que es la única manera de enseñarlo.             */
/* ------------------------------------------------------------------ */
export function anilloVascular(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const r = Math.min(caja.w, caja.h) * 0.5;
  const cx = caja.x + caja.w * 0.5;
  const cy = caja.y + caja.h * 0.5;
  return {
    capas: [
      {
        d: suave(borron(rng, cx, cy, r * 0.72, 0.06, 18), true, 0.5),
        fill: 'none',
        stroke: SINTOMA.vascular,
        sw: lerp(1.6, 4.2, etapa),
        op: 0.9,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* NEMATODO DEL NUDO — Meloidogyne.                                    */
/* "NUDOS/AGALLAS como PERLITAS en la raíz; marchitez de mediodía que  */
/* se recupera en la mañana". Ese vaivén es la pista: la mata que se   */
/* cae al sol y amanece parada tiene la raíz comprometida.             */
/* ------------------------------------------------------------------ */
export function nematodo(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 6, 11), 'regado')) {
    const r = avanza(etapa, 1.6, 3.8) * entre(rng, 0.7, 1.3);
    capas.push({ d: suave(borron(rng, cx, cy, r, 0.2, 10), true, 0.5), fill: SINTOMA.necrosis, op: 0.7 });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* BROCA DEL CAFÉ — Hypothenemus hampei.                               */
/* "escarabajo negro tamaño cabeza de alfiler, PERFORA EL FRUTO POR LA */
/* CORONA, galerías en la almendra. Umbral Cenicafé: >2% de frutos     */
/* infestados." El sitio (la corona) es TODO el diagnóstico.           */
/* ------------------------------------------------------------------ */
export function broca(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  /* LA CORONA: el disco del ombligo del fruto, opuesto al pedúnculo. Ahí, y
     no en otra parte, está el huequito. */
  const cx = caja.x + caja.w * 0.5;
  const cy = caja.y + caja.h * 0.14;
  capas.push({ d: suave(borron(rng, cx, cy, 1.6, 0.2, 8), true, 0.5), fill: SINTOMA.polvoNegro, op: 1 });
  if (etapa > 0.4) {
    /* el aserrín blanco que la hembra saca al perforar: se ve en la corona */
    const pts = puntillismo(rng, { x: cx - 5, y: cy - 3, w: 10, h: 7 }, () => 0.5, { intentos: 22, rMin: 0.3, rMax: 0.7 });
    capas.push({ d: puntosAPath(pts), fill: SINTOMA.harina, op: 0.9 });
  }
  if (etapa > 0.6) {
    /* la galería adentro de la almendra: por eso el grano se cae de precio */
    let d = `M${cx.toFixed(1)} ${cy.toFixed(1)}`;
    let x = cx;
    let y = cy;
    let a = Math.PI / 2;
    for (let i = 0; i < 8; i += 1) {
      a += tembleque(rng, 0.9);
      x += Math.cos(a) * caja.h * 0.06;
      y += Math.sin(a) * caja.h * 0.06;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    capas.push({ d, fill: 'none', stroke: SINTOMA.necrosis, sw: 1.4, op: 0.85, cap: 'round' });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* GUSANO / PICUDO — daño de galería en órgano macizo (tubérculo,      */
/* cormo, raíz). Papa: gusano blanco (Premnotrypes) y polilla          */
/* guatemalteca (Tecia). Plátano: picudo negro (Cosmopolites) — con    */
/* ASERRÍN saliendo de la base y la planta que se cae con el viento.   */
/* Arracacha: "raíz RAJADA con hueco interno comido"; si los bordes se */
/* pudren blandos, hongo secundario aprovechando la herida.            */
/* ------------------------------------------------------------------ */
export function galeriaInterna(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (let g = 0; g < enteroEntre(rng, 2, 4); g += 1) {
    let x = caja.x + entre(rng, 0.2, 0.8) * caja.w;
    let y = caja.y + entre(rng, 0.2, 0.8) * caja.h;
    let a = entre(rng, 0, Math.PI * 2);
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < Math.round(lerp(4, 11, etapa)); i += 1) {
      a += tembleque(rng, 1.2);
      x += Math.cos(a) * caja.h * 0.09;
      y += Math.sin(a) * caja.h * 0.09;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    capas.push({ d, fill: 'none', stroke: SINTOMA.necrosis, sw: lerp(1.5, 3.6, etapa), op: 0.9, cap: 'round' });
    /* el aserrín: la señal EXTERNA. Es lo que se ve sin cortar, y por eso es
       la que salva el lote. */
    capas.push({ d, fill: 'none', stroke: SINTOMA.alternaria, sw: lerp(0.6, 1.6, etapa), op: 0.7, cap: 'round' });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* PUDRICIÓN RADICULAR — Phytophthora cinnamomi (aguacate).            */
/* "raíz NECRÓTICA OSCURA y DESPRENDIBLE, hojas caídas; exceso de      */
/* riego / mal drenaje. Trichoderma + sombrío de guamo reduce 70%."    */
/* ------------------------------------------------------------------ */
export function pudricionRadicular(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  for (const [cx, cy] of sitios(rng, caja, enteroEntre(rng, 4, 8), 'regado')) {
    capas.push({
      d: suave(borron(rng, cx, cy, caja.h * avanza(etapa, 0.05, 0.14), 0.45), true, 0.5),
      fill: SINTOMA.necrosis,
      op: lerp(0.5, 0.9, etapa),
    });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* SARNA / ROÑA (aguacate) — "pintitas ÁSPERAS tipo sarna en la        */
/* CÁSCARA; superficial-estética, GENERALMENTE NO COMPROMETE LA PULPA".*/
/* Va en la colección justamente para que NO se fumigue por gusto: la  */
/* lámina que enseña a no hacer nada vale igual que la que alarma.     */
/* ------------------------------------------------------------------ */
export function ronia(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  const n = Math.round(lerp(10, 30, etapa));
  for (let i = 0; i < n; i += 1) {
    const x = caja.x + rng() * caja.w;
    const y = caja.y + rng() * caja.h;
    const r = entre(rng, 0.8, 2);
    capas.push({ d: suave(borron(rng, x, y, r, 0.4, 7), true, 0.5), fill: SINTOMA.alternaria, op: 0.75 });
  }
  return { capas };
}

/* ------------------------------------------------------------------ */
/* MOKO / MADURABICHE — Ralstonia solanacearum (plátano).              */
/* "MADURACIÓN PREMATURA E INTERNA del racimo, exudado y mal olor; se  */
/* disemina POR HERRAMIENTAS y por insectos en la inflorescencia;      */
/* erradicación total incl. cormo." Por dentro: pudrición rosada.      */
/* ------------------------------------------------------------------ */
export function moko(rng, caja, op = {}) {
  const { etapa = 0.6 } = op;
  const capas = [];
  capas.push({
    d: suave(borron(rng, caja.x + caja.w * 0.5, caja.y + caja.h * 0.5, Math.min(caja.w, caja.h) * avanza(etapa, 0.2, 0.42), 0.4), true, 0.5),
    fill: SINTOMA.salmon,
    op: lerp(0.45, 0.85, etapa),
  });
  /* el hilo de exudado bacteriano: la gota lechosa que brota del corte y que
     confirma bacteria (y que contamina el machete al siguiente golpe) */
  if (etapa > 0.5) {
    capas.push({
      d: suave(borron(rng, caja.x + caja.w * 0.5, caja.y + caja.h * 0.5, Math.min(caja.w, caja.h) * 0.16, 0.3), true, 0.5),
      fill: SINTOMA.vascular,
      op: 0.8,
    });
  }
  return { capas };
}

export const SINTOMAS = {
  roya,
  gota,
  alternaria,
  manchaAngular,
  antracnosis,
  mildeoVelloso,
  oidio,
  sigatoka,
  ojoDeGallo,
  minador,
  trips,
  virusEnrollamiento,
  cogollero,
  carbon,
  manchaAsfalto,
  cochinilla,
  fumagina,
  monilia,
  escobaDeBruja,
  anilloVascular,
  nematodo,
  broca,
  galeriaInterna,
  pudricionRadicular,
  ronia,
  moko,
};

/** Los tres tiempos con que se dibuja toda progresión. La lámina siempre
 *  muestra el TEMPRANO primero: es el único momento en que sirve de algo. */
export const TIEMPOS = [
  { etapa: 0.25, rotulo: 'temprano — aquí sirve verlo' },
  { etapa: 0.55, rotulo: 'avanzado' },
  { etapa: 0.9, rotulo: 'tarde — ya se perdió' },
];
