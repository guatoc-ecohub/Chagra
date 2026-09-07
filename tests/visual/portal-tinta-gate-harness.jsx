/* eslint-disable react-refresh/only-export-components --
 * Harness de gate (no es módulo de app): monta y no exporta nada.
 * eslint-disable chagra-i18n/no-hardcoded-spanish -- rótulos fijos de gate. */
/**
 * portal-tinta-gate-harness.jsx — gate visual del PR #3140 (migración 097).
 *
 * El merge está probado por IDENTIDAD de módulo (compaiRegistry.test.js), no
 * por ojo. Este harness monta el PortalComponent que devuelve el registro
 * (resolverCompai(tipo).PortalComponent) para los tres migrados a TINTA y el
 * oso-baston como CONTROL (su piel es la lámina musculosa, NO Trazado): si el
 * oso se ve igual a las tintas, el harness está mintiendo.
 *
 * Se monta el MISMO cuerpo que el handoff 2D→3D (AbejaTransicion crea el
 * Cuerpo con { size, animated }), a tamaño grande para juzgar anatomía y a
 * 76px (el tamaño real de cruce). Cada compai sobre claro y sobre noche.
 */
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import '../../src/index.css';
import { resolverCompai } from '../../src/visual/mundo3d/escenas/compaiRegistry.js';

const FONDO = { claro: '#f4efe2', noche: '#101623' };
const TINTA = { claro: '#2a1a0c', noche: '#f4efe2' };

/* Cuerpo exacto del registro + extras canónicos por especie (punk solo
   actuando: la cresta del chivito es identidad, igual que en el selector). */
const EXTRA = {
  zariguya: {},
  luciernaga: {},
  'chivito-punk': { punk: true, modo: 'actuando' },
  'oso-baston': {},
};

const NOMBRE = {
  zariguya: 'zarigüeya',
  luciernaga: 'luciérnaga',
  'chivito-punk': 'chivito punk (actúa)',
  'oso-baston': 'oso del bastón (CONTROL)',
};

function CuerpoDe({ tipo, size, quieto = false }) {
  const C = resolverCompai(tipo).PortalComponent;
  const props = { size, ...(EXTRA[tipo] || {}) };
  if (quieto) props.animated = false;
  return createElement(C, props);
}

/* Un panel: un compai sobre un fondo, con ancho CONTENIDO (el layout se define
   solo). Grande (juicio de anatomía) + la fila chica 76px (tamaño real del
   cruce del portal) + 32px. El rótulo va FUERA del panel (abajo), para
   recortarlo antes de pasarle la imagen al juez. */
function Panel({ tipo, fondoKey, grande }) {
  const f = FONDO[fondoKey];
  const tinta = TINTA[fondoKey];
  return (
    <div
      style={{
        background: f, color: tinta, display: 'inline-flex', flexDirection: 'column',
        alignItems: 'center', padding: '12px 14px 10px', borderRadius: 10,
      }}
    >
      <CuerpoDe tipo={tipo} size={grande} />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
        <CuerpoDe tipo={tipo} size={76} />
        <CuerpoDe tipo={tipo} size={32} />
      </div>
    </div>
  );
}

/* Un compai completo: sus dos fondos (claro + noche) lado a lado y el rótulo
   bajo la unidad (zona que el juez no debe ver). */
function UnidadCompai({ tipo, grande }) {
  return (
    <section
      data-compai={tipo}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10 }}
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <Panel tipo={tipo} fondoKey="claro" grande={grande} />
        <Panel tipo={tipo} fondoKey="noche" grande={grande} />
      </div>
      <div
        data-rotulo
        style={{
          textAlign: 'center', color: '#e8e4d8', fontFamily: 'monospace',
          fontSize: 13, padding: '2px 0 0', letterSpacing: 0.4,
        }}
      >
        {NOMBRE[tipo]}
      </div>
    </section>
  );
}

const TIPOS = ['zariguya', 'luciernaga', 'chivito-punk', 'oso-baston'];

function Gate() {
  const params = new URLSearchParams(window.location.search);
  const solo = params.get('tipo');
  const grande = params.get('grande') ? Number(params.get('grande')) : (solo ? 300 : 230);
  if (solo) {
    return (
      <main
        style={{
          display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
          padding: 10, background: '#0b1017', minHeight: '100vh',
        }}
      >
        <UnidadCompai tipo={solo} grande={grande} />
      </main>
    );
  }
  return (
    <main style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', background: '#0b1017', padding: 10 }}>
      {TIPOS.map((t) => (
        <UnidadCompai key={t} tipo={t} grande={grande} />
      ))}
    </main>
  );
}

createRoot(document.getElementById('portal-root')).render(<Gate />);
