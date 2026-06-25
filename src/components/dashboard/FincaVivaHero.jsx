/* eslint-disable chagra-i18n/no-hardcoded-spanish --
 * Los textos de UI de este hero (saludo del agente, etiquetas de los portales,
 * aria-labels) son strings de interfaz. Su migración a src/config/messages.js es
 * la TAREA i18n de ADR-050 (transversal a toda la app), fuera del alcance de esta
 * feature visual — mismo criterio que MiFincaVivaHomeCard.jsx, FincaCards.jsx y
 * FincaRedInstitucional.jsx en este mismo directorio. */
import { useEffect, useMemo, useState } from 'react';
import {
  Sprout, GraduationCap, Gamepad2, Sparkles, MessageCircle,
} from 'lucide-react';
import { listFarmProcesses } from '../../db/farmProcessCache';
import { buildFincaScene } from '../../services/fincaSceneService';
import { selectSceneVariant } from '../../services/fincaSceneProfileSelector';
import { getProfile } from '../../services/userProfileService';
import { tieneAccesoGlaciarActual } from '../../config/glaciarAccess';
import { WORLD_STAGES } from '../../services/fincaGameService';
import FincaWorldScene from '../juego/FincaWorldScene';
import '../juego/juego-finca.css';

/**
 * FincaVivaHero — el HOME INMERSIVO "Finca Viva" (mockup F2). La escena
 * isométrica de la finca del usuario ES la vista principal del dashboard: ocupa
 * el primer screenful (≈100dvh) y es LO PRIMERO que se ve al entrar. NO es una
 * tarjeta debajo del agente — es la portada.
 *
 * Estructura (1:1 con el mockup F2 "Finca Viva Evolutiva"):
 *   - ESCENA a pantalla: la finca isométrica por perfil (FincaWorldScene con la
 *     variante de fincaSceneProfileSelector) llena el viewport. Estado vacío →
 *     la misma escena "por sembrar" (inmersiva, no una tarjeta).
 *   - GLOBO del agente: el saludo "Soy Chagra" flota sobre la escena (el agente
 *     está integrado, no es la portada).
 *   - 4 PORTALES como lugares: Gestionar · Aprender · Jugar · Agente, anclados al
 *     pie de la escena, tappables (como los "lugares" de F2).
 *   - FAB "Pregúntale a Chagra": el agente queda accesible como acceso flotante
 *     (degradado de portada a botón), no como protagonista de la pantalla.
 *
 * Se monta SOLO con la flag VITE_FINCA_VIVA_HOME_PERFIL ON (lo decide
 * DashboardLive). Con la flag OFF el home conserva su portada actual (AgentHero).
 *
 * `children` (opcional) reemplaza la escena de finca única por otra (la RED
 * institucional del extensionista usa este slot — el mismo shell F2, otra
 * escena). Si no se pasa `children`, dibuja la escena de la finca propia.
 *
 * Offline-first: lee los procesos reales de farmProcessCache (sin red). SVG
 * rsvg-safe, animaciones que respetan prefers-reduced-motion (juego-finca.css).
 * Español de Colombia (tú/usted), sin voseo.
 *
 * @param {Object} props
 * @param {Function} [props.onNavigate]   navegación de la app.
 * @param {Function} [props.onOpenAgent]  abre el agente (FAB + portal Agente).
 * @param {React.ReactNode} [props.children]  escena alterna (red institucional).
 * @param {string} [props.titulo]  título del encabezado (default "Mi finca viva").
 */
export default function FincaVivaHero({ onNavigate, onOpenAgent, children, titulo }) {
  const abrirAgente = () => {
    if (onOpenAgent) onOpenAgent();
    else onNavigate?.('agente');
  };

  return (
    <section
      data-testid="finca-viva-hero"
      aria-label="Su finca viva"
      className="fvh relative w-full flex flex-col overflow-hidden"
    >
      <style>{HERO_CSS}</style>

      {/* ESCENA a pantalla (finca propia, o red institucional vía children). */}
      <div className="fvh-escena relative">
        {children || <FincaPropiaEscena />}

        {/* Velo inferior para legibilidad de los portales sobre la escena. */}
        <div aria-hidden="true" className="fvh-velo" />

        {/* Globo del agente: el saludo flota sobre la escena (agente integrado,
            no portada). Toca para hablar con Chagra. */}
        <button
          type="button"
          onClick={abrirAgente}
          aria-label="Hablar con Chagra"
          className="fvh-globo"
        >
          <span className="fvh-globo-av" aria-hidden="true">🌿</span>
          <span className="fvh-globo-txt">
            <b>Soy Chagra</b>
            <small>Toque un lugar para entrar, o pregúnteme.</small>
          </span>
        </button>
      </div>

      {/* 4 PORTALES como lugares (F2). Anclados al pie de la escena. */}
      <nav aria-label="Lugares de su finca" className="fvh-portales" data-testid="finca-viva-portales">
        {buildPortales({ onNavigate, abrirAgente }).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={p.onClick}
            aria-label={`${p.titulo}: ${p.desc}`}
            className={`fvh-portal ${p.clase}`}
          >
            <span className="fvh-portal-ico" aria-hidden="true"><p.icon size={20} strokeWidth={2.4} /></span>
            <span className="fvh-portal-tit">{p.titulo}</span>
            <span className="fvh-portal-desc">{p.desc}</span>
          </button>
        ))}
      </nav>

      {/* FAB "Pregúntale a Chagra": el agente como acceso flotante (degradado de
          portada a botón). Vive DENTRO del hero (no choca con el AgentFab global
          de App.jsx, que se oculta en la vista 'dashboard'). */}
      <button
        type="button"
        onClick={abrirAgente}
        aria-label="Pregúntale a Chagra"
        className="fvh-fab"
        data-testid="finca-viva-agent-fab"
      >
        <MessageCircle size={20} aria-hidden="true" />
        <span className="fvh-fab-txt">Pregúntale a Chagra</span>
      </button>

      <p className="fvh-titulo-sr">{titulo || 'Mi finca viva'}</p>
    </section>
  );
}

/**
 * FincaPropiaEscena — la escena isométrica de la finca PROPIA del usuario,
 * llenando el viewport. Reusa el mismo cálculo de MiFincaVivaHomeCard (procesos
 * reales → escena + variante por perfil), pero a tamaño hero. Estado vacío →
 * escena "por sembrar" inmersiva (no una tarjeta).
 */
function FincaPropiaEscena() {
  const [processes, setProcesses] = useState([]);

  useEffect(() => {
    let alive = true;
    listFarmProcesses({ status: 'active' })
      .then((list) => { if (alive) setProcesses(Array.isArray(list) ? list : []); })
      .catch(() => { /* IDB falló: escena "por sembrar" honesta, nunca inventada */ });
    return () => { alive = false; };
  }, []);

  const scene = useMemo(() => buildFincaScene({ processes }), [processes]);

  // Variante de escena por PERFIL (balcón / invernadero / finca / restauración /
  // páramo). Cae a la escena rural clásica si el selector falla.
  const variant = useMemo(() => {
    try {
      return selectSceneVariant(getProfile(), { esGuiaGlaciar: tieneAccesoGlaciarActual() });
    } catch (_) {
      return null;
    }
  }, []);

  // Nivel del mundo (backdrop) desde la vitalidad REAL (no inventa progreso).
  const stage = useMemo(() => {
    if (!scene || scene.vacia) return WORLD_STAGES[0];
    const v = Number(scene.vitalidad) || 0;
    const nivel = v >= 75 ? 4 : v >= 50 ? 3 : v >= 25 ? 2 : v > 0 ? 1 : 0;
    return WORLD_STAGES[nivel] || WORLD_STAGES[0];
  }, [scene]);

  return (
    <div className="fvh-scene-fill" data-testid="finca-viva-scene-fill">
      <FincaWorldScene stage={stage} criaturas={[]} vacia={scene.vacia} variant={variant} />
    </div>
  );
}

/** Los 4 portales/lugares del home F2: Gestionar · Aprender · Jugar · Agente. */
function buildPortales({ onNavigate, abrirAgente }) {
  return [
    {
      id: 'gestionar',
      titulo: 'Gestionar',
      desc: 'Su finca, cultivos y registros',
      icon: Sprout,
      clase: 'p-gestionar',
      onClick: () => onNavigate?.('juego'),
    },
    {
      id: 'aprender',
      titulo: 'Aprender',
      desc: 'Lecciones con fuente',
      icon: GraduationCap,
      clase: 'p-aprender',
      onClick: () => onNavigate?.('aprende'),
    },
    {
      id: 'jugar',
      titulo: 'Jugar',
      desc: 'Su finca viva, jugando',
      icon: Gamepad2,
      clase: 'p-jugar',
      onClick: () => onNavigate?.('juego'),
    },
    {
      id: 'agente',
      titulo: 'Agente',
      desc: 'Pregúntele a Chagra',
      icon: Sparkles,
      clase: 'p-agente',
      onClick: () => abrirAgente(),
    },
  ];
}

// CSS del hero. La escena llena el viewport (slice), los portales se anclan al
// pie y el FAB flota. Acentos de los portales = paleta F2 (verde/ocre/azul/
// violeta). Respeta prefers-reduced-motion (sin animaciones propias agresivas).
const HERO_CSS = `
.fvh { min-height: 100dvh; }
.fvh-escena {
  position: relative;
  flex: 1 1 auto;
  min-height: 56vh;
}
/* La escena SVG llena el alto disponible (slice) en vez de respetar su aspecto
   400×240, para que sea inmersiva a pantalla y no una franja. */
.fvh-scene-fill, .fvh-escena > .fv-scene {
  position: absolute;
  inset: 0;
  height: 100%;
  border-radius: 0;
}
.fvh-scene-fill .fv-scene { position: absolute; inset: 0; height: 100%; border-radius: 0; }
.fvh-escena .fv-scene svg, .fvh-scene-fill .fv-scene svg { height: 100%; width: 100%; }
/* Velo inferior: gradiente para que los portales y el texto se lean sobre la
   escena, sin tapar el cielo de arriba. */
.fvh-velo {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  height: 42%;
  background: linear-gradient(180deg, rgba(2,6,12,0) 0%, rgba(2,6,12,.45) 70%, rgba(2,6,12,.72) 100%);
  pointer-events: none;
}
/* Globo del agente (saludo flotante, integrado en la escena). */
.fvh-globo {
  position: absolute;
  left: 14px; top: max(64px, calc(env(safe-area-inset-top) + 56px));
  display: inline-flex; align-items: center; gap: 9px;
  max-width: min(78%, 320px);
  background: rgba(255,255,255,.94);
  border: 0; border-radius: 16px 16px 16px 5px;
  padding: 9px 13px 9px 10px; text-align: left; cursor: pointer;
  box-shadow: 0 10px 26px rgba(8,20,14,.30);
  z-index: 6;
}
.fvh-globo-av {
  flex: 0 0 auto; width: 34px; height: 34px; border-radius: 50%;
  display: grid; place-items: center; font-size: 18px;
  background: radial-gradient(circle at 35% 30%, #d7f5d0, #a7e3a0);
  box-shadow: 0 0 0 2px rgba(132,225,160,.5);
}
.fvh-globo-txt { line-height: 1.15; }
.fvh-globo-txt b { display: block; font-size: 13.5px; font-weight: 800; color: #1f3320; }
.fvh-globo-txt small { display: block; font-size: 11px; font-weight: 700; color: #4e5c42; margin-top: 1px; }

/* 4 portales / lugares — rejilla 2×2, anclada al pie de la escena. */
.fvh-portales {
  position: relative; z-index: 5;
  margin-top: -64px; /* solapan el pie de la escena (sobre el velo) */
  display: grid; grid-template-columns: 1fr 1fr; gap: 11px;
  padding: 0 14px 6px;
}
.fvh-portal {
  position: relative; min-height: 96px;
  border: 0; border-radius: 20px; padding: 12px 13px;
  color: #fff; text-align: left; cursor: pointer;
  display: flex; flex-direction: column; align-items: flex-start;
  box-shadow: 0 12px 26px rgba(8,20,14,.34), 0 1px 0 rgba(255,255,255,.22) inset;
  transition: transform .15s ease;
}
.fvh-portal:active { transform: translateY(2px) scale(.985); }
.fvh-portal-ico {
  width: 36px; height: 36px; border-radius: 12px; margin-bottom: 7px;
  display: grid; place-items: center; color: #1f3320;
  background: rgba(255,255,255,.94); box-shadow: 0 3px 9px rgba(0,0,0,.22);
}
.fvh-portal-tit { font-size: 17px; font-weight: 800; line-height: 1; text-shadow: 0 1px 5px rgba(16,28,14,.45); }
.fvh-portal-desc { font-size: 11px; font-weight: 700; line-height: 1.2; margin-top: 5px; opacity: .96; text-shadow: 0 1px 4px rgba(16,28,14,.5); }
.fvh-portal.p-gestionar { background: linear-gradient(160deg,#5fa86b,#3f7a4e); }
.fvh-portal.p-aprender  { background: linear-gradient(160deg,#e0a64e,#c47b2f); }
.fvh-portal.p-jugar     { background: linear-gradient(160deg,#7cb6d8,#4f8fc0); }
.fvh-portal.p-agente    { background: linear-gradient(160deg,#7d6bd6,#5d4db0); }

/* FAB "Pregúntale a Chagra" — el agente como acceso flotante. */
.fvh-fab {
  position: sticky; bottom: 14px; align-self: flex-end;
  margin: 10px 16px 4px;
  display: inline-flex; align-items: center; gap: 8px;
  border: 1.5px solid rgba(163,230,53,.45); border-radius: 999px;
  padding: 10px 16px; cursor: pointer; z-index: 20;
  background: linear-gradient(135deg,#1f3d33,#11281f); color: #fff;
  font-size: 13px; font-weight: 800;
  box-shadow: 0 8px 22px rgba(16,40,30,.45);
}
.fvh-fab:active { transform: scale(.97); }

.fvh-titulo-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .fvh-portal { transition: none; }
}
`;
