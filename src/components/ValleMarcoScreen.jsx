/*
 * ValleMarcoScreen — el "marco de entrada" al valle 3D vanilla (three r160,
 * el mismo build que sirve 3d.guatoc.co) embebido a pantalla completa vía
 * <iframe src="/valle/index.html">.
 *
 * POR QUÉ IFRAME (decisión del operador, no rediseñar): el valle vanilla
 * corre three r160 con su propio importmap, AISLADO del three r180 que usa
 * el resto de la app (React-Three-Fiber). Un iframe same-origin evita el
 * choque de versiones sin tener que re-escribir el valle en R3F. El bundle
 * estático vive en `public/valle/` (sincronizado por `scripts/sync-valle.mjs`
 * desde el repo vanilla — ver ese script para qué se copia y qué NO).
 *
 * DOS PUERTAS, UN VALLE (recableado task #42, 2026-08-14): este componente
 * hoy tiene DOS puntos de montaje en App.jsx, cada uno con su propio flag de
 * perfil — `marco3d` (Marco3DSection, REEMPLAZA la entrada entera en `case
 * 'dashboard'`) y `valle3d` (Valle3DSection, banda en "Los mundos de su
 * finca" → `case 'valle3d'`). Antes de este recableado, `valle3d` abría
 * `EntradaValle3D` — un diorama APARTE en React-Three-Fiber que nunca vio
 * los rigs compai rediseñados (F24/F25) que sólo aterrizaron en el valle
 * vanilla. Regla de oro: re-rutear, no reimplementar — las dos puertas
 * montan ESTE mismo componente; `EntradaValle3D` (src/mockups/EntradaValle3D)
 * sigue existiendo intacto como vitrina de diseño en `#/mockups/entrada-3d`
 * (`case 'mockup_entrada_3d'`) y como home de `prod.chagra.app`
 * (ProdChagraApp.jsx tiene su propio router, ajeno a este) — fuera de
 * alcance de este cambio.
 *
 * EL COMPAI ELEGIDO VIAJA SOLO (sin plomería nueva) — el iframe es
 * SAME-ORIGIN (`/valle/index.html` vive bajo el mismo dominio que la PWA),
 * así que comparte el localStorage del documento padre: `leerCompanero()`
 * dentro del valle vanilla (compai/elenco.js, el mismo módulo portado, ver
 * src/compai/nucleo/elenco.js) lee la MISMA llave canónica `compai:companero`
 * que ya escribió `escribirCompanero()` en la PWA (useAgentAvatarType.js).
 * Además se pasa `?compai=<slug>` explícito en el src del iframe — lo honran
 * hoy los mundos autónomos que ya saben leerlo (siembra.js, el kart), no el
 * portal principal (`main.js`: ahí `?compai=1` es OTRO flag, booleano, para
 * un overlay de guía-lámina opt-in — colisión de nombre heredada del repo
 * vanilla, no se resuelve aquí). Pasarlo no hace daño (main.js lo ignora al
 * no ser `'1'`) y sirve de refuerzo si algún día el portal empieza a leerlo.
 *
 * GATE DE LOGIN: App.jsx solo monta este componente cuando `currentView ===
 * 'dashboard'`/`'valle3d'` (ambos alcanzables únicamente tras
 * `isAuthenticated()` en el boot: la raíz sin sesión aterriza en `login`, ver
 * App.jsx). Sin sesión, este componente JAMÁS se monta.
 *
 * Sin sandbox: el iframe es same-origin y necesita ejecutar su propio JS de
 * módulo (importmap) — un `sandbox` a medias lo rompería. La CSP del
 * documento padre (index.html, `default-src 'self'`) YA permite este iframe
 * SIN NINGÚN CAMBIO: no hay directiva `frame-src` propia, así que el
 * fallback a `default-src 'self'` cubre un iframe same-origin como este —
 * distinto sería embeber el valle como ORIGEN REMOTO cross-origin (p. ej. si
 * en vez de este bundle sincronizado se apuntara directo a 3d.guatoc.co),
 * que sí necesitaría `frame-src` explícito en la CSP; no es el caso aquí, ni
 * lo será mientras el marco siga sirviendo la copia same-origin de
 * `public/valle/`. La CSP del documento padre no aplica al documento del
 * iframe (otro HTML, otro contexto); `/valle/index.html` no trae su propia
 * CSP, igual que en 3d.guatoc.co hoy.
 *
 * FULLSCREEN — DOS CAPAS, NINGUNA CONFIADA SOLA: el valle vanilla (standalone
 * en 3d.guatoc.co) pide Fullscreen API por su cuenta al cargar. Este marco NO
 * lo necesita para el efecto visual — YA cubre toda la pantalla por CSS
 * (`fixed inset-0` + iframe `inset-0`) — y es activamente DAÑINO si se
 * concede: un elemento en Fullscreen API pasa al "top layer" del navegador,
 * que se pinta POR ENCIMA de TODO el documento padre sin importar z-index —
 * el botón "Entrada simple" (z-10) quedaba tapado por el iframe en cuanto el
 * valle lograba entrar a fullscreen (reproducido con
 * tests/e2e-valle-marco.spec.js: a los pocos segundos `elementFromPoint`
 * sobre las coordenadas del botón devolvía el iframe, no el botón — el
 * usuario quedaba atrapado en pantalla completa SIN la salida que este
 * componente promete, ver volverASimple abajo).
 *   1. Sin `allow="fullscreen"`/`allowFullScreen` en el iframe (Permissions
 *      Policy): un navegador que la respeta rechaza el `requestFullscreen()`
 *      interno del valle de entrada.
 *   2. Guard `fullscreenchange` en ESTE documento (padre) que fuerza
 *      `exitFullscreen()` apenas algo (el iframe, propagado desde su
 *      contenido interno) entra a fullscreen — capa de verdad, NO depende de
 *      que el navegador aplique (1). Verificado empíricamente que hace
 *      falta: bajo chrome-headless-shell (el chromium que usan los E2E)
 *      `allow="fullscreen"` ausente NO bastó — `document.fullscreenElement`
 *      seguía promoviéndose al iframe pasados unos segundos. (1) queda igual
 *      como defensa declarativa correcta contra navegadores que sí la
 *      cumplen; (2) es la que de verdad garantiza que el botón nunca deja de
 *      ser alcanzable. Costo aceptado: en dispositivos donde el valle usa
 *      fullscreen real para bloquear la orientación de pantalla, ese lock
 *      específico no aplica aquí (sí sigue aplicando en 3d.guatoc.co
 *      standalone, fuera del marco).
 */
import { useCallback, useEffect, useMemo } from 'react';
import { setMarco3DPreference } from '../services/userProfileService';
import { leerCompanero } from '../compai/nucleo/elenco.js';

/**
 * @param {Object} props
 * @param {() => void} props.onExit - vuelve a la entrada simple del home.
 * @param {boolean} [props.apagaMarco3dAlSalir] - si TRUE, salir apaga la
 *   preferencia de perfil `marco3d` (Marco3DSection en ProfileScreen.jsx) —
 *   comportamiento HISTÓRICO de la puerta `dashboard`: sin esto el usuario
 *   quedaba sin forma de volver a la entrada simple salvo por Perfil (ver
 *   docstring del archivo). La puerta `valle3d` (banda de "Los mundos de su
 *   finca", Valle3DSection) NO debe tocar esta preferencia AJENA — apagarla
 *   por sorpresa desactivaría un ajuste que esa persona nunca prendió.
 *   Default false: quien no lo pasa explícito no muta ninguna preferencia.
 */
export default function ValleMarcoScreen({ onExit, apagaMarco3dAlSalir = false }) {
  // EL COMPAI ELEGIDO (ver docstring del archivo): se lee UNA vez al montar
  // — leerCompanero() no lanza y ya trae su propio default ('angelita'), así
  // que esto nunca deja el src del iframe sin `compai`.
  const compai = useMemo(() => leerCompanero(), []);
  const valleSrc = `/valle/index.html?compai=${encodeURIComponent(compai)}`;
  // Guard de fullscreen (capa 2, ver docstring del archivo): mientras este
  // componente está montado, si CUALQUIER cosa entra a fullscreen en este
  // documento (el iframe promovido desde su contenido interno), se revierte
  // de inmediato. Sin esto el botón "Entrada simple" puede quedar tapado
  // por el top layer del navegador — atrapando al usuario.
  //
  // Evento + POLLING, no solo evento: el valle reintenta requestFullscreen()
  // por su cuenta en un loop propio, y se observó (tests/e2e-valle-marco.spec.js,
  // reproducido repetidas veces) que el solo listener de 'fullscreenchange'
  // no gana SIEMPRE esa carrera — hay una ventana donde el iframe queda
  // promovido antes de que el handler del evento alcance a revertirlo. El
  // poll cada 250ms es la red de seguridad que sí cierra la ventana: si el
  // evento no alcanzó a reaccionar, el intervalo lo hace en <250ms.
  useEffect(() => {
    const salirDeFullscreen = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener('fullscreenchange', salirDeFullscreen);
    const pollId = setInterval(salirDeFullscreen, 250);
    return () => {
      document.removeEventListener('fullscreenchange', salirDeFullscreen);
      clearInterval(pollId);
    };
  }, []);

  // Salir del marco 3D APAGA la preferencia (toggle-driven, sin estado de
  // sesión aparte): el usuario vuelve a la entrada simple y, si quiere, la
  // reactiva desde su perfil. Evita dejarlo atrapado en pantalla completa
  // sin salida.
  const volverASimple = useCallback(() => {
    if (apagaMarco3dAlSalir) setMarco3DPreference(false);
    onExit?.();
  }, [onExit, apagaMarco3dAlSalir]);

  return (
    <div className="fixed inset-0 z-40 bg-black" data-testid="valle-marco-screen">
      <button
        type="button"
        onClick={volverASimple}
        className="tap-target absolute top-3 left-3 z-10 px-3 py-2 rounded-full bg-slate-950/70 text-slate-100 text-xs font-bold border border-slate-700/60 backdrop-blur-sm"
        aria-label="Volver a la entrada simple (puede reactivar el valle 3D en su perfil)"
        data-testid="valle-marco-salir"
      >
        ‹ Entrada simple
      </button>
      <iframe
        // Nombre de archivo EXPLÍCITO ("/valle/index.html"), no "/valle/"
        // (barra final sin filename): bajo `vite dev` (npm run dev, y el
        // webServer que usan los E2E de Playwright) el middleware de SPA
        // fallback de Vite intercepta cualquier ruta sin extensión ANTES de
        // resolverla contra `public/`, y sirve el index.html DE LA PWA en vez
        // de `public/valle/index.html` — el iframe terminaba cargando Chagra
        // dentro de Chagra, canvas del valle nunca se creaba (detectado por
        // tests/e2e-valle-marco.spec.js: 0 <canvas> dentro del iframe bajo
        // dev). El build de producción (`vite preview`/nginx, verificado con
        // `npm run build` + `vite preview`) sirve `/valle/` bien porque ahí
        // no hay SPA fallback de dev — pero un filename explícito resuelve
        // igual de directo en AMBOS casos (dev y prod), así que se usa
        // siempre para no depender de esa asimetría. `?compai=<slug>` viaja
        // explícito (ver docstring del archivo, "EL COMPAI ELEGIDO VIAJA
        // SOLO") además del localStorage ya compartido same-origin.
        src={valleSrc}
        title="Valle 3D de Guatoc"
        className="absolute inset-0 w-full h-full border-0"
        // Sin allow="fullscreen"/allowFullScreen a propósito — ver docstring
        // del archivo ("FULLSCREEN — DOS CAPAS, NINGUNA CONFIADA SOLA").
      />
    </div>
  );
}
