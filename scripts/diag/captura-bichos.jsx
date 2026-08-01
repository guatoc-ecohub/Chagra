/*
 * captura-bichos — ARNÉS DE DIAGNÓSTICO VISUAL (scripts/diag, regla de la casa:
 * scripts versionados, no pegotes por SSH). Sirve para VER y CAPTURAR la vida
 * de los 9 personajes rubber-hose lado a lado, con la etiqueta VIVA de qué
 * momento del idle-cerebro corre en cada uno (data-vida / data-pose).
 *
 * Uso (vite dev):  npm run dev  →  http://127.0.0.1:5173/scripts/diag/captura-bichos.html
 * Query params:
 *   ?gesto=1   además de la fila viva, una fila por bicho con sus gestos-firma
 *              FORZADOS por props (frames garantizados para captura).
 * NO va al bundle de prod: nada lo importa desde src/.
 */
import { createElement as h, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AbejaAngelita, OsoAndino, Colibri, RanaAndina, Perezoso,
  Ardilla, Jaguar, Morrocoy, Borugo,
} from '../../src/visual/creatures/index.js';

const BICHOS = [
  ['abeja-angelita', AbejaAngelita, 'Angelita (vara)', {}],
  ['oso-andino', OsoAndino, 'Oso andino', { gestos: ['resopla', 'rasca'] }],
  ['colibri', Colibri, 'Colibrí', { gestos: ['acicala', 'vibra'] }],
  ['rana-andina', RanaAndina, 'Rana arlequín', { gestos: ['croa', 'medita'] }],
  ['perezoso', Perezoso, 'Perezoso', { gestos: ['dormita', 'estira'] }],
  ['ardilla', Ardilla, 'Ardilla', { gestos: ['inspecciona', 'roe'] }],
  ['jaguar', Jaguar, 'Jaguar', { gestos: ['ruge', 'acecha'] }],
  ['morrocoy', Morrocoy, 'Morrocoy', { gestos: ['seRetrae', 'asiente'] }],
  ['borugo', Borugo, 'Borugo', { gestos: ['olfatea', 'acurruca'] }],
];

/* Tarjeta con etiqueta VIVA: un MutationObserver lee data-vida/data-pose del
   svg del bicho y lo pinta debajo — así el screenshot PRUEBA qué momento del
   cerebro corría en el instante de la captura. */
function Tarjeta({ nombre, children }) {
  const ref = useRef(null);
  const [estado, setEstado] = useState('—');
  useEffect(() => {
    const svg = ref.current?.querySelector('svg[data-creature]');
    if (!svg) return undefined;
    const leer = () => setEstado(
      svg.getAttribute('data-vida') || svg.getAttribute('data-pose') || 'base',
    );
    leer();
    const mo = new MutationObserver(leer);
    mo.observe(svg, { attributes: true, attributeFilter: ['data-vida', 'data-pose'] });
    return () => mo.disconnect();
  }, []);
  return h('figure', { style: { margin: 4, textAlign: 'center', width: 150 } },
    h('div', { ref }, children),
    h('figcaption', { style: { fontSize: 13 } },
      h('strong', null, nombre), h('br'),
      h('code', { style: { fontSize: 12, color: '#7a4a12' } }, estado)));
}

function Grilla() {
  const conGestos = new URLSearchParams(window.location.search).has('gesto');
  return h('div', null,
    h('h3', { style: { margin: '4px 8px' } }, 'Fila viva — idle-cerebro solo (data-vida en vivo)'),
    h('div', { style: { display: 'flex', flexWrap: 'wrap' } },
      BICHOS.map(([slug, Comp, nombre]) =>
        h(Tarjeta, { key: slug, nombre },
          h(Comp, { size: 132, animated: true })))),
    conGestos && h('div', null,
      h('h3', { style: { margin: '10px 8px 4px' } }, 'Gestos-firma FORZADOS por props (frames garantizados)'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap' } },
        BICHOS.filter(([, , , x]) => x.gestos).flatMap(([slug, Comp, nombre, x]) =>
          x.gestos.map((g) =>
            h(Tarjeta, { key: `${slug}-${g}`, nombre: `${nombre} · ${g}` },
              h(Comp, { size: 110, animated: true, vida: false, [g]: true })))))));
}

createRoot(document.getElementById('raiz')).render(h(Grilla));
