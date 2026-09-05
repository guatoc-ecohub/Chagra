/*
 * pielTrazado — JAGUAR AUTO-TRAZADO RIGGEADO: la lámina `jaguar-natural.png`
 * vectorizada AUTOMÁTICAMENTE (trazar-lamina.sh: vtracer + clip de silueta,
 * ver generar-calco.mjs) y montada sobre el MISMO esqueleto de huesos de
 * `jaguarHuesos/` — la técnica probada en la zarigüeya (8.5/10), replicada.
 *
 * POR QUÉ. Redibujar la lámina a mano en SVG pierde el grabado (el propio
 * jaguarHuesos quedó 7/10: "lo que el vector no alcanza: el hatching, el
 * brillo blanco-fuego de los ojos, la musculatura fina"). El auto-trazado
 * conserva TODO eso (6102 paths), pero sale PLANO. Aquí se le pone el
 * esqueleto ENCIMA sin tocar un solo path del calco:
 *
 *   1. El calco entra UNA vez en <defs> como <g id="jtCalco">.
 *   2. Cada hueso es <g class="jh-hueso …" style="transform-origin:PIVOTE">
 *      con un <use href="#jtCalco" clip-path="url(#jt-r-…)"> — la región
 *      anatómica de ESE hueso, medida POR PÍXELES en el espacio 705×394 de
 *      la lámina (jt-probe.mjs / jt-probe2.mjs: rasterizado del calco +
 *      tramos de silueta fila/columna — NO a ojo).
 *   3. ANTI-COSTURA (regla de la casa): todo casquete o respaldo se pinta
 *      ANTES del hueso hijo y se RECORTA A LA REGIÓN ESTÁTICA del hijo.
 *      En reposo queda 100% oculto bajo los píxeles opacos del trazado; al
 *      rotar el hijo, la franja que desocupa revela el casquete — nunca un
 *      hueco a la página. Bordes estático-vs-estático dilatados ~2px.
 *   4. 🔴 BIGOTES EN OVERLAY (el fix del caveat de la zarigüeya): las
 *      vibrisas NO viven en el calco recortado (el trazado las pierde /
 *      fragmenta al cruzar regiones). Van en un <g> SIN clip, hijo del hueso
 *      CABEZA: giran como unidad con el cráneo. Trazos verificados en GPU
 *      (scratchpad/jaguar-final.svg, sesión 2026-08-22).
 *   5. 🔴 ROSETAS DE TARJETA (defecto MEDIDO 2026-09-04/05, gate de los siete
 *      de tinta): a 560 px el calco lee jaguar de rosetas; a 64 px (tarjeta
 *      del selector) y 82 px (FAB) lee TIGRE de barras verticales — juez
 *      qwen3-vl:8b sobre recorte SIN rótulo + ojo del operador. CONTROL: la
 *      lámina raster reducida a 64 px lee tigre igual → no es el trazo, es
 *      Nyquist: cada roseta mide ~2 px y en el flanco van en columnas, así
 *      que se funden en barras. Ninguna receta de trazado lo arregla; hay
 *      que bajar la FRECUENCIA del patrón SOLO a ese tamaño y DENTRO de esta
 *      misma pieza (ver TARJETA): (a) el propio calco del tronco FUERA DE
 *      FOCO como fondo (la técnica de casqueteCalco: promedia las rosetas
 *      fundidas al tono local, ningún parche inventado) y (b) SEIS rosetas
 *      discretas, separadas y CON PUNTO ADENTRO, en la tinta MEDIDA del
 *      calco. La capa viaja OCULTA por su propia regla <style> y solo se
 *      enciende con data-tarjeta en la raíz (size ≤ TARJETA_MAX_PX).
 *
 * ANATOMÍA MEDIDA (hallazgos del probe, espacio 705×394):
 *   - La lámina es ÚNICA (md5 6cb5f043… en todo el árbol) y es la MISMA que
 *     midió jaguarLamina/anatomia.js (705×394 confirmado).
 *   - Patas delanteras SEPARADAS POR AIRE (gap x≈187-190, y252-338): el
 *     corte por color que causó el bug "3-4 patas" no hace falta — el cauce
 *     es aire. Solo las zarpas se tocan (frontera x≈156, y344-390).
 *   - Traseras: lejana fusionada al vientre solo arriba (respaldo natural
 *     del tronco); cercana con muesca de aire en la ingle (x535-565).
 *   - COLA: los pivotes de jaguarHuesos ([552,110]/[628,188]) caen en AIRE
 *     sobre la lámina (su cola era dibujo propio). RE-MEDIDOS: raíz fundida
 *     a la grupa y98-195, banda que baja pegada al muslo, barrido bajo y
 *     brazo ascendente con la punta enroscada arriba (≈652,205).
 *
 * La CADENCIA es la misma `jaguarHuesos.css` canónica (copiada intacta de
 * fable/jaguar-huesos-definitivo): relojes co-primos, marcha lateral 1.05s,
 * 70/30 Miss Minutes. Este módulo solo reproduce la JERARQUÍA y las CLASES
 * que esa CSS espera. Los ids `jhBoilSuave`/`jhBoil` se conservan porque la
 * CSS los referencia por url(#…).
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three),
 * igual que pielHuesos.js: lo consumen React, HTML plano y el valle 3D.
 */

import { RH_LINE_BOIL } from '../rubberhoseSpec.js';
import { CALCO_SILUETA_DEFS, CALCO_POR_REGION } from './calcoTrazado.js';
import { JT_PIVOTES, JT_REGIONES } from './regiones.js';

export { JT_PIVOTES, JT_REGIONES };

/** Tamaño (px CSS) hasta el cual el rig enciende data-tarjeta: cubre la
    tarjeta del selector (64), el FAB (82) y el avatar chico (48); el overlay
    realista (112) y el valle 3D (132) siguen con el calco a pelo. */
export const TARJETA_MAX_PX = 96;



/* Paleta de casquetes: colores MEDIDOS sobre el calco (jt-probe2.mjs) en el
   punto donde cada casquete asoma — cero color inventado visible en reposo. */
const P = Object.freeze({
  hombroCerca: '#614027',
  codoCerca: '#5a402d',
  zarpaCerca: '#b58f6b',
  penumbraLejos: '#241d14',
  rodillaLejos: '#7f5434',
  zarpaLejos: '#c3a787',
  musloCerca: '#c28b52',
  rodillaCerca: '#c2ac8e',
  tobilloCerca: '#d4be9f',
  caderaLejos: '#6b3f1e',
  tobilloLejos: '#937657',
  colaRaiz: '#c16d36',
  colaMedia: '#c9a175',
  colaPunta: '#937657',
  fauces: '#4a1510',
  lengua: '#c05548',
  colmillo: '#fff8ec',
  parpado: '#6f451d',
  espectral: '#b98cff',
  ojoBrillo: '#ffe6a0',
  sombraSuelo: 'rgba(36,22,8,0.38)',
  /* rosetas de tarjeta: el relleno OSCURO más frecuente del tronco del calco
     (anillos de las rosetas reales) y un tono MEDIO del flanco — medidos con
     un conteo de fills sobre CALCO_POR_REGION.troncoCuerpo (2026-09-05). */
  rosetaTinta: '#3c1c0d',
  rosetaInterior: '#af744a',
});

/* ─────────────────────────── helpers de string ───────────────────────────── */

const H = JT_PIVOTES;
const origin = (n) => ` style="transform-origin:${H[n][0]}px ${H[n][1]}px"`;
const dPoly = (pts) => `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;

const CLIPS = Object.entries(JT_REGIONES)
  .map(([n, pts]) => `<clipPath id="jt-r-${n}"><path d="${dPoly(pts)}"/></clipPath>`)
  .join('\n  ');

/* El calco partido por región (perf): cada región vive UNA vez en <defs>
   como <g id="jtCalco-REGION" clip-path=silueta> con SOLO sus paths — un
   <use> por hueso renderiza ~1/7 de la geometría que el calco global. */
const SILUETA = CALCO_SILUETA_DEFS.replace(/^<defs>/, '').replace(/<\/defs>$/, '');
const CALCO_DEFS = Object.entries(CALCO_POR_REGION)
  .map(([n, ps]) => `<g id="jtCalco-${n}" clip-path="url(#jtSilueta)">${ps}</g>`)
  .join('\n  ');

/** Un hueso: <use> del calco DE SU REGIÓN recortado al polígono exacto. */
const usoCalco = (region) => `<use href="#jtCalco-${region}" clip-path="url(#jt-r-${region})"/>`;

/** Hueso con FADE de articulación: la región entra por MÁSCARA cuya banda
    alta se desvanece (la técnica de anatomia.PATAS_DEL.joint para el raster:
    la pata se FUNDE con el pecho/vientre, no corta en seco — al balancearse
    en la marcha un clip duro parte las rayas del pecho en una línea). */
const usoCalcoFade = (region) => `<use href="#jtCalco-${region}" mask="url(#jt-m-${region})"/>`;
const FADES_ALTO = Object.freeze({
  pataDelCercaAlto: 'jtFadeDel',
  pataDelLejosAlto: 'jtFadeDel',
  pataTrasCercaAlto: 'jtFadeTras',
  pataTrasLejosAlto: 'jtFadeTras',
});
const bbox = (pts, m = 4) => {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs) - m; const y0 = Math.min(...ys) - m;
  return { x: x0, y: y0, w: Math.max(...xs) + m - x0, h: Math.max(...ys) + m - y0 };
};
/* máscaras ACOTADAS a su bbox (x/y/width/height): sin el acote, cada máscara
   evalúa el calco entero — a 6102 paths eso mata el framerate. */
const MASCARAS = Object.entries(FADES_ALTO)
  .map(([n, grad]) => {
    const b = bbox(JT_REGIONES[n]);
    return `<mask id="jt-m-${n}" maskUnits="userSpaceOnUse" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"><path d="${dPoly(JT_REGIONES[n])}" fill="url(#${grad})"/></mask>`;
  })
  .join('\n  ');

/** Casquete/respaldo anti-costura: pintado en el PADRE justo antes del hijo,
    recortado a la región ESTÁTICA del hijo ∩ LA SILUETA del calco (doble
    clip: las regiones son generosas hacia el aire y sin la silueta el
    casquete asomaría como manchón en reposo — visto en el gate del calco).
    Invisible en reposo; tapa exactamente la franja que el hijo desocupa. */
const casquete = (region, forma) =>
  `<g clip-path="url(#jt-r-${region})"><g clip-path="url(#jtSilueta)">${forma}</g></g>`;

/** Casquete TEXTURADO para las junturas grandes (atlas, cuello): en vez de
    color plano —que a tamaño de uso desentona como cuña contra el grabado
    (visto en el gate de giros)— el respaldo es una copia BORROSA del propio
    calco: la franja revelada muestra la textura local difuminada (pelaje
    fuera de foco), nunca un parche inventado. TRIPLE clip: región del hijo ∩
    silueta ∩ BANDA de la juntura — sin la banda, el respaldo pintaba un
    FANTASMA de la corona/orejas donde la cabeza desocupa su PROPIA silueta
    (ahí lo correcto es vacío: la silueta se movió). El clip de silueta va
    POR FUERA del blur para que el borde no sangre un halo. */
const FILTRO_BANDA = { atlas: 'jtBorrosoAtlas', cruz: 'jtBorrosoCruz', colaMedia: 'jtBorrosoColaMedia', colaPunta: 'jtBorrosoColaPunta' };
const casqueteCalco = (region, banda) =>
  `<g clip-path="url(#jt-r-${region})"><g clip-path="url(#jtSilueta)">` +
  `<g clip-path="url(#jt-b-${banda})"><use href="#jtCalco-${region}" filter="url(#${FILTRO_BANDA[banda]})"/></g></g></g>`;

/* Bandas de juntura (elipses generosas centradas en el corte).
   🔴 atlas NO es elipse: es un TRAZO DE NUCA. La elipse subía hasta y≈16 y
   al girar la cabeza a −18° el casquete pintaba una ALETA borrosa parada
   donde lo correcto es cielo (la silueta del cráneo se movió — gate de giros
   2026-08-23, gradiente 14.33 vs 23-25 del pelaje). El borde superior de la
   banda DIBUJA la nuca flexionada: arranca donde muere la nuca estática del
   cuello (~153,45) y cae en curva hasta el borde del cráneo rotado al
   extremo −18° (~108,82) — encima cielo, debajo el casquete sigue tapando
   la juntura (recortarlo todo abría la cuña blanca; un corte recto dejaba
   arista). El resto del contorno es generoso: lo comen los clips de región
   y silueta. */
const BANDAS = `
  <clipPath id="jt-b-atlas"><path d="M153,45 C142,46 132,44 124,43 C118,42 114,41 112,40 L106,60 L106,140 L118,220 L150,266 L232,266 L232,140 L216,58 L186,37 Z"/></clipPath>
  <clipPath id="jt-b-cruz"><ellipse cx="247" cy="152" rx="42" ry="115" transform="rotate(6 247 152)"/></clipPath>
  <clipPath id="jt-b-colaMedia"><circle cx="553" cy="157" r="28"/></clipPath>
  <clipPath id="jt-b-colaPunta"><ellipse cx="676" cy="258" rx="40" ry="19" transform="rotate(20 676 258)"/></clipPath>`;

const elipse = (cx, cy, rx, ry, fill, rot = 0) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
const disco = (cx, cy, r, fill) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  <style>.jt-tarjeta{display:none}[data-tarjeta] .jt-tarjeta{display:inline}</style>
  ${SILUETA}
  ${CALCO_DEFS}
  ${CLIPS}
  ${BANDAS}
  <linearGradient id="jtFadeDel" x1="0" y1="228" x2="0" y2="260" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/>
  </linearGradient>
  <linearGradient id="jtFadeTras" x1="0" y1="214" x2="0" y2="250" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/>
  </linearGradient>
  ${MASCARAS}
  <linearGradient id="jtCuello" x1="200" y1="55" x2="215" y2="250" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#a55524"/>
    <stop offset=".45" stop-color="#cd814a"/>
    <stop offset=".75" stop-color="#b98a5a"/>
    <stop offset="1" stop-color="#d9c8a8"/>
  </linearGradient>
  <radialGradient id="jhAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.espectral}" stop-opacity=".38"/>
    <stop offset="1" stop-color="${P.espectral}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="jhOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="#ffdf8a" stop-opacity=".95"/>
    <stop offset=".45" stop-color="#ffc95e" stop-opacity=".5"/>
    <stop offset="1" stop-color="${P.ojoBrillo}" stop-opacity="0"/>
  </radialGradient>
  <filter id="jhBlur"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="jtTarjetaFondo" filterUnits="userSpaceOnUse" x="196" y="12" width="380" height="280"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="jtBorrosoAtlas" filterUnits="userSpaceOnUse" x="106" y="8" width="132" height="256"><feGaussianBlur stdDeviation="0.9"/></filter>
  <filter id="jtBorrosoCruz" filterUnits="userSpaceOnUse" x="197" y="29" width="108" height="246"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="jtBorrosoColaMedia" filterUnits="userSpaceOnUse" x="521" y="125" width="64" height="64"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="jtBorrosoColaPunta" filterUnits="userSpaceOnUse" x="630" y="233" width="94" height="52"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="jhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.5"/>
  </filter>
  <filter id="jhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="${RH_LINE_BOIL.scale}"/>
  </filter>
</defs>`;

/* ── FAUCES: interior hondo + lengua + colmillos DETRÁS de la mandíbula,
   recortados a la región estática de la mandíbula (en reposo = tapados
   exactos por el mentón del calco; al abrir la charnela se revela boca, no
   hueco). Único dibujo nuevo del módulo, siempre detrás del trazado. ── */
const FAUCES = casquete('mandibula',
  `<rect x="48" y="146" width="56" height="38" fill="${P.fauces}"/>` +
  `<path d="M58,158 C 70,166 88,166 98,158 C 95,172 84,178 74,177 C 65,176 60,168 58,158 Z" fill="${P.lengua}"/>` +
  `<path d="M54,148 L59,161 L64,149 Z M98,148 L93,160 L88,149 Z" fill="${P.colmillo}"/>`);

/* ── PÁRPADOS: los de jaguarHuesos (calibrados a los MISMOS ojos medidos de
   la lámina: (48,78) y (115,79)); la CSS canónica les pone el blink. ── */
const PARPADOS = `
  <path class="jh-parpado" style="transform-origin:46px 65px"
    d="M33,68 C 40,63 54,62 60,68 C 62,74 61,84 58,88 C 50,92 40,91 35,86 C 32,81 31,73 33,68 Z" fill="${P.parpado}"/>
  <path class="jh-parpado" style="transform-origin:114px 62px"
    d="M100,66 C 108,60 122,59 130,66 C 133,73 132,84 128,89 C 119,94 106,92 101,85 C 98,79 98,71 100,66 Z" fill="${P.parpado}"/>`;

/* halos nocturnos: APAGADOS en reposo (opacity:0 inline — la lámina ya trae
   los ojos encendidos y el halo al .75 los lavaba en discos dorados planos,
   visto en el gate de giros). El modo actuando los enciende desde la CSS
   canónica (jhOjoArde anima la opacidad y le gana al inline). */
const HALOS = `
  <circle class="jh-ojoHalo" style="opacity:0" cx="47" cy="78" r="17" fill="url(#jhOjoHalo)"/>
  <circle class="jh-ojoHalo" style="opacity:0" cx="114" cy="79" r="21" fill="url(#jhOjoHalo)"/>`;

/* ── 🔴 BIGOTES OVERLAY: SIN clip, hijos del hueso CABEZA — giran como
   unidad con el cráneo (el fix del caveat: recortados se fragmentaban, y el
   trazado pierde los que salen de la silueta). Trazos verificados en GPU
   headed (scratchpad/jaguar-final.svg, 2026-08-22). ── */
const BIGOTES = `
  <g class="jt-bigotes" fill="none" stroke-linecap="round">
    <g stroke="#2b2116" stroke-width="0.9" opacity="0.5">
      <path d="M60,115 Q39,108 14,97"/>
      <path d="M59,118 Q37,114 10,111"/>
      <path d="M59,121 Q37,122 10,126"/>
      <path d="M60,124 Q40,130 15,140"/>
      <path d="M61,127 Q43,136 20,150"/>
      <path d="M73,119 Q90,114 105,108"/>
      <path d="M73,123 Q90,126 106,129"/>
      <path d="M72,126 Q88,132 101,139"/>
    </g>
    <g stroke="#efe6d4" stroke-width="0.7" opacity="0.45">
      <path d="M59.5,116.5 Q38,110.5 12,99"/>
      <path d="M59.5,122.5 Q38,124 11,129"/>
      <path d="M73,121 Q90,120 105.5,118.5"/>
    </g>
  </g>`;

/* ─────────────────────── LA CABEZA (con sus satélites) ───────────────────── */

const CABEZA = `
  ${usoCalco('cabeza')}
  ${FAUCES}
  <g class="jh-hueso jh-mandibula"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  <g class="jh-hueso jh-orejaI"${origin('orejaI')}>${usoCalco('orejaI')}</g>
  <g class="jh-hueso jh-orejaD"${origin('orejaD')}>${usoCalco('orejaD')}</g>
  <g class="jh-ojoGrupo">${HALOS}${PARPADOS}</g>
  ${BIGOTES}`;

/* ─────────────────────── una pata = 3 huesos anidados ────────────────────── */

const pata = (lado) => {
  const alto = `pata${lado}Alto`;
  const bajo = `pata${lado}Bajo`;
  const zarpa = `pata${lado}Zarpa`;
  const codo = lado.startsWith('Del') ? `codo${lado}` : `rodilla${lado}`;
  const col = {
    DelCerca: [P.codoCerca, P.zarpaCerca],
    DelLejos: [P.penumbraLejos, P.zarpaLejos],
    TrasCerca: [P.rodillaCerca, P.tobilloCerca],
    TrasLejos: [P.rodillaLejos, P.tobilloLejos],
  }[lado];
  return `<g class="jh-hueso jh-pata${lado}"${origin(`pata${lado}`)}>
    ${usoCalcoFade(alto)}
    ${casquete(bajo, disco(H[codo][0], H[codo][1], 15, col[0]))}
    <g class="jh-hueso jh-pata${lado}Bajo"${origin(codo)}>
      ${usoCalco(bajo)}
      ${casquete(zarpa, disco(H[`zarpa${lado}`][0], H[`zarpa${lado}`][1], 12, col[1]))}
      <g class="jh-hueso jh-pata${lado}Zarpa"${origin(`zarpa${lado}`)}>${usoCalco(zarpa)}</g>
    </g>
  </g>`;
};

/* ───────────────────── ROSETAS DE TARJETA (size ≤ 96 px) ─────────────────── */

/* Anillo de MANCHAS (Panthera onca: la roseta es un anillo ROTO de manchas
   con uno o dos puntos adentro, no una barra): radio 30 px de lámina ≈ 5 px a
   64 px, manchas de ~15 px de grosor ≈ 1.2 px — lo mínimo que un anillo
   necesita para leerse como anillo y no como pelota. Más ancho que alto
   (flanco de perfil). `salto` quita una mancha: rompe el anillo. */
const ROSETA_R = 30;
const ROSETA_APLASTE = 0.86;
const ROSETA_MANCHAS = [[0, 1], [58, 0.9], [122, 1.05], [180, 0.95], [238, 1], [300, 0.9]];
const roseta = (cx, cy, rot = 0, salto = -1) => {
  const manchas = ROSETA_MANCHAS.filter((_, i) => i !== salto).map(([a, k], i) => {
    const rad = (a * Math.PI) / 180;
    const bx = (Math.cos(rad) * ROSETA_R).toFixed(1);
    const by = (Math.sin(rad) * ROSETA_R * ROSETA_APLASTE).toFixed(1);
    const tang = (a + 90 + (i % 2 ? 12 : -8)).toFixed(0);
    return `<ellipse cx="${bx}" cy="${by}" rx="${(13 * k).toFixed(1)}" ry="${(7.5 * k).toFixed(1)}" transform="rotate(${tang} ${bx} ${by})"/>`;
  }).join('');
  return `<g class="jt-roseta" transform="translate(${cx} ${cy}) rotate(${rot})">` +
    `<ellipse rx="${ROSETA_R - 4}" ry="${(ROSETA_R * ROSETA_APLASTE - 3).toFixed(1)}" fill="${P.rosetaInterior}" opacity=".5"/>` +
    `<g fill="${P.rosetaTinta}">${manchas}<circle cx="2" cy="-1" r="8"/></g></g>`;
};

/* FONDO: el calco del tronco fuera de foco (σ=10 px de lámina ≈ 0.8 px a
   64 px: atenúa ~96 % el patrón de período ~25 px de las rosetas fundidas y
   deja el tono local). Silueta POR FUERA del blur (sin halo al papel), igual
   que casqueteCalco. Las seis rosetas van en dos filas al tresbolillo sobre
   el tronco (px de lámina, dentro de troncoCuerpo y lejos de las patas
   cercanas, que se pintan después y encima); recortadas a la silueta. */
const TARJETA = `
  <g class="jt-tarjeta">
    <g clip-path="url(#jtSilueta)"><use href="#jtCalco-troncoCuerpo" clip-path="url(#jt-r-troncoCuerpo)" filter="url(#jtTarjetaFondo)"/></g>
    <g clip-path="url(#jtSilueta)">
      ${roseta(304, 104, -8)}${roseta(392, 100, 4)}${roseta(480, 112, 14, 5)}
      ${roseta(312, 186, -10, 3)}${roseta(400, 182, 6)}${roseta(488, 186, 20, 1)}
    </g>
  </g>`;

/* ─────────────────────────── EL SVG COMPLETO ─────────────────────────────── */

/**
 * El markup del jaguar trazado. Mismo contrato que JAGUAR_HUESOS_SVG: el host
 * pone data-agt-estado / data-modo / data-vida / --jh-jaw en la raíz y la
 * CSS canónica (`jaguarHuesos.css`) pone la cadencia.
 */
export const JAGUAR_TRAZADO_SVG = `<svg class="jaguarHuesos" viewBox="-30 -80 765 500" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Jaguar">
${DEFS}
<g class="jh-pj">
  <ellipse class="jh-aura" cx="340" cy="170" rx="330" ry="240" fill="url(#jhAura)"/>
  <g class="jh-masa">
    <g class="jh-antic"${origin('columna')}>
      <ellipse class="jh-sombraSuelo" cx="360" cy="382" rx="235" ry="17" fill="${P.sombraSuelo}" filter="url(#jhBlur)"/>
      <g class="jh-hueso jh-cuerpo"${origin('columna')}>
        ${casquete('pataDelLejosAlto', elipse(155, 252, 36, 32, P.penumbraLejos))}
        ${pata('DelLejos')}
        ${casquete('pataTrasLejosAlto', elipse(436, 252, 38, 32, P.caderaLejos))}
        ${pata('TrasLejos')}
        ${casquete('colaBase', disco(H.colaBase[0], H.colaBase[1], 14, P.colaRaiz))}
        <g class="jh-hueso jh-colaBase"${origin('colaBase')}>
          ${usoCalco('colaBase')}
          ${casqueteCalco('colaMedia', 'colaMedia')}
          <g class="jh-hueso jh-colaMedia"${origin('colaMedia')}>
            ${usoCalco('colaMedia')}
            ${casqueteCalco('colaPunta', 'colaPunta')}
            <g class="jh-hueso jh-colaPunta"${origin('colaPunta')}>${usoCalco('colaPunta')}</g>
          </g>
        </g>
        ${usoCalco('troncoCuerpo')}
        ${TARJETA}
        ${casquete('pataTrasCercaAlto', elipse(524, 254, 46, 36, P.musloCerca))}
        ${pata('TrasCerca')}
        ${casquete('pataDelCercaAlto', elipse(222, 252, 36, 30, P.hombroCerca))}
        ${pata('DelCerca')}
        ${casqueteCalco('cuello', 'cruz')}
        <g class="jh-hueso jh-cuello"${origin('cuello')}>
          ${usoCalco('cuello')}
          ${casqueteCalco('cabeza', 'atlas')}
          <g class="jh-hueso jh-cabezaGiro"${origin('cabeza')}>
            <g class="jh-hueso jh-cabeza"${origin('cabeza')}>
              ${CABEZA}
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

export default JAGUAR_TRAZADO_SVG;
