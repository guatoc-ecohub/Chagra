import React from 'react';
import {
  Hexagon, Flower2, HeartPulse, ShieldAlert, Recycle, Info, Droplets,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FuentesAnimal from './common/FuentesAnimal';
import ChecklistManejo from './common/ChecklistManejo';
import { SeccionAnimal, FichaAnimalHero } from './common/SeccionAnimal';

/**
 * AbejasScreen — vertical de abejas y apicultura del módulo Animales.
 *
 * Secciones:
 *   1. Colmenas (registro básico, tipo de abeja).
 *   2. Polinización de cultivos (el aporte clave a la finca).
 *   3. Productos: miel y cera.
 *   4. Sanidad real (varroa, loque) — sin inventar dosis: guía + "consulta".
 *   5. Aporte a tu finca (CICLO): la abeja NO da abono, da polinización.
 *
 * Fuentes: FEDEABEJA, ICA, FAO. Guarda real (animal-diagnostics.json): Apis
 * mellifera saquea colmenas de meliponas nativas (angelitas) — mantener
 * separación entre apiarios y meliponarios.
 */

// Capa visual compartida del módulo Animales (cinta + disco tonal + tokens).
const SeccionCard = SeccionAnimal;

// Tipos de abeja manejados en Colombia (FEDEABEJA, ICA).
const TIPOS = [
  { nombre: 'Apis mellifera (africanizada)', nota: 'Más miel y cera; defensiva. Necesita traje y manejo cuidadoso.' },
  { nombre: 'Angelita (Tetragonisca angustula)', nota: 'Melipona nativa SIN aguijón. Menos miel, miel medicinal, ideal cerca de casa.' },
  { nombre: 'Otras meliponas nativas', nota: 'Sin aguijón, gran valor para polinizar y conservar biodiversidad.' },
];

export default function AbejasScreen({ onBack, onHome }) {
  return (
    <ScreenShell title="Abejas y apicultura" icon={Hexagon} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">
        {/* Ficha de identidad del animal — emoji + produce + aporte, de un vistazo. */}
        <FichaAnimalHero
          emoji="🐝"
          titulo="Abejas y apicultura"
          descripcion="Las abejas te dan miel y cera, pero su mayor aporte es invisible: polinizan tus cultivos y mejoran el cuaje y la cosecha. Cuidarlas es cuidar tu finca entera."
          produce={[
            { emoji: '🍯', label: 'Miel' },
            { emoji: '🕯️', label: 'Cera' },
            { emoji: '🌸', label: 'Polinización' },
          ]}
          aporte="Aporte al ciclo: polinizan tus cultivos — más cuaje y más cosecha"
          tone={{
            border: 'border-yellow-600/40',
            bg: 'bg-gradient-to-br from-yellow-500/25 to-amber-400/10',
            halo: 'bg-yellow-400/20',
            chip: 'border-yellow-500/40 bg-yellow-500/15 text-yellow-100',
            aporte: 'text-yellow-300',
          }}
        />

        {/* 1. Colmenas */}
        <SeccionCard
          Icon={Info}
          color={{ border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200', bar: 'from-sky-400 to-cyan-300', disc: 'bg-sky-400/15' }}
          titulo="Tus colmenas"
        >
          <p>Anota lo básico de tu apiario:</p>
          <ul className="space-y-1">
            <li>• <span className="font-bold">Número de colmenas</span> y dónde están.</li>
            <li>• <span className="font-bold">Tipo de abeja</span> (ver abajo).</li>
            <li>• <span className="font-bold">Estado:</span> fuerte, débil, con reina, sin reina.</li>
            <li>• <span className="font-bold">Floración cercana</span> (qué hay en flor para que coman).</li>
          </ul>
          <div className="mt-2 space-y-1.5">
            {TIPOS.map((t) => (
              <div key={t.nombre} className="rounded-[var(--r-sm,12px)] bg-black/20 border border-slate-700/50 p-2.5">
                <p className="text-sm font-bold text-slate-100 leading-tight">{t.nombre}</p>
                <p className="mt-1 text-xs text-slate-300/90 leading-snug">{t.nota}</p>
              </div>
            ))}
          </div>
        </SeccionCard>

        {/* 2. Polinización */}
        <SeccionCard
          Icon={Flower2}
          color={{ border: 'border-fuchsia-700/40', bg: 'bg-fuchsia-900/20', text: 'text-fuchsia-200', bar: 'from-fuchsia-400 to-pink-300', disc: 'bg-fuchsia-400/15' }}
          titulo="Polinización de tus cultivos"
        >
          <p>
            Es el servicio más valioso de las abejas. Al visitar las flores,
            llevan el polen de una a otra y <span className="font-bold">mejoran el cuaje, el
            tamaño y la cantidad de frutos.</span>
          </p>
          <ul className="space-y-1">
            <li>• Cultivos que se benefician fuerte: <span className="font-bold">curuba, mora, gulupa, lulo, frutales y cucurbitáceas</span> (ahuyama, pepino). El café se autopoliniza, pero con abejas cuaja y rinde más.</li>
            <li>• Ubica las colmenas <span className="font-bold">cerca de los cultivos en floración</span>.</li>
            <li>• <span className="font-bold">No fumigues</span> con las flores abiertas: matas a tus polinizadoras.</li>
          </ul>
        </SeccionCard>

        {/* 3. Productos */}
        <SeccionCard
          Icon={Droplets}
          color={{ border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200', bar: 'from-amber-400 to-yellow-300', disc: 'bg-amber-400/15' }}
          titulo="Miel y cera"
        >
          <ul className="space-y-1.5">
            <li>
              <span className="font-bold text-amber-100">Miel:</span> cosecha solo el
              excedente; deja reservas para que la colmena pase épocas sin floración.
              Manéjala limpia y sin agua para que no fermente.
            </li>
            <li>
              <span className="font-bold text-amber-100">Cera:</span> de los panales
              viejos. Sirve para velas, jabón, ungüentos y para reciclar en láminas
              estampadas de nuevas colmenas.
            </li>
          </ul>
        </SeccionCard>

        {/* 4. Sanidad real */}
        <SeccionCard
          Icon={HeartPulse}
          color={{ border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200', bar: 'from-rose-400 to-pink-300', disc: 'bg-rose-400/15' }}
          titulo="Sanidad"
        >
          <p>
            Los problemas más serios de las colmenas. No te damos dosis ni
            productos: el manejo depende del tipo de abeja y de la época. Si la
            colmena se debilita o ves cría dañada,
            <span className="font-bold"> consulta a un apicultor con experiencia o al ICA.</span>
          </p>
          <ul className="space-y-2">
            <li>
              <span className="font-bold text-rose-100">Varroa (Varroa destructor):</span> ácaro
              que chupa a las abejas y a la cría; las debilita y transmite virus.
              Señales: abejas con alas deformes, colmena que se cae poco a poco.
              Manejo: revisión periódica, reinas resistentes y control según
              indique el técnico. Las abejas nativas sin aguijón casi no la sufren.
            </li>
            <li>
              <span className="font-bold text-rose-100">Loque (americana y europea):</span> enfermedad
              bacteriana de la cría. Señales: cría con mal olor, celdas hundidas y
              perforadas, larvas muertas pegajosas. La <span className="font-bold">loque americana</span> es
              muy grave y obliga a manejo estricto del material. Ante sospecha,
              aísla la colmena y consulta de inmediato.
            </li>
          </ul>
          <p className="flex items-start gap-2 mt-2 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Cuida a las nativas: la Apis mellifera saquea las colmenas de angelitas.
            Mantén separados los apiarios de Apis y los meliponarios.
          </p>
        </SeccionCard>

        {/* 5. Aporte a tu finca — CICLO (polinización, NO abono) */}
        <SeccionCard
          Icon={Recycle}
          color={{ border: 'border-lime-600/50', bg: 'bg-lime-900/25', text: 'text-lime-200', bar: 'from-lime-400 to-emerald-300', disc: 'bg-lime-400/15' }}
          titulo="Aporte a tu finca"
        >
          <p>
            A diferencia de gallinas y cerdos, las abejas <span className="font-bold">no dan
            abono</span>. Su aporte al ciclo de la finca es la
            <span className="font-bold"> polinización</span>: más flores visitadas, más frutos y
            mejor cosecha.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold my-1">
            <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-500/40">Abejas</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/40">Polinización</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Más cosecha</span>
          </div>
          <p className="text-xs text-slate-300/80">
            En campesino: si cuidas tus abejas, tus matas cuajan más y cosechas más.
            Son trabajadoras gratis de tu finca.
          </p>
        </SeccionCard>

        {/* Checklist interactivo de manejo apícola (local, sin backend) */}
        <ChecklistManejo
          titulo="Chequeo de tus colmenas"
          color={{ border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200' }}
          items={[
            'Las colmenas tienen agua limpia cerca.',
            'Hay floración disponible o les dejo reservas de miel.',
            'No fumigo con las flores abiertas.',
            'Reviso la colmena con periodicidad (reina, cría, fortaleza).',
            'Cosecho solo el excedente de miel.',
            'Mantengo separados los apiarios de Apis y los meliponarios.',
            'Ante cría con mal olor o colmena débil, aíslo y consulto.',
          ]}
        />

        {/* Fuentes / Saber más — enlaces públicos reales */}
        <FuentesAnimal
          claves={['fao', 'ica', 'agrosavia', 'sena']}
          nota="Ante problemas de sanidad de la colmena, consulta a un apicultor con experiencia o al ICA. Esta guía no reemplaza la asistencia profesional."
        />
      </div>
    </ScreenShell>
  );
}
