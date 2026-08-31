/*
 * Entry standalone del mercado federado. El mismo bundle se configura como
 * nodo MILPA o como central mediante VITE_MARKET_NODE_ID.
 *
 * Sin auth, sqlite-wasm ni service worker. Los productos del nodo MILPA salen
 * del snapshot comprobado de #productos; el central lee /api/productos.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../styles/themes.css';
import '../styles/motion.css';
import '../styles/temas-fase2.css';
import '../styles/clima-atmosfera.css';
import '../styles/sello-confianza.css';
import FederatedMarket from '../components/FederatedMarket.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FederatedMarket />
  </StrictMode>,
);
