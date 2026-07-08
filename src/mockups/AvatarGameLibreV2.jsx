// Mockup dev — "La Casa de tu Animalito" (avatar libre v2).
//
// Segunda exploración visual del juego final de Chagra ("El Espíritu de tu
// Finca"), con una regla por encima de todo: CLARIDAD para un campesino de
// baja alfabetización. Nada abstracto: el animalito nativo vive en su casa
// (el panal, la charca, el bosque...) y cada trabajo real de la finca llena
// esa casa. Casa llena = animalito contento y creciendo.
//
// La cuenta completa en tres dibujos: TRABAJO → POTE LLENO → ANIMALITO FELIZ.
// Semáforo de estado (rojo/amarillo/verde), una sola palabra grande de ánimo,
// tareas con premio explícito ("+1 pote") y causa-efecto en vivo al marcar
// "Ya lo hice".
//
// Self-contained: datos de muestra, sin gate, sin servicios reales, solo
// SVG/CSS (cero fotos, cero dependencias nuevas).
import React, { useEffect, useRef, useState } from 'react';
import './AvatarGameLibreV2.css';

// La casa de cada animalito tiene 12 puestos (12 potes, 12 gotas, 12 árboles...).
// Es un número que se cuenta con calma y alcanza para 4 etapas de crecimiento.
const TOTAL_PUESTOS = 12;

// Ánimo por cantidad de puestos llenos: 0-4 rojo, 5-8 amarillo, 9-12 verde.
function nivelAnimo(llenos) {
  if (llenos >= 9) return 2;
  if (llenos >= 5) return 1;
  return 0;
}

// Etapa de crecimiento (0..3): cada 3 puestos llenos el animalito crece.
function etapaDe(llenos) {
  return Math.min(3, Math.floor(llenos / 3));
}

// ---------------------------------------------------------------------------
// Especies elegibles (indicadoras nativas). La abeja angelita es la de la
// casa; el colibrí queda de último como "el de antes".
// ---------------------------------------------------------------------------
const ESPECIES = [
  {
    id: 'abeja',
    nombre: 'Abeja angelita',
    rol: 'La que cuida las flores',
    casa: 'El panal',
    unidad: 'pote de miel',
    unidadPlural: 'potes de miel',
    simbolo: 'pote',
    cuentaPaso2: 'Se llena un pote de miel',
    acento: '#B97A10',
    etapas: ['Cría', 'Obrera', 'Guardiana', 'Reina'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTA'],
    frase: [
      'A la finca le falta cariño y a la angelita le falta comida.',
      'La finca va a medias. Un par de trabajos más y la angelita queda contenta.',
      'Su finca va bien. La angelita tiene flores y miel de sobra.',
    ],
    tareas: [
      { icono: 'canasta', verbo: 'Anote su cosecha', detalle: 'Lo que sacó hoy de la finca' },
      { icono: 'mata', verbo: 'Siembre una mata con flor', detalle: 'Las flores son comida de abeja' },
      { icono: 'regadera', verbo: 'Riegue la huerta y anótelo', detalle: 'Huerta regada, flores vivas' },
    ],
  },
  {
    id: 'rana',
    nombre: 'Rana dorada',
    rol: 'La que avisa si el agua está limpia',
    casa: 'La charca',
    unidad: 'gota de agua limpia',
    unidadPlural: 'gotas de agua limpia',
    simbolo: 'gota',
    cuentaPaso2: 'Cae una gota de agua limpia',
    acento: '#1F7A8C',
    etapas: ['Huevo', 'Renacuajo', 'Ranita', 'Rana dorada'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTA'],
    frase: [
      'El agua anda escasa o sucia. La ranita aguanta, pero no está bien.',
      'El agua va a medias. Cuide el nacimiento y la ranita mejora.',
      'Agua limpia y cuidada. La ranita canta en la charca.',
    ],
    tareas: [
      { icono: 'nacimiento', verbo: 'Cuide su nacimiento de agua', detalle: 'Revíselo y anote cómo está' },
      { icono: 'regadera', verbo: 'Anote su riego', detalle: 'Riego con medida, agua que rinde' },
      { icono: 'mata', verbo: 'Siembre junto al agua', detalle: 'Las matas protegen la orilla' },
    ],
  },
  {
    id: 'oso',
    nombre: 'Oso de anteojos',
    rol: 'El que cuida el bosque',
    casa: 'El bosque',
    unidad: 'árbol',
    unidadPlural: 'árboles',
    simbolo: 'arbol',
    cuentaPaso2: 'Crece un árbol del bosque',
    acento: '#4A6B2E',
    etapas: ['Osezno', 'Joven', 'Andarín', 'Guardián del monte'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTO'],
    frase: [
      'Poco monte y poca sombra. El oso no tiene por dónde andar.',
      'El bosque va creciendo. Unos árboles más y el oso queda contento.',
      'Buen monte en su finca. El oso anda tranquilo entre los árboles.',
    ],
    tareas: [
      { icono: 'mata', verbo: 'Siembre un árbol nativo', detalle: 'Y anótelo en la app' },
      { icono: 'monte', verbo: 'Deje un rincón de monte quieto', detalle: 'Sin tumbar ni quemar' },
      { icono: 'canasta', verbo: 'Anote su cosecha de sombra', detalle: 'Café o cacao bajo árboles' },
    ],
  },
  {
    id: 'lombriz',
    nombre: 'Lombriz',
    rol: 'La que hace la tierra buena',
    casa: 'La tierra',
    unidad: 'montón de abono',
    unidadPlural: 'montones de abono',
    simbolo: 'abono',
    cuentaPaso2: 'Se hace un montón de abono',
    acento: '#6B4A2E',
    etapas: ['Chiquita', 'Trabajadora', 'Abonadora', 'Madre de la tierra'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTA'],
    frase: [
      'La tierra está flaca y dura. La lombriz casi no tiene con qué trabajar.',
      'La tierra va mejorando. Más abono y la lombriz se pone contenta.',
      'Tierra negra y suelta. La lombriz trabaja feliz allá abajo.',
    ],
    tareas: [
      { icono: 'abonera', verbo: 'Eche compost y anótelo', detalle: 'Comida directa para la tierra' },
      { icono: 'estiercol', verbo: 'Guarde el estiércol para abono', detalle: 'No lo deje perder' },
      { icono: 'hojas', verbo: 'Tape el suelo con hojarasca', detalle: 'Tierra tapada no se seca' },
    ],
  },
  {
    id: 'chivito',
    nombre: 'Chivito de páramo',
    rol: 'El pajarito barbudo del frío',
    casa: 'El páramo',
    unidad: 'frailejón',
    unidadPlural: 'frailejones',
    simbolo: 'frailejon',
    cuentaPaso2: 'Florece un frailejón',
    acento: '#5E7350',
    etapas: ['Polluelo', 'Volantón', 'Barbudito', 'Señor del páramo'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTO'],
    frase: [
      'El páramo está solo y sin flores. El chivito pasa trabajos.',
      'El páramo se va recuperando. El chivito ya encuentra comida.',
      'Páramo cuidado y florecido. El chivito manda en las alturas.',
    ],
    tareas: [
      { icono: 'mata', verbo: 'Siembre flores de tierra fría', detalle: 'Comida para el pajarito' },
      { icono: 'monte', verbo: 'Cuide el frailejonal', detalle: 'Ni ganado ni candela allá arriba' },
      { icono: 'nacimiento', verbo: 'Proteja el nacimiento', detalle: 'Del páramo baja su agua' },
    ],
  },
  {
    id: 'colibri',
    nombre: 'Colibrí',
    rol: 'El de antes — nos acompañó un tiempo',
    casa: 'El jardín',
    unidad: 'flor',
    unidadPlural: 'flores',
    simbolo: 'flor',
    cuentaPaso2: 'Abre una flor del jardín',
    acento: '#7A7A72',
    esViejo: true,
    etapas: ['Polluelo', 'Volantón', 'Volador', 'Veterano'],
    animoPalabra: ['TRISTE', 'MÁS O MENOS', 'CONTENTO'],
    frase: [
      'El jardín está seco. El colibrí de antes anda aburrido.',
      'El jardín va a medias. El colibrí viejo todavía revolotea.',
      'Jardín florecido. El colibrí de antes está contento, a su manera.',
    ],
    tareas: [
      { icono: 'mata', verbo: 'Siembre una flor', detalle: 'Cualquier flor le sirve' },
      { icono: 'regadera', verbo: 'Riegue el jardín', detalle: 'Y anótelo' },
      { icono: 'canasta', verbo: 'Anote su cosecha', detalle: 'Lo de siempre' },
    ],
  },
];

// Puestos llenos de muestra por especie (así se ve movimiento al cambiar).
const LLENOS_MUESTRA = { abeja: 7, rana: 4, oso: 2, lombriz: 5, chivito: 3, colibri: 6 };

// ---------------------------------------------------------------------------
// Símbolos de la casa (el puesto que se llena): pote, gota, árbol, abono,
// frailejón, flor. Cada uno con versión llena y vacía (punteada).
// ---------------------------------------------------------------------------
function SimboloPuesto({ tipo, lleno, pop = false }) {
  const cls = `cav2-puesto ${lleno ? 'cav2-puesto-lleno' : 'cav2-puesto-vacio'}${pop ? ' cav2-puesto-pop' : ''}`;
  return (
    <svg className={cls} viewBox="0 0 40 40" aria-hidden="true">
      {tipo === 'pote' && (
        <g>
          {/* Potecito de miel de la angelita (las meliponas guardan la miel en potes de cera) */}
          <path
            d="M12 14 Q10 12 13 11 L27 11 Q30 12 28 14 Q32 18 31 27 Q30 34 20 34 Q10 34 9 27 Q8 18 12 14 Z"
            className="cav2-forma"
          />
          {lleno && <path d="M12.5 18 Q20 15 27.5 18 Q30 24 28.5 29 Q26 32.5 20 32.5 Q14 32.5 11.5 29 Q10 24 12.5 18 Z" className="cav2-miel" />}
          <rect x="13" y="8" width="14" height="4" rx="2" className="cav2-forma" />
        </g>
      )}
      {tipo === 'gota' && (
        <g>
          <path d="M20 6 Q30 20 30 27 Q30 35 20 35 Q10 35 10 27 Q10 20 20 6 Z" className="cav2-forma" />
          {lleno && <path d="M20 10 Q28 21 28 27 Q28 33 20 33 Q12 33 12 27 Q12 21 20 10 Z" className="cav2-agua" />}
          {lleno && <circle cx="16" cy="24" r="2.5" fill="rgba(255,255,255,0.75)" />}
        </g>
      )}
      {tipo === 'arbol' && (
        <g>
          <rect x="17.5" y="24" width="5" height="11" rx="1.5" className="cav2-tronco" />
          <circle cx="20" cy="16" r="11" className="cav2-forma" />
          {lleno && <circle cx="20" cy="16" r="9" className="cav2-copa" />}
          {lleno && <circle cx="15.5" cy="13" r="2" fill="rgba(255,255,255,0.4)" />}
        </g>
      )}
      {tipo === 'abono' && (
        <g>
          <path d="M6 32 Q9 20 20 18 Q31 20 34 32 Z" className="cav2-forma" />
          {lleno && <path d="M9 31 Q12 22 20 20.5 Q28 22 31 31 Z" className="cav2-tierra" />}
          {lleno && <path d="M15 26 q2.5 -2.5 5 0 q2.5 2.5 5 0" className="cav2-lombricita" />}
        </g>
      )}
      {tipo === 'frailejon' && (
        <g>
          <rect x="16.5" y="18" width="7" height="17" rx="3" className="cav2-tronco" />
          <ellipse cx="10.5" cy="16" rx="7" ry="3.4" className="cav2-forma" transform="rotate(-28 10.5 16)" />
          <ellipse cx="29.5" cy="16" rx="7" ry="3.4" className="cav2-forma" transform="rotate(28 29.5 16)" />
          <ellipse cx="20" cy="12" rx="3.4" ry="7.5" className="cav2-forma" />
          {lleno && <circle cx="20" cy="8" r="4.5" className="cav2-florcita" />}
        </g>
      )}
      {tipo === 'flor' && (
        <g>
          <rect x="18.7" y="22" width="2.6" height="13" rx="1.3" className="cav2-tronco" />
          <circle cx="20" cy="10" r="4.5" className="cav2-forma" />
          <circle cx="12.5" cy="15" r="4.5" className="cav2-forma" />
          <circle cx="27.5" cy="15" r="4.5" className="cav2-forma" />
          <circle cx="15" cy="22.5" r="4.5" className="cav2-forma" />
          <circle cx="25" cy="22.5" r="4.5" className="cav2-forma" />
          {lleno && <circle cx="20" cy="16.5" r="4" className="cav2-florcita" />}
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Cara del animalito según el ánimo (0 triste, 1 más o menos, 2 contento).
// Se reusa en todos: ojos + boca simples y legibles.
// ---------------------------------------------------------------------------
function Cara({ x, y, escala = 1, animo, color = '#2B2018' }) {
  const s = escala;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round">
      {animo === 2 ? (
        <>
          {/* Ojos alegres: arquitos */}
          <path d="M-11 0 q4 -5 8 0" />
          <path d="M3 0 q4 -5 8 0" />
          <path d="M-6 9 q6 6 12 0" />
        </>
      ) : animo === 1 ? (
        <>
          <circle cx="-7" cy="0" r="2.1" fill={color} stroke="none" />
          <circle cx="7" cy="0" r="2.1" fill={color} stroke="none" />
          <path d="M-5 10 h10" />
        </>
      ) : (
        <>
          <circle cx="-7" cy="0" r="2.1" fill={color} stroke="none" />
          <circle cx="7" cy="0" r="2.1" fill={color} stroke="none" />
          <path d="M-9 -5 l5 2.5" />
          <path d="M9 -5 l-5 2.5" />
          <path d="M-6 12 q6 -6 12 0" />
        </>
      )}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Los animalitos (SVG planos, silueta clara). Reciben el ánimo y cambian
// cara y postura. viewBox común 0 0 160 150.
// ---------------------------------------------------------------------------
function AbejaSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Abeja angelita">
      <g className="cav2-cuerpo-flotante">
        {/* Alas (aletean si hay movimiento permitido) */}
        <g className="cav2-ala cav2-ala-izq">
          <ellipse cx="52" cy="52" rx="26" ry="14" fill="#DCEFF6" opacity="0.85" transform="rotate(-28 52 52)" />
        </g>
        <g className="cav2-ala cav2-ala-der">
          <ellipse cx="108" cy="52" rx="26" ry="14" fill="#DCEFF6" opacity="0.85" transform="rotate(28 108 52)" />
        </g>
        {/* Cuerpo con rayas */}
        <ellipse cx="80" cy="92" rx="34" ry="27" fill="#F0B428" />
        <path d="M57 74 Q80 66 103 74 L103 82 Q80 74 57 82 Z" fill="#4A3413" />
        <path d="M50 92 Q80 84 110 92 L110 100 Q80 92 50 100 Z" fill="#4A3413" />
        <path d="M57 110 Q80 104 103 110 L100 116 Q80 111 60 116 Z" fill="#4A3413" />
        {/* Cabeza */}
        <circle cx="80" cy="47" r="20" fill="#F0B428" />
        <path d="M68 32 Q62 20 54 18" fill="none" stroke="#4A3413" strokeWidth="3" strokeLinecap="round" />
        <path d="M92 32 Q98 20 106 18" fill="none" stroke="#4A3413" strokeWidth="3" strokeLinecap="round" />
        <circle cx="54" cy="17" r="3.2" fill="#4A3413" />
        <circle cx="106" cy="17" r="3.2" fill="#4A3413" />
        <Cara x={80} y={45} animo={animo} />
      </g>
    </svg>
  );
}

function RanaSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Rana dorada">
      <g className="cav2-cuerpo-flotante">
        {/* Patas */}
        <path d="M44 120 Q30 126 26 118 Q34 108 48 110 Z" fill="#D9A912" />
        <path d="M116 120 Q130 126 134 118 Q126 108 112 110 Z" fill="#D9A912" />
        {/* Cuerpo dorado con pintas */}
        <ellipse cx="80" cy="96" rx="38" ry="30" fill="#E8C21F" />
        <circle cx="62" cy="96" r="4" fill="#7A6206" />
        <circle cx="98" cy="100" r="3.4" fill="#7A6206" />
        <circle cx="80" cy="112" r="3" fill="#7A6206" />
        {/* Cabeza con ojos saltones */}
        <ellipse cx="80" cy="62" rx="32" ry="22" fill="#E8C21F" />
        <circle cx="62" cy="42" r="11" fill="#E8C21F" />
        <circle cx="98" cy="42" r="11" fill="#E8C21F" />
        <circle cx="62" cy="41" r="5" fill="#2B2018" />
        <circle cx="98" cy="41" r="5" fill="#2B2018" />
        <circle cx="60.5" cy="39.5" r="1.6" fill="#FFF" />
        <circle cx="96.5" cy="39.5" r="1.6" fill="#FFF" />
        {/* Boca según ánimo */}
        {animo === 2 ? (
          <path d="M62 68 q18 14 36 0" fill="none" stroke="#7A6206" strokeWidth="3.4" strokeLinecap="round" />
        ) : animo === 1 ? (
          <path d="M66 70 h28" fill="none" stroke="#7A6206" strokeWidth="3.4" strokeLinecap="round" />
        ) : (
          <path d="M64 74 q16 -10 32 0" fill="none" stroke="#7A6206" strokeWidth="3.4" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

function OsoSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Oso de anteojos">
      <g className="cav2-cuerpo-flotante">
        <ellipse cx="80" cy="102" rx="40" ry="34" fill="#332B25" />
        <path d="M62 96 Q80 88 98 96 Q96 118 80 120 Q64 118 62 96 Z" fill="#F0E2C4" opacity="0.35" />
        {/* Orejas */}
        <circle cx="56" cy="30" r="11" fill="#332B25" />
        <circle cx="104" cy="30" r="11" fill="#332B25" />
        {/* Cabeza */}
        <circle cx="80" cy="52" r="27" fill="#332B25" />
        {/* Anteojos (anillos cremas, la seña del oso andino) */}
        <circle cx="68" cy="47" r="9.5" fill="none" stroke="#F0E2C4" strokeWidth="4.5" />
        <circle cx="92" cy="47" r="9.5" fill="none" stroke="#F0E2C4" strokeWidth="4.5" />
        <circle cx="68" cy="47" r="2.4" fill="#F5EAD2" />
        <circle cx="92" cy="47" r="2.4" fill="#F5EAD2" />
        {/* Hocico */}
        <ellipse cx="80" cy="66" rx="11" ry="8" fill="#F0E2C4" />
        <ellipse cx="80" cy="63" rx="4" ry="3" fill="#2B2018" />
        {animo === 2 ? (
          <path d="M74 70 q6 5 12 0" fill="none" stroke="#2B2018" strokeWidth="2.4" strokeLinecap="round" />
        ) : animo === 1 ? (
          <path d="M75 71 h10" fill="none" stroke="#2B2018" strokeWidth="2.4" strokeLinecap="round" />
        ) : (
          <path d="M74 72 q6 -4 12 0" fill="none" stroke="#2B2018" strokeWidth="2.4" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

function LombrizSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Lombriz">
      <g className="cav2-cuerpo-flotante">
        {/* Montón de tierra negra */}
        <path d="M18 128 Q46 96 80 98 Q114 96 142 128 Z" fill="#3E2F22" />
        <path d="M34 126 Q56 106 80 107 Q104 106 126 126 Z" fill="#54402E" />
        {/* Cuerpo de la lombriz asomada */}
        <path
          d="M50 108 Q48 76 66 64 Q84 52 96 62 Q108 72 100 84 Q94 93 86 88"
          fill="none" stroke="#D98A7E" strokeWidth="19" strokeLinecap="round"
        />
        {/* Anillos */}
        <path d="M56 84 q9 4 17 -1" fill="none" stroke="#B96A5E" strokeWidth="3" strokeLinecap="round" />
        <path d="M62 71 q9 3 16 -3" fill="none" stroke="#B96A5E" strokeWidth="3" strokeLinecap="round" />
        {/* Cabeza */}
        <circle cx="95" cy="66" r="14" fill="#E39B8F" />
        <Cara x={95} y={64} escala={0.8} animo={animo} color="#6B3A30" />
      </g>
    </svg>
  );
}

function ChivitoSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Chivito de páramo">
      <g className="cav2-cuerpo-flotante">
        {/* Cola */}
        <path d="M104 108 L132 124 L124 100 Z" fill="#24493A" />
        {/* Cuerpo */}
        <ellipse cx="80" cy="92" rx="34" ry="28" fill="#2F5E46" />
        <ellipse cx="74" cy="98" rx="20" ry="16" fill="#DDE8D8" />
        {/* Cabeza con cresta */}
        <circle cx="66" cy="52" r="19" fill="#2F5E46" />
        <path d="M60 34 L64 22 L70 33 L76 24 L79 35 Z" fill="#24493A" />
        {/* Pico */}
        <path d="M48 52 L30 56 L48 60 Z" fill="#E8B520" />
        {/* La barbita blanca que le da el nombre */}
        <path d="M58 66 Q62 84 68 88 Q72 80 70 66 Z" fill="#F2F2EA" />
        <circle cx="62" cy="48" r="3.4" fill="#12211A" />
        <circle cx="61" cy="47" r="1.1" fill="#FFF" />
        {animo === 2 ? (
          <path d="M56 59 q6 4 12 0" fill="none" stroke="#12211A" strokeWidth="2.2" strokeLinecap="round" />
        ) : animo === 1 ? (
          <path d="M57 60 h10" fill="none" stroke="#12211A" strokeWidth="2.2" strokeLinecap="round" />
        ) : (
          <path d="M56 62 q6 -4 12 0" fill="none" stroke="#12211A" strokeWidth="2.2" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

function ColibriSVG({ animo }) {
  return (
    <svg className={`cav2-animal cav2-animo-${animo}`} viewBox="0 0 160 150" role="img" aria-label="Colibrí">
      <g className="cav2-cuerpo-flotante">
        {/* El de antes: gris apagado, sin mucha gracia (a propósito) */}
        <path d="M96 96 L126 118 L114 92 Z" fill="#6B6B63" />
        <g className="cav2-ala cav2-ala-izq">
          <ellipse cx="70" cy="58" rx="24" ry="11" fill="#8C8C82" transform="rotate(-30 70 58)" />
        </g>
        <ellipse cx="84" cy="88" rx="28" ry="23" fill="#7A7A72" />
        <ellipse cx="80" cy="94" rx="15" ry="12" fill="#B5B5AA" />
        <circle cx="70" cy="56" r="15" fill="#7A7A72" />
        <path d="M56 54 L22 50 L56 60 Z" fill="#4F4F49" />
        <circle cx="66" cy="52" r="3" fill="#22221E" />
        {animo === 2 ? (
          <path d="M62 62 q5 3.5 10 0" fill="none" stroke="#22221E" strokeWidth="2" strokeLinecap="round" />
        ) : animo === 1 ? (
          <path d="M63 63 h8" fill="none" stroke="#22221E" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M62 65 q5 -3.5 10 0" fill="none" stroke="#22221E" strokeWidth="2" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

const ANIMALES = {
  abeja: AbejaSVG,
  rana: RanaSVG,
  oso: OsoSVG,
  lombriz: LombrizSVG,
  chivito: ChivitoSVG,
  colibri: ColibriSVG,
};

// ---------------------------------------------------------------------------
// Íconos de los trabajos (planos, línea gruesa, legibles a 44px).
// ---------------------------------------------------------------------------
function IconoTrabajo({ tipo }) {
  return (
    <svg className="cav2-icono-trabajo" viewBox="0 0 48 48" aria-hidden="true">
      {tipo === 'canasta' && (
        <g>
          <path d="M8 20 H40 L36 40 H12 Z" fill="#C68A3C" />
          <path d="M8 20 H40" stroke="#8A5A22" strokeWidth="3" />
          <path d="M16 20 Q24 4 32 20" fill="none" stroke="#8A5A22" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="19" cy="16" r="4.6" fill="#D9483B" />
          <circle cx="28" cy="13" r="4.6" fill="#E8B520" />
        </g>
      )}
      {tipo === 'mata' && (
        <g>
          <path d="M14 40 H34 L31 30 H17 Z" fill="#B06A3A" />
          <path d="M24 30 V14" stroke="#3E8E4C" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M24 20 Q14 18 12 8 Q23 8 24 18 Z" fill="#3E8E4C" />
          <path d="M24 16 Q34 14 36 6 Q25 6 24 14 Z" fill="#57A863" />
        </g>
      )}
      {tipo === 'regadera' && (
        <g>
          <rect x="12" y="18" width="20" height="16" rx="4" fill="#4A7FA5" />
          <path d="M32 22 L42 16 L42 20 L34 26 Z" fill="#4A7FA5" />
          <path d="M14 18 Q18 10 26 12" fill="none" stroke="#4A7FA5" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M40 24 l-1.5 5 M43 26 l-2 5 M45 22 l-1.5 5" stroke="#7FB6D9" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}
      {tipo === 'nacimiento' && (
        <g>
          <path d="M10 36 Q18 28 24 36 Q30 44 38 36" fill="none" stroke="#4A7FA5" strokeWidth="3.6" strokeLinecap="round" />
          <path d="M24 8 Q31 19 31 24 Q31 30 24 30 Q17 30 17 24 Q17 19 24 8 Z" fill="#6FAECF" />
          <path d="M12 30 Q18 24 24 30" fill="none" stroke="#4A7FA5" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {tipo === 'monte' && (
        <g>
          <rect x="13" y="30" width="4.6" height="12" rx="1.6" fill="#7A5230" />
          <circle cx="15" cy="22" r="9" fill="#2F6B3F" />
          <rect x="29" y="26" width="4.6" height="16" rx="1.6" fill="#7A5230" />
          <circle cx="31" cy="17" r="11" fill="#3E8E4C" />
        </g>
      )}
      {tipo === 'abonera' && (
        <g>
          <path d="M8 40 Q14 24 24 22 Q34 24 40 40 Z" fill="#54402E" />
          <path d="M18 30 q3 -3 6 0 q3 3 6 0" fill="none" stroke="#D98A7E" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M24 22 V12 M24 12 l-5 4 M24 12 l5 4" stroke="#3E8E4C" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {tipo === 'estiercol' && (
        <g>
          <path d="M12 38 Q14 30 20 30 Q18 24 24 23 Q30 22 30 28 Q36 28 36 38 Z" fill="#6B4A2E" />
          <path d="M20 18 q2 -4 0 -7 M27 17 q2 -4 0 -7" fill="none" stroke="#A88A6A" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M10 40 H38" stroke="#54402E" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {tipo === 'hojas' && (
        <g>
          <path d="M10 38 H38" stroke="#8A5A22" strokeWidth="3.4" strokeLinecap="round" />
          <path d="M14 34 Q12 24 20 20 Q24 28 18 34 Z" fill="#C6913C" />
          <path d="M26 34 Q26 22 35 20 Q37 30 30 34 Z" fill="#A8752E" />
          <path d="M20 14 Q24 8 30 10 Q28 16 22 16 Z" fill="#D9A951" />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Semáforo de estado: la seña más conocida del campo (verde bueno, rojo malo).
// ---------------------------------------------------------------------------
function Semaforo({ nivel }) {
  const colores = ['#C0492B', '#E4AE1F', '#3E8E4C'];
  return (
    <div className="cav2-semaforo" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`cav2-luz${nivel === i ? ' cav2-luz-activa' : ''}`}
          style={nivel === i ? { background: colores[i], boxShadow: `0 0 0 4px ${colores[i]}33` } : undefined}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantalla principal
// ---------------------------------------------------------------------------
export default function AvatarGameLibreV2() {
  const [especieId, setEspecieId] = useState('abeja');
  const [llenos, setLlenos] = useState({ ...LLENOS_MUESTRA });
  const [hechas, setHechas] = useState({});
  // Índice del puesto recién llenado (para la animación de "pop") por especie.
  const [recien, setRecien] = useState(null);
  const brincoRef = useRef(null);
  const [brinca, setBrinca] = useState(false);

  const especie = ESPECIES.find((e) => e.id === especieId);
  const llenosActual = llenos[especieId];
  const nivel = nivelAnimo(llenosActual);
  const etapa = etapaDe(llenosActual);
  const Animal = ANIMALES[especieId];
  const casaLlena = llenosActual >= TOTAL_PUESTOS;
  const faltanParaCrecer = etapa < 3 ? (etapa + 1) * 3 - llenosActual : 0;

  useEffect(() => () => clearTimeout(brincoRef.current), []);

  function marcarTarea(idx) {
    const clave = `${especieId}:${idx}`;
    if (hechas[clave] || casaLlena) return;
    setHechas((h) => ({ ...h, [clave]: true }));
    setLlenos((ll) => ({ ...ll, [especieId]: Math.min(TOTAL_PUESTOS, ll[especieId] + 1) }));
    setRecien(`${especieId}:${llenosActual}`);
    // El animalito celebra un momento cada vez que le llega comida.
    setBrinca(true);
    clearTimeout(brincoRef.current);
    brincoRef.current = setTimeout(() => setBrinca(false), 900);
  }

  function cambiarEspecie(id) {
    setEspecieId(id);
    setRecien(null);
  }

  return (
    <div className="cav2-root" data-nivel={nivel} style={{ '--cav2-acento': especie.acento }}>
      <header className="cav2-topbar">
        <h1 className="cav2-titulo">La Casa de tu Animalito</h1>
        <span className="cav2-chip-mockup">Mockup · datos de muestra</span>
      </header>

      {/* ============ 1. EL ANIMALITO Y SU ÁNIMO ============ */}
      <section className="cav2-escena" aria-label="Estado del animalito">
        <div className="cav2-cielo" aria-hidden="true">
          <div className="cav2-sol" />
          <div className="cav2-loma cav2-loma-lejos" />
          <div className="cav2-loma cav2-loma-cerca" />
        </div>
        <div className={`cav2-animal-marco${brinca ? ' cav2-brinca' : ''}`}>
          <Animal animo={nivel} />
        </div>
        <div className="cav2-placa-estado">
          <div className="cav2-placa-fila">
            <Semaforo nivel={nivel} />
            <p className="cav2-palabra-animo" aria-live="polite">
              {especie.animoPalabra[nivel]}
            </p>
          </div>
          <p className="cav2-frase-animo">{especie.frase[nivel]}</p>
        </div>
      </section>

      {/* ============ 2. LA CUENTA EN TRES DIBUJOS ============ */}
      <section className="cav2-cuenta" aria-label="Cómo funciona">
        <div className="cav2-cuenta-paso">
          <IconoTrabajo tipo={especie.tareas[0].icono} />
          <span>Usted trabaja la finca</span>
        </div>
        <span className="cav2-flecha" aria-hidden="true">→</span>
        <div className="cav2-cuenta-paso">
          <SimboloPuesto tipo={especie.simbolo} lleno />
          <span>{especie.cuentaPaso2}</span>
        </div>
        <span className="cav2-flecha" aria-hidden="true">→</span>
        <div className="cav2-cuenta-paso">
          <span className="cav2-carita" aria-hidden="true">
            <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#F0B428" /><Cara x={20} y={17} escala={0.75} animo={2} /></svg>
          </span>
          <span>Su animalito se pone feliz</span>
        </div>
      </section>

      {/* ============ 3. LA CASA QUE SE LLENA ============ */}
      <section className="cav2-carta cav2-casa" aria-label={especie.casa}>
        <div className="cav2-carta-cabeza">
          <h2>{especie.casa} de su {especie.nombre.toLowerCase()}</h2>
          <p className="cav2-contador">
            <strong>{llenosActual}</strong> de {TOTAL_PUESTOS} {especie.unidadPlural}
          </p>
        </div>
        <div className="cav2-puestos" role="img" aria-label={`${llenosActual} de ${TOTAL_PUESTOS} ${especie.unidadPlural} llenos`}>
          {Array.from({ length: TOTAL_PUESTOS }, (_, i) => (
            <SimboloPuesto
              key={i}
              tipo={especie.simbolo}
              lleno={i < llenosActual}
              pop={recien === `${especieId}:${i}`}
            />
          ))}
        </div>
        <p className="cav2-casa-nota">
          {casaLlena
            ? '¡Casa llena! Su animalito llegó a lo más alto. Siga cuidando la finca para que no le falte.'
            : `Cada trabajo que usted anota en la app llena un ${especie.unidad}.`}
        </p>
      </section>

      {/* ============ 4. EL CAMINO DE CRECIMIENTO ============ */}
      <section className="cav2-carta" aria-label="Camino de crecimiento">
        <div className="cav2-carta-cabeza">
          <h2>Así va creciendo</h2>
          {faltanParaCrecer > 0 && (
            <p className="cav2-contador">
              Le faltan <strong>{faltanParaCrecer}</strong> para crecer
            </p>
          )}
        </div>
        <ol className="cav2-camino">
          {especie.etapas.map((nombre, i) => {
            const estado = i < etapa ? 'hecha' : i === etapa ? 'actual' : 'falta';
            return (
              <li key={nombre} className={`cav2-paso cav2-paso-${estado}`}>
                <span className="cav2-paso-punto" aria-hidden="true">
                  {i < etapa ? '✓' : i + 1}
                </span>
                <span className="cav2-paso-nombre">{nombre}</span>
                {estado === 'actual' && <span className="cav2-paso-aqui">AQUÍ VA</span>}
              </li>
            );
          })}
        </ol>
      </section>

      {/* ============ 5. TRABAJOS DE HOY ============ */}
      <section className="cav2-carta" aria-label="Trabajos de hoy">
        <div className="cav2-carta-cabeza">
          <h2>Trabajos de hoy</h2>
          <p className="cav2-contador">Haga uno y mire cómo cambia</p>
        </div>
        <ul className="cav2-tareas">
          {especie.tareas.map((t, i) => {
            const hecha = Boolean(hechas[`${especieId}:${i}`]);
            return (
              <li key={t.verbo} className={`cav2-tarea${hecha ? ' cav2-tarea-hecha' : ''}`}>
                <IconoTrabajo tipo={t.icono} />
                <div className="cav2-tarea-texto">
                  <p className="cav2-tarea-verbo">{t.verbo}</p>
                  <p className="cav2-tarea-detalle">{t.detalle}</p>
                </div>
                <div className="cav2-tarea-lado">
                  <span className="cav2-premio">
                    +1 <SimboloPuesto tipo={especie.simbolo} lleno />
                  </span>
                  <button
                    type="button"
                    className="cav2-boton-hice"
                    onClick={() => marcarTarea(i)}
                    disabled={hecha || casaLlena}
                  >
                    {hecha ? '¡Hecho! ✓' : 'Ya lo hice'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="cav2-nota-real">
          En la app de verdad esto se llena solo, con lo que usted ya anota:
          cosechas, riegos, siembras y abonos.
        </p>
      </section>

      {/* ============ 6. ESCOJA SU ANIMALITO ============ */}
      <section className="cav2-carta" aria-label="Escoja su animalito">
        <div className="cav2-carta-cabeza">
          <h2>Escoja su animalito</h2>
          <p className="cav2-contador">Cada uno cuida una parte de la finca</p>
        </div>
        <div className="cav2-selector">
          {ESPECIES.map((e) => {
            const MiniAnimal = ANIMALES[e.id];
            const activa = e.id === especieId;
            return (
              <button
                key={e.id}
                type="button"
                className={`cav2-ficha${activa ? ' cav2-ficha-activa' : ''}${e.esViejo ? ' cav2-ficha-vieja' : ''}`}
                onClick={() => cambiarEspecie(e.id)}
                aria-pressed={activa}
              >
                <span className="cav2-ficha-animal">
                  <MiniAnimal animo={nivelAnimo(llenos[e.id])} />
                </span>
                <span className="cav2-ficha-nombre">{e.nombre}</span>
                <span className="cav2-ficha-rol">{e.rol}</span>
                {activa && <span className="cav2-ficha-marca">El suyo ✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <footer className="cav2-pie">
        <p>
          Mockup de exploración — el animalito de verdad se conectará a los
          datos reales de su finca (agua, suelo, siembras y cosechas).
        </p>
      </footer>
    </div>
  );
}
