# INFORME — La Sierra absorbe todo el clima (r2) · carril `sierra-absorbe-todo-el-clima-r2-20260905`

Fecha: 2026-09-05 · Canal: opencode/deepseek · cwd `/home/kortux/Workspace/chagra`
Rama: `feat/sierra-absorbe-clima-20260904` (worktree propio desde `origin/dev` `90f12a947`) ·
Base: `origin/dev`.

## 0. Límites de este carril (registro obligatorio, antes de empezar)

- La entrega pedida en el brief
  (`/home/kortux/Workspace/Chagra-strategy/ops/SIERRA-ABSORBE-CLIMA-20260904.md`, commiteada en el
  repo `Chagra-strategy`) vive **fuera del cwd** de opencode: cada escritura se auto-rechaza en
  silencio. Este informe es el espejo en `_gate/` (misma tabla), para que el orquestador lo mueva
  si lo quiere archivar en el repo privado.
- La dirección de arte
  `DIRECCION-NUMEROS-VIVOS-CLIMA-SIERRA-20260904.md` (repo privado, fuera del cwd) **sí se leyó
  entera** por la ruta de lectura del operador (no por la herramienta de archivo): 413 líneas,
  actualizada 2026-09-05 10:15. Es la norma que sigue esta tabla.
- No se toca la escala de la Sierra (`CUMBRE.y`, `LINEA_NIEVE`, topes de `BANDAS`). Verificado
  por construcción: los cambios son DOM de aterrizaje + un módulo de datos puro.
- El día «hoy» del pronóstico ya se resuelve en la zona horaria de la finca (BUG TODAY-UTC-HELADA
  cerrado en dev por otro carril, `fincaDateISO()` en `useClima3DVivo`). La tiza de helada depende
  de `tempMin` del día; si un carril futuro mueve la frontera del día, avisarlo ahí: señalado en el
  PR.
- Otros carriles Sierra: `pgrep -af sierra-` sin procesos vivos al arrancar. Ramas de los de
  nieve/pisos y pasos-1-2-3 NO están en `origin` (verificado por contenido en `dev`: el aterrizaje
  sigue siendo el panel `.tsm__aterrizaje` de una línea, sin datos cableados). Los cambios son
  **aditivos**: props nuevas con default = comportamiento previo, para no enredar el árbol si ese
  carril vuelve.

## 1. El hueco, verificado en código (no por SHA)

`src/hooks/useClima3DVivo.js` expone 26 campos. `src/mockups/Mundo3DClima.jsx` los renderiza
(`ClimaHud` + `CultivoRadar` + alertas). `src/visual/mundo3d/VistaGlobalSierra.jsx` **no consume
el hook**: solo `faseEnsoViva()` para la nube. El aterrizaje del descenso
(`TransicionSierraMundo` → `resolverAterrizaje`) recibe hoy `clima = null` en producción: la
«única línea» (`lineaClima`) **nunca se llena** en el viaje real; nadie pasa el hook. Ése es el
hueco.

## 2. Inventario: 26 campos + 2 servicios

Decisión por campo, contra la gramática de la dirección (`DIRECCION-NUMEROS-VIVOS...` §3.3, §6,
§7, §8): tinta = vino de afuera (ahora/hoy/esta noche/lo normal) · tiza = dedujo Chagra (firmada,
«unos/puede/pidió») · el aterrizaje es la VENTANA, único punto medido (la finca). «Aterrizaje»
significa la tarjeta de llegada del descenso; «a un gesto» = segundo nivel al tocar; «fenómeno»
= se ve en la escena, nunca cifra.

| # | Campo (hook) | Decisión | Razón |
|---|---|---|---|
| 1 | `senal` | **no va** (guardián) | `senal = tieneOpenMeteo || tieneEnso`. Es la condición de encendido: sin señal no se pinta tinta ni tiza (§8). No se muestra. |
| 2 | `tieneOpenMeteo` | **no va** (control) | Alimenta la palabra de fuente «Open-Meteo» en el origen a un gesto; nunca una cifra. |
| 3 | `tieneEnso` | **no va** (control) | Ídem; decide si la fase entra como tiza/contexto. |
| 4 | `condicion` | **aterrizaje · tinta** | Palabra del ahora: «lluvia / cielo despejado / nublado / niebla». Mapeada a palabra (nunca al código interno). |
| 5 | `luz` | **no va** (fenómeno) | Gobierna el cielo/atmósfera de la escena y la ventana día/noche del aterrizaje; no se lee como cifra (§6 horaria `is_day`). |
| 6 | `lluvia` (bool) | **no va** (fenómeno) | La escena llueve durante el frenazo si llueve (contrato §4.3); la palabra la aporta `condicion`. Sin cifra. |
| 7 | `niebla` (bool) | **no va** (fenómeno) | La nube/niebla es el dato visual de la banda 4; sin cifra (§6). |
| 8 | `helada` (bool) | **aterrizaje · tiza (prioridad 1)** | Dispara la línea de helada («puede helar en lo plano» + mínima en tinta). El bool no se pinta; su consecuencia sí. |
| 9 | `lluviaMm` | **no va** (cifra → boletín) | La lluvia se ve; el mm va al boletín. Entra al balance hídrico de la tiza «sed» (prioridad 3) sin mostrarse (§6). |
| 10 | `nubosidad` | **no va** (cifra) | Alimenta «cielo limpio/cubierto» de la tiza de helada y el techo de la escena; nunca el % (§6 `cloud_cover`). |
| 11 | `temp` | **aterrizaje · tinta** | «ahora: llovizna, 14°». Grado entero, palabra de ventana «ahora» (§7, Análisis). |
| 12 | `tempMin` | **aterrizaje · tinta (en la línea de helada)** | «esta noche baja a 3°» con la palabra de ventana «esta noche». En piso frío/páramo es la cifra que cambia la decisión (§3.3 T1/T2). |
| 13 | `tempMax` | **aterrizaje · a un gesto** | «hoy hasta 19°» solo al tocar el ahora; de entrada el ahora ya es el número (§6 diaria `temperature_2m_max`). |
| 14 | `pronostico` (7 d) | **no va** (lista) | Alimenta min/max/noche, sed y hongo por cultivo; la lista no entra a la montaña (boletín). |
| 15 | `humedad` | **no va** (cifra) | Alimenta la cota de la nube y el mojado foliar; el % va al boletín (§6 horaria). |
| 16 | `viento` | **no va** (fenómeno visual) | Dato de la finca, no de la montaña → NO a la banda. Se convierte en deriva de los estratos (dirección real, tres escalones) sin número (§6 `windspeed_10m_max`, D2). |
| 17 | `ensoFamily` | **aterrizaje · tiza (contexto)** | Elige la familia del efecto por piso (nino/nina/neutral). Se muestra como consecuencia, nunca como chip (§4, T3). |
| 18 | `ensoPhase` | **aterrizaje · tiza (contexto)** | Id. Fase viva; alimenta además la franja de la nube en el viaje. |
| 19 | `ensoLabel` | **aterrizaje · solo en palabra** | «El Niño / La Niña» como palabra dentro de la línea ENSO por piso. Nunca badge. |
| 20 | `oni` | **no va** | Badge ENSO/ONI suelto prohibido en la Sierra (decisión del operador); va al boletín (§3.1 P6, §7 ENSO «sin ONI en la Sierra»). |
| 21 | `tendencia` | **no va** | Evolución ENSO: boletín. En la Sierra el Niño se enseña por su efecto (§4). |
| 22 | `alertas` (locales) | **aterrizaje · tinta (aviso)** | Lo más valioso y hoy invisible en el descenso: hasta 2 avisos del servicio climático (helada/lluvia) con su texto. Vino de afuera = tinta. |
| 23 | `ubicacion` | **no va** (como rótulo) | La Sierra no es la vereda del usuario (§12): el rótulo dice «a la altura de su finca» y se arma con la cota, no con el municipio. El municipio vive en el boletín. |
| 24 | `precision` | **no va** (metadata) | «exact / centroid / municipio»: metadata de la lectura; el dato no cambia. |
| 25 | `pisoTermico` | **aterrizaje · T0** | El piso (`frio`/`paramo`) decide la tiza (helada solo ahí, §3.3) y el nombre «piso frío» acompaña la cota. Ya se usa en `resolverAterrizaje` por la cota. |
| 26 | `actualizado` | **no va** (cifra) | No se pinta fecha/hora; con cache vencida el «ahora» cambia a «hace N h» (estado `stale`), §8 T1. |

Servicios (los «dos» del brief):

| Servicio | Decisión | Razón |
|---|---|---|
| `buildClimaCultivoSuggestions()` | **aterrizaje · tiza (prioridades 2-3-4)** | Cruza clima × ficha × `cultivos_actuales` reales: alerta de SU cultivo (2), sed (3), hongo (4). Solo si hay plantas hidratadas y dato; la ficha con su fuente queda a un gesto. Sin plantas → no aparece (§3.3 T2, §9). |
| `ensoRegionalLine()` | **aterrizaje · a un gesto (respaldo)** | Línea ENSO por región con cita: va como respaldo/«Ver» del consejo, nunca en la línea default (el consejo default por piso es `CONSEJO_ENSO`, ya existente) (§3.3, §9). |

## 3. Lo que se espera ver (cuadro y conteo post-cambio)

Con dato (piso frío a 2.200 m, El Niño, alerta local) el aterrizaje muestra, en este orden:
T0 cota+piso → **tinta** «ahora: … N°» (condicion+temp) · «esta noche baja a N°» (tempMin) →
**aviso** alertas locales (hasta 2) → **tiza** helada con mínima (firma) o sugerencia de SU cultivo
o línea ENSO por piso. Sin dato, nada extra (la ausencia es el «no sé», §8).

Conteo textual esperado en el aterrizaje CON dato: `condicion`, `temp`, `tempMin`, `helada` (vía
tiza), `alertas`, `pisoTermico`, `ensoLabel/family` (vía línea ENSO) = **~7 campos**; el resto es
fenómeno visual, control interno o «no va» (razón en la tabla). El conteo exacto se hace sobre la
captura en el gate, no en este documento.

## 4. Qué se toca (archivos) y qué NO

Sí: `src/visual/mundo3d/sierra/lecturaClimaAterrizaje.js` (nuevo, dato puro) · su test ·
`src/visual/mundo3d/TransicionSierraMundo.jsx` (props `climaVivo`/`sugerencias` aditivas; render
aditivo en el panel de aterrizaje) · `src/visual/mundo3d/VistaGlobalSierra.jsx` (consume el hook y
lo baja). No: escala de la Sierra, `syncManager`, `dbCore`, `sw.js`, `scripts/tsc-baseline.json`,
CLAAssistant ni audit-integraciones (rojo en base para todos).
