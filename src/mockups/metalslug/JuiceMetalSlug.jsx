/**
 * JuiceMetalSlug — el "jugo" visual del Metal Slug del campo (SOLO ARTE).
 *
 * Piezas de arcade que hacen que el juego se sienta jugoso, sin tocar el motor:
 *   - ProyectilBio    : el biopreparado lanzado (cápsula/spora que gira, con
 *                       estela), coloreado por el rol biológico del arma.
 *   - EfectoImpacto   : estallido efímero al impactar — acierto (plop verde con
 *                       hojitas/esporas), errado (polvareda con "?"), daño
 *                       (estrellas rojas), rescate (chispas doradas + corazones).
 *   - BarraVida       : vida en corazones-hoja segmentados.
 *   - IndicadorMunicion: el biopreparado activo, con ícono y color del rol.
 *   - DestelloDano    : viñeta roja de pantalla al recibir golpe.
 *   - StyleJuice      : hoja de estilos (montar UNA vez).
 *
 * Todo apagable con reducedMotion. Gama baja, sin red, es-CO.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- arte de juego es-CO. */
import { memo } from 'react';

const TINTA = '#2c1e12';

/* ── Proyectil: biopreparado que gira con estela. ───────────────────────────── */
const ProyectilBio = memo(function ProyectilBio({ color = '#2bb3a3', tipo = 'microbiano', reducedMotion = false }) {
  const spin = reducedMotion ? '' : 'msc-fx-spin';
  return (
    <div className={`msc-fx-proy ${spin}`} style={{ '--fx-c': color }}>
      <svg viewBox="0 0 24 24" width="100%" height="100%">
        <circle cx="12" cy="12" r="9" fill={color} stroke={TINTA} strokeWidth="2" />
        {/* brillo */}
        <circle cx="9" cy="9" r="3" fill="#fff" opacity="0.6" />
        {/* marca del rol biológico */}
        {tipo === 'depredador' && <path d="M12 5 l2 4 l-4 0 Z M7 15 l4 0 M13 15 l4 0" stroke="#fff" strokeWidth="1.6" fill="#fff" strokeLinecap="round" />}
        {tipo === 'parasitoide' && <path d="M12 6 l0 12 M8 9 l8 6 M8 15 l8 -6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />}
        {tipo === 'microbiano' && <g fill="#fff"><circle cx="12" cy="10" r="1.6" /><circle cx="9" cy="14" r="1.4" /><circle cx="15" cy="14" r="1.4" /></g>}
        {tipo === 'botanico' && <path d="M12 6 q5 3 0 12 q-5 -9 0 -12Z" fill="#eafbe0" stroke="#fff" strokeWidth="1" />}
      </svg>
    </div>
  );
});

/* ── Estallido de impacto efímero. ──────────────────────────────────────────── */
const EfectoImpacto = memo(function EfectoImpacto({ tipo = 'bio', reducedMotion = false }) {
  const rm = reducedMotion;
  const cls = rm ? 'msc-fx-burst msc-fx-burst--rm' : 'msc-fx-burst';

  if (tipo === 'errado') {
    return (
      <div className={`${cls} msc-fx-burst--errado`}>
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={30 + Math.cos((a * Math.PI) / 180) * 16} cy={30 + Math.sin((a * Math.PI) / 180) * 16} r="4" fill="#cbb89a" opacity="0.8" />
          ))}
          <text x="30" y="37" textAnchor="middle" fontSize="24" fontWeight="900" fill="#8a6a44">?</text>
        </svg>
      </div>
    );
  }

  if (tipo === 'dano') {
    return (
      <div className={`${cls} msc-fx-burst--dano`}>
        <svg viewBox="0 0 60 60" width="100%" height="100%">
          {[0, 72, 144, 216, 288].map((a) => {
            const r = (a * Math.PI) / 180;
            return <path key={a} d={`M30 30 L${30 + Math.cos(r) * 24} ${30 + Math.sin(r) * 24}`} stroke="#ff4a3a" strokeWidth="5" strokeLinecap="round" />;
          })}
          <circle cx="30" cy="30" r="8" fill="#ffd24a" stroke="#c62f10" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (tipo === 'rescate') {
    return (
      <div className={`${cls} msc-fx-burst--rescate`}>
        <svg viewBox="0 0 80 80" width="100%" height="100%">
          {Array.from({ length: 10 }).map((_, i) => {
            const r = (i / 10) * Math.PI * 2;
            return <path key={i} d={`M40 40 L${40 + Math.cos(r) * 34} ${40 + Math.sin(r) * 34}`} stroke={i % 2 ? '#ffd76a' : '#fff2b0'} strokeWidth="3" strokeLinecap="round" />;
          })}
          <path d="M40 30 q-8 -12 -16 0 q-4 8 16 20 q20 -12 16 -20 q-8 -12 -16 0Z" fill="#ff7aa0" stroke="#b53a5a" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  // 'bio' — acierto: plop de esporas/hojitas
  return (
    <div className={cls}>
      <svg viewBox="0 0 64 64" width="100%" height="100%">
        <circle cx="32" cy="32" r="14" fill="none" stroke="#7fd6a0" strokeWidth="4" opacity="0.9" className={rm ? undefined : 'msc-fx-ring'} />
        {[0, 51, 103, 154, 206, 257, 308].map((a, i) => {
          const r = (a * Math.PI) / 180;
          const x = 32 + Math.cos(r) * 20;
          const y = 32 + Math.sin(r) * 20;
          return i % 2 === 0 ? (
            <path key={a} d={`M${x} ${y} q4 -6 8 0 q-4 6 -8 0Z`} fill="#5fae43" stroke={TINTA} strokeWidth="1.2" transform={`rotate(${a} ${x} ${y})`} />
          ) : (
            <circle key={a} cx={x} cy={y} r="3.4" fill="#2bb3a3" />
          );
        })}
        <circle cx="32" cy="32" r="6" fill="#eafff2" />
      </svg>
    </div>
  );
});

/* ── Barra de vida en corazones-hoja. ───────────────────────────────────────── */
const BarraVida = memo(function BarraVida({ energia = 3, max = 3 }) {
  return (
    <div className="msc-fx-vida" aria-label={`Vida ${energia} de ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const on = i < energia;
        return (
          <svg key={i} viewBox="0 0 24 24" width="22" height="22" className={`msc-fx-corazon ${on ? 'on' : 'off'}`}>
            <path d="M12 20 C4 13 4 7 8 6 q3 -1 4 3 q1 -4 4 -3 c4 1 4 7 -4 14Z" fill={on ? '#ff5a4d' : 'rgba(255,255,255,.22)'} stroke={on ? '#a01f18' : 'rgba(0,0,0,.25)'} strokeWidth="1.6" />
            {on && <path d="M12 9 q2 3 0 8" stroke="#ffb3ac" strokeWidth="1.4" fill="none" opacity="0.8" />}
          </svg>
        );
      })}
    </div>
  );
});

/* ── Indicador de munición (biopreparado activo). ───────────────────────────── */
const IndicadorMunicion = memo(function IndicadorMunicion({ nombre = '', color = '#2bb3a3', tipo = 'microbiano', onClick }) {
  const rol = { microbiano: 'hongo/bacteria', depredador: 'depredador', parasitoide: 'avispita', botanico: 'botánico' }[tipo] || '';
  return (
    <button type="button" className="msc-fx-muni" onClick={onClick}>
      <span className="msc-fx-muni-orbe" style={{ background: color }}>
        <ProyectilBio color={color} tipo={tipo} reducedMotion />
      </span>
      <span className="msc-fx-muni-txt">
        <b>{nombre}</b>
        <em>{rol} · cambiar (K)</em>
      </span>
    </button>
  );
});

/* ── Estilos del jugo (montar una sola vez). ────────────────────────────────── */
function StyleJuice() {
  return (
    <style>{`
.msc-fx-proy{width:100%;height:100%;filter:drop-shadow(0 0 6px var(--fx-c,#2bb3a3));}
@keyframes msc-fx-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.msc-fx-spin{animation:msc-fx-spin .5s linear infinite;}

.msc-fx-burst{position:absolute;width:64px;height:64px;transform:translate(-50%,-50%);pointer-events:none;z-index:8;animation:msc-fx-pop .5s ease-out forwards;transform-origin:center;}
.msc-fx-burst--dano{width:60px;height:60px;}
.msc-fx-burst--rescate{width:96px;height:96px;z-index:12;animation-duration:.7s;}
.msc-fx-burst--rm{animation:msc-fx-fade .4s linear forwards;}
@keyframes msc-fx-pop{0%{transform:translate(-50%,-50%) scale(.3);opacity:0}30%{transform:translate(-50%,-50%) scale(1.15);opacity:1}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
@keyframes msc-fx-fade{0%{opacity:.9}100%{opacity:0}}
@keyframes msc-fx-ring{0%{stroke-width:6;opacity:1}100%{stroke-width:1;opacity:0}}
.msc-fx-ring{animation:msc-fx-ring .5s ease-out forwards;transform-origin:center;}

.msc-fx-vida{display:flex;gap:3px;align-items:center;}
.msc-fx-corazon{filter:drop-shadow(0 1px 0 rgba(0,0,0,.25));}
.msc-fx-corazon.on{animation:msc-fx-latido 1.4s ease-in-out infinite;transform-origin:center;}
@keyframes msc-fx-latido{0%,100%{transform:scale(1)}45%{transform:scale(1.14)}}

.msc-fx-muni{pointer-events:auto;display:flex;align-items:center;gap:8px;background:rgba(20,15,8,.5);border:2px solid rgba(255,255,255,.5);border-radius:14px;padding:5px 12px 5px 6px;color:#fff;cursor:pointer;}
.msc-fx-muni:active{transform:translateY(1px);}
.msc-fx-muni-orbe{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;border:2px solid rgba(255,255,255,.7);box-shadow:0 0 8px rgba(255,255,255,.3);flex:none;}
.msc-fx-muni-orbe .msc-fx-proy{width:22px;height:22px;}
.msc-fx-muni-txt{display:flex;flex-direction:column;line-height:1.15;text-align:left;}
.msc-fx-muni-txt b{font-size:13.5px;font-weight:800;}
.msc-fx-muni-txt em{font-style:normal;font-size:10.5px;opacity:.72;font-weight:700;}

.msc-fx-dano-flash{position:absolute;inset:0;z-index:26;pointer-events:none;opacity:0;background:radial-gradient(120% 100% at 50% 60%,transparent 42%,rgba(220,40,20,.4) 100%);animation:msc-fx-flash .4s ease-out;}
@keyframes msc-fx-flash{0%{opacity:0}25%{opacity:1}100%{opacity:0}}

.msc-fx-muzzle{position:absolute;width:34px;height:34px;transform:translate(-50%,-50%);pointer-events:none;z-index:9;background:radial-gradient(circle,#fff 0 30%,#bff5df 45%,rgba(191,245,223,0) 72%);animation:msc-fx-pop .28s ease-out forwards;}

@media (prefers-reduced-motion: reduce){
  .msc-fx-spin,.msc-fx-corazon.on{animation:none;}
  .msc-fx-burst{animation:msc-fx-fade .4s linear forwards;}
}
`}</style>
  );
}

export default StyleJuice;
export { ProyectilBio, EfectoImpacto, BarraVida, IndicadorMunicion, StyleJuice };
