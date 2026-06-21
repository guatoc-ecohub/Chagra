import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import {
  ChevronLeft, Camera, Trash2, Upload, X, ArrowLeftRight, BookOpen,
  FlaskConical, Beaker, AlertTriangle, Lightbulb, Leaf, List, Plus,
  MapPin, Calendar, Eye, CheckCircle2, Image, Layers, Droplets, Sprout,
} from 'lucide-react';
import { formatColombiaDate } from '../utils/colombiaDate';

const STORAGE_KEY = 'chagra:cromatografia:v1';
const THUMB_MAX = 300;

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function blobToThumbnailDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(THUMB_MAX / img.width, THUMB_MAX / img.height, 1);
      const cw = Math.round(img.width * scale);
      const ch = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      resolve(canvas.toDataURL('image/jpeg', 0.55));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo procesar la imagen'));
    };
    img.src = url;
  });
}

/** @param {File} file */
async function fileToBase64Thumb(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Solo se aceptan imagenes');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('La imagen es muy grande (max 10 MB)');
  }
  return blobToThumbnailDataUrl(file);
}

/* ──────────────── Contenido educativo: metodo Pfeiffer/Restrepo ──────────── */
const PASOS_METODO = [
  {
    titulo: 'Materiales que necesitas',
    icono: '📋',
    contenido: (
      <ul className="space-y-1.5">
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Papel filtro Whatman No. 1 (cortado en circulos de ~10 cm de diametro)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Nitrato de plata (AgNO₃) al 0.5% (0.5 g en 100 ml de agua destilada)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Hidroxido de sodio (NaOH) al 1% (1 g en 100 ml de agua destilada)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Muestra de suelo seco y cernido (sin piedras ni raices)</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Cajas petri o platos planos, gotero o jeringa sin aguja</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-muzo-glow font-bold shrink-0">-</span>
          <span>Guantes, marcador indeleble, regla, lugar oscuro (caja o armario)</span>
        </li>
      </ul>
    ),
  },
  {
    titulo: 'Impregnar el papel con nitrato de plata',
    icono: '1',
    contenido: (
      <div className="space-y-2">
        <p>
          En un lugar con poca luz (la luz descompone la plata), pon el circulo de
          papel filtro sobre una caja petri limpia. Con el gotero, aplica el nitrato
          de plata al 0.5% sobre el centro del papel: una sola gota basta para que se
          expanda en circulos.
        </p>
        <p>Deja secar el papel en completa oscuridad. Puede tomar unos 15 a 20 minutos.</p>
      </div>
    ),
  },
  {
    titulo: 'Preparar el extracto de suelo',
    icono: '2',
    contenido: (
      <div className="space-y-2">
        <p>
          Mezcla una cucharadita de suelo seco y cernido con 5 ml de hidroxido de
          sodio (NaOH) al <strong>1%</strong> en un frasco pequeno. Agita suavemente
          durante un minuto.
        </p>
        <p>
          Deja reposar la mezcla por 2 a 5 minutos para que las particulas gruesas se
          asienten. El liquido que queda encima es el extracto que usaras.
        </p>
      </div>
    ),
  },
  {
    titulo: 'Correr la cromatografia',
    icono: '3',
    contenido: (
      <div className="space-y-2">
        <p>
          Con el papel ya seco e impregnado, pon una gota del extracto justo en el
          centro. La gota debe ser pequena, no mas de 3 mm de diametro.
        </p>
        <p>
          <strong>Deja el papel en oscuridad total</strong> para que la corrida
          cromatografica avance. El liquido se expandira en circulos concentricos
          arrastrando los componentes del suelo. Esto toma entre 1 y 3 horas segun
          la temperatura y la humedad.
        </p>
      </div>
    ),
  },
  {
    titulo: 'Revelado a la luz',
    icono: '4',
    contenido: (
      <div className="space-y-2">
        <p>
          Pasadas 1-3 horas en oscuridad, saca el papel a la luz natural (no directa
          al sol fuerte). La plata reacciona con la luz y revela los anillos y colores
          de la cromatografia.
        </p>
        <p>
          El revelado completo toma de 10 a 30 minutos. Veras aparecer zonas de
          distintos colores: cafes, blancos, grises y a veces violetas o rosados.
        </p>
      </div>
    ),
  },
  {
    titulo: 'Conservacion y registro',
    icono: '5',
    contenido: (
      <div className="space-y-2">
        <p>
          Una vez revelado, el cromatograma se seguira oscureciendo con el tiempo
          porque la plata sigue reaccionando a la luz. Tomale una foto inmediatamente
          para tu registro.
        </p>
        <p>
          Guarda el papel entre las paginas de un libro o en un sobre oscuro. Anota
          la fecha, la zona de la finca de donde sacaste la muestra y tus
          observaciones.
        </p>
      </div>
    ),
  },
];

const PRECAUCIONES = [
  {
    icono: '⚠️',
    texto:
      'El nitrato de plata (AgNO₃) es toxico leve. Usa guantes al manipularlo y lava tus manos despues.',
  },
  {
    icono: '👕',
    texto:
      'El nitrato de plata mancha la piel y la ropa con manchas oscuras que no salen. Usa ropa vieja o un delantal.',
  },
  {
    icono: '🧴',
    texto:
      'El hidroxido de sodio (NaOH) al 1% es una base diluida. Aun asi, evita el contacto con ojos y piel. Si cae, lava con abundante agua.',
  },
  {
    icono: '🌡️',
    texto:
      'Trabaja en un lugar ventilado. No comas ni bebas durante la preparacion.',
  },
  {
    icono: '🗑️',
    texto:
      'Los restos de la solucion de plata se deben guardar en frasco oscuro para desecho controlado. No los tires a la tierra o al agua.',
  },
  {
    icono: '🧤',
    texto:
      'Desecha los guantes y papeles usados en una bolsa aparte, no en la composta.',
  },
];

/* ───────── Interpetacion por zonas (las 4 clasicas de Pfeiffer/Restrepo) ─── */
const ZONAS = [
  {
    nombre: 'Zona central o mineral',
    posicion: 'Cerca del centro del cromatograma',
    color: 'border-amber-500',
    bg: 'bg-amber-950/30',
    texto: 'border-amber-800/60',
    icono: '🪨',
    queIndica:
      'Muestra los minerales y las sales. Un centro claro o blanco indica buena reserva de minerales disponibles para las plantas. Un centro oscuro o manchado puede indicar exceso de sales o compactacion.',
  },
  {
    nombre: 'Zona media o proteica-humica',
    posicion: 'Anillo entre la zona central y la externa',
    color: 'border-amber-700',
    bg: 'bg-amber-900/20',
    texto: 'border-amber-700/60',
    icono: '🌱',
    queIndica:
      'Representa la materia organica y el humus del suelo. Un anillo marron bien definido y ancho indica buena cantidad de humus estable. Si es muy delgado o ausente, hay poca materia organica o esta muy degradada.',
  },
  {
    nombre: 'Zona externa o enzimatica',
    posicion: 'Anillo exterior antes de los picos del borde',
    color: 'border-violet-700',
    bg: 'bg-violet-950/20',
    texto: 'border-violet-700/60',
    icono: '🧬',
    queIndica:
      'Refleja la actividad de los microorganismos y las enzimas. Un borde bien definido con tonalidades violetas o rosadas indica un suelo biologicamente activo, con buena vida microbiana. Si es difuso o palido, hay poca actividad.',
  },
  {
    nombre: 'Picos y radiaciones del borde',
    posicion: 'Borde externo del cromatograma',
    color: 'border-indigo-500',
    bg: 'bg-indigo-950/20',
    texto: 'border-indigo-700/60',
    icono: '⚡',
    queIndica:
      'Los picos o radiaciones que salen del borde indican vida y energia del suelo. Muchas radiaciones definidas y largas senalan un suelo vivo y equilibrado. Pocas o cortas pueden indicar un suelo cansado o con poca biodiversidad microbiana.',
  },
];

const COLORES = [
  {
    color: 'Marrón oscuro / café',
    significado:
      'Buena materia organica y humus estable. Es el color deseable en la zona media.',
    clase: 'bg-amber-900 border-amber-700',
  },
  {
    color: 'Blanco o crema',
    significado:
      'Sales minerales. En el centro indica minerales disponibles; en anillos externos puede indicar acumulacion de sales.',
    clase: 'bg-stone-200 border-stone-400 text-slate-900',
  },
  {
    color: 'Gris / plomizo',
    significado:
      'Suelo compactado, oxidado o con poca vida. Puede indicar exceso de humedad o anaerobiosis.',
    clase: 'bg-slate-500 border-slate-400',
  },
  {
    color: 'Violeta / lila',
    significado:
      'Actividad enzimatica y microbiologica. Indica un suelo vivo y con buena mineralizacion.',
    clase: 'bg-violet-800 border-violet-600',
  },
  {
    color: 'Rosado',
    significado:
      'Actividad biologica de bacterias beneficiosas. Halos rosados son senal positiva.',
    clase: 'bg-pink-800 border-pink-600',
  },
  {
    color: 'Amarillo / dorado',
    significado:
      'Puede indicar presencia de azufre o compuestos organicos especificos. Interpretar junto con las otras zonas.',
    clase: 'bg-yellow-700 border-yellow-500',
  },
];

/* ─────────────────────────────── Componente ─────────────────────────────── */
export default function CromatografiaScreen({ onBack, onNavigate: _onNavigate }) {
  const [paso, setPaso] = useState('guia');
  const [records, setRecords] = useState(loadRecords);
  const [registro, setRegistro] = useState({ foto: null, fecha: '', zona: '', notas: '' });
  const [error, setError] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const fileRef = useRef(null);
  const [comparar, setComparar] = useState([]);
  const [mostrarZona, setMostrarZona] = useState(null);

  useEffect(() => { saveRecords(records); }, [records]);

  const handleFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcesando(true);
    try {
      const dataUrl = await fileToBase64Thumb(file);
      setRegistro((p) => ({ ...p, foto: dataUrl }));
    } catch (err) {
      setError(err.message || 'Error al procesar la imagen');
    } finally {
      setProcesando(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, []);

  const eliminarFoto = () => setRegistro((p) => ({ ...p, foto: null }));

  const guardarRegistro = useCallback(() => {
    if (!registro.foto) { setError('Toma una foto de la cromatografia'); return; }
    if (!registro.fecha) { setError('Indica la fecha'); return; }
    if (!registro.zona.trim()) { setError('Escribe la zona o lote de la finca'); return; }
    setError(null);
    const nuevo = {
      id: crypto.randomUUID(),
      fecha: registro.fecha,
      zona: registro.zona.trim(),
      notas: registro.notas.trim(),
      foto: registro.foto,
      creado: Date.now(),
    };
    setRecords((prev) => [nuevo, ...prev]);
    setRegistro({ foto: null, fecha: '', zona: '', notas: '' });
    setPaso('comparacion');
  }, [registro]);

  const eliminarRecord = useCallback((id) => {
    if (!window.confirm('Eliminar este registro de cromatografia?')) return;
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setComparar((p) => p.filter((cid) => cid !== id));
  }, []);

  const toggleComparar = useCallback((id) => {
    setComparar((prev) => {
      if (prev.includes(id)) return prev.filter((cid) => cid !== id);
      if (prev.length >= 2) return [prev[0], id];
      return [...prev, id];
    });
  }, []);

  const seleccionados = useMemo(
    () => records.filter((r) => comparar.includes(r.id)),
    [records, comparar],
  );

  const volverPaso = () => {
    if (paso === 'comparacion' || paso === 'registro' || paso === 'interpretacion') {
      setPaso('guia');
    } else {
      onBack?.();
    }
  };

  /* ════════════════════ Header reutilizable ══════════════════════ */
  const Header = (
    <header className="flex items-center gap-2 px-4 pt-[calc(14px+env(safe-area-inset-top))] pb-2">
      <button
        type="button"
        onClick={volverPaso}
        aria-label="Volver"
        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center shrink-0"
      >
        <ChevronLeft size={20} />
      </button>
      <div>
        <h1 className="text-lg font-bold leading-tight text-white">Cromatografia de suelo</h1>
        <p className="text-xs text-slate-400 leading-tight">Metodo Pfeiffer/Restrepo</p>
      </div>
    </header>
  );

  const NavTabs = ({ activo }) => (
    <nav className="flex gap-1 px-4 pb-1 overflow-x-auto scrollbar-hide" aria-label="Secciones de cromatografia">
      {[
        { key: 'guia', label: 'Guia', icon: <BookOpen size={14} /> },
        { key: 'registro', label: 'Registro', icon: <Camera size={14} /> },
        { key: 'interpretacion', label: 'Interpretar', icon: <Eye size={14} /> },
        { key: 'comparacion', label: 'Comparar', icon: <ArrowLeftRight size={14} /> },
      ].map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setPaso(t.key)}
          className={`min-h-[40px] px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors ${
            activo === t.key
              ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/60'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-600'
          }`}
          aria-current={activo === t.key ? 'page' : undefined}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );

  /* ════════════════ Paso 1: Guia del metodo ═════════════════════ */
  if (paso === 'guia') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        {NavTabs({ activo: 'guia' })}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <div className="bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 flex gap-3">
            <div className="text-2xl shrink-0" aria-hidden="true">
              <FlaskConical size={24} className="text-emerald-300" />
            </div>
            <div className="text-sm text-emerald-200">
              <p className="font-bold">Que es la cromatografia de suelo?</p>
              <p className="text-emerald-300/80 mt-1">
                Es un metodo cualitativo creado por Ehrenfried Pfeiffer para ver
                la salud del suelo. La mezcla de suelo reacciona con nitrato de
                plata sobre papel filtro y revela con colores y anillos la vida,
                los minerales y la materia organica de tu tierra. No da numeros
                de laboratorio, pero te ayuda a entender y comparar tus suelos
                en el tiempo.
              </p>
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mt-1">
            Pasos del metodo
          </h2>

          {PASOS_METODO.map((p) => (
            <div
              key={p.titulo}
              className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
            >
              <div className="flex items-start gap-3 p-3">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'rgb(var(--t-accent-rgb) / 0.25)' }}
                >
                  {p.icono}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200">{p.titulo}</h3>
                  <div className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                    {p.contenido}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b border-amber-800/30">
              <AlertTriangle size={18} className="text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold text-amber-300">Precauciones importantes</h3>
            </div>
            <div className="p-3 flex flex-col gap-3">
              {PRECAUCIONES.map((p, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-amber-100">
                  <span className="shrink-0 mt-0.5" aria-hidden="true">{p.icono}</span>
                  <span>{p.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════ Paso 2: Registro de cromatografia ═════════════════════ */
  if (paso === 'registro') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        {NavTabs({ activo: 'registro' })}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <p className="text-sm text-slate-300">
            Registra tus cromatografias con foto, fecha y la zona de la finca
            de donde sacaste la muestra. Asi puedes comparar como mejora tu suelo
            con el tiempo.
          </p>

          {/* Foto */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Foto del cromatograma <span className="text-red-400">*</span>
            </span>
            {registro.foto ? (
              <div className="relative rounded-xl overflow-hidden border-2 border-emerald-700/60 bg-slate-900">
                <img
                  src={registro.foto}
                  alt="Cromatograma"
                  className="w-full h-56 object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-3">
                  <button
                    type="button"
                    onClick={eliminarFoto}
                    className="bg-red-900/40 hover:bg-red-900/60 text-red-200 p-2.5 rounded-xl border border-red-800/50 active:scale-95 transition-transform"
                    aria-label="Eliminar foto"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
                <div className="absolute top-3 right-3 bg-emerald-500 text-slate-950 p-1 rounded-full">
                  <CheckCircle2 size={18} />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={procesando}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-emerald-900/30 hover:bg-emerald-800/40 active:bg-emerald-800/60 border-2 border-dashed border-emerald-700/60 transition-all min-h-[180px] text-emerald-200"
              >
                {procesando ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-4 border-emerald-500/30 border-t-emerald-400 animate-spin" />
                    <span className="text-base font-bold">Procesando...</span>
                  </>
                ) : (
                  <>
                    <Upload size={44} className="text-emerald-300" />
                    <span className="text-base font-bold leading-tight text-center">
                      Subir foto de la cromatografia
                    </span>
                    <span className="text-xs text-emerald-400/80">JPEG o PNG, se guarda como miniatura</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFile}
              className="hidden"
              aria-label="Subir foto del cromatograma"
            />
          </div>

          {/* Fecha */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Fecha <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={registro.fecha}
                onChange={(e) => setRegistro((p) => ({ ...p, fecha: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Zona */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Zona o lote de la finca <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-slate-500 pointer-events-none shrink-0" />
              <input
                type="text"
                value={registro.zona}
                onChange={(e) => setRegistro((p) => ({ ...p, zona: e.target.value }))}
                placeholder="Ej: Lote del nogal, Surco 4, Zona baja..."
                maxLength={100}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              Notas u observaciones
            </label>
            <textarea
              value={registro.notas}
              onChange={(e) => setRegistro((p) => ({ ...p, notas: e.target.value }))}
              placeholder="Que ves en esta cromatografia? Como esta el suelo?"
              rows={3}
              maxLength={300}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800/50 rounded-xl text-red-400 text-sm">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={guardarRegistro}
            className="min-h-[52px] rounded-xl font-bold text-sm bg-emerald-900/60 hover:bg-emerald-800/60 border border-emerald-700/60 text-emerald-100 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <CheckCircle2 size={18} />
            Guardar cromatografia
          </button>
        </div>
      </div>
    );
  }

  /* ════════════════ Paso 3: Interpretacion por zonas ═════════════════════ */
  if (paso === 'interpretacion') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        {NavTabs({ activo: 'interpretacion' })}
        <div className="px-4 pb-10 flex flex-col gap-4">
          <div className="bg-sky-950/30 border border-sky-800/50 rounded-xl p-4 flex gap-3">
            <Lightbulb size={20} className="text-sky-400 shrink-0 mt-0.5" />
            <div className="text-sm text-sky-200">
              <p className="font-bold">Lectura cualitativa, no numerica</p>
              <p className="text-sky-300/80 mt-1">
                La cromatografia de Pfeiffer no da numeros. Es una herramienta
                visual para que compares tus suelos y veas tendencias. Lo
                importante es repetir el metodo igual cada vez (misma cantidad de
                suelo, misma concentracion) y comparar los cambios.
              </p>
            </div>
          </div>

          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mt-1">
            Las 4 zonas del cromatograma
          </h2>
          <p className="text-xs text-slate-400 -mt-2">
            Cada zona va desde el centro hacia afuera. Toca cada zona para leer
            la explicacion completa.
          </p>

          {/* Diagrama de zonas */}
          <div className="flex justify-center py-3">
            <div className="relative w-56 h-56">
              {/* Zona central */}
              <div
                className="absolute inset-[35%] rounded-full bg-amber-950/50 border-2 border-amber-700/60 flex items-center justify-center cursor-pointer hover:bg-amber-900/40 transition-colors"
                onClick={() => setMostrarZona(mostrarZona === 0 ? null : 0)}
                aria-label="Zona central o mineral"
              >
                <span className="text-xs font-bold text-amber-300 text-center leading-tight px-1">
                  Zona mineral
                </span>
              </div>
              {/* Zona media */}
              <div
                className="absolute inset-[18%] rounded-full border-2 border-dashed border-amber-600/50 flex items-center justify-center cursor-pointer hover:bg-amber-900/10 transition-colors"
                onClick={() => setMostrarZona(mostrarZona === 1 ? null : 1)}
                aria-label="Zona media proteica-humica"
              >
                <span className="text-[10px] text-amber-400/70 mt-[-50px]">Zona humica</span>
              </div>
              {/* Zona externa */}
              <div
                className="absolute inset-[5%] rounded-full border-2 border-violet-600/60 flex items-center justify-center cursor-pointer hover:bg-violet-900/10 transition-colors"
                onClick={() => setMostrarZona(mostrarZona === 2 ? null : 2)}
                aria-label="Zona externa enzimatica"
              >
                <span className="text-[10px] text-violet-400/70 mt-[-85px]">Zona enzimatica</span>
              </div>
              {/* Picos del borde */}
              <div
                className="absolute inset-0 rounded-full border-2 border-indigo-500/70 flex items-center justify-center cursor-pointer hover:bg-indigo-900/10 transition-colors"
                onClick={() => setMostrarZona(mostrarZona === 3 ? null : 3)}
                aria-label="Picos y radiaciones del borde"
              >
                <span className="text-[10px] text-indigo-300/70 mt-[105px]">Picos y radiaciones</span>
              </div>
            </div>
          </div>

          {mostrarZona !== null && (
            <div className={`${ZONAS[mostrarZona].bg} border ${ZONAS[mostrarZona].texto} rounded-xl p-4 flex gap-3 animate-in fade-in slide-in-from-bottom-2`}>
              <span className="text-2xl shrink-0" aria-hidden="true">{ZONAS[mostrarZona].icono}</span>
              <div className="text-sm">
                <p className="font-bold mb-1">{ZONAS[mostrarZona].nombre}</p>
                <p className="text-xs opacity-80 mb-2">{ZONAS[mostrarZona].posicion}</p>
                <p>{ZONAS[mostrarZona].queIndica}</p>
              </div>
            </div>
          )}

          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mt-2">
            Colores y su significado
          </h2>

          <div className="grid grid-cols-1 gap-2">
            {COLORES.map((c) => (
              <div
                key={c.color}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-full shrink-0 border-2 ${c.clase}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-bold text-slate-200">{c.color}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{c.significado}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start gap-2">
            <Sprout size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <p>
              La interpretacion es subjetiva y depende de las condiciones del
              ensayo. Lo mas util es comparar cromatografias de la misma zona
              a lo largo del tiempo, cuando el suelo mejora por practicas de
              regeneracion, abonos verdes o biopreparados, deberias ver mas
              vida y color en los anillos.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════ Paso 4: Comparacion en el tiempo ═════════════════════ */
  if (paso === 'comparacion') {
    return (
      <div className="min-h-[100dvh] text-white">
        {Header}
        {NavTabs({ activo: 'comparacion' })}
        <div className="px-4 pb-10 flex flex-col gap-4">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <Layers size={56} className="text-slate-600" />
              <p className="text-sm text-slate-400 max-w-xs">
                No tienes cromatografias registradas. Cuando guardes al menos
                una, podras compararlas entre si para ver como mejora tu suelo.
              </p>
              <button
                type="button"
                onClick={() => setPaso('registro')}
                className="min-h-[48px] px-6 rounded-xl font-bold text-sm bg-emerald-900/60 hover:bg-emerald-800/60 border border-emerald-700/60 text-emerald-100 flex items-center gap-2"
              >
                <Plus size={16} />
                Registrar primera cromatografia
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-300">
                Toca <strong>hasta 2</strong> cromatografias para compararlas
                lado a lado. Con el tiempo veras si el suelo mejora en color, vida
                y estructura de los anillos.
              </p>

              {/* Comparacion visual */}
              {comparar.length === 2 && (
                <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-3 grid grid-cols-2 gap-3">
                  {seleccionados.map((r, i) => (
                    <div key={r.id} className="flex flex-col gap-1.5">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wide text-center">
                        {i === 0 ? 'Mas antigua' : 'Mas reciente'}
                      </div>
                      <div className="aspect-square rounded-lg overflow-hidden border border-slate-700">
                        <img
                          src={r.foto}
                          alt={`Cromatograma ${r.zona}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-300 text-center">
                        {r.zona}
                      </p>
                      <p className="text-[10px] text-slate-500 text-center">
                        {formatColombiaDate(r.fecha, 'day-month')}
                      </p>
                      {r.notas && (
                        <p className="text-[10px] text-slate-500 text-center line-clamp-2">
                          "{r.notas}"
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="col-span-2 mt-1">
                    <p className="text-xs text-emerald-300/80 text-center italic">
                      Compara los colores, anillos y radiaciones. Un suelo que mejora
                      muestra mas vida (violetas y rosados), humus mas definido (marrones)
                      y bordes mas nitidos.
                    </p>
                  </div>
                </div>
              )}

              {comparar.length === 1 && (
                <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-sm text-amber-200 text-center">
                  Toca otra cromatografia para compararlas
                </div>
              )}

              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                Tus registros ({records.length})
              </h2>

              <div className="flex flex-col gap-2">
                {records.map((r) => {
                  const sel = comparar.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`bg-slate-900 border rounded-xl overflow-hidden transition-colors ${
                        sel ? 'border-emerald-600/60 ring-1 ring-emerald-600/40' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex gap-3 p-3">
                        <button
                          type="button"
                          onClick={() => toggleComparar(r.id)}
                          className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-700 relative group"
                          aria-label={sel ? 'Quitar de comparacion' : 'Agregar a comparacion'}
                        >
                          <img
                            src={r.foto}
                            alt={`Miniatura ${r.zona}`}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className={`absolute inset-0 flex items-center justify-center transition-colors ${
                              sel
                                ? 'bg-emerald-900/60'
                                : 'bg-slate-950/0 group-hover:bg-slate-950/40'
                            }`}
                          >
                            {sel && <CheckCircle2 size={20} className="text-emerald-300" />}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-200 truncate">{r.zona}</p>
                          <p className="text-xs text-slate-400">
                            {formatColombiaDate(r.fecha, 'human')}
                          </p>
                          {r.notas && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{r.notas}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => eliminarRecord(r.id)}
                          className="shrink-0 w-9 h-9 rounded-lg bg-red-900/20 hover:bg-red-900/40 text-red-400 flex items-center justify-center transition-colors"
                          aria-label="Eliminar registro"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setPaso('registro')}
                className="min-h-[48px] rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Nueva cromatografia
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
