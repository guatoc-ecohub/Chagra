import React from 'react';
import {
  Rabbit, Home, Sprout, HeartPulse, ShieldAlert, Baby, Beef, Info,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FotoAnimal from './animales/FotoAnimal';
import SeccionAnimal from './animales/SeccionAnimal';
import CicloCerrado from './animales/CicloCerrado';
import ChecklistManejo from './common/ChecklistManejo';
import FuentesAnimal from './common/FuentesAnimal';

/**
 * ConejosScreen — vertical de CONEJOS (cunicultura) del módulo Animales, para
 * el pequeño productor. El conejo es cría barata: cabe en un patio, come
 * forraje de la finca, se reproduce rápido y da carne magra y un abono de
 * primera (la conejaza).
 *
 * Fichas didácticas (el orden que pide toda cría campesina):
 *   1. Alojamiento  — jaula/conejera elevada, seca y ventilada.
 *   2. Alimentación — forraje + fibra, aprovechando residuos de la finca, con
 *      la GUARDA de la leucaena (PROHIBIDA fresca a conejos: mimosina).
 *   3. Sanidad      — señales de enfermedad y prevención (sin dosis).
 *   4. Reproducción — gestación ~30 días, nidal, destete (dato groundeado).
 *   5. Aprovechamiento — carne + conejaza que cierra el ciclo del abono.
 *
 * Grounding: src/data/animal-diagnostics.json (especie "cunicola", gestación 30
 * días, raza Nueva Zelanda Blanco; guarda "leucaena_toxica"). Fuentes: ICA,
 * AGROSAVIA, CIPAV, SENA. NO se dan dosis ni tratamientos: se remata en
 * "consulte al técnico o veterinario".
 */

const TONO = {
  alojamiento: { border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200' },
  alimento: { border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' },
  sanidad: { border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200' },
  reproduccion: { border: 'border-fuchsia-700/40', bg: 'bg-fuchsia-900/20', text: 'text-fuchsia-200' },
  aprovechamiento: { border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200' },
};

export default function ConejosScreen({ onBack, onHome, onNavigate }) {
  return (
    <ScreenShell title="Conejos" icon={Rabbit} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">

        {/* Hero photo-forward */}
        <FotoAnimal slug="conejos" alt="Conejera de malla elevada en un patio" ratio="aspect-[16/9]" rounded="rounded-2xl" Fallback={Rabbit}>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h1 className="text-xl font-black text-white drop-shadow">Conejos de patio</h1>
            <p className="text-sm text-white/85 leading-snug drop-shadow">
              Poco espacio, forraje de la finca y carne magra. Empiece con pocos y crezca despacio.
            </p>
          </div>
        </FotoAnimal>

        {/* 1. Alojamiento */}
        <SeccionAnimal Icon={Home} tono={TONO.alojamiento} titulo="Alojamiento">
          <p>
            El conejo necesita estar <span className="font-bold">seco, fresco y a la sombra</span>. La
            humedad y el calor fuerte lo enferman y lo matan.
          </p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Jaula o conejera elevada</span> (a la altura de la cintura): así el estiércol y la orina caen al piso y el animal queda seco.</li>
            <li>• <span className="font-bold">Piso de malla o listones</span> separados, para que no se acumule el excremento.</li>
            <li>• <span className="font-bold">Sombra y ventilación</span>, sin corrientes de aire directas. El conejo aguanta mejor el frío que el calor (&gt;30&nbsp;°C es peligroso).</li>
            <li>• <span className="font-bold">Protéjalo de perros, gatos, culebras y ratas</span>: malla fina y buen cierre.</li>
            <li>• Un <span className="font-bold">nidal</span> (cajón con paja) para que la coneja tenga los gazapos.</li>
          </ul>
        </SeccionAnimal>

        {/* 2. Alimentación — aprovechar residuos de la finca */}
        <SeccionAnimal Icon={Sprout} tono={TONO.alimento} titulo="Alimentación">
          <div className="overflow-hidden rounded-xl">
            <FotoAnimal slug="conejo-forraje" alt="Conejo comiendo pasto verde" ratio="aspect-[16/9]" Fallback={Sprout} />
          </div>
          <p>
            El conejo aprovecha lo que da la finca: <span className="font-bold">forraje verde y hojas</span>,
            más <span className="font-bold">fibra seca (heno, pasto seco)</span> que le mantiene sano el
            diente y la barriga. El agua limpia nunca puede faltar.
          </p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Buenos forrajes:</span> morera (excelente), nacedero, botón de oro, pasto de corte, hojas de zanahoria, cáscaras y sobras de la huerta bien lavadas.</li>
            <li>• <span className="font-bold">Fibra siempre:</span> heno o pasto seco a voluntad. Sin fibra se le tapa la digestión.</li>
            <li>• Introduzca los verdes <span className="font-bold">de a poco</span> y nunca mojados ni recalentados (dan diarrea y timpanismo).</li>
          </ul>
          <p className="flex items-start gap-2 mt-1 text-rose-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-bold">Cuidado — leucaena PROHIBIDA:</span> la leucaena fresca es
              tóxica para el conejo (la mimosina le causa caída de pelo y daños graves). No se la dé.
            </span>
          </p>
          <p className="text-xs text-slate-300/80">
            Así aprovecha los residuos de la finca y gasta menos en concentrado. Lo que sobra del
            corte y las cáscaras alimentan al conejo; lo del conejo vuelve al suelo (ver abajo).
          </p>
        </SeccionAnimal>

        {/* 3. Sanidad y señales de enfermedad */}
        <SeccionAnimal Icon={HeartPulse} tono={TONO.sanidad} titulo="Sanidad y señales de alarma">
          <p>
            Revise sus conejos todos los días. No damos dosis: cada caso es distinto. Si ve varios
            enfermos o muertos, <span className="font-bold">consulte al técnico o veterinario</span>.
          </p>
          <p className="font-bold text-rose-100">Señales de que algo anda mal:</p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Diarrea o no come</span> (sobre todo en gazapos): urgente, casi siempre por comida mojada, sucia o cambios bruscos.</li>
            <li>• <span className="font-bold">Moco, estornudos, respiración con ruido:</span> resfriado / pasteurelosis; separe al enfermo.</li>
            <li>• <span className="font-bold">Costras en las orejas o sarna</span> (ácaros): pica y se rasca mucho.</li>
            <li>• <span className="font-bold">Barriga hinchada y dura</span> (timpanismo): por exceso de verde tierno o mojado.</li>
            <li>• <span className="font-bold">Llagas en las patas</span> por piso muy duro o sucio.</li>
          </ul>
          <p className="flex items-start gap-2 mt-1 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Prevención: jaula limpia y seca, cuarentena a los animales nuevos y agua siempre fresca.
            Vale más prevenir que curar.
          </p>
        </SeccionAnimal>

        {/* 4. Manejo reproductivo simple */}
        <SeccionAnimal Icon={Baby} tono={TONO.reproduccion} titulo="Reproducción (sencilla)">
          <div className="overflow-hidden rounded-xl">
            <FotoAnimal slug="gazapos" alt="Gazapos recién nacidos" ratio="aspect-[16/9]" Fallback={Baby} />
          </div>
          <ul className="space-y-1.5">
            <li>• Se lleva la <span className="font-bold">hembra al macho</span> (nunca al revés) y se retira apenas monta.</li>
            <li>• La coneja pare a los <span className="font-bold">~30 días</span> de gestación. Ponga el nidal con paja unos días antes.</li>
            <li>• Cada camada trae varios gazapos; nacen sin pelo y con ojos cerrados. No los toque de más los primeros días.</li>
            <li>• <span className="font-bold">Destete a las 4–6 semanas.</span> Deje descansar a la coneja entre camadas.</li>
            <li>• <span className="font-bold">No cruce hermanos ni padres con hijos</span> (consanguinidad): salen débiles. Cambie de macho.</li>
          </ul>
          <p className="text-xs text-slate-300/80">
            Gestación ~30 días: dato de referencia (ICA). Ante partos con problemas o muchas
            muertes, es tema del veterinario.
          </p>
        </SeccionAnimal>

        {/* 5. Aprovechamiento */}
        <SeccionAnimal Icon={Beef} tono={TONO.aprovechamiento} titulo="Aprovechamiento">
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Carne magra:</span> baja en grasa, buena proteína para la casa o para vender. La raza de carne más común es la Nueva Zelanda Blanco.</li>
            <li>• <span className="font-bold">Piel:</span> se puede aprovechar si la sabe curtir.</li>
            <li>• <span className="font-bold">Conejaza (el estiércol):</span> uno de los mejores abonos de la finca (ver abajo).</li>
          </ul>
        </SeccionAnimal>

        {/* Ciclo cerrado + salto al mundo del abono */}
        <CicloCerrado animalKey="conejos" onNavigate={onNavigate} />

        {/* Chequeo de manejo */}
        <ChecklistManejo
          titulo="Chequeo de la conejera"
          items={[
            'La jaula está seca y limpia (sin acumulación de estiércol).',
            'Hay sombra, ventilación y protección del calor.',
            'Hay fibra (heno o pasto seco) y agua limpia siempre.',
            'Introduzco los forrajes verdes de a poco y nunca mojados.',
            'No doy leucaena fresca a los conejos.',
            'Los animales nuevos pasaron por cuarentena.',
            'La coneja tiene su nidal con paja antes de parir.',
            'Cambio de macho para no cruzar familia (consanguinidad).',
          ]}
        />

        {/* Aviso general de seguridad */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-300">
          <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            Esta es una guía general y segura para el pequeño productor. No reemplaza la asistencia
            de un técnico o veterinario. Para movilizar animales necesita el Registro Sanitario de
            Predio Pecuario (RSPP) del ICA.
          </span>
        </div>

        {/* Fuentes */}
        <FuentesAnimal
          claves={['ica', 'agrosavia', 'cipav', 'sena']}
          nota="Cría de conejos: guía general (ICA, AGROSAVIA, CIPAV). Ante dudas de sanidad, dosis o tratamiento, consulte a un técnico o veterinario."
        />
      </div>
    </ScreenShell>
  );
}
