import React from 'react';
import {
  Home, Sprout, HeartPulse, ShieldAlert, Baby, Milk, Info, MountainSnow,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FotoAnimal from './animales/FotoAnimal';
import SeccionAnimal from './animales/SeccionAnimal';
import CicloCerrado from './animales/CicloCerrado';
import ChecklistManejo from './common/ChecklistManejo';
import FuentesAnimal from './common/FuentesAnimal';

/**
 * CaprinosScreen — vertical de CABRAS Y OVEJAS del módulo Animales, para el
 * pequeño productor. Rumiantes chicos: comen lo que la vaca no aprovecha
 * (ramoneo y rastrojo), dan leche, carne, lana/pelo y una majada seca fácil de
 * recoger. La cabra ramonea arbustos; la oveja pastorea pasto.
 *
 * Fichas didácticas:
 *   1. Alojamiento  — aprisco elevado y seco (evitar la humedad = pezuñas).
 *   2. Alimentación — ramoneo/pastoreo + bancos de proteína de la finca, con
 *      las guardas de la leucaena (tope 30% en rumiantes) y la cratylia.
 *   3. Sanidad      — parásitos (anemia/FAMACHA), pietín, mastitis; señales.
 *   4. Reproducción — gestación cabra ~150 / oveja ~147 días (groundeado).
 *   5. Aprovechamiento — leche/carne/lana + majada que cierra el ciclo.
 *
 * Grounding: src/data/animal-diagnostics.json (especies "caprino" y "ovino":
 * razas criollas Santandereana / Mora Colombiana / Pelibuey, gestación 150/147;
 * forrajeras leucaena/cratylia con su tope y guarda; guarda
 * "fitoterapia_gestacion"). Fuentes: ICA, AGROSAVIA, CIPAV, SENA. Sin dosis.
 */

const TONO = {
  alojamiento: { border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200' },
  alimento: { border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' },
  sanidad: { border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200' },
  reproduccion: { border: 'border-fuchsia-700/40', bg: 'bg-fuchsia-900/20', text: 'text-fuchsia-200' },
  aprovechamiento: { border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200' },
};

// Razas criollas colombianas y comunes, por propósito y piso térmico
// (groundeado en animal-diagnostics.json).
const RAZAS = [
  { animal: 'Cabra', nombre: 'Santandereana', proposito: 'Carne', clima: 'Cálido seco', nota: 'Criolla, muy rústica' },
  { animal: 'Cabra', nombre: 'Saanen', proposito: 'Leche', clima: 'Frío', nota: 'Buena productora de leche' },
  { animal: 'Oveja', nombre: 'Mora Colombiana', proposito: 'Lana', clima: 'Frío / páramo', nota: 'Criolla, lana oscura natural' },
  { animal: 'Oveja', nombre: 'Pelibuey', proposito: 'Carne', clima: 'Cálido', nota: 'De pelo, sin lana' },
];

export default function CaprinosScreen({ onBack, onHome, onNavigate }) {
  return (
    <ScreenShell title="Cabras y ovejas" icon={MountainSnow} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">

        {/* Hero photo-forward */}
        <FotoAnimal slug="cabra" alt="Cabra criolla en potrero" ratio="aspect-[16/9]" rounded="rounded-2xl" Fallback={MountainSnow}>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h1 className="text-xl font-black text-white drop-shadow">Cabras y ovejas</h1>
            <p className="text-sm text-white/85 leading-snug drop-shadow">
              Rumiantes chicos para el pequeño productor: leche, carne, lana y buen abono.
            </p>
          </div>
        </FotoAnimal>

        {/* Razas criollas */}
        <SeccionAnimal Icon={Info} tono={TONO.alojamiento} titulo="Razas para su clima">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-1.5 pr-2 font-bold">Animal</th>
                  <th className="py-1.5 pr-2 font-bold">Raza</th>
                  <th className="py-1.5 pr-2 font-bold">Para</th>
                  <th className="py-1.5 font-bold">Clima</th>
                </tr>
              </thead>
              <tbody>
                {RAZAS.map((r) => (
                  <tr key={`${r.animal}-${r.nombre}`} className="border-b border-slate-800/60 align-top">
                    <td className="py-1.5 pr-2 text-slate-300">{r.animal}</td>
                    <td className="py-1.5 pr-2 font-bold text-slate-100">{r.nombre}<span className="block text-[11px] font-normal text-slate-400">{r.nota}</span></td>
                    <td className="py-1.5 pr-2 text-amber-200">{r.proposito}</td>
                    <td className="py-1.5 text-slate-300/90">{r.clima}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-300/80">Prefiera la criolla de su zona: aguanta mejor el clima, las plagas y el manejo campesino.</p>
        </SeccionAnimal>

        {/* 1. Alojamiento */}
        <SeccionAnimal Icon={Home} tono={TONO.alojamiento} titulo="Alojamiento">
          <div className="overflow-hidden rounded-xl">
            <FotoAnimal slug="cabras" alt="Cabras pastoreando" ratio="aspect-[16/9]" Fallback={Home} />
          </div>
          <p>
            La humedad es la enemiga: les daña las pezuñas. El corral (aprisco) debe ser
            <span className="font-bold"> seco, ventilado y con sombra</span>.
          </p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Aprisco elevado con piso de listones</span> separados: el estiércol cae y las patas quedan secas.</li>
            <li>• <span className="font-bold">Techo y buena ventilación</span>, sin encharcamientos.</li>
            <li>• Comedero y bebedero limpios; <span className="font-bold">sal mineralizada</span> a disposición.</li>
            <li>• Buena cerca: la cabra <span className="font-bold">trepa y se arranca</span>. Rote los potreros para no pelar la tierra.</li>
          </ul>
        </SeccionAnimal>

        {/* 2. Alimentación */}
        <SeccionAnimal Icon={Sprout} tono={TONO.alimento} titulo="Alimentación">
          <p>
            La <span className="font-bold">cabra ramonea</span> (come hojas y arbustos altos) y la
            <span className="font-bold"> oveja pastorea</span> (come pasto del suelo). Aproveche los
            <span className="font-bold"> bancos de proteína</span> de la finca y guarde forraje para la sequía.
          </p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Buenos forrajes:</span> nacedero, botón de oro, matarratón (oréelo un día antes), morera, cratylia (banco de proteína para el verano).</li>
            <li>• <span className="font-bold">Sal mineralizada</span> y agua limpia siempre.</li>
            <li>• En sequía, tenga <span className="font-bold">heno o bancos de proteína</span> guardados.</li>
          </ul>
          <p className="flex items-start gap-2 mt-1 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-bold">Guarda de la leucaena:</span> en rumiantes se usa hasta un
              <span className="font-bold"> 30% máximo</span> de la dieta; en exceso es tóxica. Introdúzcala
              de a poco.
            </span>
          </p>
        </SeccionAnimal>

        {/* 3. Sanidad y señales */}
        <SeccionAnimal Icon={HeartPulse} tono={TONO.sanidad} titulo="Sanidad y señales de alarma">
          <p>
            El mayor problema de cabras y ovejas son los <span className="font-bold">parásitos internos</span>.
            No damos dosis: revise seguido y ante varios enfermos, <span className="font-bold">llame al veterinario o al ICA</span>.
          </p>
          <p className="font-bold text-rose-100">Señales de que algo anda mal:</p>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Encía u ojo pálido</span> (anemia): señal de lombrices (haemonchus). Es grave.</li>
            <li>• <span className="font-bold">Diarrea, flaqueza, pelo opaco:</span> parásitos o mala alimentación.</li>
            <li>• <span className="font-bold">Cojera y casco caliente</span> (pietín): por humedad; recorte y seque.</li>
            <li>• <span className="font-bold">Ubre caliente, dura o con grumos</span> (mastitis): revise la leche.</li>
            <li>• <span className="font-bold">Llagas o costras en la boca</span> (ectima): separe al animal, se contagia.</li>
          </ul>
          <p className="flex items-start gap-2 mt-1 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Prevención: <span className="font-bold">rote los potreros</span> para romper el ciclo de los
            parásitos, recorte las pezuñas, mantenga seco el aprisco y ponga en cuarentena a los animales nuevos.
          </p>
        </SeccionAnimal>

        {/* 4. Reproducción */}
        <SeccionAnimal Icon={Baby} tono={TONO.reproduccion} titulo="Reproducción (sencilla)">
          <ul className="space-y-1.5">
            <li>• Encaste a las hembras <span className="font-bold">a buen peso y desarrollo</span>, no muy jóvenes.</li>
            <li>• Gestación: <span className="font-bold">cabra ~150 días, oveja ~147 días</span>. Suelen parir una cría o mellizos.</li>
            <li>• Prepare un sitio seco y limpio para el parto; deje que la cría mame el <span className="font-bold">calostro</span> (primera leche) pronto.</li>
            <li>• <span className="font-bold">Cambie el macho</span> cada cierto tiempo para no cruzar familia (consanguinidad).</li>
          </ul>
          <p className="flex items-start gap-2 mt-1 text-rose-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-bold">En hembras preñadas</span> evite darles salvia, albahaca o
              granado (pueden hacerlas abortar). Ante cualquier duda, consulte al veterinario.
            </span>
          </p>
          <p className="text-xs text-slate-300/80">Gestación 150/147 días: datos de referencia (ICA, AGROSAVIA).</p>
        </SeccionAnimal>

        {/* 5. Aprovechamiento */}
        <SeccionAnimal Icon={Milk} tono={TONO.aprovechamiento} titulo="Aprovechamiento">
          <div className="overflow-hidden rounded-xl">
            <FotoAnimal slug="ovejas" alt="Ovejas pastoreando en potrero" ratio="aspect-[16/9]" Fallback={Milk} />
          </div>
          <ul className="space-y-1.5">
            <li>• <span className="font-bold">Leche de cabra:</span> fácil de digerir; para la casa o para queso.</li>
            <li>• <span className="font-bold">Carne:</span> de cabra y de oveja de pelo (Pelibuey), magra y de buena venta.</li>
            <li>• <span className="font-bold">Lana o pelo:</span> la oveja Mora da lana oscura natural.</li>
            <li>• <span className="font-bold">Majada (el estiércol en pelotitas):</span> abono seco excelente y fácil de recoger (ver abajo).</li>
          </ul>
        </SeccionAnimal>

        {/* Ciclo cerrado + salto al mundo del abono */}
        <CicloCerrado animalKey="caprinos" onNavigate={onNavigate} />

        {/* Chequeo de manejo */}
        <ChecklistManejo
          titulo="Chequeo del aprisco"
          items={[
            'El aprisco está seco, ventilado y con sombra.',
            'El piso deja caer el estiércol (patas secas).',
            'Hay sal mineralizada y agua limpia siempre.',
            'Roto los potreros para cortar el ciclo de parásitos.',
            'Reviso encías y ojos (color) para detectar anemia a tiempo.',
            'Recorto las pezuñas y evito los charcos.',
            'Los animales nuevos pasaron por cuarentena.',
            'Cambio el macho para no cruzar familia (consanguinidad).',
          ]}
        />

        {/* Aviso general de seguridad */}
        <div className="flex items-start gap-2 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-300">
          <Info size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
          <span>
            Guía general y segura para el pequeño productor; no reemplaza la asistencia de un
            técnico o veterinario. Para movilizar animales necesita el Registro Sanitario de Predio
            Pecuario (RSPP) del ICA.
          </span>
        </div>

        {/* Fuentes */}
        <FuentesAnimal
          claves={['ica', 'agrosavia', 'cipav', 'sena']}
          nota="Cría de cabras y ovejas: guía general (ICA, AGROSAVIA, CIPAV). Ante dudas de sanidad, dosis o tratamiento, consulte a un técnico o veterinario."
        />
      </div>
    </ScreenShell>
  );
}
