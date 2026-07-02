/**
 * cicloVivoArte.js — arte SVG de "El Ciclo Vivo" (rueda v3 aprobada).
 * =====================================================================
 * Port 1:1 del mockup de decisión v3 (pasada de arte aprobada por el
 * operador). Todo lo que hay aquí son CONSTANTES de dibujo: gradientes,
 * ilustraciones botánicas por especie para el núcleo de la rueda, y la
 * familia unificada de glifos de fase. No hay estado ni datos de usuario.
 *
 * Las ilustraciones se generan como strings SVG (igual que el mockup) y
 * se inyectan con `dangerouslySetInnerHTML` desde los componentes. Es
 * seguro: son constantes de módulo, sin ninguna interpolación de input
 * de usuario.
 */

/* ---- Utilidades de color compartidas por glifos e ilustraciones ---- */
export function mixHex(a, b, t) {
  function h(x) {
    const s = x.replace('#', '');
    return [parseInt(s.substr(0, 2), 16), parseInt(s.substr(2, 2), 16), parseInt(s.substr(4, 2), 16)];
  }
  const A = h(a);
  const B = h(b);
  let o = '#';
  for (let i = 0; i < 3; i++) {
    o += ('0' + Math.round(A[i] + (B[i] - A[i]) * t).toString(16)).slice(-2);
  }
  return o;
}
export function tint(c, t) { return mixHex(c, '#FFFDF8', t); }
export function shade(c, t) { return mixHex(c, '#2B2118', t); }
export const CREAM = '#FBF3E4';

/* ---- Gradientes compartidos de la paleta botánica (van a <defs>) ---- */
export const SPECIES_DEFS =
  '<linearGradient id="gStalk" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#2F4A34"/><stop offset="100%" stop-color="#5B8A52"/></linearGradient>' +
  '<linearGradient id="gVine" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#3F6B36"/><stop offset="100%" stop-color="#6B9A5B"/></linearGradient>' +
  '<linearGradient id="gWood" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#4E3620"/><stop offset="100%" stop-color="#8A6238"/></linearGradient>' +
  '<linearGradient id="gLeafD" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6B9A5B"/><stop offset="100%" stop-color="#35592C"/></linearGradient>' +
  '<linearGradient id="gLeafM" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#82AE6C"/><stop offset="100%" stop-color="#46703B"/></linearGradient>' +
  '<linearGradient id="gLeafL" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#9CC183"/><stop offset="100%" stop-color="#5B8A52"/></linearGradient>' +
  '<linearGradient id="gLeafCafe" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#45794E"/><stop offset="100%" stop-color="#22422B"/></linearGradient>' +
  '<linearGradient id="gCob" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E9B93B"/><stop offset="100%" stop-color="#A8720F"/></linearGradient>' +
  '<linearGradient id="gHusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#5B8A52"/><stop offset="100%" stop-color="#375D2D"/></linearGradient>' +
  '<linearGradient id="gPod" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8FBB7C"/><stop offset="100%" stop-color="#4C7A3D"/></linearGradient>' +
  '<radialGradient id="gTuber" cx="35%" cy="30%" r="90%"><stop offset="0%" stop-color="#F0C287"/><stop offset="55%" stop-color="#DDA55F"/><stop offset="100%" stop-color="#B27939"/></radialGradient>' +
  '<radialGradient id="gTuberL" cx="35%" cy="30%" r="90%"><stop offset="0%" stop-color="#F4CD96"/><stop offset="100%" stop-color="#C68C48"/></radialGradient>' +
  '<radialGradient id="gCherry" cx="35%" cy="30%" r="95%"><stop offset="0%" stop-color="#E8705A"/><stop offset="50%" stop-color="#C0392B"/><stop offset="100%" stop-color="#841E15"/></radialGradient>' +
  '<radialGradient id="gCherryV" cx="35%" cy="30%" r="95%"><stop offset="0%" stop-color="#A9C687"/><stop offset="100%" stop-color="#5F8547"/></radialGradient>' +
  '<radialGradient id="gBerry" cx="38%" cy="25%" r="100%"><stop offset="0%" stop-color="#F07C5A"/><stop offset="45%" stop-color="#D6402F"/><stop offset="100%" stop-color="#9E2317"/></radialGradient>' +
  '<radialGradient id="gFlor" cx="35%" cy="30%" r="95%"><stop offset="0%" stop-color="#E7DAF2"/><stop offset="100%" stop-color="#B497CE"/></radialGradient>';

/* ---- Ilustraciones de especie (centro de la rueda) ---- */

export const CENTER_MAIZ = (function build() {
  let s = '';
  /* tallo con luz */
  s += '<path d="M0,16 C1,8 -1,-4 0.5,-21" stroke="url(#gStalk)" stroke-width="3" fill="none" stroke-linecap="round"/>';
  s += '<path d="M-0.9,14.5 C-0.1,8 -1.9,-3.5 -0.5,-19.5" stroke="#8FBB7C" stroke-width=".8" fill="none" stroke-linecap="round" opacity=".5"/>';
  /* hoja baja izquierda con nervaduras */
  s += '<path d="M0,6 C-7,3 -14,4 -20,10 C-16,13.5 -6,12 0,6 Z" fill="url(#gLeafD)"/>';
  s += '<path d="M-1.2,6.6 C-7,5 -13,5.9 -18.3,9.5" stroke="rgba(251,243,228,.55)" stroke-width=".85" fill="none"/>';
  s += '<path d="M-2.5,8.2 C-7.5,7 -12,7.6 -16,9.8 M-2,5.4 C-6.6,4.2 -11,4.4 -15,6.2" stroke="rgba(251,243,228,.28)" stroke-width=".6" fill="none"/>';
  /* hoja alta izquierda */
  s += '<path d="M0,-12 C-5,-14.5 -11.5,-13.5 -16,-8 C-10,-4.5 -4,-8.5 0,-12 Z" fill="url(#gLeafL)"/>';
  s += '<path d="M-1.3,-11.6 C-6,-12.6 -10.6,-11.6 -14.3,-8.6" stroke="rgba(251,243,228,.5)" stroke-width=".8" fill="none"/>';
  /* hoja derecha */
  s += '<path d="M0,-3 C7,-6.5 15,-6 20.5,0.5 C14,5 5,2 0,-3 Z" fill="url(#gLeafM)"/>';
  s += '<path d="M1.4,-3.2 C7,-5.2 13.4,-4.6 18.6,-0.6" stroke="rgba(251,243,228,.5)" stroke-width=".85" fill="none"/>';
  s += '<path d="M2.4,-1.2 C7.6,-2.6 12.6,-2 17,1" stroke="rgba(251,243,228,.25)" stroke-width=".6" fill="none"/>';
  /* mazorca: capacho atrás, granos en hileras, brillo, barbas y capacho delante */
  s += '<g transform="translate(10,-6) rotate(24)">';
  s += '<path d="M-4.2,3.5 C-7.8,7.5 -8.4,13.4 -5.8,16.8 C-3.2,12.6 -3,7.6 -4.2,3.5 Z" fill="url(#gHusk)"/>';
  s += '<path d="M4.2,3.5 C7.8,7.5 8.4,13.4 5.8,16.8 C3.2,12.6 3,7.6 4.2,3.5 Z" fill="url(#gHusk)" opacity=".85"/>';
  s += '<ellipse rx="5.4" ry="10.6" fill="url(#gCob)"/>';
  /** @type {Array<[number, number[]]>} filas de la mazorca: [y, xs de granos] */
  const rows = [[-7.3, [-1.8, 0, 1.8]], [-4.9, [-3, -1.05, 0.9, 2.85]], [-2.5, [-3.5, -1.7, 0.1, 1.9, 3.6]], [-0.1, [-3.7, -1.8, 0, 1.8, 3.7]], [2.3, [-3.6, -1.9, -0.1, 1.7, 3.5]], [4.7, [-2.9, -1, 0.9, 2.8]], [7.1, [-1.7, 0, 1.7]]];
  rows.forEach(function eachRow(row, ri) {
    row[1].forEach(function eachCol(x, ci) {
      s += '<circle cx="' + x + '" cy="' + row[0] + '" r="1.02" fill="' + (((ri + ci) % 2) ? '#E4AE2C' : '#F7D465') + '"/>';
    });
  });
  s += '<ellipse cx="-1.9" cy="-3.4" rx="1.4" ry="4.4" fill="rgba(255,255,255,.28)" transform="rotate(-10 -1.9 -3.4)"/>';
  s += '<path d="M0,-10.4 C0.6,-12.8 2.2,-14.2 4,-14.8 M0,-10.4 C-0.4,-13 0.4,-15 1.6,-16.2 M0,-10.4 C-1.4,-12.6 -3,-13.6 -4.6,-13.8" stroke="#C98A3D" stroke-width=".8" fill="none" stroke-linecap="round"/>';
  s += '<path d="M-1.5,5 C-4.5,9 -4.6,14.5 -2,17.3 C0.6,13 0.8,8.4 -1.5,5 Z" fill="#4C7A3D"/>';
  s += '<path d="M-1.9,6.6 C-3.4,9.6 -3.5,13.2 -2.5,15.8" stroke="rgba(251,243,228,.35)" stroke-width=".6" fill="none"/>';
  s += '</g>';
  /* espiga con anteras y polen */
  s += '<g stroke="#C9A227" stroke-width="1.3" fill="none" stroke-linecap="round">';
  s += '<path d="M0.5,-21 C0.5,-25.5 0.5,-29 0.5,-32.5"/><path d="M0.5,-21 C-1.8,-25 -4.8,-27.3 -7.8,-29.2"/><path d="M0.5,-21 C2.8,-25 5.8,-27.3 8.8,-29.2"/><path d="M0.5,-21 C-0.8,-25.8 -2.6,-28.8 -4.2,-30.8"/><path d="M0.5,-21 C1.8,-25.8 3.6,-28.8 5.2,-30.8"/>';
  s += '</g>';
  s += '<path d="M-4.4,-26.6 L-5,-25 M3.6,-27 L4.2,-25.4 M-1.6,-29.4 L-2.1,-27.8 M2,-25.4 L2.4,-23.8" stroke="#E8B84B" stroke-width=".8" stroke-linecap="round" fill="none"/>';
  s += '<g fill="#F2C744"><circle cx="0.5" cy="-33" r="1.1"/><circle cx="-8.3" cy="-29.7" r="1"/><circle cx="9.3" cy="-29.7" r="1"/><circle cx="-4.6" cy="-31.4" r=".85"/><circle cx="5.7" cy="-31.4" r=".85"/></g>';
  s += '<g fill="#F2C744" opacity=".5"><circle cx="12.2" cy="-26.4" r=".7"/><circle cx="-11.2" cy="-26.8" r=".7"/></g>';
  return s;
})();

export const CENTER_PAPA = (function build() {
  function leaflet(x, y, rot, rx, ry, grad) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')">' +
      '<ellipse rx="' + rx + '" ry="' + ry + '" fill="url(#' + grad + ')"/>' +
      '<path d="M0,' + (ry * 0.72).toFixed(1) + ' L0,' + (-ry * 0.72).toFixed(1) + '" stroke="rgba(251,243,228,.5)" stroke-width=".6" fill="none"/>' +
      '</g>';
  }
  function florPapa(x, y, sc, rot) {
    let s = '<g transform="translate(' + x + ',' + y + ') scale(' + sc + ') rotate(' + rot + ')">';
    [[0, -2.7, 0], [2.57, -0.83, 72], [1.59, 2.18, 144], [-1.59, 2.18, 216], [-2.57, -0.83, 288]].forEach(function eachPetal(p) {
      s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="2" ry="3.1" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')" fill="url(#gFlor)" stroke="#A98BC4" stroke-width=".4"/>';
    });
    return s + '<path d="M0,-1.9 L1.5,1.2 L-1.5,1.2 Z" fill="#E8B84B" stroke="#C9931F" stroke-width=".4"/></g>';
  }
  let s = '';
  /* raicillas hacia los tubérculos */
  s += '<g stroke="#A87C4F" stroke-width=".9" fill="none" opacity=".9" stroke-linecap="round">';
  s += '<path d="M0,16 C-4,19 -7,21.5 -9.5,23.5"/><path d="M0,16 C3,19.5 5.5,22.5 7.5,25"/><path d="M0,16 C-0.5,18 -0.8,19.5 -0.8,20.5"/>';
  s += '<path d="M-4,18.5 C-5.5,19 -6.5,19.8 -7.5,20.6 M3,19.5 C4.5,20 5.5,20.8 6.5,21.4" stroke-width=".6" opacity=".7"/>';
  s += '</g>';
  /* tubérculos con volumen, ojos y lenticelas */
  s += '<g stroke="#7A5230" stroke-width=".9">';
  s += '<ellipse cx="-11" cy="26" rx="7.6" ry="5.4" fill="url(#gTuber)" transform="rotate(-14 -11 26)"/>';
  s += '<ellipse cx="9.5" cy="27.5" rx="8" ry="5.6" fill="url(#gTuber)" transform="rotate(11 9.5 27.5)"/>';
  s += '<ellipse cx="-0.5" cy="21" rx="5" ry="3.8" fill="url(#gTuberL)"/>';
  s += '</g>';
  s += '<g stroke="#6E4A28" stroke-width=".75" fill="none" stroke-linecap="round">';
  s += '<path d="M-14.5,24 q1.1,-1 2.2,-0.3 M-8.6,27.6 q1.1,-.9 2.2,-.2 M6.8,26.4 q1.1,-.9 2.2,-.2 M12.4,29.2 q1.1,-.9 2.2,-.2 M-1.8,20.4 q.9,-.8 1.8,-.2"/>';
  s += '</g>';
  s += '<g fill="#C08A4E" opacity=".55"><circle cx="-12.8" cy="28.2" r=".5"/><circle cx="-7.2" cy="24.6" r=".5"/><circle cx="9.8" cy="30" r=".5"/><circle cx="13.6" cy="26.6" r=".5"/><circle cx="1.6" cy="22.4" r=".45"/></g>';
  /* tallos */
  s += '<g stroke="url(#gStalk)" stroke-width="1.9" fill="none" stroke-linecap="round">';
  s += '<path d="M0,16 C-3,9 -7,3 -10,-3"/><path d="M0,16 C0,8 0.5,0 1,-10"/><path d="M0,16 C4,10 8,4 11,-1"/>';
  s += '</g>';
  /* follaje compuesto (foliolos con nervadura) */
  s += leaflet(-12.5, -6.5, -32, 3.4, 4.8, 'gLeafD');
  s += leaflet(-6.8, -9.8, -14, 3, 4.3, 'gLeafM');
  s += leaflet(-13, 1.5, -60, 2.8, 4, 'gLeafM');
  s += leaflet(-5.8, 3, -42, 2.8, 4, 'gLeafD');
  s += leaflet(-2.8, -6.6, -20, 2.7, 3.9, 'gLeafL');
  s += leaflet(4.6, -5.8, 18, 2.7, 3.9, 'gLeafM');
  s += leaflet(13.5, -4.5, 31, 3.4, 4.8, 'gLeafD');
  s += leaflet(8.2, -8.8, 14, 3, 4.3, 'gLeafM');
  s += leaflet(13.8, 3, 58, 2.8, 4, 'gLeafM');
  s += leaflet(6.6, 5, 44, 2.8, 4, 'gLeafD');
  /* tallito floral y flores de papa (corola lila, antera dorada) */
  s += '<path d="M1,-10 C0.8,-12.5 0.4,-15 0,-17" stroke="#4C7A3D" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  s += '<path d="M0.6,-13.5 C2.4,-14.5 4.2,-15.4 5.6,-16" stroke="#4C7A3D" stroke-width=".8" fill="none" stroke-linecap="round"/>';
  s += florPapa(0, -20, 1, 0);
  s += florPapa(6, -16.5, 0.72, 18);
  s += '<ellipse cx="-4.6" cy="-16" rx="1.5" ry="2" fill="#B497CE" transform="rotate(-18 -4.6 -16)"/>';
  s += '<path d="M-3.9,-14.3 C-2.9,-13.1 -1.9,-12 -1,-11" stroke="#4C7A3D" stroke-width=".8" fill="none" stroke-linecap="round"/>';
  return s;
})();

export const CENTER_CAFE = (function build() {
  /* hoja de café: brillo, nervadura central y laterales */
  function hoja(tx, ty, rot, sx, sy) {
    return '<g transform="translate(' + tx + ',' + ty + ') rotate(' + rot + ') scale(' + sx + ',' + sy + ')">' +
      '<path d="M0,0 C2.4,-4.4 8,-5.6 11.5,-3 C9.4,1 3.6,1.4 0,0 Z" fill="url(#gLeafCafe)"/>' +
      '<path d="M0.8,-0.4 C4.4,-2.2 8,-2.9 10.6,-2.8" stroke="rgba(220,235,205,.55)" stroke-width=".7" fill="none"/>' +
      '<path d="M3,-1.4 C3.6,-2.5 4.4,-3.4 5.4,-4 M5.6,-1.9 C6.2,-2.9 7.1,-3.7 8,-4.2 M3.2,-0.7 C4,-0.3 4.9,-0.1 5.7,0 M6,-1 C6.8,-0.7 7.7,-0.6 8.5,-0.6" stroke="rgba(220,235,205,.3)" stroke-width=".5" fill="none"/>' +
      '<path d="M1.6,-2.4 C4.6,-4.3 8,-4.9 10.3,-3.6" stroke="rgba(255,255,255,.22)" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }
  /* cereza con brillo y ombligo */
  function cereza(x, y, r, grad, st) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="url(#' + grad + ')" stroke="' + st + '" stroke-width=".45"/>' +
      '<circle cx="' + (x - r * 0.34).toFixed(1) + '" cy="' + (y - r * 0.36).toFixed(1) + '" r=".62" fill="rgba(255,255,255,.55)"/>' +
      '<circle cx="' + x + '" cy="' + (y + r * 0.74).toFixed(1) + '" r=".4" fill="#4A100B" opacity=".8"/>';
  }
  let s = '';
  /* tronco leñoso y ramas */
  s += '<path d="M-1,16 C-1,6 0,-8 2,-24" stroke="url(#gWood)" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  s += '<path d="M0,-2 C5,-3.5 11,-4.5 16,-3.8" stroke="url(#gWood)" stroke-width="1.7" fill="none" stroke-linecap="round"/>';
  s += '<path d="M1,-13 C-4,-14.5 -10,-15.5 -15,-14.8" stroke="url(#gWood)" stroke-width="1.7" fill="none" stroke-linecap="round"/>';
  /* hojas brillantes en pares */
  s += hoja(16, -3.8, -32, 1, 1);
  s += hoja(15, -3.2, 26, 0.95, 0.95);
  s += hoja(-15, -14.8, 30, -1, 1);
  s += hoja(-14, -14.2, -25, -0.95, 0.95);
  s += hoja(2, -24, -65, 0.85, 0.85);
  s += hoja(2, -24, 65, -0.85, 0.85);
  /* cerezas pegadas a la rama, como en el cafeto real */
  s += cereza(6, -1.4, 2.6, 'gCherry', '#7A1F16');
  s += cereza(9.8, -0.6, 2.6, 'gCherry', '#7A1F16');
  s += cereza(7.6, -4.6, 2.5, 'gCherry', '#7A1F16');
  s += cereza(11.6, -3.4, 2.4, 'gCherry', '#7A1F16');
  s += cereza(13.4, -0.4, 2.2, 'gCherryV', '#47702F');
  s += cereza(-6.5, -12.4, 2.4, 'gCherry', '#7A1F16');
  s += cereza(-9.9, -11.8, 2.3, 'gCherry', '#7A1F16');
  s += cereza(-12.6, -13.2, 2.2, 'gCherry', '#7A1F16');
  /* florecitas blancas de nudo */
  s += '<g transform="translate(3,-8.6)" fill="#FFFDF8"><circle cx="-1.2" cy="0" r="1"/><circle cx="1.2" cy="0" r="1"/><circle cx="0" cy="-1.2" r="1"/><circle cx="0" cy="1.2" r="1"/><circle r=".7" fill="#F2C744"/></g>';
  s += '<g transform="translate(-4.2,-10.6) scale(.7)" fill="#FFFDF8"><circle cx="-1.2" cy="0" r="1"/><circle cx="1.2" cy="0" r="1"/><circle cx="0" cy="-1.2" r="1"/><circle cx="0" cy="1.2" r="1"/><circle r=".7" fill="#F2C744"/></g>';
  return s;
})();

export const CENTER_FRESA = (function build() {
  /* foliolo aserrado con nervaduras */
  function foliolo(rot, sc, grad) {
    return '<g transform="rotate(' + rot + ') scale(' + sc + ')">' +
      '<path d="M0,0 C-4.2,-0.8 -6,-4 -5,-8 Q-3.4,-6.9 -2.8,-8.6 Q-1.4,-7.4 0,-9 Q1.4,-7.4 2.8,-8.6 Q3.4,-6.9 5,-8 C6,-4 4.2,-0.8 0,0 Z" fill="url(#' + grad + ')"/>' +
      '<path d="M0,-1 L0,-7.4 M-0.6,-2.2 C-1.9,-3.3 -3,-4.6 -3.6,-5.9 M0.6,-2.2 C1.9,-3.3 3,-4.6 3.6,-5.9" stroke="rgba(251,243,228,.5)" stroke-width=".6" fill="none"/>' +
      '</g>';
  }
  function hojaTrifoliada(x, y, rot, sc, g1, g2) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + sc + ')">' +
      foliolo(-52, 0.8, g2) + foliolo(48, 0.8, g2) + foliolo(0, 1, g1) +
      '</g>';
  }
  let s = '';
  /* pecíolos desde la corona */
  s += '<path d="M0,13 C-3,13 -5.6,12.9 -7.8,12.4 M0,13 C3,13 5.8,12.7 8.6,12.2 M0,13 C0.3,12 0.4,11.2 0.5,10.6" stroke="#4C7A3D" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  /* estolón con hijuelo (la fresa camina) */
  s += '<path d="M-1.5,14 C-8,16.6 -14,17 -19,14.6" stroke="#C0625A" stroke-width=".9" fill="none" stroke-linecap="round"/>';
  s += '<g transform="translate(-19,14.4) scale(.55)"><path d="M0,0 C-1.6,-3.4 -4.8,-4 -6,-1.8 C-4.6,0.4 -1.8,0.6 0,0 Z" fill="url(#gLeafM)"/><path d="M0,0 C1.6,-3.4 4.8,-4 6,-1.8 C4.6,0.4 1.8,0.6 0,0 Z" fill="url(#gLeafD)"/></g>';
  /* hojas trifoliadas */
  s += hojaTrifoliada(0.5, 10.8, -2, 0.92, 'gLeafL', 'gLeafM');
  s += hojaTrifoliada(-8, 12.6, -34, 0.95, 'gLeafD', 'gLeafM');
  s += hojaTrifoliada(9, 12.2, 32, 1, 'gLeafM', 'gLeafD');
  /* corona */
  s += '<path d="M-2.4,13.8 L0,12 L2.4,13.8" stroke="#8B5E34" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
  /* tallo floral y flor blanca */
  s += '<path d="M-1,13 C-6,6.5 -9.8,-1 -11.8,-7.6" stroke="#5B8A52" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  s += '<g transform="translate(-12,-10)">';
  [[0, -3, 0], [2.85, -0.93, 72], [1.76, 2.43, 144], [-1.76, 2.43, 216], [-2.85, -0.93, 288]].forEach(function eachPetal(p) {
    s += '<ellipse cx="' + p[0] + '" cy="' + p[1] + '" rx="2.2" ry="2.9" transform="rotate(' + p[2] + ' ' + p[0] + ' ' + p[1] + ')" fill="#FFFDF8" stroke="#E7D9B8" stroke-width=".5"/>';
  });
  s += '<circle r="1.8" fill="#F2C744"/>';
  [[0, -1.05], [1, -0.32], [0.62, 0.85], [-0.62, 0.85], [-1, -0.32]].forEach(function eachDot(p) {
    s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".38" fill="#C9931F"/>';
  });
  s += '</g>';
  /* tallo del fruto y fresa madura */
  s += '<path d="M2,13 C8,8 12.5,2 14.7,-4.8" stroke="#5B8A52" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
  s += '<g transform="translate(15,-7) scale(.92)">';
  s += '<path d="M0,-0.5 C5.4,-0.5 7.4,3.6 5.9,7.9 C4.5,12 2,14.4 0,15.8 C-2,14.4 -4.5,12 -5.9,7.9 C-7.4,3.6 -5.4,-0.5 0,-0.5 Z" fill="url(#gBerry)"/>';
  s += '<path d="M-3.6,2 C-4.6,4.8 -4.2,8 -2.8,10.8" stroke="rgba(255,255,255,.45)" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  s += '<g fill="#F2C744" stroke="#A8641A" stroke-width=".3">';
  [[-2.2, 3.2], [0, 2.6], [2.2, 3.2], [-2.9, 5.9], [-0.8, 5.4], [1.2, 5.4], [3, 5.9], [-1.9, 8.6], [0.2, 8.4], [2.1, 8.6], [-0.8, 11.2], [1.2, 11.2], [0.2, 13.4]].forEach(function eachSeed(p) {
    s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r=".58"/>';
  });
  s += '</g>';
  s += '<path d="M-4.8,-0.6 L-2.7,-3.2 L-0.9,-1 L0,-3.9 L0.9,-1 L2.7,-3.2 L4.8,-0.6 Q0,2 -4.8,-0.6 Z" fill="#4C7A3D"/>';
  s += '<path d="M0,-2.8 L-0.5,-5.2" stroke="#5B8A52" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  s += '</g>';
  return s;
})();

export const CENTER_FRIJOL = (function build() {
  /* hoja acorazonada con nervaduras */
  function hoja(x, y, rot, sc, grad) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ') scale(' + sc + ')">' +
      '<path d="M0,-1.5 C-1.8,-4.8 -6.6,-4.8 -6.6,-1.6 C-6.6,1.2 -2.9,3 0,5.4 C2.9,3 6.6,1.2 6.6,-1.6 C6.6,-4.8 1.8,-4.8 0,-1.5 Z" fill="url(#' + grad + ')"/>' +
      '<path d="M0,-2.4 L0,4.4 M-0.5,-0.3 C-1.9,-0.7 -3.3,-0.9 -4.5,-0.7 M0.5,-0.3 C1.9,-0.7 3.3,-0.9 4.5,-0.7" stroke="rgba(251,243,228,.5)" stroke-width=".6" fill="none"/>' +
      '</g>';
  }
  /* vaina rolliza: cuerpo en trazo grueso, granos marcados, quilla clara y piquito */
  function vaina(tx, ty, rot, sx) {
    return '<g transform="translate(' + tx + ',' + ty + ') rotate(' + rot + ') scale(' + sx + ',1)">' +
      '<path d="M-0.4,0.4 C1.4,3.4 1.8,7.6 0.8,11.6 C0.5,12.8 0,13.8 -0.6,14.5" stroke="url(#gPod)" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<path d="M-0.7,14.8 C-1.1,15.4 -1.6,15.8 -2.1,16" stroke="#4C7A3D" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '<g fill="#2E5026" opacity=".32"><ellipse cx="0.4" cy="3.2" rx="1.15" ry="1.35"/><ellipse cx="0.8" cy="6.2" rx="1.15" ry="1.35"/><ellipse cx="0.6" cy="9.2" rx="1.1" ry="1.3"/><ellipse cx="0" cy="11.8" rx="1" ry="1.2"/></g>' +
      '<path d="M1,2 C2.3,5.2 2.5,8.8 1.5,12" stroke="rgba(251,243,228,.55)" stroke-width=".6" fill="none" stroke-linecap="round"/>' +
      '<path d="M-0.5,-0.7 C-1.1,-1.5 -1.9,-2 -2.8,-2.2" stroke="#4C7A3D" stroke-width="1" fill="none" stroke-linecap="round"/>' +
      '</g>';
  }
  let s = '';
  /* tutor de madera */
  s += '<path d="M6,16 L-3,-29" stroke="url(#gWood)" stroke-width="2.8" stroke-linecap="round"/>';
  /* guía voluble con brillo */
  s += '<path d="M-5,16 C1,12 9,7.5 3,2.5 C-3,-1.5 8,-6.5 3,-11.5 C-2,-16 7,-19.5 1,-24.5" stroke="url(#gVine)" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  s += '<path d="M-5.6,15.3 C0.2,11.4 8,7.2 2.2,2.2" stroke="#8FBB7C" stroke-width=".7" fill="none" opacity=".55" stroke-linecap="round"/>';
  /* la guía abraza el tutor: segmentos del palo por encima */
  s += '<path d="M4.72,6.4 L4,10" stroke="url(#gWood)" stroke-width="2.8" stroke-linecap="round"/>';
  s += '<path d="M-0.92,-18.6 L-0.28,-15.4" stroke="url(#gWood)" stroke-width="2.8" stroke-linecap="round"/>';
  /* zarcillo */
  s += '<path d="M1,-24.5 C0,-27.5 3,-29.5 4.2,-27.6 C5.2,-26 3.2,-25.3 3.2,-26.8" stroke="#5B8A52" stroke-width="1.1" fill="none" stroke-linecap="round"/>';
  /* pedúnculos y hojas */
  s += '<path d="M-1,-2 C-3,-2.2 -5,-2.4 -6.8,-2.6 M4,-9 C5.6,-9.2 7.2,-9.4 8.6,-9.6 M0.5,-18 C-1,-18.5 -2.6,-19 -4,-19.4" stroke="#4C7A3D" stroke-width="1" fill="none" stroke-linecap="round"/>';
  s += hoja(-9, -3, -16, 1, 'gLeafD');
  s += hoja(10.5, -10, 18, 0.92, 'gLeafM');
  s += hoja(-6.5, -20, -8, 0.72, 'gLeafL');
  /* florecitas lila de fríjol */
  s += '<path d="M5,-13.2 C6,-14 7,-14.8 7.5,-15.4" stroke="#4C7A3D" stroke-width=".8" fill="none" stroke-linecap="round"/>';
  s += '<g transform="translate(7.5,-16)"><circle r="1.7" fill="#D9C6EA"/><ellipse cx="0.3" cy="1.3" rx="1.3" ry=".9" fill="#B99BD4"/><circle cx="-0.3" cy="-0.3" r=".45" fill="#FFFDF8"/></g>';
  s += '<g transform="translate(10,-14) scale(.75)"><circle r="1.7" fill="#D9C6EA"/><ellipse cx="0.3" cy="1.3" rx="1.3" ry=".9" fill="#B99BD4"/><circle cx="-0.3" cy="-0.3" r=".45" fill="#FFFDF8"/></g>';
  /* vainas colgando de las axilas, despejadas de la guía */
  s += vaina(13, -7.5, 14, 1);
  s += vaina(-13, -5, -4, -0.9);
  return s;
})();

/* ---- Glifos de fase: familia unificada ----
   Reglas de la familia: silueta llena en el color de fase, una capa de luz
   (tint), detalle interior en crema con trazo .8-.9, tallos a 1.6-1.7,
   puntas redondas. Cada glifo cuenta su fase de un vistazo. */
export const GLYPHS = {
  semilla(c) {
    return '<path d="M0,-8.3 C5.6,-7.4 8,-2.6 6.6,2.6 C5.3,7.4 -5.3,7.4 -6.6,2.6 C-8,-2.6 -5.6,-7.4 0,-8.3 Z" fill="' + c + '"/>' +
      '<path d="M-1.2,-7.7 C-4.9,-6.5 -6.7,-2.8 -5.8,1.6 C-5.4,3.7 -4.1,5.3 -2.4,6.1 C-4.4,1.4 -4.1,-3.8 -1.2,-7.7 Z" fill="' + tint(c, 0.32) + '"/>' +
      '<path d="M1.1,-4.4 C3.3,-2.2 3.6,1.2 1.9,4.5" stroke="' + CREAM + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="1" cy="-4.8" r="1.15" fill="' + CREAM + '"/>';
  },
  germinacion(c) {
    return '<path d="M-1.2,4.4 C-4.5,4 -6.2,5.9 -5.8,8.4 C-3.5,9.1 -1,7.6 -0.3,5.3 Z" fill="#8B5E34"/>' +
      '<path d="M1.2,4.4 C4.5,4 6.2,5.9 5.8,8.4 C3.5,9.1 1,7.6 0.3,5.3 Z" fill="' + tint('#8B5E34', 0.25) + '"/>' +
      '<path d="M0,5.6 C0.2,3 0.1,0.4 0,-2" stroke="' + c + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
      '<path d="M0,-2 C-1.8,-6.6 -6.3,-8.2 -8.9,-6 C-7.5,-2.4 -3.3,-1.2 0,-2 Z" fill="' + c + '"/>' +
      '<path d="M0,-2 C1.6,-5.9 5.6,-7.5 8.2,-5.5 C6.9,-2.1 3.1,-1.1 0,-2 Z" fill="' + tint(c, 0.28) + '"/>' +
      '<path d="M-1.3,-2.8 C-3.4,-3.8 -5.5,-4.7 -7.3,-5.3 M1.2,-2.7 C3,-3.6 4.9,-4.4 6.6,-4.9" stroke="' + CREAM + '" stroke-width=".85" fill="none" stroke-linecap="round"/>';
  },
  crecimiento(c) {
    return '<path d="M0,8.8 C0.3,3 0.2,-3 0,-8.4" stroke="' + c + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
      '<path d="M-0.2,3.4 C-2.2,-0.2 -6.6,-1.4 -9.3,0.6 C-7.7,4 -3.2,4.6 -0.2,3.4 Z" fill="' + c + '"/>' +
      '<path d="M0.2,-1 C2.2,-4.6 6.6,-5.8 9.3,-3.8 C7.7,-0.4 3.2,0.2 0.2,-1 Z" fill="' + tint(c, 0.22) + '"/>' +
      '<path d="M0,-8.4 C-0.9,-11 -3.5,-11.9 -5.3,-10.5 C-4.3,-8.3 -2,-7.8 0,-8.4 Z" fill="' + tint(c, 0.38) + '"/>' +
      '<path d="M0,-8.4 C0.8,-10.4 2.8,-11.2 4.3,-10.2 C3.5,-8.5 1.7,-8 0,-8.4 Z" fill="' + tint(c, 0.5) + '"/>' +
      '<path d="M-1.4,3 C-3.7,1.9 -5.9,1 -7.8,0.7 M1.4,-1.4 C3.7,-2.5 5.9,-3.4 7.8,-3.7" stroke="' + CREAM + '" stroke-width=".85" fill="none" stroke-linecap="round"/>';
  },
  floracion(c) {
    let s = '';
    for (let k = 0; k < 5; k++) {
      const a = (-90 + k * 72) * Math.PI / 180;
      const x = +(4.9 * Math.cos(a)).toFixed(2);
      const y = +(4.9 * Math.sin(a)).toFixed(2);
      s += '<ellipse cx="' + x + '" cy="' + y + '" rx="3.1" ry="4.6" transform="rotate(' + (k * 72) + ' ' + x + ' ' + y + ')" fill="' + (k % 2 ? tint(c, 0.18) : c) + '" stroke="' + CREAM + '" stroke-width=".8"/>';
    }
    s += '<circle r="2.75" fill="#F2C744"/>';
    for (let k = 0; k < 5; k++) {
      const a = (-90 + k * 72) * Math.PI / 180;
      s += '<circle cx="' + (1.55 * Math.cos(a)).toFixed(2) + '" cy="' + (1.55 * Math.sin(a)).toFixed(2) + '" r=".5" fill="#C9931F"/>';
    }
    return s;
  },
  fructificacion(c) {
    return '<path d="M0.4,-6.2 C1,-8.2 2.2,-9.5 4,-10.1" stroke="#4C7A3D" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M1,-7.5 C3.6,-10.6 8,-10.8 10,-8.6 C8.2,-6 4.2,-5.8 1,-7.5 Z" fill="#5B8A52"/>' +
      '<path d="M2.4,-7.8 C4.8,-8.9 7,-9.2 8.8,-8.7" stroke="' + CREAM + '" stroke-width=".75" fill="none"/>' +
      '<circle cy="1.9" r="6.9" fill="' + c + '"/>' +
      '<ellipse cy="5.4" rx="4.6" ry="2.4" fill="' + shade(c, 0.25) + '" opacity=".45"/>' +
      '<ellipse cx="-2.5" cy="-0.6" rx="2.1" ry="1.25" fill="rgba(255,255,255,.45)" transform="rotate(-30 -2.5 -0.6)"/>' +
      '<circle cx="0.3" cy="-4.8" r=".75" fill="' + shade(c, 0.35) + '"/>';
  },
  cosecha(c) {
    return '<circle cx="-3.4" cy="-4.6" r="2.15" fill="#E9B93B"/><circle cx="1.2" cy="-5.9" r="2.15" fill="#D6572A"/><circle cx="5" cy="-3.8" r="1.95" fill="#7CA46B"/>' +
      '<circle cx="-4.1" cy="-5.3" r=".6" fill="rgba(255,255,255,.6)"/><circle cx="0.5" cy="-6.6" r=".6" fill="rgba(255,255,255,.6)"/><circle cx="4.4" cy="-4.5" r=".55" fill="rgba(255,255,255,.6)"/>' +
      '<path d="M-8.8,-2.2 C-4.9,-3.6 4.9,-3.6 8.8,-2.2 L6.6,7.3 C4.1,8.5 -4.1,8.5 -6.6,7.3 Z" fill="' + c + '"/>' +
      '<path d="M-8.8,-2.2 C-4.9,-3.6 4.9,-3.6 8.8,-2.2 L8.4,-0.5 C4.7,-1.8 -4.7,-1.8 -8.4,-0.5 Z" fill="' + shade(c, 0.28) + '"/>' +
      '<path d="M-7.6,1.7 C-3.2,0.6 3.2,0.6 7.6,1.7 M-6.9,4.6 C-2.9,3.7 2.9,3.7 6.9,4.6" stroke="' + CREAM + '" stroke-width=".85" fill="none" opacity=".75"/>' +
      '<path d="M-3.2,-2.9 L-2.6,8 M3.2,-2.9 L2.6,8" stroke="' + shade(c, 0.2) + '" stroke-width="1" opacity=".55"/>';
  },
  poscosecha(c) {
    return '<path d="M-3.3,-4.6 C-4.4,-6.7 -3.1,-8.5 -1.1,-8.9 L1.1,-8.9 C3.1,-8.5 4.4,-6.7 3.3,-4.6 Z" fill="' + tint(c, 0.22) + '"/>' +
      '<path d="M-3.4,-4.6 L3.4,-4.6 C6.8,-2.5 8,1.9 6.6,7.7 L-6.6,7.7 C-8,1.9 -6.8,-2.5 -3.4,-4.6 Z" fill="' + c + '"/>' +
      '<path d="M-3.4,-4.6 C-6.8,-2.5 -8,1.9 -6.6,7.7 L-4.4,7.7 C-5.5,2.1 -4.9,-1.9 -3.4,-4.6 Z" fill="' + shade(c, 0.18) + '" opacity=".65"/>' +
      '<path d="M-4.1,-4.6 L4.1,-4.6" stroke="#5A3D22" stroke-width="1.7" stroke-linecap="round"/>' +
      '<circle cy="-4.6" r=".95" fill="#5A3D22"/>' +
      '<path d="M0.2,-2.9 L0.2,6.6" stroke="' + CREAM + '" stroke-width="1" stroke-dasharray="1.8 1.7" opacity=".85" fill="none"/>' +
      '<g fill="' + CREAM + '" opacity=".9"><circle cx="-3.5" cy="3" r=".8"/><circle cx="-2.1" cy="5.5" r=".8"/><circle cx="3" cy="2.4" r=".8"/><circle cx="4.2" cy="5.2" r=".8"/></g>' +
      '<circle cx="8.3" cy="8.3" r=".85" fill="' + tint(c, 0.3) + '"/><circle cx="6.5" cy="9.2" r=".8" fill="' + tint(c, 0.15) + '"/>';
  },
};

/* Ojo de "qué observar": párpado almendrado, iris con brillo y pestañas */
export const EYE_SVG_INNER =
  '<path d="M12,4.6 L12,2.4 M6.2,6.1 L4.9,4.3 M17.8,6.1 L19.1,4.3" stroke="#C98A3D" stroke-width="1.6" stroke-linecap="round" fill="none"/>' +
  '<path d="M2.6,14 C6.5,8 17.5,8 21.4,14 C17.5,20 6.5,20 2.6,14 Z" fill="#FFFDF8" stroke="#C98A3D" stroke-width="1.7" stroke-linejoin="round"/>' +
  '<circle cx="12" cy="14" r="3.5" fill="#8B5E34"/><circle cx="12" cy="14" r="1.5" fill="#3E2A16"/><circle cx="13.3" cy="12.8" r=".9" fill="#FBF3E4"/>';

/* ================= GEOMETRÍA DE LA RUEDA (v3) ================= */
export const CX = 180;
export const CY = 172;
export const STEP_DEG = 360 / 7; // 51.43°
export const DEG0 = -90; // semilla arriba
export const R0 = 62;
export const RSTEP = 13; // el radio crece con cada fase

export function polar(deg, r) {
  const a = deg * Math.PI / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
}
export function phaseDeg(i) { return DEG0 + i * STEP_DEG; }
export function phaseR(i) { return R0 + i * RSTEP; }
export function rAtDeg(deg) { return R0 + RSTEP * (deg - DEG0) / STEP_DEG; }

/**
 * Espiral discretizada como polilínea (igual que el mockup v3). Devuelve
 * también la longitud total calculada numéricamente — a diferencia del
 * mockup no necesitamos un <path> temporal del DOM para medirla, porque
 * la polilínea se mide sumando segmentos (necesaria para la animación
 * stroke-dasharray de "tallo que crece").
 */
export function spiralPath(degFrom, degTo, rFrom, rTo) {
  const n = Math.max(2, Math.ceil(Math.abs(degTo - degFrom) / 3));
  const pts = [];
  let len = 0;
  let prev = null;
  for (let j = 0; j <= n; j++) {
    const t = j / n;
    const d = degFrom + (degTo - degFrom) * t;
    const r = rFrom + (rTo - rFrom) * t;
    const p = polar(d, r);
    if (prev) len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
    pts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
  }
  return { d: 'M' + pts.join(' L'), len: Math.ceil(len) + 2 };
}
