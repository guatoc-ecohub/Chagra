import useThemeBackgroundStore, {
  getBackgroundById,
  getBackgroundSrc,
  esGradiente,
} from '../../store/useThemeBackgroundStore';

/**
 * SelectedBackgroundReveal — muestra el FONDO de biodiversidad elegido por el
 * campesino JUSTO debajo del AgentHero, en TODOS los temas.
 *
 * Contexto (operador 2026-06-09): en bio-punk la foto también vive detrás de
 * toda la app; pero en nature/minimalista la página usa lienzos claros tipo
 * papel (legibilidad — index.css fuerza `background-image:none`). Por eso esta
 * tarjeta es la forma de que el paisaje elegido SIEMPRE se vea, pase lo que
 * pase con el tema. La diseñadora (Lili) cura los fondos; aquí se lucen.
 *
 * Fix vs. versión anterior: la foto se pinta con `background-size: cover` en una
 * capa propia (antes se mosaicaba al tamaño natural → se veía horrible) y el
 * rótulo va sobre un scrim para legibilidad, con acento theme-aware.
 */
export default function SelectedBackgroundReveal() {
  const selected = useThemeBackgroundStore((s) => s.selected);
  const bg = getBackgroundById(selected);
  const src = getBackgroundSrc(selected);

  return (
    <section className="paisaje-reveal" aria-label={`Tu paisaje: ${bg.label}`}>
      <div
        className="paisaje-photo"
        style={{ backgroundImage: esGradiente(src) ? src : `url('${src}')` }}
        aria-hidden="true"
      />
      <div className="paisaje-scrim" aria-hidden="true" />
      <div className="paisaje-copy">
        <span className="paisaje-kicker">🌿 Tu paisaje</span>
        <h3 className="paisaje-title">{bg.label}</h3>
        <p className="paisaje-sub">{bg.sub}</p>
      </div>

      <style>{`
        .paisaje-reveal {
          position: relative; margin: 14px 16px 6px; height: 178px; border-radius: 26px;
          overflow: hidden; isolation: isolate;
          border: 1px solid rgb(var(--t-accent-rgb) / .28);
          box-shadow: 0 14px 34px -18px rgba(0,0,0,.55);
        }
        .paisaje-photo {
          position: absolute; inset: 0; background-size: cover; background-position: center;
          background-repeat: no-repeat; transform: scale(1.03);
          transition: transform .7s cubic-bezier(.22,.61,.36,1);
        }
        .paisaje-reveal:hover .paisaje-photo { transform: scale(1.07); }
        .paisaje-scrim {
          position: absolute; inset: 0;
          background: linear-gradient(to top,
            rgba(6,10,16,.9) 0%, rgba(6,10,16,.42) 42%, rgba(6,10,16,.06) 74%, rgba(6,10,16,0) 100%);
        }
        .paisaje-copy { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 18px; color: #fff; }
        .paisaje-kicker {
          font-size: .6rem; font-weight: 900; letter-spacing: .18em; text-transform: uppercase;
          color: rgb(var(--t-accent-rgb)); text-shadow: 0 1px 6px rgba(0,0,0,.45);
        }
        /* En temas claros el acento (ocre/verde) baja contraste sobre el scrim
           oscuro → verde claro fijo para el kicker. El título/sub van en blanco. */
        [data-theme="nature"] .paisaje-kicker,
        [data-theme="minimalista"] .paisaje-kicker { color: #bfe3a8; }
        .paisaje-title {
          margin-top: 3px; font-size: 1.2rem; font-weight: 900; line-height: 1.1;
          text-shadow: 0 2px 10px rgba(0,0,0,.55);
        }
        .paisaje-sub {
          margin-top: 3px; font-size: .82rem; line-height: 1.35; color: rgba(255,255,255,.88);
          text-shadow: 0 1px 7px rgba(0,0,0,.5);
        }
        @media (prefers-reduced-motion: reduce) {
          .paisaje-photo { transform: none; transition: none; }
          .paisaje-reveal:hover .paisaje-photo { transform: none; }
        }
      `}</style>
    </section>
  );
}
