/* ── guia-jaguar-lamina.js — EL JAGUAR DEL compAI: un RANGO, no un estilo ──
 *
 * Doctrina del operador (2026-08-07, referencias JAGUAR-01 y JAGUAR-02):
 *
 *   «Esa foto es literalmente El Jaguar tal como se ve en la realidad pero
 *    dibujado. Quiero que ASÍ se vea en el valle, que DÉ RESPETO y que
 *    realmente PAREZCA VERDADERO. […] Solo cuando actúa es cuando tiene la
 *    expresión de la imagen de referencia.»
 *
 * Dos extremos del MISMO animal, sobre la misma lámina de historia natural:
 *
 *   · #jagReal — el estado BASE y el que más se ve: cuadrúpedo, anatomía del
 *     propio bestiario (cráneo ancho de maseteros, cruz marcada, pecho hondo,
 *     cintura recogida, trasera en zigzag —rodilla adelante, corvejón atrás—,
 *     digitígrado), rosetas reales —anillo ROTO de borrones CON puntos
 *     adentro—, barras en el pecho, mirada ambarina de frente. IMPONE.
 *   · #jagActor — la «Panthera cupheadiana»: bípedo, pie-eyes, sonrisa con
 *     todos los dientes, guantes blancos de cuatro dedos y su oficio de
 *     RASTREADOR (la lupa, la huella fresca). Aparece SOLO cuando actúa.
 *
 * Los une lo que manda el operador: mismas rosetas, mismo pelaje, mismo
 * contorno entintado, misma paleta ámbar. Y LA TRANSICIÓN ES CARÁCTER, no un
 * corte: crossfade con squash-and-stretch en las dos direcciones.
 *
 * TODO dato de la lámina sale del bestiario del repo
 * (`juegos/bestiario/criaturas/jaguar.js`), ya curado. Nada inventado.
 *
 * CONTRATO: misma forma que toda entrada de GUIAS_ARTE — {wrap, css, defs,
 * svg} — poses declaradas en el CSS vía [data-estado="…"] (lo que marco.js
 * lee con posesDelRig). ⚠️ `respira` va PRIMERA en el CSS a propósito:
 * marco.js arranca en repertorio[0], y el estado con que el jaguar recibe al
 * usuario tiene que ser EL ANIMAL, nunca el actor.
 *
 * REPARTO DEL DIAL (9 estados):
 *   reposo REAL ...... respira · mirausted · escucha · rastrea · estira · acicala
 *   dial del medio ... guino (cuerpo real; la cara hace el gesto cuphead puntual)
 *   ACTUACIÓN ........ examina (la lupa) · hablar (narrativa, como en el elenco)
 *
 * NO PISA el arte vivo: se registra como `window.GUIA_JAGUAR_LAMINA`; adoptarlo
 * es `window.GUIAS_ARTE.jaguar = window.GUIA_JAGUAR_LAMINA` tras aprobación.
 */
(function () {
  'use strict';

  /* ════════════════════════ LA TINTA (css del rig) ═══════════════════════ */
  var css = [
    '#jaguar g,#jaguar path,#jaguar ellipse,#jaguar circle,#jaguar rect{transform-box:fill-box}',

    /* ── respira: PRIMERA en el archivo — es el estado con que el jaguar
          recibe al usuario (repertorio[0] de marco.js): el animal, digno ── */
    ':host([data-estado="respira"]) #pechoReal{animation:jrPechoHondo 3.6s ease-in-out infinite}',
    '@keyframes jrPechoHondo{0%,100%{transform:scale(1)}50%{transform:scale(1.012,1.02)}}',

    /* ═══ VIDA DE BASE DEL ANIMAL (corre en todos los estados) ═══ */
    '#cuerpoReal{transform-origin:50% 100%;animation:jrRespira 3.6s ease-in-out infinite}',
    '#cabezaReal{transform-origin:52% 86%;animation:jrCabezaViva 8.4s ease-in-out infinite}',
    '#colaReal{transform-origin:6% 40%;animation:jrColaBase 5.8s ease-in-out infinite}',
    '#colaRealPunta{transform-origin:80% 20%;animation:jrColaPunta 2.9s ease-in-out infinite}',
    '#orejaRealIzq{transform-origin:50% 92%;animation:jrOrejaTic 7.3s linear infinite}',
    '#orejaRealDer{transform-origin:50% 92%;animation:jrOrejaTic 9.1s linear infinite reverse}',
    '#parpadosReales{transform-origin:50% 4%;transform:scaleY(.06);animation:jrParpadeo 5.2s linear infinite}',
    '#pataDelanteraCerca{transform-origin:50% 10%}',
    '@keyframes jrRespira{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.013) scaleX(1.004)}}',
    '@keyframes jrCabezaViva{0%,100%{transform:rotate(0deg)}34%{transform:rotate(-1.2deg) translateY(1px)}68%{transform:rotate(1deg)}}',
    '@keyframes jrColaBase{0%,100%{transform:rotate(0deg)}50%{transform:rotate(3.5deg)}}',
    '@keyframes jrColaPunta{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(12deg)}}',
    '@keyframes jrOrejaTic{0%,87%,100%{transform:rotate(0deg)}90%,94%{transform:rotate(-9deg)}}',
    '@keyframes jrParpadeo{0%,92%,100%{transform:scaleY(.06)}95%,97.5%{transform:scaleY(1)}}',

    /* ── mirausted: alza la cabeza y lo mira a USTED, ámbar, de frente ── */
    ':host([data-estado="mirausted"]) #cabezaReal{animation:jrMiraUsted 4.4s ease-in-out infinite}',
    ':host([data-estado="mirausted"]) #orejaRealIzq{animation:jrOrejasAlFrenteI 4.4s ease-in-out infinite}',
    ':host([data-estado="mirausted"]) #orejaRealDer{animation:jrOrejasAlFrenteD 4.4s ease-in-out infinite}',
    ':host([data-estado="mirausted"]) #pupilasReales{animation:jrPupilasSuben 4.4s ease-in-out infinite}',
    '@keyframes jrMiraUsted{0%,100%{transform:rotate(0deg)}20%,74%{transform:rotate(-2.2deg) translateY(-8px)}}',
    '@keyframes jrOrejasAlFrenteI{0%,100%{transform:rotate(0deg)}20%,74%{transform:rotate(7deg)}}',
    '@keyframes jrOrejasAlFrenteD{0%,100%{transform:rotate(0deg)}20%,74%{transform:rotate(-7deg)}}',
    '@keyframes jrPupilasSuben{0%,100%{transform:translateY(0)}20%,74%{transform:translateY(-2.5px)}}',

    /* ── escucha: las orejas barren el monte; el cuerpo, quieto — sigilo ── */
    ':host([data-estado="escucha"]) #orejaRealIzq{animation:jrRadarI 3.4s ease-in-out infinite}',
    ':host([data-estado="escucha"]) #orejaRealDer{animation:jrRadarD 3.4s ease-in-out infinite}',
    ':host([data-estado="escucha"]) #cabezaReal{animation:jrLadea 3.4s ease-in-out infinite}',
    ':host([data-estado="escucha"]) #colaRealPunta{animation:jrColaTensa 3.4s ease-in-out infinite}',
    '@keyframes jrRadarI{0%,100%{transform:rotate(0deg)}28%{transform:rotate(-16deg)}60%{transform:rotate(9deg)}}',
    '@keyframes jrRadarD{0%,100%{transform:rotate(0deg)}28%{transform:rotate(12deg)}60%{transform:rotate(-14deg)}}',
    '@keyframes jrLadea{0%,100%{transform:rotate(0deg)}28%,60%{transform:rotate(2.6deg) translateY(-3px)}}',
    '@keyframes jrColaTensa{0%,45%,100%{transform:rotate(0deg)}55%,60%{transform:rotate(16deg)}}',

    /* ── rastrea: el hocico baja al rastro, la nariz late, la cola sube ── */
    ':host([data-estado="rastrea"]) #cabezaReal{animation:jrHocicoAlRastro 4.8s ease-in-out infinite}',
    ':host([data-estado="rastrea"]) #cuerpoReal{animation:jrPesoAdelante 4.8s ease-in-out infinite}',
    ':host([data-estado="rastrea"]) #narizReal{animation:jrOlfatea 1.1s ease-in-out infinite}',
    ':host([data-estado="rastrea"]) #colaReal{animation:jrColaContrapeso 4.8s ease-in-out infinite}',
    '@keyframes jrHocicoAlRastro{0%,100%{transform:rotate(0deg)}30%,78%{transform:rotate(13deg) translate(-10px,52px)}}',
    '@keyframes jrPesoAdelante{0%,100%{transform:none}30%,78%{transform:rotate(1.4deg) translateY(3px)}}',
    '@keyframes jrOlfatea{0%,100%{transform:scale(1)}50%{transform:scale(1.25,.85)}}',
    '@keyframes jrColaContrapeso{0%,100%{transform:rotate(0deg)}30%,78%{transform:rotate(-8deg)}}',

    /* ── estira: el estirón de gato — pecho a tierra, grupa arriba ── */
    ':host([data-estado="estira"]) #cuerpoReal{animation:jrEstiron 5s ease-in-out infinite}',
    ':host([data-estado="estira"]) #cabezaReal{animation:jrCabezaEstira 5s ease-in-out infinite}',
    ':host([data-estado="estira"]) #colaReal{animation:jrColaEstira 5s ease-in-out infinite}',
    ':host([data-estado="estira"]) #parpadosReales{animation:jrOjosGusto 5s ease-in-out infinite}',
    '@keyframes jrEstiron{0%,100%{transform:none}38%,72%{transform:rotate(-2.6deg) translate(-4px,4px) scaleX(1.04)}}',
    '@keyframes jrCabezaEstira{0%,100%{transform:rotate(0deg)}38%,72%{transform:rotate(7deg) translate(-6px,18px)}}',
    '@keyframes jrColaEstira{0%,100%{transform:rotate(0deg)}38%,72%{transform:rotate(-12deg)}}',
    '@keyframes jrOjosGusto{0%,20%,88%,100%{transform:scaleY(.06)}38%,72%{transform:scaleY(1)}}',

    /* ── acicala: alza la zarpa, la cabeza baja a la pasada, ojos de gusto ── */
    ':host([data-estado="acicala"]) #pataDelanteraCerca{animation:jrPataAseo 2.8s ease-in-out infinite}',
    ':host([data-estado="acicala"]) #cabezaReal{animation:jrCabezaAseo 2.8s ease-in-out infinite}',
    ':host([data-estado="acicala"]) #parpadosReales{animation:jrOjosGusto28 2.8s ease-in-out infinite}',
    '@keyframes jrPataAseo{0%,100%{transform:rotate(0deg)}40%,80%{transform:rotate(-34deg) translate(8px,-6px)}}',
    '@keyframes jrCabezaAseo{0%,100%{transform:rotate(0deg)}42%{transform:rotate(10deg) translate(-8px,26px)}62%{transform:rotate(8deg) translate(-6px,20px)}80%{transform:rotate(11deg) translate(-8px,26px)}}',
    '@keyframes jrOjosGusto28{0%,15%,92%,100%{transform:scaleY(.06)}40%,80%{transform:scaleY(1)}}',

    /* ── guino: EL DIAL DEL MEDIO — el cuerpo sigue siendo el animal; la
          CARA hace el gesto cuphead un instante y se borra ── */
    '#caraGuino{opacity:0}',
    ':host([data-estado="guino"]) #caraGuino{animation:jrGuinoFlash 3s ease-in-out infinite}',
    ':host([data-estado="guino"]) #caraSeriaReal{animation:jrCaraSeVa 3s ease-in-out infinite}',
    ':host([data-estado="guino"]) #cabezaReal{animation:jrCabezaGuino 3s ease-in-out infinite}',
    ':host([data-estado="guino"]) #orejaRealDer{animation:jrOrejaGuino 3s ease-in-out infinite}',
    '@keyframes jrGuinoFlash{0%,18%,82%,100%{opacity:0}30%,70%{opacity:1}}',
    '@keyframes jrCaraSeVa{0%,18%,82%,100%{opacity:1}30%,70%{opacity:0}}',
    '@keyframes jrCabezaGuino{0%,18%,82%,100%{transform:rotate(0deg)}30%,70%{transform:rotate(-3.5deg) translateY(-3px)}}',
    '@keyframes jrOrejaGuino{0%,18%,82%,100%{transform:rotate(0deg)}30%,70%{transform:rotate(-12deg)}}',

    /* ═══ EL DIAL: quién está en escena ═══
       Base: el ANIMAL. El actor espera invisible; en examina/hablar SUBE con
       rebote de goma y el animal se recoge. Transitions = fluido en las DOS
       direcciones: el regreso también es carácter, no un corte. */
    '#jagActor{opacity:0;transform-origin:50% 100%;transform:translateY(46px) scale(.66);',
    ' transition:opacity .34s ease,transform .55s cubic-bezier(.34,1.66,.54,1);pointer-events:none}',
    '#jagReal{opacity:1;transform-origin:50% 100%;',
    ' transition:opacity .3s ease .14s,transform .42s cubic-bezier(.36,1.4,.6,1) .1s}',
    ':host([data-estado="examina"]) #jagActor,:host([data-estado="hablar"]) #jagActor{opacity:1;transform:translateY(0) scale(1);transition:opacity .3s ease .1s,transform .55s cubic-bezier(.34,1.66,.54,1) .08s}',
    ':host([data-estado="examina"]) #jagReal,:host([data-estado="hablar"]) #jagReal{opacity:0;transform:translateY(14px) scale(1,.9);transition:opacity .24s ease,transform .3s ease}',

    /* ═══ EL ACTOR (vida propia mientras está en escena) ═══ */
    '#colaActor{transform-origin:6% 85%;animation:jaColaActor 3.2s ease-in-out infinite}',
    '#cabezaActor{transform-origin:50% 90%;animation:jaCabezaActor 4.6s ease-in-out infinite}',
    '#brazoLupa{transform-origin:12% 15%}',
    '#brazoLibre{transform-origin:85% 10%}',
    '@keyframes jaColaActor{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(9deg)}}',
    '@keyframes jaCabezaActor{0%,100%{transform:rotate(0deg)}50%{transform:rotate(2deg) translateY(-2px)}}',

    /* ── examina: la lupa VIAJA al ojo (translate corto, nada de aspas), el
          ojo se agranda tras el vidrio, la ceja del perito ── */
    ':host([data-estado="examina"]) #brazoLupa{animation:jaLupaAlOjo 4.4s ease-in-out infinite}',
    ':host([data-estado="examina"]) #cabezaActor{animation:jaCabezaPerito 4.4s ease-in-out infinite}',
    ':host([data-estado="examina"]) #pupilaActorDer{animation:jaOjoTrasLupa 4.4s ease-in-out infinite}',
    ':host([data-estado="examina"]) #ojoActorDer{animation:jaGloboTrasLupa 4.4s ease-in-out infinite}',
    ':host([data-estado="examina"]) #cejaActorDer{animation:jaCejaPerito 4.4s ease-in-out infinite}',
    ':host([data-estado="examina"]) #brazoLibre{animation:jaSenalaHuella 4.4s ease-in-out infinite}',
    '@keyframes jaLupaAlOjo{0%,100%{transform:translate(0,0)}28%,80%{transform:translate(-50px,-16px) rotate(-6deg)}}',
    '@keyframes jaCabezaPerito{0%,100%{transform:rotate(0deg)}28%,80%{transform:rotate(3deg) translate(4px,2px)}}',
    '@keyframes jaOjoTrasLupa{0%,100%{transform:scale(1)}28%,80%{transform:scale(1.7)}}',
    '@keyframes jaGloboTrasLupa{0%,100%{transform:scale(1)}28%,80%{transform:scale(1.16)}}',
    '@keyframes jaCejaPerito{0%,100%{transform:translateY(0)}28%,80%{transform:translateY(-6px) rotate(6deg)}}',
    '@keyframes jaSenalaHuella{0%,100%{transform:rotate(0deg)}28%,80%{transform:rotate(18deg) translate(-2px,6px)}}',

    /* ── hablar (narrativa): chachara de goma, la manopla lleva el cuento ── */
    '#bocaHablaActor{opacity:0}',
    ':host([data-estado="hablar"]) #bocaActor{opacity:0}',
    ':host([data-estado="hablar"]) #bocaHablaActor{opacity:1;transform-origin:50% 15%;animation:jaChachara .44s ease-in-out infinite alternate}',
    ':host([data-estado="hablar"]) #brazoLibre{animation:jaManoCuenta 1.8s ease-in-out infinite}',
    ':host([data-estado="hablar"]) #brazoLupa{animation:jaLupaAlPecho 1.8s ease-in-out infinite}',
    ':host([data-estado="hablar"]) #cejaActorIzq{animation:jaCejaCuento 1.8s ease-in-out infinite}',
    ':host([data-estado="hablar"]) #cabezaActor{animation:jaCabezaCuento 1.8s ease-in-out infinite}',
    '@keyframes jaChachara{0%{transform:scaleY(.4)}100%{transform:scaleY(1.06)}}',
    '@keyframes jaManoCuenta{0%,100%{transform:rotate(0deg)}30%{transform:rotate(-28deg) translateY(-8px)}64%{transform:rotate(-10deg)}}',
    '@keyframes jaLupaAlPecho{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-6deg) translateY(3px)}}',
    '@keyframes jaCejaCuento{0%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}',
    '@keyframes jaCabezaCuento{0%,100%{transform:rotate(0deg)}40%{transform:rotate(-2.2deg)}72%{transform:rotate(1.6deg)}}',

    '@media (prefers-reduced-motion:reduce){#jaguar *{animation:none!important;transition:none!important}}',
  ].join('\n');

  /* ═══════════════════════════ LOS DEFS ═══════════════════════════ */
  var defs = [
    '<radialGradient id="jlPapel" cx="50%" cy="42%" r="75%">',
    '<stop offset="0%" stop-color="#f0e4c6"/><stop offset="62%" stop-color="#e9dab6"/>',
    '<stop offset="88%" stop-color="#ddc99e"/><stop offset="100%" stop-color="#cdb488"/>',
    '</radialGradient>',
    '<linearGradient id="jlCielo" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#ddd2ae" stop-opacity=".9"/><stop offset="100%" stop-color="#e9dab6" stop-opacity="0"/>',
    '</linearGradient>',
    '<pattern id="jlRaya" width="5" height="5" patternUnits="userSpaceOnUse">',
    '<path d="M0 4.5H5" stroke="#6b5a3c" stroke-width=".65" opacity=".55"/></pattern>',
    '<pattern id="jlDiag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-24)">',
    '<path d="M0 5H6" stroke="#5d5744" stroke-width=".7" opacity=".5"/></pattern>',
    '<pattern id="jlDiagV" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">',
    '<path d="M0 6H7" stroke="#4f5d42" stroke-width=".75" opacity=".45"/></pattern>',
    '<pattern id="jlPunto" width="7" height="7" patternUnits="userSpaceOnUse">',
    '<circle cx="2" cy="2" r=".65" fill="#6b5a3c" opacity=".4"/>',
    '<circle cx="5.5" cy="5.5" r=".55" fill="#6b5a3c" opacity=".33"/></pattern>',
    '<linearGradient id="jlOro" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#f6b148"/><stop offset="70%" stop-color="#eda03a"/>',
    '<stop offset="100%" stop-color="#dd8a2e"/></linearGradient>',
    '<linearGradient id="jlOroHondo" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0%" stop-color="#dd8f30"/><stop offset="100%" stop-color="#c07424"/></linearGradient>',
    '<radialGradient id="jlLente" cx="38%" cy="34%" r="72%">',
    '<stop offset="0%" stop-color="#f4fbff" stop-opacity=".85"/>',
    '<stop offset="55%" stop-color="#cfe6ea" stop-opacity=".5"/>',
    '<stop offset="100%" stop-color="#9dbdc4" stop-opacity=".65"/></radialGradient>',
    '<radialGradient id="jlAmbar" cx="50%" cy="42%" r="60%">',
    '<stop offset="0%" stop-color="#f2cf6a"/><stop offset="55%" stop-color="#d9a63c"/>',
    '<stop offset="100%" stop-color="#a56f22"/></radialGradient>',
    '<radialGradient id="jlVineta" cx="50%" cy="50%" r="72%">',
    '<stop offset="72%" stop-color="#3a2c14" stop-opacity="0"/>',
    '<stop offset="100%" stop-color="#3a2c14" stop-opacity=".22"/></radialGradient>',
  ].join('');

  /* ═════════════════════ EL DIBUJO (svg del rig) ═════════════════════ */
  var T = '#241408';

  /* Una ROSETA de verdad: anillo ROTO hecho de borrones —tres a cinco arcos
     gruesos con sus vanos— y uno o dos puntos ADENTRO. Es exactamente lo que
     separa a Panthera onca del leopardo; por eso se GENERA, no se pinta a
     ojo (misma razón que sembrarRosetas en el bestiario 3D). */
  function roseta(x, y, r, rot, nPuntos) {
    var n = r > 14 ? 5 : 4;
    var w = Math.max(3.4, r * 0.46);
    var s = ['<g transform="translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ')" fill="none" stroke="' + T + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round">'];
    for (var i = 0; i < n; i++) {
      var a0 = (i * 360 / n + (i * 29 % 14)) * Math.PI / 180;
      var a1 = a0 + (360 / n - 26 - (i * 17 % 12)) * Math.PI / 180;
      var x0 = (Math.cos(a0) * r).toFixed(1), y0 = (Math.sin(a0) * r).toFixed(1);
      var x1 = (Math.cos(a1) * r).toFixed(1), y1 = (Math.sin(a1) * r).toFixed(1);
      s.push('<path d="M' + x0 + ' ' + y0 + ' A ' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1 + '"/>');
    }
    s.push('<circle cx="0" cy="0" r="' + Math.max(1.9, r * 0.2).toFixed(1) + '" fill="' + T + '" stroke="none"/>');
    if (nPuntos > 1) s.push('<circle cx="' + (r * 0.36).toFixed(1) + '" cy="' + (r * 0.3).toFixed(1) + '" r="' + Math.max(1.4, r * 0.14).toFixed(1) + '" fill="' + T + '" stroke="none"/>');
    s.push('</g>');
    return s.join('');
  }
  /* Mancha sólida (patas, cabeza, línea dorsal): elipse entintada rotada.
     ⚠️ translate+rotate SIN centro: con transform-box:fill-box activo, un
     rotate(a x y) de atributo se reinterpreta contra la caja del elemento y
     la mancha sale volando (medido en captura: borrones por todo el cielo). */
  function mancha(x, y, rx, ry, rot) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ')">' +
      '<ellipse cx="0" cy="0" rx="' + rx + '" ry="' + ry + '" fill="' + T + '"/></g>';
  }

  /* ── EL ANIMAL REAL — cuadrúpedo 3/4, cabeza vuelta al frente ── */
  var jagReal = [
    '<g id="jagReal">',

    /* LA COLA: más de medio cuerpo; borrones que hacia la punta se cierran
       en anillos, y la punta negra (como la lleva el animal) */
    '<g id="colaReal">',
    '<path d="M1026 566 C 1092 566 1136 528 1142 478 C 1146 442 1132 414 1108 402" fill="none" stroke="' + T + '" stroke-width="24" stroke-linecap="round"/>',
    '<path d="M1026 566 C 1092 566 1136 528 1142 478 C 1146 442 1132 414 1108 402" fill="none" stroke="url(#jlOro)" stroke-width="15.5" stroke-linecap="round"/>',
    mancha(1064, 560, 6, 4.5, 20), mancha(1104, 540, 6, 4.5, -40), mancha(1130, 506, 6, 4.5, -70),
    '<path d="M1138 468 l14 -2 M1134 444 l13 -6" stroke="' + T + '" stroke-width="7" stroke-linecap="round"/>',
    '<g id="colaRealPunta">',
    '<path d="M1108 402 C 1088 390 1062 392 1050 410" fill="none" stroke="' + T + '" stroke-width="21" stroke-linecap="round"/>',
    '<path d="M1108 402 C 1088 390 1062 392 1050 410" fill="none" stroke="url(#jlOro)" stroke-width="13" stroke-linecap="round"/>',
    '<path d="M1104 390 l0 22 M1082 384 l-2 24" stroke="' + T + '" stroke-width="6.5" stroke-linecap="round"/>',
    '<path d="M1056 400 C 1048 402 1042 408 1042 416 C 1046 422 1054 424 1060 420 Z" fill="' + T + '"/>',
    '</g>',
    '</g>',

    /* PATAS DEL LADO LEJOS (tono más hondo, detrás del cuerpo) */
    '<g id="patasLejosReal" fill="url(#jlOroHondo)" stroke="' + T + '" stroke-width="4.6">',
    '<path d="M756 600 C 748 646 746 696 752 734 L 788 734 C 784 696 786 648 794 606 Z"/>',
    '<path d="M744 730 h50 a6 8 0 0 1 6 10 l-2 6 h-58 l-2 -6 a6 8 0 0 1 6 -10 Z"/>',
    '<path d="M912 618 C 902 660 900 700 906 732 L 940 732 C 936 700 940 660 948 624 Z"/>',
    '<path d="M898 728 h50 a6 8 0 0 1 6 10 l-2 6 h-58 l-2 -6 a6 8 0 0 1 6 -10 Z"/>',
    '</g>',

    /* EL CUERPO: la silueta DELATA el esqueleto — cruz, dorso que se asienta,
       pelvis que vuelve a subir, pecho hondo, cintura recogida */
    '<g id="cuerpoReal">',
    '<path d="M662 528 C 662 500 682 480 714 474 C 770 464 830 466 890 470 C 940 476 976 472 1006 478 C 1024 484 1038 520 1034 574 C 1046 606 1040 640 1014 660 C 996 674 972 678 950 670 C 932 682 906 686 884 678 C 848 690 806 686 772 668 C 734 652 700 620 684 582 C 672 556 662 544 662 528 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="6.5"/>',
    /* la línea del esqueleto, a tinta suave: cruz → dorso → pelvis */
    '<path d="M760 480 C 810 472 862 474 908 480 M940 480 C 966 476 992 480 1010 492" fill="none" stroke="' + T + '" stroke-width="2.4" opacity=".45"/>',
    /* cintura recogida: trama de sombra bajo la panza */
    '<path d="M840 676 C 872 682 900 680 922 670 C 906 686 874 692 848 686 Z" fill="url(#jlDiag)" opacity=".7"/>',
    /* sombra de grabado: panza y bajo-grupa a trama, como en la lámina */
    '<path d="M786 656 C 820 672 862 678 898 672 C 862 684 818 682 792 668 Z" fill="url(#jlDiag)" opacity=".55"/>',
    '<path d="M948 636 C 976 656 1006 660 1026 648 C 1014 668 982 676 958 666 C 948 660 944 648 948 636 Z" fill="url(#jlDiag)" opacity=".5"/>',

    /* EL PECHO hondo, crema, con sus BARRAS reales (borrones llenos) */
    '<g id="pechoReal">',
    '<path d="M714 534 C 700 556 696 590 706 618 C 714 642 732 658 754 662 C 770 664 782 654 784 638 C 786 616 780 590 768 568 C 756 546 734 528 714 534 Z" fill="#f2e6ca" stroke="' + T + '" stroke-width="5"/>',
    mancha(724, 570, 13, 5.5, 16), mancha(730, 598, 14, 6, 10), mancha(736, 624, 12, 5, 6),
    '<path d="M706 556 l-9 3 M702 584 l-10 1 M706 612 l-9 4 M718 640 l-7 6" stroke="' + T + '" stroke-width="1.7" opacity=".6" fill="none"/>',
    '</g>',
    /* panza crema con borrones llenos (el jaguar los lleva llenos abajo) */
    '<path d="M782 664 C 812 678 852 682 886 674 C 872 660 844 652 816 652 C 802 652 790 656 782 664 Z" fill="#f2e6ca" stroke="' + T + '" stroke-width="4"/>',
    mancha(822, 664, 6, 4, 0), mancha(852, 668, 6.5, 4, 0), mancha(878, 666, 5.5, 3.6, 0),

    /* ROSETAS: tres filas en el flanco, generadas — anillo roto con núcleo */
    roseta(806, 508, 13, 8, 1), roseta(856, 500, 15, -20, 2), roseta(908, 504, 14, 30, 1), roseta(958, 502, 13, -12, 2),
    roseta(790, 556, 15, 40, 2), roseta(842, 552, 17, -8, 2), roseta(896, 556, 16, 18, 1), roseta(948, 552, 15, -30, 2), roseta(996, 540, 12, 10, 1),
    roseta(812, 606, 14, -16, 1), roseta(864, 610, 15, 24, 2), roseta(916, 612, 13, -40, 1),
    roseta(1000, 590, 13, 50, 1), roseta(972, 634, 12, -10, 1),
    /* la línea dorsal de borrones LLENOS que lleva el lomo */
    mancha(788, 480, 9, 4, -6), mancha(836, 474, 10, 4.5, -2), mancha(884, 474, 10, 4.5, 3), mancha(930, 478, 9, 4, 6), mancha(972, 484, 8, 4, 12),
    /* pelo: trazos cortos que siguen el contorno */
    '<g stroke="' + T + '" stroke-width="1.7" opacity=".55" fill="none">',
    '<path d="M770 668 l-4 9 M800 678 l-2 9 M836 684 l0 10 M872 682 l2 9 M906 678 l3 9"/>',
    '<path d="M1030 540 l10 -1 M1036 570 l10 2 M1030 608 l9 4"/>',
    '<path d="M764 476 l-2 -9 M812 470 l0 -9 M862 470 l0 -9 M912 474 l2 -9"/>',
    '</g>',
    '</g>',

    /* PATA DELANTERA CERCA: columna con codo, muñeca y zarpa digitígrada */
    '<g id="pataDelanteraCerca">',
    '<path d="M694 560 C 680 616 676 688 686 748 C 688 760 696 766 708 766 L 726 766 C 736 760 740 748 738 734 C 730 684 732 620 742 570 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    /* el OLÉCRANON: la punta del codo mira hacia atrás */
    '<path d="M736 590 C 746 592 752 600 750 610 C 744 612 736 608 732 600 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="4"/>',
    '<path d="M680 758 h58 a7 9 0 0 1 7 11 l-3 8 h-66 l-3 -8 a7 9 0 0 1 7 -11 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M698 764 l0 11 M716 764 l0 12" stroke="' + T + '" stroke-width="3" opacity=".85"/>',
    mancha(704, 618, 4.5, 3.4, 20), mancha(718, 656, 4, 3, -14), mancha(700, 694, 4, 3, 8), mancha(722, 722, 3.6, 2.8, 0),
    '</g>',

    /* PATA TRASERA CERCA: muslo ancho → rodilla ADELANTE → corvejón ATRÁS →
       caña al piso. El zigzag del bestiario, en 2D */
    '<g id="pataTraseraCerca">',
    '<path d="M934 560 C 986 556 1022 590 1022 636 C 1022 664 1008 684 986 692 C 998 712 1000 736 992 754 C 990 762 982 766 972 766 L 954 766 C 944 762 940 752 942 740 C 946 718 942 700 930 688 C 912 672 904 646 910 620 C 914 594 922 572 934 560 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    /* el CALCÁNEO: el talón que apunta atrás y arriba */
    '<path d="M994 688 C 1006 686 1014 692 1014 702 C 1008 708 998 706 992 700 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="4"/>',
    '<path d="M944 758 h54 a7 9 0 0 1 7 11 l-3 8 h-62 l-3 -8 a7 9 0 0 1 7 -11 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M960 764 l0 11 M978 764 l0 12" stroke="' + T + '" stroke-width="3" opacity=".85"/>',
    roseta(972, 610, 13, 30, 1),
    mancha(950, 660, 4.5, 3.4, -10), mancha(978, 700, 4, 3, 16), mancha(962, 730, 3.6, 2.8, 0),
    '</g>',

    /* el hombro que asoma tras la cabeza lleva sus motas */
    mancha(704, 516, 5, 3.6, 20), mancha(742, 498, 4.5, 3.2, -8),

    /* LA CABEZA AL FRENTE — cráneo ancho, maseteros, mirada ámbar */
    '<g id="cabezaReal">',
    /* wrapper de escala INTERIOR: el grupo animado no puede llevar transform
       de atributo (la animación CSS lo pisaría); el hijo estático sí. La
       cabeza queda al 88% — proporción de adulto, no de cachorro. */
    '<g transform="translate(79.2,54.6) scale(.88)">',
    /* orejas chicas y REDONDAS en las esquinas del cráneo */
    '<g id="orejaRealIzq">',
    '<circle cx="600" cy="390" r="26" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    '<ellipse cx="601" cy="394" rx="14" ry="12" fill="#3a2417"/>',
    '<path d="M592 400 l-3 7 M600 402 l0 8 M609 400 l3 7" stroke="' + T + '" stroke-width="1.8" opacity=".65"/>',
    '</g>',
    '<g id="orejaRealDer">',
    '<circle cx="720" cy="390" r="26" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    '<ellipse cx="719" cy="394" rx="14" ry="12" fill="#3a2417"/>',
    '<path d="M711 400 l-3 7 M719 402 l0 8 M728 400 l3 7" stroke="' + T + '" stroke-width="1.8" opacity=".65"/>',
    '</g>',
    /* el CRÁNEO: caja ANCHA y de frente plana + arcos cigomáticos + carrillos */
    '<path d="M588 456 C 584 416 606 388 644 380 C 654 378 666 378 676 380 C 714 388 736 416 732 456 C 730 476 724 490 714 502 L 720 508 C 712 528 694 540 672 544 L 648 544 C 626 540 608 528 600 508 L 606 502 C 596 490 590 476 588 456 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="6"/>',
    /* pómulos-maseteros que ensanchan la cara */
    '<path d="M594 456 C 582 466 580 482 592 492 C 602 500 616 498 622 488" fill="url(#jlOro)" stroke="' + T + '" stroke-width="4.6"/>',
    '<path d="M726 456 C 738 466 740 482 728 492 C 718 500 704 498 698 488" fill="url(#jlOro)" stroke="' + T + '" stroke-width="4.6"/>',
    /* carrillos: pelo a zigzag y patilla crema */
    '<path d="M608 496 l-13 5 l11 6 l-9 8 l13 2 M712 496 l13 5 l-11 6 l9 8 l-13 2" fill="none" stroke="' + T + '" stroke-width="2.6"/>',
    '<path d="M600 484 c7 8 17 10 26 6 M720 484 c-7 8 -17 10 -26 6" fill="none" stroke="#f2e6ca" stroke-width="5.5" stroke-linecap="round"/>',
    /* manchitas del casco, las sienes y los carrillos */
    mancha(628, 396, 3.8, 3, 20), mancha(648, 388, 3.4, 2.7, 0), mancha(672, 388, 3.4, 2.7, 0), mancha(692, 396, 3.8, 3, -20),
    mancha(660, 402, 3, 2.4, 0), mancha(612, 420, 3.2, 2.5, 30), mancha(708, 420, 3.2, 2.5, -30),
    mancha(602, 466, 2.8, 2.2, 0), mancha(718, 466, 2.8, 2.2, 0), mancha(636, 412, 2.6, 2, 0), mancha(684, 412, 2.6, 2, 0),
    /* LA CARA SERIA (la de casi siempre) */
    '<g id="caraSeriaReal">',
    /* dos toques de ceja, cortos y altos: atención serena, nada de angustia */
    '<path d="M614 434 l22 -6 M706 434 l-22 -6" fill="none" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>',
    '<g id="ojosReales">',
    /* OJOS BIEN SEPARADOS, almendra corta: cada uno vive pegado a su pómulo
       (depredador binocular, pero de cráneo ancho — juntos leen peluche) */
    '<g id="ojoRealIzq">',
    '<path d="M608 452 C 614 441 634 438 645 447 C 649 455 643 465 630 466 C 618 467 610 460 608 452 Z" fill="#f6f0dc" stroke="' + T + '" stroke-width="3.8"/>',
    '<circle cx="628" cy="453" r="9" fill="url(#jlAmbar)" stroke="' + T + '" stroke-width="1.8"/>',
    '</g>',
    '<g id="ojoRealDer">',
    '<path d="M712 452 C 706 441 686 438 675 447 C 671 455 677 465 690 466 C 702 467 710 460 712 452 Z" fill="#f6f0dc" stroke="' + T + '" stroke-width="3.8"/>',
    '<circle cx="692" cy="453" r="9" fill="url(#jlAmbar)" stroke="' + T + '" stroke-width="1.8"/>',
    '</g>',
    '<g id="pupilasReales">',
    '<circle cx="628" cy="454" r="4.1" fill="#140f0a"/><circle cx="692" cy="454" r="4.1" fill="#140f0a"/>',
    '<circle cx="630.5" cy="450.5" r="1.5" fill="#f6f0dc"/><circle cx="694.5" cy="450.5" r="1.5" fill="#f6f0dc"/>',
    '</g>',
    '<g id="parpadosReales">',
    '<path d="M604 436 h46 v32 h-46 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="1.2"/>',
    '<path d="M670 436 h46 v32 h-46 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="1.2"/>',
    '</g>',
    '</g>',
    /* lagrimal: la línea que baja del ojo */
    '<path d="M622 466 C 618 474 616 482 617 489 M698 466 C 702 474 704 482 703 489" fill="none" stroke="' + T + '" stroke-width="2.4" opacity=".7"/>',
    '</g>',
    /* HOCICO: bozal crema que ocupa la mitad baja de la cara, trufa GRANDE,
       boca cerrada de belfo ancho — la caja de morder, no un botón */
    '<path d="M610 492 C 610 472 632 462 660 462 C 688 462 710 472 710 492 C 710 514 692 530 660 530 C 628 530 610 514 610 492 Z" fill="#f2e6ca" stroke="' + T + '" stroke-width="4.6"/>',
    '<path id="narizReal" d="M642 482 C 642 472 650 466 660 466 C 670 466 678 472 678 482 C 678 491 670 497 660 497 C 650 497 642 491 642 482 Z" fill="#4a2c28" stroke="' + T + '" stroke-width="3.4"/>',
    '<path d="M650 474 a 6 4 0 0 1 7 2" fill="none" stroke="#e8b8a4" stroke-width="2.2" stroke-linecap="round"/>',
    '<path d="M660 497 L 660 507 M660 507 C 651 516 639 518 630 512 M660 507 C 669 516 681 518 690 512" fill="none" stroke="' + T + '" stroke-width="3.2" stroke-linecap="round"/>',
    '<path d="M644 526 C 650 531 670 531 676 526" fill="none" stroke="' + T + '" stroke-width="2.6" opacity=".75"/>',
    '<g fill="' + T + '"><circle cx="634" cy="500" r="1.8"/><circle cx="640" cy="509" r="1.8"/><circle cx="686" cy="500" r="1.8"/><circle cx="680" cy="509" r="1.8"/></g>',
    /* bigotes cortos y caídos, de gato serio — sin cruzar el hombro */
    '<g stroke="' + T + '" stroke-width="2.1" fill="none" stroke-linecap="round" opacity=".8">',
    '<path d="M628 498 C 610 496 596 498 584 504 M632 507 C 616 508 604 512 594 519 M638 514 C 626 518 616 524 610 531"/>',
    '<path d="M692 498 C 710 496 724 498 736 504 M688 507 C 704 508 716 512 726 519 M682 514 C 694 518 704 524 710 531"/>',
    '</g>',
    /* CARA DEL GUIÑO (dial del medio): parche que releva la cara seria */
    '<g id="caraGuino">',
    '<path d="M666 432 h56 v38 h-56 Z" fill="url(#jlOro)"/>',
    '<path d="M674 454 C 682 463 702 463 710 454" fill="none" stroke="' + T + '" stroke-width="4.6" stroke-linecap="round"/>',
    '<path d="M712 446 l10 -5 M714 455 l11 0" stroke="' + T + '" stroke-width="2.8" stroke-linecap="round"/>',
    '<path d="M684 428 l22 -7" fill="none" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M630 512 C 642 524 676 524 690 512 C 694 509 696 505 697 501" fill="none" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>',
    '</g>',
    '</g>', /* /wrapper de escala */
    '</g>', /* /cabezaReal */
    '</g>', /* /jagReal */
  ].join('\n');

  /* ── EL ACTOR: bípedo, pie-eyes, sonrisa enorme, guantes, la lupa ── */
  var jagActor = [
    '<g id="jagActor">',

    /* cola del actor: mismo animal, misma cola — anillos y punta negra */
    '<g id="colaActor">',
    '<path d="M892 636 C 968 644 1028 606 1038 550 C 1044 510 1026 476 992 468" fill="none" stroke="' + T + '" stroke-width="24" stroke-linecap="round"/>',
    '<path d="M892 636 C 968 644 1028 606 1038 550 C 1044 510 1026 476 992 468" fill="none" stroke="url(#jlOro)" stroke-width="15.5" stroke-linecap="round"/>',
    mancha(962, 638, 6, 4.5, 10), mancha(1014, 606, 6, 4.5, -35), mancha(1036, 566, 6, 4.5, -70),
    '<path d="M1038 532 l14 -3 M1030 502 l13 -7" stroke="' + T + '" stroke-width="7" stroke-linecap="round"/>',
    '<path d="M992 468 C 972 460 950 466 942 482" fill="none" stroke="' + T + '" stroke-width="20" stroke-linecap="round"/>',
    '<path d="M992 468 C 972 460 950 466 942 482" fill="none" stroke="url(#jlOro)" stroke-width="12" stroke-linecap="round"/>',
    '<path d="M948 470 C 940 470 934 476 934 484 C 938 490 946 492 952 488 Z" fill="' + T + '"/>',
    '</g>',

    /* PIERNAS de goma con su cadera, zarpas digitígradas plantadas */
    '<g id="piernasActor">',
    '<ellipse cx="822" cy="652" rx="26" ry="22" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<ellipse cx="880" cy="655" rx="26" ry="22" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M820 656 C 808 694 802 736 804 774" fill="none" stroke="' + T + '" stroke-width="28" stroke-linecap="round"/>',
    '<path d="M820 656 C 808 694 802 736 804 774" fill="none" stroke="url(#jlOro)" stroke-width="18" stroke-linecap="round"/>',
    '<path d="M882 658 C 892 696 896 738 892 774" fill="none" stroke="' + T + '" stroke-width="28" stroke-linecap="round"/>',
    '<path d="M882 658 C 892 696 896 738 892 774" fill="none" stroke="url(#jlOro)" stroke-width="18" stroke-linecap="round"/>',
    '<path d="M780 772 h48 a9 11 0 0 1 9 13 l-3 9 h-60 l-3 -9 a9 11 0 0 1 9 -13 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M868 772 h48 a9 11 0 0 1 9 13 l-3 9 h-60 l-3 -9 a9 11 0 0 1 9 -13 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M794 778 l0 12 M810 778 l0 13 M882 778 l0 12 M898 778 l0 13" stroke="' + T + '" stroke-width="3.2" opacity=".85"/>',
    mancha(812, 700, 4.5, 3.4, 12), mancha(888, 706, 4.5, 3.4, -12), mancha(806, 740, 4, 3, 0), mancha(894, 742, 4, 3, 0),
    '</g>',

    /* TORSO de pera con pecho crema — se inclina apenas cuando actúa */
    '<g id="torsoActor">',
    '<path d="M822 478 C 786 494 768 546 780 606 C 788 648 810 672 850 674 C 890 672 912 648 920 606 C 932 546 914 494 878 478 C 860 470 840 470 822 478 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="6.5"/>',
    '<path d="M830 502 C 808 518 800 558 808 606 C 814 640 830 658 850 658 C 870 658 886 640 892 606 C 900 558 892 518 870 502 C 858 494 842 494 830 502 Z" fill="#f7ecd2" stroke="' + T + '" stroke-width="4.4"/>',
    '<path d="M820 556 c10 -6 22 -6 30 0 M816 592 c12 -7 26 -7 36 0 M818 628 c12 -6 26 -6 38 0" fill="none" stroke="#d8c294" stroke-width="2.5"/>',
    roseta(794, 552, 11, 20, 1), roseta(908, 554, 11, -20, 2),
    roseta(798, 614, 10, -14, 1), roseta(904, 616, 10, 26, 1),
    mancha(850, 480, 7, 3.5, 0), mancha(816, 490, 5, 3, -18), mancha(884, 490, 5, 3, 18),
    '</g>',

    /* BRAZO LIBRE (a su derecha): cuelga, y cuando actúa señala la huella */
    '<g id="brazoLibre">',
    '<path d="M800 514 C 768 530 752 572 758 616 C 761 640 770 656 784 664" fill="none" stroke="' + T + '" stroke-width="24" stroke-linecap="round"/>',
    '<path d="M800 514 C 768 530 752 572 758 616 C 761 640 770 656 784 664" fill="none" stroke="url(#jlOro)" stroke-width="15" stroke-linecap="round"/>',
    mancha(760, 576, 4, 3, 20), mancha(766, 546, 3.6, 2.7, -10),
    '<g id="manoLibre">',
    '<path d="M770 682 C 756 676 750 660 758 648 C 766 636 786 634 798 644 C 808 654 808 670 798 680 C 790 688 778 690 770 682 Z" fill="#fdfaf0" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M766 652 c-8 -4 -9 -12 -3 -16 c5 -4 12 -1 14 5 M778 640 c-2 -8 4 -14 11 -12 M794 642 c4 -7 12 -7 16 -1" fill="none" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>',
    '<path d="M774 684 c-2 8 -10 10 -16 5" fill="none" stroke="' + T + '" stroke-width="4" stroke-linecap="round"/>',
    '</g>',
    '</g>',

    /* CABEZA DEL ACTOR: pie-eyes, cejas de actor, sonrisa ENORME */
    '<g id="cabezaActor">',
    '<g id="orejaActorIzq" transform-origin="797 340">',
    '<circle cx="795" cy="338" r="28" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    '<ellipse cx="796" cy="342" rx="15" ry="13" fill="#3a2417"/>',
    '<path d="M787 349 l-3 7 M796 351 l0 8 M806 349 l3 7" stroke="' + T + '" stroke-width="1.8" opacity=".65"/>',
    '</g>',
    '<g id="orejaActorDer" transform-origin="903 340">',
    '<circle cx="905" cy="338" r="28" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5.5"/>',
    '<ellipse cx="904" cy="342" rx="15" ry="13" fill="#3a2417"/>',
    '<path d="M895 349 l-3 7 M904 351 l0 8 M914 349 l3 7" stroke="' + T + '" stroke-width="1.8" opacity=".65"/>',
    '</g>',
    /* cráneo ancho con maseteros y patillas */
    '<path d="M768 428 C 760 380 794 348 850 346 C 906 348 940 380 932 428 C 928 460 908 484 878 494 L 822 494 C 792 484 772 460 768 428 Z" fill="url(#jlOro)" stroke="' + T + '" stroke-width="6.5"/>',
    '<path d="M768 424 C 754 436 754 456 770 466 C 782 474 798 470 804 458" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M932 424 C 946 436 946 456 930 466 C 918 474 902 470 896 458" fill="url(#jlOro)" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M776 452 c8 9 20 11 30 5 M924 452 c-8 9 -20 11 -30 5" fill="none" stroke="#f7ecd2" stroke-width="6" stroke-linecap="round"/>',
    mancha(812, 362, 4, 3.2, 16), mancha(836, 354, 3.6, 2.8, 0), mancha(864, 354, 3.6, 2.8, 0), mancha(888, 362, 4, 3.2, -16),
    mancha(850, 368, 3.2, 2.5, 0), mancha(786, 388, 3.4, 2.6, 24), mancha(914, 388, 3.4, 2.6, -24),
    /* cejas de actor, bien arriba de los ojos */
    '<path id="cejaActorIzq" d="M794 382 C 806 374 824 372 836 378" fill="none" stroke="' + T + '" stroke-width="6.5" stroke-linecap="round"/>',
    '<path id="cejaActorDer" d="M864 378 C 876 372 894 374 906 382" fill="none" stroke="' + T + '" stroke-width="6.5" stroke-linecap="round"/>',
    /* PIE-EYES con párpado de pelaje */
    '<g id="ojoActorIzq">',
    '<ellipse cx="818" cy="416" rx="23" ry="27" fill="#fdfaf0" stroke="' + T + '" stroke-width="5.5"/>',
    '<g id="pupilaActorIzq"><circle cx="824" cy="422" r="11.5" fill="' + T + '"/>',
    '<path d="M824 410.5 A 11.5 11.5 0 0 1 835.5 422 L 824 422 Z" fill="#fdfaf0" opacity=".92"/></g>',
    '<rect id="parpadoActorIzq" x="795" y="389" width="46" height="30" rx="13" fill="url(#jlOro)" stroke="' + T + '" stroke-width="3.6" transform-origin="50% 0%" transform="scale(1,.14)"/>',
    '</g>',
    '<g id="ojoActorDer">',
    '<ellipse cx="882" cy="416" rx="23" ry="27" fill="#fdfaf0" stroke="' + T + '" stroke-width="5.5"/>',
    '<g id="pupilaActorDer"><circle cx="876" cy="422" r="11.5" fill="' + T + '"/>',
    '<path d="M876 410.5 A 11.5 11.5 0 0 1 887.5 422 L 876 422 Z" fill="#fdfaf0" opacity=".92"/></g>',
    '<rect id="parpadoActorDer" x="859" y="389" width="46" height="30" rx="13" fill="url(#jlOro)" stroke="' + T + '" stroke-width="3.6" transform-origin="50% 0%" transform="scale(1,.14)"/>',
    '</g>',
    /* bozal con la SONRISA ENORME: banda de dientes con separaciones y colmillos */
    '<path d="M798 446 C 798 428 820 418 850 418 C 880 418 902 428 902 446 C 902 470 882 486 850 486 C 818 486 798 470 798 446 Z" fill="#f7ecd2" stroke="' + T + '" stroke-width="4.8"/>',
    '<path id="narizActor" d="M837 434 C 837 427 843 422 850 422 C 857 422 863 427 863 434 C 863 441 857 446 850 446 C 843 446 837 441 837 434 Z" fill="#5a3330" stroke="' + T + '" stroke-width="3.6"/>',
    '<g id="bocaActor">',
    '<path d="M850 446 L 850 452" stroke="' + T + '" stroke-width="3.2"/>',
    '<path d="M800 442 C 812 476 828 492 850 492 C 872 492 888 476 900 442" fill="none" stroke="' + T + '" stroke-width="5.5" stroke-linecap="round"/>',
    '<path d="M806 456 C 818 480 834 490 850 490 C 866 490 882 480 894 456 L 891 468 C 880 486 866 494 850 494 C 834 494 820 486 809 468 Z" fill="#fdfaf0" stroke="' + T + '" stroke-width="3.2"/>',
    '<path d="M818 470 l1 13 M833 480 l0 12 M850 483 l0 12 M867 480 l0 12 M882 470 l-1 13" stroke="' + T + '" stroke-width="2.1" opacity=".85"/>',
    '<path d="M806 456 L 812 476 L 823 464 Z" fill="#fdfaf0" stroke="' + T + '" stroke-width="2.8" stroke-linejoin="round"/>',
    '<path d="M894 456 L 888 476 L 877 464 Z" fill="#fdfaf0" stroke="' + T + '" stroke-width="2.8" stroke-linejoin="round"/>',
    '</g>',
    '<g id="bocaHablaActor">',
    '<path d="M822 458 C 836 452 864 452 878 458 C 876 484 864 496 850 496 C 836 496 824 484 822 458 Z" fill="#5a2c22" stroke="' + T + '" stroke-width="4.4"/>',
    '<path d="M827 458 C 842 453 858 453 873 458 L 871 465 C 858 460 842 460 829 465 Z" fill="#fdfaf0"/>',
    '<path d="M838 490 C 846 484 854 484 862 490 C 856 494 844 494 838 490 Z" fill="#c96a5a"/>',
    '</g>',
    '<g fill="' + T + '"><circle cx="826" cy="444" r="2"/><circle cx="832" cy="452" r="2"/><circle cx="874" cy="444" r="2"/><circle cx="868" cy="452" r="2"/></g>',
    '<g stroke="' + T + '" stroke-width="2.4" fill="none" stroke-linecap="round">',
    '<path d="M806 442 C 786 438 768 438 752 444 M808 452 C 790 452 774 456 762 464"/>',
    '<path d="M894 442 C 914 438 932 438 948 444 M892 452 C 910 452 926 456 938 464"/>',
    '</g>',
    '</g>', /* /cabezaActor */

    /* BRAZO DE LA LUPA — ENCIMA de la cabeza en z: el vidrio puede taparle
       el cachete cuando sube al ojo. Corto, doblado, la lente a la altura
       de la cara desde el arranque (el gesto la LLEVA al ojo, no la iza) */
    '<g id="brazoLupa">',
    '<path d="M900 514 C 934 520 954 502 954 474" fill="none" stroke="' + T + '" stroke-width="24" stroke-linecap="round"/>',
    '<path d="M900 514 C 934 520 954 502 954 474" fill="none" stroke="url(#jlOro)" stroke-width="15" stroke-linecap="round"/>',
    mancha(938, 512, 4, 3, -20),
    '<g id="manoLupa">',
    /* la lupa: mango de palo abajo, aro de latón, vidrio con destello */
    '<path d="M958 470 L 966 496" stroke="' + T + '" stroke-width="14" stroke-linecap="round"/>',
    '<path d="M958 470 L 966 496" stroke="#7a4b26" stroke-width="8" stroke-linecap="round"/>',
    '<circle cx="950" cy="436" r="33" fill="url(#jlLente)" stroke="' + T + '" stroke-width="5.5"/>',
    '<circle cx="950" cy="436" r="33" fill="none" stroke="#b98a3e" stroke-width="3"/>',
    '<path d="M935 421 A 21 21 0 0 1 959 417" fill="none" stroke="#ffffff" stroke-width="4.6" stroke-linecap="round" opacity=".9"/>',
    /* la manopla agarrando el mango */
    '<path d="M944 460 C 932 456 926 444 932 434 C 938 424 954 422 964 430 C 972 438 972 452 964 460 C 958 466 950 466 944 460 Z" fill="#fdfaf0" stroke="' + T + '" stroke-width="5"/>',
    '<path d="M938 438 c-7 -3 -8 -10 -3 -13 c5 -3 11 0 12 5 M950 428 c-1 -7 5 -12 10 -10 M962 432 c4 -6 11 -5 14 0" fill="none" stroke="' + T + '" stroke-width="3.6" stroke-linecap="round"/>',
    '</g>',
    '</g>',
    '</g>', /* /jagActor */
  ].join('\n');

  var svg = [
    '<g id="jaguarLaminaWrap">',

    /* ── EL PAPEL ── */
    '<rect x="0" y="0" width="1680" height="960" fill="url(#jlPapel)"/>',
    '<ellipse cx="188" cy="98" rx="60" ry="26" fill="#c9a96c" opacity=".16"/>',
    '<ellipse cx="1520" cy="880" rx="84" ry="30" fill="#c9a96c" opacity=".18"/>',
    '<ellipse cx="1450" cy="120" rx="46" ry="20" fill="#c9a96c" opacity=".12"/>',
    '<ellipse cx="120" cy="840" rx="52" ry="34" fill="#bf9a58" opacity=".12"/>',
    '<ellipse cx="860" cy="935" rx="120" ry="14" fill="#c9a96c" opacity=".10"/>',

    /* ── EL MARCO: doble filete + volutas ── */
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
    '<text x="840" y="76" font-size="24" letter-spacing="6">UNA INTERPRETACIÓN VISIONARIA DE HISTORIA NATURAL CON EXPRESIÓN CUPHEAD</text>',
    '<text x="840" y="122" font-size="42" font-weight="bold" letter-spacing="10">EL JAGUAR · RASTREADOR DEL MONTE</text>',
    '</g>',
    '<g>',
    '<path d="M560 138 L1120 138 L1104 160 L1120 182 L560 182 L576 160 Z" fill="#f2e7c8" stroke="#6b5a3c" stroke-width="2.2"/>',
    '<path d="M560 138 L540 148 L556 160 L540 174 L560 182 L576 160 Z" fill="#e2d2a8" stroke="#6b5a3c" stroke-width="2"/>',
    '<path d="M1120 138 L1140 148 L1124 160 L1140 174 L1120 182 L1104 160 Z" fill="#e2d2a8" stroke="#6b5a3c" stroke-width="2"/>',
    '<text x="840" y="168" font-family="Georgia,serif" font-size="25" font-style="italic" fill="#3c2c14" text-anchor="middle" letter-spacing="2">Panthera onca — el felino más grande de América</text>',
    '</g>',

    /* ── EL PAISAJE GRABADO ── */
    '<g id="jlPaisaje">',
    '<rect x="330" y="200" width="1010" height="150" fill="url(#jlCielo)"/>',
    '<g fill="none" stroke="#8a7a56" stroke-width="1.1" opacity=".7">',
    '<path d="M430 240c18-16 44-14 56-2 14-14 44-12 52 4 16-4 30 6 28 18H436c-10-6-12-14-6-20Z"/>',
    '<path d="M1150 226c14-12 36-12 46-2 12-12 36-10 44 4 12-2 22 6 20 14h-116c-8-6-8-11 6-16Z"/>',
    '<path d="M700 216c10-10 28-9 36-1 10-9 27-7 33 3 10-2 18 5 16 12h-90c-6-5-6-9 5-14Z" opacity=".6"/>',
    '</g>',
    /* cordillera: crestas quebradas, no triángulos de regla */
    '<path d="M330 470 L 366 424 L 392 380 L 414 398 L 442 348 L 486 296 L 508 330 L 528 312 L 560 356 L 588 330 L 622 402 L 652 372 L 688 428 L 724 398 L 760 470 Z" fill="url(#jlDiag)" stroke="' + T + '" stroke-width="2" opacity=".8"/>',
    '<g stroke="#5d5744" stroke-width="1" fill="none" opacity=".6">',
    '<path d="M486 296 L 494 330 L 482 360 L 496 396 L 486 430"/>',
    '<path d="M560 356 L 570 386 L 560 414 L 572 444"/>',
    '<path d="M622 402 L 614 428 L 624 452"/>',
    '<path d="M442 348 L 450 378 L 440 404"/>',
    '</g>',
    /* la cascada: papel en reserva entre dos riscos */
    '<path d="M496 400 c-4 60 -6 120 -2 170 l40 0 c-8 -60 -8 -115 -2 -168 Z" fill="#f2ead2" stroke="#6b5a3c" stroke-width="1.6" opacity=".9"/>',
    '<g stroke="#8a7a56" stroke-width="1" fill="none" opacity=".75">',
    '<path d="M506 415 c-2 40 -3 90 -1 140"/>',
    '<path d="M520 412 c-1 44 -1 92 1 146"/>',
    '<path d="M530 418 c1 38 1 86 2 132"/>',
    '</g>',
    /* el río, más liviano que antes: orilla y ondas, no un muro rayado */
    '<path d="M420 585 c60 -28 150 -24 220 2 90 32 210 40 330 22 130 -18 260 -6 350 30 l0 90 -900 0 Z" fill="url(#jlRaya)" stroke="#6b5a3c" stroke-width="1.4" opacity=".5"/>',
    '<g stroke="#7a6a48" stroke-width="1.1" fill="none" opacity=".7">',
    '<path d="M480 610 c40 -12 90 -14 130 -4"/>',
    '<path d="M700 626 c60 8 140 6 200 -6"/>',
    '<path d="M1050 640 c60 -4 130 4 180 22"/>',
    '<path d="M560 646 c30 -8 70 -8 100 0 M900 660 c40 -6 90 -2 120 8"/>',
    '</g>',
    /* helechos arbóreos a la izquierda */
    '<g stroke="' + T + '" fill="none" stroke-width="2">',
    '<path d="M368 560 C 362 480 366 420 372 372" stroke-width="5"/>',
    '<g stroke-width="1.6">',
    '<path d="M372 372 C 330 350 300 356 272 384 M372 372 C 340 336 306 330 274 344 M372 372 C 356 322 330 300 298 292 M372 372 C 392 322 424 304 458 302 M372 372 C 412 340 448 338 478 356 M372 372 C 416 366 446 380 464 404"/>',
    '<path d="M296 380 l-8 10 M312 366 l-9 9 M330 344 l-10 8 M352 318 l-9 9 M398 326 l8 10 M428 318 l6 11 M444 348 l4 12 M452 386 l2 12" stroke-width="1.1"/>',
    '</g>',
    '<path d="M420 574 C 416 520 418 480 424 448" stroke-width="4"/>',
    '<g stroke-width="1.3">',
    '<path d="M424 448 C 396 430 372 434 352 452 M424 448 C 400 418 374 414 350 424 M424 448 C 444 414 470 406 494 410 M424 448 C 452 430 476 432 494 448"/>',
    '</g>',
    '</g>',
    /* heliconias al pie */
    '<g stroke="' + T + '" stroke-width="1.8" fill="none" opacity=".95">',
    '<path d="M560 640 c-4 -50 -2 -84 6 -110 M566 530 c-20 -8 -36 -2 -46 12 M566 530 c-2 -22 8 -38 24 -46 M566 530 c16 -12 34 -12 46 -2"/>',
    '<path d="M596 648 c0 -40 4 -70 12 -92 M608 556 c14 -16 32 -20 46 -14 M608 556 c-4 -18 2 -34 14 -44"/>',
    '<path d="M630 560 l14 -8 12 10 -12 6 Z M646 540 l14 -8 10 10 -12 6 Z" fill="url(#jlDiagV)" stroke-width="1.4"/>',
    '</g>',
    /* árbol grande de copa festoneada, con lianas y orquídeas */
    '<g stroke="' + T + '" fill="none">',
    /* tronco de dos líneas con corteza y bambas */
    '<path d="M1288 630 C 1284 540 1284 430 1292 344 C 1272 318 1270 286 1288 262" stroke-width="3"/>',
    '<path d="M1318 630 C 1320 540 1320 432 1312 344 C 1332 318 1334 286 1316 262" stroke-width="3"/>',
    '<path d="M1288 630 C 1280 602 1266 588 1248 582 L 1248 630 Z M1318 630 C 1326 602 1340 588 1358 582 L 1358 630 Z" fill="url(#jlDiag)" stroke-width="2.2"/>',
    '<path d="M1294 420 l10 4 M1292 470 l12 3 M1296 520 l10 4 M1294 570 l12 3" stroke-width="1.4" opacity=".7"/>',
    /* copa: festones que se traslapan, con su trama de puntos */
    '<path d="M1188 268 C 1160 250 1160 214 1188 200 C 1186 168 1222 148 1252 162 C 1262 130 1310 122 1332 148 C 1364 128 1408 144 1412 176 C 1448 176 1470 210 1454 240 C 1472 266 1456 298 1424 300 C 1404 322 1362 324 1338 306 C 1310 326 1268 322 1250 300 C 1218 306 1192 292 1188 268 Z" fill="url(#jlPunto)" stroke="#5d5744" stroke-width="1.8"/>',
    '<path d="M1230 268 c14 -10 34 -12 50 -4 M1290 240 c16 -12 40 -12 56 0 M1350 250 c14 -8 32 -8 44 0 M1256 214 c12 -8 28 -8 40 0 M1330 196 c12 -8 28 -6 38 2" stroke="#5d5744" stroke-width="1.1" opacity=".7"/>',
    /* lianas */
    '<path d="M1240 292 C 1234 390 1240 490 1256 600 M1372 296 C 1386 390 1384 490 1366 596" stroke-width="1.6" opacity=".8"/>',
    '<path d="M1256 600 c-10 14 -6 26 6 32 M1366 596 c10 12 8 24 -4 32" stroke-width="1.4" opacity=".8"/>',
    '</g>',
    '<g stroke="' + T + '" stroke-width="1.4" fill="#e8d9c0">',
    '<path d="M1378 372 c-8 -12 -2 -24 10 -24 12 0 18 12 10 24 6 10 0 20 -10 20 -10 0 -16 -10 -10 -20 Z"/>',
    '<circle cx="1388" cy="366" r="4.5" fill="#c98a7a"/>',
    '<path d="M1246 420 c-8 -12 -2 -24 10 -24 12 0 18 12 10 24 6 10 0 20 -10 20 -10 0 -16 -10 -10 -20 Z"/>',
    '<circle cx="1256" cy="414" r="4.5" fill="#c98a7a"/>',
    '<path d="M1394 470 c-7 -10 -2 -20 8 -20 10 0 15 10 8 20 5 8 0 17 -8 17 -8 0 -13 -9 -8 -17 Z"/>',
    '<circle cx="1402" cy="465" r="3.8" fill="#c98a7a"/>',
    '</g>',
    '<g stroke="#4f5d42" stroke-width="1.4" fill="none" opacity=".8">',
    '<path d="M470 700 q6 -26 -2 -44 M486 702 q10 -22 2 -46 M502 700 q4 -28 12 -40"/>',
    '<path d="M1150 706 q6 -26 -2 -44 M1166 708 q10 -22 2 -46 M1182 706 q4 -28 12 -40"/>',
    '<path d="M1240 700 q8 -20 0 -38 M1256 702 q10 -18 4 -40"/>',
    '</g>',
    '</g>',

    /* ═══ APARATOS DEL NATURALISTA — columna izquierda ═══ */
    '<g id="jlPanelIzq" font-family="Georgia,serif" fill="#3c2c14">',
    '<rect x="64" y="210" width="240" height="196" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="216" width="228" height="184" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="242" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA ROSETA</text>',
    '<g transform="translate(136,306)">', roseta(0, 0, 27, 10, 2).replace('stroke-width="12.4"', 'stroke-width="9"'), '</g>',
    '<text x="136" y="360" font-size="12.5" text-anchor="middle" font-style="italic">anillo roto,</text>',
    '<text x="136" y="375" font-size="12.5" text-anchor="middle" font-style="italic">con puntos ADENTRO</text>',
    '<g transform="translate(242,306)" stroke="#7a6a48">',
    '<path d="M-20 -5 A 21 21 0 1 1 -6 18" fill="none" stroke-width="5.5" stroke-linecap="round"/>',
    '<path d="M-30 26 L 30 -26" stroke-width="2.2" opacity=".8"/>',
    '</g>',
    '<text x="242" y="360" font-size="12.5" text-anchor="middle" font-style="italic" fill="#6a583a">vacía: leopardo,</text>',
    '<text x="242" y="375" font-size="12.5" text-anchor="middle" font-style="italic" fill="#6a583a">otro continente</text>',
    '<text x="184" y="394" font-size="12" text-anchor="middle">cada dibujo es único: así se cuentan sin tocarlos</text>',

    '<rect x="64" y="428" width="240" height="180" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="434" width="228" height="168" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="460" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA HUELLA</text>',
    '<g transform="translate(130,528)" fill="#8a7452" stroke="' + T + '" stroke-width="1.6">',
    '<ellipse cx="0" cy="12" rx="24" ry="19"/>',
    '<ellipse cx="-21" cy="-12" rx="8.5" ry="10.5"/><ellipse cx="-7" cy="-19" rx="8.5" ry="10.5"/>',
    '<ellipse cx="7" cy="-19" rx="8.5" ry="10.5"/><ellipse cx="21" cy="-12" rx="8.5" ry="10.5"/>',
    '</g>',
    '<g transform="translate(238,528)" fill="none" stroke="#7a6a48" stroke-width="1.4">',
    '<ellipse cx="0" cy="12" rx="17" ry="13"/>',
    '<ellipse cx="-15" cy="-9" rx="6" ry="8"/><ellipse cx="-5" cy="-14" rx="6" ry="8"/>',
    '<ellipse cx="5" cy="-14" rx="6" ry="8"/><ellipse cx="15" cy="-9" rx="6" ry="8"/>',
    '<path d="M-16 -20 l-2 -7 M-5 -25 l0 -7 M5 -25 l0 -7 M16 -20 l2 -7" stroke-width="1.8"/>',
    '<path d="M-26 30 L 26 -30" stroke-width="2" opacity=".8"/>',
    '</g>',
    '<text x="130" y="576" font-size="12.5" text-anchor="middle" font-style="italic">redonda y SIN uña</text>',
    '<text x="238" y="576" font-size="12.5" text-anchor="middle" font-style="italic" fill="#6a583a">perro: uña marcada</text>',
    '<text x="184" y="595" font-size="12" text-anchor="middle">la garra viaja guardada; sale solo al agarrar</text>',

    '<rect x="64" y="630" width="240" height="190" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="70" y="636" width="228" height="178" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="184" y="662" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">LA MORDIDA</text>',
    '<g transform="translate(184,730)" stroke="' + T + '" fill="none" stroke-width="2.2">',
    '<path d="M-64 6 C -66 -18 -48 -34 -18 -36 C 14 -38 44 -30 56 -12 C 62 -3 60 6 52 10 L 34 12 C 30 20 22 24 12 22 L -8 20 C -28 26 -52 22 -64 6 Z"/>',
    '<path d="M-8 20 C -4 6 8 -2 24 -2" stroke-width="1.6"/>',
    '<path d="M52 10 L 50 26 C 48 32 42 32 40 26 L 38 13" stroke-width="2"/>',
    '<path d="M30 12 L 29 22 C 28 26 24 26 23 22 L 22 13" stroke-width="1.6"/>',
    '<path d="M-58 2 C -50 12 -34 16 -18 14" stroke-width="1.4" opacity=".8"/>',
    '<circle cx="34" cy="-16" r="6" stroke-width="1.8"/>',
    '<path d="M-2 -30 C 2 -18 4 -6 2 4" stroke="#8a5a2a" stroke-width="2.4"/>',
    '<path d="M-3 0 L 2 6 L 6 -1" fill="#8a5a2a" stroke="none"/>',
    '</g>',
    '<text x="184" y="782" font-size="12.5" text-anchor="middle" font-style="italic">en proporción, la más fuerte</text>',
    '<text x="184" y="797" font-size="12.5" text-anchor="middle" font-style="italic">de todos los felinos</text>',
    '<text x="184" y="812" font-size="12" text-anchor="middle">caza perforando, no asfixiando</text>',
    '</g>',

    /* ═══ Columna derecha ═══ */
    '<g id="jlPanelDer" font-family="Georgia,serif" fill="#3c2c14">',
    '<rect x="1376" y="210" width="240" height="190" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="216" width="228" height="178" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="242" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">OJOS DE NOCHE</text>',
    '<g transform="translate(1496,306)">',
    '<circle cx="0" cy="0" r="42" fill="#efe6cd" stroke="' + T + '" stroke-width="2.2"/>',
    '<path d="M-34 24 A 42 42 0 0 1 -34 -24 L -22 -16 A 27 27 0 0 0 -22 16 Z" fill="#caa84e" stroke="' + T + '" stroke-width="1.4"/>',
    '<circle cx="6" cy="0" r="17" fill="#3a2c14"/>',
    '<circle cx="11" cy="-6" r="4.5" fill="#f2e8cd"/>',
    '<path d="M-52 -34 L -36 -22 M-58 0 L -44 0 M-52 34 L -36 22" stroke="#8a5a2a" stroke-width="2"/>',
    '<path d="M-36 -22 L -44 -22 M-36 -22 L -36 -14" stroke="#8a5a2a" stroke-width="1.6"/>',
    '</g>',
    '<text x="1496" y="370" font-size="12.5" text-anchor="middle" font-style="italic">el tapetum lucidum devuelve la luz</text>',
    '<text x="1496" y="386" font-size="12" text-anchor="middle">que ya pasó: una segunda oportunidad de verla</text>',

    '<rect x="1376" y="422" width="240" height="176" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="428" width="228" height="164" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="454" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">EL OCELO</text>',
    '<g transform="translate(1496,516)">',
    '<path d="M-34 26 C -44 2 -36 -24 -12 -34 C 12 -42 34 -30 38 -8 C 40 10 30 24 12 30 Z" fill="#2c1c0e" stroke="' + T + '" stroke-width="2.2"/>',
    '<ellipse cx="0" cy="-4" rx="13" ry="10" fill="#efe4c8"/>',
    '<path d="M-34 26 C -20 32 0 34 12 30" fill="none" stroke="' + T + '" stroke-width="2"/>',
    '</g>',
    '<text x="1496" y="566" font-size="12.5" text-anchor="middle" font-style="italic">la señal clara que siguen los cachorros</text>',
    '<text x="1496" y="582" font-size="12" text-anchor="middle">última seña antes de perderse en el monte</text>',

    '<rect x="1376" y="620" width="240" height="200" rx="6" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<rect x="1382" y="626" width="228" height="188" rx="4" fill="none" stroke="#6b5a3c" stroke-width=".8"/>',
    '<text x="1496" y="652" font-size="17" letter-spacing="3" text-anchor="middle" font-weight="bold">CAZA EN EL RÍO</text>',
    '<g transform="translate(1496,724)" stroke="' + T + '" fill="none" stroke-width="2">',
    '<path d="M-80 26 C -50 18 -20 18 10 24 C 40 30 70 30 92 24" stroke-width="1.6" opacity=".8"/>',
    '<path d="M-70 40 C -40 34 0 34 30 38 C 58 42 80 42 96 38" stroke-width="1.4" opacity=".6"/>',
    '<path d="M-44 22 C -46 8 -36 -2 -20 -2 C -8 -2 0 4 2 12 L 2 22 Z" fill="#e9dab6"/>',
    '<circle cx="-32" cy="8" r="2.6" fill="' + T + '" stroke="none"/>',
    '<path d="M-44 4 C -48 -2 -46 -8 -40 -10 M-24 -2 C -24 -8 -20 -12 -14 -10" stroke-width="1.8"/>',
    '<path d="M2 16 C 26 8 52 10 70 20 C 78 24 82 20 88 14" stroke-width="2.4"/>',
    '<g stroke-width="1.2" opacity=".8"><circle cx="-52" cy="26" r="6"/><circle cx="-56" cy="28" r="10"/></g>',
    '</g>',
    '<text x="1496" y="778" font-size="12.5" text-anchor="middle" font-style="italic">entra al agua sin problema</text>',
    '<text x="1496" y="794" font-size="12.5" text-anchor="middle" font-style="italic">y caza en el río;</text>',
    '<text x="1496" y="810" font-size="12" text-anchor="middle">la cola larga le hace de timón</text>',
    '</g>',

    /* ═══ EL PIE DE LÁMINA ═══ */
    '<g id="jlPie" font-family="Georgia,serif">',
    '<path d="M330 836 h1020 v92 h-1020 Z" fill="#f2e8cd" stroke="#6b5a3c" stroke-width="2"/>',
    '<path d="M330 836 l-18 23 18 23 -18 23 18 23 M1350 836 l18 23 -18 23 18 23 -18 23" fill="none" stroke="#6b5a3c" stroke-width="2"/>',
    '<text x="840" y="862" font-size="15.5" text-anchor="middle" fill="#3c2c14"><tspan font-style="italic" font-weight="bold">Panthera onca</tspan>, el jaguar, es el felino más grande de América y el tope de la cadena: si hay jaguar hay presas,</text>',
    '<text x="840" y="884" font-size="15.5" text-anchor="middle" fill="#3c2c14">y si hay presas hay monte grande y entero. Es un animal de verdad — y solo cuando actúa se le ve la expresión cuphead.</text>',
    '<text x="840" y="912" font-size="13.5" text-anchor="middle" fill="#5a4826" font-style="italic">Conoce el monte de noche. UICN: Casi amenazado. A la manera de una visión de Humboldt, con su expresión cuphead — sin que parezca copia.</text>',
    '</g>',

    /* ── LA PIEDRA DEL RASTRO ── */
    '<g id="jlPiedra">',
    '<path d="M560 812 C 548 760 580 724 646 714 C 736 700 924 700 1024 716 C 1092 728 1120 764 1108 808 C 1100 838 1060 854 1006 858 L 664 858 C 610 854 570 840 560 812 Z" fill="#d9c9a2" stroke="' + T + '" stroke-width="3.4"/>',
    '<path d="M584 790 C 630 776 696 770 760 772 M830 770 C 920 768 1000 776 1060 790" fill="none" stroke="#8a7452" stroke-width="1.6" opacity=".7"/>',
    '<path d="M566 808 C 606 822 670 830 736 832" fill="none" stroke="#8a7452" stroke-width="1.4" opacity=".55"/>',
    '<path d="M592 742 C 618 726 670 718 722 720 C 690 730 660 736 632 746 Z" fill="#7c8a52" opacity=".8" stroke="' + T + '" stroke-width="1.6"/>',
    '<path d="M1000 726 C 1032 728 1062 738 1078 752 C 1052 748 1022 742 1000 740 Z" fill="#7c8a52" opacity=".75" stroke="' + T + '" stroke-width="1.4"/>',
    /* LA HUELLA FRESCA, delante de la zarpa del rastreador */
    '<g id="huellaFresca" transform="translate(618,806)" fill="#8a7452" stroke="' + T + '" stroke-width="1.6">',
    '<ellipse cx="0" cy="9" rx="19" ry="14"/>',
    '<ellipse cx="-17" cy="-10" rx="7" ry="8.5"/><ellipse cx="-6" cy="-15" rx="7" ry="8.5"/>',
    '<ellipse cx="6" cy="-15" rx="7" ry="8.5"/><ellipse cx="17" cy="-10" rx="7" ry="8.5"/>',
    '</g>',
    '</g>',

    /* ═══ EL PERSONAJE: los dos extremos del dial ═══ */
    '<g id="jaguar">',
    jagReal,
    jagActor,
    '</g>',

    '<rect x="0" y="0" width="1680" height="960" fill="url(#jlVineta)" pointer-events="none"/>',
    '</g>',
  ].join('\n');

  window.GUIA_JAGUAR_LAMINA = {
    wrap: 'jaguarLaminaWrap',
    lienzo: '0 0 1680 960',   /* la lámina completa; marco.js recorta a #jaguar con encuadrar() */
    css: css,
    defs: defs,
    svg: svg,
  };
})();
