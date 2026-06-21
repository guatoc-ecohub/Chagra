import React from 'react';
import {
  Beef, Milk, HeartPulse, ShieldAlert, Sprout, Recycle, Info, Trees,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import FuentesAnimal from './common/FuentesAnimal';
import ChecklistManejo from './common/ChecklistManejo';

/**
 * VacasScreen — vertical de ganado bovino del módulo Animales.
 *
 * Secciones (mismo patrón que GallinasScreen / AbejasScreen):
 *   1. Registro básico (cantidad, raza, propósito leche/carne/doble).
 *   2. Sanidad real (fiebre aftosa = notificación obligatoria al ICA, mastitis,
 *      parásitos gastrointestinales y garrapatas) — sin inventar dosis: guía
 *      general + "consulta al técnico / al ICA".
 *   3. Manejo (pastoreo rotacional y SILVOPASTOREO — enlaza al proceso de
 *      seguimiento de silvopastoreo que YA existe, no se duplica).
 *   4. Producción (leche, bovinaza / boñiga).
 *   5. Aporte a tu finca (CICLO CERRADO): boñiga → biol (el biol tradicional de
 *      Restrepo se hace con boñiga de vaca) → suelo → planta.
 *
 * Fuentes: ICA (fiebre aftosa es de notificación obligatoria, Colombia es país
 * libre con vacunación), AGROSAVIA, FEDEGAN, CIPAV (silvopastoreo). El vínculo
 * boñiga→biol está groundeado en catalog/biopreparados-seed.json: el biol lleva
 * "estiércol fresco (vaca/cabra)" y el supermagro lleva "estiércol vaca"
 * (ambos atribuidos a Restrepo Rivera).
 */

function SeccionCard({ Icon, color, titulo, children }) {
  return (
    <section className={`rounded-2xl border ${color.border} ${color.bg} p-4`}>
      <h2 className={`flex items-center gap-2 text-base font-bold ${color.text}`}>
        {Icon && <Icon size={18} aria-hidden="true" />}
        {titulo}
      </h2>
      <div className="mt-2 text-sm text-slate-200/90 leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

// Razas reales manejadas en Colombia, con propósito (AGROSAVIA, FEDEGAN).
const RAZAS = [
  { nombre: 'Holstein', proposito: 'Leche', nota: 'Mucha leche; va mejor en clima frío (tierra fría / lechería de altura)' },
  { nombre: 'Normando', proposito: 'Doble (leche + carne)', nota: 'Rústica, buena en clima frío y medio' },
  { nombre: 'Brahman (cebú)', proposito: 'Carne', nota: 'Aguanta calor y garrapata; base de la ganadería de tierra caliente' },
  { nombre: 'Criollo (BON, Romosinuano, Costeño)', proposito: 'Doble', nota: 'Razas criollas colombianas, rústicas y bien adaptadas' },
  { nombre: 'Gyr / Girolando', proposito: 'Leche en trópico', nota: 'Leche con tolerancia al calor; cruces lecheros de clima cálido' },
];

export default function VacasScreen({ onBack, onHome, onNavigate }) {
  const go = onNavigate || (() => {});
  return (
    <ScreenShell title="Vacas y ganado" icon={Beef} onBack={onBack} onHome={onHome}>
      <div className="px-4 pt-4 pb-10 max-w-2xl mx-auto space-y-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          Las vacas te dan leche y carne, y además la boñiga (bovinaza) es uno de
          los mejores abonos de la finca. Bien manejadas, con árboles y pasto, el
          ganado cuida el suelo en vez de dañarlo.
        </p>

        {/* 1. Registro básico */}
        <SeccionCard
          Icon={Info}
          color={{ border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200' }}
          titulo="Registro básico"
        >
          <p>Anota lo esencial de tu ganado para hacerle seguimiento:</p>
          <ul className="space-y-1">
            <li>• <span className="font-bold">Cantidad</span> de animales.</li>
            <li>• <span className="font-bold">Raza o cruce</span> (ver abajo).</li>
            <li>• <span className="font-bold">Propósito:</span> leche, carne o doble propósito.</li>
            <li>• <span className="font-bold">Edad y estado:</span> ternero, levante, vaca de cría, vaca en producción.</li>
          </ul>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="py-1.5 pr-2 font-bold">Raza / cruce</th>
                  <th className="py-1.5 pr-2 font-bold">Propósito</th>
                  <th className="py-1.5 font-bold">Nota</th>
                </tr>
              </thead>
              <tbody>
                {RAZAS.map((r) => (
                  <tr key={r.nombre} className="border-b border-slate-800/60 align-top">
                    <td className="py-1.5 pr-2 font-bold text-slate-100">{r.nombre}</td>
                    <td className="py-1.5 pr-2 text-amber-200">{r.proposito}</td>
                    <td className="py-1.5 text-slate-300/90">{r.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SeccionCard>

        {/* 2. Sanidad real */}
        <SeccionCard
          Icon={HeartPulse}
          color={{ border: 'border-rose-700/40', bg: 'bg-rose-900/20', text: 'text-rose-200' }}
          titulo="Sanidad"
        >
          <p>
            Los problemas de salud más serios del ganado en Colombia. No te damos
            dosis: la vacuna y el tratamiento dependen del animal y de la zona. Si
            ves varios animales enfermos, <span className="font-bold">consulta al técnico, al veterinario o al ICA.</span>
          </p>
          <ul className="space-y-2">
            <li>
              <span className="font-bold text-rose-100">Fiebre aftosa:</span> virus
              muy contagioso (babeo, ampollas en boca, lengua y patas, cojera, baja
              de leche). Colombia es país libre <span className="font-bold">con vacunación</span>: cumple
              los ciclos de vacunación de la zona. Ante cualquier sospecha,
              <span className="font-bold"> es de notificación OBLIGATORIA e inmediata al ICA</span> — no
              muevas los animales y avisa de una vez.
            </li>
            <li>
              <span className="font-bold text-rose-100">Mastitis:</span> inflamación
              de la ubre (leche con grumos o sangre, ubre caliente e hinchada, baja
              de producción). Se previene con <span className="font-bold">ordeño limpio</span>: manos
              y pezones limpios, sellado del pezón y cama seca. El tratamiento lo
              define el veterinario; respeta el tiempo de retiro de la leche.
            </li>
            <li>
              <span className="font-bold text-rose-100">Parásitos gastrointestinales y garrapatas:</span> lombrices
              internas (animal flaco, pelo opaco, diarrea) y garrapatas externas
              que chupan sangre y transmiten enfermedades (fiebre de garrapata).
              Manejo: <span className="font-bold">pastoreo rotacional</span> para cortar el ciclo,
              revisión periódica y desparasitación según indique el técnico (no
              abuses de los químicos: crean resistencia).
            </li>
          </ul>
          <p className="flex items-start gap-2 mt-2 text-amber-200 font-semibold">
            <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Animales nuevos en cuarentena, al día con vacunación (aftosa, brucelosis)
            y con guía de movilización (ICA) al comprar o vender. Así proteges todo el hato.
          </p>
        </SeccionCard>

        {/* 3. Manejo — pastoreo rotacional + SILVOPASTOREO (enlaza al proceso) */}
        <SeccionCard
          Icon={Sprout}
          color={{ border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' }}
          titulo="Manejo agroecológico"
        >
          <ul className="space-y-2">
            <li>
              <span className="font-bold text-emerald-100">Pastoreo rotacional:</span> divide
              el potrero y mueve el ganado por franjas. El pasto descansa y rebrota,
              comen parejo, el suelo no se compacta y se rompe el ciclo de parásitos.
            </li>
            <li>
              <span className="font-bold text-emerald-100">Silvopastoreo:</span> juntar
              árboles + pasto + ganado. Los árboles (leucaena, botón de oro, nacedero)
              dan sombra, forraje y nitrógeno, y protegen el agua. La vaca come mejor,
              sufre menos calor y la finca produce más sin tumbar monte.
            </li>
          </ul>
          {/* Enlace al PROCESO de seguimiento de silvopastoreo que YA existe
              (seguimientoProcesos.js → key 'silvopastoreo', ruta
              'seguimiento_silvopastoreo'). NO se duplica el contenido aquí. */}
          <button
            type="button"
            onClick={() => go('seguimiento_silvopastoreo')}
            className="mt-1 w-full rounded-xl border border-emerald-600/50 bg-emerald-950/40 p-3 flex items-center gap-2.5 text-left hover:border-emerald-500 transition-colors"
          >
            <Trees size={20} className="shrink-0 text-emerald-300" aria-hidden="true" />
            <span className="text-sm text-emerald-100 flex-1">
              <span className="font-bold">Lleva tu silvopastoreo.</span> Inicia y haz
              seguimiento al sistema de árboles, pasto y ganado de tu finca.
            </span>
          </button>
        </SeccionCard>

        {/* 4. Producción */}
        <SeccionCard
          Icon={Milk}
          color={{ border: 'border-amber-700/40', bg: 'bg-amber-900/20', text: 'text-amber-200' }}
          titulo="Producción"
        >
          <ul className="space-y-1.5">
            <li>
              <span className="font-bold text-amber-100">Leche:</span> ordeña limpio
              (ubre y manos lavadas), filtra y enfría pronto para que no se corte.
              Anota los litros por día para ver cómo va cada vaca y el hato.
            </li>
            <li>
              <span className="font-bold text-amber-100">Bovinaza / boñiga:</span> el
              estiércol de la vaca es un abono de primera. Recógela de los corrales y
              de las áreas de descanso. <span className="font-bold">Madúrala o compóstala antes
              de aplicarla</span> (la boñiga fresca puede quemar y traer parásitos), o
              úsala en el biol y el bocashi.
            </li>
          </ul>
        </SeccionCard>

        {/* 5. Aporte a tu finca — CICLO CERRADO (boñiga → biol → suelo → planta) */}
        <SeccionCard
          Icon={Recycle}
          color={{ border: 'border-lime-600/50', bg: 'bg-lime-900/25', text: 'text-lime-200' }}
          titulo="Aporte a tu finca"
        >
          <p>
            La <span className="font-bold">boñiga (bovinaza)</span> es el estiércol clásico
            del <span className="font-bold">biol</span>: el biol tradicional de Restrepo se hace
            con boñiga de vaca. También sirve para el bocashi y el compost. Así se
            cierra el ciclo:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold my-1">
            <span className="px-2.5 py-1 rounded-full bg-orange-500/20 text-orange-200 border border-orange-500/40">Vacas</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-stone-500/20 text-stone-200 border border-stone-500/40">Boñiga / bovinaza</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/40">Biol y bocashi</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-200 border border-teal-500/40">Suelo</span>
            <span aria-hidden="true" className="text-lime-300">→</span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">Planta</span>
          </div>
          <p className="text-xs text-slate-300/80">
            En campesino: la vaca come pasto, suelta la boñiga; esa boñiga la
            fermentas en el biol (y la metes al bocashi) y ese abono alimenta el
            suelo y tus matas. Menos gasto en abono comprado y un suelo más vivo.
          </p>
        </SeccionCard>

        {/* Checklist interactivo de manejo del hato (local, sin backend) */}
        <ChecklistManejo
          titulo="Chequeo del hato"
          color={{ border: 'border-emerald-700/40', bg: 'bg-emerald-900/20', text: 'text-emerald-200' }}
          items={[
            'Estoy al día con los ciclos de vacunación (aftosa, brucelosis) de la zona.',
            'Roto el potrero para que el pasto descanse y rebrote.',
            'Hay sombra (árboles) y agua limpia en el potrero.',
            'Animales nuevos pasan por cuarentena antes de juntarlos.',
            'Compro y vendo con guía de movilización del ICA.',
            'Ordeño limpio: manos y pezones limpios, sellado del pezón.',
            'Respeto el tiempo de retiro de la leche tras un tratamiento.',
            'Maduro o composto la boñiga antes de aplicarla a las matas.',
          ]}
        />

        {/* Fuentes / Saber más — enlaces públicos reales */}
        <FuentesAnimal
          claves={['ica', 'agrosavia', 'fedegan', 'cipav', 'sena']}
          nota="La fiebre aftosa es de notificación obligatoria e inmediata al ICA. Ante dudas de tratamiento o dosis, consulta a un técnico o veterinario."
        />
      </div>
    </ScreenShell>
  );
}
