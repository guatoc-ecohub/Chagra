/* eslint-disable react-refresh/only-export-components -- arnés de gate (vite dev + browser), no código de la app */
/* _gate-vitrina-zari — vitrina mínima del gate visual de la zarigüeya Gemini
 * (versionada para re-correr el gate): los estados del agente a 220px sobre fondo oscuro y claro,
 * más el close-up de escucha a 80px y los dos gags de vida forzados.
 * Se sirve con `vite dev` y se captura con chromium headless
 * (shot-vitrina.mjs). */
import { createRoot } from 'react-dom/client';
import ZariguyaGeminiLaminaViva from '../../src/visual/creatures/ZariguyaGeminiLaminaViva.jsx';

const CASOS = [
  { rotulo: 'idle (lámina-rig)', props: { estado: 'idle', size: 220 } },
  { rotulo: 'speaking (V2)', props: { estado: 'speaking', visema: 'V2', size: 220 } },
  { rotulo: 'listening (ciclo)', props: { estado: 'listening', size: 220 } },
  { rotulo: 'thinking (ver-lupa)', props: { estado: 'thinking', size: 220 } },
  { rotulo: 'tanatosis (muerta)', props: { estado: 'idle', vidaForzada: 'tanatosis', size: 220 } },
  { rotulo: 'reposo (cute)', props: { estado: 'idle', vidaForzada: 'reposo', size: 220 } },
  { rotulo: 'listening 80px (close-up)', props: { estado: 'listening', size: 80 } },
  { rotulo: 'caminando', props: { estado: 'caminando', size: 220 } },
];

function Fila({ tono }) {
  return (
    <div className={`fila ${tono}`}>
      {CASOS.map(({ rotulo, props }) => (
        <div className="celda" key={rotulo}>
          <span className="marco" style={{ lineHeight: 0 }}>
            <ZariguyaGeminiLaminaViva {...props} />
          </span>
          <span>{rotulo}</span>
        </div>
      ))}
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <>
    <Fila tono="oscura" />
    <Fila tono="clara" />
  </>,
);
