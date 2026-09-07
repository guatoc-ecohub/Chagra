# Drenaje de componentes huérfanos — TANDA 1 (2026-09-04)

Card: Chagra-strategy/queue/095 · Instrumento: `npm run audit:huerfanos`
(`scripts/audit-componente-huerfano.mjs` + `scripts/lib/alcance-simbolica.mjs`, versión 095.b ya en dev).

## Alcance de esta tanda

- SOLO hallazgos del CONTROL A con veredicto `HUERFANO` o `SOLO_TEST`.
- SOLO componentes de UI (`.jsx` con `esComp`). NO se mira SUPERFICIE (control B2, 520
  hallazgos — tanda propia).
- Excluidos por regla del operador: todo lo compai (`CompaiGuiaPantalla` y módulos
  hermanos — tienen cola propia) y las láminas-viva sin ruta (tarea 094-laminas-viva-huerfanas).
- Tope de la tanda: 15 sujetos. **Aquí no se borra nada**: borrar lo decide el operador.

## Decisiones — 9 DECLARADAS en allowlist

Escritas en `ops/componentes-huerfanos-allowlist.json` con razón + fecha. El arnés
(`scripts/__tests__/audit-componente-huerfano.test.mjs`, bloque "TANDA 1 DEL DRENAJE")
sostiene que siguen inalcanzables y que sus archivos existen.

| # | Sujeto | Decisión |
|---|--------|----------|
| 1 | `src/components/aprendizaje/GuiaEspecieCards.jsx` | **DECLARADA.** Prototipo del módulo de aprendizaje (PR #1674) con datos demo (`GUIAS_DEMO`: papa y café a mano). Montarlo hoy inyectaría datos demo en pantallas grounded desde catalog.sqlite. Cuando lea del catálogo real (su propio TODO v3.1+) se decide su ruta. |
| 2 | `src/components/_archivado/UmbralValle.jsx` | **DECLARADA.** Archivado a propósito; era la puerta grande home→valle 3D y la entrada viva es otra. |
| 3 | `src/components/_archivo/OnboardingModal.jsx` | **DECLARADA.** Archivado 2026-07-22; `FarmOSSetupModal` conserva la configuración técnica. |
| 4 | `src/components/_archivo/BienvenidaFinca.jsx` | **DECLARADA.** Archivado 2026-07-22; `OnboardingCondensado` lo reemplaza. |
| 5 | `src/components/_archivo/OnboardingHero.jsx` | **DECLARADA.** Archivado 2026-07-22; `OnboardingCondensado` + `PrimerRegistroCard` conservan lo útil. |
| 6 | `src/components/_archivo/OnboardingProfile.jsx` | **DECLARADA.** Archivado 2026-07-22; el flujo extendido vive en `OnboardingCondensado` + Perfil. |
| 7 | `src/components/_archivado/PanelVitalidadEspiritu.jsx` | **DECLARADA.** Desmontado del home 2D a propósito el 2026-08-26 (comentario en `FincaVivaHero.jsx`). |
| 8 | `src/visual/mundo3d/atmosfera/DemoAtmosferaViva.jsx` | **DECLARADA.** Demo aislada por contrato A4 (su encabezado lo declara): viñeta de QA/arte del arco del día. Cablearla rompería el contrato. |
| 9 | `src/components/lotes/LoteCroquisPlaceholder.jsx` | **DECLARADA.** Andamiaje transitorio declarado en su encabezado; espera el canvas real (Leaflet + polígono). No debe montarse como UI final. |

## Decisiones — 6 PROPUESTAS DE BORRADO (no se borra nada en este PR)

Cada una quedó reemplazada por un sucesor vivo o fue una propuesta nunca adoptada.
El arnés las mantiene **acusadas** en el reporte: si alguien las borra, el test exige
actualizar esta lista — el borrado se hace consciente, no por arrastre.

| # | Sujeto | Por qué se propone borrar |
|---|--------|--------------------------|
| 10 | `src/components/ChagraAgentAvatarColibri.jsx` | El avatar vivo lo escoge `useAgentAvatarType` y el mapa lazy de `ChagraAgentAvatar.jsx` (angelita, zariguya, jaguar, oso-baston, luciernaga, guacamaya, chivito-punk) — colibrí no está en el mapa. Solo lo sostiene su test y una fila del README. |
| 11 | `src/components/ChagraAgentAvatarColibriPhoto.jsx` | Ídem: variante foto del colibrí fuera del mapa canónico de avatares. |
| 12 | `src/components/ChagraAgentAvatarMaiz.jsx` | Ídem: maíz no está en el mapa de `useAgentAvatarType`; solo lo menciona un comentario en `GuacamayaCompai.jsx`. |
| 13 | `src/components/SplashAngelita.jsx` | Propuesta de splash nunca adoptada: el boot/loading vivo es `ChagraGrowLoader` con `VIEW_LOADING_LABELS` por vista (App.jsx), que ya da mensaje contextual. |
| 14 | `src/components/escucha/EscuchaFab.jsx` | El trigger de escucha vivo es `AgentFab` (hold + «Hola Chagra», `activarEscucha({ fuente: 'compai_largo' })`, decisión operador 2026-08-27). Este FAB alterno abajo-izquierda quedó sin montar. |
| 15 | `src/components/QuickChipsBar.jsx` | Sucesor montado: `ChipsToolbar` (en `AgentScreen`), que cubre la decisión UX-5 del issue #286. El propio encabezado de `ChipsToolbar` lo distingue como el reemplazo. |

## Reporte: entradas de allowlist obsoletas que el instrumento destapa

Las 6 entradas heredadas que ya no le hacen match a ningún sujeto (reportadas como
`[allowlist-obsoleta]`; quitarlas del allowlist heredado lo decide el operador):

1. `src/visual/mundo3d/ArtesaniaAndina.jsx`
2. `src/visual/mundo3d/GemeloValle2D.jsx`
3. `src/visual/mundo3d/PisosTermicosBandas.jsx`
4. `src/visual/mundo3d/TransicionMundoKit.jsx`
5. `src/visual/mundo3d/TransicionSierraMundo.jsx`
6. `src/visual/mundo3d/infraestructura/InfraestructuraViva.jsx`

Nota: el mismo reporte señala 7 obsoletas más (`MundoLecheria3D`, `MundoSanidad3D`,
`MundoVergelFrutal3D`, `ArbolMayor`, `GaleriaSierraArboles`, `SierraCorteVertical`,
`SierraMonte3D` — mundos 3D y sierra). Fuera del alcance pedido para esta tanda;
quedan señaladas para la cola.

## QUE QUEDÓ SIN DECIDIR (21 sujetos — tanda 2)

- **8 criaturas** (`src/visual/creatures/`: Borugo, ChivitoTinta, LuciernagaTinta,
  MomentoGuardianes, OsoAndino, OsoAnteojos, PerroHeroe, PerroTransicion): su montaje
  natural parece ser el esfuerzo ya iniciado en ramas `feat/huerfanos-al-valle-3d*` /
  `integ/3d-huerfanos`. Es decisión de producto (qué criaturas entran al valle y cómo),
  no se drena pieza por pieza.
- **Pendientes de decisión de producto (dashboards y pantallas)**: `admin/AdminPanel`,
  `admin/DashboardAdopcion`, `agent/AgentMetricsDashboard`, `extensionista/ExtensionistaDashboard`,
  `red/ExitosChagra`, `PestMonitoringWindow`, `OnboardingTour`,
  `AgentScreen/SuggestedActions`.
- **Pendientes de adopción transversal (mejoras sin dueño de ruta)**:
  `ErrorBoundaryRuta` (reemplazaría el patrón `ErrorBoundary`+`ErrorFallback` de las
  224 case — refactor transversal), `common/ScreenLoadingStatus` (estado de carga/vacío/
  error reutilizable, adopción pantalla por pantalla).
- **Menores**: `AgentDemoExample` (ejemplo didáctico), `AltitudeBadge` (candidato natural
  a montar en fichas con piso térmico — verificar tras la unificación de pisos #3102).

## Nota para revisión (Opus)

El PR del instrumento monolítico (`chore/095-control-componente-huerfano`, 56a4f5a64,
PR #3119) choca con la evolución 095.b ya mergeada a dev (#3113), que extrajo el motor a
`scripts/lib/alcance-simbolica.mjs` para que el gate `audit-integraciones.mjs` mida con el
mismo motor. Esta tanda corrió con la 095.b de dev (la que gatea CI). Reconciliar #3119
es decisión del operador.

## ADENDA 2026-09-05 — resolución de la tanda 2 (remate del gate de integraciones)

Task `audit-gate-remate-20260905`, orden del operador: el rojo del gate
`audit-integraciones` (126 hallazgos tras la tanda mundo3d de #3145) represaba 9
PRs. El remate declaró los 123 restantes en
`ops/integraciones-no-consumidas.json` (3 de los 126 resultaron VIVOS con el
fix del tope {0,400} del motor: aguaFinca/cacaoFinca/mangoFinca, importados por
AguaScreen/CacaoScreen/MangoScreen — no se declararon, se arregló el motor).
Cada entrada pasó un control de importadores con resolución exacta de
especificadores (lección useT.js). Las 6 «propuestas de borrado» de esta tanda
quedaron declaradas por el remate — el BORRADO sigue pendiente de curaduría del
operador. Detalle de cada decisión: ver las entradas con date 2026-09-05 en el
allowlist.
