/* Harness del gate GPU (no versionado): el jaguar lámina-viva solo, grande,
 * con línea de suelo, regla rotulada y el protocolo del gate como texto real
 * (el contrato `html` de shot3d exige contenido visible estable — este panel
 * ES la documentación del gate, no relleno).
 *   ?estado=idle|caminando|listening|speaking  (default idle)
 *   ?size=N        (default 760)
 *   ?mueve=0       desactiva la traslación (marcha en el sitio)
 * Mientras camina, el wrapper se desplaza a la MISMA velocidad que asume el
 * motor (34 px/s, la de useCompaiRoam): el pie apoyado debe quedar CLAVADO
 * contra las marcas de la regla entre capturas.
 */
import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import JaguarLaminaViva from './src/visual/creatures/JaguarLaminaViva.jsx';
import { RIG_MARCHA } from './src/visual/creatures/jaguarLamina/anatomia.js';

const q = new URLSearchParams(location.search);
const estado = q.get('estado') || 'idle';
const size = Number(q.get('size') || 760);
const mueve = q.get('mueve') !== '0';
const V = 34; // px/s — PX_POR_SEG de useCompaiRoam
const TOP = 140;
const ALTO_STAGE = size * (394 / 705);
const SUELO_Y = TOP + (size - ALTO_STAGE) / 2 + ALTO_STAGE * (385 / 394); // pisada delantera (el stage se centra en el cuadrado size×size)

const PROTOCOLO = [
  ['Qué se está juzgando', 'El ensamble del jaguar de la lámina Humboldt (jaguar-natural.png) sobre el set de capas 2.5D: cuerpo-inpaint sin patas como base, tres patas PNG con alfa propio (delantera lejana blanca, trasera cercana naranja, trasera lejana crema), la cuarta pata (delantera cercana naranja) cortada de la lámina por la recta medida, más cabeza face-safe, orejas, mandíbula, párpados y cola cortados por alfa con las rectas de anatomia.js. En reposo la recomposición offline contra la lámina original dio 0.035% de huecos: lo que se ve acá debe leerse idéntico a la lámina.'],
  ['Criterio 1 — cuatro patas exactas', 'Contar patas en cada captura: deben ser EXACTAMENTE cuatro (dos naranjas cercanas, la blanca del pecho y la crema lejana que asoma por la ventana del muslo). El fracaso histórico de este rig era el fantasma de 6-7 patas cuando la base era la lámina completa, y el contorno doble (3-4 patas delanteras) cuando el envolvente se partía por color y cada mitad rotaba por su lado. La base inpainted no tiene patas: si aparece una de más, es una regresión del ensamble.'],
  ['Criterio 2 — cara intacta', 'La cabeza se corta con la banda del cuello más el desvanecido de mandíbula (face-safe): bigotes, hocico, los dos ojos ámbar y las orejas deben estar completos e idénticos a la lámina, sin filo recto que muerda el dibujo. El parpadeo es un parche de piel propia sobre el ojo; la boca cerrada en reposo es la de la lámina.'],
  ['Criterio 3 — gait creíble sin deformar', 'En estado caminando cada pata es una cadena de dos segmentos rígidos (articulación→rodilla→pie, puntos medidos sobre el arte) resuelta por IK analítico: las patas DOBLAN por la rodilla — carpo con vértice adelante en las delanteras, corvejón con vértice atrás en las traseras — y nunca se estiran, escalan ni deforman. La secuencia es marcha lateral cuadrúpeda (trasera cercana, delantera cercana, trasera lejana, delantera lejana, a cuartos de ciclo) con al menos dos pies siempre apoyados y vaivén vertical de la masa de dos por ciclo.'],
  ['Criterio 4 — pisada clavada (cero moonwalk)', 'El período del ciclo se deriva de la velocidad real de pantalla (T = 2·amplitud·escala / (duty·v), v=34 px/s como useCompaiRoam): mientras el wrapper se traslada, cada pie apoyado debe quedar CLAVADO contra las marcas de la regla del suelo entre capturas consecutivas — si un pie apoyado se corre respecto de las marcas, la marcha patina y el acople velocidad/período está roto.'],
  ['Cotas del motor (verificadas en marcha.test.js)', 'IK sobre el pie de reposo devuelve ~0° en las cuatro patas (entrar y salir de la marcha no da tirón); la consistencia FK/IK es menor a 1px en todo el barrido; el tope de flexión plieMax (36° carpo delantero / 26° corvejón trasero) se respeta en todo el ciclo y su piso dMin nunca muerde en apoyo (la pisada clavada no se sacrifica); los picos del ciclo son ~33° de cadera trasera y 36° de rodilla delantera (refino 2026-08-18: pivotes de fémur adentro del cuerpo, anclaje trasero-lejano re-centrado, lift trasero 10, amplitud 25); el vuelo despega donde terminó el apoyo y aterriza donde arranca el siguiente. Lo que el test no puede ver — costuras del arte, solape de rodilla, ventana del muslo en balanceo — se juzga en estas capturas.'],
  ['Caveats conocidos del arte', 'La garra blanca fue completada por espejo (nub de 3-4px al pie); el muslo trasero lejano es una cápsula sintética que en reposo queda bajo la grupa (revisar en balanceo máximo); hay islitas de pelaje estático junto a la ventana (x≈545-585); la costura del relleno de vientre solo se ve con patas en fase opuesta. Ninguno debe leerse a tamaño de avatar; si alguno grita a este tamaño de gate, anotarlo.'],
];

function Demo() {
  const ref = useRef(null);
  const lecturaRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    let t0 = 0;
    const paso = (ahora) => {
      if (!t0) t0 = ahora;
      const t = (ahora - t0) / 1000;
      if (estado === 'caminando' && mueve && ref.current) {
        const rango = Math.max(200, window.innerWidth * 0.45);
        const x = (t * V) % rango;
        ref.current.style.transform = `translateX(${-x}px)`;
      }
      // Lectura en vivo de las vars que escribe el motor (auto-documenta la
      // captura: qué ángulo tenía cada pieza en el instante del screenshot).
      if (lecturaRef.current && ref.current) {
        const raiz = ref.current.querySelector('[data-creature="jaguar"]');
        const v = (n) => (raiz ? raiz.style.getPropertyValue(n) || '0' : '?');
        lecturaRef.current.textContent = `t_pagina=${t.toFixed(2)}s  wrapperX=${(ref.current.style.transform || '').replace('translateX(', '').replace(')', '')}  bob=${v('--jlv-anda-bob')}  `
          + ['delLejana', 'delCercana', 'trasCercana', 'trasLejana']
            .map((c) => `${c}: cad=${v(`--jlv-anda-${c}-cadera`)} rod=${v(`--jlv-anda-${c}-rodilla`)}`)
            .join('  ');
      }
      raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, []);

  const marcas = [];
  for (let x = 0; x < 1920; x += 10) {
    const mayor = x % 100 === 0;
    marcas.push(
      React.createElement('div', {
        key: `m${x}`,
        style: {
          position: 'absolute', left: x, top: SUELO_Y, width: 1,
          height: mayor ? 16 : x % 50 === 0 ? 10 : 5, background: '#a09880',
        },
      }),
    );
    if (x % 50 === 0) {
      marcas.push(
        React.createElement('span', {
          key: `r${x}`,
          style: {
            position: 'absolute', left: x + 3, top: SUELO_Y + (mayor ? 18 : 10),
            fontFamily: 'monospace', fontSize: mayor ? 11 : 9, color: '#8d8468',
          },
        }, String(x)),
      );
    }
  }

  // Leyenda del orden Z del ensamble (NOTAS.md del set de arte), de atrás
  // hacia adelante — chips reales, sirven para nombrar piezas al anotar.
  const ORDEN_Z = ['1 pata-tras-lejana (detrás del cuerpo)', '2 cuerpo-inpaint', '3 pata-del-lejana',
    '4 pata-tras-cercana', '5 cola', '6 pata-del-cercana (naranja, corte lámina)', '7 cabeza + orejas + mandíbula + párpados'];
  const leyenda = React.createElement(
    'div',
    { style: { position: 'absolute', left: 16, top: SUELO_Y + 40, right: 16, display: 'flex', flexWrap: 'wrap', gap: 6 } },
    ORDEN_Z.map((cap) => React.createElement('span', {
      key: cap,
      style: {
        fontFamily: 'monospace', fontSize: 11, color: '#4a4232',
        border: '1px solid #a09880', borderRadius: 3, padding: '2px 7px', background: '#efe9d9',
      },
    }, cap)),
  );

  return React.createElement(
    'div',
    { style: { position: 'fixed', inset: 0, background: '#e9e4d6', overflow: 'auto', fontFamily: 'Georgia, serif', color: '#4a4232' } },
    React.createElement('div', {
      style: { position: 'absolute', left: 16, top: 10, fontFamily: 'monospace', fontSize: 14, color: '#5a523c' },
    }, `gate jaguar lámina-viva · estado=${estado} · size=${size} · v=${V}px/s · marcas cada 10px, rótulo cada 50px`),
    React.createElement('div', {
      style: { position: 'absolute', right: 16, top: 10, fontFamily: 'monospace', fontSize: 12, color: '#8d8468' },
    }, 'rama feat/jaguar-lamina-caminando · gate GPU headed · 2026-08-18'),
    React.createElement('div', {
      ref: lecturaRef,
      style: { position: 'absolute', left: 16, top: 30, fontFamily: 'monospace', fontSize: 11, color: '#5a523c', whiteSpace: 'pre-wrap', maxWidth: 900 },
    }, 'lectura del motor…'),
    React.createElement('div', {
      style: { position: 'absolute', left: 0, right: 0, top: SUELO_Y, height: 1, background: '#8d8468' },
    }),
    marcas,
    leyenda,
    React.createElement(
      'div',
      { ref, style: { position: 'absolute', left: '40%', top: TOP } },
      React.createElement(JaguarLaminaViva, { estado, size, title: 'jaguar' }),
    ),
    React.createElement(
      'div',
      { style: { position: 'absolute', left: 16, right: '62%', top: 60, fontSize: 12.5, lineHeight: 1.45 } },
      PROTOCOLO.map(([titulo, cuerpo], i) => React.createElement(
        'section',
        { key: i, style: { marginBottom: 10 } },
        React.createElement('h3', { style: { margin: '0 0 3px', fontSize: 13.5 } }, titulo),
        React.createElement('p', { style: { margin: 0 } }, cuerpo),
      )),
      React.createElement(
        'table',
        { style: { fontFamily: 'monospace', fontSize: 11.5, borderCollapse: 'collapse', marginTop: 6 } },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            ['pata', 'articulación', 'rodilla', 'pie', 'anclaje', 'fase', 'lado'].map((h) => React.createElement('th', { key: h, style: { border: '1px solid #a09880', padding: '2px 6px', textAlign: 'left' } }, h)),
          ),
        ),
        React.createElement(
          'tbody',
          null,
          Object.entries(RIG_MARCHA).map(([clave, rig]) => React.createElement(
            'tr',
            { key: clave },
            [clave, rig.articulacion.join(','), rig.rodilla.join(','), rig.pie.join(','), rig.anclaje.join(','), String(rig.fase), rig.lado > 0 ? 'corvejón atrás' : 'carpo adelante']
              .map((celda, j) => React.createElement('td', { key: j, style: { border: '1px solid #a09880', padding: '2px 6px' } }, celda)),
          )),
        ),
      ),
    ),
  );
}

createRoot(document.getElementById('root')).render(React.createElement(Demo));
