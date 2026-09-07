/* eslint-disable react-refresh/only-export-components -- entry del harness, monta con createRoot */
/**
 * iconos-etapa-ciclo-harness.jsx — gate visual del set `src/visual/icons`.
 *
 * La pregunta que responde NO es "¿cada icono es lindo?" sino "¿los seis se
 * leen como UNA familia y se distinguen de un vistazo a tamaño de card?".
 * Por eso muestra el set COMPLETO junto, en escalera de tamaños, en monocromo
 * (sin la muleta del color), al lado de los Lucide con los que convive en la
 * card, antes/después, y la card real montada a ancho de celular.
 *
 * Uso: npx vite --config vite.config.gate.mjs --port 3017
 *      → http://localhost:3017/tests/visual/iconos-etapa-ciclo-harness.html
 */
import { createRoot } from 'react-dom/client';
import { Sprout, CheckCircle, Bug, Wrench, AlertTriangle, ChevronDown } from 'lucide-react';
import '../../src/index.css';
import { ICONOS_ETAPA_POR_ORDEN, IconoEtapaCiclo } from '../../src/visual/icons/index.js';
import GuiaEspecieCards from '../../src/components/aprendizaje/GuiaEspecieCards.jsx';

const ETAPAS = ['Germinación', 'Vegetativo', 'Floración', 'Fructificación', 'Cosecha', 'Producto'];

/* Mismos tokens que getEtapaColor en GuiaEspecieCards (Tailwind v3): text-*-200 / bg-*-900 al 20 %. */
const CHIP = [
  { texto: '#d9f99d', fondo: '#365314' }, // lime
  { texto: '#bbf7d0', fondo: '#14532d' }, // green
  { texto: '#fbcfe8', fondo: '#831843' }, // pink
  { texto: '#fde68a', fondo: '#78350f' }, // amber
  { texto: '#fef08a', fondo: '#713f12' }, // yellow
  { texto: '#e2e8f0', fondo: '#0f172a' }, // slate
];

const mono = { fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#94a3b8' };
const titulo = { ...mono, color: '#cbd5e1', fontSize: 12, margin: '0 0 8px' };
const seccion = { padding: '14px 16px', borderBottom: '1px solid #1e293b' };

function Chip({ orden, size = 16 }) {
  const c = CHIP[orden - 1];
  return (
    <div
      style={{
        padding: 6, borderRadius: 8, display: 'inline-flex',
        background: `color-mix(in srgb, ${c.fondo} 20%, transparent)`, color: c.texto,
      }}
    >
      <IconoEtapaCiclo orden={orden} size={size} />
    </div>
  );
}

function FilaFamilia({ size, color, fondo }) {
  return (
    <div style={{ display: 'flex', gap: Math.max(10, size / 3), alignItems: 'center', flexWrap: 'wrap', background: fondo, color, padding: 8, borderRadius: 6 }}>
      <span style={{ ...mono, width: 34, color: fondo === '#0f172a' ? '#64748b' : '#7c6f5a' }}>{size}px</span>
      {ICONOS_ETAPA_POR_ORDEN.map((Icono, i) => <Icono key={ETAPAS[i]} size={size} />)}
    </div>
  );
}

function Gate() {
  return (
    <main style={{ background: '#020617', minHeight: '100vh', color: '#e2e8f0' }}>
      {/* A · La familia a tamaño de card, cada una en su chip de color */}
      <section data-testid="sec-a" style={seccion}>
        <p style={titulo}>A · familia a 16 px en su chip (como en la card)</p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', background: '#0f172a', padding: 10, borderRadius: 8 }}>
          {ETAPAS.map((nombre, i) => (
            <div key={nombre} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <Chip orden={i + 1} />
              <span style={{ ...mono, fontSize: 9 }}>{nombre.toLowerCase()}</span>
            </div>
          ))}
        </div>
      </section>

      {/* B · Silueta pura: sin color por etapa, escalera de tamaños, oscuro y claro */}
      <section data-testid="sec-b" style={seccion}>
        <p style={titulo}>B · monocromo, escalera 16→96 px (silueta sin muleta de color)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[16, 20, 24, 32, 48, 96].map((s) => <FilaFamilia key={s} size={s} color="#e2e8f0" fondo="#0f172a" />)}
          {[16, 32].map((s) => <FilaFamilia key={`claro-${s}`} size={s} color="#1e293b" fondo="#f4efe2" />)}
        </div>
      </section>

      {/* C · Peso de línea contra los Lucide con los que convive en la misma card */}
      <section data-testid="sec-c" style={seccion}>
        <p style={titulo}>C · vecinos Lucide de la misma card, todo a 16 px y a 32 px</p>
        {[16, 32].map((s) => (
          <div key={s} style={{ display: 'flex', gap: s / 2, alignItems: 'center', flexWrap: 'wrap', background: '#0f172a', padding: 8, borderRadius: 6, marginBottom: 6, color: '#e2e8f0' }}>
            {ICONOS_ETAPA_POR_ORDEN.map((Icono, i) => <Icono key={ETAPAS[i]} size={s} />)}
            <span style={{ ...mono, margin: '0 4px' }}>|</span>
            <Sprout size={s} /><Bug size={s} /><Wrench size={s} /><AlertTriangle size={s} /><CheckCircle size={s} /><ChevronDown size={s} />
          </div>
        ))}
      </section>

      {/* D · Antes (Sprout×2 + CheckCircle×4) → después */}
      <section data-testid="sec-d" style={seccion}>
        <p style={titulo}>D · antes (dev hoy) → después, en sus chips</p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: '#0f172a', padding: 10, borderRadius: 8 }}>
          {[Sprout, Sprout, CheckCircle, CheckCircle, CheckCircle, CheckCircle].map((Viejo, i) => (
            <div key={ETAPAS[i]} style={{ padding: 6, borderRadius: 8, display: 'inline-flex', background: `color-mix(in srgb, ${CHIP[i].fondo} 20%, transparent)`, color: CHIP[i].texto }}>
              <Viejo size={16} />
            </div>
          ))}
          <span style={mono}>→</span>
          {ETAPAS.map((nombre, i) => <Chip key={nombre} orden={i + 1} />)}
        </div>
      </section>

      {/* E · La card real, a ancho de celular, dos especies */}
      <section data-testid="sec-e" style={{ ...seccion, borderBottom: 'none' }}>
        <p style={titulo}>E · card real GuiaEspecieCards a 390 px (papa · café)</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: 390 }} data-testid="card-papa"><GuiaEspecieCards especie="papa" /></div>
          <div style={{ width: 390 }} data-testid="card-cafe"><GuiaEspecieCards especie="cafe" /></div>
        </div>
      </section>
      <div data-testid="gate-listo" hidden />
    </main>
  );
}

createRoot(document.getElementById('iconos-root')).render(<Gate />);
