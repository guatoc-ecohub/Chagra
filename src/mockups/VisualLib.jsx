/*
 * VisualLib — vitrina ("storybook" ligero) de la librería visual reutilizable
 * `src/visual/`. Ruta pública #/mockups/visual-lib.
 *
 * Recorre el REGISTRO consolidado `VISUAL_REGISTRY` (registry.js) y dibuja cada
 * primitivo AISLADO, con 1-3 variantes de props y la lista de props disponibles,
 * agrupado por categoría (Creatures · Effects · Láminas · Scenes) con navegación
 * por anclas. Doble objetivo: registro auto-consultable + vitrina de discovery
 * para que cualquiera (agente o persona) encuentre un primitivo antes de
 * dibujarlo de cero.
 *
 * Estética: cuaderno de laboratorio. Mobile-first (320px), aprovecha desktop.
 * Autocontenido: cero enlaces/imágenes externas, todo SVG propio de la librería.
 */
import { useId } from 'react';
import { VISUAL_REGISTRY, VISUAL_CATEGORIES, VISUAL_COUNTS } from '../visual/registry.js';
import { Colibri } from '../visual/creatures/index.js';
import { cieloEscena } from '../visual/scenes/index.js';
import { CAPAS_PARALLAX } from '../visual/scenes/_parallax.js';

// La vitrina es el único consumidor que monta primitivos de las 4 categorías a
// la vez, así que carga aquí los CSS que cada familia necesita (las creatures
// importan el suyo desde cada componente; las demás familias esperan que el
// consumidor lo haga una vez).
import '../visual/effects/effects.css';
import '../visual/laminas/laminas.css';
import '../visual/scenes/scenes.css';
import '../visual/scenes/scene-finca-organismo.css';
import './VisualLib.css';

const TOTAL = VISUAL_CATEGORIES.reduce((n, k) => n + VISUAL_COUNTS[k], 0);

/* ── Demo de UN primitivo en UNA variante ─────────────────────────────────────
   Cada `render` del registro trae su andamiaje: los componentes directos se
   dibujan tal cual; los filtros y escenas necesitan su SVG/cámara/hijo. */
function PrimitiveDemo({ categoria, item, variante }) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { render, Component } = item;
  const props = variante?.props || {};

  if (render === 'component') {
    if (categoria === 'laminas') {
      return (
        <div className="vlib-stage vlib-stage--lamina">
          <Component {...props} />
        </div>
      );
    }
    // creatures: SVG standalone dimensionado por `size`.
    return (
      <div className="vlib-stage vlib-stage--creature">
        <Component {...props} />
      </div>
    );
  }

  if (render === 'filter') {
    const fid = `vlib-fx-${item.slug}-${rid}`;
    return (
      <div className="vlib-stage vlib-stage--fx">
        <svg viewBox="0 0 140 90" className="vlib-fx-svg" role="img" aria-label={`Demostración de ${item.nombre}`}>
          <defs>
            <Component id={fid} {...props} />
          </defs>
          {item.slug === 'filtro-acuarela' ? (
            <g filter={`url(#${fid})`}>
              <rect x="26" y="20" width="88" height="50" rx="6" fill="#5b8c6e" />
              <rect x="26" y="20" width="88" height="50" rx="6" fill="none" stroke="#2f5741" strokeWidth="2.5" />
            </g>
          ) : (
            <g filter={`url(#${fid})`}>
              <circle cx="70" cy="45" r="17" fill="#2dffc4" />
              <path d="M40,45 C55,20 85,20 100,45" fill="none" stroke="#b28dff" strokeWidth="3" strokeLinecap="round" />
            </g>
          )}
        </svg>
      </div>
    );
  }

  if (render === 'draw') {
    // key={variante.label} fuerza un remonte por variante para re-disparar el
    // trazado (la animación corre al montar; reduced-motion = dibujo completo).
    return (
      <div className="vlib-stage vlib-stage--fx" key={variante?.label}>
        <svg viewBox="0 0 140 90" className="vlib-fx-svg" role="img" aria-label={`Demostración de ${item.nombre}`}>
          <Component
            as="path"
            d="M14,72 C40,14 100,14 126,72"
            fill="none"
            stroke="#3a6f52"
            strokeWidth="3"
            strokeLinecap="round"
            {...props}
          />
        </svg>
      </div>
    );
  }

  if (render === 'cielo') {
    const cielo = { luz: props.luz, condicion: props.condicion };
    const [alto, bajo] = cieloEscena(cielo, 'finca');
    const gid = `vlib-cielo-${rid}`;
    return (
      <div className="vlib-stage vlib-stage--cielo">
        <svg viewBox="0 0 390 200" className="vlib-cielo-svg" role="img" aria-label={`Cielo ${variante?.label || ''}`}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={alto} />
              <stop offset="1" stopColor={bajo} />
            </linearGradient>
          </defs>
          <rect width="390" height="200" fill={`url(#${gid})`} />
          <Component cielo={cielo} cx={300} cy={70} r={26} w={390} h={200} />
        </svg>
      </div>
    );
  }

  if (render === 'parallax') {
    // Cámara quieta: la vitrina muestra el apilado de capas (el motor anima con
    // la cámara que le pasa la escena consumidora). Tres bandas de profundidad.
    return (
      <div className="vlib-stage vlib-stage--parallax">
        <Component
          className="vlib-parallax"
          alturaCapa={150}
          camara={{ tx: 0, ty: 0, s: 1 }}
          capas={[
            { id: 'cielo', f: CAPAS_PARALLAX.cielo, contenido: <div className="vlib-plx vlib-plx--cielo" /> },
            { id: 'lejos', f: CAPAS_PARALLAX.lejos, contenido: <div className="vlib-plx vlib-plx--lejos" /> },
            { id: 'principal', f: CAPAS_PARALLAX.principal, interactiva: true, contenido: <div className="vlib-plx vlib-plx--pral" /> },
          ]}
        />
      </div>
    );
  }

  if (render === 'guardian') {
    return (
      <div className="vlib-stage vlib-stage--guardian">
        <Component {...props} size={88} title={`Guardián ${variante?.label || ''}`}>
          <Colibri inline animated className="" />
        </Component>
      </div>
    );
  }

  if (render === 'finca') {
    return (
      <div className="vlib-stage vlib-stage--finca">
        <Component estructura={{ tiene: false, forma: null }} />
      </div>
    );
  }

  return <div className="vlib-stage vlib-stage--vacio">Sin vista previa</div>;
}

/* ── Tabla de props de un primitivo ───────────────────────────────────────── */
function PropsTable({ props }) {
  if (!props || props.length === 0) {
    return <p className="vlib-props-vacio">Sin props (primitivo fijo).</p>;
  }
  return (
    <div className="vlib-props-wrap">
      <table className="vlib-props">
        <thead>
          <tr>
            <th scope="col">prop</th>
            <th scope="col">tipo</th>
            <th scope="col">defecto</th>
            <th scope="col">para qué</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.nombre}>
              <td><code>{p.nombre}</code></td>
              <td className="vlib-props-tipo">{p.tipo}</td>
              <td className="vlib-props-def">{p.defecto}</td>
              <td>{p.que}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Tarjeta de UN primitivo (nombre + variantes + props) ─────────────────── */
function PrimitiveCard({ categoria, item }) {
  return (
    <article className="vlib-card" id={`p-${categoria}-${item.slug}`}>
      <header className="vlib-card-head">
        <h3 className="vlib-card-name">{item.nombre}</h3>
        {item.cientifico && <span className="vlib-card-sci">{item.cientifico}</span>}
      </header>
      {item.descripcion && <p className="vlib-card-desc">{item.descripcion}</p>}

      <div className="vlib-variants" role="group" aria-label={`Variantes de ${item.nombre}`}>
        {item.variantes.map((v) => (
          <figure className="vlib-variant" key={v.label}>
            <PrimitiveDemo categoria={categoria} item={item} variante={v} />
            <figcaption className="vlib-variant-label">{v.label}</figcaption>
          </figure>
        ))}
      </div>

      <details className="vlib-card-props">
        <summary>Props ({item.props?.length || 0})</summary>
        <PropsTable props={item.props} />
      </details>
    </article>
  );
}

/* ── Bloque de "extras" de una categoría (pisos térmicos, constantes) ─────── */
function CategoryExtras({ extras }) {
  if (!extras) return null;
  return (
    <aside className="vlib-extras">
      <h3 className="vlib-extras-title">{extras.titulo}</h3>
      {extras.nota && <p className="vlib-extras-nota">{extras.nota}</p>}
      {extras.pisos && (
        <ul className="vlib-pisos">
          {extras.pisos.map((piso) => (
            <li key={piso.slug} className="vlib-piso">
              <span className={`vlib-piso-chip vlib-piso-chip--${piso.slug}`} aria-hidden="true" />
              <span className="vlib-piso-nombre">{piso.nombre}</span>
              <code className="vlib-piso-clase">{piso.clase}</code>
              <span className="vlib-piso-luz">{piso.luz}</span>
            </li>
          ))}
        </ul>
      )}
      {extras.capasParallax && (
        <ul className="vlib-consts">
          {Object.entries(extras.capasParallax).map(([capa, f]) => (
            <li key={capa}>
              <code>{capa}</code>
              <span className="vlib-const-val">f = {f}</span>
            </li>
          ))}
        </ul>
      )}
      {typeof extras.beatMs === 'number' && (
        <p className="vlib-extras-beat">
          Ritmo del latido compartido: <code>{extras.beatMs} ms</code>
        </p>
      )}
    </aside>
  );
}

/* ── Sección de UNA categoría ─────────────────────────────────────────────── */
function CategorySection({ categoria }) {
  const cat = VISUAL_REGISTRY[categoria];
  return (
    <section className="vlib-cat" id={cat.ancla} aria-labelledby={`h-${cat.ancla}`}>
      <header className="vlib-cat-head">
        <div className="vlib-cat-title-row">
          <h2 className="vlib-cat-title" id={`h-${cat.ancla}`}>{cat.titulo}</h2>
          <span className="vlib-cat-sub">{cat.subtitulo}</span>
          <span className="vlib-cat-count">{cat.items.length}</span>
        </div>
        <p className="vlib-cat-desc">{cat.descripcion}</p>
        <code className="vlib-cat-import">{cat.importa}</code>
      </header>

      <div className="vlib-grid">
        {cat.items.map((item) => (
          <PrimitiveCard categoria={categoria} item={item} key={item.slug} />
        ))}
      </div>

      <CategoryExtras extras={cat.extras} />
    </section>
  );
}

export default function VisualLib() {
  return (
    <main className="vlib">
      <a className="vlib-skip" href="#creatures">Saltar a la vitrina</a>

      <header className="vlib-header">
        <p className="vlib-eyebrow"><code>src/visual/</code></p>
        <h1 className="vlib-title">Librería visual</h1>
        <p className="vlib-tagline">
          Vitrina de discovery de los primitivos SVG reutilizables de Chagra.
          Antes de dibujar un bicho, un velo, una lámina de cuaderno o un cielo,
          búsquelo aquí. {TOTAL} primitivos en 4 categorías.
        </p>
        <p className="vlib-nota-fuente">
          Se alimenta del registro consolidado <code>src/visual/registry.js</code>:
          agregar un primitivo a su categoría lo publica en esta página.
        </p>
      </header>

      <nav className="vlib-nav" aria-label="Categorías de la librería visual">
        {VISUAL_CATEGORIES.map((k) => (
          <a className="vlib-nav-link" href={`#${VISUAL_REGISTRY[k].ancla}`} key={k}>
            {VISUAL_REGISTRY[k].titulo}
            <span className="vlib-nav-count">{VISUAL_COUNTS[k]}</span>
          </a>
        ))}
      </nav>

      {VISUAL_CATEGORIES.map((k) => (
        <CategorySection categoria={k} key={k} />
      ))}

      <footer className="vlib-footer">
        <p>
          Reglas de la casa: SVG propio (cero stock, cero dependencias nuevas),
          solo <code>transform</code>/<code>opacity</code> animados, filtros
          estáticos, <code>prefers-reduced-motion</code> con un fotograma final
          digno.
        </p>
      </footer>
    </main>
  );
}
