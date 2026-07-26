/**
 * DuoPerros — Dante y Oliver en el Metal Slug del campo (SOLO ARTE).
 *
 * La dupla de la casa entra al juego SIEMPRE JUNTA y complementaria:
 *   - Dante (beagle, 15 años): lento y sabio. Huele lo enterrado (olfatea),
 *     y cuando el jugador yerra de control biológico, SEÑALA el aliado
 *     correcto (la nariz sabe). Celebra AULLANDO al cielo.
 *   - Oliver (dálmata de Julieta): joven y eléctrico. Corre, desentierra y
 *     TRAE la merienda hasta el jugador (dash con estiramiento), celebra con
 *     brinco y cola-helicóptero (menea).
 *
 * REÚSA los sprites canónicos `Beagle` y `Dalmata` de src/visual/creatures
 * (mismas señas del valle: hocico escarchado de Dante, parche en el ojo de
 * Oliver, plaquitas de latón) — cero redibujo. Aquí solo viven los WRAPPERS
 * de juego (locomoción, dash, carga, burbuja de pista, escondites) y su CSS.
 * La SIMULACIÓN de la dupla vive en MetalSlugCampo.jsx junto al resto del
 * mundo (paso fijo, determinista). Todo se poda con reducedMotion/tier.
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- arte de juego es-CO. */
import { memo } from 'react';
import { Beagle, Dalmata } from '../../visual/creatures';

const TINTA = '#2c1e12';

/* ── Dante (beagle viejo y sabio). El flip de mira lo pone el host en
      .msc-perro-flip; la pose la dicta la fase de la dupla. ────────────────── */
export const SpriteDante = memo(function SpriteDante(
  /** @type {{ tier: any, reducedMotion: boolean, olfatea?: boolean, aulla?: boolean, senala?: boolean }} */
  { tier, reducedMotion, olfatea = false, aulla = false, senala = false },
) {
  return (
    <Beagle
      size="100%"
      inline={false}
      animated={!reducedMotion}
      tier={tier}
      vida={false}
      olfatea={olfatea}
      aulla={aulla}
      pose={senala && !olfatea && !aulla ? 'señala' : 'anda'}
      title="Dante"
    />
  );
});

/* ── Oliver (dálmata joven de Julieta). `carga` le pone el ATADITO en el
      hocico (la merienda que trae); `celebra` es el brinco con cola-helicóptero. */
export const SpriteOliver = memo(function SpriteOliver(
  /** @type {{ tier: any, reducedMotion: boolean, menea?: boolean, ladea?: boolean, celebra?: boolean, carga?: boolean }} */
  { tier, reducedMotion, menea = false, ladea = false, celebra = false, carga = false },
) {
  return (
    <span className="msc-oliver-cuerpo">
      <Dalmata
        size="100%"
        inline={false}
        animated={!reducedMotion}
        tier={tier}
        vida={false}
        menea={menea}
        ladea={ladea}
        pose={celebra ? 'celebra' : 'anda'}
        title="Oliver"
      />
      {/* el ATADITO campesino (pañuelo anudado) que Oliver trae en el hocico */}
      {carga && (
        <svg className="msc-oliver-atadito" viewBox="0 0 20 16" aria-hidden="true">
          <path d="M4,9 C4,4.5 16,4.5 16,9 C16,13.5 4,13.5 4,9 Z" fill="#e8b04a" stroke={TINTA} strokeWidth="1.2" />
          <path d="M8,5.4 L10,2.2 L12,5.4" fill="none" stroke={TINTA} strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="10" cy="2.2" r="1.3" fill="#c9552e" stroke={TINTA} strokeWidth="0.8" />
          {/* lunares del pañuelo */}
          <circle cx="7.6" cy="9" r="0.9" fill="#c9552e" opacity="0.85" />
          <circle cx="12.4" cy="9.6" r="0.9" fill="#c9552e" opacity="0.85" />
          <circle cx="10" cy="11.4" r="0.7" fill="#c9552e" opacity="0.85" />
        </svg>
      )}
    </span>
  );
});

/* ── Burbuja de PISTA de Dante: "a esa plaga le sirve ESTE aliado" (el color
      es el rol biológico del arma correcta — el mismo código de color del HUD). */
export const PistaDante = memo(function PistaDante(
  /** @type {{ nombre: string, color: string }} */ { nombre, color },
) {
  return (
    <div className="msc-pista" role="status" style={{ '--pista-c': color }}>
      {/* la huellita del sabueso (firmó la pista con la pata) */}
      <svg viewBox="0 0 20 20" className="msc-pista-huella" aria-hidden="true">
        <ellipse cx="10" cy="12.6" rx="4.6" ry="3.6" fill={color} />
        <circle cx="4.6" cy="8.2" r="1.9" fill={color} />
        <circle cx="8.2" cy="5.8" r="1.9" fill={color} />
        <circle cx="11.8" cy="5.8" r="1.9" fill={color} />
        <circle cx="15.4" cy="8.2" r="1.9" fill={color} />
      </svg>
      <span className="msc-pista-txt">
        ¡Dante huele el remedio! <b>{nombre}</b>
      </span>
    </div>
  );
});

/* ── Escondite enterrado: montículo → rastro de olor → destello → hueco. ────── */
export const Escondite = memo(function Escondite(
  /** @type {{ estado: 'oculto'|'olido'|'revelado'|'recogido'|'entregado', reducedMotion: boolean }} */
  { estado, reducedMotion },
) {
  const excavado = estado === 'recogido' || estado === 'entregado';
  return (
    <svg viewBox="0 0 44 22" width="100%" height="100%" aria-hidden="true" className="msc-esc-svg">
      {excavado ? (
        /* el hueco honesto que quedó (Oliver ya se llevó la merienda) */
        <g>
          <ellipse cx="22" cy="16" rx="10" ry="4" fill="#4a341f" stroke={TINTA} strokeWidth="1" />
          <ellipse cx="22" cy="15.2" rx="6.6" ry="2.4" fill="#2e1f11" />
          <circle cx="9" cy="17" r="1.6" fill="#5c4326" />
          <circle cx="35.5" cy="16.4" r="1.9" fill="#5c4326" />
        </g>
      ) : (
        <g>
          {/* montículo de tierra recién movida (apenas se nota si nadie olfatea) */}
          <path d="M8,18 C12,10.5 32,10.5 36,18 Z" fill="#6b4d2a" stroke={TINTA} strokeWidth="1.1" />
          <path d="M14,15.5 C17,12 27,12 30,15.5" fill="none" stroke="#8a6a3e" strokeWidth="1.4" strokeLinecap="round" />
          {/* pastico encima (disimulado) */}
          <path d="M12,17.6 l-1.4,-3 M22,16.4 l0,-3.2 M32,17.6 l1.4,-3" stroke="#5f9345" strokeWidth="1.3" strokeLinecap="round" />
          {/* RASTRO DE OLOR: las volutas que solo la trufa de Dante encuentra */}
          {(estado === 'olido' || estado === 'revelado') && (
            <g className={reducedMotion ? undefined : 'msc-esc-olor'} fill="none">
              <path className="msc-esc-voluta msc-esc-voluta--1" d="M14,12 q-2,-3 0,-6 q2,-3 0,-5" stroke="#e6d9a8" strokeWidth="1.5" strokeLinecap="round" />
              <path className="msc-esc-voluta msc-esc-voluta--2" d="M22,11 q2,-3 0,-6 q-2,-3 0,-5" stroke="#e6d9a8" strokeWidth="1.5" strokeLinecap="round" />
              <path className="msc-esc-voluta msc-esc-voluta--3" d="M30,12 q-2,-3 0,-6 q2,-3 0,-5" stroke="#e6d9a8" strokeWidth="1.5" strokeLinecap="round" />
            </g>
          )}
          {/* REVELADO: asoma la puntica del atadito con su destello */}
          {estado === 'revelado' && (
            <g className={reducedMotion ? undefined : 'msc-esc-brillo'}>
              <path d="M19,14 C19,11.2 25,11.2 25,14 Z" fill="#e8b04a" stroke={TINTA} strokeWidth="1" />
              <path d="M16,9 l1.2,2 M28,9 l-1.2,2 M22,7.4 l0,2.2" stroke="#ffe9a8" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
});

/* ── Presentación de la dupla en la INTRO (la primera cara del juego). ──────── */
export const DuoIntro = memo(function DuoIntro(
  /** @type {{ tier: any, reducedMotion: boolean }} */ { tier, reducedMotion },
) {
  return (
    <div className="msc-duo-intro">
      <div className="msc-duo-retratos" aria-hidden="true">
        <figure className="msc-duo-fig">
          <Beagle size={58} animated={!reducedMotion} tier={tier} vida={false} title="Dante" />
          <figcaption>Dante</figcaption>
        </figure>
        <figure className="msc-duo-fig msc-duo-fig--oliver">
          <Dalmata size={68} animated={!reducedMotion} tier={tier} vida={false} menea title="Oliver" />
          <figcaption>Oliver</figcaption>
        </figure>
      </div>
      <p className="msc-duo-lema">
        Lo acompañan <b>Dante</b> (quince años de nariz sabia: lo huele TODO) y{' '}
        <b>Oliver</b> (patas jóvenes: lo alcanza TODO). Si Dante se pone a
        olfatear, espere el regalo; si usted yerra de aliado, mírelo a él —
        la trufa nunca se equivoca.
      </p>
    </div>
  );
});

/* ── La dupla celebrando (pantalla de victoria): Dante aúlla, Oliver brinca. ── */
export const DuoCelebra = memo(function DuoCelebra(
  /** @type {{ reducedMotion: boolean }} */ { reducedMotion },
) {
  return (
    <div className="msc-duo-fin" aria-hidden="true">
      <Beagle size={56} animated={!reducedMotion} vida={false} aulla title="Dante celebra" />
      <Dalmata size={66} animated={!reducedMotion} vida={false} menea pose="celebra" title="Oliver celebra" />
    </div>
  );
});

/* ── Hoja de estilos de la dupla (montar UNA vez, junto a StyleJuice). ──────── */
export function StyleDuoPerros() {
  return (
    <style>{`
/* wrappers de juego: posición la pone el host; aquí locomoción y capas.
   Estructura: .msc-perro (pos) > .msc-perro-flip (mira) > .msc-perro-bob
   (galope) > sprite. La burbuja de pista es hermana del flip: NUNCA se espeja. */
.msc-perro{position:absolute;pointer-events:none;will-change:transform;}
.msc-perro-flip,.msc-perro-bob{width:100%;height:100%;display:block;}
.msc-perro[data-mira="-1"] .msc-perro-flip{transform:scaleX(-1);}
.msc-perro .msc-perro-flip{filter:drop-shadow(0 3px 2px rgba(0,0,0,.16));}

/* DANTE: ambladura de perro viejo — bob corto, digno, sin prisa. */
@keyframes msc-dante-amble{0%,100%{transform:translateY(0) rotate(-.6deg)}50%{transform:translateY(-1.6px) rotate(.6deg)}}
.msc-perro--dante[data-anda="1"] .msc-perro-bob{animation:msc-dante-amble .72s ease-in-out infinite;}

/* OLIVER: trote elástico de perro joven — bob alto y rápido. */
@keyframes msc-oliver-trote{0%,100%{transform:translateY(0)}50%{transform:translateY(-3.4px)}}
.msc-perro--oliver[data-anda="1"] .msc-perro-bob{animation:msc-oliver-trote .34s ease-in-out infinite;}

/* DASH de Oliver (busca/entrega): estiramiento squash&stretch + líneas de
   velocidad detrás (la física del caricato: se LEE la carrera). */
@keyframes msc-oliver-dash{0%,100%{transform:translateY(-1px) scale(1.14,.92) rotate(-2deg)}50%{transform:translateY(-4px) scale(1.06,.98) rotate(-1deg)}}
.msc-perro--oliver[data-dash="1"] .msc-perro-bob{animation:msc-oliver-dash .22s ease-in-out infinite;}
.msc-perro--oliver[data-dash="1"] .msc-perro-flip::before{
  content:"";position:absolute;top:38%;right:92%;width:26px;height:14px;opacity:.75;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.85) 0 2px,transparent 2px 6px);
  border-radius:2px;animation:msc-oliver-estela .22s linear infinite;}
@keyframes msc-oliver-estela{from{transform:translateX(0);opacity:.75}to{transform:translateX(-8px);opacity:.2}}

/* el atadito en el hocico de Oliver (posición sobre el sprite cuadrado) */
.msc-oliver-cuerpo{position:relative;display:block;width:100%;height:100%;}
.msc-oliver-atadito{position:absolute;left:56%;top:26%;width:34%;height:auto;transform:rotate(8deg);}

/* burbuja de pista de Dante (no se espeja: hermana del flip) */
.msc-pista{position:absolute;bottom:104%;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;background:#fffbee;border:2.5px solid ${TINTA};border-radius:13px;padding:5px 10px;white-space:nowrap;box-shadow:0 4px 0 rgba(0,0,0,.25);animation:msc-pista-pop .22s cubic-bezier(.34,1.56,.64,1);}
.msc-pista::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:7px solid transparent;border-top-color:${TINTA};}
.msc-pista-huella{width:17px;height:17px;flex:none;}
.msc-pista-txt{font-size:12.5px;font-weight:700;color:#3a2a1a;}
.msc-pista-txt b{color:var(--pista-c,#2bb3a3);font-weight:900;}
@keyframes msc-pista-pop{from{transform:translateX(-50%) scale(.6);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}

/* escondites: volutas de olor que suben + brillo del hallazgo */
.msc-escondite{position:absolute;pointer-events:none;}
.msc-esc-svg{display:block;overflow:visible;}
@keyframes msc-esc-olor-sube{0%{transform:translateY(2px);opacity:0}30%{opacity:.9}100%{transform:translateY(-5px);opacity:0}}
.msc-esc-voluta{transform-box:fill-box;animation:msc-esc-olor-sube 1.5s ease-out infinite;}
.msc-esc-voluta--2{animation-delay:.45s;}
.msc-esc-voluta--3{animation-delay:.9s;}
@keyframes msc-esc-brilla{0%,100%{opacity:.75}50%{opacity:1}}
.msc-esc-brillo{animation:msc-esc-brilla .8s ease-in-out infinite;}

/* intro y fin: la dupla presentada con nombre propio */
.msc-duo-intro{background:#eef5e2;border:2px dashed #8fae6a;border-radius:13px;padding:8px 14px 10px;margin-bottom:12px;}
.msc-duo-retratos{display:flex;align-items:flex-end;justify-content:center;gap:4px;}
.msc-duo-fig{margin:0;display:flex;flex-direction:column;align-items:center;}
.msc-duo-fig figcaption{font-weight:900;font-size:12.5px;color:#3a5a28;margin-top:-4px;}
.msc-duo-lema{margin:6px 0 0;font-size:13.5px;line-height:1.38;color:#43552f;text-align:center;}
.msc-duo-fin{display:flex;align-items:flex-end;justify-content:center;gap:2px;margin-bottom:2px;}

/* toast de la dupla (verde regalo, no el rojo del regaño) */
.msc-toast--duo{background:rgba(61,139,58,.95);}

/* reduced-motion: locomoción esencial sí, decoración no */
.msc-root[data-rm="1"] .msc-perro-bob{animation:none;}
.msc-root[data-rm="1"] .msc-perro--oliver [class]{animation:none;}
.msc-root[data-rm="1"] .msc-esc-voluta,.msc-root[data-rm="1"] .msc-esc-brillo{animation:none;}
.msc-root[data-rm="1"] .msc-pista{animation:none;}
@media (prefers-reduced-motion: reduce){
  .msc-perro-bob,.msc-esc-voluta,.msc-esc-brillo,.msc-pista{animation:none;}
}
`}</style>
  );
}
