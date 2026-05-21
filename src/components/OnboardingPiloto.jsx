import React, { useState, useMemo } from 'react';
import { Sprout, Copy, MessageCircle, Mail, Check, AlertCircle, ChevronRight, Lock } from 'lucide-react';

/**
 * OnboardingPiloto — formulario para pilotos validadores de Chagra.
 *
 * SEGURIDAD por DISEÑO:
 *   - Gate de password compartido (el operador manda invitación con la pass
 *     por canal de confianza). Sin password → el form no se renderea.
 *   - El password vive en el bundle JS. NO es secreto criptográfico,
 *     es disuasión vs randoms del internet. Si el password se filtra,
 *     el operador lo rota cambiando la constante PASSWORD_PILOTO abajo.
 *   - Aceptación explícita de condiciones (Habeas Data Ley 1581) antes
 *     de habilitar el envío.
 *   - Form NO postea a ningún backend. Output: YAML que el pilot copia
 *     y manda al operador por WhatsApp/email. El operador hace el merge manual.
 *   - Filosofía `no inventes datos`: campos sin proveer salen como `null`
 *     o `TODO_*` para que el operador los complete con criterio agronómico.
 *
 * Cómo rotar la pass:
 *   1. Cambiar PASSWORD_PILOTO abajo a otro valor.
 *   2. npm run build && deploy a chagra.guatoc.co.
 *   3. Avisar por WhatsApp/email a los pilotos pending con el nuevo valor.
 */

const PASSWORD_PILOTO = 'guatoc-piloto-2026';   // Miguel: rota cuando quieras
const MIGUEL_EMAIL = 'contacto@guatoc.co';

const VOCACIONES = [
  { value: 'frutales',    label: 'Frutales (cítricos, mora, fresa, gulupa)' },
  { value: 'horticola',   label: 'Hortícola (tomate, lechuga, brassicas, leguminosas)' },
  { value: 'invernadero', label: 'Invernadero hortícola' },
  { value: 'bosque',      label: 'Bosque / restauración / agroforestal' },
  { value: 'paramo',      label: 'Páramo / alto andino / conservación' },
  { value: 'mixto',       label: 'Mixto (más de una vocación)' },
  { value: 'otro',        label: 'Otro (especifica en notas)' },
];

const slugFromNombre = (s) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);

const operadorIdFrom = (slug, email) => {
  const u = (email.split('@')[0] || 'op').toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${u}_${slug}`.slice(0, 50);
};

// ─────────────────────────────────────────────────────────────────────────────
// Gate de password
// ─────────────────────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === PASSWORD_PILOTO) {
      onUnlock();
    } else {
      setError(true);
      setPass('');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
            <Sprout size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Piloto Chagra</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Este formulario es solo para pilotos invitados al programa Chagra.
          Si recibiste una invitación de Miguel, ingresa la contraseña que
          venía en el mensaje.
        </p>


        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="pass" className="block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide">
              Contraseña de invitación
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="pass"
                type="password"
                value={pass}
                onChange={(e) => { setPass(e.target.value); setError(false); }}
                placeholder="••••••••••"
                autoComplete="off"
                autoFocus
                className={`w-full pl-10 pr-3 py-2.5 rounded-lg bg-slate-800 border ${
                  error ? 'border-red-700' : 'border-slate-700'
                } text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60`}
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> Contraseña incorrecta. Verifica el mensaje de invitación.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!pass}
            className="w-full px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Continuar
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-6 leading-relaxed">
          ¿No tienes invitación todavía? Escríbele a Miguel a{' '}
          <a href={`mailto:${MIGUEL_EMAIL}`} className="text-emerald-500 hover:text-emerald-400 underline">
            {MIGUEL_EMAIL}
          </a>
          {' '}contando un poco de tu proyecto.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form principal (post-password)
// ─────────────────────────────────────────────────────────────────────────────
function FormPiloto() {
  const [data, setData] = useState({
    nombre_finca: '',
    operador_nombre: '',
    operador_email: '',
    maps_url: '',
    altitud_msnm: '',
    area_m2: '',
    vocacion: '',
    notas: '',
  });
  const [aceptaCondiciones, setAceptaCondiciones] = useState(false);
  const [aceptaCompromiso, setAceptaCompromiso] = useState(false);
  const [copied, setCopied] = useState(false);

  const setField = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const errors = useMemo(() => {
    const e = {};
    if (!data.nombre_finca.trim()) e.nombre_finca = 'Requerido';
    if (!data.operador_nombre.trim()) e.operador_nombre = 'Requerido';
    if (!data.operador_email.trim()) e.operador_email = 'Requerido';
    else if (!/^\S+@\S+\.\S+$/.test(data.operador_email)) e.operador_email = 'Email inválido';
    if (!data.maps_url.trim()) e.maps_url = 'Requerido';
    else if (!/(maps|goo\.gl|google\.com)/i.test(data.maps_url)) e.maps_url = 'Pegá un link de Google Maps';
    if (!data.vocacion) e.vocacion = 'Selecciona vocación';
    // Bug 069.10 — rangos para campos numéricos opcionales (si están presentes)
    if (data.altitud_msnm !== '') {
      const alt = Number(data.altitud_msnm);
      if (!Number.isFinite(alt)) e.altitud_msnm = 'Número inválido';
      else if (alt < 0 || alt > 5500) e.altitud_msnm = 'Rango 0–5500 msnm';
    }
    if (data.area_m2 !== '') {
      const area = Number(data.area_m2);
      if (!Number.isFinite(area)) e.area_m2 = 'Número inválido';
      else if (area <= 0) e.area_m2 = 'Debe ser mayor que cero';
      else if (area > 100_000_000) e.area_m2 = 'Máximo 100.000.000 m² (10.000 ha)';
    }
    return e;
  }, [data]);

  const camposCompletos = Object.keys(errors).length === 0;
  const isReadyToSend = camposCompletos && aceptaCondiciones && aceptaCompromiso;

  const yamlOutput = useMemo(() => {
    if (!camposCompletos) return '';
    const slug = slugFromNombre(data.nombre_finca);
    const operador_id = operadorIdFrom(slug, data.operador_email);
    const today = new Date().toISOString().slice(0, 10);

    return `  - slug: ${slug}
    nombre: ${data.nombre_finca}
    operador_id: ${operador_id}
    operador_nombre: "${data.operador_nombre}"
    operador_email: "${data.operador_email}"
    maps_url: "${data.maps_url}"
    coords: [TODO_lat, TODO_lon]  # Miguel: extraer del maps_url
    altitud_msnm: ${data.altitud_msnm ? Number(data.altitud_msnm) : 'null  # TODO operador o GPS'}
    biocultural_zone: "TODO_zona"  # Miguel: andino_alto_páramo | andino_alto | andino_medio | andino_medio_invernadero | valle_caucano
    area_m2: ${data.area_m2 ? Number(data.area_m2) : 'null'}
    vocacion: ${data.vocacion}
    estado: "piloto"
    visibility: "unlisted"
    farmos_endpoint: null
    descripcion_corta: "${(data.notas || `Finca piloto fase 1. Vocación: ${data.vocacion}.`).replace(/"/g, "'")}"
    creada: "${today}"
    consent_ley1581: { aceptado: true, fecha: "${today}" }
    compromiso_piloto: { aceptado: true, duracion_meses: 6, feedback: "semanal", fecha: "${today}" }
`;
  }, [data, camposCompletos]);

  const messageBody = useMemo(() => {
    if (!camposCompletos) return '';
    return `Hola Miguel, te paso mis datos para el piloto Chagra:

${yamlOutput}
Link de Maps del centro del predio: ${data.maps_url}
${data.notas ? `\nNotas: ${data.notas}\n` : ''}
Saludos,
${data.operador_nombre}`;
  }, [data, yamlOutput, camposCompletos]);

  const whatsappUrl = useMemo(() => {
    if (!isReadyToSend) return '#';
    return `https://wa.me/?text=${encodeURIComponent(messageBody)}`;
  }, [messageBody, isReadyToSend]);

  const mailtoUrl = useMemo(() => {
    if (!isReadyToSend) return '#';
    const subject = encodeURIComponent(`[Chagra piloto] ${data.nombre_finca} — ${data.operador_nombre}`);
    const body = encodeURIComponent(messageBody);
    return `mailto:${MIGUEL_EMAIL}?subject=${subject}&body=${body}`;
  }, [data, messageBody, isReadyToSend]);

  const handleCopy = async () => {
    if (!isReadyToSend) return;
    try {
      await navigator.clipboard.writeText(messageBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('[OnboardingPiloto] Clipboard:', e);
      window.prompt('Copia este texto manualmente:', messageBody);
    }
  };

  const inputClass = (hasError) =>
    `w-full px-3 py-2.5 rounded-lg bg-slate-800 border ${
      hasError ? 'border-red-700' : 'border-slate-700'
    } text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60`;

  const labelClass = 'block text-xs font-medium text-slate-300 mb-1.5 uppercase tracking-wide';

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-emerald-900/40 border border-emerald-700/50">
            <Sprout size={24} className="text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Onboarding piloto Chagra</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          Llena los datos de tu finca y te creamos tu acceso al sistema. Esta
          página no envía nada automático — al final copias un mensaje y se lo
          pasas a Miguel por WhatsApp o email. Él lo procesa manualmente y te
          contacta con tus credenciales.
        </p>

        <form className="space-y-4">
          <div>
            <label htmlFor="nombre_finca" className={labelClass}>Nombre de la finca *</label>
            <input
              id="nombre_finca"
              type="text"
              value={data.nombre_finca}
              onChange={(e) => setField('nombre_finca', e.target.value)}
              placeholder="Ej: El Roble, La Cabaña, Mi Chagra"
              className={inputClass(!!errors.nombre_finca)}
            />
            {errors.nombre_finca && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.nombre_finca}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="operador_nombre" className={labelClass}>Tu nombre completo *</label>
              <input
                id="operador_nombre"
                type="text"
                value={data.operador_nombre}
                onChange={(e) => setField('operador_nombre', e.target.value)}
                placeholder="Juan Pérez"
                className={inputClass(!!errors.operador_nombre)}
              />
              {errors.operador_nombre && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.operador_nombre}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="operador_email" className={labelClass}>Email *</label>
              <input
                id="operador_email"
                type="email"
                value={data.operador_email}
                onChange={(e) => setField('operador_email', e.target.value)}
                placeholder="tu@dominio.com"
                className={inputClass(!!errors.operador_email)}
              />
              {errors.operador_email && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.operador_email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="maps_url" className={labelClass}>Link de Google Maps del centro del predio *</label>
            <input
              id="maps_url"
              type="url"
              value={data.maps_url}
              onChange={(e) => setField('maps_url', e.target.value)}
              placeholder="https://maps.app.goo.gl/..."
              className={inputClass(!!errors.maps_url)}
            />
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Abre Maps parado en el centro del predio → "Compartir" → "Copiar enlace".
              Si no lo sabes con precisión, pásame la dirección o nombre de la vereda.
            </p>
            {errors.maps_url && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.maps_url}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="altitud_msnm" className={labelClass}>Altitud aproximada (msnm)</label>
              <input
                id="altitud_msnm"
                type="number"
                min="0"
                max="5500"
                value={data.altitud_msnm}
                onChange={(e) => setField('altitud_msnm', e.target.value)}
                placeholder="1730"
                aria-invalid={!!errors.altitud_msnm}
                className={inputClass(!!errors.altitud_msnm)}
              />
              {errors.altitud_msnm ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.altitud_msnm}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Si no la sabes, déjalo vacío — la calculamos desde el link de Maps.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="area_m2" className={labelClass}>Tamaño del predio (m²)</label>
              <input
                id="area_m2"
                type="number"
                min="1"
                value={data.area_m2}
                onChange={(e) => setField('area_m2', e.target.value)}
                placeholder="3500"
                aria-invalid={!!errors.area_m2}
                className={inputClass(!!errors.area_m2)}
              />
              {errors.area_m2 ? (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.area_m2}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">
                  Escritura o levantamiento. Vacío si no lo sabes.
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="vocacion" className={labelClass}>Vocación principal de la finca *</label>
            <select
              id="vocacion"
              value={data.vocacion}
              onChange={(e) => setField('vocacion', e.target.value)}
              className={inputClass(!!errors.vocacion)}
            >
              <option value="">— elige una opción —</option>
              {VOCACIONES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
            {errors.vocacion && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errors.vocacion}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="notas" className={labelClass}>Notas adicionales (opcional)</label>
            <textarea
              id="notas"
              rows={3}
              value={data.notas}
              onChange={(e) => setField('notas', e.target.value)}
              placeholder="Detalles del predio, infraestructura existente, planes de mediano plazo."
              className={inputClass(false)}
            />
          </div>
        </form>

        {/* Condiciones */}
        <div className="mt-6 rounded-xl bg-slate-900 border border-slate-800 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Tratamiento de datos personales
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Al enviar este mensaje aceptas que tus datos (nombre, email, ubicación,
            datos de la finca) sean usados por Guatoc/Chagra para crear tu acceso
            al piloto y contactarte por temas relacionados al proyecto. Marco
            normativo: Ley 1581/2012 (Habeas Data Colombia) — los datos los manejas
            tú como titular, puedes solicitar su rectificación, oposición o
            supresión escribiendo a {' '}
            <a href={`mailto:${MIGUEL_EMAIL}`} className="text-emerald-500 hover:text-emerald-400 underline">
              {MIGUEL_EMAIL}
            </a>.
            No compartimos ni vendemos datos a terceros.
          </p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aceptaCondiciones}
              onChange={(e) => setAceptaCondiciones(e.target.checked)}
              className="mt-1 accent-emerald-500"
            />
            <span className="text-sm text-slate-300">
              Acepto el tratamiento de mis datos según las condiciones anteriores.
            </span>
          </label>
        </div>

        {/* Compromiso piloto 6+ meses (gate ADR-036 sub-xii) */}
        <div className="mt-4 rounded-xl bg-slate-900 border border-amber-900/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
            Compromiso piloto fase 1
          </p>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Chagra está en construcción activa. Los pilotos son quienes nos
            ayudan a probar y mejorar la herramienta. Para que tu participación
            tenga impacto real necesitamos:
          </p>
          <ul className="text-xs text-slate-300 leading-relaxed mb-3 space-y-1 ml-4 list-disc">
            <li>
              <span className="font-semibold text-amber-300">6 meses mínimo</span>{' '}
              de operación activa registrando siembras, cosechas, observaciones.
            </li>
            <li>
              <span className="font-semibold text-amber-300">Feedback semanal</span>{' '}
              corto (5-10 min, WhatsApp o email) sobre qué funcionó y qué falló.
            </li>
            <li>
              Permitirnos usar tu experiencia (anonimizada) como caso de
              referencia ante apoyos institucionales — esto destraba la fase
              multi-finca completa para todos.
            </li>
            <li>
              Salida sin penalidad en cualquier momento. Tus datos son tuyos
              (regla soberanía agroecológica, ADR-007).
            </li>
          </ul>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aceptaCompromiso}
              onChange={(e) => setAceptaCompromiso(e.target.checked)}
              className="mt-1 accent-amber-500"
            />
            <span className="text-sm text-slate-300">
              Me comprometo a operar mi finca como piloto Chagra durante mínimo
              6 meses, con feedback semanal a Miguel.
            </span>
          </label>
        </div>

        {/* Preview + acciones */}
        {isReadyToSend ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-900 border border-emerald-800/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
                Mensaje generado (revisalo antes de enviar)
              </p>
              <pre className="text-xs text-slate-300 bg-slate-950 rounded-lg p-3 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
{messageBody}
              </pre>
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                <span className="font-medium">{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 transition-colors"
              >
                <MessageCircle size={18} />
                <span className="font-medium">WhatsApp</span>
              </a>

              <a
                href={mailtoUrl}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-700 hover:bg-violet-600 transition-colors"
              >
                <Mail size={18} />
                <span className="font-medium">Email</span>
              </a>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Cuando Miguel reciba tu mensaje, te va a contactar al email que pusiste
              con tus credenciales de acceso. Suele tomar entre 24 y 48 horas.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl bg-slate-900/60 border border-slate-800 p-4 flex items-center gap-2 text-sm text-slate-400">
            <ChevronRight size={18} className="text-slate-500" />
            {camposCompletos
              ? 'Marca las dos casillas (datos personales + compromiso piloto) para enviar.'
              : 'Completa los campos marcados con * para continuar.'}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-slate-800 text-xs text-slate-500 leading-relaxed">
          <p>
            Tus datos NO se guardan en este sitio — esta página solo genera un
            mensaje que tú envías manualmente. Sin servidor, sin base de datos.
          </p>
          <p className="mt-2">
            <a href="#dashboard" className="text-emerald-500 hover:text-emerald-400 underline">
              ← Volver a Chagra
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Default export: gate de password + form
// ─────────────────────────────────────────────────────────────────────────────
export default function OnboardingPiloto() {
  const [unlocked, setUnlocked] = useState(false);
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }
  return <FormPiloto />;
}
