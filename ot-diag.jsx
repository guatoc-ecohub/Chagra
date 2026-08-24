/* eslint-disable react-refresh/only-export-components -- arnés de diagnóstico
   de la astilla del hombro (rama fable/oso-astilla-hombro-r2; no se mergea).
   Parámetros:
   ?giro=-18|0|18      pin de .olv-cabezaGesto (mismo mecanismo del arnés)
   &sujeto=trazado|viva|ambos
   &sin=overlay,banda,fauces,orejasI,orejasD,palo,parpados  cirugía de capas
        (solo trazado; quita esa capa del string ANTES de inyectar)
   &dif=1              apila full vs surgerido con mix-blend-mode:difference
                       sobre fondo negro: lo que se enciende ES lo que aporta
                       la capa(s) removida(s) EN ESE ángulo.
   &grilla=1           grilla numerada en UNIDADES DE LÁMINA cada 50. */
import { createRoot } from 'react-dom/client';
import { OSO_TRAZADO_SVG, OT_VIEWBOX } from './src/visual/creatures/osoTrazado/pielTrazado.js';
import OsoBastonLaminaViva from './src/visual/creatures/OsoBastonLaminaViva.jsx';

const q = new URLSearchParams(location.search);
const giro = q.get('giro') || '0';
const sujeto = q.get('sujeto') || 'trazado';
const sin = (q.get('sin') || '').split(',').filter(Boolean);
const dif = q.get('dif') === '1';
const grilla = q.get('grilla') === '1';

// quieto SIEMPRE: el gate mide forma, no fase
const st = document.createElement('style');
st.textContent = '*{animation:none!important;transition:none!important}';
document.head.appendChild(st);
// pin del giro, idéntico al arnés oficial (oso-trazado-demo.html)
const pin = document.createElement('style');
pin.textContent = `.pin .olv-cabezaGesto{animation:none!important;transform:rotate(${giro}deg)!important}
.pin .olv-cabezaMira,.pin .olv-cabezaPivote{animation:none!important;transform:none!important}`;
document.head.appendChild(pin);

// ── cirugía de capas sobre el string plano ────────────────────────────────
const CIRUGIAS = {
  overlay: [/<g class="ot-detalle-overlay"[^>]*>[\s\S]*?<\/g>/],
  banda: [/<g clip-path="url\(#otSilueta\)"><g mask="url\(#ot-casquete-cabeza\)">[\s\S]*?<\/g><\/g>/],
  fauces: [/<g clip-path="url\(#otSilueta\)"><g mask="url\(#ot-casquete-mandibula\)">[\s\S]*?<\/g><\/g>/],
  orejasI: [/<g clip-path="url\(#otSilueta\)"><g mask="url\(#ot-casquete-orejaI\)">[\s\S]*?<\/g><\/g>/],
  orejasD: [/<g clip-path="url\(#otSilueta\)"><g mask="url\(#ot-casquete-orejaD\)">[\s\S]*?<\/g><\/g>/],
  palo: [/<g clip-path="url\(#otSilueta\)"><g mask="url\(#ot-casquete-corona\)">[\s\S]*?<\/g><\/g>/],
  parpados: [/<ellipse class="olv-parpado"[^>]*\/>/g],
};
function quirurgico(svg) {
  let s = svg;
  const hechas = [];
  for (const nombre of sin) {
    const regs = CIRUGIAS[nombre];
    if (!regs) continue;
    for (const re of regs) {
      if (re.test(s)) { s = s.replace(re, ''); hechas.push(nombre); break; }
    }
  }
  // canario de cirugía: si pediste capa y no se encontró, se avisa en DOM
  if (hechas.length !== sin.length) {
    const aviso = document.createElement('div');
    aviso.style.cssText = 'position:fixed;top:2px;left:4px;background:#900;color:#fff;font:bold 12px monospace;padding:2px 6px;z-index:99';
    aviso.textContent = `CIRUGIA INCOMPLETA: pedi [${sin}] hice [${hechas}]`;
    document.body.appendChild(aviso);
  }
  return s;
}

const SVG_FULL = OSO_TRAZADO_SVG;
const SVG_CORTADO = sin.length ? quirurgico(OSO_TRAZADO_SVG) : SVG_FULL;

function Grilla() {
  const lineas = [];
  for (let x = -20; x <= 635; x += 50) lineas.push(<line key={`x${x}`} x1={x} y1={-30} x2={x} y2={660} stroke="#00c" strokeWidth={x % 100 === 0 ? 0.7 : 0.35} opacity={x % 100 === 0 ? 0.8 : 0.45} />);
  for (let y = -30; y <= 660; y += 50) lineas.push(<line key={`y${y}`} x1={-20} y1={y} x2={635} y2={y} stroke="#00c" strokeWidth={y % 100 === 0 ? 0.7 : 0.35} opacity={y % 100 === 0 ? 0.8 : 0.45} />);
  const nums = [];
  for (let x = 0; x <= 600; x += 100) nums.push(<text key={`tx${x}`} x={x + 1.5} y={-24} fontSize="11" fill="#00c">{x}</text>);
  for (let y = 0; y <= 600; y += 100) nums.push(<text key={`ty${y}`} x={-18} y={y - 2} fontSize="11" fill="#00c">{y}</text>);
  return (
    <svg viewBox={OT_VIEWBOX} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {lineas}{nums}
    </svg>
  );
}

function Trazado({ svg }) {
  return (
    <div className="pin" style={{ position: 'relative', width: 480, height: 480 }}
      dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg style="width:100%;height:100%;display:block" ') }} />
  );
}

function App() {
  return (
    <div className="fila">
      {(sujeto === 'trazado' || sujeto === 'ambos') && (
        dif ? (
          <div className="caja"><h3>DIFF full vs sin[{sin}] a {giro}° (lo encendido = aporte de la capa)</h3>
            <div style={{ position: 'relative', width: 480, height: 480, background: '#000' }}>
              <div style={{ position: 'absolute', inset: 0 }}><Trazado svg={SVG_FULL} /></div>
              <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'difference' }}><Trazado svg={SVG_CORTADO} /></div>
            </div>
          </div>
        ) : (
          <div className="caja"><h3>TRAZADO a {giro}° {sin.length ? `sin[${sin}]` : '(full)'}</h3>
            <div style={{ position: 'relative' }}><Trazado svg={SVG_CORTADO} />{grilla && <Grilla />}</div>
          </div>
        )
      )}
      {(sujeto === 'viva' || sujeto === 'ambos') && (
        <div className="caja pin"><h3>LÁMINA VIVA (aprobada) a {giro}°</h3>
          <div style={{ width: 480, display: 'flex', justifyContent: 'center' }}>
            <OsoBastonLaminaViva estado="idle" size={480} />
          </div>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);
