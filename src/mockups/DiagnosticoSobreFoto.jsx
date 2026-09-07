/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mockup de diseño: copy de UI de muestra, no producción (ADR-050) */
import React, { useCallback, useRef, useState } from 'react';
import { ScreenShell } from '../components/common/ScreenShell';
import { ScanEye, ShieldAlert, Sparkles, Info, Camera, Leaf, Image as ImageIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { recognizeSpeciesGrounded, analyzeFoliage } from '../services/aiService';
import { optimizeImage, blobToDataUrl } from '../utils/imageProcessor';
import { compressImage, IMAGE_TOO_LARGE_MESSAGE } from '../utils/imageCompress';
import './diagnostico-sobre-foto.css';

/**
 * "El agente dibuja el diagnóstico SOBRE la foto" — pipeline de visión REAL
 * (#67, 2026-07-30). Antes era una demo de galería con datos de muestra fijos
 * (roya del café hardcodeada); ahora la foto la sube el usuario y el
 * diagnóstico sale del MISMO pipeline anti-alucinación que ya usa el resto
 * de la app:
 *
 *   1. `recognizeSpeciesGrounded` (aiService.js) — identifica la especie con
 *      el modelo de visión local (Ollama, `ENV.VISION_MODEL`) y la CRUZA
 *      contra el catálogo Chagra vía el sidecar (`validate_visual_match`).
 *      Si el modelo alucina una especie que no existe en catálogo, el
 *      resultado llega marcado `_grounded.status: 'rejected'` — nunca se
 *      presenta como verificado algo que no lo está.
 *   2. `analyzeFoliage` — diagnóstico agroecológico grounded con RAG
 *      (`cycle-content/*.json`): issues + sugerencia de manejo, citando la
 *      fuente del catálogo cuando aplica.
 *
 * Sin coordenadas de lesión reales (el modelo no devuelve bounding boxes),
 * el overlay ya no finge señalar un punto exacto de la hoja: la mira única
 * queda centrada en la foto como "aquí miré", y el detalle real vive en la
 * lista de hallazgos de la derecha — grounded, no inventado.
 *
 * Ruta: #/mockups/diagnostico-foto (sin gate).
 */

const FOTO_ALT = 'Foto que usted subió para el diagnóstico.';

/** Traduce `_grounded.status` de recognizeSpeciesGrounded a una etiqueta corta en usted. */
const ESTADO_GROUNDING = {
  verified: { label: 'Verificado en catálogo Chagra', tono: 'ok' },
  'partial-match': { label: 'Base verificada; variedad sin confirmar', tono: 'medio' },
  rejected: { label: 'No lo encontré en el catálogo — tómelo con pinzas', tono: 'bajo' },
  'sidecar-disabled': { label: 'Validación de catálogo apagada', tono: 'medio' },
  offline: { label: 'Sin conexión: no pude verificar contra el catálogo', tono: 'medio' },
  'no-binomial': { label: 'No logré leer un nombre científico claro', tono: 'bajo' },
  'sidecar-error': { label: 'El catálogo no respondió a tiempo', tono: 'medio' },
};

function Marcador({ tono }) {
  // Sin bounding box real del modelo: una sola mira centrada ("aquí miré"),
  // no seis puntos inventados sobre lesiones que no midió.
  return (
    <g className="dx-marker" data-sev={tono === 'bajo' ? 'temprana' : 'alta'} style={{ '--d': '1.3s' }}>
      <circle className="dx-pulse" cx={450} cy={337} r={110} />
      <circle className="dx-halo" cx={450} cy={337} r={110} />
      <circle className="dx-ring" cx={450} cy={337} r={110} />
    </g>
  );
}

export default function DiagnosticoSobreFoto({ onBack }) {
  // 'pick' → esperando foto. 'scan' → corriendo el pipeline. 'done' → resultado.
  // El error de "no pude leer la foto" se muestra inline en 'pick' — no
  // confundir con "el modelo no identificó nada", que SÍ es un resultado
  // válido y se muestra en 'done'.
  const [phase, setPhase] = useState('pick');
  const [fotoUrl, setFotoUrl] = useState(null);
  const [especie, setEspecie] = useState(null);
  const [diagnostico, setDiagnostico] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const procesarFoto = useCallback(async (file) => {
    setErrorMsg('');
    setPhase('scan');
    try {
      const preCompressed = await compressImage(file);
      if (!preCompressed.ok) {
        setErrorMsg(
          /** @type {any} */ (preCompressed).reason === 'too_large'
            ? IMAGE_TOO_LARGE_MESSAGE
            : 'No se pudo procesar esa foto. Intente con otra.',
        );
        setPhase('pick');
        return;
      }
      const optimized = await optimizeImage(preCompressed.blob);
      const dataUrl = await blobToDataUrl(optimized);
      setFotoUrl(dataUrl);

      // Especie + diagnóstico en paralelo — mismo pipeline grounded que ya
      // usan EvidenceCapture/AgentScreen, no un llamado nuevo inventado.
      const [speciesResult, diagResult] = await Promise.all([
        recognizeSpeciesGrounded(optimized).catch(() => null),
        analyzeFoliage(optimized).catch(() => null),
      ]);
      setEspecie(speciesResult);
      setDiagnostico(diagResult);
      if (reducedMotion) {
        setPhase('done');
      } else {
        // Deja ver un instante el barrido de escaneo aunque el modelo haya
        // respondido rápido (cache hit) — la UI no debe "parpadear" de pick a
        // done sin que el usuario vea que sí miró la foto.
        setTimeout(() => setPhase('done'), 900);
      }
    } catch (err) {
      console.error('[DiagnosticoSobreFoto] error procesando foto:', err);
      setErrorMsg('No pude analizar esa foto. Intente de nuevo.');
      setPhase('pick');
    }
  }, [reducedMotion]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setErrorMsg('Solo se permiten imágenes.');
      return;
    }
    procesarFoto(file);
  };

  const reiniciar = () => {
    setPhase('pick');
    setFotoUrl(null);
    setEspecie(null);
    setDiagnostico(null);
    setErrorMsg('');
  };

  const grounding = especie?._grounded ? ESTADO_GROUNDING[especie._grounded.status] : null;
  const nombreComun = especie?.common_name_es || '';
  const nombreCientifico = especie?.scientific_name || '';
  const tieneEspecie = Boolean(nombreComun || nombreCientifico);
  const issues = Array.isArray(diagnostico?.issues) ? diagnostico.issues : [];
  const tieneHallazgos = issues.length > 0;
  const escaneando = phase === 'scan';

  return (
    <ScreenShell
      title="Diagnóstico sobre la foto"
      icon={ScanEye}
      onBack={onBack}
    >
      <div className="dx-wrap" data-phase={phase}>
        <span className="dx-demo-badge">
          <Sparkles size={13} /> Identificación en vivo · modelo de visión local
        </span>

        {phase === 'pick' && (
          <div className="dx-pick">
            <p className="dx-pick-lead">
              Suba o tome una foto de su mata. La reviso con el mismo modelo
              de visión que usa el resto de Chagra — especie cruzada contra
              el catálogo, diagnóstico con lo que de verdad se ve.
            </p>
            <div className="dx-pick-actions">
              <button type="button" className="dx-pick-btn dx-pick-btn--primary" onClick={() => cameraInputRef.current?.click()}>
                <Camera size={22} /> Tomar foto
              </button>
              <button type="button" className="dx-pick-btn" onClick={() => galleryInputRef.current?.click()}>
                <ImageIcon size={22} /> Subir de galería
              </button>
            </div>
            {errorMsg && (
              <p className="dx-pick-error"><AlertTriangle size={14} /> {errorMsg}</p>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="dx-hidden-input"
              onChange={handleFile}
              aria-label="Tomar foto con cámara"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="dx-hidden-input"
              onChange={handleFile}
              aria-label="Subir foto de galería"
            />
          </div>
        )}

        {phase !== 'pick' && (
          <>
            {/* La "pregunta" del campesino, como mensaje de chat */}
            <div className="dx-ask">
              <span className="dx-ask-photo" aria-hidden>
                <Camera size={16} />
              </span>
              <p>Vea, le mando esta foto de mi cafetal. ¿Qué será que tiene?</p>
            </div>

            <div className="dx-grid">
              <figure className="dx-stage" data-phase={escaneando ? 'scan' : 'done'}>
                {fotoUrl && (
                  <img
                    className="dx-photo"
                    src={fotoUrl}
                    alt={FOTO_ALT}
                    loading="eager"
                    decoding="async"
                  />
                )}

                {!reducedMotion && <div className="dx-scanline" aria-hidden />}

                <svg className="dx-overlay" viewBox="0 0 900 675" preserveAspectRatio="none" aria-hidden>
                  {phase === 'done' && (tieneEspecie || tieneHallazgos) && (
                    <Marcador tono={grounding?.tono || 'medio'} />
                  )}
                </svg>

                <div className="dx-status" role="status">
                  {escaneando
                    ? (<><ScanEye size={15} /> Mirando su foto…</>)
                    : (<><ScanEye size={15} /> Lo que encontré</>)}
                </div>
              </figure>

              <section className="dx-report" aria-label="Diagnóstico">
                <header className="dx-report-head">
                  <span className="dx-avatar" aria-hidden><Leaf size={18} /></span>
                  <div>
                    <p className="dx-kicker">Chagra le responde</p>
                    {escaneando ? (
                      <h2 className="dx-title">Analizando…</h2>
                    ) : tieneEspecie ? (
                      <>
                        <h2 className="dx-title">Parece <strong>{nombreComun || 'su planta'}</strong></h2>
                        {nombreCientifico && <p className="dx-latin">{nombreCientifico}</p>}
                      </>
                    ) : (
                      <h2 className="dx-title">No logré identificar la especie</h2>
                    )}
                  </div>
                </header>

                {!escaneando && grounding && (
                  <p className={`dx-grounding dx-grounding--${grounding.tono}`}>
                    {grounding.tono === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                    <span>{grounding.label}</span>
                  </p>
                )}

                {!escaneando && typeof especie?.confidence === 'number' && (
                  <div className="dx-conf">
                    <div className="dx-conf-top">
                      <span>Qué tan seguro estoy de la especie</span>
                      <strong>{Math.round(especie.confidence * 100)}%</strong>
                    </div>
                    <div className="dx-conf-bar" role="img" aria-label={`Confianza ${Math.round(especie.confidence * 100)} por ciento`}>
                      <span style={{ width: `${Math.round(especie.confidence * 100)}%` }} />
                    </div>
                  </div>
                )}

                {!escaneando && tieneHallazgos && (
                  <ul className="dx-finds">
                    {issues.map((issue, i) => (
                      <li key={`${issue}-${i}`} className="dx-find" data-sev={diagnostico.score < 50 ? 'alta' : 'temprana'}>
                        <span className="dx-find-num">{i + 1}</span>
                        <div>
                          <p className="dx-find-detail">{issue}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {!escaneando && !tieneHallazgos && diagnostico && (
                  <p className="dx-sev">
                    <ShieldAlert size={16} />
                    <span>No vi problemas evidentes en esta foto (estado {diagnostico.score}/100).</span>
                  </p>
                )}

                {!escaneando && !diagnostico && (
                  <p className="dx-sev">
                    <AlertTriangle size={16} />
                    <span>No pude correr el diagnóstico esta vez — puede ser que la foto no muestre una planta, o que el modelo local no esté disponible ahora.</span>
                  </p>
                )}

                {!escaneando && diagnostico?.treatment_suggestion && (
                  <div className="dx-reco">
                    <p className="dx-reco-head">Qué le recomiendo</p>
                    <ul>
                      <li>{diagnostico.treatment_suggestion}</li>
                    </ul>
                  </div>
                )}

                {!escaneando && (
                  <button type="button" className="dx-cta" onClick={reiniciar}>
                    <Camera size={15} /> Probar con otra foto
                  </button>
                )}

                <p className="dx-source">
                  <Info size={13} />
                  <span>
                    Modelo de visión local + catálogo de sanidad de Chagra.
                    Diagnóstico orientativo — confírmelo en campo.
                  </span>
                </p>
              </section>
            </div>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
