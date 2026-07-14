/**
 * EscenarioFondo — fondos ARTÍSTICOS por piso térmico del "Metal Slug del campo".
 *
 * SOLO ARTE. Cielo + parallax de lomas + capa de ambiente propia de cada piso:
 *   - templado : ladera cálida, sol suave, nubecitas (nivel 1, la huerta).
 *   - frio     : cafetal en la niebla — arbustos con cerezas, bandas de bruma.
 *   - calido   : milpa al sol — maizales altos, sol duro con destello, calor.
 *   - paramo   : páramo herido — frailejones, roca, bruma baja, cielo pálido.
 *
 * Cada piso trae su PALETA (cielo/lomas/suelo/pasto) que MetalSlugCampo aplica al
 * suelo y cultivos, así el mundo entero cambia de clima. Data-driven por `piso`.
 * Parallax con la cámara (`cam`). Gama baja: gradientes CSS + SVG livianos.
 * reducedMotion apaga bruma/calor a la deriva. Sin red, es-CO.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- arte de juego es-CO. */
import { memo } from 'react';

/* Paletas por piso térmico (misma familia térmica del repo). */
export const PALETAS_PISO = Object.freeze({
  templado: {
    cielo: '#bfe3ef', cieloBajo: '#eaf3d9',
    lomaLejos: '#a9c69b', lomaCerca: '#7fae74',
    suelo: '#8a6a44', sueloClaro: '#a8814f', pasto: '#6fa650',
    tinta: '#3a2a1a', maiz: '#8bbf4a', maizAlt: '#6d9c37', mazorca: '#e6c34a',
    frijol: '#7bab54', frijolAlt: '#557f36',
  },
  frio: {
    cielo: '#c7d4d6', cieloBajo: '#dde5db',
    lomaLejos: '#8ba496', lomaCerca: '#5f8a6f',
    suelo: '#6a5136', sueloClaro: '#856542', pasto: '#4f7d43',
    tinta: '#2b2419', maiz: '#6fa04a', maizAlt: '#4f7d34', mazorca: '#d8b34a',
    frijol: '#5f9350', frijolAlt: '#436b34',
  },
  calido: {
    cielo: '#ffe39c', cieloBajo: '#fff6d0',
    lomaLejos: '#cbb968', lomaCerca: '#a2b04e',
    suelo: '#a9762f', sueloClaro: '#c79544', pasto: '#93b23c',
    tinta: '#5a3a12', maiz: '#a6c945', maizAlt: '#7f9e2c', mazorca: '#f2cf4a',
    frijol: '#8fab48', frijolAlt: '#657f2c',
  },
  paramo: {
    cielo: '#d4dbdf', cieloBajo: '#e6eae0',
    lomaLejos: '#98a598', lomaCerca: '#71806c',
    suelo: '#5f5a48', sueloClaro: '#7a725a', pasto: '#7c8a5f',
    tinta: '#33322a', maiz: '#83975a', maizAlt: '#5f7040', mazorca: '#c9be6a',
    frijol: '#788b57', frijolAlt: '#556237',
  },
});

export function paletaPiso(piso) {
  return PALETAS_PISO[piso] || PALETAS_PISO.templado;
}

/* Frailejón silueteado — sello del páramo. */
function Frailejon({ x, h = 90, c = '#65735d' }) {
  return (
    <g transform={`translate(${x} ${180 - h})`}>
      <rect x="-6" y="20" width="12" height={h} rx="4" fill={c} opacity="0.9" />
      {Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI - Math.PI / 2;
        return (
          <path key={i} d={`M0 22 q${Math.cos(a) * 20} ${-8 + Math.sin(a) * 6} ${Math.cos(a) * 30} ${-4 + Math.sin(a) * 10}`}
            stroke={c} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.85" />
        );
      })}
      <ellipse cx="0" cy="20" rx="14" ry="9" fill={c} />
    </g>
  );
}

/* Cafeto silueteado con cerezas rojas — sello del cafetal. */
function Cafeto({ x, c = '#3f6a48', cereza = '#c0392b' }) {
  return (
    <g transform={`translate(${x} 96)`}>
      <rect x="-4" y="40" width="8" height="44" rx="3" fill="#4a3a26" />
      <ellipse cx="0" cy="34" rx="30" ry="34" fill={c} opacity="0.92" />
      {[[-14, 24], [12, 18], [-6, 44], [16, 40], [0, 8], [-18, 46]].map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r="3.4" fill={cereza} />
      ))}
    </g>
  );
}

/* Maizal alto silueteado — sello de la milpa. */
function MaizAlto({ x, c = '#7f9e2c' }) {
  return (
    <g transform={`translate(${x} 60)`}>
      <rect x="-3" y="30" width="6" height="90" rx="2" fill={c} />
      {[-1, 1].map((s) => [0, 22, 44, 66].map((y, i) => (
        <path key={`${s}-${i}`} d={`M0 ${34 + y} q${s * 26} ${-6} ${s * 34} ${8}`} stroke={c} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.9" />
      )))}
      <ellipse cx="0" cy="26" rx="9" ry="16" fill="#c9a24e" />
    </g>
  );
}

const EscenarioFondo = memo(function EscenarioFondo(/** @type {any} */ { piso = 'templado', cam = 0, reducedMotion = false }) {
  const P = paletaPiso(piso);
  const rm = reducedMotion;

  return (
    <div className="msc-esc" data-piso={piso} aria-hidden="true">
      <StyleEscenario />

      {/* cielo */}
      <div
        className="msc-esc-cielo"
        style={{ background: `linear-gradient(${P.cielo} 0%, ${P.cieloBajo} 74%)` }}
      />

      {/* sol / astro ambiente */}
      {piso === 'calido' ? (
        <div className={`msc-esc-sol msc-esc-sol--duro ${rm ? '' : 'msc-esc-anim-sol'}`} />
      ) : piso === 'paramo' ? (
        <div className="msc-esc-sol msc-esc-sol--palido" />
      ) : (
        <div className="msc-esc-sol msc-esc-sol--suave" />
      )}

      {/* nubes / bruma según piso */}
      {(piso === 'frio' || piso === 'paramo') ? (
        <>
          <div className={`msc-esc-bruma msc-esc-bruma--a ${rm ? '' : 'msc-esc-anim-bruma'}`} />
          <div className={`msc-esc-bruma msc-esc-bruma--b ${rm ? '' : 'msc-esc-anim-bruma2'}`} />
        </>
      ) : (
        <>
          <div className="msc-esc-nube" style={{ left: '18%', top: '16%' }} />
          <div className="msc-esc-nube msc-esc-nube--sm" style={{ left: '62%', top: '24%' }} />
        </>
      )}

      {/* lomas lejanas (parallax lento) */}
      <div
        className="msc-esc-loma msc-esc-loma--lejos"
        style={{
          background: `radial-gradient(120% 100% at 50% 100%, ${P.lomaLejos} 0 60%, transparent 61%)`,
          transform: `translate3d(${-cam * 0.28}px,0,0)`,
        }}
      />

      {/* banda de ambiente (frailejones / cafetos / maizales) parallax medio */}
      <div
        className="msc-esc-props"
        style={{ transform: `translate3d(${-cam * 0.42}px,0,0)` }}
      >
        <svg viewBox="0 0 1400 200" width="2800" height="200" preserveAspectRatio="none">
          {piso === 'paramo' &&
            [80, 300, 560, 820, 1080, 1320].map((x, i) => (
              <Frailejon key={x} x={x} h={70 + (i % 3) * 18} c={i % 2 ? '#5c6a54' : '#6b7a60'} />
            ))}
          {piso === 'frio' &&
            [110, 360, 620, 880, 1140, 1360].map((x, i) => (
              <Cafeto key={x} x={x} c={i % 2 ? '#3d6746' : '#4a7a52'} />
            ))}
          {piso === 'calido' &&
            [90, 320, 560, 800, 1050, 1300].map((x, i) => (
              <MaizAlto key={x} x={x} c={i % 2 ? '#7f9e2c' : '#8fae3c'} />
            ))}
          {piso === 'templado' &&
            [140, 420, 720, 1020, 1320].map((x, i) => (
              <g key={x} transform={`translate(${x} 120)`} opacity="0.55">
                <ellipse cx="0" cy="40" rx="34" ry="38" fill={i % 2 ? '#7fae74' : '#8fbf7e'} />
                <rect x="-4" y="60" width="8" height="26" fill="#5c4a2e" />
              </g>
            ))}
        </svg>
      </div>

      {/* lomas cercanas (parallax rápido) */}
      <div
        className="msc-esc-loma msc-esc-loma--cerca"
        style={{
          background: `radial-gradient(120% 100% at 40% 100%, ${P.lomaCerca} 0 58%, transparent 59%)`,
          transform: `translate3d(${-cam * 0.52}px,0,0)`,
        }}
      />
    </div>
  );
});

function StyleEscenario() {
  return (
    <style>{`
.msc-esc{position:absolute;inset:0;overflow:hidden;pointer-events:none;}
.msc-esc-cielo{position:absolute;inset:0;}
.msc-esc-sol{position:absolute;border-radius:50%;}
.msc-esc-sol--suave{width:120px;height:120px;top:8%;right:12%;background:radial-gradient(circle at 40% 40%,#fff6cf 0 45%,#ffe08a 60%,rgba(255,224,138,0) 72%);}
.msc-esc-sol--duro{width:170px;height:170px;top:4%;right:8%;background:radial-gradient(circle at 42% 42%,#fffdf0 0 34%,#ffe066 52%,#ffb63a 66%,rgba(255,182,58,0) 76%);}
.msc-esc-sol--palido{width:110px;height:110px;top:10%;right:16%;background:radial-gradient(circle at 42% 42%,#fbfbf4 0 48%,#e3e6da 66%,rgba(227,230,218,0) 78%);}
.msc-esc-nube{position:absolute;width:120px;height:40px;background:rgba(255,255,255,.82);border-radius:40px;box-shadow:34px 8px 0 -6px rgba(255,255,255,.82),-30px 6px 0 -8px rgba(255,255,255,.82);}
.msc-esc-nube--sm{width:80px;height:28px;opacity:.7;}
.msc-esc-bruma{position:absolute;left:-20%;right:-20%;height:120px;background:linear-gradient(rgba(255,255,255,0),rgba(246,248,246,.72),rgba(255,255,255,0));border-radius:50%;filter:blur(2px);}
.msc-esc-bruma--a{top:34%;}
.msc-esc-bruma--b{top:52%;opacity:.7;height:90px;}
.msc-esc-loma{position:absolute;left:-10%;right:-10%;will-change:transform;}
.msc-esc-loma--lejos{bottom:20%;height:240px;opacity:.82;}
.msc-esc-loma--cerca{bottom:12%;height:220px;}
.msc-esc-props{position:absolute;left:0;bottom:16%;width:2800px;height:200px;will-change:transform;opacity:.9;}
.msc-esc-props svg{display:block;}

@keyframes msc-esc-sol{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}
.msc-esc-anim-sol{animation:msc-esc-sol 3.4s ease-in-out infinite;}
@keyframes msc-esc-bruma{0%{transform:translateX(-4%)}100%{transform:translateX(4%)}}
@keyframes msc-esc-bruma2{0%{transform:translateX(3%)}100%{transform:translateX(-5%)}}
.msc-esc-anim-bruma{animation:msc-esc-bruma 11s ease-in-out infinite alternate;}
.msc-esc-anim-bruma2{animation:msc-esc-bruma2 15s ease-in-out infinite alternate;}
@media (prefers-reduced-motion: reduce){
  .msc-esc-anim-sol,.msc-esc-anim-bruma,.msc-esc-anim-bruma2{animation:none;}
}
`}</style>
  );
}

export default EscenarioFondo;
