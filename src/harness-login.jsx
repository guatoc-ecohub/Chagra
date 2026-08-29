/* Harness de GATE — muestra el peek-pizarra del compai (BurbujaPizarraPeek) tal
   como está VIVO en dev, para juzgar el arte (pizarra/tiza vs madera). Captura. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/themes.css';
import './styles/motion.css';
import BurbujaPizarraPeek from './components/BurbujaPizarraPeek.jsx';

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e1218', padding: 24 }}>
      <div style={{ position: 'relative', width: 360 }}>
        <BurbujaPizarraPeek
          mensaje="Su café en sombra está listo para la próxima poda; revise la humedad del cafetal."
          nombre="Angelita"
          silenciado={false}
          onVer={() => {}}
          onEscuchar={() => {}}
          onCallar={() => {}}
          onMas={() => {}}
          onCerrar={() => {}}
        />
      </div>
    </div>
  );
}

createRoot(document.getElementById('raiz')).render(<App />);
