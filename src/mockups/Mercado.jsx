/*
 * i18n (ADR-050): copy de campo en español Colombia (usted). Es un MOCKUP de
 * galería con datos de muestra, sin gate ni auth; el copy final migraría a
 * src/config/messages.js — mismo criterio que los otros mockups de la galería.
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, X, Mountain, MapPin, Sprout, ShieldCheck, ScrollText } from 'lucide-react';
import { Colibri } from '../visual/creatures/Colibri.jsx';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import { Mariposa } from '../visual/creatures/Mariposa.jsx';
import { Rostro } from './mercado/Rostro.jsx';
import { ProductoIlustracion } from './mercado/ProductoIlustracion.jsx';
import { CintaAltitud } from './mercado/CintaAltitud.jsx';
import { PRODUCTOS, pisoDeAltitud, pesos } from './mercado/datos.js';
import '../visual/effects/effects.css';
import '../visual/creatures/creatures.css';
import './mercado.css';

/**
 * Mercado — MOCKUP del mercado público mercado.chagra.bio.
 *
 * El diferencial es la PROCEDENCIA: cada producto se ubica en la montaña por su
 * altitud y su piso térmico, con la cara de quien lo sembró, su finca y su
 * vereda. Mercado campesino honesto, anti-postureo: pocas cosas, mucho aire,
 * la confianza al centro (sellos de estampa + trazabilidad de la cosecha).
 *
 * Firma visual: "la cinta de altitud" (CintaAltitud) — la montaña con la cara
 * de cada productor clavada a su altura real. Reusa la librería visual:
 *   - creatures: colibrí (hero), abeja angelita (miel), mariposa (historia).
 *   - effects: grade de luz por piso térmico (vfx-grade) en la historia.
 *
 * Ruta pública `#/mockups/mercado` (sin auth, datos de muestra).
 *
 * @param {Object} props
 * @param {() => void} [props.onBack] volver al dashboard.
 */
export default function Mercado({ onBack }) {
  const [piso, setPiso] = useState('todos');
  const [abierta, setAbierta] = useState(null);

  // Fincas para la cinta de altitud (1 finca por producto en el muestreo).
  const fincas = PRODUCTOS.map((p) => ({
    id: p.id,
    nombre: p.finca.nombre,
    productor: p.finca.productor,
    altitud: p.finca.altitud,
    rostro: p.finca.rostro,
  }));

  // Pisos térmicos presentes, de más alto a más templado, para los filtros.
  const pisosPresentes = [];
  for (const orden of ['paramo', 'frio', 'templado']) {
    if (PRODUCTOS.some((p) => pisoDeAltitud(p.finca.altitud).slug === orden)) {
      pisosPresentes.push(pisoDeAltitud(PRODUCTOS.find((p) => pisoDeAltitud(p.finca.altitud).slug === orden).finca.altitud));
    }
  }

  const visibles =
    piso === 'todos'
      ? PRODUCTOS
      : PRODUCTOS.filter((p) => pisoDeAltitud(p.finca.altitud).slug === piso);

  const productoAbierto = PRODUCTOS.find((p) => p.id === abierta) || null;

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
          <CintaAltitud fincas={fincas} onSelect={setAbierta} />
        </div>
      </section>

      {/* ── FILTRO por piso térmico ───────────────────────────────────────── */}
      <div className="mrc-filtros" role="group" aria-label="Filtrar por piso térmico">
        <button
          type="button"
          className={`mrc-chip${piso === 'todos' ? ' is-on' : ''}`}
          onClick={() => setPiso('todos')}
          aria-pressed={piso === 'todos'}
        >
          Todos
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
          </button>
        ))}
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
        <Historia producto={productoAbierto} fincas={fincas} onCerrar={() => setAbierta(null)} onVerFinca={setAbierta} />
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
        <ProductoIlustracion tipo={producto.ilustracion} size={120} title={producto.nombre} />
        {producto.ilustracion === 'miel' && (
          <AbejaAngelita size={30} className="mrc-card__bicho" title="Abeja angelita" />
        )}
      </button>

      <div className="mrc-card__cuerpo">
        <div className="mrc-card__cabeza">
          <h3 className="mrc-card__nombre">{producto.nombre}</h3>
          <p className="mrc-card__variedad">{producto.variedad}</p>
        </div>

        <p className="mrc-precio">
          <span className="mrc-precio__val">{pesos(producto.precio)}</span>
          <span className="mrc-precio__uni"> / {producto.unidad}</span>
        </p>

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

        <ul className="mrc-sellos">
          {producto.sellos.map((s) => (
            <SelloEstampa key={s} texto={s} />
          ))}
        </ul>
      </div>
    </article>
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
function Historia({ producto, fincas, onCerrar, onVerFinca }) {
  const { finca } = producto;
  const piso = pisoDeAltitud(finca.altitud);
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
                <MapPin size={13} aria-hidden="true" /> vereda {finca.vereda}
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
            <ProductoIlustracion tipo={producto.ilustracion} size={92} title={producto.nombre} />
            <div>
              <h3 className="mrc-hoja__prodnombre">{producto.nombre}</h3>
              <p className="mrc-hoja__prodvar">{producto.variedad}</p>
              <p className="mrc-precio mrc-precio--g">
                <span className="mrc-precio__val">{pesos(producto.precio)}</span>
                <span className="mrc-precio__uni"> / {producto.unidad}</span>
              </p>
            </div>
          </div>

          <p className="mrc-relato">
            <ScrollText size={16} aria-hidden="true" className="mrc-relato__ico" />
            {producto.historia}
          </p>

          {/* Sellos de confianza, grandes */}
          <ul className="mrc-sellos mrc-sellos--g">
            {producto.sellos.map((s) => (
              <SelloEstampa key={s} texto={s} grande />
            ))}
          </ul>

          {/* Trazabilidad: hitos de la cosecha, fechas en altímetro monoespaciado */}
          <div className="mrc-traza">
            <p className="mrc-traza__tit"><Sprout size={15} aria-hidden="true" /> Cómo se dio esta cosecha</p>
            <ol className="mrc-traza__linea">
              {producto.trazabilidad.map((t, i) => (
                <li key={t.hito} className={`mrc-traza__hito${i === producto.trazabilidad.length - 1 ? ' is-fin' : ''}`}>
                  <span className="mrc-traza__punto" aria-hidden="true" />
                  <span className="mrc-traza__hitotxt">
                    <span className="mrc-traza__que">{t.hito}</span>
                    <span className="mrc-traza__cuando">{t.fecha}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dónde queda en la montaña: reusa la cinta, con esta finca resaltada */}
          <div className="mrc-donde">
            <p className="mrc-donde__tit"><Mountain size={15} aria-hidden="true" /> Dónde queda en la montaña</p>
            <CintaAltitud fincas={fincas} activaId={producto.id} onSelect={onVerFinca} />
          </div>
        </div>
      </div>
    </div>
  );
}
