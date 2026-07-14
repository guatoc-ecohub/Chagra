/*
 * VeloOdyssey — el velo/cortina del cruce entre mundos, con identidad andina.
 *
 * Norte Odyssey: pasar de un mundo a otro (valle ↔ bosque ↔ suelo ↔ sierra)
 * es un MOMENTO, no un corte. Este componente es la mitad DOM del lenguaje
 * (overlay puro, CERO three, offline); la mitad 3D vive aparte en
 * `CamaraCruce.jsx` (chunk vendor-three) y respira con la MISMA curva.
 *
 * El velo lo elige el DESTINO (velosData.familiaDeVelo):
 *   · niebla — bancos de bruma del páramo que envuelven (sierra/agua/altura);
 *   · tierra — el suelo se abre y lo traga a uno (suelo/microsuelo/compost);
 *   · hojas  — remolino de follaje que cierra el monte (bosque/restauración);
 *   · luz    — la luz dorada de la casa (valle/hogar, y el default digno).
 *
 * ASIMETRÍA: `fase="entrando"` descubre (ceremonial, overshoot al revelar);
 * `fase="saliendo"` regresa a casa (más corto, tibio, exhala sin rebote).
 * Cada velo tiene DOS coreografías distintas — no es la misma al revés.
 *
 * CONTRATO TEMPORAL (el mismo de TransicionMundo/TransicionMundoKit):
 * los callbacks los disparan timers JS deterministas, NUNCA `animationend`
 * (pestañas en segundo plano, throttling). El CSS anima "a ciegas" con la
 * misma duración via `--vo-ms`.
 *   · `onCubierto` — pantalla 100% cubierta (54% del viaje, centro de la
 *     meseta 46%–62%): AQUÍ el host intercambia la escena DEBAJO;
 *   · `onFin`      — mundo revelado, overlay inerte: desmonte con fase=null.
 * Cada uno se llama a lo sumo UNA vez por activación.
 *
 * TIER-SAFE: gama baja conserva el MISMO velo (identidad intacta) sin
 * decoraciones (jirones/hojas/piedritas/halos/boil) y 30% más corto — nunca
 * una pantalla en blanco. `reducedMotion` colapsa a un corte simple digno
 * con el tinte del velo.
 *
 * PROPS
 *   fase          null | 'entrando' | 'saliendo' — null no monta nada.
 *   destino       mundoId o familia ('bosque_vivo', 'microsuelo', 'sierra'…).
 *   velo          override explícito de la identidad ('niebla'|'tierra'|…).
 *   tier          'alto'|'medio'|'bajo' (deviceTier.decidirTier().tier).
 *   reducedMotion bool (deviceTier.decidirTier().reducedMotion).
 *   letrero       texto bajo el velo. Default: al volver, "De vuelta a casa…";
 *                 al entrar, nada (que hable el mundo). Pase '' para mudo.
 *   onCubierto / onFin  callbacks del contrato temporal.
 *
 * CABLEO SUGERIDO (lo hace Opus — este archivo no toca nada existente):
 *   el host monta `<VeloOdyssey fase={viaje.fase} destino={viaje.destino}…/>`
 *   como hermano del canvas; en `onCubierto` hace el swap de escena; en
 *   `onFin` apaga la fase. O directo con el hook `useCruceMundo`.
 */
import { useEffect, useRef } from 'react';
import { VELOS, familiaDeVelo, duracionCruce, momentoCubierto } from './velosData.js';
import './veloOdyssey.css';

/* Hoja rubber-hose mínima: silueta gorda + vena, sin detalle que no se lea. */
function HojaSvg({ claro, profundo }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5 C 18.5 6, 20.5 14, 12 22.5 C 3.5 14, 5.5 6, 12 1.5 Z" fill={claro} />
      <path
        d="M12 3.5 C 12 9, 12 15, 12 21 M12 9 C 10 10, 9 11, 8.2 12.4 M12 13 C 14 14, 15 15, 15.8 16.4"
        stroke={profundo}
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

/* Horizonte del suelo: terrones, matas de pasto y una que otra raicilla. */
const PATH_HORIZONTE =
  'M0,10 L0,6.2 C5,4.8 8,6.8 13,6 L14.2,3.2 L15.4,6 C23,5.2 27,7 35,6.2 ' +
  'C39,5.7 41,3.6 43,3.6 C45,3.6 46,6.1 51,6.1 C59,6.6 63,4.6 71,5.1 ' +
  'L72.8,2.6 L74.6,5.6 C82,5 88,7 100,5.9 L100,10 Z';

export default function VeloOdyssey({
  fase = null,
  destino = 'valle',
  velo,
  tier = 'medio',
  reducedMotion = false,
  letrero,
  onCubierto,
  onFin,
}) {
  const cubiertoRef = useRef(onCubierto);
  const finRef = useRef(onFin);
  // Refs "última versión": se actualizan en un effect (no en render) para que
  // los timers llamen siempre al callback más fresco sin re-armarse.
  useEffect(() => {
    cubiertoRef.current = onCubierto;
    finRef.current = onFin;
  });

  const activo = fase === 'entrando' || fase === 'saliendo';
  const veloId = velo || familiaDeVelo(destino);

  useEffect(() => {
    if (!activo) return undefined;
    let hechoCubierto = false;
    let hechoFin = false;
    const f = /** @type {'entrando'|'saliendo'} */ (fase);
    const t = /** @type {'alto'|'medio'|'bajo'} */ (tier);
    const tCubierto = setTimeout(() => {
      if (!hechoCubierto) {
        hechoCubierto = true;
        cubiertoRef.current?.();
      }
    }, momentoCubierto(veloId, f, t, reducedMotion));
    const tFin = setTimeout(() => {
      if (!hechoFin) {
        hechoFin = true;
        finRef.current?.();
      }
    }, duracionCruce(veloId, f, t, reducedMotion));
    return () => {
      hechoCubierto = true;
      hechoFin = true;
      clearTimeout(tCubierto);
      clearTimeout(tFin);
    };
  }, [activo, fase, veloId, tier, reducedMotion]);

  if (!activo) return null;

  const total = duracionCruce(
    veloId,
    /** @type {'entrando'|'saliendo'} */ (fase),
    /** @type {'alto'|'medio'|'bajo'} */ (tier),
    reducedMotion,
  );
  const v = VELOS[veloId] ? veloId : 'luz';
  const { claro, medio, profundo } = VELOS[v];
  const estilo = {
    '--vo-claro': claro,
    '--vo-medio': medio,
    '--vo-profundo': profundo,
    '--vo-ms': `${total}ms`,
  };
  // Asimetría del texto: volver acoge por defecto; entrar deja hablar al mundo.
  const texto = letrero !== undefined ? letrero : fase === 'saliendo' ? 'De vuelta a casa…' : '';
  const conAdornos = tier !== 'bajo' && !reducedMotion;
  const adornosPlenos = tier === 'alto' && !reducedMotion;

  if (reducedMotion) {
    return (
      <div
        className="vo"
        data-velo={v}
        data-fase={fase}
        data-tier={tier}
        data-reducida="1"
        style={estilo}
        role="status"
        aria-live="polite"
        data-testid="velo-odyssey"
      >
        <div className="vo__corte" aria-hidden="true" />
        {texto ? <p className="vo__letrero" style={{ opacity: 1, animation: 'none' }}>{texto}</p> : null}
      </div>
    );
  }

  return (
    <div
      className="vo"
      data-velo={v}
      data-fase={fase}
      data-tier={tier}
      data-reducida="0"
      style={estilo}
      role="status"
      aria-live="polite"
      data-testid="velo-odyssey"
    >
      {v === 'niebla' && (
        <>
          <div className="vo__manto" aria-hidden="true" />
          {conAdornos && <div className="vo__jiron vo__jiron--1" aria-hidden="true" />}
          {conAdornos && <div className="vo__jiron vo__jiron--2" aria-hidden="true" />}
          {adornosPlenos && <div className="vo__jiron vo__jiron--3" aria-hidden="true" />}
        </>
      )}

      {v === 'tierra' && (
        <div className="vo__suelo" aria-hidden="true">
          <svg
            className="vo__horizonte vo__horizonte--frente"
            viewBox="0 0 100 10"
            preserveAspectRatio="none"
          >
            <path d={PATH_HORIZONTE} />
          </svg>
          <div className="vo__suelo-cuerpo">
            {conAdornos && (
              <>
                <span className="vo__piedrita vo__piedrita--1" />
                <span className="vo__piedrita vo__piedrita--2" />
                <span className="vo__piedrita vo__piedrita--3" />
                {adornosPlenos && <span className="vo__piedrita vo__piedrita--4" />}
              </>
            )}
          </div>
          {conAdornos && (
            <svg
              className="vo__horizonte vo__horizonte--cola"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path d={PATH_HORIZONTE} />
            </svg>
          )}
        </div>
      )}

      {v === 'hojas' && (
        <>
          <div className="vo__fronda" aria-hidden="true" />
          {conAdornos && (
            <>
              <div className="vo__hoja vo__hoja--1" aria-hidden="true">
                <HojaSvg claro={claro} profundo={profundo} />
              </div>
              <div className="vo__hoja vo__hoja--3" aria-hidden="true">
                <HojaSvg claro={medio} profundo={profundo} />
              </div>
            </>
          )}
          {adornosPlenos && (
            <>
              <div className="vo__hoja vo__hoja--2" aria-hidden="true">
                <HojaSvg claro={claro} profundo={profundo} />
              </div>
              <div className="vo__hoja vo__hoja--4" aria-hidden="true">
                <HojaSvg claro={medio} profundo={profundo} />
              </div>
              <div className="vo__hoja vo__hoja--5" aria-hidden="true">
                <HojaSvg claro={claro} profundo={profundo} />
              </div>
            </>
          )}
        </>
      )}

      {v === 'luz' &&
        (fase === 'entrando' ? (
          <>
            <div className="vo__destello" aria-hidden="true" />
            {adornosPlenos && <div className="vo__halo" aria-hidden="true" />}
            {adornosPlenos && <div className="vo__halo vo__halo--2" aria-hidden="true" />}
          </>
        ) : (
          <>
            <div className="vo__abrazo" aria-hidden="true" />
            {adornosPlenos && <div className="vo__halo" aria-hidden="true" />}
          </>
        ))}

      {texto ? <p className="vo__letrero">{texto}</p> : null}
    </div>
  );
}
