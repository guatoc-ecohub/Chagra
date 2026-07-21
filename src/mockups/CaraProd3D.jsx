/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup dev con copy de muestra (ADR-050) */
/*
 * CaraProd3D — LA CARA 3D-FIRST de prod.chagra.app (#/mockups/cara-prod).
 *
 * El feel completo de la entrada al producto, en tres actos:
 *
 *   1. LA TRANQUERA (entrada/login 3D-first): nada de formulario plano sobre
 *      una foto — el VALLE 3D VIVO de la finca respira detrás (montañas
 *      andinas, ciclo real del día de la vereda, criaturas, Angelita), en
 *      MODO PORTADA (Valle3D `portada`: sin rótulos ni faro — paisaje que
 *      espera, no un mapa que opera). Encima, el LETRERO DE TRANQUERA: la
 *      tabla de madera con el nombre —como en toda finca del Oriente— colgada
 *      sobre un papel crema donde se firma la entrada. Angelita, posada en el
 *      letrero, recibe.
 *
 *   2. CRUZAR LA TRANQUERA (la transición): al ingresar, el letrero se alza,
 *      la luz dorada del valle crece hasta cubrirlo todo (el velo-amanecer) y
 *      del otro lado ya está el home. No se "cambia de pantalla": se ENTRA a
 *      la finca caminando hacia la luz.
 *
 *   3. EL VALLE COMO HOME: la pantalla principal ES el valle vivo que ya
 *      existe (EntradaValle3D: los 4 sí-o-sí en el espacio, mundos, alerta,
 *      voz). Su cámara de llegada + el cruce 2D→3D de Angelita corren al
 *      montar — la portada NO consume esa presentación (clave 'portada'
 *      aparte), así llegar al home estrena su propio establecimiento.
 *
 * GAMA BAJA (línea dura del producto): mismo device-tiering del valle
 * ('alto' 3D plena · 'medio' 3D frugal · 'bajo' → Valle2DFallback digno),
 * cero blur costoso en la tarjeta (superficies sólidas translúcidas), cero
 * assets remotos, reduced-motion = corte limpio sin velo.
 *
 * PLOMERÍA (codex): este mockup es ARTE + estructura presentacional. El form
 * acepta `onIngresar(usuario, clave) → Promise<{ok, error?}>` para cablear
 * `authenticateUser` + operador HMAC + tenant (el flujo real de LoginScreen);
 * sin la prop entra en modo vitrina (cualquier usuario no vacío pasa).
 *
 * Copy de muestra en español de Colombia (usted); si se productiza migra a
 * messages.js (ADR-050).
 */
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CLIMAS } from './valle/valleData';
import useCicloDia from '../visual/mundo3d/useCicloDia.js';
import { decidirTier } from '../visual/mundo3d/deviceTier.js';
import { AbejaAngelita } from '../visual/creatures/AbejaAngelita.jsx';
import Valle2DFallback from './valle/Valle2DFallback';
import EntradaValle3D from './EntradaValle3D';
import '../visual/creatures/creatures.css';
import './entradaValle3D.css';
import './caraProd3D.css';

// La escena 3D pesada (three/fiber/drei) en su PROPIO chunk perezoso — el
// mismo chunk del home: cruzar la tranquera no vuelve a descargar nada.
const Valle3D = lazy(() => import('./valle/Valle3D'));

/* Saludo por la franja REAL del día de la vereda (useCicloDia): la entrada
   sabe qué hora es en el campo — primera señal de que esto no es genérico. */
const SALUDO = {
  amanecer: 'Buenos días',
  manana: 'Buenos días',
  mediodia: 'Buenas tardes',
  tarde: 'Buenas tardes',
  atardecer: 'Buenas tardes',
  noche: 'Buenas noches',
};

/* Tiempos del cruce (ms): el velo dorado crece, el swap va bajo su pico y el
   velo se disuelve REVELANDO el home ya montado (misma coreografía que las
   transiciones de mundo: el intercambio nunca se ve). */
const CRUCE_SWAP_MS = 950;
const CRUCE_FIN_MS = 2100;

class EscenaGuard extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

const noop = () => {};

/**
 * @param {Object} props
 * @param {() => void} [props.onBack]  volver (en la vitrina, al dashboard).
 * @param {(usuario: string, clave: string) => Promise<{ok: boolean, error?: string}>}
 *   [props.onIngresar]  el auth REAL (codex lo cabla a authenticateUser).
 *   Sin ella: modo vitrina — cualquier usuario no vacío cruza la tranquera.
 */
export default function CaraProd3D({ onBack, onIngresar = null }) {
  // 'entrada' → 'cruzando' (velo dorado) → 'finca' (el valle-home).
  const [fase, setFase] = useState('entrada');
  const [velo, setVelo] = useState(false);
  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const timers = useRef([]);

  // El tier del equipo, decidido UNA vez — el mismo criterio del home.
  const [equipo] = useState(decidirTier);
  const reducedMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // La hora real de la vereda tiñe TODO: cielo del valle, saludo, luz del velo.
  const { franja: clima } = useCicloDia({ reducedMotion });

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const cruzarTranquera = useCallback(() => {
    if (reducedMotion) {
      // Corte limpio y digno: sin velo, el home llega directo.
      setFase('finca');
      return;
    }
    setFase('cruzando');
    setVelo(true);
    timers.current.push(setTimeout(() => setFase('finca'), CRUCE_SWAP_MS));
    timers.current.push(setTimeout(() => setVelo(false), CRUCE_FIN_MS));
  }, [reducedMotion]);

  const ingresar = useCallback(
    async (e) => {
      e.preventDefault();
      if (cargando || fase !== 'entrada') return;
      if (!usuario.trim() || !clave) {
        setError('Escriba su usuario y su contraseña para entrar.');
        return;
      }
      setError(null);
      setCargando(true);
      try {
        if (onIngresar) {
          const r = await onIngresar(usuario.trim(), clave);
          if (!r?.ok) {
            setCargando(false);
            setError(r?.error || 'Usuario o contraseña incorrectos. Revíselos e intente de nuevo.');
            return;
          }
        } else {
          // Modo vitrina: un respiro corto — que abrir se SIENTA como abrir.
          await new Promise((res) => setTimeout(res, 650));
        }
      } catch {
        setCargando(false);
        setError('No se pudo entrar en este momento. Intente de nuevo.');
        return;
      }
      setCargando(false);
      cruzarTranquera();
    },
    [cargando, fase, usuario, clave, onIngresar, cruzarTranquera],
  );

  const c = CLIMAS[clima];
  const enPortada = fase !== 'finca';
  // Tier bajo → el 2D digno directo; si el 3D revienta, EscenaGuard cae ahí.
  const usar2D = equipo.tier === 'bajo';

  return (
    <div className="cprod" data-clima={clima} data-fase={fase}>
      {/* ── ACTO 1 · el valle vivo detrás de la tranquera (solo decorativo
             aquí: la interacción llega al cruzar). Mientras se está en el home
             la portada descansa — nunca dos escenas sudando la GPU. ── */}
      {enPortada && (
        <div className="cprod-escena" aria-hidden="true">
          {usar2D ? (
            <Valle2DFallback
              clima={clima}
              focoId={null}
              reducedMotion={reducedMotion}
              onEntrar={noop}
              onAlerta={noop}
            />
          ) : (
            <EscenaGuard
              fallback={(
                <Valle2DFallback
                  clima={clima}
                  focoId={null}
                  reducedMotion={reducedMotion}
                  onEntrar={noop}
                  onAlerta={noop}
                />
              )}
            >
              <Suspense fallback={<CieloDeEspera c={c} />}>
                <Valle3D
                  clima={clima}
                  focoId={null}
                  onEntrar={noop}
                  onAlerta={noop}
                  reducedMotion={reducedMotion}
                  tier={equipo.tier}
                  portada
                />
              </Suspense>
            </EscenaGuard>
          )}
          {/* Scrim de cine: oscurece apenas el pie del valle para que el
              letrero y el papel lean SIEMPRE, de mediodía o de noche. */}
          <div className="cprod-scrim" />
        </div>
      )}

      {/* ── ACTO 1 · LA TRANQUERA: letrero de madera + papel de entrada ── */}
      {enPortada && (
        <main className="cprod-puerta" data-abriendo={fase === 'cruzando' ? 'si' : 'no'}>
          {/* Angelita posada en el letrero: la primera que recibe. Al cruzar,
              vuela adelante (el cruce 2D→3D real corre al montar el home). */}
          <span className="cprod-abeja" aria-hidden="true">
            <AbejaAngelita
              size={44}
              pose="vuela"
              animo="sereno"
              energia={1}
              animated={!reducedMotion}
            />
            <i className="cprod-abeja__sombra" />
          </span>

          <header className="cprod-letrero">
            <p className="cprod-letrero__saludo">{SALUDO[clima] || 'Bienvenido'}</p>
            <h1 className="cprod-letrero__nombre">Chagra</h1>
            <p className="cprod-letrero__lema">El cuaderno vivo de su finca</p>
          </header>

          <form className="cprod-papel" onSubmit={ingresar} aria-busy={cargando}>
            <h2 className="cprod-papel__titulo">Entre a su finca</h2>

            <label className="cprod-campo">
              <span className="cprod-campo__nombre">Usuario</span>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Su usuario"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                disabled={fase !== 'entrada'}
              />
            </label>

            <label className="cprod-campo">
              <span className="cprod-campo__nombre">Contraseña</span>
              <span className="cprod-campo__caja">
                <input
                  type={verClave ? 'text' : 'password'}
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  placeholder="Su contraseña"
                  autoComplete="current-password"
                  disabled={fase !== 'entrada'}
                />
                <button
                  type="button"
                  className="cprod-campo__ojo"
                  onClick={() => setVerClave((v) => !v)}
                  aria-pressed={verClave}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {verClave ? '🙈' : '👁️'}
                </button>
              </span>
            </label>

            {error && (
              <p className="cprod-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="cprod-abrir" disabled={cargando || fase !== 'entrada'}>
              {cargando ? 'Abriendo…' : 'Abrir la tranquera'}
            </button>

            {!onIngresar && (
              <p className="cprod-vitrina">Vitrina de diseño: entre con cualquier usuario.</p>
            )}

            {/* Las tres promesas, quietas al pie del papel: por qué confiar. */}
            <ul className="cprod-promesas" aria-label="Compromisos de Chagra">
              <li>Sirve sin señal</li>
              <li>Sus datos son suyos</li>
              <li>Software libre</li>
            </ul>
          </form>

          <p className="cprod-pie">Chagra guarda todo en su teléfono. Nada se comparte sin su permiso.</p>
        </main>
      )}

      {/* ── ACTO 3 · EL HOME = el valle vivo (con su propia llegada de cámara
             y el cruce 2D→3D de Angelita, que corren al montar). ── */}
      {fase === 'finca' && <EntradaValle3D onBack={onBack} />}

      {/* ── ACTO 2 · el velo-amanecer del cruce: la luz del valle crece, el
             swap pasa bajo su pico y al abrirse ya se está ADENTRO. ── */}
      {velo && <div className="cprod-velo" aria-hidden="true" />}
    </div>
  );
}

/* Cielo de la franja mientras baja el chunk 3D: nunca un rectángulo negro. */
function CieloDeEspera({ c }) {
  return (
    <div
      className="cprod-espera"
      style={{ background: `linear-gradient(180deg, ${c.cielo[0]}, ${c.cielo[1]})` }}
    >
      <div className="cprod-espera__sol" />
    </div>
  );
}
