/* eslint-disable react-refresh/only-export-components -- arnés visual aislado */
/*
 * Arnés de gate del jaguar trazado (JaguarTrazado, la piel de tinta). Clon
 * del arnés de la zarigüeya (tests/visual/zariguya-tinta-harness.jsx): UNA
 * vista por página para que la captura headless salga con el MISMO encuadre
 * antes y después, sin rótulos dentro de la imagen (el juez barato lee el
 * texto de la imagen y contesta eso — RULINGS 2026-09-04).
 *
 *   ?vista=idle      560 px, idle, quieto (fidelidad contra la lámina)
 *   ?vista=card      64 px, idle, quieto (la tarjeta real del selector)
 *   ?vista=camina    560 px, estado caminando, animado (costuras del rig)
 *   ?vista=habla     560 px, speaking, visema V3 (fauces)
 *   ?vista=actua     560 px, modo actuando; con &t=<s> congela TODAS las
 *                    animaciones CSS en el segundo t del ciclo
 *   ?estado=<x>      alias de ?vista (caminando → camina, speaking → habla)
 *   &size=<px>       tamaño del bicho (por defecto 560; card = 64)
 *   &fondo=noche     fondo oscuro (#101623) en vez de papel (#f4efe2)
 *   &giro=<deg>      clava el hueso cabezaGiro en ese ángulo y
 *   &ladeo=<deg>     el hueso cabeza — quietos, para ver la costura del
 *                    casquete en cada posición del rango
 *   &rig=1           monta JaguarTrazadoRig directo (sin CompaiAgente)
 *   &capa=off|on     fuerza la capa de ROSETAS DE TARJETA apagada (A/B del
 *                    mismo build a 64 px) o encendida a cualquier tamaño (para
 *                    inspeccionar su geometría con zoom a 560 px)
 */
import { createRoot } from 'react-dom/client';
import JaguarTrazadoFachada, { JaguarTrazadoRig } from '../../src/visual/creatures/JaguarTrazado.jsx';

const q = new URLSearchParams(window.location.search);
const ALIAS = { caminando: 'camina', walking: 'camina', speaking: 'habla', respondiendo: 'habla' };
const pedido = q.get('vista') || q.get('estado') || 'idle';
const vista = ALIAS[pedido] || pedido;
const fondo = q.get('fondo') === 'noche' ? '#101623' : '#f4efe2';
const JaguarTrazado = q.get('rig') === '1' ? JaguarTrazadoRig : JaguarTrazadoFachada;
const size = Number(q.get('size')) || (vista === 'card' ? 64 : 560);

function Pieza() {
  if (vista === 'card') return <JaguarTrazado size={size} animated={false} modo="normal" />;
  if (vista === 'actua') return <JaguarTrazado size={size} estado="idle" modo="actuando" />;
  if (vista === 'camina') return <JaguarTrazado size={size} estado="caminando" modo="normal" />;
  if (vista === 'habla') return <JaguarTrazado size={size} estado="speaking" visema="V3" modo="normal" />;
  return <JaguarTrazado size={size} animated={false} modo="normal" />;
}

function Gate() {
  const lado = size + 16 + (size > 200 ? 24 : 0);
  return (
    <main style={{ width: lado, height: lado, background: fondo, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Pieza />
    </main>
  );
}

const giro = q.get('giro');
const ladeo = q.get('ladeo');
const t = q.get('t');
const capa = q.get('capa');
if (giro !== null || ladeo !== null || t !== null || capa !== null) {
  const css = document.createElement('style');
  css.textContent = [
    t !== null ? `.jaguarHuesos *{animation-delay:-${Number(t)}s!important;animation-play-state:paused!important}` : '',
    giro !== null ? `.jaguarHuesos .jh-cabezaGiro{animation:none!important;transform:rotate(${Number(giro)}deg)!important}` : '',
    ladeo !== null ? `.jaguarHuesos .jh-cabeza{animation:none!important;transform:rotate(${Number(ladeo)}deg)!important}` : '',
    capa === 'off' ? '.jt-tarjeta{display:none!important}' : '',
    capa === 'on' ? '.jt-tarjeta{display:inline!important}' : '',
  ].join('\n');
  document.head.appendChild(css);
}
document.body.style.margin = '0';
document.body.style.background = fondo;
createRoot(document.getElementById('tinta-root')).render(<Gate />);
