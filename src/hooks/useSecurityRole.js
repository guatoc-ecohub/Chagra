import { useCallback, useEffect, useState } from 'react';
import { can, currentSecurityRole, isNina } from '../services/roleService.js';
import { getRoster } from '../services/fincaRosterService.js';
import useFincaActiveStore from '../services/fincaActiveStore.js';

/**
 * useSecurityRole — hook reactivo del PLANO 2 (rol de seguridad) descrito en
 * `Chagra-strategy/ops/DISENO-FEDERACION-USUARIOS.md` §0.
 *
 * NO confundir con el `rol` de PRODUCTO de `userProfileService`
 * (campesino/ganadero/restaurador…, plano de UX). Este hook resuelve
 * "¿qué puedo hacer YO dentro de ESTA finca" — dueño/esposa/trabajador/niña/
 * asesor — y expone `can(permiso, resourceOwnerDid?)` para gatear botones
 * en toda la app (defense-in-depth cliente-side; el server manda cuando
 * exista `farm_did_auth`, ADR-036 Fase 2).
 *
 * Se re-evalúa cuando:
 *  - cambia el tenant activo (login/logout, evento `tenantChanged`),
 *  - cambia el roster de la finca activa (`chagra:roster-changed`, disparado
 *    por `fincaRosterService` tras addSubUser/updateSubUserRole/revokeSubUser),
 *  - cambia la finca activa (store `fincaActiveStore`, suscripción zustand).
 *
 * Offline-first: toda la resolución es local (localStorage), sin red.
 *
 * @returns {{
 *   role: 'dueno'|'esposa'|'trabajador'|'nina'|'asesor'|null,
 *   isNina: boolean,
 *   canManageUsers: boolean,
 *   canDeleteOwn: (kind: 'asset'|'log') => boolean,
 *   canDeleteAny: (kind: 'asset'|'log') => boolean,
 *   can: (permiso: string, resourceOwnerDid?: string) => boolean,
 *   roster: import('../services/fincaRosterService.js').FincaRoster,
 * }}
 */
export default function useSecurityRole() {
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const [version, setVersion] = useState(0);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('tenantChanged', bump);
    window.addEventListener('chagra:roster-changed', bump);
    return () => {
      window.removeEventListener('tenantChanged', bump);
      window.removeEventListener('chagra:roster-changed', bump);
    };
  }, [bump]);

  // Recalcular en cada cambio de finca activa o de versión (evento roster).
  // Sin memo agresivo: la resolución es O(usuarios de la finca), barata.
  const role = currentSecurityRole();
  const roster = getRoster(activeFincaSlug);
  const nina = isNina({ rol: role });

  const canFn = useCallback(
    (permiso, resourceOwnerDid) => can(undefined, permiso, resourceOwnerDid),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- se re-liga cuando cambia version/finca
    [version, activeFincaSlug]
  );

  return {
    role,
    isNina: nina,
    canManageUsers: canFn('user:manage'),
    canDeleteOwn: (kind) => canFn(`${kind}:delete:own`),
    canDeleteAny: (kind) => canFn(`${kind}:delete:any`),
    can: canFn,
    roster,
  };
}
