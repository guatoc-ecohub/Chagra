import React from 'react';
import {
  Bird, Egg, HeartPulse, ShieldAlert, Sprout, Recycle, Info,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FuentesAnimal from './common/FuentesAnimal';
import ChecklistManejo from './common/ChecklistManejo';
import { SeccionAnimal, FichaAnimalHero } from './common/SeccionAnimal';

/**
 * GallinasScreen — vertical de gallinas y aves de corral del módulo Animales.
 *
 * Secciones:
 *   1. Registro básico (cantidad, raza, ponedoras/engorde) — guía, sin captura
 *      a backend en esta versión (el seguimiento por lote vive en FarmProcess).
 *   2. Sanidad real (Newcastle, coccidiosis, parásitos) — enfermedades reales,
 *      sin inventar dosis: guía general + "consulta al técnico/ICA".
 *   3. Manejo (cama profunda, pastoreo rotacional / gallinas camperas).
 *   4. Producción (huevos, gallinaza).
 *   5. Aporte a tu finca (CICLO CERRADO): gallinaza → bocashi → suelo → planta.
 *
 * Fuentes: Fenavi, AGROSAVIA, ICA (Newcastle es de notificación obligatoria),
 * CIPAV (manejo agroecológico). El vínculo gallinaza→bocashi está groundeado en
 * catalog/biopreparados-seed.json (bocashi incluye gallinaza).
 */

// Capa visual compartida del módulo Animales (cinta + disco tonal + tokens).
const SeccionCard = SeccionAnimal;

// Razas reales colombianas / comunes, con propósito (Fenavi, AGROSAVIA).
const RAZAS = [
  { nombre: 'Criolla colombiana', proposito: 'Doble (huevo + carne)', nota: 'Rústica y resistente; pone menos que las líneas comerciales pero aguanta mejor el campo' },
  { nombre: 'Isa Brown / Lohmann', proposito: 'Ponedora', nota: 'Línea comercial de postura, muchos huevos' },
  { nombre: 'Cobb / Ross', proposito: 'Engorde', nota: 'Pollo de engorde, crece rápido' },
  { nombre: 'Pescuezo pelado', proposito: 'Doble', nota: 'Criolla, tolera bien el calor' },
];

export default function GallinasScreen({ onBack, onHome }) {
  return (
    <ScreenShell title="Gallinas y aves" icon={Bird} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">
        {/* Ficha de identidad del animal — emoji + produce + aporte, de un vistazo. */}
        <FichaAnimalHero
          emoji="🐔"
          titulo="Gallinas y aves de corral"
          descripcion="Las gallinas te dan huevos, carne y un abono de primera (la gallinaza). Bien manejadas, controlan plagas del suelo y cierran el ciclo de nutrientes de tu finca."
          produce={[
            { emoji: '🥚', label: 'Huevos' },
            { emoji: '🍗', label: 'Carne' },
            { emoji: '🌱', label: 'Gallinaza (abono)' },
          ]}
          aporte="Aporte al ciclo: la gallinaza es ingrediente del bocashi"
          tone={{
            border: 'border-amber-600/40',
            bg: 'bg-gradient-to-br from-amber-600/25 to-yellow-500/10',
            halo: 'bg-amber-400/20',
            chip: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
            aporte: 'text-amber-300',
          }}
        />

        {/* 1. Registro básico */}
        <SeccionCard
          Icon={Info}
          color={{ border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200', bar: 'from-sky-400 to-cyan-300', disc: 'bg-sky-400/15' }}
          titulo="Registro básico"
        >
          <p>Anota lo esencial de tu lote para hacerle seguimiento:</p>
          <ul className="space-y-1">
            <li>• <span className="font-bold">Cantidad</span> de aves.</li>
            <li>• <span className="font-bold">Raza o línea</span> (ver abajo).</li>
            <li>• <span className="font-bold">Propósito:</span> ponedoras (huevo) o engorde (carne).</li>
            <li>• <span className="font-bold">Edad</span> y fecha de entrada del lote.</li>
          </ul>
          {/* Razas como mini-fichas apiladas (más legibles en pantalla angosta
              que una tabla de 3 columnas). Propósito como chip pastilla. */}
          <div className="mt-2 space-y-1.5">
            {RAZAS.map((r) => (
              <div key={r.nombre} className="rounded-[var(--r-sm,12px)] bg-black/20 border border-slate-700/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-100 leading-tight">{r.nombre}</p>
                  <span className="shrink-0 px-2 py-0.5 rounded-[var(--r-pill,999px)] border border-amber-500/40 bg-amber-500/15 text-[10px] font-bold text-amber-200 leading-tight">
                    {r.proposito}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300/90 leading-snug">{r.nota}</p>
              </div>
            ))}
          </div>
        </SeccionCard>

        {/* 2. Sanidad real */}
        <SeccionCard
          Icon={HeartPulse}
          color={{ border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200', bar: 'from-rose-400 to-pink-300', disc: 'bg-rose-400/15' }}
          titulo="Sanidad"
        >
          <p>
            Las enfermedades más serias de las aves en Colombia. No te damos
            dosis: cada caso es distinto y la vacuna depende del lote. Si ves
            varias aves enfermas o muertas, <span className="font-bold">consulta al técnico o al ICA.</span>
          </p>
          <ul className="space-y-2">
            <li>
              <span className="font-bold text-rose-100">Newcastle:</span> virus muy
              contagioso (aves decaídas, torcedura de cuello, parálisis, diarrea
              verdosa, muchas muertes). Se previene con <span className="font-bold">vacunación</span> y
              bioseguridad. En Colombia es <span className="font-bold">de notificación obligatoria al ICA.</span>
            </li>
            <li>
              <span className="font-bold text-rose-100">Coccidiosis:</span> parásito del
              intestino (diarrea con sangre, aves erizadas, bajo consumo), sobre
              todo en pollos jóvenes con cama húmeda. Manejo: <span className="font-bold">cama seca</span>,
              densidad baja y agua limpia. El tratamiento (coccidiostato) lo
              define el técnico.
            </li>
            <li>
              <span className="font-bold text-rose-100">Parásitos:</span> internos
              (lombrices) y externos (piojillo, ácaros). Señales: plumas opacas,
              picazón, baja postura. Manejo: <span className="font-bold">limpieza del galpón</span>,
              ceniza/baño de tierra para que se desparasiten solas y revisión
              periódica. Desparasitante según indique el técnico.
            </li>
          </ul>
          <p className="flex items-start gap-2 mt-2 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Bioseguridad: aves nuevas en cuarentena, no mezcles lotes de distinta
            edad y desinfecta botas y manos al entrar al galpón.
          </p>
        </SeccionCard>

        {/* 3. Manejo */}
        <SeccionCard
          Icon={Sprout}
          color={{ border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200', bar: 'from-emerald-400 to-teal-300', disc: 'bg-emerald-400/15' }}
          titulo="Manejo agroecológico"
        >
          <ul className="space-y-2">
            <li>
              <span className="font-bold text-emerald-100">Cama profunda:</span> capa
              gruesa de cascarilla, viruta o tamo seco en el piso. Absorbe el
              estiércol, se mantiene seca y al final se convierte en abono
              (gallinaza compostada). Voltéala y agrega material seco si se humedece.
            </li>
            <li>
              <span className="font-bold text-emerald-100">Pastoreo rotacional / gallinas camperas:</span> mueve
              las aves por potreros o corrales rotativos. Comen pasto e insectos,
              abonan parejo y rompen el ciclo de plagas y parásitos del suelo.
            </li>
            <li>
              <span className="font-bold text-emerald-100">Sombra y agua fresca:</span> con
              calor fuerte (&gt;32&nbsp;°C) las aves se asfixian. Dales sombra,
              ventilación y agua limpia siempre.
            </li>
          </ul>
        </SeccionCard>

        {/* 4. Producción */}
        <SeccionCard
          Icon={Egg}
          color={{ border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200', bar: 'from-amber-400 to-yellow-300', disc: 'bg-amber-400/15' }}
          titulo="Producción"
        >
          <ul className="space-y-1.5">
            <li>
              <span className="font-bold text-amber-100">Huevos:</span> las ponedoras
              arrancan alrededor de las 18–20 semanas. Recoge varias veces al día,
              guarda en sitio fresco y limpio. Anota la postura para ver cómo va el lote.
            </li>
            <li>
              <span className="font-bold text-amber-100">Gallinaza:</span> es el abono
              que producen. Recógela seca de la cama profunda. <span className="font-bold">Compóstala
              o madúrala antes de usarla</span> (la gallinaza fresca quema las plantas
              y puede traer patógenos).
            </li>
          </ul>
        </SeccionCard>

        {/* 5. Aporte a tu finca — CICLO CERRADO */}
        <SeccionCard
          Icon={Recycle}
          color={{ border: 'border-lime-600/50', bg: 'bg-lime-900/25', text: 'text-lime-200', bar: 'from-lime-400 to-emerald-300', disc: 'bg-lime-400/15' }}
          titulo="Aporte a tu finca"
        >
          <p>
            La <span className="font-bold">gallinaza</span> es ingrediente del
            <span className="font-bold"> bocashi</span>, el abono fermentado base del
            plan de nutrición de tus plantas. Así se cierra el ciclo:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold my-1">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">Gallinas</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-stone-500/20 text-stone-200 border border-stone-500/40">Gallinaza</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-200 border border-orange-500/40">Bocashi</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/40">Suelo</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Planta</span>
          </div>
          <p className="text-xs text-slate-300/80">
            En campesino: la gallina come, abona la cama; esa gallinaza la mezclas
            en el bocashi y ese abono alimenta el suelo y tus matas. Menos gasto en
            abono comprado.
          </p>
        </SeccionCard>

        {/* Checklist interactivo de manejo (local, sin backend) */}
        <ChecklistManejo
          titulo="Chequeo del galpón"
          color={{ border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' }}
          items={[
            'La cama está seca y suelta (sin charcos ni amoníaco fuerte).',
            'Hay agua limpia y fresca disponible todo el día.',
            'Hay sombra y ventilación para los días de calor.',
            'Las aves nuevas pasaron por cuarentena antes de juntarlas.',
            'No mezclo lotes de muy distinta edad.',
            'Desinfecto botas y manos al entrar al galpón.',
            'Recojo los huevos varias veces al día y los guardo frescos.',
            'Maduro o composto la gallinaza antes de usarla en las matas.',
          ]}
        />

        {/* Fuentes / Saber más — enlaces públicos reales */}
        <FuentesAnimal
          claves={['fenavi', 'agrosavia', 'ica', 'cipav', 'sena']}
          nota="Newcastle es enfermedad de notificación obligatoria al ICA. Ante dudas de tratamiento o dosis, consulta a un técnico o veterinario."
        />
      </div>
    </ScreenShell>
  );
}
