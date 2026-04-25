/**
 * LegalLinks.jsx — Acceso a Términos, Privacidad, Soberanía Comunitaria
 * y Licencias mediante modales nativos <dialog>. Reutilizable desde Login,
 * Dashboard footer u otros puntos. Texto integral en Chagra-strategy/legal/
 * TERMINOS_Y_CONDICIONES_v0.1_DRAFT.md (pendiente revisión legal).
 *
 * AGPL-3.0 © Chagra
 */

import React, { useRef, useCallback } from 'react';
import { X } from 'lucide-react';

// Cada modal apunta a su pagina publica especifica en chagra.bio/legal/.
// Si el sitio publico no esta desplegado todavia, los modales aun muestran
// el resumen completo inline; el link "Read full text" solo añade contexto.
const LEGAL_BASE = 'https://chagra.bio/legal';

function LegalDialog({ id, title, meta, children, dialogRef, fullTextUrl }) {
  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) dialogRef.current.close();
  };

  return (
    <dialog
      id={id}
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="rounded-2xl bg-slate-900 text-slate-100 border border-slate-800 p-0 max-w-lg w-[calc(100vw-2rem)] backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <article className="p-5 max-h-[80dvh] overflow-y-auto">
        <header className="flex justify-between items-start gap-3 mb-3">
          <h2 className="text-xl font-bold text-slate-100 m-0">{title}</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Cerrar"
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </header>
        {meta && <p className="text-2xs text-slate-500 mb-3 leading-relaxed">{meta}</p>}
        <div className="text-sm text-slate-300 leading-relaxed space-y-3">
          {children}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-800">
          <a
            href={fullTextUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-bold text-sm"
          >
            Leer texto completo →
          </a>
        </div>
      </article>
    </dialog>
  );
}

export default function LegalLinks() {
  const tycRef = useRef(null);
  const privRef = useRef(null);
  const comRef = useRef(null);
  const licRef = useRef(null);

  const open = useCallback((ref) => {
    if (ref.current && typeof ref.current.showModal === 'function') {
      ref.current.showModal();
    }
  }, []);

  return (
    <>
      <div className="mt-8 pt-5 border-t border-slate-800 w-full text-center">
        <p className="text-xs text-slate-500 leading-relaxed px-2">
          Al ingresar aceptas los{' '}
          <button
            type="button"
            onClick={() => open(tycRef)}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Términos
          </button>{' '}
          y la{' '}
          <button
            type="button"
            onClick={() => open(privRef)}
            className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            Política de Datos
          </button>
          .
        </p>
        <p className="text-2xs text-slate-600 mt-2 leading-relaxed px-2">
          Software libre AGPL-3.0 · Catálogo CC-BY-SA 4.0 ·{' '}
          <button
            type="button"
            onClick={() => open(comRef)}
            className="text-emerald-400/80 hover:text-emerald-300 underline underline-offset-2"
          >
            Soberanía comunitaria
          </button>{' '}
          ·{' '}
          <button
            type="button"
            onClick={() => open(licRef)}
            className="text-emerald-400/80 hover:text-emerald-300 underline underline-offset-2"
          >
            Licencias
          </button>
        </p>
      </div>

      <LegalDialog
        id="legal-tyc"
        dialogRef={tycRef}
        fullTextUrl={`${LEGAL_BASE}/terminos-y-condiciones.html`}
        title="Términos y condiciones"
        meta="Versión v0.1 · 2026-04-24 · borrador pendiente revisión legal."
      >
        <h3 className="text-base font-bold text-slate-100">Naturaleza de Chagra</h3>
        <p>
          Chagra es una plataforma de gestión agroecológica que opera{' '}
          <strong className="text-slate-100">offline-first</strong> y sincroniza con servidor
          FarmOS cuando hay conectividad. Combina inventario biológico, trazabilidad de
          biopreparados, registro de labores y asistencia por IA, con foco en productores de
          Latinoamérica tropical.
        </p>

        <h3 className="text-base font-bold text-slate-100 pt-2">
          Catálogo y asistencia por IA: carácter orientativo
        </h3>
        <p>
          El catálogo y las inferencias de IA son <strong className="text-slate-100">orientativos</strong>{' '}
          y no sustituyen el criterio de un agrónomo. Toda inferencia con confianza inferior
          al 85% se marca para revisión humana antes de informar decisiones operativas.
        </p>

        <h3 className="text-base font-bold text-slate-100 pt-2">Marcos de certificación</h3>
        <p>
          Chagra facilita registros compatibles con SPG, Ecocert, IFOAM, Mayacert.{' '}
          <strong className="text-slate-100">El registro no equivale a una certificación</strong>;
          esta es facultad exclusiva de la entidad certificadora.
        </p>

        <h3 className="text-base font-bold text-slate-100 pt-2">Jurisdicción</h3>
        <p>
          Estos Términos se rigen por la legislación de Colombia. Las modificaciones
          materiales se notifican con al menos 15 días de anticipación.
        </p>
      </LegalDialog>

      <LegalDialog
        id="legal-priv"
        dialogRef={privRef}
        fullTextUrl={`${LEGAL_BASE}/privacidad.html`}
        title="Política de tratamiento de datos"
        meta="Conforme a la Ley 1581 de 2012 (Habeas Data Colombia) y el Decreto 1377 de 2013."
      >
        <h3 className="text-base font-bold text-slate-100">Ownership estratificado</h3>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong className="text-slate-100">Datos individuales</strong> (nombre, correo, GPS):
            del Usuario; sincronizables solo con consentimiento explícito.
          </li>
          <li>
            <strong className="text-slate-100">Datos comunitarios</strong> (variedades criollas,
            saberes ancestrales): de la comunidad; cifrados con passphrase comunitaria. El
            operador no puede leerlos sin esa clave.
          </li>
          <li>
            <strong className="text-slate-100">Agregados anónimos</strong>: solo bajo opt-in,
            sin re-identificación.
          </li>
        </ul>

        <h3 className="text-base font-bold text-slate-100 pt-2">Sus derechos</h3>
        <p>
          Acceso, rectificación, cancelación, oposición, portabilidad nativa (JSON / CSV /
          GeoJSON) y revocación. Reclamos atendidos en máximo 15 días hábiles. Sin perjuicio
          del derecho a presentar queja ante la SIC.
        </p>

        <h3 className="text-base font-bold text-slate-100 pt-2">Cifrado</h3>
        <p>
          TLS 1.3 en tránsito · AES-256-GCM con Argon2id en reposo para datos sensibles ·
          backups cifrados sin acceso del operador del centro de datos.
        </p>

        <h3 className="text-base font-bold text-slate-100 pt-2">Cómo ejercer sus derechos</h3>
        <p>
          Escriba a{' '}
          <a href="mailto:dpo@chagra.bio" className="text-emerald-400 hover:underline">
            dpo@chagra.bio
          </a>{' '}
          con su identificación, descripción del derecho y datos de contacto.
        </p>
      </LegalDialog>

      <LegalDialog
        id="legal-comunitario"
        dialogRef={comRef}
        fullTextUrl={`${LEGAL_BASE}/soberania-comunitaria.html`}
        title="Soberanía de saberes comunitarios"
        meta="Conforme al Convenio 169 OIT (Ley 21/1991) y los Principios CARE."
      >
        <h3 className="text-base font-bold text-slate-100">Compromisos con comunidades</h3>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>
            <strong className="text-slate-100">Consentimiento previo, libre e informado</strong>{' '}
            de la autoridad comunitaria antes de sincronizar saberes comunitarios.
          </li>
          <li>
            <strong className="text-slate-100">Cifrado a nivel de campo</strong> con passphrase
            comunitaria; el operador no tiene acceso técnico sin esa clave.
          </li>
          <li>
            <strong className="text-slate-100">Resistencia a requerimientos coercitivos</strong>:
            ante solicitud de autoridad pública, se revela únicamente la existencia de un
            blob cifrado, sin posibilidad técnica de descifrarlo. Documentado en transparency
            report anual.
          </li>
          <li>
            <strong className="text-slate-100">Derecho de retiro efectivo</strong> en máximo
            30 días, incluyendo backups.
          </li>
          <li>
            <strong className="text-slate-100">No-explotabilidad por terceros</strong> sin
            consentimiento expreso de la autoridad comunitaria.
          </li>
        </ol>
      </LegalDialog>

      <LegalDialog
        id="legal-lic"
        dialogRef={licRef}
        fullTextUrl={`${LEGAL_BASE}/licencias.html`}
        title="Licencias del software y catálogo"
        meta="Modelo open-core: base común, módulos comerciales separados."
      >
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-slate-200 font-bold">
              <th className="text-left py-2 pr-2 border-b border-slate-800">Componente</th>
              <th className="text-left py-2 border-b border-slate-800">Licencia</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            <tr>
              <td className="py-2 pr-2 border-b border-slate-800">
                Código público (PWA, módulos OSS)
              </td>
              <td className="py-2 border-b border-slate-800">
                <strong className="text-slate-200">AGPL-3.0</strong>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-2 border-b border-slate-800">Catálogo agroecológico público</td>
              <td className="py-2 border-b border-slate-800">
                <strong className="text-slate-200">CC-BY-SA 4.0</strong>
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-2 border-b border-slate-800">
                Módulos Pro (curado, presets, prompts premium)
              </td>
              <td className="py-2 border-b border-slate-800">Comercial cerrada</td>
            </tr>
            <tr>
              <td className="py-2 pr-2">Documentación pública</td>
              <td className="py-2">CC-BY-SA 4.0</td>
            </tr>
          </tbody>
        </table>
        <p className="pt-2">
          Las contribuciones externas al repositorio público requieren la firma de un{' '}
          <strong className="text-slate-100">Contributor License Agreement (CLA)</strong> antes
          del primer merge.
        </p>
        <p className="text-xs">
          <a
            href="https://github.com/guatoc-ecohub/Chagra/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline mr-3"
          >
            Ver AGPL-3.0
          </a>
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/deed.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Ver CC-BY-SA 4.0
          </a>
        </p>
      </LegalDialog>
    </>
  );
}
