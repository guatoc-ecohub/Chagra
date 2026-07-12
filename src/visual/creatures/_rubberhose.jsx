/*
 * KIT RUBBER-HOSE — primitivas SVG del lenguaje de animación "goma" (Cuphead +
 * Miss Minutes de Loki) FUSIONADO con la calidez campesina andina.
 *
 * Species-agnostic A PROPÓSITO: Angelita lo estrena, pero el oso andino y el
 * colibrí lo heredan sin redibujar (contrato de la casa: "antes de dibujar,
 * búscalo aquí"). Aquí viven los RASGOS de goma (ojos expresivos, cachetes/
 * chapetas, miembros manguera, antenas con bombillo, sonrisa); la CADENCIA
 * (boil ~12fps, parpadeo, follow-through, smear) vive en `creatures.css` como
 * clases `rh-*` que estas piezas activan por className.
 *
 * Todo es transform/opacity friendly y sin dependencias nuevas (GPU, Android
 * gama baja). El gate reduced-motion + device-tier está en el CSS: estas piezas
 * solo PONEN las clases; el CSS decide si corren.
 */

/* Tinta cálida (no negro puro): el contorno grueso "andino" de toda la familia.
   Rubber-hose = línea que manda; que sea tierra-oscura, no industrial. */
export const RH_INK = '#2a1a0c';
/* Guante/mitón crema (manos de goma) y chapeta coral (cachete campesino). */
export const RH_GLOVE = '#fff3d8';
export const RH_CHEEK = '#f2907a';

/**
 * Ojos expresivos de goma (Cuphead/Miss Minutes): esclerótica blanca con
 * contorno grueso, pupila GRANDE y brillo (catchlight). Un mismo grupo parpadea
 * (`rh-blink`) para que los dos ojos cierren sincronizados.
 *
 * @param {Object} props
 * @param {Array<{cx:number,cy:number,r:number}>} [props.ojos]
 * @param {[number,number]} [props.mirar=[0.32,0.34]]
 * @param {boolean} [props.parpadea=true]
 * @param {string} [props.ink=RH_INK]
 */
export function OjosRubber({ ojos = [], mirar = [0.32, 0.34], parpadea = true, ink = RH_INK }) {
  const [mx, my] = mirar;
  return (
    <g className={parpadea ? 'rh-blink' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {ojos.map((o, i) => {
        const pr = o.r * 0.62; // pupila grande (goma), no puntito
        const px = o.cx + mx * o.r;
        const py = o.cy + my * o.r;
        return (
          <g key={i}>
            <circle cx={o.cx} cy={o.cy} r={o.r} fill="#fffaf0" stroke={ink} strokeWidth={o.r * 0.42} />
            {/* pupila + catchlight en su grupo `rh-mirada`: cuando la criatura
                está viva, las pupilas se van de reojo y miran arriba curiosas
                (período co-primo con el parpadeo — nunca el mismo compás).
                Ambos ojos comparten la clase → dardean sincronizados. */}
            <g className={parpadea ? 'rh-mirada' : undefined}>
              <circle cx={px} cy={py} r={pr} fill="#20130a" />
              {/* catchlight arriba-izquierda: la chispa de vida del ojo */}
              <circle cx={px - pr * 0.4} cy={py - pr * 0.5} r={pr * 0.42} fill="#fffdf7" />
            </g>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Chapetas / cachetes campesinos: el rubor coral que da ternura andina.
 * @param {Object} props
 * @param {Array<{cx:number,cy:number,r:number}>} [props.puntos]
 * @param {string} [props.color=RH_CHEEK]
 * @param {boolean} [props.vivo=false]
 */
export function Cachetes({ puntos = [], color = RH_CHEEK, vivo = false }) {
  return (
    <g fill={color} opacity="0.72" className={vivo ? 'rh-rubor' : undefined}>
      {puntos.map((p, i) => (
        <ellipse key={i} cx={p.cx} cy={p.cy} rx={p.r} ry={p.r * 0.72} />
      ))}
    </g>
  );
}

/**
 * Sonrisa de goma: el arco que hace que TODA criatura rubber-hose se vea amable.
 * @param {Object} props
 * @param {number} [props.cx=0]
 * @param {number} [props.cy=0]
 * @param {number} [props.w=3]
 * @param {number} [props.prof=1.4]
 * @param {string} [props.ink=RH_INK]
 */
export function Sonrisa({ cx = 0, cy = 0, w = 3, prof = 1.4, ink = RH_INK }) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  return (
    <path d={`M${x0},${cy} Q${cx},${cy + prof} ${x1},${cy}`} stroke={ink}
      strokeWidth="0.9" fill="none" strokeLinecap="round" />
  );
}

/**
 * Miembro de MANGUERA (brazo/pata de goma): tubo de contorno redondeado con un
 * mitón/pie crema en la punta — la firma de Cuphead. Con `rh-sway` cuelga y
 * hace follow-through (secondary motion) en el idle.
 *
 * `clase` da nombre al miembro (p.ej. 'crt-brazo-r') para que los GESTOS de la
 * criatura (celebra/señala) lo agarren por CSS; `origen` es su transform-origin
 * — el HOMBRO/CADERA real dentro del fill-box (para brazos que se alzan, 'top
 * center' quedaba lejos del hombro y la rotación descolgaba el miembro). El
 * estilo de pivote se estampa SIEMPRE (haya o no sway): así los gestos ESTÁTICOS
 * (fotograma digno con animated=false / reduced-motion) también pivotan bien.
 *
 * @param {Object} props
 * @param {string} props.d
 * @param {number} [props.ancho=2.3]
 * @param {[number,number]|null} [props.punta=null]
 * @param {number} [props.puntaR=1.6]
 * @param {boolean} [props.pie=false]
 * @param {boolean} [props.sway=false]
 * @param {number} [props.delay=0]
 * @param {string} [props.clase]  clase extra del gesto (p.ej. 'crt-brazo-l')
 * @param {string} [props.origen='top center']  transform-origin (el hombro)
 */
export function Miembro({
  d, ancho = 2.3, punta = null, puntaR = 1.6, pie = false, sway = false, delay = 0,
  clase, origen = 'top center', ink = RH_INK, glove = RH_GLOVE,
}) {
  const style = {
    transformBox: 'fill-box',
    transformOrigin: origen,
    ...(sway ? { animationDelay: `${delay}s` } : null),
  };
  const clases = [sway ? 'rh-sway' : null, clase].filter(Boolean).join(' ') || undefined;
  return (
    <g className={clases} style={style}>
      <path d={d} stroke={ink} strokeWidth={ancho} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {punta && (pie ? (
        <ellipse cx={punta[0]} cy={punta[1]} rx={puntaR * 1.15} ry={puntaR * 0.72} fill={glove} stroke={ink} strokeWidth="0.7" />
      ) : (
        <circle cx={punta[0]} cy={punta[1]} r={puntaR} fill={glove} stroke={ink} strokeWidth="0.7" />
      ))}
    </g>
  );
}

/**
 * Antena de goma con bombillo (punta redonda). Con `rh-sway` se mece con
 * follow-through — la secondary motion que delata que el cuerpo se movió.
 * @param {Object} props
 * @param {string} props.d
 * @param {[number,number]} props.bulbo
 * @param {number} [props.bulboR=1.15]
 * @param {boolean} [props.sway=false]
 * @param {number} [props.delay=0]
 * @param {string} [props.ink=RH_INK]
 */
export function AntenaRubber({ d, bulbo, bulboR = 1.15, sway = false, delay = 0, ink = RH_INK }) {
  const style = sway
    ? { transformBox: 'fill-box', transformOrigin: 'bottom center', animationDelay: `${delay}s` }
    : undefined;
  return (
    <g className={sway ? 'rh-sway' : undefined} style={style}>
      <path d={d} stroke={ink} strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <circle cx={bulbo[0]} cy={bulbo[1]} r={bulboR} fill={ink} />
    </g>
  );
}
