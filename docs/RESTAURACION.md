# Módulo RESTAURACIÓN — ecológica + PSA + carbono

> Fuente: DR-RESTAURACION-1 (2/3 Gemini+Meta, 2026-06-11). IAvH, MinAmbiente, Ley 1930/2018, CIPAV, UICN.

## Datos

`src/data/restauracion.json`, `restauracion-especies.json`, `psa.json`, `carbono-alertas.json`, `biodiversidad-indicadores.json`

## Guardas

- Pino/eucalipto NO es restauración
- Alerta BONOS DE CARBONO (contratos 30-100 años, intermediarios 60-80%)
- Páramo → restauración PASIVA + Ley 1930
- Retamo NO quemar (rebrota)
- Densidad excesiva es MITO

## Grounding (anti-fabricación)

Toda especie de `restauracionFinca.js` y de `restauracion-especies.json` debe
existir en `public/grafo-relations.json` (id real, no inventado) — lo
verifican `RestauracionScreen.test.jsx` (mundo bosque de alimentos) y
`restauracionEspecies.grounding.test.js` (lo que el LLM inyecta vía
`restauracionDiagnostic.js`). Ver auditoría
`Chagra-strategy/ops/AUDIT-RESTAURACION-GROUNDING-2026-07-09.md`.

Trazabilidad conocida y documentada (NO corregida por alcance/riesgo del
pipeline generado, ver nota en `restauracionFinca.js`): el id
`albizia_guachapele` guarda el binomio *Albizia niopoides* (Iguá hoja
menuda), no *Pseudosamanea guachapele* (el guachapele real, id
`pseudosamanea_guachapele`). Ambos registros son especies nativas reales y
correctas dentro de su propio id; solo el NOMBRE del slug es engañoso.
