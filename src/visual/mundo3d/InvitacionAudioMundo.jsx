/*
 * InvitacionAudioMundo — la invitación de PRIMER USO del sonido ambiental.
 *
 * El motor 0-KB (useAudioMundo, spec S3) nació opt-in (`sonido:'off'`) y su
 * único control vive en Perfil → casi nadie lo descubre, y en las vitrinas
 * ni siquiera hay Perfil. Esta tarjeta invita UNA sola vez, al entrar al
 * primer mundo: "¿Quiere oír el campo?" con Sí / Ahora no.
 *
 *   · El "Sí" hace DOS cosas en el MISMO toque: prende la preferencia
 *     (usePrefsStore sonido → 'suave') y satisface el gesto que la política
 *     de autoplay exige (activarAudioPorGesto crea/reanuda el AudioContext
 *     síncrono dentro del handler) — el campo suena de una, sin segundo toque.
 *   · "Ahora no" cierra y no vuelve a preguntar (el toggle de Perfil queda).
 *   · UNA sola vez (localStorage `chagra:invitacion:audio-mundo:v1`): quedar
 *     mostrada ya la gasta — es una invitación, no una insistencia. Quien ya
 *     prendió el sonido por su cuenta tampoco la ve.
 *   · Discreta: tarjeta abajo, no bloquea la escena; con reduced-motion (prop
 *     del host o media query) aparece sin animación.
 *   · Sin WebAudio en el equipo, no pregunta lo que no puede cumplir.
 *
 * Copy en español Colombia (usted); si se productiza, migra a messages.js
 * (ADR-050). Autocontenido y three-free (DOM + CSS propio, cero assets).
 */
import { useEffect, useState } from 'react';
import usePrefsStore from '../../store/usePrefsStore.js';
import { activarAudioPorGesto, soportaAudio } from './useAudioMundo.js';
import './invitacionAudio.css';

const LS_KEY = 'chagra:invitacion:audio-mundo:v1';

function yaVisto() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(LS_KEY) === '1';
  } catch {
    return false; // sin storage (modo privado): se muestra igual, es efímera
  }
}

function marcarVisto() {
  try {
    window.localStorage.setItem(LS_KEY, '1');
  } catch {
    /* sin storage no pasa nada: solo se repetiría la próxima vez */
  }
}

export default function InvitacionAudioMundo({ reducedMotion = false, tinte }) {
  const sonido = usePrefsStore((s) => s.sonido ?? 'off');
  const setSonido = usePrefsStore((s) => s.setSonido);
  const [visible, setVisible] = useState(
    () => soportaAudio && !yaVisto() && sonido === 'off',
  );

  // La invitación se gasta al mostrarse (una sola vez, jamás insiste) y
  // también la gasta quien ya prendió el sonido por su cuenta en Perfil.
  useEffect(() => {
    if (visible || sonido !== 'off') marcarVisto();
  }, [visible, sonido]);

  if (!visible) return null;

  // El MISMO toque del "Sí": gesto para el AudioContext (síncrono, dentro del
  // handler) + preferencia 'suave' → el hook del host sincroniza y ya suena.
  const aceptar = () => {
    activarAudioPorGesto();
    setSonido('suave');
    setVisible(false);
  };

  const ahoraNo = () => setVisible(false);

  return (
    <div
      className={`mundo-invita${reducedMotion ? ' mundo-invita--calma' : ''}`}
      style={{ '--m-tinte': (tinte && tinte[0]) || '#3f8f4e' }}
      role="group"
      aria-label="Invitación de sonido ambiental"
    >
      <p className="mundo-invita__txt">
        <span aria-hidden="true">🐦</span>{' '}
        <strong className="mundo-invita__pregunta">¿Quiere oír el campo?</strong>{' '}
        <span className="mundo-invita__nota">
          Un ambiente suave de viento, agua y aves. Lo puede apagar cuando quiera.
        </span>
      </p>
      <div className="mundo-invita__botones">
        <button type="button" className="mundo-invita__si" onClick={aceptar}>
          Sí
        </button>
        <button type="button" className="mundo-invita__luego" onClick={ahoraNo}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
