// ── config.js — calidad adaptativa: 60 FPS es requisito, no deseo ──────────
// Detección por heurística + monitor de frame time en tiempo real. Los
// downgrades son de UNA vía (nunca se sube): si el dispositivo suda, primero
// se baja pixelRatio, luego sombras, luego bloom.

let _cfg = null;

export function detectarConfig() {
  if (_cfg) return _cfg;
  const ua = (navigator.userAgent || '').toLowerCase();
  const coarse = (typeof matchMedia === 'function') && matchMedia('(pointer: coarse)').matches;
  const pequeno = (typeof matchMedia === 'function') && matchMedia('(max-width: 900px)').matches;
  const movil = coarse && pequeno && /mobi|android|iphone|ipad|tablet/i.test(ua);

  // ?baja=1 fuerza la calidad mínima (demos en equipo viejo / headless)
  const baja = typeof location !== 'undefined' && new URLSearchParams(location.search).get('baja') === '1';

  const cfg = {
    movil,
    escritorio: !movil,
    // ⚠️ RESTAURADO 2026-08-06. Sombras, bloom y pixelRatio se habían apagado
    // para "arreglar" 1 FPS que era FALSO: la medición se hizo con el monitor
    // dormido (DPMS off), que estrangula requestAnimationFrame a ~1 Hz. Medido
    // con la pantalla encendida: 59.7 FPS y `ms total: 2.3` — o sea el juego
    // usa 2.3 ms de los 16.6 disponibles. Nunca hubo problema de rendimiento.
    // Si alguien vuelve a bajar esto, que traiga una medición con el monitor
    // ENCENDIDO (shot3d --headed --fps ya lo exige y aborta si está dormido).
    pixelRatio: baja ? 1 : (movil ? 1.5 : 2),
    sombras: !baja,
    sombraRes: baja ? 512 : 2048,
    bloom: !baja,
    bloomRes: 0.5,              // bloom a media res: casi gratis en escritorio
    follaje: baja ? 0.35 : (movil ? 0.55 : 1.0),
    nubes: baja ? 5 : (movil ? 8 : 22),
    viento: 1,
    meshMax: 1,
  };

  // monitor de rendimiento: media móvil de frame time; baja calidad si pasa 20ms
  const mon = {
    acum: 0, n: 0, bajado: false,
    tick(dt) {
      if (this.bajado) return;
      this.acum += dt; this.n++;
      if (this.n >= 40) {
        const prom = this.acum / this.n;
        this.acum = 0; this.n = 0;
        if (prom > 0.021) {
          if (cfg.pixelRatio > 1) {
            cfg.pixelRatio = Math.max(1, cfg.pixelRatio - 0.35);
            cfg._needsResize = true;
          } else if (cfg.sombras) {
            cfg.sombras = false; cfg._needsResize = true;
          } else if (cfg.bloom) {
            cfg.bloom = false; cfg._needsResize = true;
          } else {
            this.bajado = true;
          }
        }
      }
    },
  };
  cfg.mon = mon;
  _cfg = cfg;
  return cfg;
}
