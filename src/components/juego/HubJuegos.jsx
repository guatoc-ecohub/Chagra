/*
 * HubJuegos — LA SALA DE JUEGOS de Chagra (feedback del operador 2026-07-16:
 * "no veo los juegos"). Una sola puerta hermosa para TODOS los juegos de la
 * finca, cableada al portal Aprender.
 *
 * Dirección de arte: cartel de FERIA DE PUEBLO campesina — un toldo de carpa
 * (festones ámbar/crema), y cada juego como un cartel serigrafiado con su
 * criatura rubber-hose de PROTAGONISTA (viva: flota/respira, con su sombra de
 * contacto). Cada cartel lleva el tinte del juego y un letrero claro de QUÉ
 * PRÁCTICA REAL enseña — jugar también es cultivar.
 *
 * El catálogo (rutas reales + criaturas + tintes) vive en hubJuegosData.js;
 * este archivo solo dibuja. Cero lógica de juego aquí.
 *
 * i18n: pantalla servida solo en es-CO (mismo criterio que los juegos que
 * enlaza); el copy vive en hubJuegosData.js.
 */
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { JUEGOS_CHAGRA, PORTEROS_SALA } from './hubJuegosData.js';
import './hub-juegos.css';

/** ¿El equipo pidió calma? Se decide una vez por montaje. */
function usarCalma() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/* Los obreros del suelo asomados al mostrador del toldo (hero y banner). */
function Porteros({ className, calma }) {
  return (
    <span className={className} aria-hidden="true">
      {PORTEROS_SALA.map((p, i) => (
        <span className="hj-portero" style={{ '--hj-orden': i }} key={i}>
          <p.Criatura size={p.size} animated={!calma} />
          <i className="hj-portero__sombra" />
        </span>
      ))}
    </span>
  );
}

/**
 * Un cartel de la feria: la criatura protagonista + qué enseña + jugar.
 */
function CartelJuego({ juego, indice, animado, onJugar }) {
  const { titulo, ensena, detalle, tinte } = juego;
  return (
    <button
      type="button"
      data-testid={`hub-juego-${juego.id}`}
      className="hj-cartel"
      style={{ '--hj-tinte': tinte, '--hj-orden': indice }}
      onClick={() => onJugar(juego.view)}
      aria-label={`Jugar ${titulo} — ${ensena}`}
    >
      <span className="hj-medallon" aria-hidden="true">
        <juego.Criatura size={58} animated={animado} />
        <i className="hj-medallon__sombra" />
      </span>
      <span className="hj-cartel__cuerpo">
        <span className="hj-cartel__ensena">{ensena}</span>
        <span className="hj-cartel__titulo">{titulo}</span>
        <span className="hj-cartel__detalle">{detalle}</span>
      </span>
      <span className="hj-cartel__jugar" aria-hidden="true">
        <Play size={15} strokeWidth={2.6} />
        <span>Jugar</span>
      </span>
    </button>
  );
}

/**
 * SalaJuegosBanner — la ENTRADA de la sala desde el portal Aprender: un
 * pedazo del toldo de feria con los porteros asomados. Un solo toque abre
 * el hub completo (#juegos).
 *
 * @param {{ onNavigate: (view: string) => void }} props
 */
export function SalaJuegosBanner({ onNavigate }) {
  const calma = useMemo(() => usarCalma(), []);
  return (
    <button
      type="button"
      data-testid="sala-juegos-banner"
      className="hj-banner"
      onClick={() => onNavigate('juegos')}
      aria-label="Abrir la sala de juegos: nueve juegos para aprender jugando"
    >
      <i className="hj-toldo hj-toldo--banner" aria-hidden="true" />
      <span className="hj-banner__fila">
        <Porteros className="hj-banner__porteros" calma={calma} />
        <span className="hj-banner__texto">
          <span className="hj-banner__eyebrow">Aprender jugando</span>
          <span className="hj-banner__titulo">La sala de juegos</span>
          <span className="hj-banner__sub">
            Nueve juegos que enseñan prácticas reales: control biológico, suelo
            vivo, milpa, restauración…
          </span>
        </span>
        <ChevronRight size={22} className="hj-banner__flecha" aria-hidden="true" />
      </span>
    </button>
  );
}

/**
 * HubJuegos — la pantalla completa de la sala.
 *
 * @param {Object} props
 * @param {() => void} [props.onBack]
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */
export default function HubJuegos({ onBack, onNavigate }) {
  const calma = useMemo(() => usarCalma(), []);
  const jugar = (view) => {
    if (typeof onNavigate === 'function') onNavigate(view);
  };

  return (
    <div className="hj-root" data-testid="hub-juegos">
      {/* El toldo de la carpa: la sala se anuncia como feria de pueblo. */}
      <i className="hj-toldo" aria-hidden="true" />

      <header className="hj-header">
        {onBack && (
          <button
            type="button"
            className="hj-volver"
            onClick={onBack}
            aria-label="Volver"
          >
            <ChevronLeft size={22} />
          </button>
        )}
        <div className="hj-header__texto">
          <p className="hj-eyebrow">Aprender jugando</p>
          <h1 className="hj-titulo">La sala de juegos</h1>
          <p className="hj-lema">
            Jugar también es cultivar: cada juego enseña una práctica real de la
            finca.
          </p>
        </div>
        <Porteros className="hj-porteros" calma={calma} />
      </header>

      <main className="hj-feria">
        {JUEGOS_CHAGRA.map((juego, i) => (
          <CartelJuego
            key={juego.id}
            juego={juego}
            indice={i}
            animado={!calma}
            onJugar={jugar}
          />
        ))}
      </main>

      <p className="hj-pie">
        Todos los juegos usan datos y prácticas verificadas — y funcionan sin
        internet.
      </p>
    </div>
  );
}
