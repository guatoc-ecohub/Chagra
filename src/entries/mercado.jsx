/*
 * Entry standalone del mockup Mercado → destino público mercado.chagra.bio.
 *
 * Monta SOLO <Mercado/> sin el shell de la PWA (sin auth, sin capa de datos
 * sqlite-wasm, sin service worker): es una galería pública de diseño con datos
 * de MUESTRA (src/mockups/mercado/datos.js). Sirve como "sitio demo" autónomo
 * en la raíz de un host, en vez de la ruta interna #/mockups/mercado.
 *
 * Reusa la MISMA cadena de CSS global que src/main.jsx para paridad visual
 * con la vista embebida en la app. onBack se omite: en standalone no hay
 * dashboard al que volver (el botón "volver" se oculta solo cuando onBack es
 * undefined — ver Mercado.jsx).
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import '../styles/themes.css';
import '../styles/motion.css';
import '../styles/temas-fase2.css';
import '../styles/clima-atmosfera.css';
import '../styles/sello-confianza.css';
import '../styles/panel-procedencia.css';
import Mercado from '../mockups/Mercado.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Mercado />
  </StrictMode>,
);
