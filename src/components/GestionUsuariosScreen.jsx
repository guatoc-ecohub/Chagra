import { useMemo, useState } from 'react';
import {
  Users, UserPlus, Pencil, Trash2, Info, Baby, Check, Lock,
} from 'lucide-react';
import { ScreenShell } from './common/ScreenShell';
import { ROLE_IDS } from '../config/roleCatalog.js';
import { canManage, currentSecurityRole } from '../services/roleService.js';
import {
  addSubUser, ensureOwnerBootstrapped, getRoster, revokeSubUser, updateSubUserRole,
} from '../services/fincaRosterService.js';
import { canAddSubUser, tierAllowsRole, TIERS } from '../services/tierService.js';
import useFincaActiveStore from '../services/fincaActiveStore.js';

/**
 * GestionUsuariosScreen — Gestión de usuarios DE LA FINCA (panel del dueño),
 * 2D-only (nunca 3D — regla dura del operador, mensajes 108-111).
 *
 * Reemplaza el mock `usuariosFincaService` (rama wip/fed-ui-usuarios,
 * abandonada) por el backend REAL ya en dev: `roleCatalog` (permisos
 * atómicos) + `roleService` (resolución de permisos, techo por rol) +
 * `fincaRosterService` (CRUD del roster, cupo + canManage) + `tierService`
 * (cupo de sub-usuarios por tier). Ver contratos exactos en
 * `Chagra-strategy/ops/DISENO-FEDERACION-USUARIOS.md` §6, pieza H.
 *
 * El dueño (o la esposa, con alcance degradado — no puede tocar dueño/otra
 * esposa) da de alta a las personas que trabajan o viven con él: su esposa,
 * un trabajador, sus hijos. Cada rol muestra su alcance EN PALABRAS DEL
 * CAMPO ("la niña puede jugar y aprender, no borra el trabajo"), nunca
 * jerga técnica de permisos.
 *
 * CASO NIÑA (requisito duro): el rol `nina` nunca tiene `*:delete:*` — ni
 * siquiera de lo propio (ver ROLE_DEFAULTS en roleCatalog.js). Esta pantalla
 * no puede otorgárselo: el selector de rol no ofrece overrides de permisos,
 * solo el rol cerrado del catálogo (ROLE_IDS), así que no hay forma de
 * escalarle un delete desde aquí. El enforcement duro (403 server-side) es
 * Fase 2 (farm_did_auth); esta pantalla + roleService.can() son la capa
 * cliente de defense-in-depth mientras tanto.
 *
 * Ruta: #usuarios. Entrada desde ProfileScreen → sección "Gestión de
 * usuarios" (mismo patrón `chagra:nav` que "Acompañamiento", ADR-048).
 *
 * Gate: solo se monta si el actor tiene `user:manage` (ver App.jsx). Esta
 * pantalla además re-verifica internamente (defense-in-depth doble).
 *
 * Offline-first. Español colombiano (usted, SIN voseo argentino).
 */

/* eslint-disable chagra-i18n/no-hardcoded-spanish */
const TXT_CANCELAR = 'Cancelar';
const TXT_NO_DEJAR = 'No, dejar';
const TXT_GUARDAR_CAMBIOS = 'Guardar cambios';
/* eslint-enable chagra-i18n/no-hardcoded-spanish */

/** Catálogo de roles en PALABRAS DEL CAMPO — el dueño lee esto al elegir. */
const ROL_INFO = {
  dueno: {
    label: 'Dueño/a',
    alcance: 'Ve y edita todo. Puede crear, cambiar o quitar otros usuarios de la finca.',
  },
  esposa: {
    label: 'Esposa/Esposo',
    alcance: 'Ve y registra todo lo de la finca, igual que el dueño. Puede crear trabajadores y niños, pero no borra usuarios ni toca al dueño.',
  },
  trabajador: {
    label: 'Trabajador/a',
    alcance: 'Registra las tareas del día (siembra, cosecha, riego). Ve el trabajo de todos, pero solo edita o borra lo suyo.',
  },
  nina: {
    label: 'Niña o niño',
    alcance: 'La niña puede jugar y aprender en Chagra, ve el mundo 3D y las lecciones, y puede registrar lo suyo. NUNCA puede borrar ni editar el trabajo real de otros — ni siquiera lo propio se borra de verdad, solo se oculta de su vista.',
  },
  asesor: {
    label: 'Asesor/a externo',
    alcance: 'Ve el trabajo de la finca (sin nombres, solo lo necesario) y puede comentar. No crea, no edita, no borra nada.',
  },
};

const ROL_ICONO = {
  dueno: Users,
  esposa: Users,
  trabajador: Users,
  nina: Baby,
  asesor: Users,
};

function RolBadge({ rolId }) {
  const info = ROL_INFO[rolId];
  const Icono = ROL_ICONO[rolId] || Users;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-700/40 bg-emerald-900/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
      <Icono size={13} aria-hidden="true" />
      {info?.label || rolId}
    </span>
  );
}

/** Formulario compartido crear/editar. onSubmit recibe { nombre, rol }. */
function UsuarioForm({
  initial = null, onSubmit, onCancel, submitLabel, rolesDisponibles, actorRole,
}) {
  const [nombre, setNombre] = useState(initial?.nombre || '');
  const [rol, setRol] = useState(initial?.rol || rolesDisponibles[0] || 'trabajador');
  const [error, setError] = useState(null);

  const rolInfo = ROL_INFO[rol];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Escriba el nombre de la persona.');
      return;
    }
    if (!canManage(actorRole, rol)) {
      setError('Su rol no le permite asignar ese rol.');
      return;
    }
    setError(null);
    onSubmit({ nombre: nombre.trim(), rol });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
      <div>
        <label htmlFor="usuario-nombre" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Nombre
        </label>
        <input
          id="usuario-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: David, María, Mariana…"
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400 min-h-[44px]"
          data-testid="usuario-form-nombre"
        />
      </div>

      <div>
        <span className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
          Rol
        </span>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Rol del usuario">
          {rolesDisponibles.map((rolId) => {
            const info = ROL_INFO[rolId];
            const Icono = ROL_ICONO[rolId] || Users;
            const selected = rol === rolId;
            const permitido = canManage(actorRole, rolId);
            return (
              <button
                key={rolId}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!permitido}
                onClick={() => permitido && setRol(rolId)}
                data-testid={`usuario-form-rol-${rolId}`}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                  !permitido
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : selected
                      ? 'border-emerald-500/70 bg-emerald-900/30 text-emerald-200'
                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500'
                }`}
              >
                <Icono size={16} aria-hidden="true" className="shrink-0" />
                {info?.label || rolId}
                {!permitido && <Lock size={12} className="ml-auto shrink-0" aria-hidden="true" />}
                {permitido && selected && <Check size={14} className="ml-auto shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
        {rolInfo && (
          <p className="mt-2 text-xs text-slate-400 leading-relaxed bg-slate-800/40 rounded-lg px-3 py-2">
            {rolInfo.alcance}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-300 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="usuario-form-submit"
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white text-sm font-bold py-2.5 min-h-[44px]"
        >
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-700/60 text-slate-300 text-sm font-bold px-4 py-2.5 min-h-[44px]"
          >
            {TXT_CANCELAR}
          </button>
        )}
      </div>
    </form>
  );
}

function UsuarioRow({
  usuario, onEditar, onQuitar, puedeGestionar,
}) {
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);
  const esNina = usuario.rol === 'nina';

  return (
    <li className="rounded-2xl border border-slate-700/60 bg-slate-900/40 p-4 flex flex-col gap-3" data-testid="usuario-row">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">{usuario.nombre || '(Sin nombre)'}</p>
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <RolBadge rolId={usuario.rol} />
            {esNina && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-700/40 bg-sky-900/20 px-2 py-0.5 text-[10px] text-sky-300">
                <Lock size={10} aria-hidden="true" /> No borra trabajo real
              </span>
            )}
          </div>
        </div>
        {puedeGestionar && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditar(usuario)}
              aria-label={`Cambiar rol de ${usuario.nombre}`}
              data-testid={`usuario-editar-${usuario.id}`}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Pencil size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoQuitar(true)}
              aria-label={`Quitar a ${usuario.nombre}`}
              data-testid={`usuario-quitar-${usuario.id}`}
              className="p-2.5 rounded-full bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {confirmandoQuitar && (
        <div className="rounded-xl border border-red-700/40 bg-red-900/20 p-3 flex flex-col gap-2">
          <p className="text-xs text-red-200">
            ¿Quitar a {usuario.nombre} de la finca? Ya no va a poder entrar a Chagra. Su
            trabajo registrado NO se borra — queda en la bitácora de la finca.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { onQuitar(usuario.id); setConfirmandoQuitar(false); }}
              data-testid={`usuario-confirmar-quitar-${usuario.id}`}
              className="flex-1 rounded-lg bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-2 min-h-[36px]"
            >
              Sí, quitar
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoQuitar(false)}
              className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 min-h-[36px]"
            >
              {TXT_NO_DEJAR}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** @param {{ onBack: () => void, onHome?: () => void }} props */
export default function GestionUsuariosScreen({ onBack, onHome }) {
  const fincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const actorRole = currentSecurityRole();

  // Lectura inicial síncrona (localStorage, sin red) — mismo patrón del
  // mock viejo: se resuelve dentro del inicializador de useState en vez de
  // un useEffect que llame setState al montar. `ensureOwnerBootstrapped`
  // garantiza que si esta es la primera vez que se abre la pantalla, el
  // tenant logueado ya existe como `dueno` en el roster (ver
  // fincaRosterService.ensureOwnerBootstrap).
  const [roster, setRoster] = useState(() => ensureOwnerBootstrapped(fincaSlug));
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [editando, setEditando] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const refrescar = () => setRoster(getRoster(fincaSlug));

  const usuarios = roster.usuarios.filter((u) => u.status !== 'revoked');
  const tier = TIERS[roster.tier] || TIERS.free;
  const rolesDisponibles = ROLE_IDS.filter((r) => tierAllowsRole(roster.tier, r));
  const puedeAgregar = canAddSubUser(roster);
  const puedeGestionar = !!actorRole && (actorRole === 'dueno' || actorRole === 'esposa');

  const totalPorRol = useMemo(() => {
    const acc = Object.fromEntries(ROLE_IDS.map((r) => [r, 0]));
    for (const u of usuarios) {
      if (acc[u.rol] != null) acc[u.rol] += 1;
    }
    return acc;
  }, [usuarios]);

  const handleCrear = ({ nombre, rol }) => {
    try {
      addSubUser(fincaSlug, { nombre, rol });
      setMostrandoForm(false);
      setErrorAccion(null);
      refrescar();
    } catch (e) {
      setErrorAccion(traducirError(e.message));
    }
  };

  const handleEditar = ({ rol }) => {
    if (!editando) return;
    try {
      updateSubUserRole(fincaSlug, editando.id, rol);
      setEditando(null);
      setErrorAccion(null);
      refrescar();
    } catch (e) {
      setErrorAccion(traducirError(e.message));
    }
  };

  const handleQuitar = (id) => {
    try {
      revokeSubUser(fincaSlug, id);
      refrescar();
    } catch (e) {
      setErrorAccion(traducirError(e.message));
    }
  };

  if (!puedeGestionar) {
    return (
      <ScreenShell title="Gestión de usuarios" icon={Users} onBack={onBack} onHome={onHome}>
        <div className="px-4 py-8 max-w-2xl mx-auto w-full text-center">
          <Lock size={32} className="text-slate-600 mx-auto mb-3" aria-hidden="true" />
          <p className="text-sm text-slate-300">
            Solo el dueño o la esposa/esposo pueden gestionar los usuarios de la finca.
          </p>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Gestión de usuarios" icon={Users} onBack={onBack} onHome={onHome}>
      <div className="flex flex-col gap-4 px-4 py-4 pb-8 max-w-2xl mx-auto w-full">
        <p className="text-sm text-slate-300 leading-relaxed">
          Cree un usuario para cada persona que trabaja o vive en su finca.
          Cada rol define qué puede ver y hacer en Chagra.
        </p>

        <div className="rounded-xl border border-sky-700/40 bg-sky-900/20 p-3 text-xs text-sky-200 flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            La niña puede jugar y aprender en el mundo de Chagra, no borra el
            trabajo real de nadie. Cada rol tiene su propio alcance — lo ve
            al elegirlo.
          </span>
        </div>

        {errorAccion && (
          <p role="alert" className="text-xs text-red-300 bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
            {errorAccion}
          </p>
        )}

        {!mostrandoForm && !editando && (
          <button
            type="button"
            onClick={() => setMostrandoForm(true)}
            disabled={!puedeAgregar}
            data-testid="usuario-nuevo-btn"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-all text-white text-sm font-bold py-3 min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus size={18} aria-hidden="true" />
            {puedeAgregar ? 'Nuevo usuario' : `Cupo lleno (${tier.maxSubUsers} en su plan)`}
          </button>
        )}

        {mostrandoForm && (
          <UsuarioForm
            onSubmit={handleCrear}
            onCancel={() => { setMostrandoForm(false); setErrorAccion(null); }}
            submitLabel="Crear usuario"
            rolesDisponibles={rolesDisponibles}
            actorRole={actorRole}
          />
        )}

        {editando && (
          <UsuarioForm
            initial={editando}
            onSubmit={handleEditar}
            onCancel={() => { setEditando(null); setErrorAccion(null); }}
            submitLabel={TXT_GUARDAR_CAMBIOS}
            rolesDisponibles={rolesDisponibles}
            actorRole={actorRole}
          />
        )}

        <div className="flex flex-wrap gap-2">
          {ROLE_IDS.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-300"
            >
              {ROL_INFO[r]?.label || r}: <strong className="text-white">{totalPorRol[r] || 0}</strong>
            </span>
          ))}
        </div>

        {usuarios.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/30 p-8 text-center">
            <Users size={32} className="text-slate-600 mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-300 mb-1">
              Todavía no hay usuarios en su finca
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Toque &quot;Nuevo usuario&quot; para dar de alta a la primera persona.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {usuarios.map((u) => (
              <UsuarioRow
                key={u.id}
                usuario={u}
                puedeGestionar={canManage(actorRole, u.rol)}
                onEditar={(user) => { setEditando(user); setMostrandoForm(false); setErrorAccion(null); }}
                onQuitar={handleQuitar}
              />
            ))}
          </ul>
        )}
      </div>
    </ScreenShell>
  );
}

/** Traduce mensajes de error técnicos de fincaRosterService a lenguaje de campo. */
/* eslint-disable chagra-i18n/no-hardcoded-spanish -- mapa de traducción, no JSX */
function traducirError(message) {
  const traducciones = {
    'tier capacity exceeded': 'Su plan ya tiene el máximo de usuarios permitido.',
    'tier does not allow this role': 'Su plan no permite ese rol. Mejore su plan para usarlo.',
    'tier does not allow delegation': 'Su plan no permite invitar asesores externos.',
    'actor cannot manage this role': 'Su rol no le permite gestionar ese usuario.',
    'invalid role': 'Escoja un rol válido de la lista.',
    'invalid subuser id': 'No se encontró ese usuario.',
    'subuser not found': 'No se encontró ese usuario.',
    'subuser revoked': 'Ese usuario ya fue quitado de la finca.',
    'roster actor not available': 'No se pudo identificar quién está haciendo el cambio. Inicie sesión de nuevo.',
  };
  return traducciones[message] || 'No se pudo completar la acción. Intente de nuevo.';
}
/* eslint-enable chagra-i18n/no-hardcoded-spanish */
