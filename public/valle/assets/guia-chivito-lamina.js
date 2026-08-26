/* ── guia-chivito-lamina.js — EL CHIVITO DEL compAI: el rango en UN PARÁMETRO ──
 *
 * TESIS DE ESTE ENCARGO (2026-08-07, brief FABLE-CHIVITO-RANGO):
 * el jaguar resolvió el rango reposo↔actuando con DOS dibujos y un crossfade.
 * El chivito prueba que puede costar la mitad: sus dos extremos son EL MISMO
 * dibujo con un solo número corrido. Ese número es `--rango` (0 → 1):
 *
 *   --rango: 0 ..... EL ANIMAL: posado en la vara, digno. Cresta barrida
 *                    hacia atrás, alas PLEGADAS contra el cuerpo, patitas
 *                    agarradas a la percha, sin flotar, sin brazos.
 *   --rango: 1 ..... EL ACTOR: erguido en vuelo, cresta ERIZADA en abanico,
 *                    alas borrosas de velocidad, patitas recogidas, flota,
 *                    y los brazos rubber-hose con guante en escena.
 *
 * CÓMO FUNCIONA (el mecanismo que hace esto UN parámetro y no dos láminas):
 *   · `--rango` está registrado con @property (syntax <number>) y lleva
 *     `transition` en :host — cambiar de pose NO corta: el dial se DESLIZA
 *     por los intermedios reales (la cresta sube, el ala se abre en el aire).
 *   · Las animaciones de vida (aleteo, flote) NO animan transform: animan
 *     custom properties (--bate, --bob) también registradas. El transform es
 *     una declaración estática con calc() que multiplica motor × --rango.
 *     Así una animación nunca PISA el parámetro, y la AMPLITUD del aleteo y
 *     del flote escala continua con el dial (posado = quieto, vuelo = borrón).
 *   · Los brazos del actor entran por clamp(): no existen bajo rango .55 y
 *     llegan completos en .85 — la caricatura "sube al escenario" al final
 *     del dial, nunca en el reposo del animal.
 *
 * Cada `data-estado` es UN PUNTO DEL DIAL más un gesto encima:
 *   reposo ANIMAL ... respira(0) · acicala(.1) · mirausted(.18) · estira(.26)
 *   dial del medio .. vigila(.45) · guino(.55 — cara puntual, cuerpo animal)
 *   ACTUACIÓN ....... liba(1 — su oficio: poliniza el frailejón) · hablar(1)
 *
 * LO QUE ARREGLA DEL MOLDE VIVO (demos/chivito/index.html), diagnóstico del
 * brief — se REUSA su geometría aprobada (cresta, cola, cuerpo, paleta,
 * brazos de guante) y se corrige lo que no leía:
 *   1. Ya no lee búho: ojo PEQUEÑO, lateral y oscuro; cara oscura bordeada
 *      de crema (patrón real de la especie), sin antifaz de lechuza.
 *   2. La barba ya no es corbata: GORGUERA ancha que CUELGA de la garganta,
 *      borde blanco, panel central iridiscente cuyo color va EN FASE con el
 *      ángulo del vaivén (estructural, como el azul de la Morpho: el SMIL de
 *      la iridiscencia dura 5.4s = el período completo del sway de 2.7s).
 *   3. Las alas ya no son hojas quietas: plegadas en reposo, borrón en vuelo.
 *   4. El frailejón ya no lee palmera: tronco VESTIDO de necromasa (faldas
 *      traslapadas — masa, no hojas contables) y roseta LANUDA plateada.
 *   5. Los girasoles se fueron: capítulos chicos saliendo ENTRE la roseta.
 *
 * TODO dato duro sale del grafo AGE vía ops/GAP-FAUNA-SILVESTRE-GRAFO-2.md:
 * an_oxypogon_stuebelii · Oxypogon stuebelii · Trochilidae · 3.000–4.600 msnm
 * · nectarívoro especializado, polinizador de frailejones · UICN VU.
 *
 * CONTRATO: misma forma que toda entrada de GUIAS_ARTE — {wrap, css, defs,
 * svg} — poses declaradas en el CSS vía [data-estado="…"]. ⚠️ `respira` va
 * PRIMERA en el CSS a propósito: marco.js arranca en repertorio[0], y el
 * chivito recibe al usuario como EL ANIMAL, nunca como el actor.
 *
 * NO PISA el arte vivo: se registra como `window.GUIA_CHIVITO_LAMINA`;
 * adoptarlo es `window.GUIAS_ARTE.chivito = window.GUIA_CHIVITO_LAMINA`
 * tras aprobación del operador.
 */
(function () {
  'use strict';

  /* ════════════════════════ LA TINTA (css del rig) ═══════════════════════ */
  var css = [
    '#chivito g,#chivito path,#chivito ellipse,#chivito circle,#chivito rect,#chivito use{transform-box:fill-box}',

    /* EL PARÁMETRO y sus motores: registrados para poder interpolar.
       Sin registro no hay transición ni amplitud — degrada a saltos, sin error. */
    '@property --rango{syntax:"<number>";inherits:true;initial-value:0}',
    '@property --bob{syntax:"<number>";inherits:true;initial-value:0}',
    '@property --bate{syntax:"<number>";inherits:true;initial-value:0}',
    ':host{--rango:0;transition:--rango 1.15s cubic-bezier(.45,.05,.25,1)}',

    /* ── respira: PRIMERA en el archivo — el estado con que recibe al
          usuario (repertorio[0] de marco.js): el animal posado, digno ── */
    ':host([data-estado="respira"]){--rango:0}',
    ':host([data-estado="respira"]) #cabezaP{animation:chCabezaSerena 7.5s ease-in-out infinite}',
    '@keyframes chCabezaSerena{0%,100%{transform:rotate(0deg)}42%{transform:rotate(-2.2deg)}72%{transform:rotate(1.6deg)}}',

    /* ═══ EL DIAL: todo lo que --rango maneja, en declaraciones calc() ═══ */
    /* despegue de la percha */
    '#rangoLift{transform:translateY(calc(var(--rango) * -50px))}',
    /* postura: posado inclina el cuerpo; erguido lo endereza */
    '#posturaP{animation:chBateK .09s linear infinite alternate;transform:rotate(calc((1 - var(--rango)) * 6deg));transform-origin:50% 88%}',
    '@keyframes chBateK{from{--bate:-1}to{--bate:1}}',
    /* flote: la amplitud ES el rango — posado no flota */
    '#flotaP{animation:chBobK 2.3s ease-in-out infinite alternate;transform:translateY(calc(var(--bob) * var(--rango) * 11px)) rotate(calc(var(--bob) * var(--rango) * 1.4deg))}',
    '@keyframes chBobK{from{--bob:-1}to{--bob:1}}',
    /* alas: plegadas contra el cuerpo (0) → abiertas (1); el aleteo es el
       motor --bate multiplicado por el rango: quieto posado, borrón en vuelo */
    '#alaIzqP{transform:rotate(calc((1 - var(--rango)) * 96deg)) scale(calc(.5 + .5 * var(--rango)),calc(.42 + .58 * var(--rango)))}',
    '#alaDerP{transform:rotate(calc((1 - var(--rango)) * -96deg)) scale(calc(.5 + .5 * var(--rango)),calc(.42 + .58 * var(--rango)))}',
    '#alaIzqBate{transform:rotate(calc(2deg + var(--bate) * var(--rango) * 16deg))}',
    '#alaDerBate{transform:rotate(calc(-2deg - var(--bate) * var(--rango) * 16deg))}',
    '.fantaLejos{opacity:calc(var(--rango) * .2)}',
    '.fantaCerca{opacity:calc(var(--rango) * .35)}',
    /* patitas: agarradas a la vara (0) → recogidas al vuelo (1) */
    '#patitasP{transform:rotate(calc(var(--rango) * 42deg)) translate(calc(var(--rango) * -3px),calc(var(--rango) * -8px))}',
    /* la CRESTA — el corazón del parámetro: barrida y baja (0) → erizada (1) */
    '.p1w{transform:rotate(calc((1 - var(--rango)) * -50deg)) scaleY(calc(.55 + .45 * var(--rango)));transform-origin:50% 98%}',
    '.p2w{transform:rotate(calc((1 - var(--rango)) * -44deg)) scaleY(calc(.55 + .45 * var(--rango)));transform-origin:50% 98%}',
    '.p3w{transform:rotate(calc((1 - var(--rango)) * -38deg)) scaleY(calc(.55 + .45 * var(--rango)));transform-origin:50% 98%}',
    '.p4w{transform:rotate(calc((1 - var(--rango)) * -30deg)) scaleY(calc(.55 + .45 * var(--rango)));transform-origin:50% 98%}',
    '.p5w{transform:rotate(calc((1 - var(--rango)) * -22deg)) scaleY(calc(.55 + .45 * var(--rango)));transform-origin:50% 98%}',
    /* el ojo se abre apenas con el ánimo — sigue chico y lateral SIEMPRE */
    '#ojosP{transform:scale(calc(1 + var(--rango) * .22))}',
    /* los brazos del ACTOR: no existen bajo .55, completos en .85 */
    '.brazoP{opacity:clamp(0,calc((var(--rango) - .55) * 3.3),1);transform:scale(clamp(.5,calc(.3 + var(--rango) * .7),1))}',

    /* ═══ VIDA DE BASE DEL ANIMAL (corre en todos los estados) ═══ */
    '#cuerpoRig{transform-origin:50% 40%;animation:chRespira 1.9s ease-in-out infinite alternate}',
    '@keyframes chRespira{from{transform:scale(1,1)}to{transform:scale(1.025,.975)}}',
    '#cola{transform-origin:60% 4%;animation:chColaSway 2.3s ease-in-out .4s infinite alternate}',
    '@keyframes chColaSway{from{transform:rotate(-4deg)}to{transform:rotate(6deg)}}',
    '.pluma{transform-origin:50% 98%;animation:chCrestaOla 2.1s ease-in-out infinite alternate}',
    '.pluma.p2{animation-delay:.14s}',
    '.pluma.p3{animation-delay:.28s}',
    '.pluma.p4{animation-delay:.42s}',
    '.pluma.p5{animation-delay:.56s}',
    '@keyframes chCrestaOla{from{transform:rotate(-3.5deg)}to{transform:rotate(4.5deg)}}',
    '.ojo{transform-origin:50% 50%;animation:chParpadeo 3.6s infinite}',
    '@keyframes chParpadeo{0%,91%,100%{transform:scaleY(1)}93.5%,96.5%{transform:scaleY(.12)}}',
    '.pupila{animation:chMirada 5.5s ease-in-out infinite}',
    '@keyframes chMirada{0%,34%{transform:translate(0,0)}40%,58%{transform:translate(2.2px,-1px)}64%,86%{transform:translate(-1.8px,.6px)}92%,100%{transform:translate(0,0)}}',
    '.barbaCapa{transform-origin:50% 3%}',
    '#barbaAtras{animation:chBarbaSway 2.7s ease-in-out infinite alternate}',
    '#barbaFrente{animation:chBarbaSway 2.7s ease-in-out .22s infinite alternate}',
    '@keyframes chBarbaSway{from{transform:rotate(-4.5deg) skewX(-2deg)}to{transform:rotate(4.5deg) skewX(2deg)}}',

    /* vida del paisaje */
    '.niebla{transform-box:fill-box;animation:chBrisa 14s ease-in-out infinite alternate}',
    '.niebla.n2{animation-duration:19s;animation-delay:-6s}',
    '.niebla.n3{animation-duration:23s;animation-delay:-11s}',
    '@keyframes chBrisa{from{transform:translateX(-40px)}to{transform:translateX(46px)}}',
    '.hojaLan{transform-box:fill-box;transform-origin:50% 96%;animation:chHojaMece 4.5s ease-in-out infinite alternate}',
    '.hojaLan.h2{animation-delay:-1.4s}',
    '.hojaLan.h3{animation-delay:-2.7s}',
    '@keyframes chHojaMece{from{transform:rotate(-1.5deg)}to{transform:rotate(1.7deg)}}',
    '.laguna{animation:chBrillaAgua 5s ease-in-out infinite alternate}',
    '@keyframes chBrillaAgua{from{opacity:.45}to{opacity:.8}}',

    /* ── acicala: la cabeza baja al ala plegada; el ala se ofrece apenas ── */
    ':host([data-estado="acicala"]){--rango:.1}',
    ':host([data-estado="acicala"]) #cabezaP{animation:chAcicala 2.9s ease-in-out infinite}',
    '@keyframes chAcicala{0%,100%{transform:rotate(0deg)}38%{transform:rotate(-30deg) translate(-13px,10px)}58%{transform:rotate(-24deg) translate(-10px,8px)}80%{transform:rotate(-31deg) translate(-13px,11px)}}',
    ':host([data-estado="acicala"]) #alaIzqP{animation:chAlaAseo 2.9s ease-in-out infinite}',
    '@keyframes chAlaAseo{0%,100%{transform:rotate(86deg) scale(.55,.48)}40%,78%{transform:rotate(72deg) scale(.6,.54)}}',

    /* ── mirausted: alza la cabeza y lo mira a USTED ── */
    ':host([data-estado="mirausted"]){--rango:.18}',
    ':host([data-estado="mirausted"]) #cabezaP{animation:chMiraUsted 4.4s ease-in-out infinite}',
    '@keyframes chMiraUsted{0%,100%{transform:rotate(0deg)}18%,76%{transform:rotate(2.5deg) translateY(-6px)}}',
    ':host([data-estado="mirausted"]) .pupila{animation:none;transform:translate(0,.5px)}',

    /* ── estira: el estirón de pájaro — un ala y la cola, hacia un lado ── */
    ':host([data-estado="estira"]){--rango:.26}',
    ':host([data-estado="estira"]) #alaDerP{animation:chAlaEstira 4.6s ease-in-out infinite}',
    '@keyframes chAlaEstira{0%,100%{transform:rotate(-71deg) scale(.63,.57)}35%,70%{transform:rotate(-10deg) scale(.92,.86)}}',
    ':host([data-estado="estira"]) #cola{animation:chColaAbanico 4.6s ease-in-out infinite}',
    '@keyframes chColaAbanico{0%,100%{transform:rotate(0deg)}35%,70%{transform:rotate(9deg) scaleX(1.18)}}',
    ':host([data-estado="estira"]) #cuerpoRig{animation:chCuerpoEstira 4.6s ease-in-out infinite}',
    '@keyframes chCuerpoEstira{0%,100%{transform:none}35%,70%{transform:rotate(-3.5deg) scaleX(1.05)}}',

    /* ── vigila: media asta del dial — la cresta a medio erizar, escanea ── */
    ':host([data-estado="vigila"]){--rango:.45}',
    ':host([data-estado="vigila"]) #cabezaP{animation:chVigila 5.2s ease-in-out infinite}',
    '@keyframes chVigila{0%,100%{transform:rotate(0deg)}22%{transform:rotate(-7deg) translate(-5px,-2px)}48%{transform:rotate(6deg) translate(4px,-2px)}74%{transform:rotate(-3deg)}}',
    ':host([data-estado="vigila"]) #cola{animation:chColaTic 1.3s ease-in-out infinite}',
    '@keyframes chColaTic{0%,70%,100%{transform:rotate(0deg)}80%,90%{transform:rotate(8deg)}}',

    /* ── guino: dial del medio — el cuerpo sigue siendo el animal; la CARA
          hace el gesto un instante y se borra ── */
    ':host([data-estado="guino"]){--rango:.55}',
    '#guinoCara{opacity:0}',
    ':host([data-estado="guino"]) #guinoCara{animation:chGuinoFlash 3s ease-in-out infinite}',
    ':host([data-estado="guino"]) #ojoDerG{animation:chOjoSeVa 3s ease-in-out infinite}',
    '@keyframes chGuinoFlash{0%,18%,82%,100%{opacity:0}30%,70%{opacity:1}}',
    '@keyframes chOjoSeVa{0%,18%,82%,100%{opacity:1}30%,70%{opacity:0}}',
    ':host([data-estado="guino"]) #cabezaP{animation:chCabezaGuino 3s ease-in-out infinite}',
    '@keyframes chCabezaGuino{0%,18%,82%,100%{transform:rotate(0deg)}30%,70%{transform:rotate(-4deg) translateY(-2px)}}',

    /* ── liba: SU OFICIO — vuela a la flor del frailejón y poliniza ── */
    '#chivitoPose{transition:transform 1.7s cubic-bezier(.45,.05,.25,1)}',
    ':host([data-estado="liba"]){--rango:1}',
    ':host([data-estado="liba"]) #chivitoPose{transform:translate(210px,-118px) rotate(9deg)}',
    ':host([data-estado="liba"]) #cabezaP{animation:chCabezaLiba 2.6s ease-in-out infinite}',
    '@keyframes chCabezaLiba{0%,100%{transform:rotate(5deg)}50%{transform:rotate(9deg) translate(3px,2px)}}',
    '.polen{opacity:0}',
    ':host([data-estado="liba"]) .polen{opacity:1;animation:chPolenSube 1.6s ease-out infinite}',
    '.polen.q2{animation-delay:.4s}',
    '.polen.q3{animation-delay:.8s}',
    '.polen.q4{animation-delay:1.2s}',
    '@keyframes chPolenSube{0%{transform:translate(0,0);opacity:0}15%{opacity:.95}100%{transform:translate(-24px,-58px);opacity:0}}',
    '#destelloFlor{opacity:0;transform-box:fill-box;transform-origin:50% 50%}',
    ':host([data-estado="liba"]) #destelloFlor{opacity:1;animation:chPulsoFlor 1.2s ease-in-out infinite alternate}',
    '@keyframes chPulsoFlor{from{transform:scale(.9)}to{transform:scale(1.1)}}',

    /* ── hablar (narrativa): chachara de pico, la manopla lleva el cuento ── */
    ':host([data-estado="hablar"]){--rango:1}',
    '#picoBajo{transform-origin:6% 40%}',
    ':host([data-estado="hablar"]) #picoBajo{animation:chHabla .17s steps(2,end) infinite alternate}',
    '@keyframes chHabla{from{transform:rotate(2deg)}to{transform:rotate(13deg)}}',
    ':host([data-estado="hablar"]) #brazoDer{animation:chGesticula 1.1s ease-in-out infinite alternate}',
    '@keyframes chGesticula{from{transform:rotate(-16deg)}to{transform:rotate(-56deg)}}',
    ':host([data-estado="hablar"]) #brazoIzq{transform:rotate(24deg)}',
    ':host([data-estado="hablar"]) .pupila{animation:none;transform:translate(0,1.5px)}',
    ':host([data-estado="hablar"]) .pluma{animation-duration:1s}',

    '@media (prefers-reduced-motion:reduce){#chivitoLaminaWrap *{animation:none!important;transition:none!important}}',
  ].join('\n');

  /* ═══════════════════════════ LOS DEFS ═══════════════════════════ */
  var defs = [
    '<radialGradient id="chPapel" cx="50%" cy="42%" r="75%">',
    '<stop offset="0%" stop-color="#efe6cc"/><stop offset="62%" stop-color="#e7dcbc"/>',
    '<stop offset="88%" stop-color="#dbcba4"/><stop offset="100%" stop-color="#cbb68e"/>',
    '</radialGradient>',
    '<linearGradient id="chCielo" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#c3cdc4" stop-opacity=".9"/><stop offset="100%" stop-color="#e7dcbc" stop-opacity="0"/>',
    '</linearGradient>',
    '<pattern id="chRaya" width="5" height="5" patternUnits="userSpaceOnUse">',
    '<path d="M0 4.5H5" stroke="#6b5a3c" stroke-width=".65" opacity=".5"/></pattern>',
    '<pattern id="chDiag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">',
    '<path d="M0 5H6" stroke="#565c48" stroke-width=".7" opacity=".5"/></pattern>',
    '<pattern id="chPunto" width="7" height="7" patternUnits="userSpaceOnUse">',
    '<circle cx="2" cy="2" r=".6" fill="#6b5a3c" opacity=".38"/>',
    '<circle cx="5.5" cy="5.5" r=".5" fill="#6b5a3c" opacity=".3"/></pattern>',
    /* la iridiscencia ESTRUCTURAL de la barba: el SMIL dura 5.4s = período
       completo del sway (2.7s alternate) — el color va EN FASE con el ángulo */
    '<linearGradient id="gIris" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#21c08b">',
    '<animate attributeName="stop-color" values="#21c08b;#7b3fd4;#21c08b" dur="5.4s" repeatCount="indefinite"/>',
    '</stop>',
    '<stop offset="1" stop-color="#7b3fd4">',
    '<animate attributeName="stop-color" values="#7b3fd4;#21c08b;#7b3fd4" dur="5.4s" repeatCount="indefinite"/>',
    '</stop>',
    '</linearGradient>',
    '<linearGradient id="gCuerpo" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#96945e"/><stop offset="1" stop-color="#737346"/>',
    '</linearGradient>',
    '<radialGradient id="chVineta" cx="50%" cy="50%" r="72%">',
    '<stop offset="72%" stop-color="#3a2c14" stop-opacity="0"/>',
    '<stop offset="100%" stop-color="#3a2c14" stop-opacity=".22"/></radialGradient>',
    '<filter id="chBlurAla"><feGaussianBlur stdDeviation="1.4"/></filter>',
    /* pétalo y capítulo del frailejón — CHICOS: acento, no girasol */
    '<ellipse id="chPetalo" cx="0" cy="-13" rx="3.8" ry="9"/>',
    '<g id="chCapitulo">',
    '<g fill="#d9b83e" stroke="#b8942a" stroke-width=".8">',
    '<use href="#chPetalo"/><use href="#chPetalo" transform="rotate(30)"/><use href="#chPetalo" transform="rotate(60)"/>',
    '<use href="#chPetalo" transform="rotate(90)"/><use href="#chPetalo" transform="rotate(120)"/><use href="#chPetalo" transform="rotate(150)"/>',
    '<use href="#chPetalo" transform="rotate(180)"/><use href="#chPetalo" transform="rotate(210)"/><use href="#chPetalo" transform="rotate(240)"/>',
    '<use href="#chPetalo" transform="rotate(270)"/><use href="#chPetalo" transform="rotate(300)"/><use href="#chPetalo" transform="rotate(330)"/>',
    '</g>',
    '<circle r="7.5" fill="#96591c"/>',
    '<circle r="7.5" fill="none" stroke="#6e4012" stroke-width="1.2" stroke-dasharray="1.4 2"/>',
    '</g>',
    /* hoja LANUDA de la roseta: tinte plateado, halo de pubescencia */
    '<g id="chHojaLanuda">',
    '<path d="M0,0 C -15,-32 -17,-78 -9,-112 C -6,-124 6,-124 9,-112 C 17,-78 15,-32 0,0 Z" stroke="#e8eedd" stroke-width="4.5"/>',
    '<path d="M0,-14 C -3,-44 -3,-78 0,-104" stroke="#94a184" stroke-width="2" fill="none" opacity=".8"/>',
    '<path d="M-6,-38 c 2,-2 5,-2 7,0 M-7,-66 c 2,-2 6,-2 8,0 M-5,-90 c 2,-2 5,-2 6,0" stroke="#eef2e4" stroke-width="1.6" fill="none" opacity=".9"/>',
    '</g>',
    /* frailejón lejano CON su falda de necromasa — nunca tronco desnudo */
    '<g id="chFrailLejos">',
    '<path d="M-14,0 C -17,-22 -15,-46 -12,-64 L 12,-64 C 15,-46 17,-22 14,0 C 8,6 -8,6 -14,0 Z"/>',
    '<path d="M-15,-14 q 4,7 8,0 q 4,7 8,0 q 4,7 8,0 q 4,6 6,0 M-16,-34 q 4,7 8,0 q 4,7 8,0 q 4,7 8,0 q 4,6 7,0" fill="none" stroke-width="1.6"/>',
    '<path d="M0,-66 L-40,-80 L-11,-72 L-27,-98 L-6,-77 L0,-104 L6,-77 L27,-98 L11,-72 L40,-80 Z"/>',
    '</g>',
  ].join('');

  /* ═════════════════════ EL DIBUJO (svg del rig) ═════════════════════ */
  var T = '#2c2318';

  /* faldas de necromasa: banda con ruedo festoneado — MASA de hojas muertas
     colgando, no hojas contables (regla dura del brief) */
  function falda(y, w, h, fill) {
    var s = '<path d="M' + (-w) + ',' + y + ' L' + w + ',' + y;
    var n = 7;
    for (var i = 0; i < n; i++) {
      var x1 = w - (2 * w / n) * (i + 0.5);
      var x0 = w - (2 * w / n) * (i + 1);
      var dip = y + h + ((i * 13) % 9) - 4;
      s += ' Q' + x1.toFixed(0) + ',' + (dip + 8) + ' ' + x0.toFixed(0) + ',' + (y + h - 6 - ((i * 7) % 6));
    }
    s += ' Z" fill="' + fill + '" stroke="' + T + '" stroke-width="1.8" opacity=".96"/>';
    return s;
  }

  /* ── EL PERSONAJE: un solo dibujo, un solo dial ── */
  var chivito = [
    /* ⚠️ el transform de posición va en un HIJO de #chivito, nunca en
       #chivito mismo: getBBox() ignora el transform propio del elemento
       (y el de sus ancestros) pero SÍ suma los de descendientes — con el
       translate encima, encuadrar() recortaba la esquina de la lámina
       (medido en captura: el barrido mostraba el título, no el pájaro). */
    '<g id="chivito">',
    '<g transform="translate(790,556) scale(.92)">',
    '<g id="chivitoPose">',
    '<g id="rangoLift">',
    '<g id="flotaP">',
    '<g id="posturaP">',
    '<g id="cuerpoRig">',

    /* COLA — tres plumas broncíneas en abanico (del molde, aprobadas) */
    '<g transform="translate(-6,112)"><g id="cola">',
    '<g transform="rotate(38)">',
    '<path d="M0,0 C -13,50 -13,116 0,162 C 13,116 13,50 0,0 Z" fill="#5f4626" stroke="' + T + '" stroke-width="3.5"/>',
    '<path d="M0,18 C -6,54 -6,104 0,140" stroke="#efe6c8" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    '</g>',
    '<g transform="rotate(17)">',
    '<path d="M0,0 C -13,52 -13,122 0,170 C 13,122 13,52 0,0 Z" fill="#7d5c3a" stroke="' + T + '" stroke-width="3.5"/>',
    '</g>',
    '<g transform="rotate(-4)">',
    '<path d="M0,0 C -12,48 -12,110 0,152 C 12,110 12,48 0,0 Z" fill="#8a6a45" stroke="' + T + '" stroke-width="3.5"/>',
    '<path d="M0,18 C 5,50 5,96 0,132" stroke="#efe6c8" stroke-width="3" fill="none" stroke-linecap="round"/>',
    '</g>',
    '</g></g>',

    /* ALAS — el mismo dibujo en todo el dial: la P la pliega, --bate la bate.
       El rect ancla (invisible) fija el bbox para que el pivote 50%/50%
       caiga EXACTO en el hombro con transform-box:fill-box. */
    '<g transform="translate(-56,34)"><g id="alaIzqP" style="transform-origin:50% 50%">',
    '<rect x="-128" y="-92" width="256" height="184" fill="none" stroke="none"/>',
    '<g id="alaIzqBate" style="transform-origin:50% 50%">',
    '<rect x="-128" y="-92" width="256" height="184" fill="none" stroke="none"/>',
    '<path class="fantaLejos" d="M0,0 C -44,4 -90,-14 -122,-58 C -86,-80 -38,-58 -8,-20 Z" transform="rotate(34)" fill="#9a985f" filter="url(#chBlurAla)"/>',
    '<path class="fantaCerca" d="M0,0 C -44,4 -90,-14 -122,-58 C -86,-80 -38,-58 -8,-20 Z" transform="rotate(16)" fill="#9a985f" filter="url(#chBlurAla)"/>',
    '<path d="M0,0 C -44,4 -90,-14 -122,-58 C -86,-80 -38,-58 -8,-20 Z" fill="#aaa871" stroke="' + T + '" stroke-width="3.5"/>',
    '<path d="M-16,-8 C -42,-12 -70,-26 -92,-48 M-14,-2 C -40,-2 -68,-12 -90,-30" stroke="' + T + '" stroke-width="1.6" fill="none" opacity=".5"/>',
    '</g></g></g>',
    '<g transform="translate(56,34)"><g id="alaDerP" style="transform-origin:50% 50%">',
    '<rect x="-128" y="-92" width="256" height="184" fill="none" stroke="none"/>',
    '<g id="alaDerBate" style="transform-origin:50% 50%">',
    '<rect x="-128" y="-92" width="256" height="184" fill="none" stroke="none"/>',
    '<path class="fantaLejos" d="M0,0 C 44,4 90,-14 122,-58 C 86,-80 38,-58 8,-20 Z" transform="rotate(-34)" fill="#9a985f" filter="url(#chBlurAla)"/>',
    '<path class="fantaCerca" d="M0,0 C 44,4 90,-14 122,-58 C 86,-80 38,-58 8,-20 Z" transform="rotate(-16)" fill="#9a985f" filter="url(#chBlurAla)"/>',
    '<path d="M0,0 C 44,4 90,-14 122,-58 C 86,-80 38,-58 8,-20 Z" fill="#aaa871" stroke="' + T + '" stroke-width="3.5"/>',
    '<path d="M16,-8 C 42,-12 70,-26 92,-48 M14,-2 C 40,-2 68,-12 90,-30" stroke="' + T + '" stroke-width="1.6" fill="none" opacity=".5"/>',
    '</g></g></g>',

    /* PATITAS — agarradas a la vara en reposo; el dial las recoge */
    '<g id="patitasP" style="transform-origin:50% 50%">',
    '<rect x="-40" y="104" width="80" height="44" fill="none" stroke="none"/>',
    '<g stroke="' + T + '" stroke-width="5" stroke-linecap="round" fill="none">',
    '<path d="M-14,122 C -15,132 -17,138 -21,142"/>',
    '<path d="M14,122 C 15,132 17,138 21,142"/>',
    '<path d="M-21,142 c -5,2 -9,1 -12,-2 M-21,142 c 0,4 2,6 6,7 M-21,142 c -2,4 -1,7 1,9"/>',
    '<path d="M21,142 c 5,2 9,1 12,-2 M21,142 c 0,4 -2,6 -6,7 M21,142 c 2,4 1,7 -1,9"/>',
    '</g>',
    '</g>',

    /* CUERPO (del molde) */
    '<ellipse cx="0" cy="62" rx="56" ry="64" fill="url(#gCuerpo)" stroke="' + T + '" stroke-width="4"/>',
    '<path d="M0,6 C 28,12 38,44 36,80 C 32,112 -32,112 -36,80 C -38,44 -28,12 0,6 Z" fill="#eee0ba"/>',
    '<g fill="#8a8a52" opacity=".7">',
    '<ellipse cx="-24" cy="60" rx="4.5" ry="6"/><ellipse cx="25" cy="56" rx="4.5" ry="6"/>',
    '<ellipse cx="-28" cy="86" rx="4" ry="5.5"/><ellipse cx="28" cy="84" rx="4" ry="5.5"/>',
    '<ellipse cx="-12" cy="102" rx="3.5" ry="5"/><ellipse cx="14" cy="102" rx="3.5" ry="5"/>',
    '</g>',

    /* CABEZA — cara oscura BORDEADA de crema (patrón real), ojo chico lateral */
    '<g id="cabezaP" style="transform-origin:50% 92%">',
    '<g id="cabeza">',

    /* CRESTA — la geometría aprobada del molde; cada pluma en su wrapper
       de parámetro (pNw) con su veta ADENTRO para que viaje con ella */
    '<g id="cresta" transform="translate(-2,-128)">',
    '<g class="p1w"><g class="pluma">',
    '<path d="M-34,14 C -44,-8 -47,-32 -40,-54 C -28,-36 -22,-12 -16,8 Z" fill="#43331f" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M-38,-46 C -32,-30 -27,-12 -24,4" stroke="#e8d5a8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>',
    '</g></g>',
    '<g class="p2w"><g class="pluma p2">',
    '<path d="M-18,8 C -22,-26 -16,-58 -2,-82 C 4,-54 2,-22 0,6 Z" fill="#57432f" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M-7,-70 C -8,-44 -8,-18 -8,4" stroke="#e8d5a8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>',
    '</g></g>',
    '<g class="p3w"><g class="pluma p3">',
    '<path d="M-2,6 C 2,-38 14,-76 36,-100 C 32,-62 22,-26 14,6 Z" fill="#43331f" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M28,-86 C 20,-56 13,-24 9,4" stroke="#e8d5a8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>',
    '</g></g>',
    '<g class="p4w"><g class="pluma p4">',
    '<path d="M14,8 C 24,-26 42,-54 64,-72 C 52,-40 36,-10 26,10 Z" fill="#57432f" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M56,-62 C 44,-38 32,-12 24,8" stroke="#e8d5a8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>',
    '</g></g>',
    '<g class="p5w"><g class="pluma p5">',
    '<path d="M26,12 C 40,-8 56,-24 76,-34 C 62,-14 46,4 36,16 Z" fill="#43331f" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M68,-30 C 56,-14 44,2 36,12" stroke="#e8d5a8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>',
    '</g></g>',
    '<path d="M-36,16 C -14,4 24,4 44,18 C 20,10 -12,10 -36,16 Z" fill="#f6efdc" stroke="' + T + '" stroke-width="2"/>',
    '</g>',

    /* cráneo crema */
    '<circle cx="0" cy="-56" r="78" fill="#efe3bd" stroke="' + T + '" stroke-width="4"/>',
    /* la CARA oscura: blaze angosto de frente a garganta, ribeteado crema —
       los ojos quedan AFUERA, en el crema (adiós antifaz de búho) */
    '<path d="M0,-134 C -20,-132 -33,-122 -37,-106 C -41,-88 -37,-68 -29,-52 C -21,-38 -11,-30 0,-28 C 11,-30 21,-38 29,-52 C 37,-68 41,-88 37,-106 C 33,-122 20,-132 0,-134 Z" fill="none" stroke="#e8d5a8" stroke-width="6.5"/>',
    '<path d="M0,-132 C -18,-130 -31,-121 -35,-105 C -38,-88 -35,-69 -27,-54 C -20,-41 -10,-32 0,-30 C 10,-32 20,-41 27,-54 C 35,-69 38,-88 35,-105 C 31,-121 18,-130 0,-132 Z" fill="#3b2d20" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M-10,-118 C -4,-122 4,-122 10,-118 M-14,-96 C -6,-100 6,-100 14,-96" stroke="#57432f" stroke-width="2" fill="none" opacity=".8"/>',

    /* OJOS — chicos, laterales, oscuros; el brillo es lo que mira */
    '<g id="ojosP" style="transform-origin:50% 50%">',
    '<g id="ojoIzqG" class="ojo">',
    '<path d="M-52,-70 l16,-4" stroke="#57432f" stroke-width="2.4" stroke-linecap="round"/>',
    '<ellipse cx="-42" cy="-59" rx="8" ry="9" fill="#241a10" stroke="#efe3bd" stroke-width="2"/>',
    '<g class="pupila">',
    '<circle cx="-39.5" cy="-62" r="2.6" fill="#ffffff"/>',
    '<circle cx="-44.5" cy="-55" r="1.2" fill="#ffffff" opacity=".7"/>',
    '</g>',
    '</g>',
    '<g id="ojoDerG" class="ojo">',
    '<path d="M52,-70 l-16,-4" stroke="#57432f" stroke-width="2.4" stroke-linecap="round"/>',
    '<ellipse cx="42" cy="-59" rx="8" ry="9" fill="#241a10" stroke="#efe3bd" stroke-width="2"/>',
    '<g class="pupila">',
    '<circle cx="44.5" cy="-62" r="2.6" fill="#ffffff"/>',
    '<circle cx="39.5" cy="-55" r="1.2" fill="#ffffff" opacity=".7"/>',
    '</g>',
    '</g>',
    '</g>',
    /* cara del GUIÑO (dial del medio): parche que releva el ojo derecho */
    '<g id="guinoCara">',
    '<rect x="28" y="-76" width="30" height="28" fill="#efe3bd"/>',
    '<path d="M32,-58 C 37,-52 47,-52 52,-58" fill="none" stroke="' + T + '" stroke-width="3.4" stroke-linecap="round"/>',
    '<path d="M54,-64 l8,-4 M55,-57 l9,1" stroke="' + T + '" stroke-width="2.2" stroke-linecap="round"/>',
    '</g>',

    /* mejillas */
    '<ellipse cx="-60" cy="-24" rx="10" ry="7" fill="#e3a99a" opacity=".55"/>',
    '<ellipse cx="60" cy="-24" rx="10" ry="7" fill="#e3a99a" opacity=".55"/>',

    /* PICO — recto y FINO (Oxypogon): aguja, no triangulito */
    '<g id="pico" transform="translate(14,-58) rotate(16)">',
    '<path id="picoBajo" d="M2,3 C 20,5 38,5 54,3 C 40,7.5 18,7.5 2,6 Z" fill="#241a10" stroke="' + T + '" stroke-width="1.6"/>',
    '<path id="picoAlto" d="M0,-3 C 20,-6 42,-6 60,-1.5 C 62,-.5 62,.5 60,1.5 C 42,4.5 20,4.5 0,3 Z" fill="#33281c" stroke="' + T + '" stroke-width="2"/>',
    '<path d="M4,-2.5 C 22,-4.5 42,-4.5 57,-1" stroke="#6a5637" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    '</g>',

    '</g>', /* /cabeza */
    '</g>', /* /cabezaP */

    /* BARBA — la GORGUERA que cuelga de la garganta: ancha, borde blanco,
       corazón iridiscente en fase con su vaivén (estructura, no pigmento) */
    '<g id="barba" transform="translate(2,-22)">',
    '<path id="barbaAtras" class="barbaCapa" d="M-24,0 C -34,34 -30,78 -6,116 C 18,80 28,36 22,0 C 8,8 -10,8 -24,0 Z" fill="#e6ddc2" stroke="' + T + '" stroke-width="3.5"/>',
    '<g id="barbaFrente" class="barbaCapa">',
    '<path d="M-19,2 C -27,30 -23,66 -3,98 C 15,66 21,32 16,2 C 5,9 -8,9 -19,2 Z" fill="#fdfbf4" stroke="' + T + '" stroke-width="3"/>',
    '<path d="M-15,28 C -17,44 -15,60 -10,72 M13,26 C 15,42 13,58 8,70" stroke="#e2d9bd" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
    '<path d="M-10,8 C -14,34 -11,62 -2,84 C 7,62 10,34 8,8 C 3,11 -5,11 -10,8 Z" fill="url(#gIris)"/>',
    '<path d="M-6,16 C -8,34 -6,54 -2,70" stroke="#ffffff" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>',
    '</g>',
    '</g>',

    /* BRAZOS del ACTOR — rubber hose con guante (del molde); el wrapper
       .brazoP los borra del animal: bajo rango .55 NO existen */
    '<g transform="translate(-54,44)"><g class="brazoP" style="transform-origin:50% 50%">',
    '<rect x="-84" y="-46" width="168" height="92" fill="none" stroke="none"/>',
    '<g id="brazoIzq" style="transform-origin:94% 20%">',
    '<path d="M0,0 C -26,18 -46,26 -60,22" stroke="' + T + '" stroke-width="12" fill="none" stroke-linecap="round"/>',
    '<g transform="translate(-64,20)">',
    '<circle cx="0" cy="0" r="15" fill="#fdfbf4" stroke="' + T + '" stroke-width="3.5"/>',
    '</g>',
    '</g></g></g>',
    '<g transform="translate(54,44)"><g class="brazoP" style="transform-origin:50% 50%">',
    '<rect x="-84" y="-46" width="168" height="92" fill="none" stroke="none"/>',
    '<g id="brazoDer" style="transform-origin:6% 20%">',
    '<path d="M0,0 C 26,18 46,26 60,22" stroke="' + T + '" stroke-width="12" fill="none" stroke-linecap="round"/>',
    '<g transform="translate(64,20)">',
    '<circle cx="0" cy="0" r="15" fill="#fdfbf4" stroke="' + T + '" stroke-width="3.5"/>',
    '</g>',
    '</g></g></g>',

    '</g>', /* /cuerpoRig */
    '</g>', /* /posturaP */
    '</g>', /* /flotaP */
    '</g>', /* /rangoLift */
    '</g>', /* /chivitoPose */
    '</g>', /* /posición */
    '</g>', /* /chivito */
  ].join('\n');

  var svg = [
    '<g id="chivitoLaminaWrap">',

    /* ── EL PAPEL ── */
    '<rect x="0" y="0" width="1680" height="960" fill="url(#chPapel)"/>',
    '<ellipse cx="188" cy="98" rx="60" ry="26" fill="#c9a96c" opacity=".14"/>',
    '<ellipse cx="1520" cy="880" rx="84" ry="30" fill="#c9a96c" opacity=".16"/>',
    '<ellipse cx="1450" cy="120" rx="46" ry="20" fill="#c9a96c" opacity=".11"/>',
    '<ellipse cx="120" cy="840" rx="52" ry="34" fill="#bf9a58" opacity=".11"/>',

    /* ── EL MARCO: doble filete + volutas (patrón del jaguar) ── */
    '<rect x="26" y="26" width="1628" height="908" fill="none" stroke="#6b5a3c" stroke-width="3.2"/>',
    '<rect x="38" y="38" width="1604" height="884" fill="none" stroke="#6b5a3c" stroke-width="1.1"/>',
    '<g stroke="#6b5a3c" fill="none" stroke-width="2">',
    '<path d="M44 92c26-4 34-22 22-34-9-9-26-6-26 8 0 12 16 18 34 12"/>',
    '<path d="M1636 92c-26-4-34-22-22-34 9-9 26-6 26 8 0 12-16 18-34 12"/>',
    '<path d="M44 868c26 4 34 22 22 34-9 9-26 6-26-8 0-12 16-18 34-12"/>',
    '<path d="M1636 868c-26 4-34 22-22 34-9 9-26 6-26-8 0-12 16-18 34-12"/>',
    '</g>',

    /* ── EL TÍTULO ── */
    '<g font-family="Georgia,\'Times New Roman\',serif" fill="#3c2c14" text-anchor="middle">',
    '<text x="840" y="76" font-size="21" letter-spacing="3">UNA INTERPRETACIÓN VISIONARIA DE HISTORIA NATURAL · EL RANGO ENTERO EN UN SOLO PARÁMETRO</text>',
    '<text x="840" y="122" font-size="40" font-weight="bold" letter-spacing="7">EL CHIVITO DEL PÁRAMO · POLINIZADOR DEL FRAILEJÓN</text>',
    '</g>',
    '<g>',
    '<path d="M560 138 L1120 138 L1104 160 L1120 182 L560 182 L576 160 Z" fill="#f2e7c8" stroke="#6b5a3c" stroke-width="2.2"/>',
    '<path d="M560 138 L540 148 L556 160 L540 174 L560 182 L576 160 Z" fill="#e2d2a8" stroke="#6b5a3c" stroke-width="2"/>',
    '<path d="M1120 138 L1140 148 L1124 160 L1140 174 L1120 182 L1104 160 Z" fill="#e2d2a8" stroke="#6b5a3c" stroke-width="2"/>',
    '<text x="840" y="168" font-family="Georgia,serif" font-size="25" font-style="italic" fill="#3c2c14" text-anchor="middle" letter-spacing="2">Oxypogon stuebelii — colibrí de barba y cresta, guía de Guatoc</text>',
    '</g>',

    /* ── EL PAISAJE GRABADO: páramo, verde-dominante y apagado ── */
    '<g id="chPaisaje">',
    '<rect x="330" y="200" width="1010" height="170" fill="url(#chCielo)"/>',
    '<circle cx="470" cy="270" r="52" fill="#f4ecd2" opacity=".6"/>',
    '<circle cx="470" cy="270" r="52" fill="none" stroke="#b8a878" stroke-width="1.2" opacity=".6"/>',

    /* cordillera de crestas quebradas, a trama */
    '<path d="M330 500 L 372 448 L 404 402 L 428 420 L 460 366 L 502 322 L 526 352 L 548 334 L 582 380 L 614 352 L 650 424 L 684 392 L 722 450 L 760 416 L 800 500 Z" fill="url(#chDiag)" stroke="' + T + '" stroke-width="2" opacity=".75"/>',
    '<path d="M880 500 L 926 434 L 962 396 L 990 418 L 1030 356 L 1068 320 L 1096 356 L 1130 330 L 1170 396 L 1210 366 L 1252 440 L 1290 410 L 1340 500 Z" fill="url(#chDiag)" stroke="' + T + '" stroke-width="2" opacity=".7"/>',
    '<g stroke="#565c48" stroke-width="1" fill="none" opacity=".55">',
    '<path d="M502 322 L 510 356 L 498 388 L 512 424 L 502 458"/>',
    '<path d="M614 352 L 624 384 L 614 412 L 626 444"/>',
    '<path d="M1068 320 L 1076 354 L 1064 386 L 1078 422"/>',
    '<path d="M1170 396 L 1160 424 L 1170 452"/>',
    '</g>',

    /* frailejones lejanos en la ladera — siempre con su falda */
    '<g fill="#7c8868" opacity=".5" stroke="#7c8868">',
    '<use href="#chFrailLejos" transform="translate(420,600) scale(.7)"/>',
    '<use href="#chFrailLejos" transform="translate(540,622) scale(.5)"/>',
    '<use href="#chFrailLejos" transform="translate(960,590) scale(.62)"/>',
    '<use href="#chFrailLejos" transform="translate(1300,614) scale(.48)"/>',
    '<use href="#chFrailLejos" transform="translate(660,606) scale(.42)"/>',
    '</g>',

    /* la lagunita que cosecha el agua del páramo */
    '<g>',
    '<ellipse cx="510" cy="726" rx="140" ry="26" fill="#94aab2" opacity=".8"/>',
    '<ellipse cx="510" cy="724" rx="126" ry="21" fill="#adc2c8" opacity=".9"/>',
    '<ellipse class="laguna" cx="484" cy="722" rx="64" ry="8" fill="#e6f0ec"/>',
    '<path d="M400 738 c40 -8 90 -10 140 -4 M470 748 c40 -6 90 -4 120 2" stroke="#7a8f96" stroke-width="1.2" fill="none" opacity=".6"/>',
    '</g>',

    /* niebla del páramo */
    '<g fill="#ffffff">',
    '<ellipse class="niebla" cx="560" cy="560" rx="240" ry="32" opacity=".2"/>',
    '<ellipse class="niebla n2" cx="1060" cy="628" rx="280" ry="40" opacity=".16"/>',
    '<ellipse class="niebla n3" cx="760" cy="800" rx="340" ry="52" opacity=".2"/>',
    '</g>',

    /* piso: pajonal en dos tonos */
    '<path d="M330 770 C 520 748 760 764 980 752 C 1160 744 1260 750 1340 746 L1340 830 L330 830 Z" fill="#b0ab88" opacity=".9"/>',
    '<path d="M330 800 C 560 782 900 800 1340 776 L1340 830 L330 830 Z" fill="#9d9878" opacity=".9"/>',
    '<g stroke="#8f8c62" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".8">',
    '<path d="M380,790 C 376,764 370,748 362,734"/><path d="M395,792 C 398,766 403,750 412,736"/>',
    '<path d="M700,782 C 696,756 690,740 682,726"/><path d="M715,784 C 718,758 723,742 732,728"/>',
    '<path d="M920,790 C 916,764 910,748 902,734"/><path d="M935,792 C 938,766 943,750 952,736"/>',
    '<path d="M1290,782 C 1286,756 1280,740 1272,726"/><path d="M1305,784 C 1308,758 1313,742 1322,728"/>',
    '<path d="M600,806 C 596,784 592,772 586,762"/><path d="M613,808 C 616,786 620,774 627,764"/>',
    '</g>',

    /* frailejón mediano del fondo izquierdo — vestido, chico, sin flores */
    '<g transform="translate(452,788) scale(.62)">',
    '<path d="M-40,-190 C -44,-130 -46,-60 -42,0 L 42,0 C 46,-60 44,-130 40,-190 Z" fill="#8d7752"/>',
    falda(-186, 44, 34, '#a68c60'), falda(-152, 46, 34, '#b39a6e'), falda(-118, 47, 34, '#a68c60'),
    falda(-84, 48, 34, '#c0a878'), falda(-50, 48, 34, '#a68c60'), falda(-16, 48, 32, '#b39a6e'),
    '<g stroke="#dfe8d2" stroke-width="3">',
    '<g transform="translate(0,-196) rotate(-48) scale(.76)"><use href="#chHojaLanuda" fill="#a8b491"/></g>',
    '<g transform="translate(0,-196) rotate(-24) scale(.88)"><use href="#chHojaLanuda" fill="#b2bd9a"/></g>',
    '<g transform="translate(0,-196) rotate(0) scale(.94)"><use href="#chHojaLanuda" fill="#bcc7a4"/></g>',
    '<g transform="translate(0,-196) rotate(24) scale(.88)"><use href="#chHojaLanuda" fill="#b2bd9a"/></g>',
    '<g transform="translate(0,-196) rotate(48) scale(.76)"><use href="#chHojaLanuda" fill="#a8b491"/></g>',
    '</g>',
    '</g>',

    /* ═══ EL FRAILEJÓN PROTAGONISTA — Espeletia como es: tronco VESTIDO
       de necromasa (masa, no hojas contables) y roseta LANUDA plateada ═══ */
    '<g id="chFrailejon">',
    '<g transform="translate(1155,812)">',
    /* el tronco de adentro casi no se ve: lo viste la falda */
    '<path d="M-36,-310 C -42,-210 -44,-100 -38,0 L 38,0 C 44,-100 42,-210 36,-310 Z" fill="#7c6644"/>',
    /* faldas de hojas muertas colgando, de la roseta al piso */
    falda(-306, 40, 46, '#a68c60'),
    falda(-262, 43, 46, '#b39a6e'),
    falda(-218, 45, 46, '#c0a878'),
    falda(-174, 46, 46, '#a68c60'),
    falda(-130, 47, 46, '#b39a6e'),
    falda(-86, 48, 46, '#c0a878'),
    falda(-42, 48, 44, '#a68c60'),
    /* puntas sueltas que rompen la silueta */
    '<path d="M-46,-238 C -54,-224 -56,-208 -50,-196 M48,-192 C 56,-178 57,-162 51,-150 M-48,-118 C -56,-104 -57,-90 -51,-78" stroke="#8d7752" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>',
    '<path d="M-30,-290 l0,14 M10,-266 l0,14 M30,-224 l0,14 M-16,-200 l0,14 M22,-156 l0,14 M-26,-112 l0,14 M14,-68 l0,14" stroke="#6e5a3c" stroke-width="1.6" opacity=".55"/>',

    /* el NIDO de lana, escondido en la necromasa (el pacto: polluelos) */
    '<g transform="translate(-8,-158) scale(.82)">',
    '<ellipse cx="0" cy="2" rx="48" ry="40" fill="#5f4c31"/>',
    '<ellipse cx="0" cy="6" rx="38" ry="30" fill="#42341f"/>',
    '<circle cx="-11" cy="6" r="8.5" fill="#8d855c"/>',
    '<circle cx="12" cy="5" r="8.5" fill="#978e62"/>',
    '<circle cx="-13.5" cy="4" r="1.6" fill="#2c2318"/><circle cx="9.5" cy="3" r="1.6" fill="#2c2318"/>',
    '<path d="M-8,8 l5.5,2.2 l-5.5,2.2 Z" fill="#e8b23a"/><path d="M15,7 l5.5,2.2 l-5.5,2.2 Z" fill="#e8b23a"/>',
    '<path d="M-38,14 C -34,34 34,34 38,14 C 34,44 -34,44 -38,14 Z" fill="#f6ecc9"/>',
    '<path d="M-34,18 C -42,14 -46,16 -52,10 M34,18 C 42,14 46,16 52,10" stroke="#f6ecc9" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    '</g>',
    '</g>',

    /* la ROSETA lanuda: hojas gruesas plateadas con halo de pubescencia */
    '<g transform="translate(1155,500)">',
    /* copa ERGUIDA y densa (±55°): abierta en abanico leía palmera —
       la Espeletia lleva la roseta en copa, las hojas casi paradas */
    '<g stroke="#e8eedd" stroke-width="4">',
    '<g transform="rotate(-55) scale(.98)"><use href="#chHojaLanuda" fill="#a2af8c" class="hojaLan"/></g>',
    '<g transform="rotate(-41) scale(1.12)"><use href="#chHojaLanuda" fill="#aab692" class="hojaLan h2"/></g>',
    '<g transform="rotate(-27) scale(1.24)"><use href="#chHojaLanuda" fill="#b2bd9a" class="hojaLan h3"/></g>',
    '<g transform="rotate(-13) scale(1.32)"><use href="#chHojaLanuda" fill="#bcc7a4" class="hojaLan"/></g>',
    '<g transform="rotate(0) scale(1.36)"><use href="#chHojaLanuda" fill="#c6d0ae" class="hojaLan h2"/></g>',
    '<g transform="rotate(13) scale(1.32)"><use href="#chHojaLanuda" fill="#bcc7a4" class="hojaLan h3"/></g>',
    '<g transform="rotate(27) scale(1.24)"><use href="#chHojaLanuda" fill="#b2bd9a" class="hojaLan"/></g>',
    '<g transform="rotate(41) scale(1.12)"><use href="#chHojaLanuda" fill="#aab692" class="hojaLan h2"/></g>',
    '<g transform="rotate(55) scale(.98)"><use href="#chHojaLanuda" fill="#a2af8c" class="hojaLan h3"/></g>',
    '</g>',
    /* dos hojas jóvenes cayendo al frente: la roseta tiene volumen */
    '<g stroke="#e8eedd" stroke-width="3.5">',
    '<g transform="rotate(-150) scale(.6)"><use href="#chHojaLanuda" fill="#98a57e"/></g>',
    '<g transform="rotate(152) scale(.62)"><use href="#chHojaLanuda" fill="#9caa82"/></g>',
    '</g>',
    '<ellipse cx="0" cy="-14" rx="34" ry="18" fill="#ccd6b2"/>',
    '<ellipse cx="0" cy="-18" rx="19" ry="10" fill="#e2e9cc"/>',
    '<path d="M-24,-10 c 6,-5 14,-7 22,-6 M4,-24 c 8,-2 16,0 22,4" stroke="#eef2e4" stroke-width="2" fill="none" opacity=".9"/>',
    '</g>',

    /* los CAPÍTULOS: chicos, saliendo ENTRE la roseta en tallos cortos —
       amarillo de acento, no girasoles de mástil */
    '<g fill="none" stroke="#b8a878" stroke-width="4.5" stroke-linecap="round">',
    '<path d="M1122,472 C 1094,458 1072,444 1060,430"/>',
    '<path d="M1188,470 C 1212,456 1228,448 1238,440"/>',
    '<path d="M1152,452 C 1152,432 1154,416 1158,404"/>',
    '</g>',
    '<circle id="destelloFlor" cx="1058" cy="428" r="40" fill="#ffe98a" opacity=".5"/>',
    '<g transform="translate(1058,428) scale(1.05)"><use href="#chCapitulo"/></g>',
    '<g transform="translate(1240,438) scale(.85)"><use href="#chCapitulo"/></g>',
    '<g transform="translate(1158,402) scale(.75)"><use href="#chCapitulo"/></g>',
    '<g fill="#e8cf5a">',
    '<circle class="polen" cx="1050" cy="410" r="4.5"/>',
    '<circle class="polen q2" cx="1074" cy="402" r="3.5"/>',
    '<circle class="polen q3" cx="1040" cy="424" r="3"/>',
    '<circle class="polen q4" cx="1064" cy="416" r="4"/>',
    '</g>',
    '</g>',

    /* la VARA seca donde el chivito se posa (una vara floral vieja) */
    '<g id="chPercha">',
    '<path d="M836 828 C 826 786 812 740 798 700 C 792 682 792 672 796 664" fill="none" stroke="#8a6f4a" stroke-width="7" stroke-linecap="round"/>',
    '<path d="M836 828 C 826 786 812 740 798 700 C 792 682 792 672 796 664" fill="none" stroke="' + T + '" stroke-width="1.6" opacity=".5"/>',
    '<path d="M810 742 c -10 -4 -18 -3 -24 2 M804 712 c 9 -6 17 -7 24 -4" stroke="#8a6f4a" stroke-width="4" fill="none" stroke-linecap="round"/>',
    '<ellipse cx="797" cy="664" rx="7" ry="4" fill="#6e5a3c" stroke="' + T + '" stroke-width="1.4"/>',
    '</g>',

    '</g>', /* /chPaisaje */

    /* ═══ APARATOS DEL NATURALISTA — columna izquierda ═══ */
    '<g id="chPanelIzq" font-family="Georgia,serif" fill="#3c2c14">',
    /* LA BARBA — estructura, no pigmento */
    '<rect x="64" y="210" width="240" height="196" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="216" width="228" height="184" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="242" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA BARBA</text>',
    '<g transform="translate(136,262)">',
    '<path d="M-16,0 C -22,22 -19,48 -2,70 C 13,48 18,24 14,0 C 4,5 -7,5 -16,0 Z" fill="#fdfbf4" stroke="' + T + '" stroke-width="2.4"/>',
    '<path d="M-8,5 C -11,24 -9,44 -1,58 C 6,44 8,24 6,5 C 2,7 -4,7 -8,5 Z" fill="url(#gIris)"/>',
    '<g stroke="#8a5a2a" stroke-width="1.8" fill="none">',
    '<path d="M-44,10 L -24,22 M-44,10 L -38,8 M-44,10 L -42,16"/>',
    '<path d="M-48,44 L -26,46 M-48,44 L -43,40 M-48,44 L -43,49"/>',
    '</g>',
    '</g>',
    '<g transform="translate(242,262)">',
    '<path d="M-10,4 C -12,26 -10,50 -4,66 L 4,66 C 8,50 9,26 8,4 Z" fill="#9a9a92" stroke="#7a6a48" stroke-width="1.8"/>',
    '<path d="M-26,78 L 28,-6" stroke="#7a6a48" stroke-width="2.2" opacity=".8"/>',
    '</g>',
    '<text x="136" y="356" font-size="12" text-anchor="middle" font-style="italic">cuelga y brilla por</text>',
    '<text x="136" y="371" font-size="12" text-anchor="middle" font-style="italic">ESTRUCTURA, según el ángulo</text>',
    '<text x="242" y="356" font-size="12" text-anchor="middle" font-style="italic" fill="#6a583a">plana y angosta:</text>',
    '<text x="242" y="371" font-size="12" text-anchor="middle" font-style="italic" fill="#6a583a">corbata, no barba</text>',
    '<text x="184" y="394" font-size="12" text-anchor="middle">como el azul de la Morpho: color sin pigmento</text>',

    /* LA CRESTA — el dial dibujado: la tesis en la propia lámina */
    '<rect x="64" y="428" width="240" height="180" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="434" width="228" height="168" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="460" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA CRESTA ES EL DIAL</text>',
    '<g stroke="' + T + '" stroke-width="2.2" fill="#57432f">',
    /* reposo: barrida */
    '<g transform="translate(106,540)">',
    '<circle cx="0" cy="10" r="17" fill="#efe3bd"/>',
    '<path d="M-4,-6 C 8,-14 22,-16 34,-12 C 22,-8 8,-4 -2,0 Z"/>',
    '<path d="M-8,-4 C 2,-14 14,-20 26,-20 C 16,-12 6,-6 -4,0 Z" fill="#43331f"/>',
    '</g>',
    /* medio */
    '<g transform="translate(184,540)">',
    '<circle cx="0" cy="10" r="17" fill="#efe3bd"/>',
    '<path d="M-6,-4 C -4,-16 2,-26 12,-32 C 10,-20 6,-10 2,-2 Z"/>',
    '<path d="M2,-4 C 8,-16 18,-26 30,-30 C 22,-18 12,-8 6,0 Z" fill="#43331f"/>',
    '</g>',
    /* actuando: erizada */
    '<g transform="translate(262,540)">',
    '<circle cx="0" cy="10" r="17" fill="#efe3bd"/>',
    '<path d="M-12,-2 C -16,-14 -14,-26 -8,-34 C -4,-22 -2,-10 0,-2 Z"/>',
    '<path d="M-2,-4 C -2,-20 4,-34 14,-42 C 12,-26 8,-12 4,-2 Z" fill="#43331f"/>',
    '<path d="M6,-2 C 12,-14 22,-24 32,-28 C 26,-16 16,-6 10,2 Z"/>',
    '</g>',
    '</g>',
    '<path d="M96 574 A 96 40 0 0 1 272 574" fill="none" stroke="#8a5a2a" stroke-width="2" stroke-dasharray="3 4"/>',
    '<path d="M272 574 l-9 -7 M272 574 l-11 2" stroke="#8a5a2a" stroke-width="2" fill="none"/>',
    '<text x="106" y="590" font-size="11" text-anchor="middle" font-style="italic">reposo</text>',
    '<text x="262" y="590" font-size="11" text-anchor="middle" font-style="italic">actuando</text>',
    '<text x="184" y="590" font-size="11" text-anchor="middle">un parámetro</text>',

    /* EL PICO — la aguja */
    '<rect x="64" y="630" width="240" height="190" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="636" width="228" height="178" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="662" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">EL PICO</text>',
    '<g transform="translate(120,706) rotate(8)">',
    '<path d="M0,-3 C 24,-6 52,-6 74,-1.5 C 76,-.5 76,.5 74,1.5 C 52,4.5 24,4.5 0,3 Z" fill="#33281c" stroke="' + T + '" stroke-width="1.8"/>',
    '<path d="M4,-2 C 26,-4 52,-4 70,-1" stroke="#6a5637" stroke-width="1.2" fill="none"/>',
    '</g>',
    '<text x="150" y="734" font-size="12.5" text-anchor="middle" font-style="italic">recto y fino: aguja</text>',
    '<g transform="translate(244,700)">',
    '<path d="M0,0 C 18,2 32,12 38,28 C 40,34 38,38 34,38" fill="none" stroke="#7a6a48" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M-14,46 L 46,-10" stroke="#7a6a48" stroke-width="2" opacity=".8"/>',
    '</g>',
    '<text x="244" y="760" font-size="12.5" text-anchor="middle" font-style="italic" fill="#6a583a">curvo: otros colibríes</text>',
    '<text x="184" y="784" font-size="12" text-anchor="middle">con esta aguja liba el frailejón</text>',
    '<text x="184" y="800" font-size="12" text-anchor="middle">y teje su nido con la lana de sus hojas</text>',
    '</g>',

    /* ═══ Columna derecha ═══ */
    '<g id="chPanelDer" font-family="Georgia,serif" fill="#3c2c14">',
    /* EL VUELO — plegadas o borrón */
    '<rect x="1376" y="210" width="240" height="196" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="216" width="228" height="184" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="242" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">EL VUELO</text>',
    '<g transform="translate(1444,310)" stroke="' + T + '" stroke-width="2">',
    '<ellipse cx="0" cy="0" rx="17" ry="21" fill="#aaa871"/>',
    '<path d="M-4,-12 C 4,-16 12,-12 14,-2 C 12,10 4,16 -2,16 C 2,4 2,-6 -4,-12 Z" fill="#8f8d58"/>',
    '<circle cx="-2" cy="-26" r="11" fill="#efe3bd"/>',
    '<path d="M8,-28 l14,3" stroke-width="2.4"/>',
    '<path d="M-4,21 l-3,10 M4,21 l3,10" stroke-width="2.6"/>',
    '</g>',
    '<text x="1444" y="360" font-size="12.5" text-anchor="middle" font-style="italic">posado: plegadas</text>',
    '<g transform="translate(1548,310)" stroke="' + T + '" stroke-width="2">',
    '<ellipse cx="0" cy="4" rx="15" ry="19" fill="#aaa871"/>',
    '<circle cx="-2" cy="-20" r="10" fill="#efe3bd"/>',
    '<path d="M7,-22 l13,3" stroke-width="2.2"/>',
    '<g fill="none" stroke="#9a985f">',
    '<path d="M12,-6 C 26,-18 38,-22 48,-20" opacity=".9" stroke-width="3"/>',
    '<path d="M12,-2 C 28,-8 42,-8 52,-2" opacity=".55" stroke-width="3"/>',
    '<path d="M12,2 C 28,4 40,10 48,18" opacity=".3" stroke-width="3"/>',
    '<path d="M-12,-6 C -26,-18 -38,-22 -48,-20" opacity=".9" stroke-width="3"/>',
    '<path d="M-12,-2 C -28,-8 -42,-8 -52,-2" opacity=".55" stroke-width="3"/>',
    '<path d="M-12,2 C -28,4 -40,10 -48,18" opacity=".3" stroke-width="3"/>',
    '</g>',
    '</g>',
    '<text x="1548" y="360" font-size="12.5" text-anchor="middle" font-style="italic">en vuelo: un borrón</text>',
    '<text x="1496" y="382" font-size="12" text-anchor="middle">el aleteo es tan rápido que el ojo</text>',
    '<text x="1496" y="396" font-size="12" text-anchor="middle">solo ve niebla alrededor del cuerpo</text>',

    /* EL PACTO — flor, pájaro, agua */
    '<rect x="1376" y="428" width="240" height="180" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="434" width="228" height="168" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="460" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">EL PACTO</text>',
    '<g transform="translate(1442,516) scale(1.1)"><use href="#chCapitulo"/></g>',
    '<g transform="translate(1516,506) rotate(24)">',
    '<path d="M0,-2 C 16,-4 34,-4 48,-1 C 49,0 49,0 48,1 C 34,3 16,3 0,2 Z" fill="#33281c" stroke="' + T + '" stroke-width="1.4" transform="rotate(180)"/>',
    '</g>',
    '<g fill="#7a99a4" stroke="#5a7a86" stroke-width="1.2">',
    '<path d="M1556,530 c -5,8 -5,14 0,18 c 5,-4 5,-10 0,-18 Z"/>',
    '<path d="M1572,544 c -4,7 -4,12 0,15 c 4,-3 4,-8 0,-15 Z"/>',
    '<path d="M1544,548 c -4,7 -4,12 0,15 c 4,-3 4,-8 0,-15 Z"/>',
    '</g>',
    '<text x="1496" y="566" font-size="12.5" text-anchor="middle" font-style="italic">él liba y el frailejón florece;</text>',
    '<text x="1496" y="582" font-size="12.5" text-anchor="middle" font-style="italic">el frailejón cosecha el agua del páramo</text>',
    '<text x="1496" y="598" font-size="12" text-anchor="middle">cuidar al uno es cuidar al otro — y al agua</text>',

    /* LA ALTURA — el piso del frío */
    '<rect x="1376" y="620" width="240" height="200" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="626" width="228" height="188" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="652" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA ALTURA</text>',
    '<g transform="translate(1496,724)">',
    '<path d="M-92,44 L -52,-8 L -30,10 L 0,-40 L 26,-14 L 52,-34 L 92,44 Z" fill="url(#chDiag)" stroke="' + T + '" stroke-width="1.8"/>',
    '<path d="M-92,10 L 92,10" stroke="#8a5a2a" stroke-width="1.6" stroke-dasharray="4 4"/>',
    '<path d="M-92,-26 L 92,-26" stroke="#8a5a2a" stroke-width="1.6" stroke-dasharray="4 4"/>',
    '<text x="72" y="6" font-size="10.5" font-style="italic" fill="#6a583a" text-anchor="end">3.000 m</text>',
    '<text x="72" y="-30" font-size="10.5" font-style="italic" fill="#6a583a" text-anchor="end">4.600 m</text>',
    '</g>',
    '<text x="1496" y="786" font-size="12.5" text-anchor="middle" font-style="italic">vive entre 3.000 y 4.600 metros:</text>',
    '<text x="1496" y="802" font-size="12.5" text-anchor="middle" font-style="italic">el piso del frío, el del frailejón</text>',
    '</g>',

    /* ═══ EL PIE DE LÁMINA ═══ */
    '<g id="chPie" font-family="Georgia,serif">',
    '<path d="M330 836 h1020 v92 h-1020 Z" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<path d="M330 836 l-18 23 18 23 -18 23 18 23 M1350 836 l18 23 -18 23 18 23 -18 23" fill="none" stroke="#6b5a3c" stroke-width="2"/>',
    '<text x="840" y="862" font-size="15.5" text-anchor="middle" fill="#3c2c14"><tspan font-style="italic" font-weight="bold">Oxypogon stuebelii</tspan>, el chivito del páramo, es un colibrí nectarívoro especializado: polinizador de los frailejones y las flores del páramo.</text>',
    '<text x="840" y="884" font-size="15.5" text-anchor="middle" fill="#3c2c14">Su barba iridiscente y su cresta lo distinguen — y su ánimo entero corre por un solo dial: la cresta que se eriza, la postura que se yergue.</text>',
    '<text x="840" y="912" font-size="13.5" text-anchor="middle" fill="#5a4826" font-style="italic">UICN: Vulnerable. A la manera de una visión de Humboldt, con su expresión rubber-hose — sin que parezca copia.</text>',
    '</g>',

    /* ═══ EL PERSONAJE: un dibujo, un dial ═══ */
    chivito,

    '<rect x="0" y="0" width="1680" height="960" fill="url(#chVineta)" pointer-events="none"/>',
    '</g>',
  ].join('\n');

  window.GUIA_CHIVITO_LAMINA = {
    wrap: 'chivitoLaminaWrap',
    lienzo: '0 0 1680 960',   /* la lámina completa; marco.js recorta a #chivito con encuadrar() */
    css: css,
    defs: defs,
    svg: svg,
  };
})();
