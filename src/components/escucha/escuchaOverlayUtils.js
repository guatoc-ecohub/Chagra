/**
 * Utilidades puras para EscuchaOverlay.
 * Se mantienen fuera del archivo del componente para no romper react-refresh.
 */
export function esIOSLike(userAgent = '') {
  return /iPad|iPhone|iPod/i.test(userAgent);
}

export function mensajeErrorMicrofono(err, userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : '')) {
  const base = 'No pude usar el micrófono. Revise el permiso del navegador.';
  const detalle = String(err?.message || err || '');
  const detalleNorm = detalle.toLowerCase();
  if (
    detalleNorm.includes('permission') ||
    detalleNorm.includes('notallowederror') ||
    detalleNorm.includes('mediadevices') ||
    detalleNorm.includes('getusermedia')
  ) {
    if (esIOSLike(userAgent)) {
      return 'No pude usar el micrófono. Revise el permiso del navegador. En iPhone, abra Ajustes, Safari, Micrófono y permita este sitio.';
    }
    return base;
  }
  return detalle || 'No pude empezar a escuchar.';
}
