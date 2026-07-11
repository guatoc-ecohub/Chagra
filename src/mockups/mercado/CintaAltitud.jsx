import { Rostro } from './Rostro.jsx';
import { ALTITUD_MIN, ALTITUD_MAX, pisoDeAltitud } from './datos.js';

/*
 * CintaAltitud — el elemento FIRMA del mercado. La montaña con la cara de cada
 * productor clavada a la ALTURA REAL de su finca. El eje vertical es metros
 * sobre el nivel del mar; el color del cielo va graduado por piso térmico (frío
 * y páramo arriba, templado abajo). No decora: ubica cada cosecha en su punto
 * de la montaña.
 *
 * Se usa en dos modos:
 *   - Panorama (hero): todas las fincas como pines; tocar uno abre su historia.
 *   - Enfoque (historia): una finca resaltada, las demás de contexto tenue.
 *
 * Props:
 *   fincas      [{ id, nombre, productor, altitud, rostro, productoId? }]
 *   activaId    id de la finca resaltada, o null (panorama).
 *   onSelect    (id) => void — al tocar un pin. Recibe `productoId` si la finca
 *               lo trae (fincas agrupadas), o `id` si no.
 *   pisoFiltro  slug de piso térmico activo o null: los pines de otros pisos se
 *               atenúan — la cinta ES la navegación del filtro.
 *   ticks       metros a marcar en el eje. Defecto [3000,2500,2000,1500].
 */
const BANDA_TOP = 7; // % desde arriba donde empieza la banda útil
const BANDA_ALTO = 84; // % de alto útil

function porcentajeAltitud(altitud) {
  const t = (ALTITUD_MAX - altitud) / (ALTITUD_MAX - ALTITUD_MIN);
  return BANDA_TOP + Math.min(1, Math.max(0, t)) * BANDA_ALTO;
}

export function CintaAltitud({
  fincas,
  activaId = null,
  onSelect,
  pisoFiltro = null,
  ticks = [3000, 2500, 2000, 1500],
}) {
  // De más alto a más bajo, para asignar carriles alternos (izq/der) y que dos
  // fincas de altitud parecida no se pisen.
  const ordenadas = [...fincas].sort((a, b) => b.altitud - a.altitud);

  return (
    <div className="mrc-cinta" role="group" aria-label="Las fincas ubicadas por su altura en la montaña">
      <div className="mrc-cinta__cielo" aria-hidden="true" />
      <svg
        className="mrc-cinta__monte"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,100 L0,66 L18,54 L34,62 L52,42 L70,56 L84,48 L100,60 L100,100 Z" fill="#2f5233" opacity="0.22" />
        <path d="M0,100 L0,78 L22,70 L40,76 L60,62 L78,72 L100,68 L100,100 Z" fill="#2f5233" opacity="0.34" />
      </svg>

      {/* eje de altímetro: líneas y rótulos en metros */}
      {ticks.map((m) => (
        <div key={m} className="mrc-tick" style={{ top: `${porcentajeAltitud(m)}%` }} aria-hidden="true">
          <span className="mrc-tick__num">{m.toLocaleString('es-CO')}</span>
          <span className="mrc-tick__linea" />
        </div>
      ))}
      <span className="mrc-cinta__unidad" aria-hidden="true">m s. n. m.</span>

      {/* pines: la cara de cada productor a su altura */}
      {ordenadas.map((f, i) => {
        const lado = i % 2 === 0 ? 'izq' : 'der';
        const activa = activaId === f.id;
        const piso = pisoDeAltitud(f.altitud);
        const fueraDePiso = pisoFiltro != null && piso.slug !== pisoFiltro;
        const atenua = (activaId != null && !activa) || fueraDePiso;
        return (
          <button
            key={f.id}
            type="button"
            className={`mrc-pin mrc-pin--${lado}${activa ? ' is-activa' : ''}${atenua ? ' is-atenua' : ''}`}
            style={{ top: `${porcentajeAltitud(f.altitud)}%`, '--pin-piso': piso.hex }}
            onClick={() => onSelect && onSelect(f.productoId ?? f.id)}
            aria-label={`${f.nombre}, a ${f.altitud.toLocaleString('es-CO')} metros, piso ${piso.nombre}`}
            aria-pressed={activa}
          >
            <span className="mrc-pin__cara">
              <Rostro seed={f.rostro} size={activa ? 52 : 40} title={`Productor de ${f.nombre}`} />
            </span>
            <span className="mrc-pin__tag">
              <span className="mrc-pin__finca">{f.nombre}</span>
              <span className="mrc-pin__alt">{f.altitud.toLocaleString('es-CO')} m</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default CintaAltitud;
