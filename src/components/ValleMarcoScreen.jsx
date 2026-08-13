/*
 * ValleMarcoScreen — el "marco de entrada" OPCIONAL: el valle 3D vanilla
 * (three r160, el mismo build que sirve 3d.guatoc.co) embebido a pantalla
 * completa dentro del shell autenticado, vía <iframe src="/valle/index.html">.
 *
 * POR QUÉ IFRAME (decisión del operador, no rediseñar): el valle vanilla
 * corre three r160 con su propio importmap, AISLADO del three r180 que usa
 * el resto de la app (React-Three-Fiber). Un iframe same-origin evita el
 * choque de versiones sin tener que re-escribir el valle en R3F. El bundle
 * estático vive en `public/valle/` (sincronizado por `scripts/sync-valle.mjs`
 * desde el repo vanilla — ver ese script para qué se copia y qué NO).
 *
 * NO CONFUNDIR con `Valle3DSection`/`valle3d` de ProfileScreen.jsx: ese es
 * OTRO valle — un diorama propio en React-Three-Fiber (EntradaValle3D) que
 * abre DENTRO del dashboard. Este componente es el valle vanilla completo,
 * REEMPLAZANDO la entrada.
 *
 * GATE DE LOGIN: App.jsx solo monta este componente cuando `currentView ===
 * 'dashboard'` (alcanzable únicamente tras `isAuthenticated()` en el boot) Y
 * la preferencia de perfil `marco3d` está en true. Sin sesión, este
 * componente JAMÁS se monta — no hay ruta que lo alcance sin pasar por el
 * gate de auth de App.jsx.
 *
 * Sin sandbox: el iframe es same-origin y necesita ejecutar su propio JS de
 * módulo (importmap) — un `sandbox` a medias lo rompería. La CSP del
 * documento padre (index.html, default-src 'self') no aplica al documento
 * del iframe (otro HTML, otro contexto); `/valle/index.html` no trae su
 * propia CSP, igual que en 3d.guatoc.co hoy.
 *
 * FULLSCREEN — DOS CAPAS, NINGUNA CONFIADA SOLA: el valle vanilla (standalone
 * en 3d.guatoc.co) pide Fullscreen API por su cuenta al cargar. Acá NO hace
 * falta para el efecto visual — el marco YA cubre toda la pantalla por CSS
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
import { useCallback, useEffect } from 'react';
import { setMarco3DPreference } from '../services/userProfileService';

/**
 * @param {Object} props
 * @param {() => void} props.onExit - vuelve a la entrada simple del home.
 */
export default function ValleMarcoScreen({ onExit }) {
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
    setMarco3DPreference(false);
    onExit?.();
  }, [onExit]);

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
        // siempre para no depender de esa asimetría.
        src="/valle/index.html"
        title="Valle 3D de Guatoc"
        className="absolute inset-0 w-full h-full border-0"
        // Sin allow="fullscreen"/allowFullScreen a propósito — ver docstring
        // del archivo ("FULLSCREEN DELIBERADAMENTE NO PERMITIDO").
      />
    </div>
  );
}
