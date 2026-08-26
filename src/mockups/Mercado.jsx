/*
 * Mercado público de Milpa.
 * El inventario y los precios vienen de src/mockups/mercado/datos.js. Esta
 * vista no agrega atributos que no estén publicados por el catálogo fuente.
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, ChevronRight, Search, ShoppingBasket, X } from 'lucide-react';
import { PRODUCTOS, pesos } from './mercado/datos.js';
import './mercado.css';

const UNIDADES = ['todos', ...new Set(PRODUCTOS.map((producto) => producto.unidad))];

function normaliza(texto) {
  return texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function Mercado({ onBack }) {
  const [unidad, setUnidad] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('nombre');
  const [abierta, setAbierta] = useState(null);

  const visibles = useMemo(() => {
    const termino = normaliza(busqueda.trim());
    return PRODUCTOS
      .filter((producto) => unidad === 'todos' || producto.unidad === unidad)
      .filter((producto) => !termino || normaliza(producto.nombre).includes(termino))
      .sort((a, b) => {
        if (orden === 'precio') return a.precio - b.precio || a.nombre.localeCompare(b.nombre, 'es');
        return a.nombre.localeCompare(b.nombre, 'es');
      });
  }, [busqueda, orden, unidad]);

  const productoAbierto = PRODUCTOS.find((producto) => producto.id === abierta) || null;

  useEffect(() => {
    if (!productoAbierto) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setAbierta(null);
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

      <main>
        <section className="mrc-hero" aria-labelledby="mercado-titulo">
          <div className="mrc-hero__texto">
            <p className="mrc-kicker">Catálogo real de Milpa</p>
            <h1 id="mercado-titulo" className="mrc-titulo">
              Lo que está en cosecha,<br />a la vista.
            </h1>
            <p className="mrc-lead">
              Explore los productos publicados por Milpa, con su foto, precio y unidad de venta.
              Aquí no hay sustitutos: cada tarjeta corresponde a una entrada del catálogo.
            </p>
            <div className="mrc-resumen" aria-label="Resumen del catálogo">
              <div className="mrc-resumen__dato">
                <strong>{PRODUCTOS.length}</strong>
                <span>productos</span>
              </div>
              <div className="mrc-resumen__dato">
                <strong>{PRODUCTOS.length}</strong>
                <span>fotos propias</span>
              </div>
              <div className="mrc-resumen__dato">
                <strong>{UNIDADES.length - 1}</strong>
                <span>unidades de venta</span>
              </div>
            </div>
          </div>
          <div className="mrc-hero__sello" aria-hidden="true">
            <div className="mrc-hero__sello-inner">
              <Camera size={22} strokeWidth={1.5} />
              <span>Foto<br />del catálogo</span>
            </div>
          </div>
        </section>

        <section className="mrc-controles" aria-label="Buscar y filtrar productos">
          <label className="mrc-busqueda">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">Buscar en el catálogo</span>
            <input
              type="search"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar un producto"
            />
          </label>
          <div className="mrc-filtros" role="group" aria-label="Filtrar por unidad de venta">
            {UNIDADES.map((opcion) => (
              <button
                key={opcion}
                type="button"
                className={`mrc-chip${unidad === opcion ? ' is-on' : ''}`}
                onClick={() => setUnidad(opcion)}
                aria-pressed={unidad === opcion}
              >
                {opcion === 'todos' ? 'Todos' : `Por ${opcion}`}
              </button>
            ))}
          </div>
          <label className="mrc-orden">
            <span>Ordenar</span>
            <select value={orden} onChange={(event) => setOrden(event.target.value)}>
              <option value="nombre">Nombre A-Z</option>
              <option value="precio">Precio menor</option>
            </select>
          </label>
        </section>

        <div className="mrc-resultados" aria-live="polite">
          <span>{visibles.length} {visibles.length === 1 ? 'producto' : 'productos'}</span>
          <span className="mrc-resultados__linea" aria-hidden="true" />
          <span>Fotos verificadas del catálogo</span>
        </div>

        <section className="mrc-grid" aria-label="Productos del catálogo de Milpa">
          {visibles.map((producto, index) => (
            <ProductoCard
              key={producto.id}
              producto={producto}
              posicion={index}
              onAbrir={() => setAbierta(producto.id)}
            />
          ))}
          {visibles.length === 0 && (
            <p className="mrc-vacio">No encontramos un producto con esa búsqueda.</p>
          )}
        </section>
      </main>

      <footer className="mrc-pie">
        <ShoppingBasket size={18} aria-hidden="true" />
        <p>De la finca a su mesa, con los datos del catálogo a la vista.</p>
      </footer>

      {productoAbierto && (
        <DetalleProducto producto={productoAbierto} onCerrar={() => setAbierta(null)} />
      )}
    </div>
  );
}

function ProductoCard({ producto, posicion, onAbrir }) {
  return (
    <article
      className="mrc-card"
      data-testid={`producto-${producto.id}`}
      data-product-id={producto.id}
      data-photo={producto.foto}
    >
      <button
        type="button"
        className="mrc-card__foto"
        onClick={onAbrir}
        aria-label={`Ver ${producto.nombre}`}
      >
        <img src={producto.foto} alt={`Foto de ${producto.nombre}`} loading="eager" decoding="async" />
        <span className="mrc-card__numero" aria-hidden="true">{String(posicion + 1).padStart(2, '0')}</span>
        <span className="mrc-card__ver" aria-hidden="true"><ChevronRight size={15} /></span>
      </button>
      <div className="mrc-card__cuerpo">
        <div className="mrc-card__cabeza">
          <h2 className="mrc-card__nombre">{producto.nombre}</h2>
          <span className="mrc-card__fuente">Foto del catálogo</span>
        </div>
        <p className="mrc-precio">
          <span className="mrc-precio__val">{pesos(producto.precio)}</span>
          <span className="mrc-precio__uni"> / {producto.unidad}</span>
        </p>
        <button type="button" className="mrc-card__detalle" onClick={onAbrir}>
          Ver ficha <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function DetalleProducto({ producto, onCerrar }) {
  return (
    <div className="mrc-modal" role="dialog" aria-modal="true" aria-label={`Ficha de ${producto.nombre}`}>
      <button type="button" className="mrc-modal__fondo" aria-label="Cerrar ficha" onClick={onCerrar} />
      <div className="mrc-hoja">
        <div className="mrc-hoja__barra">
          <span className="mrc-hoja__marca">Ficha del catálogo</span>
          <button type="button" className="mrc-cerrar" onClick={onCerrar} aria-label="Cerrar">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="mrc-hoja__scroll">
          <div className="mrc-hoja__foto">
            <img src={producto.foto} alt={`Foto de ${producto.nombre}`} />
          </div>
          <div className="mrc-hoja__producto">
            <div>
              <p className="mrc-kicker">Producto {producto.id}</p>
              <h2 className="mrc-hoja__prodnombre">{producto.nombre}</h2>
              <p className="mrc-precio mrc-precio--g">
                <span className="mrc-precio__val">{pesos(producto.precio)}</span>
                <span className="mrc-precio__uni"> / {producto.unidad}</span>
              </p>
            </div>
          </div>
          <p className="mrc-hoja__nota">
            Foto, precio y unidad tomados de la entrada correspondiente del catálogo de Milpa.
          </p>
        </div>
      </div>
    </div>
  );
}
