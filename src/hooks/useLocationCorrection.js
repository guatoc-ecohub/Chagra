import { useEffect, useState } from 'react';
import { saveProfile } from '../services/userProfileService';
import { summarizeProfileLocation } from '../services/locationDisplay';

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/**
 * Hook para correccion inline de barrio/vereda.
 *
 * @param {{
 *   profile?: object|null,
 *   onSave?: (nextProfile: object) => void,
 * }} [opts]
 * @returns {{
 *   tipo: 'barrio'|'vereda',
 *   sublocalidad: string,
 *   municipio: string,
 *   departamento: string,
 *   setTipo: (value: 'barrio'|'vereda') => void,
 *   setSublocalidad: (value: string) => void,
 *   setMunicipio: (value: string) => void,
 *   setDepartamento: (value: string) => void,
 *   reset: () => void,
 *   save: () => object,
 *   isDirty: boolean,
 *   canSave: boolean,
 * }}
 */
export function useLocationCorrection(opts = {}) {
  const profile = opts.profile && typeof opts.profile === 'object' ? opts.profile : {};
  const summary = summarizeProfileLocation(profile);
  const initial = {
    tipo: summary.tipo || 'vereda',
    sublocalidad: summary.sublocalidad || '',
    municipio: summary.municipio || '',
    departamento: summary.departamento || '',
  };

  const [tipo, setTipo] = useState(initial.tipo);
  const [sublocalidad, setSublocalidad] = useState(initial.sublocalidad);
  const [municipio, setMunicipio] = useState(initial.municipio);
  const [departamento, setDepartamento] = useState(initial.departamento);

  /* eslint-disable react-hooks/set-state-in-effect -- el formulario rehidrata
     sus campos cuando cambia el perfil base. */
  useEffect(() => {
    setTipo(initial.tipo);
    setSublocalidad(initial.sublocalidad);
    setMunicipio(initial.municipio);
    setDepartamento(initial.departamento);
  }, [initial.tipo, initial.sublocalidad, initial.municipio, initial.departamento]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isDirty =
    tipo !== initial.tipo ||
    sublocalidad !== initial.sublocalidad ||
    municipio !== initial.municipio ||
    departamento !== initial.departamento;

  const canSave = cleanText(sublocalidad).length > 0;

  const reset = () => {
    setTipo(initial.tipo);
    setSublocalidad(initial.sublocalidad);
    setMunicipio(initial.municipio);
    setDepartamento(initial.departamento);
  };

  const save = () => {
    const nextLocation = {
      tipo_sublocalidad: tipo,
      sublocalidad: cleanText(sublocalidad) || undefined,
      barrio: tipo === 'barrio' ? cleanText(sublocalidad) || undefined : undefined,
      vereda: tipo === 'vereda' ? cleanText(sublocalidad) || undefined : undefined,
      municipio: cleanText(municipio) || undefined,
      departamento: cleanText(departamento) || undefined,
      region:
        [cleanText(sublocalidad), cleanText(municipio), cleanText(departamento)]
          .filter(Boolean)
          .join(', ') || undefined,
    };
    const nextProfile = saveProfile(nextLocation);
    try {
      window.dispatchEvent(
        new CustomEvent('chagra:location-updated', {
          detail: {
            sublocalidad: nextLocation.sublocalidad || null,
            tipo: nextLocation.tipo_sublocalidad || null,
            municipio: nextLocation.municipio || null,
            departamento: nextLocation.departamento || null,
          },
        }),
      );
    } catch (_) {
      // noop
    }
    if (typeof opts.onSave === 'function') opts.onSave(nextProfile);
    return nextProfile;
  };

  return {
    tipo,
    sublocalidad,
    municipio,
    departamento,
    setTipo,
    setSublocalidad,
    setMunicipio,
    setDepartamento,
    reset,
    save,
    isDirty,
    canSave,
  };
}
