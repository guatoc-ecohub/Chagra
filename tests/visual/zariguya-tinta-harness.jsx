/* eslint-disable react-refresh/only-export-components -- arnés visual aislado */
/*
 * Arnés de gate de la zarigüeya trazada (ZariguyaTrazado, la piel de tinta).
 * UNA vista por página (?vista=…) para que la captura headless salga con el
 * MISMO encuadre antes y después, sin rótulos dentro de la imagen (el juez
 * barato lee el texto de la imagen y contesta eso — RULINGS 2026-09-04).
 *
 *   ?vista=idle      560 px, idle, quieta (fidelidad contra la lámina)
 *   ?vista=card      64 px, idle, quieta (la tarjeta real del selector)
 *   ?vista=camina    560 px, estado caminando, animada (costuras del rig)
 *   ?vista=habla     560 px, speaking, visema V3 (fauces)
 *   ?vista=husmea    560 px, idle con vida forzada husmea
 *   ?vista=<pose>    560 px, poseForzada: muerta · crias · verlupa · cute ·
 *                    escucha-02 (las viñetas del set)
 *   &fondo=noche     fondo oscuro (#101623) en vez de papel (#f4efe2)
 *   &giro=<deg>      clava el hueso cabezaGiro en ese ángulo (rango real de la
 *                    CSS: -13° double-take … +10°; husmea -12°, mira -10°) y
 *   &ladeo=<deg>     el hueso cabeza (ladeo -1.8° … +2°) — quieta, para ver la
 *                    costura del casquete en cada posición del rango
 *   &rig=1           monta ZariguyaTrazadoRig directo (sin CompaiAgente): las
 *                    poseForzada/vidaForzada llegan sin que el registro de
 *                    poses del agente pise data-pose
 */
import { createRoot } from 'react-dom/client';
import ZariguyaTrazadoFachada, { ZariguyaTrazadoRig } from '../../src/visual/creatures/ZariguyaTrazado.jsx';

const q = new URLSearchParams(window.location.search);
const vista = q.get('vista') || 'idle';
const fondo = q.get('fondo') === 'noche' ? '#101623' : '#f4efe2';
const ZariguyaTrazado = q.get('rig') === '1' ? ZariguyaTrazadoRig : ZariguyaTrazadoFachada;
const POSES = ['muerta', 'crias', 'verlupa', 'cute', 'escucha-01', 'escucha-02', 'escucha-03', 'escucha-04'];

function Pieza() {
  if (vista === 'card') return <ZariguyaTrazado size={64} animated={false} modo="normal" />;
  if (vista === 'camina') return <ZariguyaTrazado size={560} estado="caminando" modo="normal" />;
  if (vista === 'habla') return <ZariguyaTrazado size={560} estado="speaking" visema="V3" modo="normal" />;
  if (vista === 'husmea') return <ZariguyaTrazado size={560} estado="idle" vidaForzada="husmea" modo="normal" />;
  if (POSES.includes(vista)) return <ZariguyaTrazado size={560} poseForzada={vista} modo="normal" />;
  return <ZariguyaTrazado size={560} animated={false} modo="normal" />;
}

function Gate() {
  const lado = vista === 'card' ? 80 : 600;
  return (
    <main style={{ width: lado, height: lado, background: fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Pieza />
    </main>
  );
}

const giro = q.get('giro');
const ladeo = q.get('ladeo');
if (giro !== null || ladeo !== null) {
  const css = document.createElement('style');
  css.textContent = [
    giro !== null ? `.zariguyaHuesos .zh-cabezaGiro{animation:none!important;transform:rotate(${Number(giro)}deg)!important}` : '',
    ladeo !== null ? `.zariguyaHuesos .zh-cabeza{animation:none!important;transform:rotate(${Number(ladeo)}deg)!important}` : '',
  ].join('\n');
  document.head.appendChild(css);
}
document.body.style.margin = '0';
document.body.style.background = fondo;
createRoot(document.getElementById('tinta-root')).render(<Gate />);
