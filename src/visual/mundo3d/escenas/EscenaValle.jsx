/*
 * EscenaValle — ARQUETIPO `valle`: el MAPA de la finca (la capa lejana).
 *
 * A diferencia de los otros arquetipos (dioramas enfocados que comparten
 * `EscenaBase3D`), el valle YA es una escena-mapa completa y autocontenida:
 * `Valle3D` (traído byte-fiel del mockup "El valle de mi finca"). Este arquetipo
 * es un ADAPTADOR: traduce el contrato uniforme del framework a las props de
 * `Valle3D`, para que el mapa sea "un mundo más" del registro. Tocar un landmark
 * (un mundo del valle) sale por `onHotspot('mundo', { mundoId })` — el host
 * decide si abre ese mundo con `<Mundo>` o navega a su 2D.
 *
 * El componente físico vive en `src/mockups/valle` (el mockup del mapa); aquí solo
 * se adapta, sin redibujarlo — misma geometría procedural, mismo chunk perezoso.
 *
 * CIELO TÁCTIL (mundo CLIMA): el mundo clima es AMBIENTAL — su escena es el
 * cielo de este valle, no un diorama aparte. Esta capa DOM sobre el canvas
 * ofrece dos toques didácticos: la NUBE viste el valle con la piel `lluvia` de
 * `CLIMAS` (oscurece + gotas suaves) y el SOL con la piel `dorada` (luz cálida
 * + resplandor). Es EXPLORACIÓN honesta: a los ~9 s vuelve solo el clima real,
 * y la carta `role="status"` lo dice sin humo. Reglas de la capa:
 *   · Reusa las pieles existentes de `CLIMAS` (valleData) — cero materiales nuevos.
 *   · Gotas transform-only (columnas que se trasladan; nada de top/height animado).
 *   · Ruido DETERMINISTA (hash seno por índice, sin `Math.random` — purity lint).
 *   · Presupuesto de gotas por `tier`; `reducedMotion` = piel directa, sin gotas
 *     ni transiciones (la carta igual informa y el clima igual vuelve solo).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Valle3D from '../../../mockups/valle/Valle3D.jsx';
import { FaunaAmbiental } from '../../creatures/FaunaAmbiental.jsx';
import useAvatarCreature from '../../../hooks/useAvatarCreature.js';

/* EL VALLE VIVO: los personajes asoman A LO LEJOS (banda del horizonte y
   bordes), hacen su giño y se van — nunca más de lo que el tier aguanta.
   EL CENTRAL MANDA: el avatar elegido (useAvatarCreature) se RESERVA para el
   protagonismo — jamás sale de extra en el coro. Angelita también queda fuera
   SIEMPRE: ella ya vuela en primer plano DENTRO de Valle3D (CompaneroAbeja);
   cuando ese acompañante se cable al avatar, esta exclusión sigue valiendo. */
const PUNTOS_FAUNA_VALLE = [
  { estilo: { left: '5%', top: '42%' }, tam: 44, lado: 'izq' },
  { estilo: { right: '6%', top: '36%' }, tam: 38, voltear: true, lado: 'der' },
  { estilo: { left: '32%', top: '28%' }, tam: 32, lado: 'bosque' },
];
/* Constante de módulo: identidad estable para el memo del elenco. */
const EXCLUIR_FAUNA_VALLE = ['abeja-angelita'];

/* Cuánto dura el clima "prestado" antes de volver solo al real. */
const DURACION_TOQUE_MS = 9000;

/* Presupuesto de gotas por gama: columnas DOM transform-only, baratísimas,
   pero igual se raciona para no sumar composición en gama baja. */
const GOTAS_POR_TIER = { alto: 24, medio: 14, bajo: 8 };

/* Ruido determinista [0,1): hash seno clásico por índice/canal. Mismo valle,
   misma lluvia — sin `Math.random` (react-hooks/purity) y estable entre frames. */
function hash01(i, canal) {
  const s = Math.sin((i + 1) * 127.1 + (canal + 1) * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

const COPY_CIELO = {
  lluvia: 'Lluvia de exploración: así cambia la luz del valle cuando llueve. La lluvia de verdad no se manda con un toque; en unos segundos vuelve el clima real.',
  dorada: 'Luz de exploración: así se siente el valle en la hora dorada. El calor de verdad no se manda con un toque; en unos segundos vuelve el clima real.',
};

const ARIA_CIELO = {
  nube: 'Toque la nube: el valle se viste de lluvia un momento, solo para explorar. El clima de verdad no cambia.',
  sol: 'Toque el sol: el valle se enciende con luz cálida un momento, solo para explorar. El clima de verdad no cambia.',
};

/* Estilos de la capa táctil (viven aquí: la capa es de ESTA escena, un archivo). */
const CSS_CIELO = `
.cielotoque { position: relative; flex: 1 1 auto; min-width: 0; width: 100%; height: 100%; }
.cielotoque__capa { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 2; }
.cielotoque__brillo { position: absolute; inset: 0; background: radial-gradient(circle at 80% 18%, rgba(255, 214, 140, 0.42), rgba(255, 214, 140, 0) 55%); opacity: 0; transition: opacity 0.8s ease; }
.cielotoque--dorada .cielotoque__brillo { opacity: 1; }
.cielotoque__btn { position: absolute; pointer-events: auto; min-width: 48px; min-height: 48px; display: flex; align-items: center; justify-content: center; border: 0; padding: 0; background: transparent; cursor: pointer; border-radius: 999px; -webkit-tap-highlight-color: transparent; }
.cielotoque__btn:focus-visible { outline: 3px solid rgba(255, 255, 255, 0.85); outline-offset: 4px; }
.cielotoque__btn--sol { top: 15%; right: 6%; }
.cielotoque__btn--nube { top: 19%; left: 5%; }
.cielotoque__sol { display: block; width: 52px; height: 52px; border-radius: 50%; background: radial-gradient(circle at 38% 35%, #fff3c9, #f7c66b 62%, #e88a4a); box-shadow: 0 0 22px 6px rgba(247, 198, 107, 0.45); transition: box-shadow 0.6s ease, transform 0.6s ease; }
.cielotoque--dorada .cielotoque__sol { box-shadow: 0 0 46px 20px rgba(255, 214, 140, 0.65); transform: scale(1.12); }
.cielotoque__nube { display: block; position: relative; width: 76px; height: 32px; border-radius: 999px; background: #f4f7f8; opacity: 0.94; box-shadow: 0 6px 14px rgba(20, 40, 50, 0.18); transition: background 0.6s ease, transform 0.6s ease; }
.cielotoque__nube::before, .cielotoque__nube::after { content: ''; position: absolute; background: inherit; border-radius: 50%; }
.cielotoque__nube::before { width: 34px; height: 34px; top: -16px; left: 12px; }
.cielotoque__nube::after { width: 26px; height: 26px; top: -10px; right: 14px; }
.cielotoque--lluvia .cielotoque__nube { background: #8a99a0; transform: scale(1.08); }
.cielotoque__gota { position: absolute; top: 0; bottom: 0; width: 2px; border-radius: 2px; background: linear-gradient(to bottom, rgba(210, 228, 238, 0) 0%, rgba(210, 228, 238, 0) 78%, rgba(210, 228, 238, 0.7) 90%, rgba(210, 228, 238, 0) 100%); transform: translate3d(0, -100%, 0); will-change: transform; animation: cielotoque-caer linear infinite; }
@keyframes cielotoque-caer { from { transform: translate3d(0, -100%, 0); } to { transform: translate3d(0, 100%, 0); } }
.cielotoque__carta { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); max-width: min(88%, 34rem); margin: 0; padding: 0.55rem 0.9rem; border-radius: 0.8rem; background: rgba(13, 30, 42, 0.78); color: #f2f6f5; font-size: 0.85rem; line-height: 1.35; text-align: center; backdrop-filter: blur(4px); transition: opacity 0.5s ease; }
.cielotoque__carta[data-visible='false'] { opacity: 0; visibility: hidden; }
.cielotoque--rm .cielotoque__capa *, .cielotoque--rm .cielotoque__brillo, .cielotoque--rm .cielotoque__carta { transition: none !important; animation: none !important; }
`;

export default function EscenaValle({
  params, entrada, reducedMotion = false, onHotspot, animo = 'sereno', energia = 1, tier = 'alto',
  estadoFinca = undefined, hayAlerta = false, // §5b: Angelita refleja el estado real también en el mapa
  /* FASE 4 — cámara de director (establishing + follow + beats). ON por defecto
     en la escena del framework (el "wow" de bienvenida); tier/reduced-motion la
     gatean adentro (tier bajo o calma = cámara fija). Un solo prop la apaga. */
  camaraDirector = true,
}) {
  const climaReal = params?.clima || entrada?.clima || 'soleado';
  /* Buzón de beats para el director: el coro ambiental (FaunaAmbiental) marca
     sus slots con `data-fase='gesto'` al hacer su giño; un MutationObserver
     (abajo) traduce ESO en un beat de cámara — sin tocar el arte ni la capa. */
  const beatsRef = useRef(null);
  const raizRef = useRef(null);
  /* El avatar elegido por la persona: se reserva para el protagonismo (el
     coro ambiental lo excluye — el central manda, nadie lo duplica de extra). */
  const avatar = useAvatarCreature();
  /* El clima "prestado" por el toque: null | 'lluvia' | 'dorada'. Mientras vive,
     pisa al real; el temporizador SIEMPRE lo devuelve (honestidad estructural). */
  const [toque, setToque] = useState(null);
  const timerRef = useRef(null);

  const tocarCielo = (piel) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToque(piel);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setToque(null);
    }, DURACION_TOQUE_MS);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  /* Beats de cámara desde el coro ambiental: cuando un slot de FaunaAmbiental
     entra en su gesto (`data-fase='gesto'`), lo traducimos a un beat para el
     director — lado por dónde asomó (`data-entrada`), quién (`data-slug`: el
     Ent 'ent-frailejon' pide su plano largo) y si fue mágico (`data-magico`).
     Cero acoplamiento al arte: solo se LEEN atributos que la capa ya publica.
     Solo en tier alto y con movimiento (el director solo hace beats en 'cine';
     en calma la fauna ni se monta). */
  useEffect(() => {
    if (!camaraDirector || reducedMotion || tier !== 'alto') return undefined;
    const raiz = raizRef.current;
    if (!raiz || typeof MutationObserver === 'undefined') return undefined;
    const obs = new MutationObserver((mutaciones) => {
      for (const m of mutaciones) {
        const el = /** @type {HTMLElement} */ (m.target);
        if (
          el.nodeType === 1 &&
          el.classList &&
          el.classList.contains('fauna-amb__slot') &&
          el.getAttribute('data-fase') === 'gesto'
        ) {
          // `n` incremental: el director lo drena por contador (lee, no escribe
          // este ref — así no se muta un prop-ref del lado del director).
          beatsRef.current = {
            n: (beatsRef.current?.n ?? 0) + 1,
            tipo: 'fauna',
            lado: el.getAttribute('data-entrada') || undefined,
            slug: el.getAttribute('data-slug') || undefined,
            magico: el.getAttribute('data-magico') === '1',
          };
        }
      }
    });
    obs.observe(raiz, { attributes: true, attributeFilter: ['data-fase'], subtree: true });
    return () => obs.disconnect();
  }, [camaraDirector, reducedMotion, tier]);

  /* Gotas deterministas: posición/tempo por hash de índice, presupuesto por tier. */
  const gotas = useMemo(() => {
    const n = GOTAS_POR_TIER[tier] ?? GOTAS_POR_TIER.alto;
    return Array.from({ length: n }, (_, i) => ({
      left: 2 + hash01(i, 0) * 96,
      dur: 0.9 + hash01(i, 1) * 0.8,
      delay: hash01(i, 2) * 1.6,
      opacity: 0.5 + hash01(i, 3) * 0.5,
    }));
  }, [tier]);

  const clima = toque || climaReal;
  const conGotas = toque === 'lluvia' && !reducedMotion;

  return (
    <div
      ref={raizRef}
      className={`cielotoque${toque ? ` cielotoque--${toque}` : ''}${reducedMotion ? ' cielotoque--rm' : ''}`}
      data-clima-real={climaReal}
    >
      <style>{CSS_CIELO}</style>
      <Valle3D
        clima={clima}
        focoId={null}
        animo={animo}
        energia={energia}
        estadoFinca={estadoFinca}
        hayAlerta={hayAlerta}
        tier={tier}
        reducedMotion={reducedMotion}
        camaraDirector={camaraDirector}
        beatsRef={beatsRef}
        onEntrar={(id) => onHotspot?.('mundo', { mundoId: id })}
        onAlerta={() => onHotspot?.(entrada?.alertaView || 'hoy_finca')}
      />
      <div className="cielotoque__capa">
        {/* El coro ambiental: personajes que vienen del bosque o los costados,
            hacen UN gesto de llamar la atención y se van (pool rotativo,
            tier-safe, pausa fuera de pantalla). Solo el jaguar aparece mágico.
            Va primero: los botones del cielo quedan encima. */}
        <FaunaAmbiental
          central={avatar.id}
          excluir={EXCLUIR_FAUNA_VALLE}
          tier={tier}
          reducedMotion={reducedMotion}
          puntos={PUNTOS_FAUNA_VALLE}
        />
        <div className="cielotoque__brillo" aria-hidden="true" />
        {conGotas && gotas.map((g, i) => (
          <span
            key={i}
            className="cielotoque__gota"
            aria-hidden="true"
            style={{
              left: `${g.left}%`,
              opacity: g.opacity,
              animationDuration: `${g.dur}s`,
              animationDelay: `${g.delay}s`,
            }}
          />
        ))}
        <button
          type="button"
          className="cielotoque__btn cielotoque__btn--nube"
          aria-label={ARIA_CIELO.nube}
          aria-pressed={toque === 'lluvia'}
          onClick={() => tocarCielo('lluvia')}
        >
          <span className="cielotoque__nube" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="cielotoque__btn cielotoque__btn--sol"
          aria-label={ARIA_CIELO.sol}
          aria-pressed={toque === 'dorada'}
          onClick={() => tocarCielo('dorada')}
        >
          <span className="cielotoque__sol" aria-hidden="true" />
        </button>
        <p className="cielotoque__carta" role="status" data-visible={!!toque}>
          {toque ? COPY_CIELO[toque] : ''}
        </p>
      </div>
    </div>
  );
}
