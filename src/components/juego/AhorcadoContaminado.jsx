import { useCallback, useMemo, useState } from 'react';
import { Sparkles, ShieldAlert, RotateCcw } from 'lucide-react';
import {
  CATEGORIAS,
  FUENTES,
  PALABRAS,
  PALABRAS_POR_CATEGORIA,
} from '../../data/juegos/ahorcadoContaminado';
// Las creatures REALES de la casa (familia rubber-hose compartida): imports
// directos de cada componente — NO del index (el index arrastra el registry
// con toda la fauna al chunk del juego). Los componentes compartidos no se
// tocan: el juego solo los DIRIGE por props + CSS propio (prefijo jp-ah-).
// Angelita protagoniza; colibrí, mariposa pasionaria, lombriz y escarabajo
// la acompañan como secundarias (pedido del operador) y mueren CON ella.
import AbejaAngelita from '../../visual/creatures/AbejaAngelita.jsx';
import { Colibri } from '../../visual/creatures/Colibri.jsx';
import { Escarabajo } from '../../visual/creatures/Escarabajo.jsx';
import { Mariposa } from '../../visual/creatures/Mariposa.jsx';
import { Lombriz } from '../../visual/creatures/Lombriz.jsx';
import './ahorcado-contaminado.css';

const MAX_ERRORES = 6;
const TECLADO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

// Los 6 pasos de la metáfora de "contaminación" en vez de horca: la chagra se
// va apagando paso a paso. Cada paso suma una etapa visible (nube química,
// planta, suelo, agua, polinizadores) para que la penalización sea legible
// sin dibujar una soga. La escena SVG (EscenaChagra) anima cada etapa.
const ETAPAS_CONTAMINACION = [
  { clase: 'sana', texto: 'La chagra está viva y sana.' },
  { clase: 'paso-1', texto: 'Una nube de químico asoma sobre la chagra.' },
  { clase: 'paso-2', texto: 'Las hojas se marchitan y empiezan a caer.' },
  { clase: 'paso-3', texto: 'El suelo fértil se agrieta y pierde su vida.' },
  { clase: 'paso-4', texto: 'El agua de riego se enturbió: ya no está limpia.' },
  { clase: 'paso-5', texto: 'Angelita, la abejita polinizadora, tambalea: casi no puede volar.' },
  { clase: 'paso-6', texto: 'La chagra quedó contaminada. Angelita cayó y las mariposas huyeron.' },
];

function normalizar(letra) {
  return letra.toUpperCase();
}

/**
 * Medidor de vida: 6 hojitas que se van apagando (una por error).
 * Refuerza la lectura de "cuántos intentos quedan" sin números fríos.
 */
function MedidorSalud({ errores }) {
  return (
    <div className="jp-ah-medidor" aria-hidden="true">
      {Array.from({ length: MAX_ERRORES }, (_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className={`jp-ah-medidor-hoja ${i < errores ? 'apagada' : ''}`}
        >
          <path d="M10 18 C10 12 6 10 4 4 C10 5 15 8 15 13 C15 16 13 18 10 18 Z" />
          <path d="M10 17 C10 13 8 10 6 6" className="jp-ah-medidor-vena" />
        </svg>
      ))}
    </div>
  );
}

/**
 * actuacionAngelita — la DIRECCIÓN de escena de la protagonista.
 *
 * Angelita es el componente compartido (src/visual/creatures/AbejaAngelita):
 * aquí no se redibuja nada, solo se le dan indicaciones de actuación por sus
 * props públicos (pose/animo/energia/sed/polen/cejas) según cuántos errores
 * lleva la partida. La trayectoria (órbita, tambaleo, caída) es del CSS del
 * juego; la INTERPRETACIÓN (aleteo, parpadeo, jadeo, cejas) es toda suya.
 */
function actuacionAngelita(errores, ganado, perdido) {
  if (ganado) {
    // Revivió con la chagra: salto de celebración + polen otra vez.
    return { pose: 'celebra', animo: 'pleno', energia: 1, sed: false, polen: true, cejas: 'alegres' };
  }
  if (perdido) {
    // Desmayada, sin morbo: alitas plegadas (reposo), sin antics (descansa).
    // Los ojitos cerrados + el gris los pone el CSS del juego (p6).
    return { pose: 'reposo', animo: 'descansa', energia: 0.12, sed: false, polen: false, cejas: null };
  }
  if (errores >= 5) {
    return { pose: 'vuela', animo: 'sediento', energia: 0.25, sed: true, polen: false, cejas: 'fruncidas' };
  }
  if (errores >= 4) {
    // El agua se enturbió: jadea con la lengüita afuera (sed real del prop).
    return { pose: 'vuela', animo: 'sediento', energia: 0.4, sed: true, polen: false, cejas: 'altas' };
  }
  if (errores >= 3) {
    return { pose: 'vuela', animo: 'atento', energia: 0.55, sed: false, polen: false, cejas: 'altas' };
  }
  if (errores >= 2) {
    return { pose: 'vuela', animo: 'sereno', energia: 0.75, sed: false, polen: false, cejas: null };
  }
  // Chagra sana: plena, cargada de polen (la loca de flor en flor).
  return { pose: 'vuela', animo: 'pleno', energia: 1, sed: false, polen: true, cejas: null };
}

/**
 * Mariposita — secundaria de la escena (dibujo propio del juego, a escala del
 * paisaje). Corrección del operador: "que la una mariposa muera, el resto
 * huyen". La mariposa que MUERE es la Dione (la grande, más abajo); estas dos
 * chiquitas son "el resto" → al ver caer a su compañera HUYEN de la escena
 * (se asustan y se van de cuadro). Reviven al ganar. Coreografía en el CSS.
 */
function Mariposita() {
  return (
    <g className="jp-ah-mariposa">
      <g className="jp-ah-mariposa-ala ala-m-izq">
        <path d="M-1,0 C-6,-6 -11,-6 -11,-1 C-11,3 -6,4 -1,1 Z" />
        <circle cx="-7" cy="-2" r="1.1" />
      </g>
      <g className="jp-ah-mariposa-ala ala-m-der">
        <path d="M1,0 C6,-6 11,-6 11,-1 C11,3 6,4 1,1 Z" />
        <circle cx="7" cy="-2" r="1.1" />
      </g>
      <ellipse className="jp-ah-mariposa-cuerpo" cx="0" cy="0" rx="1.4" ry="4" />
      <path className="jp-ah-mariposa-antena" d="M-0.6,-3.6 Q-2,-6 -3,-6.6" />
      <path className="jp-ah-mariposa-antena" d="M0.6,-3.6 Q2,-6 3,-6.6" />
    </g>
  );
}

/**
 * EscenaChagra — la escena viva que reemplaza la horca (y los emojis).
 *
 * Una parcela andina dibujada en SVG (rubber-hose para los seres vivos:
 * squash&stretch, line-boil sutil) que se contamina un paso por cada error:
 * entra la nube de químico, la mata se marchita, el suelo se agrieta, el
 * agua se enturbia y Angelita — la abeja angelita REAL de la casa — tambalea
 * hasta caer (desmayada, sin morbo: esto es educativo). La acompañan la
 * abejita obrera y el colibrí (que caen CON ella) y las mariposas: UNA muere
 * (la Dione cae) y las otras dos, al verla caer, HUYEN de la escena
 * (corrección del operador). Al ganar, todas reviven y re-entran.
 *
 * Los pasos se acumulan como clases p1..pN para que el CSS aplique cada
 * degradación de forma progresiva y con transiciones suaves.
 */
function EscenaChagra({ errores, ganado, perdido }) {
  const n = Math.min(errores, MAX_ERRORES);
  const pasos = Array.from({ length: n }, (_, i) => `p${i + 1}`).join(' ');
  const estado = ganado ? 'gano' : perdido ? 'perdio' : '';
  const angelita = actuacionAngelita(errores, ganado, perdido);

  return (
    <svg
      className={`jp-ah-vivo ${pasos} ${estado}`}
      viewBox="0 0 360 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Cielo sano (amanecer andino) y cielo tóxico: crossfade por opacity */}
        <linearGradient id="jpAhCieloSano" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8ed0ec" />
          <stop offset="0.7" stopColor="#cdeccc" />
          <stop offset="1" stopColor="#f2f7d8" />
        </linearGradient>
        <linearGradient id="jpAhCieloToxico" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#565264" />
          <stop offset="0.7" stopColor="#7a7f6c" />
          <stop offset="1" stopColor="#8d8f74" />
        </linearGradient>
        {/* Line-boil (contorno que vibra, 3 seeds rotadas a pasos) */}
        <filter id="jpAhBoil1" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="3" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6" />
        </filter>
        <filter id="jpAhBoil2" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="11" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6" />
        </filter>
        <filter id="jpAhBoil3" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="1" seed="27" result="r" />
          <feDisplacementMap in="SourceGraphic" in2="r" scale="1.6" />
        </filter>
      </defs>

      {/* ── Cielo (dos capas, crossfade) ── */}
      <rect className="jp-ah-cielo-sano" x="0" y="0" width="360" height="152" fill="url(#jpAhCieloSano)" />
      <rect className="jp-ah-cielo-toxico" x="0" y="0" width="360" height="152" fill="url(#jpAhCieloToxico)" />

      {/* ── Sol con rayos que giran ── */}
      <g className="jp-ah-sol" transform="translate(306 40)">
        <circle className="jp-ah-sol-halo" r="26" />
        <g className="jp-ah-sol-rayos">
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="0" y1="-20" x2="0" y2="-26" transform={`rotate(${i * 45})`} />
          ))}
        </g>
        <circle className="jp-ah-sol-disco" r="15" />
      </g>

      {/* ── Cordillera (dos planos + niebla, lámina Humboldt suave) ── */}
      <path
        className="jp-ah-montana-lejos"
        d="M0,112 Q45,60 95,98 Q140,128 190,84 Q245,38 300,92 Q332,118 360,94 L360,152 L0,152 Z"
      />
      <ellipse className="jp-ah-niebla" cx="180" cy="116" rx="160" ry="13" />
      <path
        className="jp-ah-montana-cerca"
        d="M0,152 Q40,116 90,134 Q150,152 200,126 Q262,100 320,132 Q345,144 360,138 L360,152 Z"
      />

      {/* ── Nubes blancas amigables (se van cuando llega el químico) ── */}
      <g className="jp-ah-nube-blanca" transform="translate(70 26)">
        <g className="jp-ah-nube-blanca-forma">
          <ellipse cx="0" cy="0" rx="21" ry="9" />
          <ellipse cx="-13" cy="4" rx="12" ry="7" />
          <ellipse cx="13" cy="4" rx="13" ry="7" />
        </g>
      </g>
      <g className="jp-ah-nube-blanca nube-blanca-2" transform="translate(196 40) scale(0.65)">
        <g className="jp-ah-nube-blanca-forma">
          <ellipse cx="0" cy="0" rx="21" ry="9" />
          <ellipse cx="-13" cy="4" rx="12" ry="7" />
          <ellipse cx="13" cy="4" rx="13" ry="7" />
        </g>
      </g>

      {/* ── Frailejones de silueta en la loma (toque de páramo) ── */}
      <g className="jp-ah-frailejon" transform="translate(254 130)">
        <rect x="-2" y="-12" width="4" height="14" rx="2" />
        <g>
          {[-64, -32, 0, 32, 64].map((a) => (
            <ellipse key={a} cx="0" cy="-16" rx="2.6" ry="7.5" transform={`rotate(${a} 0 -10)`} />
          ))}
        </g>
        <circle className="jp-ah-frailejon-flor" cx="0" cy="-24" r="2.2" />
      </g>
      <g className="jp-ah-frailejon" transform="translate(300 138) scale(0.7)">
        <rect x="-2" y="-12" width="4" height="14" rx="2" />
        <g>
          {[-64, -32, 0, 32, 64].map((a) => (
            <ellipse key={a} cx="0" cy="-16" rx="2.6" ry="7.5" transform={`rotate(${a} 0 -10)`} />
          ))}
        </g>
        <circle className="jp-ah-frailejon-flor" cx="0" cy="-24" r="2.2" />
      </g>

      {/* ── Suelo (fértil → agrietado) ── */}
      <path
        className="jp-ah-suelo"
        d="M0,148 Q60,142 120,146 Q200,153 268,146 Q320,141 360,146 L360,200 L0,200 Z"
      />
      <g className="jp-ah-humus">
        <ellipse cx="42" cy="176" rx="3" ry="1.4" />
        <ellipse cx="88" cy="188" rx="2.4" ry="1.2" />
        <ellipse cx="150" cy="180" rx="3.2" ry="1.4" />
        <ellipse cx="205" cy="190" rx="2.6" ry="1.2" />
        <ellipse cx="252" cy="182" rx="2.2" ry="1" />
        <ellipse cx="320" cy="190" rx="3" ry="1.3" />
      </g>
      <g className="jp-ah-grietas">
        <path d="M36,164 l12,7 l-4,9 l13,6" />
        <path d="M196,172 l14,5 l3,10" />
        <path d="M92,184 l10,6 l9,-3" />
        <path d="M290,186 l11,4 l-2,8" />
      </g>

      {/* ── Agua de riego (limpia → turbia) ── */}
      <g className="jp-ah-agua" transform="translate(292 166)">
        <path
          className="jp-ah-agua-cuerpo"
          d="M-54,0 Q-48,-10 -20,-11 Q10,-13 34,-8 Q54,-4 51,3 Q42,11 8,12 Q-38,12 -54,0 Z"
        />
        <path className="jp-ah-onda onda-1" d="M-40,-2 Q-30,-5 -18,-2 Q-6,1 6,-2" />
        <path className="jp-ah-onda onda-2" d="M-16,4 Q-4,1 8,4 Q20,7 32,4" />
        <ellipse className="jp-ah-destello" cx="24" cy="-4" rx="7" ry="1.6" />
        <g className="jp-ah-burbujas">
          <circle className="burbuja-1" cx="-24" cy="2" r="2" />
          <circle className="burbuja-2" cx="4" cy="4" r="1.5" />
          <circle className="burbuja-3" cx="26" cy="1" r="1.8" />
        </g>
      </g>

      {/* ── Pastos que se marchitan ── */}
      {[
        [54, 152], [186, 154], [238, 152],
      ].map(([x, y], i) => (
        <g key={i} className={`jp-ah-pasto pasto-${i + 1}`} transform={`translate(${x} ${y})`}>
          <path d="M0,0 Q-2,-8 -5,-12" />
          <path d="M2,0 Q3,-10 1,-14" />
          <path d="M5,0 Q7,-7 10,-11" />
        </g>
      ))}

      {/* ── La lombriz nativa (Lombriz REAL de la casa, Martiodrilus) ──
          Secundaria de SUELO: asoma del suelo fértil con overshoot (su
          entrada), se mece sana; cuando el suelo se agrieta (p3) palidece y
          se retrae, y en p6 queda lánguida sobre la tierra muerta. Su
          movimiento es de la escena (la creature no trae idle propio). */}
      <g transform="translate(16 172)">
        <g className="jp-ah-lombriz-marco">
          <g className="jp-ah-lombriz-cuerpo" transform="scale(0.38)">
            <Lombriz inline animated />
          </g>
        </g>
      </g>

      {/* ── Surco de brotecitos: la chagra es parcela cultivada ── */}
      {[
        [24, 160], [52, 166], [80, 172], [108, 178],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className={`jp-ah-brote brote-${i + 1}`}>
            <path className="jp-ah-brote-tallo" d="M0,0 Q0,-4 0,-7" />
            <path className="jp-ah-brote-hoja" d="M0,-6 C-3,-8 -6,-8 -8,-6 C-6,-4 -2,-4 0,-6 Z" />
            <path className="jp-ah-brote-hoja" d="M0,-7 C3,-9 6,-9 8,-7 C6,-5 2,-5 0,-7 Z" />
          </g>
        </g>
      ))}

      {/* ── Florecitas de victoria (brotan al ganar) ── */}
      {[
        [70, 151], [212, 154], [255, 151],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g className={`jp-ah-flor-extra florx-${i + 1}`}>
            <path className="jp-ah-flor-extra-tallo" d="M0,0 Q0.5,-5 0,-9" />
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} className="jp-ah-flor-extra-petalo" cx="0" cy="-12" rx="1.8" ry="3" transform={`rotate(${a} 0 -9)`} />
            ))}
            <circle className="jp-ah-flor-extra-centro" cx="0" cy="-9" r="1.6" />
          </g>
        </g>
      ))}

      {/* ── La mata protagonista (rubber-hose: respira, se marchita) ── */}
      <g className="jp-ah-mata-anclaje" transform="translate(118 149)">
        <ellipse className="jp-ah-mata-sombra" cx="0" cy="1.5" rx="21" ry="3.4" />
        <g className="jp-ah-mata">
          <path className="jp-ah-tallo" d="M0,0 C-2,-22 2,-40 0,-58" />
          {/* Pares de hojas: la unión al tallo queda en el (0,0) local de cada
              hoja para que el droop (rotación CSS) gire desde la unión. */}
          <g className="jp-ah-hoja-pos" transform="translate(-1 -14)">
            <g className="jp-ah-hoja hoja-a">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          <g className="jp-ah-hoja-pos" transform="translate(1 -22) scale(-1 1)">
            <g className="jp-ah-hoja hoja-b">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          <g className="jp-ah-hoja-pos" transform="translate(-1 -33) scale(0.85)">
            <g className="jp-ah-hoja hoja-c">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          <g className="jp-ah-hoja-pos" transform="translate(1 -41) scale(-0.85 0.85)">
            <g className="jp-ah-hoja hoja-d">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          <g className="jp-ah-hoja-pos" transform="translate(-1 -50) scale(0.62)">
            <g className="jp-ah-hoja hoja-e">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          <g className="jp-ah-hoja-pos" transform="translate(1 -54) scale(-0.62 0.62)">
            <g className="jp-ah-hoja hoja-f">
              <path className="jp-ah-hoja-forma" d="M0,0 C-9,-8 -22,-10 -30,-3 C-25,5 -10,5 0,0 Z" />
              <path className="jp-ah-hoja-vena" d="M-3,-1 C-11,-4 -19,-4 -26,-3" />
            </g>
          </g>
          {/* Flor: pétalos alrededor del centro, se cierra al marchitarse */}
          <g className="jp-ah-flor" transform="translate(0 -58)">
            <g className="jp-ah-flor-corola">
              {[0, 60, 120, 180, 240, 300].map((a) => (
                <ellipse key={a} className="jp-ah-petalo" cx="0" cy="-8" rx="4" ry="6.5" transform={`rotate(${a})`} />
              ))}
              <circle className="jp-ah-flor-centro" r="4.4" />
            </g>
          </g>
        </g>
        {/* Pétalos que se desprenden y caen (aparecen con los errores) */}
        <g className="jp-ah-petalo-caido caido-1">
          <ellipse cx="0" cy="-56" rx="4" ry="6.5" />
        </g>
        <g className="jp-ah-petalo-caido caido-2">
          <ellipse cx="0" cy="-56" rx="4" ry="6.5" />
        </g>
        {/* Hojas sueltas que caen en bucle mientras la mata sufre */}
        <g className="jp-ah-hoja-caida hcaida-1">
          <path d="M0,0 C-4,-4 -10,-5 -14,-1 C-11,3 -4,3 0,0 Z" />
        </g>
        <g className="jp-ah-hoja-caida hcaida-2">
          <path d="M0,0 C-4,-4 -10,-5 -14,-1 C-11,3 -4,3 0,0 Z" />
        </g>
      </g>

      {/* ── El escarabajo estercolero (Escarabajo REAL, Dichotomius belus) ──
          Secundaria de SUELO: entra rodando su bola de abono desde el borde
          (su entrada) y patrulla el primer plano. El suelo agrietado (p3) lo
          arrastra, y en p6 queda volcado, quieto y gris — el suelo sin vida
          no tiene abono que rodar. Espejado: empuja la bola hacia adelante. */}
      <g className="jp-ah-escarabajo-orbita">
        <g className="jp-ah-escarabajo-marco" transform="scale(-0.75 0.75)">
          <Escarabajo inline animated />
        </g>
      </g>

      {/* ── Chispas de victoria alrededor de la flor ── */}
      <g className="jp-ah-chispas" transform="translate(118 88)">
        {[
          [-24, -14, 1], [20, -22, 0.8], [-10, -34, 0.7], [28, 2, 0.9], [-30, 8, 0.65], [8, -44, 0.75],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <path
              className={`jp-ah-chispa chispa-${i + 1}`}
              d="M0,-6 L1.6,-1.6 L6,0 L1.6,1.6 L0,6 L-1.6,1.6 L-6,0 L-1.6,-1.6 Z"
            />
          </g>
        ))}
      </g>

      {/* ── Nube de químico (entra con el primer error, crece) ── */}
      <g className="jp-ah-nube" transform="translate(86 34)">
        <g className="jp-ah-nube-cuerpo">
          <ellipse cx="-26" cy="6" rx="20" ry="12" />
          <ellipse cx="0" cy="0" rx="30" ry="15" />
          <ellipse cx="26" cy="7" rx="22" ry="12" />
          <ellipse cx="0" cy="10" rx="34" ry="11" />
        </g>
        <g className="jp-ah-gotas">
          <g transform="translate(-18 22)"><path className="gota gota-1" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z" /></g>
          <g transform="translate(2 24)"><path className="gota gota-2" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z" /></g>
          <g transform="translate(20 22)"><path className="gota gota-3" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z" /></g>
        </g>
      </g>
      {/* Segunda nube (los últimos pasos: el cielo se carga) */}
      <g className="jp-ah-nube jp-ah-nube-2" transform="translate(250 26) scale(0.75)">
        <g className="jp-ah-nube-cuerpo">
          <ellipse cx="-26" cy="6" rx="20" ry="12" />
          <ellipse cx="0" cy="0" rx="30" ry="15" />
          <ellipse cx="26" cy="7" rx="22" ry="12" />
        </g>
        <g className="jp-ah-gotas">
          <g transform="translate(-12 22)"><path className="gota gota-1" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z" /></g>
          <g transform="translate(14 22)"><path className="gota gota-3" d="M0,0 C3,5 3,9 0,11 C-3,9 -3,5 0,0 Z" /></g>
        </g>
      </g>

      {/* ── Angelita, la protagonista (la abeja REAL de la casa) ──
          El componente compartido entra en modo inline: el juego pone la
          ÓRBITA (vuela → preocupada → tambalea → cae) en los wrappers, y la
          actuación (aleteo, parpadeo, jadeo, cejas, polen) es del componente
          vía props. El marco escala y ESPEJA (mira hacia la mata, que queda a
          su izquierda) en un <g> sin clases animadas: las animaciones CSS de
          los wrappers no le pisan el transform. */}
      <g className="jp-ah-abeja-orbita">
        <g className="jp-ah-abeja">
          <g className="jp-ah-angelita" transform="scale(-1.15 1.15)">
            <AbejaAngelita
              inline
              animated
              pose={angelita.pose}
              animo={angelita.animo}
              energia={angelita.energia}
              sed={angelita.sed}
              polen={angelita.polen}
              cejas={angelita.cejas}
            />
          </g>
        </g>
        {/* zZz: Angelita quedó desmayada (educativo, sin morbo) */}
        <g className="jp-ah-zzz">
          <text className="z-1" x="8" y="-14">z</text>
          <text className="z-2" x="15" y="-22">z</text>
          <text className="z-3" x="23" y="-30">z</text>
        </g>
      </g>

      {/* ── El colibrí chillón (Colibri REAL de la casa, hermano del kit) ──
          Secundaria de AIRE: entra DARDEANDO desde fuera de cuadro con
          anticipación y overshoot (la entrada espectacular de la familia) y
          se cierne sobre la flor de la mata. Recibe la MISMA dirección de
          actuación que Angelita (pose/animo/energia): se apaga con ella y en
          p6 cae al pie de la mata, al otro lado de su amiga — los dos
          polinizadores juntos. Al ganar re-entra celebrando. */}
      <g className="jp-ah-colibri-orbita">
        <g className="jp-ah-colibri-marco" transform="scale(0.8)">
          <Colibri
            inline
            animated
            pose={angelita.pose}
            animo={angelita.animo}
            energia={angelita.energia}
          />
        </g>
      </g>

      {/* ── La abejita obrera (la abeja del arte anterior) ──
          Pedido del operador: NO se saca — queda como SECUNDARIA de Angelita.
          Vuela al otro lado de la chagra (sobre el agua) y muere CON la
          protagonista: aleteo pesado → tambaleo → cae desmayada a la orilla
          (ojitos cerrados, alitas plegadas). Revive con todas al ganar. */}
      <g className="jp-ah-abeja2-orbita">
        <g className="jp-ah-abeja2">
          <g className="jp-ah-ala ala-izq">
            <ellipse cx="-2" cy="-9" rx="4.6" ry="7" />
          </g>
          <g className="jp-ah-ala ala-der">
            <ellipse cx="3" cy="-8" rx="4" ry="6" />
          </g>
          <ellipse className="jp-ah-abeja-cuerpo" cx="0" cy="0" rx="8.4" ry="5.8" />
          <path className="jp-ah-franja" d="M-1,-5.6 C-2.4,-2 -2.4,2 -1,5.6 L2.4,5.4 C1,2 1,-2 2.4,-5.4 Z" />
          <path className="jp-ah-franja" d="M4.6,-4.6 C3.6,-1.8 3.6,1.8 4.6,4.6 L7.4,3.4 C6.6,1.4 6.6,-1.4 7.4,-3.4 Z" />
          <circle className="jp-ah-abeja-cabeza" cx="-9.6" cy="-1" r="4.4" />
          <g className="jp-ah-antenas">
            <path d="M-11.5,-4.5 C-13,-7 -14.5,-8 -15.5,-8.5" />
            <circle cx="-15.8" cy="-8.8" r="1" />
            <path d="M-9,-5 C-9.5,-8 -10.5,-9.5 -11,-10.5" />
            <circle cx="-11.2" cy="-10.9" r="1" />
          </g>
          <g className="jp-ah-ojos-abiertos">
            <ellipse cx="-11.2" cy="-1.6" rx="1.25" ry="1.8" />
            <ellipse cx="-8.4" cy="-1.6" rx="1.25" ry="1.8" />
            <circle className="jp-ah-pupila" cx="-11.4" cy="-1.3" r="0.55" />
            <circle className="jp-ah-pupila" cx="-8.6" cy="-1.3" r="0.55" />
            <path className="jp-ah-sonrisa" d="M-11.4,1.6 Q-9.9,2.8 -8.4,1.6" />
          </g>
          <g className="jp-ah-ojos-cerrados">
            <path d="M-12.3,-1.4 Q-11.2,-0.3 -10.1,-1.4" />
            <path d="M-9.5,-1.4 Q-8.4,-0.3 -7.3,-1.4" />
          </g>
          <g className="jp-ah-patitas">
            <path d="M-3,5 q-1,2.5 -2.5,3" />
            <path d="M1,5.6 q0,2.5 -1,3.2" />
            <path d="M5,5 q1,2.5 0.5,3.4" />
          </g>
        </g>
      </g>

      {/* ── Mariposas chiquitas: "el resto" que HUYE (corrección del operador
          "que la una mariposa muera, el resto huyen"). Cuando la Dione (abajo)
          cae por la contaminación, estas dos se asustan y se van de cuadro
          (aleteo nervioso → escapan volando fuera de la escena). Reviven y
          re-entran al ganar. ── */}
      <g className="jp-ah-mariposa-orbita">
        <Mariposita />
      </g>
      <g className="jp-ah-mariposa-orbita mariposa-orbita-2">
        <g transform="scale(0.68)">
          <Mariposita />
        </g>
      </g>

      {/* ── La mariposa pasionaria (Mariposa REAL de la casa, Dione juno) ──
          LA mariposa que MUERE (corrección del operador): la creature canónica
          del kit (cuatro alas independientes, ocelos). Aletea alto sobre el
          surco, se destiñe y tambalea con la contaminación, y en p6 CAE
          plegada al suelo — su caída es la que espanta al resto. Revive al
          ganar. */}
      <g className="jp-ah-dione-orbita">
        <g className="jp-ah-dione-marco" transform="scale(0.5)">
          <Mariposa inline animated />
        </g>
      </g>

      {/* ── Bruma final (todo perdido) ── */}
      <rect className="jp-ah-bruma" x="0" y="0" width="360" height="200" />
    </svg>
  );
}

function elegirPalabra(categoriaId) {
  const banco = categoriaId === 'mezcla' || !categoriaId
    ? PALABRAS
    : (PALABRAS_POR_CATEGORIA[categoriaId] || PALABRAS);
  const idx = Math.floor(Math.random() * banco.length);
  return banco[idx];
}

/**
 * Ahorcado Contaminado — ahorcado clásico con la metáfora de contaminación
 * (Tarea #93). Consume el dataset fundamentado de la Tarea #38
 * (src/data/juegos/ahorcadoContaminado.js): NO inventa palabras ni fuentes.
 *
 * Cada letra errada avanza un paso de contaminación (6 pasos, sin horca).
 * Ganar o perder revela la pista educativa + la fuente (anti-gamificación
 * tóxica: educativo también al perder, no solo al ganar).
 */
export default function AhorcadoContaminado() {
  const [categoriaId, setCategoriaId] = useState('mezcla');
  const [entrada, setEntrada] = useState(() => elegirPalabra('mezcla'));
  const [letrasUsadas, setLetrasUsadas] = useState([]);
  const [errores, setErrores] = useState(0);
  const [advertenciaAbierta, setAdvertenciaAbierta] = useState(false);

  const palabra = entrada.palabra;
  const letrasUnicas = useMemo(
    () => new Set(palabra.replace(/[^A-ZÑ]/gi, '').split('').map(normalizar)),
    [palabra],
  );

  const ganado = useMemo(
    () => [...letrasUnicas].every((l) => letrasUsadas.includes(l)),
    [letrasUnicas, letrasUsadas],
  );
  const perdido = errores >= MAX_ERRORES;
  const terminado = ganado || perdido;

  const etapa = ETAPAS_CONTAMINACION[Math.min(errores, MAX_ERRORES)];
  const fuente = FUENTES[entrada.fuenteId];

  const jugarLetra = useCallback((letraCruda) => {
    if (terminado) return;
    const letra = normalizar(letraCruda);
    if (letrasUsadas.includes(letra)) return;

    setLetrasUsadas((prev) => [...prev, letra]);
    if (!letrasUnicas.has(letra)) {
      setErrores((prev) => Math.min(prev + 1, MAX_ERRORES));
    }
  }, [letrasUsadas, letrasUnicas, terminado]);

  const nuevaPalabra = useCallback((nuevaCategoria) => {
    const cat = nuevaCategoria ?? categoriaId;
    setCategoriaId(cat);
    setEntrada(elegirPalabra(cat));
    setLetrasUsadas([]);
    setErrores(0);
  }, [categoriaId]);

  return (
    <div className="jp-ahorcado" data-testid="ahorcado-contaminado">
      {/* Selector de categoría */}
      <div className="jp-ah-categorias" role="group" aria-label="Elegir categoría de palabras">
        <button
          type="button"
          data-testid="categoria-mezcla"
          className={`jp-ah-chip ${categoriaId === 'mezcla' ? 'activo' : ''}`}
          onClick={() => nuevaPalabra('mezcla')}
        >
          🎲 Mezcla
        </button>
        {Object.values(CATEGORIAS).map((cat) => (
          <button
            key={cat.id}
            type="button"
            data-testid={`categoria-${cat.id}`}
            className={`jp-ah-chip ${categoriaId === cat.id ? 'activo' : ''}`}
            onClick={() => nuevaPalabra(cat.id)}
            title={cat.descripcion}
          >
            {cat.emoji} {cat.label}
          </button>
        ))}
      </div>

      {/* Escena de contaminación (metáfora en vez de horca): una chagra viva
          que se apaga paso a paso con cada error, y revive si ganás. */}
      <div
        className={`jp-ah-escena ${etapa.clase} ${ganado ? 'escena-gano' : ''}`}
        data-testid="escena-contaminacion"
        aria-live="polite"
      >
        <EscenaChagra errores={errores} ganado={ganado} perdido={perdido} />
        <p className="jp-ah-escena-texto">
          {ganado ? '¡La chagra revivió y está floreciendo!' : etapa.texto}
        </p>
        <div className="jp-ah-estado-fila">
          <MedidorSalud errores={errores} />
          <p className="jp-ah-intentos" data-testid="contador-intentos">
            Intentos: {errores} / {MAX_ERRORES}
          </p>
        </div>
      </div>

      {/* Palabra oculta */}
      <div className="jp-ah-palabra" data-testid="palabra-oculta" aria-label={`Palabra con ${letrasUnicas.size} letras distintas`}>
        {palabra.split('').map((caracter, i) => {
          if (caracter === ' ') {
            return <span key={i} className="jp-ah-espacio" aria-hidden="true" />;
          }
          const visible = terminado || letrasUsadas.includes(normalizar(caracter));
          return (
            <span key={i} className="jp-ah-letra-casillero">
              {visible ? normalizar(caracter) : ''}
            </span>
          );
        })}
      </div>

      {/* Resultado educativo (gana o pierde: siempre se revela el dato) */}
      {terminado && (
        <div
          className={`jp-ah-resultado ${ganado ? 'gano' : 'perdio'}`}
          data-testid="resultado-juego"
          role="status"
        >
          <p className="jp-ah-resultado-titulo">
            {ganado ? '¡La finca se salvó! Adivinaste la palabra.' : 'Esta vez la finca se contaminó.'}
          </p>
          <p className="jp-ah-resultado-palabra">La palabra era: <strong>{palabra}</strong></p>
          <p className="jp-ah-resultado-pista" data-testid="pista-educativa">{entrada.pista}</p>
          {fuente && (
            <p className="jp-ah-resultado-fuente" data-testid="fuente-dato">
              Fuente: {fuente.label}
            </p>
          )}
          <button
            type="button"
            data-testid="jugar-otra-vez"
            className="jp-ah-btn-otra"
            onClick={() => nuevaPalabra()}
          >
            <RotateCcw size={18} aria-hidden="true" /> Jugar otra palabra
          </button>
        </div>
      )}

      {/* Teclado en pantalla (táctil) */}
      {!terminado && (
        <div className="jp-ah-teclado" role="group" aria-label="Teclado para adivinar letras">
          {TECLADO.map((letra) => {
            const usada = letrasUsadas.includes(letra);
            const acierto = usada && letrasUnicas.has(letra);
            const fallo = usada && !letrasUnicas.has(letra);
            return (
              <button
                key={letra}
                type="button"
                data-testid={`tecla-${letra}`}
                onClick={() => jugarLetra(letra)}
                disabled={usada}
                aria-pressed={usada}
                aria-label={`Letra ${letra}${fallo ? ', ya intentada, no está en la palabra' : ''}${acierto ? ', ya intentada, acertaste' : ''}`}
                className={`jp-ah-tecla ${acierto ? 'acierto' : ''} ${fallo ? 'fallo' : ''}`}
              >
                {letra}
              </button>
            );
          })}
        </div>
      )}

      {/* Pie con advertencia toxicológica obligatoria */}
      <div className="jp-ah-pie">
        <button
          type="button"
          data-testid="abrir-advertencia"
          className="jp-ah-btn-advertencia"
          onClick={() => setAdvertenciaAbierta(true)}
        >
          <ShieldAlert size={16} aria-hidden="true" /> Advertencia toxicológica
        </button>
      </div>

      {advertenciaAbierta && (
        <div
          className="jp-ah-modal-fondo"
          data-testid="modal-advertencia"
          role="dialog"
          aria-modal="true"
          aria-labelledby="jp-ah-modal-titulo"
        >
          <div className="jp-ah-modal">
            <h3 id="jp-ah-modal-titulo">
              <ShieldAlert size={20} aria-hidden="true" /> Datos educativos, no diagnóstico
            </h3>
            <p>
              Los datos de este juego son <strong>educativos</strong>, no son diagnóstico
              médico ni protocolo de primeros auxilios. Ante una sospecha de intoxicación
              por agroquímicos: retire a la persona de la exposición, quítele la ropa
              contaminada y llame ya a la línea de toxicología.
            </p>
            <p>
              En Colombia: <strong>Centro de Información y Asesoría Toxicológica (CIATOX)</strong>
              {' '}y línea de urgencias <strong>123</strong>.
            </p>
            <button
              type="button"
              data-testid="cerrar-advertencia"
              className="jp-ah-btn-otra"
              onClick={() => setAdvertenciaAbierta(false)}
            >
              <Sparkles size={16} aria-hidden="true" /> Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
