import React, { useMemo, useState } from 'react';
import {
  Recycle, Wind, Flame, Sprout, Droplets, Layers, Calculator, Info,
  ChevronRight, AlertTriangle, CheckCircle2, Container, ShieldCheck,
  ArrowRight, Sun, Minus, Plus, FlaskConical,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import {
  BiodigestorIlustracion, CicloCorralAbono, AbonoGlifo,
} from './estiercol/EstiercolIlustraciones';
import {
  estimarBiodigestor, ANIMALES_BIODIGESTOR, PISOS_TERMICOS_BIODIGESTOR,
  TRH_DIAS_POR_PISO,
} from '../services/biodigestorCalculator';
import './estiercol/estiercol.css';

/** Días de retención en páramo (grounding CIPAV/LRRD), para el copy honesto. */
const TRH_PARAMO_DIAS = TRH_DIAS_POR_PISO.paramo.dias;

/**
 * EstiercolScreen — "Del corral al abono".
 *
 * Mini-app de aprovechamiento del estiércol para el campesino colombiano.
 * Lenguaje "cuaderno de campo / Ciclo Vivo": nada sobra en la finca; el
 * estiércol se vuelve abono, gas y suelo vivo. Tres pilares:
 *
 *   1. Olores      — resuelve el caso real "la gallinaza huele y los vecinos
 *                    se quejan": causas + soluciones (secar, cubrir, airear,
 *                    biofiltro, compostar).
 *   2. Biodigestor — bases + beneficios + calculadora de dimensionamiento
 *                    (caso insignia: 300 cerdos). Fórmula determinista en
 *                    services/biodigestorCalculator.js.
 *   3. Abonos      — gallinaza, porquinaza, bovinaza, biol, biosol, compost,
 *                    lombricompost: cómo se hacen + dónde va la dosis.
 *
 * ⚠️  GROUNDING: NINGUNA cifra dura de dosis/rendimiento está inventada como
 * dato citado. Las dosis exactas y los rendimientos van en slots marcados
 * <GroundedSlot> ("pendiente de la investigación"); la calculadora usa
 * coeficientes de referencia rotulados "estimado" (ver biodigestorCalculator.js,
 * tag GROUNDED-PENDIENTE). Las 2 investigaciones (nacional + internacional)
 * reemplazan esos slots después.
 */

const PILARES = [
  { id: 'inicio', label: 'Inicio', Icon: Recycle },
  { id: 'olores', label: 'Olores', Icon: Wind },
  { id: 'biodigestor', label: 'Biodigestor', Icon: Flame },
  { id: 'abonos', label: 'Abonos', Icon: Sprout },
];

/* ── Piezas de UI reutilizables ─────────────────────────────────────────── */

/** Card de sección con encabezado a color (patrón de las pantallas de Chagra). */
function SeccionCard({ Icon, tono, titulo, children, className = '' }) {
  return (
    <section className={`rounded-2xl border ${tono.border} ${tono.bg} p-4 ${className}`}>
      {titulo && (
        <h2 className={`flex items-center gap-2 text-base font-black ${tono.text}`}>
          {Icon && <Icon size={18} aria-hidden="true" />}
          {titulo}
        </h2>
      )}
      <div className="mt-2 text-sm text-slate-200/90 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

/** Paso numerado (tipo receta del cuaderno). */
function Paso({ n, titulo, children, tono }) {
  return (
    <div className="flex gap-3">
      <span className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-sm font-black ${tono.chip}`}>
        {n}
      </span>
      <div className="min-w-0">
        <p className="font-bold text-slate-100 leading-tight">{titulo}</p>
        {children && <p className="text-sm text-slate-300/90 leading-snug mt-0.5">{children}</p>}
      </div>
    </div>
  );
}

/**
 * Slot de dato GROUNDED-PENDIENTE. Marca en la UI —con honestidad— dónde va una
 * cifra citada (dosis exacta, rendimiento) que aún NO está groundeada. NO se
 * inventa un número: se anuncia el hueco. La investigación lo llena luego.
 */
function GroundedSlot({ children = 'Dosis exacta y frecuencia' }) {
  return (
    <p
      data-testid="grounded-slot"
      className="mt-2 flex items-start gap-2 rounded-lg border border-dashed border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200/90"
    >
      <Info size={14} className="mt-0.5 shrink-0 text-amber-300" aria-hidden="true" />
      <span>
        <span className="font-bold">{children}:</span>{' '}
        pendiente de la investigación agronómica. No damos un número al azar.
      </span>
    </p>
  );
}

/* ── PILAR 1 · OLORES ───────────────────────────────────────────────────── */

const OLOR_CAUSAS = [
  { Icon: Droplets, t: 'Está fresca y húmeda', d: 'El nitrógeno se escapa como amoníaco: ese olor picante que se siente de lejos.' },
  { Icon: Wind, t: 'Amontonada sin aire', d: 'Sin oxígeno se pudre (fermentación anaerobia) y suelta gases de mal olor.' },
  { Icon: Layers, t: 'Sin material seco encima', d: 'Nada absorbe la humedad ni tapa el olor; la pila queda destapada.' },
  { Icon: Sun, t: 'Mojada por lluvia o lavados', d: 'El agua la escurre y la hace fermentar mal; los lixiviados apestan.' },
];

const OLOR_SOLUCIONES = [
  { t: 'Secar', d: 'Tiéndala en capa delgada bajo techo. La gallinaza seca casi no huele y pesa menos para mover.' },
  { t: 'Cubrir con material seco', d: 'Cascarilla de arroz, aserrín, hoja seca o tamo encima. Tapa el olor y equilibra la mezcla (carbono).' },
  { t: 'Airear y voltear', d: 'Déle vuelta cada pocos días. Con oxígeno la pila trabaja sin pudrirse ni apestar.' },
  { t: 'Compostar bien', d: 'Mezcle 2 a 3 partes de material seco por 1 de estiércol. Un compost bien hecho huele a tierra de monte, no a amoníaco.' },
  { t: 'Biofiltro en el galpón', d: 'Una cama de viruta, carbón y compost por donde pase el aire del corral atrapa el olor antes de que llegue al vecino.' },
];

function PilarOlores() {
  const tono = { border: 'border-teal-600/40', bg: 'bg-teal-900/20', text: 'text-teal-200', chip: 'bg-teal-500/20 text-teal-100 border border-teal-400/40' };
  return (
    <div className="space-y-4 estiercol-enter">
      {/* El caso real, en voz del campo */}
      <div className="rounded-2xl border border-rose-600/40 bg-rose-900/20 p-4">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-rose-300">
          <AlertTriangle size={14} aria-hidden="true" /> El caso
        </p>
        <p className="mt-1 text-lg font-black text-slate-100 leading-snug">
          «La gallinaza huele muy feo y los vecinos se quejan.»
        </p>
        <p className="mt-1 text-sm text-slate-300/90">
          Pasa en toda finca con animales. El olor no es mala suerte: es estiércol
          fresco perdiendo nitrógeno al aire. Se arregla, y de paso usted gana abono.
        </p>
      </div>

      <SeccionCard Icon={Info} tono={{ border: 'border-amber-600/40', bg: 'bg-amber-900/20', text: 'text-amber-200' }} titulo="Por qué huele">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
          {OLOR_CAUSAS.map((c) => (
            <div key={c.t} className="rounded-xl bg-black/20 border border-slate-700/50 p-3">
              <p className="flex items-center gap-2 font-bold text-slate-100">
                <c.Icon size={16} className="text-amber-300 shrink-0" aria-hidden="true" />
                {c.t}
              </p>
              <p className="text-xs text-slate-300/90 mt-1 leading-snug">{c.d}</p>
            </div>
          ))}
        </div>
      </SeccionCard>

      {/* De esto → a esto (antes/después) */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/30 p-3.5 flex items-center gap-3">
        <div className="flex-1 text-center">
          <p className="text-2xl" aria-hidden="true">💩</p>
          <p className="text-xs font-bold text-rose-300 mt-1">Pila húmeda y tapada</p>
          <p className="text-2xs text-slate-400">huele a amoníaco</p>
        </div>
        <ArrowRight size={22} className="text-emerald-400 shrink-0" aria-hidden="true" />
        <div className="flex-1 text-center">
          <p className="text-2xl" aria-hidden="true">🌱</p>
          <p className="text-xs font-bold text-emerald-300 mt-1">Compost aireado</p>
          <p className="text-2xs text-slate-400">huele a tierra</p>
        </div>
      </div>

      <SeccionCard Icon={CheckCircle2} tono={tono} titulo="Cómo quitarle el olor">
        <div className="space-y-3 mt-1">
          {OLOR_SOLUCIONES.map((s, i) => (
            <Paso key={s.t} n={i + 1} titulo={s.t} tono={tono}>{s.d}</Paso>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-100/90">
          <span className="font-bold">Regla de oro:</span> seco y con aire no huele; mojado y tapado apesta.
        </div>
      </SeccionCard>
    </div>
  );
}

/* ── PILAR 2 · BIODIGESTOR ──────────────────────────────────────────────── */

const BIODIGESTOR_BENEFICIOS = [
  { Icon: Flame, t: 'Gas para cocinar', d: 'Menos leña y menos humo en la cocina.', tono: 'text-amber-300' },
  { Icon: Droplets, t: 'Biol fertilizante', d: 'Abono líquido listo para las matas.', tono: 'text-lime-300' },
  { Icon: Wind, t: 'Menos olor y moscas', d: 'El estiércol va cerrado, no en pila abierta.', tono: 'text-teal-300' },
  { Icon: ShieldCheck, t: 'Saneamiento', d: 'Cuida el agua, la salud y el corral.', tono: 'text-sky-300' },
];

function PilarBiodigestor() {
  const [tipoAnimal, setTipoAnimal] = useState('cerdo');
  const [numAnimales, setNumAnimales] = useState(300); // caso insignia
  const [pisoTermico, setPisoTermico] = useState('calido');

  const est = useMemo(
    () => estimarBiodigestor({ tipoAnimal, numAnimales, pisoTermico }),
    [tipoAnimal, numAnimales, pisoTermico],
  );
  // Mapa biogás → llenado visual de la cúpula (0.12..1).
  const llenado = Math.min(1, 0.12 + est.biogasM3Dia / 100);

  const setNum = (v) => setNumAnimales(Math.max(0, Math.min(100000, Math.floor(v) || 0)));

  const tono = { border: 'border-amber-600/40', bg: 'bg-amber-900/20', text: 'text-amber-200', chip: 'bg-amber-500/20 text-amber-100 border border-amber-400/40' };

  return (
    <div className="space-y-4 estiercol-enter">
      <SeccionCard Icon={Info} tono={{ border: 'border-slate-700/50', bg: 'bg-slate-900/30', text: 'text-slate-100' }} titulo="Qué es un biodigestor">
        <p>
          Una bolsa o tanque cerrado donde el estiércol se descompone <b>sin aire</b>.
          De ahí salen dos cosas: <b className="text-amber-200">biogás</b> para cocinar
          y <b className="text-lime-200">biol</b>, un abono líquido. El mismo estiércol
          que le daba problemas le da energía y fertilizante.
        </p>
      </SeccionCard>

      {/* Ilustración del tubular en corte */}
      <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-b from-amber-900/10 to-transparent p-3">
        <BiodigestorIlustracion llenado={llenado} />
        <p className="text-center text-xs text-slate-400 mt-1">
          Biodigestor tubular en corte: entra la mezcla, se llena de biogás arriba y sale el biol.
        </p>
      </div>

      <SeccionCard Icon={CheckCircle2} tono={tono} titulo="Para qué sirve">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
          {BIODIGESTOR_BENEFICIOS.map((b) => (
            <div key={b.t} className="rounded-xl bg-black/20 border border-slate-700/50 p-3">
              <p className="flex items-center gap-2 font-bold text-slate-100">
                <b.Icon size={16} className={`${b.tono} shrink-0`} aria-hidden="true" />
                {b.t}
              </p>
              <p className="text-xs text-slate-300/90 mt-1 leading-snug">{b.d}</p>
            </div>
          ))}
        </div>
      </SeccionCard>

      {/* Calculadora de dimensionamiento */}
      <SeccionCard Icon={Calculator} tono={{ border: 'border-lime-600/40', bg: 'bg-lime-900/20', text: 'text-lime-200' }} titulo="Calculadora: ¿de qué tamaño?">
        <p className="text-sm text-slate-300/90">
          Ponga su hato y vea el tamaño del digestor y cuánto biogás y biol daría.
        </p>

        {/* Tipo de animal */}
        <div className="mt-3">
          <p className="text-xs font-bold text-slate-300 mb-1.5">Animal</p>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Tipo de animal">
            {Object.values(ANIMALES_BIODIGESTOR).map((a) => {
              const activo = a.id === tipoAnimal;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setTipoAnimal(a.id)}
                  aria-pressed={activo}
                  className={`estiercol-pilar-btn rounded-xl border px-2 py-2.5 text-center ${activo
                    ? 'border-lime-400/70 bg-lime-500/20 text-lime-100'
                    : 'border-slate-700/60 bg-black/20 text-slate-300'}`}
                >
                  <span className="text-xl block" aria-hidden="true">{a.emoji}</span>
                  <span className="text-xs font-bold block mt-0.5">{a.nombre}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Número de animales */}
        <div className="mt-3">
          <label htmlFor="num-animales" className="text-xs font-bold text-slate-300 mb-1.5 block">
            ¿Cuántos {ANIMALES_BIODIGESTOR[tipoAnimal].nombre.toLowerCase()}?
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNum(numAnimales - 10)}
              aria-label="Quitar 10"
              className="estiercol-pilar-btn shrink-0 w-11 h-11 rounded-xl border border-slate-700/60 bg-black/20 text-slate-200 grid place-items-center"
            >
              <Minus size={18} aria-hidden="true" />
            </button>
            <input
              id="num-animales"
              type="number"
              inputMode="numeric"
              min="0"
              value={numAnimales}
              onChange={(e) => setNum(Number(e.target.value))}
              className="flex-1 min-w-0 text-center text-2xl font-black bg-black/25 border border-slate-700/60 rounded-xl py-2 text-lime-100 focus:outline-none focus:border-lime-400/70"
            />
            <button
              type="button"
              onClick={() => setNum(numAnimales + 10)}
              aria-label="Sumar 10"
              className="estiercol-pilar-btn shrink-0 w-11 h-11 rounded-xl border border-slate-700/60 bg-black/20 text-slate-200 grid place-items-center"
            >
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>
          {/* Atajos, con el caso insignia bien a la vista */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[10, 50, 100, 300].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setNum(p)}
                className={`estiercol-pilar-btn text-xs font-bold rounded-full px-3 py-1 border ${numAnimales === p
                  ? 'border-lime-400/70 bg-lime-500/20 text-lime-100'
                  : 'border-slate-700/60 bg-black/20 text-slate-300'}`}
              >
                {p}{p === 300 ? ' 🐖' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Piso térmico — el TRH (tiempo de retención) NO es fijo: en clima
            frío/páramo la digestión es más lenta y el digestor debe ser más
            grande para el mismo hato (grounding CIPAV/LRRD). */}
        <div className="mt-3">
          <p className="text-xs font-bold text-slate-300 mb-1.5">¿Cómo es el clima de su finca?</p>
          <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Piso térmico">
            {PISOS_TERMICOS_BIODIGESTOR.map((p) => {
              const activo = p.id === pisoTermico;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPisoTermico(p.id)}
                  aria-pressed={activo}
                  data-testid={`biodigestor-piso-${p.id}`}
                  className={`estiercol-pilar-btn rounded-xl border px-1.5 py-2 text-center ${activo
                    ? 'border-lime-400/70 bg-lime-500/20 text-lime-100'
                    : 'border-slate-700/60 bg-black/20 text-slate-300'}`}
                >
                  <span className="text-lg block" aria-hidden="true">{p.emoji}</span>
                  <span className="text-2xs font-bold block mt-0.5">{p.nombre}</span>
                </button>
              );
            })}
          </div>
          <p className="text-2xs text-slate-400 mt-1.5 leading-snug">
            Más frío, más días de retención: el digestor tarda más en dar el mismo
            biogás. En páramo el tiempo de retención sube a <b className="text-slate-300">~{TRH_PARAMO_DIAS} días</b> (vs.
            30 en clima cálido/templado) — por eso el digestor se ve más grande arriba.
          </p>
        </div>

        {/* Resultados */}
        <div className="grid grid-cols-2 gap-2.5 mt-4" data-testid="biodigestor-resultados">
          <ResultCard Icon={Container} valor={est.volumenDigestorM3} unidad="m³" etiqueta="Tamaño del digestor" tono="text-sky-200" />
          <ResultCard Icon={Flame} valor={est.biogasM3Dia} unidad="m³/día" etiqueta="Biogás" tono="text-amber-200" />
          <ResultCard Icon={Droplets} valor={est.biolLitrosDia} unidad="L/día" etiqueta="Biol (abono líquido)" tono="text-lime-200" />
          <ResultCard Icon={Flame} valor={est.horasFogonDia} unidad="h/día" etiqueta="Fogón encendido" tono="text-orange-200" />
        </div>

        <div className="mt-3 rounded-lg border border-dashed border-slate-500/50 bg-slate-500/10 px-3 py-2 text-xs text-slate-300/90">
          <span className="font-bold text-slate-200">Cifras estimadas con datos citados.</span>{' '}
          El estiércol/día, el biogás/kg (cerdo y bovino) y el tiempo de retención por
          piso térmico salen de la investigación agronómica (CIPAV/LRRD; Rev. Cubana
          de Ingeniería). Lo que aún no tiene fuente colombiana específica (biogás de
          la gallinaza, consumo del fogón) sigue como orden de magnitud.
        </div>
      </SeccionCard>
    </div>
  );
}

function ResultCard({ Icon, valor, unidad, etiqueta, tono }) {
  const texto = Number.isFinite(valor)
    ? valor.toLocaleString('es-CO', { maximumFractionDigits: 1 })
    : '—';
  return (
    <div className="rounded-xl bg-black/25 border border-slate-700/50 p-3">
      {Icon && <Icon size={18} className={`${tono} mb-1`} aria-hidden="true" />}
      <p className="leading-none">
        <span className={`text-2xl font-black ${tono}`}>{texto}</span>{' '}
        <span className="text-xs text-slate-400 font-bold">{unidad}</span>
      </p>
      <p className="text-2xs text-slate-400 mt-1 leading-tight">{etiqueta}</p>
    </div>
  );
}

/* ── PILAR 3 · ABONOS ───────────────────────────────────────────────────── */

const ABONOS = [
  {
    tipo: 'gallinaza', nombre: 'Gallinaza', de: 'De las gallinas',
    que: 'Estiércol de gallina con la cama (cascarilla, viruta). Muy rica en nitrógeno; fresca quema las matas.',
    pasos: ['Recójala seca de la cama profunda.', 'Madúrela o compóstela 4–8 semanas antes de usar.', 'Aplíquela al suelo, nunca sobre la hoja.'],
    tono: { border: 'border-amber-600/40', bg: 'bg-amber-900/20', text: 'text-amber-200' },
  },
  {
    tipo: 'porquinaza', nombre: 'Porquinaza', de: 'De los cerdos',
    que: 'Estiércol de cerdo, casi siempre líquido. Muy fuerte: va al biodigestor o bien compostado.',
    pasos: ['Sepárela del agua de lavado.', 'Llévela al biodigestor o a una pila con material seco.', 'Use el biol/compost resultante, no la porquinaza cruda.'],
    tono: { border: 'border-pink-600/40', bg: 'bg-pink-900/20', text: 'text-pink-200' },
  },
  {
    tipo: 'bovinaza', nombre: 'Bovinaza (boñiga)', de: 'De las vacas',
    que: 'La boñiga clásica del biol. Equilibrada y noble; base de muchos preparados.',
    pasos: ['Recójala del establo o el potrero.', 'Madúrela o llévela al biol/compost.', 'Aplíquela madura al pie de la planta.'],
    tono: { border: 'border-orange-600/40', bg: 'bg-orange-900/20', text: 'text-orange-200' },
  },
  {
    tipo: 'biol', nombre: 'Biol', de: 'Líquido — foliar o al pie',
    que: 'El líquido que sale del biodigestor o de un tanque tapado. Fertilizante y bioestimulante.',
    pasos: ['Deje fermentar el estiércol con agua, tapado y sin aire.', 'Cuele el líquido.', 'Diluya en agua y aplique foliar o al pie.'],
    tono: { border: 'border-lime-600/40', bg: 'bg-lime-900/20', text: 'text-lime-200' },
  },
  {
    tipo: 'biosol', nombre: 'Biosol', de: 'Sólido del biodigestor',
    que: 'La parte sólida que queda tras sacar el biol. Abono estable para el suelo.',
    pasos: ['Retire el sólido del fondo/salida del digestor.', 'Séquelo a la sombra.', 'Incorpórelo al suelo como abono de fondo.'],
    tono: { border: 'border-yellow-600/40', bg: 'bg-yellow-900/20', text: 'text-yellow-200' },
  },
  {
    tipo: 'compost', nombre: 'Compost', de: 'Pila aireada',
    que: 'Estiércol + material seco, volteado con aire hasta que huele a tierra. El abono más versátil.',
    pasos: ['Mezcle estiércol con material seco (2–3 : 1).', 'Voltee cada pocos días y mantenga húmedo como esponja escurrida.', 'Listo cuando huele a tierra y no se reconoce el material.'],
    tono: { border: 'border-emerald-600/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' },
  },
  {
    tipo: 'lombricompost', nombre: 'Lombricompost', de: 'Con lombriz roja',
    que: 'Estiércol digerido por lombriz roja californiana. El humus más fino y de mejor calidad.',
    pasos: ['Prepare camas con estiércol ya pre-compostado (frío).', 'Siembre la lombriz y manténgala húmeda y a la sombra.', 'Cose­che el humus del lecho cada pocos meses.'],
    tono: { border: 'border-teal-600/40', bg: 'bg-teal-900/20', text: 'text-teal-200' },
  },
];

function AbonoCard({ abono }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={`rounded-2xl border ${abono.tono.border} ${abono.tono.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 p-3.5 text-left"
      >
        <span className="shrink-0 w-11 h-11 rounded-xl bg-black/25 border border-slate-700/50 grid place-items-center">
          <AbonoGlifo tipo={abono.tipo} size={34} />
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block font-black leading-tight ${abono.tono.text}`}>{abono.nombre}</span>
          <span className="block text-2xs text-slate-400">{abono.de}</span>
        </span>
        <ChevronRight size={18} className={`shrink-0 text-slate-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <div className="px-3.5 pb-3.5 -mt-1 space-y-2 estiercol-enter">
          <p className="text-sm text-slate-300/90 leading-snug">{abono.que}</p>
          <div>
            <p className="text-xs font-bold text-slate-300 mb-1">Cómo se hace</p>
            <ol className="space-y-1">
              {abono.pasos.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-300/90">
                  <span className={`shrink-0 font-black ${abono.tono.text}`}>{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
          <GroundedSlot />
        </div>
      )}
    </div>
  );
}

function PilarAbonos() {
  return (
    <div className="space-y-3 estiercol-enter">
      <SeccionCard Icon={FlaskConical} tono={{ border: 'border-slate-700/50', bg: 'bg-slate-900/30', text: 'text-slate-100' }} titulo="Cada estiércol tiene su abono">
        <p>
          No todo estiércol se usa igual. Toque cada uno para ver qué es, cómo se
          hace y —cuando la investigación lo confirme— cuánto aplicar.
        </p>
      </SeccionCard>
      <div className="space-y-2.5">
        {ABONOS.map((a) => <AbonoCard key={a.tipo} abono={a} />)}
      </div>
    </div>
  );
}

/* ── INICIO (landing del módulo) ────────────────────────────────────────── */

function PilarInicio({ onIr }) {
  const cards = [
    { id: 'olores', Icon: Wind, t: 'Quitar el olor', d: 'La gallinaza huele y el vecino se queja. Solución.', tono: 'border-l-teal-500 text-teal-300' },
    { id: 'biodigestor', Icon: Flame, t: 'Sacar biogás', d: 'Gas para cocinar y biol. Calcule su biodigestor.', tono: 'border-l-amber-500 text-amber-300' },
    { id: 'abonos', Icon: Sprout, t: 'Hacer abono', d: 'Gallinaza, biol, compost, lombricompost y más.', tono: 'border-l-lime-500 text-lime-300' },
  ];
  return (
    <div className="space-y-4 estiercol-enter">
      <div className="rounded-2xl border border-emerald-700/40 bg-gradient-to-b from-emerald-900/20 to-transparent p-4">
        <p className="text-sm text-slate-200/95 leading-relaxed">
          En la finca <b>nada sobra</b>. El estiércol del corral, bien manejado, se
          vuelve <b className="text-lime-200">abono</b>, <b className="text-amber-200">gas para cocinar</b> y
          suelo vivo. Aquí aprende a aprovecharlo sin malos olores.
        </p>
        <div className="mt-2 max-w-[240px] mx-auto">
          <CicloCorralAbono />
        </div>
      </div>
      <div className="space-y-2.5">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onIr(c.id)}
            className={`estiercol-pilar-btn w-full flex items-center gap-3 rounded-2xl border border-slate-800 border-l-4 ${c.tono.split(' ')[0]} bg-slate-900/40 p-4 text-left`}
          >
            <c.Icon size={26} className={`shrink-0 ${c.tono.split(' ')[1]}`} aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className={`block font-black ${c.tono.split(' ')[1]}`}>{c.t}</span>
              <span className="block text-xs text-slate-400 mt-0.5">{c.d}</span>
            </span>
            <ChevronRight size={20} className="shrink-0 text-slate-500" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Pantalla ───────────────────────────────────────────────────────────── */

export default function EstiercolScreen({ onBack, onHome }) {
  const [pilar, setPilar] = useState('inicio');

  return (
    <ScreenShell title="Del corral al abono" icon={Recycle} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto">
        {/* Navegación por pilares (segmentada, siempre visible) */}
        <nav
          className="flex gap-1.5 mb-4 overflow-x-auto -mx-1 px-1 pb-1"
          aria-label="Secciones del módulo"
          data-testid="estiercol-pilares"
        >
          {PILARES.map((p) => {
            const activo = p.id === pilar;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPilar(p.id)}
                aria-current={activo ? 'page' : undefined}
                className={`estiercol-pilar-btn shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-bold border ${activo
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_1px_rgba(52,211,153,0.25)]'
                  : 'border-slate-700/60 bg-slate-900/40 text-slate-300'}`}
              >
                <p.Icon size={16} aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </nav>

        {pilar === 'inicio' && <PilarInicio onIr={setPilar} />}
        {pilar === 'olores' && <PilarOlores />}
        {pilar === 'biodigestor' && <PilarBiodigestor />}
        {pilar === 'abonos' && <PilarAbonos />}
      </div>
    </ScreenShell>
  );
}
