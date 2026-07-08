import React, { useState } from 'react';
import {
  Sprout, Leaf, TreePine, Trees, Bug, Scissors, Sun, Droplets,
  ChevronRight, Camera, ExternalLink, ShieldCheck, TriangleAlert,
  Recycle, HeartHandshake, Package, Flower2, Ruler, ThermometerSun,
  MapPin, Sparkles,
} from 'lucide-react';
import { ScreenShell } from '../common/ScreenShell';
import PedagogicalBlock from '../common/PedagogicalBlock';
import {
  FOTO_BASE_CACAO,
  CREDITOS_FOTOS_CACAO,
  ESTACIONES_CACAO,
  FICHA_CACAO,
  CACAO_PAIS,
  GRUPOS_GENETICOS,
  CLONES_CACAO,
  CLONES_NOTA,
  ESTRATOS_SAF,
  SAF_BENEFICIOS,
  SAF_FUENTE,
  PROPAGACION_CACAO,
  PODAS_CACAO,
  ENFERMEDADES_CACAO,
  CACAO_NO_CONFUNDIR,
  CACAO_NO_CONFUNDIR_FUENTE,
  COSECHA_CACAO,
  BENEFICIO_CACAO,
  BENEFICIO_CIERRE,
  BENEFICIO_FUENTE,
  CASCARA_ABONO,
} from '../../data/cacaoFinca';
import './cacao.css';

/**
 * CacaoScreen — mundo "El cacao" (Theobroma cacao L.), cultivo bandera del
 * cacaotero colombiano, ligado a la paz y a la sustitución.
 *
 * Cinco estaciones (un solo camino visual, patrón photo-forward de Agua/
 * Almacenamiento):
 *   1. El árbol            — qué es, dónde se da, variedades/clones.
 *   2. La sombra (SAF)      — cacao bajo monte por estratos; enlaza a Buenas
 *      vecinas y al Monte de la finca.
 *   3. Siembra y poda       — semilla vs injerto de clon élite; podas.
 *   4. Monilia y escoba     — reconocerlas y manejo cultural/sanitario (sin
 *      dosis químicas inventadas).
 *   5. Cosecha y beneficio  — fermentación en cajón + secado (calidad/precio);
 *      cáscara/baba como abono → enlaza a "Del corral al abono".
 *
 * CERO invención: todo el contenido sale de src/data/cacaoFinca.js, groundeado
 * al catálogo/grafo de Chagra + FEDECACAO/AGROSAVIA/ICA. Fotos reales CC con
 * autor + licencia visibles (public/cacao/creditos.json).
 *
 * @param {Object} props
 * @param {() => void} props.onBack
 * @param {(view: string, data?: any) => void} [props.onNavigate]
 */

/** Busca el crédito de una foto por su slug. */
const creditoDe = (slug) => CREDITOS_FOTOS_CACAO.find((c) => c.slug === slug) || null;

/**
 * FotoCacao — imagen a sangre con scrim inferior fijo, crédito de autor en la
 * esquina y fallback a un ícono si no carga. `children` va SOBRE la foto.
 */
function FotoCacao({ slug, alt, ratio = 'aspect-[16/10]', rounded = '', Fallback = Sprout, hero = false, children = null }) {
  const [ok, setOk] = useState(true);
  const credito = creditoDe(slug);
  const IconoFallback = Fallback;
  return (
    <div className={`relative overflow-hidden bg-stone-950 ${ratio} ${rounded} ${hero ? 'cacao-hero' : ''}`}>
      {ok ? (
        <img
          src={`${FOTO_BASE_CACAO}/${slug}.jpg`}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setOk(false)}
          className="cacao-foto absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
          <IconoFallback size={38} className="text-stone-700" />
        </div>
      )}
      {/* scrim fijo para legibilidad del texto/crédito sobre cualquier foto */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5" aria-hidden="true" />
      {children}
      {credito && (
        <span className="absolute bottom-1 right-1.5 rounded bg-black/55 px-1 py-0.5 text-[9px] leading-none text-white/75">
          Foto: {credito.autor}
        </span>
      )}
    </div>
  );
}

/** Fila de una ficha (etiqueta + valor), legible al sol. */
function FichaFila({ icon, label, children }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon size={16} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-500" />
      <p className="text-sm leading-snug text-stone-200">
        <span className="font-bold text-stone-100">{label}: </span>{children}
      </p>
    </div>
  );
}

/* ── ESTACIÓN 1 · El árbol ─────────────────────────────────────────────────── */
function EstacionArbol() {
  return (
    <section className="cacao-seccion space-y-4" data-testid="estacion-arbol">
      {/* Hero con la mazorca real sobre el tronco (cauliflor) */}
      <div className="cacao-card rounded-2xl border border-amber-800/40 overflow-hidden bg-stone-900/60">
        <FotoCacao slug="mazorca" alt="Mazorcas de cacao rojas brotando directamente del tronco del árbol" ratio="aspect-[16/10]" Fallback={Sprout} hero>
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Sparkles size={14} aria-hidden="true" /> Cultivo de la paz
            </p>
            <span aria-hidden="true" className="cacao-eyebrow-linea text-amber-300" />
            <h3 className="cacao-hero-titulo mt-1.5 text-[1.7rem] font-black text-[#ffffff] leading-[1.1] tracking-tight">El árbol que da el chocolate</h3>
          </div>
        </FotoCacao>
      </div>

      <p className="text-sm leading-relaxed text-stone-200">
        El cacao es un árbol de tierra caliente que da su fruto pegado al tronco.
        Es lícito, produce todo el año y sostiene familias campesinas donde antes
        hubo coca: por eso es el cultivo bandera de la paz y la sustitución.
      </p>

      {/* Ficha groundeada */}
      <div className="cacao-card rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide mb-1">
          {FICHA_CACAO.nombreCientifico} <span className="font-normal normal-case text-stone-400">· {FICHA_CACAO.familia}</span>
        </p>
        <div className="divide-y divide-stone-800/70">
          <FichaFila icon={TreePine} label="El árbol">{FICHA_CACAO.porte} {FICHA_CACAO.origen}</FichaFila>
          <FichaFila icon={Ruler} label="Altura sobre el mar">{FICHA_CACAO.altitud}</FichaFila>
          <FichaFila icon={ThermometerSun} label="Clima">{FICHA_CACAO.temperatura}</FichaFila>
          <FichaFila icon={Sun} label="Luz">{FICHA_CACAO.luz}</FichaFila>
          <FichaFila icon={Droplets} label="Agua y suelo">{FICHA_CACAO.agua}</FichaFila>
          <FichaFila icon={Sprout} label="Primera cosecha">{FICHA_CACAO.primeraCosecha}</FichaFila>
        </div>
        <p className="mt-2 text-[10px] leading-snug text-stone-500">Fuente: {FICHA_CACAO.fuente}</p>
      </div>

      {/* Flor cauliflora — foto real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="cacao-card rounded-2xl border border-stone-700/60 overflow-hidden bg-stone-900/50">
          <FotoCacao slug="flor" alt="Flores de cacao brotando directamente de la corteza del tronco" ratio="aspect-[4/3]" Fallback={Flower2}>
            <div className="absolute inset-0 flex flex-col justify-end p-3">
              <p className="cacao-hero-titulo text-sm font-black text-[#ffffff] leading-tight">Flores en el tronco</p>
            </div>
          </FotoCacao>
          <p className="p-3 text-xs leading-snug text-stone-300">
            El cacao es cauliflor: sus florecitas y sus mazorcas salen del propio
            tronco y de las ramas gruesas, no de las puntas.
          </p>
        </div>
        <div className="cacao-card rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-3.5 flex flex-col justify-center">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-1.5">
            <MapPin size={14} aria-hidden="true" /> Colombia cacaotera
          </p>
          <p className="text-xs leading-snug text-stone-200">{CACAO_PAIS.regiones}</p>
          <p className="mt-2 text-xs leading-snug text-amber-200/90">{CACAO_PAIS.finoDeAroma}</p>
          <p className="mt-2 text-[10px] leading-snug text-stone-500">Fuente: {CACAO_PAIS.fuente}</p>
        </div>
      </div>

      {/* Variedades / grupos genéticos */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4 space-y-3">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide">De qué familia es su cacao</p>
        <div className="grid gap-2.5">
          {GRUPOS_GENETICOS.map((g) => (
            <div key={g.id} className="cacao-card rounded-xl border border-stone-700/50 bg-stone-950/40 p-3" data-testid={`grupo-${g.id}`}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-100 leading-tight">
                {g.nombre}
                <span className="rounded-full bg-amber-500/15 border border-amber-600/40 px-2 py-0.5 text-[11px] font-bold text-amber-300">{g.etiqueta}</span>
              </p>
              <p className="text-xs leading-snug text-stone-300 mt-1">{g.detalle}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Clones de registro */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4 space-y-3">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide">Clones para sembrar</p>
        <div className="grid gap-2.5">
          {CLONES_CACAO.map((c) => (
            <div key={c.id} className="cacao-card rounded-xl border border-stone-700/50 bg-stone-950/40 p-3" data-testid={`clon-${c.id}`}>
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-100 leading-tight">
                {c.nombre}
                <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-[11px] font-bold text-stone-300">{c.tipo}</span>
              </p>
              <p className="text-xs leading-snug text-stone-300 mt-1">{c.detalle}</p>
            </div>
          ))}
        </div>
        <PedagogicalBlock icon={ShieldCheck} clave={CLONES_NOTA}>
          <p className="text-xs">Un cacaotal de un solo clon es un cacaotal en riesgo.</p>
        </PedagogicalBlock>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 2 · La sombra (sistema agroforestal) ─────────────────────────── */
function EstacionSombra({ onNavigate }) {
  return (
    <section className="cacao-seccion space-y-4" data-testid="estacion-sombra">
      <div className="cacao-card rounded-2xl border border-emerald-800/40 overflow-hidden bg-stone-900/60">
        <FotoCacao slug="agroforestal" alt="Cacaotal bajo sombra integrado en un sistema con palmas y monte" ratio="aspect-[16/9]" Fallback={Trees} hero>
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
              <Trees size={14} aria-hidden="true" /> Cacao bajo monte
            </p>
            <span aria-hidden="true" className="cacao-eyebrow-linea text-emerald-300" />
            <h3 className="cacao-hero-titulo mt-1.5 text-xl font-black text-[#ffffff] leading-tight tracking-tight">El cacao no vive solo: vive en un sistema</h3>
          </div>
        </FotoCacao>
      </div>

      <p className="text-sm leading-relaxed text-stone-200">
        El cacao es de sombra. Sembrarlo bajo un techo de otros árboles —el
        sistema agroforestal (SAF)— no es descuido: es diseño. Cada piso del
        monte cumple una tarea.
      </p>

      {/* Estratos del SAF (de arriba hacia abajo) */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4 space-y-2.5">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide mb-1">La finca por pisos</p>
        {ESTRATOS_SAF.map((e, i) => {
          const esCacao = e.id === 'cacao';
          return (
            <div
              key={e.id}
              data-testid={`estrato-${e.id}`}
              className={`cacao-card rounded-xl border p-3 ${esCacao ? 'border-amber-600/50 bg-amber-950/25 shadow-[0_0_0_1px_rgba(217,119,6,0.25)]' : 'border-stone-700/50 bg-stone-950/40'}`}
              style={{ marginLeft: `${i * 8}px` }}
            >
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-100 leading-tight">
                <Leaf size={14} aria-hidden="true" className={esCacao ? 'text-amber-400' : 'text-emerald-400'} />
                {e.planta}
                <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-[10px] font-bold text-stone-300">{e.estrato}</span>
              </p>
              <p className="text-xs leading-snug text-stone-300 mt-1"><span className="text-stone-400">{e.ejemplos}.</span> {e.rol}</p>
            </div>
          );
        })}
      </div>

      {/* Qué gana la finca */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide mb-3">Qué gana la finca con la sombra</p>
        <ul className="space-y-3">
          {SAF_BENEFICIOS.map((b) => (
            <li key={b.id} className="flex gap-3" data-testid={`saf-${b.id}`}>
              <Sprout size={18} aria-hidden="true" className="shrink-0 text-lime-400 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-100 leading-tight">{b.titulo}</p>
                <p className="text-xs leading-snug text-stone-300 mt-0.5">{b.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[10px] leading-snug text-stone-500">Fuente: {SAF_FUENTE}</p>
      </div>

      {/* Puentes a mundos existentes (no huérfano) */}
      {typeof onNavigate === 'function' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            data-testid="cacao-link-asociaciones"
            onClick={() => onNavigate('asociaciones')}
            className="cacao-enlace cacao-focus flex items-center gap-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/20 p-3.5 text-left hover:border-emerald-500/70 hover:bg-emerald-900/25 active:bg-emerald-900/30"
          >
            <HeartHandshake size={20} className="shrink-0 text-emerald-300" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-stone-100 leading-tight">Buenas vecinas</span>
              <span className="block text-xs text-stone-400 leading-tight mt-0.5">Con qué se lleva bien el cacao</span>
            </span>
            <ChevronRight size={18} className="cacao-enlace-chevron shrink-0 text-emerald-400/80" aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="cacao-link-biodiversidad"
            onClick={() => onNavigate('biodiversidad')}
            className="cacao-enlace cacao-focus flex items-center gap-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/20 p-3.5 text-left hover:border-emerald-500/70 hover:bg-emerald-900/25 active:bg-emerald-900/30"
          >
            <Trees size={20} className="shrink-0 text-emerald-300" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-stone-100 leading-tight">El monte de la finca</span>
              <span className="block text-xs text-stone-400 leading-tight mt-0.5">Los árboles de sombra y su vida</span>
            </span>
            <ChevronRight size={18} className="cacao-enlace-chevron shrink-0 text-emerald-400/80" aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}

/* ── ESTACIÓN 3 · Siembra y poda ───────────────────────────────────────────── */
function EstacionManejo() {
  return (
    <section className="cacao-seccion space-y-4" data-testid="estacion-manejo">
      <div className="cacao-card rounded-2xl border border-stone-700/60 overflow-hidden bg-stone-900/60">
        <FotoCacao slug="injerto" alt="Campesina injertando una plántula de cacao en el vivero" ratio="aspect-[16/9]" Fallback={Scissors} hero>
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Scissors size={14} aria-hidden="true" /> De la semilla al clon
            </p>
            <span aria-hidden="true" className="cacao-eyebrow-linea text-amber-300" />
            <h3 className="cacao-hero-titulo mt-1.5 text-xl font-black text-[#ffffff] leading-tight tracking-tight">Cómo se arranca un buen cacaotal</h3>
          </div>
        </FotoCacao>
      </div>

      {/* Propagación: semilla vs injerto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROPAGACION_CACAO.map((p) => (
          <div key={p.id} className="cacao-card rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4" data-testid={`propagacion-${p.id}`}>
            <p className="flex items-center gap-2 text-sm font-black text-stone-100 leading-tight">
              {p.id === 'injerto' ? <Scissors size={16} className="text-amber-400" aria-hidden="true" /> : <Sprout size={16} className="text-lime-400" aria-hidden="true" />}
              {p.titulo}
            </p>
            <p className="text-xs leading-snug text-stone-300 mt-2">{p.detalle}</p>
          </div>
        ))}
      </div>

      {/* Podas */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4">
        <p className="text-sm font-black text-stone-100 uppercase tracking-wide mb-3">La poda: aire, luz y sanidad</p>
        <ul className="space-y-3">
          {PODAS_CACAO.map((p) => (
            <li key={p.id} className="flex gap-3" data-testid={`poda-${p.id}`}>
              <Scissors size={18} aria-hidden="true" className="shrink-0 text-amber-400 mt-0.5" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-stone-100 leading-tight">
                  {p.titulo}
                  <span className="rounded-full bg-stone-700/50 px-2 py-0.5 text-[10px] font-bold text-stone-300">{p.cuando}</span>
                </p>
                <p className="text-xs leading-snug text-stone-300 mt-0.5">{p.detalle}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <PedagogicalBlock
        icon={Sun}
        lead="La poda y la sombra son medio control de enfermedades."
        clave="Un árbol aireado y con luz moteada se enferma menos de monilia y escoba que un cacaotal encerrado y húmedo."
      >
        <p>Por eso la poda no es opcional: es parte de la sanidad del lote.</p>
      </PedagogicalBlock>
    </section>
  );
}

/* ── ESTACIÓN 4 · Monilia y escoba de bruja ────────────────────────────────── */
function TarjetaEnfermedad({ e }) {
  return (
    <article className="cacao-card rounded-2xl border border-rose-800/40 bg-stone-900/60 overflow-hidden" data-testid={`enfermedad-${e.id}`}>
      <FotoCacao slug={e.foto} alt={`Síntomas de ${e.nombre} en cacao`} ratio="aspect-[16/10]" Fallback={Bug} hero>
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] italic text-rose-200">
            <Bug size={14} aria-hidden="true" /> {e.cientifico}
          </p>
          <span aria-hidden="true" className="cacao-eyebrow-linea text-rose-300" />
          <h3 className="cacao-hero-titulo mt-1.5 text-xl font-black text-[#ffffff] leading-tight tracking-tight">{e.nombre}</h3>
        </div>
      </FotoCacao>

      <div className="p-4 space-y-3">
        <p className="text-xs leading-snug text-stone-300"><span className="font-bold text-stone-100">{e.tambien}</span> {e.ataca}</p>

        {/* Cómo se ve (reconocer) */}
        <div className="rounded-xl border border-stone-700/50 bg-stone-950/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-stone-200 mb-2">
            <Camera size={13} aria-hidden="true" className="text-rose-300" /> Cómo se ve
          </p>
          <ul className="space-y-2">
            {e.comoSeVe.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-snug text-stone-200">
                <span aria-hidden="true" className="cacao-num">{i + 1}</span>
                <span className="flex-1 min-w-0 pt-px">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Umbral + impacto */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-600/40 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200">
            <TriangleAlert size={12} aria-hidden="true" className="cacao-alerta-late shrink-0" /> {e.umbral}
          </span>
        </div>
        <p className="text-xs leading-snug text-stone-300">{e.impacto}</p>

        {/* Manejo (cultural/sanitario) */}
        <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-3">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-emerald-300 mb-2">
            <ShieldCheck size={13} aria-hidden="true" /> Cómo se maneja (sin veneno)
          </p>
          <ul className="space-y-1.5">
            {e.manejo.map((m, i) => (
              <li key={i} className="flex gap-1.5 text-xs leading-snug text-stone-200">
                <span aria-hidden="true" className="text-emerald-400">•</span>{m}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10px] leading-snug text-stone-500">Fuente: {e.fuente}</p>
      </div>
    </article>
  );
}

function EstacionSanidad() {
  return (
    <section className="cacao-seccion space-y-4" data-testid="estacion-sanidad">
      <PedagogicalBlock
        icon={Bug}
        tone="alerta"
        lead="Dos enfermedades definen el año del cacaotero: la monilia y la escoba de bruja."
        clave="Contra las dos, el arma número uno no es un químico: es la ronda sanitaria constante —recoger y sacar lo enfermo, semana a semana."
      >
        <p>Son hongos hermanos. Reconocerlas a tiempo y no dejarlas regar es la mitad de la cosecha.</p>
      </PedagogicalBlock>

      {ENFERMEDADES_CACAO.map((e) => <TarjetaEnfermedad key={e.id} e={e} />)}

      {/* No confundir */}
      <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4 space-y-3" data-testid="cacao-no-confundir">
        <p className="flex items-center gap-2 text-sm font-black text-stone-100 uppercase tracking-wide">
          <TriangleAlert size={16} aria-hidden="true" className="text-amber-300" /> No las confunda
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CACAO_NO_CONFUNDIR.map((c) => (
            <div key={c.id} className="cacao-card rounded-xl border border-stone-700/50 bg-stone-950/40 overflow-hidden" data-testid={`confundir-${c.id}`}>
              <FotoCacao slug={c.foto} alt={`Síntoma de ${c.que}`} ratio="aspect-[4/3]" Fallback={Bug} />
              <div className="p-2.5">
                <p className="text-xs font-bold text-stone-100 leading-tight">{c.que}</p>
                <p className="text-[11px] leading-snug text-stone-300 mt-1">{c.senal}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] leading-snug text-stone-500">{CACAO_NO_CONFUNDIR_FUENTE}</p>
      </div>
    </section>
  );
}

/* ── ESTACIÓN 5 · Cosecha y beneficio ──────────────────────────────────────── */
function EstacionBeneficio({ onNavigate }) {
  return (
    <section className="cacao-seccion space-y-4" data-testid="estacion-beneficio">
      <div className="cacao-card rounded-2xl border border-amber-800/40 overflow-hidden bg-stone-900/60">
        <FotoCacao slug="cosecha" alt="Mazorcas de cacao de colores junto a un canasto de granos" ratio="aspect-[16/9]" Fallback={Package} hero>
          <div className="absolute inset-0 flex flex-col justify-end p-5">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
              <Package size={14} aria-hidden="true" /> De la mazorca al grano
            </p>
            <span aria-hidden="true" className="cacao-eyebrow-linea text-amber-300" />
            <h3 className="cacao-hero-titulo mt-1.5 text-xl font-black text-[#ffffff] leading-tight tracking-tight">Aquí se hace el precio</h3>
          </div>
        </FotoCacao>
      </div>

      {/* Cosecha */}
      <div className="cacao-card rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4 space-y-2">
        <p className="flex items-center gap-2 text-sm font-black text-stone-100 uppercase tracking-wide">
          <Sprout size={16} aria-hidden="true" className="text-lime-400" /> La cosecha
        </p>
        <p className="text-xs leading-snug text-stone-200">{COSECHA_CACAO.cuando}</p>
        <p className="text-xs leading-snug text-stone-300">{COSECHA_CACAO.punto}</p>
        <p className="text-[10px] leading-snug text-stone-500">Fuente: {COSECHA_CACAO.fuente}</p>
      </div>

      {/* Beneficio: fermentación + secado */}
      <div className="grid grid-cols-1 gap-3">
        {BENEFICIO_CACAO.map((b) => (
          <article key={b.id} className="cacao-card rounded-2xl border border-amber-800/40 bg-stone-900/60 overflow-hidden" data-testid={`beneficio-${b.id}`}>
            <FotoCacao slug={b.foto} alt={b.titulo} ratio="aspect-[16/9]" Fallback={Package} hero>
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">{b.clave}</p>
                <span aria-hidden="true" className="cacao-eyebrow-linea text-amber-300" />
                <h4 className="cacao-hero-titulo mt-1 text-lg font-black text-[#ffffff] leading-tight tracking-tight">{b.titulo}</h4>
              </div>
            </FotoCacao>
            <p className="p-3.5 text-xs leading-snug text-stone-200">{b.detalle}</p>
          </article>
        ))}
      </div>

      <PedagogicalBlock icon={Sparkles} clave={BENEFICIO_CIERRE}>
        <p className="text-xs">Fuente: {BENEFICIO_FUENTE}.</p>
      </PedagogicalBlock>

      {/* Cáscara / baba como abono → enlace al mundo del compost */}
      <div className="cacao-card rounded-2xl border border-lime-800/40 bg-lime-950/15 p-4 space-y-2.5" data-testid="cacao-cascara-abono">
        <p className="flex items-center gap-2 text-sm font-black text-lime-200 uppercase tracking-wide">
          <Recycle size={16} aria-hidden="true" /> La cáscara vuelve al suelo
        </p>
        <p className="text-xs leading-snug text-stone-200">{CASCARA_ABONO.gancho}</p>
        <ul className="space-y-1.5">
          {CASCARA_ABONO.puntos.map((p, i) => (
            <li key={i} className="flex gap-1.5 text-xs leading-snug text-stone-200">
              <span aria-hidden="true" className="text-lime-400">•</span>{p}
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-amber-600/40 bg-amber-500/10 p-2.5">
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-amber-100">
            <TriangleAlert size={13} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-400" />
            {CASCARA_ABONO.ojoSanitario}
          </p>
        </div>
        <p className="text-[10px] leading-snug text-stone-500">Fuente: {CASCARA_ABONO.fuente}</p>
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cacao-link-estiercol"
            onClick={() => onNavigate('estiercol')}
            className="cacao-enlace cacao-focus w-full flex items-center gap-3 rounded-xl border border-lime-700/50 bg-lime-950/25 p-3 text-left hover:border-lime-500/70 hover:bg-lime-900/30 active:bg-lime-900/30"
          >
            <Recycle size={18} className="shrink-0 text-lime-300" aria-hidden="true" />
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-stone-100 leading-tight">Del corral al abono</span>
              <span className="block text-xs text-stone-400 leading-tight mt-0.5">Compostar la cáscara junto al estiércol y la ceniza</span>
            </span>
            <ChevronRight size={18} className="cacao-enlace-chevron shrink-0 text-lime-400/80" aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

/** Créditos de las fotos — cumplimiento de licencia abierta (patrón Agua/Suelo). */
function CreditosFotos() {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="rounded-xl border border-stone-700/60 bg-stone-900/50 p-3" data-testid="cacao-creditos-fotos">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="cacao-focus w-full flex items-center gap-2 text-left rounded-md"
      >
        <Camera size={15} className="text-stone-400 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-xs font-bold text-stone-300">Créditos de las fotos (licencia abierta)</span>
        <ChevronRight size={16} className={`text-stone-500 transition-transform ${abierto ? 'rotate-90' : ''}`} aria-hidden="true" />
      </button>
      {abierto && (
        <ul className="mt-2.5 pt-2.5 border-t border-stone-700/60 flex flex-col gap-1.5">
          {CREDITOS_FOTOS_CACAO.map((cr) => (
            <li key={cr.slug} className="text-[11px] leading-snug text-stone-400">
              <a
                href={cr.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-stone-200 hover:text-white underline decoration-stone-600 underline-offset-2 inline-flex items-center gap-0.5"
              >
                {cr.slug}<ExternalLink size={10} className="inline shrink-0" aria-hidden="true" />
              </a>
              <span className="text-stone-500"> — {cr.autor} · {cr.lic} · {cr.fuente}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Pantalla principal ─────────────────────────────────────────────────────── */
export default function CacaoScreen({ onBack, onNavigate = undefined }) {
  const [estacion, setEstacion] = useState('arbol');

  return (
    <ScreenShell title="El cacao" icon={Sprout} onBack={onBack}>
      <div className="max-w-2xl mx-auto p-4 space-y-4" data-testid="cacao-screen">
        {/* Nota de portada */}
        <div className="rounded-2xl border border-stone-700/60 bg-stone-900/50 p-4">
          <p className="text-xs italic leading-snug text-stone-400 text-center">
            El cacao hace un camino: nace del tronco, crece bajo el monte, se
            defiende de la monilia y termina en el cajón de fermento, donde se
            decide su sabor y su precio. Recórralo completo.
          </p>
        </div>

        {/* Navegación entre estaciones */}
        <div className="grid grid-cols-5 gap-1.5" role="tablist" aria-label="Estaciones del cacao">
          {ESTACIONES_CACAO.map((e) => {
            const activo = estacion === e.id;
            return (
              <button
                key={e.id}
                type="button"
                role="tab"
                aria-selected={activo}
                data-testid={`estacion-tab-${e.id}`}
                onClick={() => setEstacion(e.id)}
                className={`cacao-tab cacao-focus rounded-xl border px-1.5 py-2 text-center min-h-[56px] ${
                  activo
                    ? 'cacao-estacion-activa border-amber-500/70 bg-amber-500/15 text-amber-200'
                    : 'border-stone-700 bg-stone-900/50 text-stone-300 hover:border-stone-600 hover:bg-stone-800/60 active:bg-stone-800/70'
                }`}
              >
                <span className="block text-[13px] font-black leading-tight">{e.titulo}</span>
                <span className={`block text-[9px] leading-tight mt-0.5 ${activo ? 'text-amber-300/90' : 'text-stone-500'}`}>
                  {e.descripcion}
                </span>
              </button>
            );
          })}
        </div>

        {estacion === 'arbol' && <EstacionArbol />}
        {estacion === 'sombra' && <EstacionSombra onNavigate={onNavigate} />}
        {estacion === 'manejo' && <EstacionManejo />}
        {estacion === 'sanidad' && <EstacionSanidad />}
        {estacion === 'beneficio' && <EstacionBeneficio onNavigate={onNavigate} />}

        {/* Créditos de todas las fotos (cumplimiento licencia abierta) */}
        <CreditosFotos />

        {/* Puente al agente para lo que el mundo no alcanza */}
        {typeof onNavigate === 'function' && (
          <button
            type="button"
            data-testid="cacao-preguntar-agente"
            onClick={() => onNavigate('agente', { prefilledPrompt: '¿Cómo manejo la monilia en mi cultivo de cacao sin veneno?' })}
            className="cacao-enlace cacao-focus w-full flex items-center gap-3 rounded-2xl border border-stone-700/60 bg-stone-900/40 p-3.5 text-left hover:border-amber-600/50 hover:bg-stone-800/60 active:bg-stone-800/60"
          >
            <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Sprout size={20} className="text-amber-300" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-stone-100 leading-tight">¿Su caso es distinto?</span>
              <span className="block text-xs text-stone-400 leading-tight mt-0.5">Cuénteselo al agente: él conoce su finca, su clima y su clon.</span>
            </span>
            <ChevronRight size={18} className="cacao-enlace-chevron shrink-0 text-amber-400/70" aria-hidden="true" />
          </button>
        )}
      </div>
    </ScreenShell>
  );
}
