// Mockup dev — "EL TELAR DE LA FINCA" (El Espíritu de tu Finca).
//
// Exploración visual libre del juego final de Chagra. La finca es un textil
// andino que se teje a sí mismo con el trabajo real del campesino: el espíritu
// (especie nativa que el usuario elige) es la figura central del tejido, en
// rombos tipo mochila, y se teje fila por fila a medida que la finca prospera.
// Los tintes naturales son la salud real: añil = agua, nogal = suelo,
// chilca = biodiversidad, flor de muerto = constancia. El paño crece franja a
// franja por año: se recorre la finca a 10 años.
//
// Datos de muestra. Ruta: #/mockups/avatar-libre (sin gate, no enlazada
// desde producción). Self-contained: solo React + SVG + CSS.
import React, { useEffect, useMemo, useState } from 'react';
import './AvatarGameLibre.css';

// ── Tintes naturales (paleta única del mockup) ──────────────────────────────
const TINTE = {
  w: '#F4EBDA', // lana cruda
  k: '#37345F', // lana de noche (sombra índigo)
  K: '#5A4632', // nogal oscuro (pelo de oso)
  n: '#C98B4B', // nogal (suelo)
  N: '#8A5A2E', // nogal quemado
  g: '#8FBF6B', // verde chilca (vida)
  G: '#4E7D3A', // chilca oscura
  y: '#EFB84C', // flor de muerto (constancia / oro)
  Y: '#C98E2B', // oro viejo
  r: '#E4566E', // cochinilla (corazón / alerta viva)
  R: '#A93B52', // cochinilla oscura
  b: '#6D8FE4', // añil (agua)
  B: '#46609F', // añil profundo
  m: '#9B6BB3', // mora (hilo de micelio)
};

// Espeja una media-fila (el último carácter es la columna central) → fila
// completa simétrica, como se dibuja un motivo de mochila.
const espejo = (medias) =>
  medias.map((h) => h + h.slice(0, -1).split('').reverse().join(''));

// ── Los cinco espíritus (figuras tejidas 17 columnas) ───────────────────────
const ESPIRITUS = [
  {
    id: 'chivito',
    nombre: 'Chivito de páramo',
    ciencia: 'Oxypogon guerinii',
    indica: 'Páramo sano y flor nativa todo el año',
    tinta: 'g',
    matriz: espejo([
      '........g',
      '........G',
      '.......GG',
      'g.....GwG',
      'gg....GGG',
      'ggg...Gww',
      'bggg..Gwg',
      'bbggg.Gww',
      '.bgggg.Gw',
      '..bgggGGG',
      '...gggGGg',
      '....ggGGg',
      '.....gGGg',
      '......GGg',
      '.......GG',
      '.......GB',
      '.......B.',
      '......B..',
      '.....B...',
    ]),
    voces: [
      'Apenas soy un nudo de lana. Siembre y cuide, que yo me voy tejiendo.',
      'Ya tengo pecho para el frío. Las flores nativas me están llamando.',
      'El agua baja limpia y hay flor casi todo el año. Ya me asoman las alas.',
      'Su finca me tejió entero. El páramo baja hasta su huerta.',
      'Soy el guardián de este paño. Diez años de trabajo bien hilado.',
    ],
  },
  {
    id: 'rana',
    nombre: 'Rana dorada',
    ciencia: 'Phyllobates terribilis',
    indica: 'Agua limpia en quebrada y nacimiento',
    tinta: 'y',
    matriz: espejo([
      '.Y......y',
      '.Y.....yy',
      '.YY...yky',
      '..YY..yyy',
      '...YYyyyy',
      '....yyyyy',
      '....yykyy',
      '....yyyyy',
      '....yyyyk',
      '....yyyyy',
      '...Y.yyyy',
      '..YY..yyy',
      '.YY....yy',
      '.Y......y',
      'YY.......',
    ]),
    voces: [
      'Soy apenas una hebra dorada. Cuide el nacimiento y verá mi color.',
      'El agua ya no arrastra veneno. Me están tejiendo las patas.',
      'Canto de noche en la quebrada: señal de que el agua vive.',
      'Donde yo vivo el agua se puede beber. Su finca lo logró.',
      'Soy la guardiana del agua. Cada gota limpia es un hilo mío.',
    ],
  },
  {
    id: 'abeja',
    nombre: 'Abeja angelita',
    ciencia: 'Tetragonisca angustula',
    indica: 'Floración y biodiversidad de la finca',
    tinta: 'b',
    matriz: espejo([
      '......n..',
      '.......n.',
      '.......nn',
      '......nwn',
      '.bb....yy',
      'bbbb...yy',
      'bbbbb..yy',
      '.bbb...kk',
      '..bb..yyy',
      '......kkk',
      '......yyy',
      '......kkk',
      '......yyy',
      '.......kk',
      '.......yy',
      '........k',
    ]),
    voces: [
      'Soy un puntico en el telar. Siembre flor y me verá crecer.',
      'Encontré las primeras flores. Traigo polen en las patas.',
      'La finca florece por tandas: ya hay comida todo el año.',
      'Mi colmena está llena y su cosecha cuaja mejor. Vamos juntas.',
      'Soy la guardiana de la flor. Sin aguijón, pero con todo el paño.',
    ],
  },
  {
    id: 'oso',
    nombre: 'Oso de anteojos',
    ciencia: 'Tremarctos ornatus',
    indica: 'Bosque, corredores y agroforestería',
    tinta: 'n',
    matriz: espejo([
      '....KK...',
      '....KKKKK',
      '...KKwwKK',
      '...KwkwKK',
      '...KKwwKK',
      '....KKwww',
      '.....KKwN',
      '....KKKKK',
      '...KKKKww',
      '..KKKKKww',
      '..KKKKKKw',
      '..KKKKKKK',
      '..KKKKKKK',
      '...KKKKKK',
      '...KK....',
      '...KK....',
      '..KKK....',
    ]),
    voces: [
      'Soy una sombra en el borde del paño. Deje crecer el monte y vuelvo.',
      'Ya hay árboles jóvenes donde pasar. Me tejieron los anteojos.',
      'El bosque y su cultivo se dan la mano. Camino de noche, tranquilo.',
      'Su finca es corredor: por aquí pasa la vida del monte entero.',
      'Soy el guardián del bosque. Este paño llega hasta la montaña.',
    ],
  },
  {
    id: 'micelio',
    nombre: 'Micelio',
    ciencia: 'La red viva del suelo',
    indica: 'Suelo vivo, compost y raíces conectadas',
    tinta: 'm',
    matriz: espejo([
      '......www',
      '....wwwww',
      '...wwwwww',
      '...nnnnnn',
      '.......ww',
      '.......ww',
      '......mww',
      '.....m.wm',
      '....m..mw',
      '...m..m.m',
      '..m..y..m',
      '.m..m..m.',
      'm..y..m.m',
      '.m....m.y',
      'y..m...m.',
    ]),
    voces: [
      'Soy un hilo bajo la tierra. Écheme compost y empiezo a tramar.',
      'Ya conecto la huerta con el café. Por mí viaja la comida.',
      'La tierra huele a bosque: es mi red que respira.',
      'Toda raíz de su finca habla con las demás. Yo llevo el mensaje.',
      'Soy el guardián de abajo. El paño que se ve florece porque yo tramo.',
    ],
  },
];

// Frase cuando la finca pasa un año duro (salud < 45): el espíritu se destiñe.
const VOZ_DURA =
  'Este año me destiñeron los hilos: el verano fue duro. No suelte la hebra, que el paño aguanta.';

// ── Etapas del tejido ────────────────────────────────────────────────────────
const ETAPAS = [
  { max: 15, nombre: 'Nudo de lana' },
  { max: 40, nombre: 'Primeras hebras' },
  { max: 70, nombre: 'Medio paño' },
  { max: 90, nombre: 'Figura entera' },
  { max: 101, nombre: 'Guardián del paño' },
];
const etapaDe = (tejido) => ETAPAS.findIndex((e) => tejido < e.max);

// ── Trayectoria de muestra: la finca a 10 años ───────────────────────────────
// 2029 es un año duro (verano largo) a propósito: el espíritu se destiñe
// porque refleja la finca real, no un juego de premios.
const TRAYECTORIA = [
  { año: 2026, tejido: 6, agua: 38, suelo: 31, vida: 20, constancia: 25, cosechas: 1, especies: 4, nota: 'Llegó a la finca. Primer surco, primera hebra en el telar.' },
  { año: 2027, tejido: 16, agua: 44, suelo: 38, vida: 30, constancia: 45, cosechas: 6, especies: 12, nota: 'Sembró la huerta y el café. El paño arranca de abajo.' },
  { año: 2028, tejido: 27, agua: 55, suelo: 46, vida: 41, constancia: 58, cosechas: 11, especies: 21, nota: 'Primer compost maduro. La tierra empieza a oler a bosque.' },
  { año: 2029, tejido: 31, agua: 30, suelo: 49, vida: 44, constancia: 38, cosechas: 8, especies: 24, nota: 'Verano largo: el nacimiento bajó y el añil se destiñó.' },
  { año: 2030, tejido: 42, agua: 58, suelo: 57, vida: 52, constancia: 62, cosechas: 14, especies: 33, nota: 'Cosechó agua lluvia y sembró el nacimiento. Volvió el añil.' },
  { año: 2031, tejido: 54, agua: 66, suelo: 64, vida: 63, constancia: 70, cosechas: 18, especies: 47, nota: 'Llegaron las gallinas y el corredor de flor. La trama se aprieta.' },
  { año: 2032, tejido: 65, agua: 73, suelo: 70, vida: 71, constancia: 76, cosechas: 22, especies: 61, nota: 'El café da bajo sombra propia. Ya se ve la figura.' },
  { año: 2033, tejido: 76, agua: 80, suelo: 78, vida: 80, constancia: 82, cosechas: 27, especies: 78, nota: 'Vende en el mercado campesino. El paño mantiene la casa.' },
  { año: 2034, tejido: 85, agua: 86, suelo: 84, vida: 88, constancia: 86, cosechas: 31, especies: 94, nota: 'Volvieron aves que no se veían. El monte reconoce la finca.' },
  { año: 2035, tejido: 93, agua: 90, suelo: 89, vida: 93, constancia: 90, cosechas: 36, especies: 108, nota: 'La finca enseña: vienen vecinos a aprender del telar.' },
  { año: 2036, tejido: 100, agua: 94, suelo: 92, vida: 97, constancia: 95, cosechas: 40, especies: 123, nota: 'El paño está entero. La finca teje sola: usted guía el hilo.' },
];

// ── Los cuatro tintes (salud real → color del hilo) ─────────────────────────
const TINTES_SALUD = [
  { id: 'agua', nombre: 'El agua', tinte: 'Añil', color: TINTE.b },
  { id: 'suelo', nombre: 'El suelo', tinte: 'Nogal', color: TINTE.n },
  { id: 'vida', nombre: 'La vida', tinte: 'Chilca', color: TINTE.g },
  { id: 'constancia', nombre: 'La constancia', tinte: 'Flor de muerto', color: TINTE.y },
];

// ── Mundos como símbolos del borde del paño ──────────────────────────────────
// `view` = vista real de la app (el emblema navega de verdad vía chagra:nav).
// `despierta` = año de muestra en que ese mundo entra al tejido.
const MUNDOS = [
  {
    id: 'cultivos', nombre: 'Cultivos y semillas', view: 'directorio', despierta: 2026,
    glifo: ['...g...', '..g.g..', '.g.y.g.', '..g.g..', '...g...'],
  },
  {
    id: 'suelo', nombre: 'El suelo vivo', view: 'suelo', despierta: 2026,
    glifo: ['...g...', '.......', 'n.n.n.n', '.n.n.n.', 'nnnnnnn'],
  },
  {
    id: 'agua', nombre: 'El agua', view: 'agua', despierta: 2027,
    glifo: ['b.b.b.b', '.b.b.b.', '.......', 'b.b.b.b', '.b.b.b.'],
  },
  {
    id: 'cafe', nombre: 'El café', view: 'cafe', despierta: 2027,
    glifo: ['...g...', '..g.g..', '.r...r.', 'rr...rr', '.r...r.'],
  },
  {
    id: 'abono', nombre: 'Estiércol y compost', view: 'compost', despierta: 2028,
    glifo: ['.nnnnn.', '.n...n.', '.n.g.n.', '.n...n.', '.nnn...'],
  },
  {
    id: 'sanidad', nombre: 'Sanidad de la mata', view: 'sanidad_sintoma', despierta: 2028,
    glifo: ['...g...', '...g...', '.ggrgg.', '...g...', '...g...'],
  },
  {
    id: 'animales', nombre: 'Los animales', view: 'animales', despierta: 2029,
    glifo: ['n.n.n..', '.......', '..nnn..', '.nnnnn.', '..nnn..'],
  },
  {
    id: 'clima', nombre: 'El clima', view: 'almanaque', despierta: 2030,
    glifo: ['y..y..y', '..yyy..', '.yyyyy.', '..yyy..', 'y..y..y'],
  },
  {
    id: 'cana', nombre: 'La caña y la panela', view: 'cana', despierta: 2031,
    glifo: ['g..y..g', '.g.y.g.', '...Y...', '...y...', '...Y...'],
  },
  {
    id: 'mercado', nombre: 'Mercado y despensa', view: 'mercado', despierta: 2033,
    glifo: ['..nnn..', '.n...n.', '.nnnnn.', '.n.n.n.', '.nnnnn.'],
  },
  {
    id: 'disenio', nombre: 'Diseño de la finca', view: 'mapa', despierta: 2034,
    glifo: ['w.....w', '.w.b.w.', '..www..', '.w.b.w.', 'w.....w'],
  },
];

// ── Tejido SVG: renderiza una matriz de rombos como paño ────────────────────
// Cada celda no vacía dibuja SIEMPRE su hilo fantasma (lo que la figura puede
// llegar a ser) y encima el rombo tejido, que aparece de abajo hacia arriba
// según `progreso` — como teje un telar de verdad.
function TejidoSVG({ matriz, progreso = 1, celda = 16, fantasma = true, className = '', animar = false }) {
  const filas = matriz.length;
  const cols = matriz[0].length;
  const ch = celda * 1.3;
  const W = cols * celda;
  const H = filas * ch;
  const filasTejidas = Math.round(filas * Math.min(1, Math.max(0, progreso / 100)));
  const limite = filas - filasTejidas;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`telar-tejido ${className}`}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {matriz.map((fila, r) => {
        const tejida = r >= limite;
        return (
          <g
            key={r}
            className={`telar-fila ${tejida ? 'telar-fila--tejida' : ''} ${animar ? 'telar-fila--animar' : ''}`}
            style={{ '--fila': filas - r }}
          >
            {fila.split('').map((c, i) => {
              const color = TINTE[c];
              if (!color) return null;
              const cx = i * celda + celda / 2;
              const cy = r * ch + ch / 2;
              const pts = `${cx},${cy - ch / 2} ${cx + celda / 2},${cy} ${cx},${cy + ch / 2} ${cx - celda / 2},${cy}`;
              return (
                <React.Fragment key={i}>
                  {fantasma && (
                    <polygon
                      points={pts}
                      fill="none"
                      stroke={color}
                      strokeOpacity="0.28"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                    />
                  )}
                  <polygon points={pts} fill={color} className="telar-rombo" />
                </React.Fragment>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// Barra de salud tejida: N rombitos, se tiñen según el valor.
function HiloSalud({ valor, color }) {
  const total = 14;
  const llenos = Math.round((valor / 100) * total);
  const celda = 12;
  const ch = celda * 1.3;
  return (
    <svg viewBox={`0 0 ${total * celda} ${ch}`} className="telar-hilo-salud" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const cx = i * celda + celda / 2;
        const cy = ch / 2;
        const pts = `${cx},${cy - ch / 2} ${cx + celda / 2},${cy} ${cx},${cy + ch / 2} ${cx - celda / 2},${cy}`;
        return i < llenos ? (
          <polygon key={i} points={pts} fill={color} />
        ) : (
          <polygon key={i} points={pts} fill="none" stroke={color} strokeOpacity="0.25" strokeWidth="1" />
        );
      })}
    </svg>
  );
}

export default function AvatarGameLibre() {
  const [espirituId, setEspirituId] = useState('chivito');
  // Arranca en 2031 (medio paño): la primera impresión muestra la figura
  // tejiéndose, y de ahí se recorre hacia atrás o hacia el porvenir.
  const [añoIdx, setAñoIdx] = useState(5);
  const [mundoActivo, setMundoActivo] = useState(null);
  const [selectorAbierto, setSelectorAbierto] = useState(false);

  const espiritu = ESPIRITUS.find((e) => e.id === espirituId);
  const año = TRAYECTORIA[añoIdx];
  const salud = Math.round((año.agua + año.suelo + año.vida + año.constancia) / 4);
  const etapa = etapaDe(año.tejido);
  const esGuardian = etapa === 4;
  const añoDuro = salud < 45 && añoIdx > 0;
  const voz = añoDuro ? VOZ_DURA : espiritu.voces[etapa];
  const mundosDespiertos = MUNDOS.filter((m) => m.despierta <= año.año);

  // Viveza del hilo: la salud real satura o destiñe la figura entera.
  const filtroVitalidad = useMemo(
    () => `saturate(${(0.35 + 0.65 * (salud / 100)).toFixed(2)}) brightness(${(0.82 + 0.22 * (salud / 100)).toFixed(2)})`,
    [salud],
  );

  useEffect(() => {
    if (!selectorAbierto) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectorAbierto(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectorAbierto]);

  const entrarAlMundo = (mundo) => {
    // Navegación real de la app (App.jsx escucha 'chagra:nav'). En el mockup
    // sin sesión simplemente no monta nada sensible.
    window.dispatchEvent(new CustomEvent('chagra:nav', { detail: mundo.view }));
  };

  return (
    <div className="telar-root" data-año-duro={añoDuro || undefined}>
      <div className="telar-urdimbre" aria-hidden="true" />
      <div className="telar-orillo" aria-hidden="true" />

      <div className="telar-marco">
        {/* ── Cabezal ── */}
        <header className="telar-cabezal">
          <p className="telar-ceja">El telar de la finca · mockup</p>
          <h1 className="telar-titulo">Finca La Esperanza</h1>
          <p className="telar-sub">Choachí, Cundinamarca · 2.650 msnm</p>
        </header>

        <div className="telar-cuerpo">
          {/* ── El espíritu tejido ── */}
          <section className="telar-hero" aria-label="El espíritu de la finca">
            <div className="telar-hero-tags">
              <span className="telar-chip telar-chip--etapa">{ETAPAS[etapa].nombre}</span>
              <span className="telar-chip">tejido {año.tejido}%</span>
            </div>

            <div
              className={`telar-figura ${esGuardian ? 'telar-figura--guardian' : ''}`}
              style={{ filter: filtroVitalidad }}
            >
              {esGuardian && <div className="telar-aura" aria-hidden="true" />}
              <TejidoSVG
                key={espirituId}
                matriz={espiritu.matriz}
                progreso={año.tejido}
                celda={16}
                animar
                className="telar-figura-svg"
              />
              {esGuardian && (
                <div className="telar-motas" aria-hidden="true">
                  <i /><i /><i /><i /><i /><i />
                </div>
              )}
            </div>

            <div className="telar-identidad">
              <h2 className="telar-nombre">{espiritu.nombre}</h2>
              <p className="telar-ciencia">{espiritu.ciencia}</p>
            </div>

            <blockquote className={`telar-voz ${añoDuro ? 'telar-voz--dura' : ''}`}>
              “{voz}”
            </blockquote>

            <button
              type="button"
              className="telar-boton-fantasma"
              onClick={() => setSelectorAbierto(true)}
            >
              Cambiar de espíritu
            </button>

            {/* ── Los cuatro tintes ── */}
            <div className="telar-tintes" role="list" aria-label="Salud de la finca">
              {TINTES_SALUD.map((t) => (
                <div key={t.id} className="telar-tinte" role="listitem">
                  <div className="telar-tinte-cabeza">
                    <span className="telar-tinte-nombre">{t.nombre}</span>
                    <span className="telar-tinte-dato" style={{ color: t.color }}>
                      {año[t.id]}
                    </span>
                  </div>
                  <HiloSalud valor={año[t.id]} color={t.color} />
                  <span className="telar-tinte-tinte">tinte de {t.tinte.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="telar-columna">
            {/* ── El paño del tiempo ── */}
            <section className="telar-seccion" aria-label="La finca a diez años">
              <h3 className="telar-seccion-titulo">El paño del tiempo</h3>
              <p className="telar-seccion-sub">
                Cada franja es un año de trabajo. Toque una para ver cómo iba —o cómo irá— su finca.
              </p>

              <div className="telar-años" role="group" aria-label="Años de la finca">
                {TRAYECTORIA.map((t, i) => (
                  <button
                    key={t.año}
                    type="button"
                    className={`telar-año ${i === añoIdx ? 'telar-año--actual' : ''} ${i > añoIdx ? 'telar-año--porvenir' : ''}`}
                    style={{ '--franja': `${t.tejido}%` }}
                    onClick={() => setAñoIdx(i)}
                    aria-pressed={i === añoIdx}
                  >
                    <span className="telar-año-franja" aria-hidden="true" />
                    <span className="telar-año-num">{String(t.año).slice(2)}</span>
                  </button>
                ))}
              </div>

              <div className="telar-año-detalle">
                <p className="telar-año-nota">
                  <strong>{año.año}.</strong> {año.nota}
                </p>
                <div className="telar-año-datos">
                  <span className="telar-dato">
                    <b>{año.cosechas}</b> cosechas
                  </span>
                  <span className="telar-dato">
                    <b>{año.especies}</b> especies vivas
                  </span>
                  <span className="telar-dato">
                    <b>{mundosDespiertos.length}</b> de {MUNDOS.length} mundos despiertos
                  </span>
                </div>
              </div>
            </section>

            {/* ── Los mundos: símbolos del borde ── */}
            <section className="telar-seccion" aria-label="Los mundos de la finca">
              <h3 className="telar-seccion-titulo">Los símbolos del borde</h3>
              <p className="telar-seccion-sub">
                Cada símbolo del paño es un mundo de su finca. Tóquelo para entrar.
              </p>

              <div className="telar-mundos">
                {MUNDOS.map((m) => {
                  const despierto = m.despierta <= año.año;
                  const activo = mundoActivo === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`telar-mundo ${despierto ? '' : 'telar-mundo--dormido'} ${activo ? 'telar-mundo--activo' : ''}`}
                      onClick={() => setMundoActivo(activo ? null : m.id)}
                      aria-pressed={activo}
                    >
                      <TejidoSVG matriz={m.glifo} celda={10} fantasma={!despierto} progreso={despierto ? 100 : 0} />
                      <span className="telar-mundo-nombre">{m.nombre}</span>
                      {!despierto && <span className="telar-mundo-año">se teje en {m.despierta}</span>}
                    </button>
                  );
                })}
              </div>

              {mundoActivo && (
                <div className="telar-mundo-panel">
                  {(() => {
                    const m = MUNDOS.find((x) => x.id === mundoActivo);
                    const despierto = m.despierta <= año.año;
                    return (
                      <>
                        <div className="telar-mundo-panel-texto">
                          <strong>{m.nombre}</strong>
                          <span>
                            {despierto
                              ? `Tejido en el paño desde ${m.despierta}.`
                              : `Todavía es hilo suelto: se teje en ${m.despierta}.`}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="telar-boton"
                          onClick={() => entrarAlMundo(m)}
                        >
                          Entrar al mundo
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="telar-pie">
          <p>
            Mockup de exploración — los datos son de muestra. El paño real se teje con las
            cosechas, el agua, el suelo y la constancia de su finca.
          </p>
        </footer>
      </div>

      {/* ── Selector de espíritu ── */}
      {selectorAbierto && (
        <div
          className="telar-selector-fondo"
          role="dialog"
          aria-modal="true"
          aria-label="Elegir el espíritu de la finca"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectorAbierto(false);
          }}
        >
          <div className="telar-selector">
            <p className="telar-ceja">El telar pregunta</p>
            <h2 className="telar-selector-titulo">¿Qué espíritu cuida su finca?</h2>
            <p className="telar-selector-sub">
              Cada espíritu es una especie nativa de verdad. Su figura se teje con la salud
              real de lo que esa especie necesita para vivir.
            </p>
            <div className="telar-selector-grilla">
              {ESPIRITUS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`telar-carta ${e.id === espirituId ? 'telar-carta--elegida' : ''}`}
                  onClick={() => {
                    setEspirituId(e.id);
                    setSelectorAbierto(false);
                  }}
                >
                  <TejidoSVG matriz={e.matriz} celda={7} fantasma={false} progreso={100} />
                  <span className="telar-carta-nombre">{e.nombre}</span>
                  <span className="telar-carta-ciencia">{e.ciencia}</span>
                  <span className="telar-carta-indica">{e.indica}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="telar-boton-fantasma"
              onClick={() => setSelectorAbierto(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
