/* eslint-disable chagra-i18n/no-hardcoded-spanish -- standalone public market copy */
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, MapPin, Search, ShieldCheck, ShoppingBag, Tag, X } from 'lucide-react';
import { loadFederatedMarket } from '../services/federatedMarketService';
import '../styles/federatedMarket.css';

const COP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

function price(product) {
  return product.precioCop == null ? 'Precio no informado' : COP.format(product.precioCop);
}

function imageUrl(product) {
  return product.foto || '';
}

export default function FederatedMarket({ onBack }) {
  const nodeId = import.meta.env.VITE_MARKET_NODE_ID || 'central';
  const [market, setMarket] = useState(null);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [nodeFilter, setNodeFilter] = useState('todos');

  useEffect(() => {
    const controller = new AbortController();
    loadFederatedMarket({ nodeId, signal: controller.signal })
      .then(setMarket)
      .catch((loadError) => {
        if (loadError.name !== 'AbortError') setError(loadError);
      });
    return () => controller.abort();
  }, [nodeId]);

  const visibleProducts = useMemo(() => {
    if (!market) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase('es-CO');
    return market.products.filter((product) => {
      const matchesNode = nodeFilter === 'todos' || product.nodeId === nodeFilter;
      const haystack = [product.nombre, product.descripcion, product.productor, ...product.tags]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('es-CO');
      return matchesNode && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [market, nodeFilter, query]);

  const title = nodeId === 'milpa-david' ? 'MILPA' : 'mercado.chagra.bio';
  const kicker = nodeId === 'milpa-david' ? 'Nodo productor de Choachí' : 'Mercado federado';

  return (
    <main className="fmr-root">
      <header className="fmr-header">
        <div className="fmr-brand"><span className="fmr-brand-mark">✳</span>{title}</div>
        <div className="fmr-header-meta"><span className="fmr-live-dot" /> catálogo de origen</div>
        {onBack && <button className="fmr-back" type="button" onClick={onBack}><ArrowLeft size={15} /> Volver</button>}
      </header>

      <section className="fmr-hero">
        <div className="fmr-hero-copy">
          <p className="fmr-kicker">{kicker}</p>
          <h1>De la huerta,<br /><em>sin atajos.</em></h1>
          <p className="fmr-lead">Productos publicados por su nodo de origen. El nombre, el precio y la foto vienen de la fuente, sin catálogo de muestra.</p>
          <div className="fmr-hero-note"><ShieldCheck size={16} /> Procedencia visible, datos sin completar a mano</div>
        </div>
        <div className="fmr-hero-orbit" aria-hidden="true"><span className="fmr-orbit-leaf">◒</span><span className="fmr-orbit-label">campo<br />→ mesa</span></div>
      </section>

      {error && <div className="fmr-state fmr-state-error" role="alert">No se pudo leer el catálogo. {error.message}</div>}
      {!market && !error && <div className="fmr-state">Leyendo el catálogo de origen...</div>}

      {market && (
        <>
          <section className="fmr-toolbar" aria-label="Filtros del mercado">
            <label className="fmr-search"><Search size={17} /><span className="sr-only">Buscar productos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en el catálogo" /></label>
            {market.nodes.length > 1 && <div className="fmr-node-filter" role="group" aria-label="Filtrar por nodo">
              <button type="button" className={nodeFilter === 'todos' ? 'is-active' : ''} onClick={() => setNodeFilter('todos')}>Todos los nodos</button>
              {market.nodes.map((node) => <button key={node.id} type="button" className={nodeFilter === node.id ? 'is-active' : ''} onClick={() => setNodeFilter(node.id)}>{node.name} <small>{node.count}</small></button>)}
            </div>}
          </section>

          <section className="fmr-proof" aria-label="Estado de la fuente">
            <span><span className="fmr-proof-dot" /> {market.products.length} productos visibles</span>
            <span>Fuente: {market.source === 'david-reference' ? 'Milpa Choachí, sección Productos' : 'API federada'}</span>
            {market.comparison && !market.comparison.ok && <span className="fmr-proof-warning">Nodo MILPA pendiente de reconciliación con la API</span>}
          </section>

          <section className="fmr-grid" aria-label="Productos del mercado">
            {visibleProducts.map((product) => <ProductCard key={product.id} product={product} onOpen={() => setSelected(product)} />)}
          </section>
          {visibleProducts.length === 0 && <div className="fmr-state">No hay productos que coincidan con la búsqueda.</div>}
        </>
      )}

      <footer className="fmr-footer"><span>mercado federado</span><span>cada nodo conserva su origen</span></footer>
      {selected && <ProductDetail product={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function ProductCard({ product, onOpen }) {
  return <article className="fmr-card">
    <button className="fmr-card-photo" type="button" onClick={onOpen} aria-label={`Ver ${product.nombre}`}>
      {imageUrl(product) ? <img src={imageUrl(product)} alt={product.nombre} loading="lazy" /> : <ShoppingBag size={42} aria-hidden="true" />}
      {!product.disponible && <span className="fmr-soldout">No disponible</span>}
    </button>
    <div className="fmr-card-body">
      <div className="fmr-card-top"><span className="fmr-card-node">{product.nodeName}</span><ChevronRight size={15} /></div>
      <h2>{product.nombre}</h2>
      {product.descripcion && <p className="fmr-card-description">{product.descripcion}</p>}
      <div className="fmr-price">{price(product)} <span>{product.unidad ? `/ ${product.unidad}` : 'unidad no informada'}</span></div>
      <button className="fmr-origin" type="button" onClick={onOpen}><MapPin size={14} /><span>{product.productor || 'Productor no informado por la fuente'}</span></button>
      <div className="fmr-tags">{product.tags.length ? product.tags.map((tag) => <span key={tag}><Tag size={11} />{tag}</span>) : <span className="fmr-tag-empty">Tags no informados</span>}</div>
    </div>
  </article>;
}

function ProductDetail({ product, onClose }) {
  return <div className="fmr-modal" role="dialog" aria-modal="true" aria-label={`Detalle de ${product.nombre}`}>
    <button className="fmr-modal-backdrop" type="button" aria-label="Cerrar detalle" onClick={onClose} />
    <article className="fmr-detail">
      <button className="fmr-close" type="button" onClick={onClose} aria-label="Cerrar"><X size={19} /></button>
      {imageUrl(product) && <img className="fmr-detail-photo" src={imageUrl(product)} alt={product.nombre} />}
      <p className="fmr-kicker">{product.nodeName}</p>
      <h2>{product.nombre}</h2>
      <p className="fmr-detail-price">{price(product)} {product.unidad && <small>/ {product.unidad}</small>}</p>
      {product.descripcion && <p className="fmr-detail-copy">{product.descripcion}</p>}
      <dl className="fmr-detail-facts">
        <div><dt>Productor</dt><dd>{product.productor || 'No informado en la fuente'}</dd></div>
        <div><dt>Unidad</dt><dd>{product.unidad || 'No informada en la fuente'}</dd></div>
        <div><dt>Tags</dt><dd>{product.tags.length ? product.tags.join(', ') : 'No informados en la fuente'}</dd></div>
      </dl>
    </article>
  </div>;
}
