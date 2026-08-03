/**
 * TintaCuphead — la TINTA compartida del "Metal Slug del campo" (SOLO ARTE).
 *
 * Trae al juego el lenguaje del rig rubber-hose aprobado (guias-rig F2,
 * rig.css + guias.js) y el DR de animación rubber-hose:
 *
 *   - LINE-BOIL canónico: feTurbulence de 3 semillas cicladas a ~8 fps
 *     (SMIL, calcMode discrete — el salto ES el "cuadro nuevo dibujado") +
 *     feDisplacementMap con escala sutil 2.2–2.6. Es la línea que hierve
 *     de Fleischer/Cuphead. TRES filtros con semillas y períodos distintos
 *     para que los personajes NO hiervan al unísono (regla del coro del rig).
 *   - Boil AMBIENTAL lento (0.5 s, escala 1.4) para matas y props: el
 *     "todo está vivo" de Fleischer sin recargar las siluetas protagónicas.
 *   - Curvas canónicas del spec como variables CSS (anticipación / squash /
 *     overshoot) y el PULSO maestro del rig (--msc-paso: .72 s) al que se
 *     ancla el trote de las plagas; el desfase por instancia (--fase) evita
 *     el efecto ejército.
 *
 * Consumo: montar <TintaBoil reducedMotion/> UNA VEZ en la raíz del juego
 * (los filtros viven en un SVG de 0×0 — display:none los rompería) y
 * <StyleTinta/> junto a las demás hojas. Clases:
 *   .msc-tinta-a / -b / -c  → boil de personaje (repartir entre sprites)
 *   .msc-tinta-lenta        → boil ambiental (matas, props de fondo)
 *
 * Gama baja: data-tier="bajo" apaga TODOS los filtros (feDisplacementMap es
 * el gasto GPU principal del estilo). reducedMotion monta los filtros SIN el
 * <animate> SMIL: línea de tinta temblorosa pero ESTÁTICA, cero movimiento.
 */
import { memo } from 'react';

/* Receta canónica del rig aprobado (guias-rig/guias.js · boil()): 3 semillas,
   numOctaves 1, frecuencia baja (ondas largas, "campesino andino"), escala
   sutil. Ver DR-RUBBERHOSE-ANIMACION-MAX §2 (no subir semillas ni escala). */
const BOILS = Object.freeze([
  { id: 'msc-boil-a', freq: '0.02', scale: '2.4', seeds: '1;7;13', dur: '0.36s' },
  { id: 'msc-boil-b', freq: '0.018', scale: '2.2', seeds: '3;9;15', dur: '0.34s' },
  { id: 'msc-boil-c', freq: '0.022', scale: '2.6', seeds: '5;11;17', dur: '0.38s' },
  /* ambiental: más lento y suave — el fondo respira, no compite */
  { id: 'msc-boil-lenta', freq: '0.012', scale: '1.4', seeds: '2;9', dur: '0.5s' },
]);

const TintaBoil = memo(function TintaBoil(/** @type {any} */ { reducedMotion = false }) {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        {BOILS.map((b) => (
          <filter key={b.id} id={b.id} x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence type="fractalNoise" baseFrequency={b.freq} numOctaves="1" seed="1" result="n">
              {!reducedMotion && (
                <animate
                  attributeName="seed"
                  values={b.seeds}
                  dur={b.dur}
                  calcMode="discrete"
                  repeatCount="indefinite"
                />
              )}
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale={b.scale} />
          </filter>
        ))}
      </defs>
    </svg>
  );
});

/* ── Hoja de la tinta (montar una sola vez). ────────────────────────────────── */
function StyleTinta() {
  return (
    <style>{`
/* pulso maestro y curvas canónicas del rig (spec DR — NO inventar otras) */
.msc-root{
  --msc-paso:.72s;
  --msc-antic:cubic-bezier(.34,-.2,.64,1);
  --msc-squash:cubic-bezier(.4,0,.2,1);
  --msc-overshoot:cubic-bezier(.34,1.56,.64,1);
}

/* la tinta que hierve: el filtro va al SVG del sprite (el div conserva su
   drop-shadow y su flip data-dir sin pisarse con el boil) */
.msc-tinta-a > svg{filter:url(#msc-boil-a)}
.msc-tinta-b > svg{filter:url(#msc-boil-b)}
.msc-tinta-c > svg{filter:url(#msc-boil-c)}
/* los perros llevan wrappers (flip/bob/atadito): la tinta va en el bob,
   un solo filtro que cubre al perro completo con todo y merienda */
.msc-perro.msc-tinta-b .msc-perro-bob{filter:url(#msc-boil-b)}
.msc-perro.msc-tinta-c .msc-perro-bob{filter:url(#msc-boil-c)}
.msc-tinta-lenta{filter:url(#msc-boil-lenta)}

/* trote rubber-hose de las plagas: bote anclado al pulso maestro, squash al
   apoyar con volumen conservado; --fase (por instancia) desfasa el coro */
.msc-plaga > svg{transform-origin:50% 100%;animation:mscTrotePlaga var(--msc-paso) var(--msc-squash) var(--fase,0s) infinite}
@keyframes mscTrotePlaga{
  0%,100%{transform:translateY(0) scale(1,1)}
  32%{transform:translateY(-2.6px) scale(.975,1.025)}
  58%{transform:translateY(.8px) scale(1.03,.97)}
  76%{transform:translateY(-.6px) scale(.995,1.008)}
}

/* gama baja: el boil es el gasto GPU principal — fuera todos los filtros */
.msc-root[data-tier="bajo"] .msc-tinta-a > svg,
.msc-root[data-tier="bajo"] .msc-tinta-b > svg,
.msc-root[data-tier="bajo"] .msc-tinta-c > svg,
.msc-root[data-tier="bajo"] .msc-perro .msc-perro-bob,
.msc-root[data-tier="bajo"] .msc-tinta-lenta{filter:none}

.msc-root[data-rm="1"] .msc-plaga > svg{animation:none}
@media (prefers-reduced-motion: reduce){
  .msc-plaga > svg{animation:none}
}
`}</style>
  );
}

export default TintaBoil;
export { TintaBoil, StyleTinta };
