/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; el copy final migraría a
 * src/config/messages.js — mismo criterio que los otros mockups de la galería.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, X, Mountain, MapPin, Sprout, Leaf, ShieldCheck, ScrollText, PenLine } from 'lucide-react';
import { Colibri } from '../visual/creatures/Colibri.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import { Mariposa } from '../visual/creatures/Mariposa.jsx';
import { Rostro } from './mercado/Rostro.jsx';
import { ProductoIlustracion } from './mercado/ProductoIlustracion.jsx';
import { CintaAltitud } from './mercado/CintaAltitud.jsx';
import { PRODUCTOS_FALLBACK, cargarProductos, pisoDeAltitud, pesos, fincasUnicas } from './mercado/datos.js';
import '../visual/effects/effects.css';
import '../visual/creatures/creatures.css';
import './mercado.css';

/**
 * Mercado — mercado.chagra.bio, EL CANÓNICO ("mercado de la montaña").
 *
 * El diferencial es la PROCEDENCIA: cada producto se ubica en la montaña por su
 * altitud y su piso térmico, con la cara de quien lo sembró, su finca y su
 * vereda. Mercado campesino honesto, anti-postureo: pocas cosas, mucho aire,
 * la confianza al centro (sellos de estampa + trazabilidad de la cosecha).
 *
 * Catálogo: se reconcilia con el API federado real (`milpa-api.guatoc.co`,
 * mismo backend que ya consume milpa.guatoc.co) vía `cargarProductos()`
 * (mercado/datos.js). Foto real cuando el producto la tiene (`producto.foto`);
 * si no, cae a la ilustración propia — mismo patrón de milpa.guatoc.co
 * (screens/ilustraciones.js: "la ilustración es el fallback honesto del
 * catálogo"), reutilizado aquí, no reinventado. Si el fetch falla, se queda
 * con `PRODUCTOS_FALLBACK` (8 productos de muestra) para nunca quedar en
 * blanco.
 *
 * Firma visual: "la cinta de altitud" (CintaAltitud) — la montaña con la cara
 * de cada productor clavada a su altura real. Reusa la librería visual:
 *   - creatures: colibrí (hero), abeja angelita (miel), mariposa (historia).
 *   - effects: grade de luz por piso térmico (vfx-grade) en la historia.
 *
 * Ruta pública `#/mockups/mercado` (sin auth).
 *
 * @param {Object} props
 * @param {() => void} [props.onBack] volver al dashboard.
 */
export default function Mercado({ onBack }) {
  const [piso, setPiso] = useState('todos');
  const [orden, setOrden] = useState('montana');
  const [abierta, setAbierta] = useState(null);
  // Arranca con la muestra (nunca hay pantalla en blanco) y se reemplaza en
  // cuanto responde el API real. Reintenta una vez si falla al montar.
  const [productos, setProductos] = useState(PRODUCTOS_FALLBACK);

  useEffect(() => {
    let vivo = true;
    cargarProductos().then((lista) => {
      if (vivo && lista && lista.length) setProductos(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Fincas ÚNICAS para la cinta de altitud (una finca puede tener 2 productos;
  // el pin abre el primero).
  const fincas = fincasUnicas(productos);

  // Pisos térmicos presentes, de más alto a más templado, para los filtros.
  const pisosPresentes = [];
  for (const slug of ['paramo', 'frio', 'templado']) {
    if (productos.some((p) => pisoDeAltitud(p.finca.altitud).slug === slug)) {
      pisosPresentes.push(pisoDeAltitud(productos.find((p) => pisoDeAltitud(p.finca.altitud).slug === slug).finca.altitud));
    }
  }

  const filtrados =
    piso === 'todos'
      ? productos
      : productos.filter((p) => pisoDeAltitud(p.finca.altitud).slug === piso);

  // Orden: "de la montaña abajo" (altitud, como se lee la cinta) o "más cerca
  // de usted primero" (km reales, la señal de cercanía).
  const visibles = [...filtrados].sort((a, b) =>
    orden === 'cerca'
      ? a.finca.distanciaKm - b.finca.distanciaKm
      : b.finca.altitud - a.finca.altitud,
  );

  const productoAbierto = productos.find((p) => p.id === abierta) || null;

  // Cerrar la historia con Escape.
  useEffect(() => {
    if (!productoAbierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setAbierta(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [productoAbierto]);

  return (
    <div className="mrc-root">
      <header className="mrc-top">
        {onBack && (
          <button type="button" className="mrc-back" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Volver</span>
          </button>
        )}
        <span className="mrc-marca">mercado.chagra.bio</span>
      </header>

      {/* ── HERO: la promesa de procedencia + la montaña con caras ────────── */}
      <section className="mrc-hero">
        <div className="mrc-hero__texto">
          <p className="mrc-kicker">Mercado campesino de la montaña</p>
          <h1 className="mrc-titulo">
            Sepa a qué altura<br />crece su comida.
          </h1>
          <p className="mrc-lead">
            Cada cosecha llega con la cara de quien la sembró, su finca y su vereda.
            Toque un producto y conozca de dónde viene, hasta el metro.
          </p>
          <ul className="mrc-promesa">
            <li><Sprout size={15} aria-hidden="true" /> Sin químicos, dicho por la finca</li>
            <li><Mountain size={15} aria-hidden="true" /> Ubicado por su altitud real</li>
            <li><ShieldCheck size={15} aria-hidden="true" /> Con la fecha de la cosecha</li>
          </ul>
        </div>
        <div className="mrc-hero__monte">
          <Colibri size={44} className="mrc-colibri" title="Colibrí de la montaña" />
          <CintaAltitud
            fincas={fincas}
            onSelect={setAbierta}
            pisoFiltro={piso === 'todos' ? null : piso}
          />
        </div>
      </section>

      {/* ── FILTRO por piso térmico (la cinta de arriba reacciona: atenúa las
             fincas de otros pisos) + ORDEN ─────────────────────────────────── */}
      <div className="mrc-filtros" role="group" aria-label="Filtrar por piso térmico">
        <button
          type="button"
          className={`mrc-chip${piso === 'todos' ? ' is-on' : ''}`}
          onClick={() => setPiso('todos')}
          aria-pressed={piso === 'todos'}
        >
          Toda la montaña
        </button>
        {pisosPresentes.map((p) => (
          <button
            key={p.slug}
            type="button"
            className={`mrc-chip${piso === p.slug ? ' is-on' : ''}`}
            onClick={() => setPiso(p.slug)}
            aria-pressed={piso === p.slug}
            style={{ '--chip-piso': p.hex }}
          >
            <span className="mrc-chip__punto" aria-hidden="true" />
            {p.nombre}
            <span className="mrc-chip__rango">{p.rango}</span>
          </button>
        ))}
      </div>

      <div className="mrc-orden" role="group" aria-label="Ordenar los productos">
        <span className="mrc-orden__rotulo">Ordenar:</span>
        <button
          type="button"
          className={`mrc-orden__opt${orden === 'montana' ? ' is-on' : ''}`}
          onClick={() => setOrden('montana')}
          aria-pressed={orden === 'montana'}
        >
          <Mountain size={13} aria-hidden="true" /> De la montaña abajo
        </button>
        <button
          type="button"
          className={`mrc-orden__opt${orden === 'cerca' ? ' is-on' : ''}`}
          onClick={() => setOrden('cerca')}
          aria-pressed={orden === 'cerca'}
        >
          <MapPin size={13} aria-hidden="true" /> Más cerca de usted
        </button>
      </div>

      {/* ── GRILLA de productos ───────────────────────────────────────────── */}
      <section className="mrc-grid" aria-label="Productos del mercado">
        {visibles.map((p) => (
          <ProductoCard key={p.id} producto={p} onAbrir={() => setAbierta(p.id)} />
        ))}
      </section>

      <footer className="mrc-pie">
        <p>De la finca a su mesa, sin intermediarios y sin cuento. Trazabilidad de muestra.</p>
      </footer>

      {productoAbierto && (
        <Historia
          key={productoAbierto.id}
          producto={productoAbierto}
          productos={productos}
          fincas={fincas}
          onCerrar={() => setAbierta(null)}
          onVerFinca={setAbierta}
        />
      )}
    </div>
  );
}

/* ── Tarjeta de producto ─────────────────────────────────────────────────── */
function ProductoCard({ producto, onAbrir }) {
  const { finca } = producto;
  const piso = pisoDeAltitud(finca.altitud);
  return (
    <article className="mrc-card">
      <button type="button" className="mrc-card__foto" onClick={onAbrir} aria-label={`Ver la historia de ${producto.nombre}, de ${finca.nombre}`} style={{ '--card-piso': piso.hex }}>
        {producto.foto ? (
          <img src={producto.foto} alt={producto.nombre} loading="lazy" />
        ) : (
          <ProductoIlustracion tipo={producto.ilustracion} size={120} title={producto.nombre} />
        )}
        {producto.ilustracion === 'miel' && (
          <AbejaAngelita size={30} className="mrc-card__bicho" title="Abeja angelita" />
        )}
      </button>

      <div className="mrc-card__cuerpo">
        <div className="mrc-card__cabeza">
          <h3 className="mrc-card__nombre">{producto.nombre}</h3>
          <p className="mrc-card__variedad">{producto.variedad}</p>
        </div>

        <Precio producto={producto} />

        {/* Bloque de PROCEDENCIA: la cara + finca + vereda + altitud/piso */}
        <button type="button" className="mrc-proc" onClick={onAbrir}>
          <Rostro seed={finca.rostro} size={44} title={`Productor de ${finca.nombre}`} />
          <span className="mrc-proc__texto">
            <span className="mrc-proc__finca">{finca.nombre}</span>
            <span className="mrc-proc__ubi"><MapPin size={12} aria-hidden="true" /> vereda {finca.vereda}</span>
            <span className="mrc-proc__alt">
              <span className="mrc-proc__punto" style={{ background: piso.hex }} aria-hidden="true" />
              {finca.altitud.toLocaleString('es-CO')} m · piso {piso.nombre.toLowerCase()}
            </span>
          </span>
        </button>

        {/* Señales de confianza: estampa roja = lo DECLARA la finca; tinta con
            alfiler = dato medible (los km hasta usted). No se mezclan. */}
        <ul className="mrc-sellos">
          {producto.sellos.map((s) => (
            <SelloEstampa key={s} texto={s} />
          ))}
          <li className="mrc-km">
            <MapPin size={12} aria-hidden="true" />
            <span>a {finca.distanciaKm} km de usted</span>
          </li>
        </ul>
      </div>
    </article>
  );
}

/*
 * Precio — dos modos de referencia SIPSA (ver normalizarProducto en
 * mercado/datos.js), para no confundir "lo que puso la finca" con "lo que
 * dice SIPSA":
 *   - precioRef.modo === 'precio': la finca NO puso precio; el número que se
 *     ve ES la referencia SIPSA (kg o libra, conversión física exacta) — el
 *     badge va pegado porque el número mismo es la cita.
 *   - precioRef.modo === 'cita': la finca SÍ puso precio (manda, se muestra
 *     tal cual); SIPSA se agrega como línea APARTE, con su propio número, sin
 *     mezclarse con el de la finca.
 *   - sin precioRef ni precio propio: "Precio a confirmar con la finca" —
 *     NUNCA "$ 0", que se lee como gratis.
 */
function Precio({ producto, grande = false }) {
  const cls = `mrc-precio${grande ? ' mrc-precio--g' : ''}`;
  const ref = producto.precioRef;
  if (producto.precio > 0) {
    return (
      <div className="mrc-precio-bloque">
        <p className={cls}>
          <span className="mrc-precio__val">{pesos(producto.precio)}</span>
          <span className="mrc-precio__uni"> / {producto.unidad}</span>
          {ref && ref.modo === 'precio' && (
            <span className="mrc-precio__ref" title={`Referencia mayorista SIPSA-DANE, ${ref.plazas}`}>
              ref. SIPSA {ref.fecha}
            </span>
          )}
        </p>
        {ref && ref.modo === 'cita' && (
          <p className="mrc-precio__cita" title={`Referencia mayorista SIPSA-DANE, ${ref.plazas}`}>
            ref. SIPSA {ref.fecha}: {pesos(ref.precio)} / {ref.unidad}
          </p>
        )}
      </div>
    );
  }
  return (
    <p className={cls}>
      <span className="mrc-precio__pendiente">Precio a confirmar con la finca</span>
    </p>
  );
}

/* ── Sello de confianza estilo estampa de tinta ──────────────────────────── */
function SelloEstampa({ texto, grande = false }) {
  return (
    <li className={`mrc-sello${grande ? ' mrc-sello--g' : ''}`}>
      <ShieldCheck size={grande ? 15 : 12} aria-hidden="true" />
      <span>{texto}</span>
    </li>
  );
}

/* ── Historia de la finca (pantalla de detalle) ──────────────────────────── */
function Historia({ producto, productos, fincas, onCerrar, onVerFinca }) {
  const { finca } = producto;
  const piso = pisoDeAltitud(finca.altitud);
  // Otros productos de ESTA misma finca (El Rocío y Los Helechos tienen dos;
  // en el catálogo real, cualquier finca con más de un producto publicado).
  const delMismoTecho = productos.filter(
    (p) => p.finca.nombre === finca.nombre && p.id !== producto.id,
  );
  return (
    <div className="mrc-modal" role="dialog" aria-modal="true" aria-label={`Historia de ${finca.nombre}`}>
      <button type="button" className="mrc-modal__fondo" aria-label="Cerrar" onClick={onCerrar} />
      <div className="mrc-hoja">
        <div className="mrc-hoja__barra">
          <button type="button" className="mrc-back mrc-back--modal" onClick={onCerrar}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Al mercado</span>
          </button>
          <button type="button" className="mrc-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mrc-hoja__scroll">
          {/* Cabecera de finca: luz graduada por piso térmico (effects vfx-grade) */}
          <div className="mrc-fincahead">
            <div className={`vfx-grade vfx-grade--${piso.slug} mrc-fincahead__luz`} aria-hidden="true" />
            <Mariposa size={40} className="mrc-mariposa" title="Mariposa" />
            <div className="mrc-fincahead__cara">
              <Rostro seed={finca.rostro} size={74} title={`Productor de ${finca.nombre}`} />
            </div>
            <div className="mrc-fincahead__id">
              <p className="mrc-fincahead__quien">{finca.productor}</p>
              <h2 className="mrc-fincahead__finca">{finca.nombre}</h2>
              <p className="mrc-fincahead__ubi">
                <MapPin size={13} aria-hidden="true" /> vereda {finca.vereda} · a {finca.distanciaKm} km de usted
              </p>
              <p className="mrc-fincahead__alt">
                <Mountain size={13} aria-hidden="true" />
                <span className="mrc-alt-num">{finca.altitud.toLocaleString('es-CO')} m</span>
                <span className="mrc-alt-piso" style={{ '--chip-piso': piso.hex }}>
                  <span className="mrc-chip__punto" aria-hidden="true" /> piso {piso.nombre.toLowerCase()}
                </span>
              </p>
            </div>
          </div>

          {/* Producto de esta finca */}
          <div className="mrc-hoja__producto" style={{ '--card-piso': piso.hex }}>
            {producto.foto ? (
              <img src={producto.foto} alt={producto.nombre} loading="lazy" />
            ) : (
              <ProductoIlustracion tipo={producto.ilustracion} size={92} title={producto.nombre} />
            )}
            <div>
              <h3 className="mrc-hoja__prodnombre">{producto.nombre}</h3>
              <p className="mrc-hoja__prodvar">{producto.variedad}</p>
              <Precio producto={producto} grande />
            </div>
          </div>

          {producto.historia && (
            <p className="mrc-relato">
              <ScrollText size={16} aria-hidden="true" className="mrc-relato__ico" />
              {producto.historia}
            </p>
          )}

          {/* Sellos de confianza, grandes + los km (dato medible, en tinta) */}
          <ul className="mrc-sellos mrc-sellos--g">
            {producto.sellos.map((s) => (
              <SelloEstampa key={s} texto={s} grande />
            ))}
            <li className="mrc-km mrc-km--g">
              <MapPin size={14} aria-hidden="true" />
              <span>a {finca.distanciaKm} km de usted</span>
            </li>
          </ul>

          {/* Cómo se cultivó: la versión estructurada de la historia, por frentes.
              Se oculta con gracia si la finca todavía no cargó prácticas (dato
              real pendiente, no se inventa). */}
          {producto.practicas.length > 0 && (
            <div className="mrc-como">
              <p className="mrc-traza__tit"><Leaf size={15} aria-hidden="true" /> Cómo se cultivó</p>
              <ul className="mrc-como__lista">
                {producto.practicas.map((pr, i) => (
                  <li key={pr.que || i} className="mrc-como__item">
                    <span className="mrc-como__que">{pr.que}</span>
                    <span className="mrc-como__detalle">{pr.como}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trazabilidad: hitos de la cosecha, fechas en altímetro monoespaciado.
              Igual, se oculta si la finca no la cargó todavía. */}
          {(producto.trazabilidad.length > 0 || producto.mataAMesa) && (
            <div className="mrc-traza">
              <p className="mrc-traza__tit"><Sprout size={15} aria-hidden="true" /> De la mata a su mesa</p>
              {producto.trazabilidad.length > 0 && (
                <ol className="mrc-traza__linea">
                  {producto.trazabilidad.map((t, i) => (
                    <li key={t.hito || i} className={`mrc-traza__hito${i === producto.trazabilidad.length - 1 ? ' is-fin' : ''}`}>
                      <span className="mrc-traza__punto" aria-hidden="true" />
                      <span className="mrc-traza__hitotxt">
                        <span className="mrc-traza__que">{t.hito}</span>
                        <span className="mrc-traza__cuando">{t.fecha}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {producto.mataAMesa && <p className="mrc-traza__mesa">{producto.mataAMesa}</p>}
            </div>
          )}

          {/* La palabra de la finca: honestidad sin postureo — aquí no hay
              certificado de laboratorio, hay nombre, cara y fecha. */}
          <p className="mrc-palabra">
            <PenLine size={14} aria-hidden="true" className="mrc-palabra__ico" />
            Aquí no hay sello de laboratorio. Lo que usted lee es la palabra de{' '}
            {finca.productor}, con nombre, finca y fecha. Y la finca queda a{' '}
            {finca.distanciaKm} km: si quiere, puede ir y verlo con sus propios ojos.
          </p>

          {/* Otros productos de la misma finca */}
          {delMismoTecho.length > 0 && (
            <div className="mrc-tambien">
              <p className="mrc-traza__tit"><Sprout size={15} aria-hidden="true" /> También de {finca.nombre}</p>
              <div className="mrc-tambien__fila">
                {delMismoTecho.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="mrc-tambien__card"
                    onClick={() => onVerFinca(p.id)}
                  >
                    {p.foto ? (
                      <img src={p.foto} alt={p.nombre} loading="lazy" />
                    ) : (
                      <ProductoIlustracion tipo={p.ilustracion} size={54} title={p.nombre} />
                    )}
                    <span className="mrc-tambien__nombre">{p.nombre}</span>
                    <span className="mrc-tambien__precio">{pesos(p.precio)} / {p.unidad}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dónde queda en la montaña: reusa la cinta, con esta finca resaltada */}
          <div className="mrc-donde">
            <p className="mrc-donde__tit"><Mountain size={15} aria-hidden="true" /> Dónde queda en la montaña</p>
            <CintaAltitud fincas={fincas} activaId={finca.nombre} onSelect={onVerFinca} />
          </div>
        </div>
      </div>
    </div>
  );
}
