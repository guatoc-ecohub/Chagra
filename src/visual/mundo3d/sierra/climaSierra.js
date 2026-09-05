/*
 * climaSierra — traducción pequeña y pura del dato climático a parámetros
 * visuales de la SierraMonte3D. No inventa clima: sin señal, deja la escena
 * en su atmósfera base y no monta fenómenos.
 */

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function perfilClimaSierra(clima = null) {
  const senal = clima?.senal === true;
  const nubosidad = Number.isFinite(clima?.nubosidad)
    ? clamp01(clima.nubosidad / 100)
    : clima?.condicion === 'nublado' || clima?.condicion === 'niebla' ? 0.78 : 0;
  const lluvia = clima?.lluvia === true;
  const niebla = clima?.niebla === true;
  const helada = clima?.helada === true;
  const cobertura = senal
    ? Math.max(nubosidad, lluvia ? 0.86 : 0, niebla ? 0.9 : 0)
    : 0;

  return Object.freeze({
    senal,
    cobertura,
    lluvia,
    niebla,
    helada,
    nubes: senal && cobertura >= 0.18 ? Math.max(2, Math.round(3 + cobertura * 11)) : 0,
    intensidadLluvia: lluvia
      ? clima.lluviaMm == null ? 0.62 : clamp01(Math.max(0.25, clima.lluviaMm / 18))
      : 0,
    intensidadNiebla: niebla
      ? clima.nubosidad == null ? 0.7 : clamp01(Math.max(0.35, clima.nubosidad / 100))
      : 0,
    luzIntensidad: senal ? 1 - cobertura * 0.46 : 1,
  });
}

export default perfilClimaSierra;
