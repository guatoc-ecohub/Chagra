# Diagnostico de reconciliacion entre main y dev

Fecha de corte: 2026-07-23. Este documento es un diagnostico; no aplica una fusion ni resuelve conflictos.

## Metodo

Se actualizaron `origin/main` y `origin/dev`, se calculo la base comun `efd57b1a13d1f02e612605fe6c48da9e9c397f47` y se inspecciono cada commit con `git show --stat` y su diff. Tambien se verificaron en `origin/dev` los candidatos B con `git grep` y el historial de las rutas. La orden exacta del inventario fue:

```sh
git log --oneline $(git merge-base origin/main origin/dev)..origin/main
```

El remoto actual devuelve **30 commits**, no 29. La diferencia frente al conteo reportado en el encargo probablemente corresponde a un commit adicional incorporado a `main` antes de este corte.

Categorias: A = artefacto o cambio trivial, se puede conservar `dev`; B = ya superado por `dev`; C = trabajo unico de `main` que requiere port o una decision explicita.

## Commits de main ausentes de dev

| Commit | Categoria | Justificacion |
| --- | --- | --- |
| `28fef3f2` `feat(mercado)` | C | Agrega `mercado.html`, `src/entries/mercado.jsx` y la entrada multipagina de Vite; no existe ese entry standalone en `dev`. |
| `8d323eea` `feat(vision)` | B | `origin/dev:src/services/llmRouter.js` ya usa `qwen3-vl:8b` en el carril visual. |
| `0443e08e` `feat(agente)` | B | `origin/dev` ya contiene `gemma4:e2b` en `env.js`, `entityExtractor.js`, `HelpVoiceQuestion.jsx` y `llmRouter.js`. |
| `c0b98007` `fix(graph)` | C | Script y pruebas nuevos para derivar `piso_termico`; no hay equivalente con ese nombre o flujo de escritura en `dev`. |
| `cf2d0131` `feat(murales)` | C | Fichas 2D, datos y pruebas de murales son trabajo funcional propio de `main`; las rutas homonimas de `dev` divergen. |
| `f9046ece` `port(main)` | B | `dev` ya contiene `useAngelitaGuia`, `AngelitaGuia`, sus pruebas y su cableado en `DiaEnFinca`; los conflictos son add/add de evoluciones posteriores. |
| `e7180af8` `fix(agent)` | C | Ajuste puntual de triaje en `agentPromptBase` y `outputGuards` con prueba nueva; no se encontro un commit equivalente en `dev`. |
| `1c7a3643` `experiment(embedder)` | A | Scripts, resultados y documentacion de experimento sin cambio de runtime ni checkpoint de produccion. |
| `77e87798` `docs(vision-cafe)` | A | Reporte y utilidades de un clasificador con resultado negativo, sin integracion al producto. |
| `07d74bc5` `feat(bench)` | A | Script de entrenamiento y requirements aislados, no cableados al runtime ni al CI de `dev`. |
| `ec519af1` `feat(audit)` | C | Agrega auditoria reproducible del grafo, pruebas y dependencia de paquete; hay que decidir si se conserva como herramienta operativa. |
| `6d1922b0` `fix(agro)` | C | Script, pruebas y artefactos de normalizacion de altitud que no estan en `dev`; requiere decidir si se ejecuta o solo se archiva. |
| `1c58c794` `fix(agente)` | C | Corrige la validacion stale de herramientas en `agentService` y agrega prueba dedicada. |
| `6f72ff3b` `fix(prompt)` | C | Amplia la cobertura de plaguicidas en el prompt; no es el mismo cambio que los guards posteriores de `dev`. |
| `7515fea9` `fix(ci)` | C | Extiende los triggers de cuatro gates a `dev` y rutas 3D; `dev` no contiene ese conjunto de cambios de workflow. |
| `1850e3f5` `fix(merge)` | B | Es una integracion masiva de escenas y artefactos ya evolucionados en `dev`; sus conflictos son principalmente add/add visuales y debe prevalecer la version reciente de `dev`. |
| `1e91f381` `chore(oc-cla-raiz-1784647801)` | A | Cambio mecanico limitado a `cla.yml`; no aporta comportamiento de aplicacion. |
| `d3d3169a` `fix(grounding)` | C | Aunque `dev` tiene `filterNoiseEntities`, este commit limpia entidades antes de formar el prompt mediante `sidecarClient`; ese cableado debe portarse o revisarse. |
| `71a52c70` `feat(capture)` | C | Flag de build y cambio de flujo de captura de conversaciones, con impacto de producto y despliegue. |
| `dd6fb9bc` `chore(bench)` | A | Elimina un script markdown obsoleto y actualiza sus indices; puede conservarse el arbol de `dev`. |
| `130ddb39` `feat(rag)` | C | Cambio en la construccion de embeddings y su artefacto; `dev` tiene una implementacion distinta, no el mismo patch. |
| `13eec2bf` `feat(offline)` | C | El artefacto `grafo-relations.json` de `main` incorpora `GROWS_IN`; `dev` tambien usa esa relacion, pero el archivo difiere de forma sustancial y debe regenerarse desde la fuente correcta. |
| `6f96f717` `fix(bench)` | C | Correccion de semantica de metricas y pruebas de `bench/gate.mjs`, inexistente como gate en `dev`. |
| `6f3b64c2` `feat(bench)` | C | Introduce el workflow, baselines y gate de bench; requiere decision sobre activar ese CI en la linea de `dev`. |
| `fdb134a3` `fix(rag)` | B | `git cherry -v origin/dev origin/main` lo marca equivalente y `dev` lo contiene como `569ca1ae`; no se debe duplicar. |
| `510533b7` `feat(ops)` | C | Auditor de integraciones, workflow y configuracion de paquete sin equivalente en `dev`; debe revisarse antes de activar CI adicional. |
| `fe417d7f` `fix(guards)` | C | Supresion especifica de recetas con plaguicidas prohibidos y dosis; `dev` tiene guards relacionados, pero no el mismo cambio ni constante. |
| `519953a3` `feat(perf)` | B | `dev` ya conserva `usePerformanceMonitor`, pruebas y el consumo desde `EscenaBase3D`; tiene una evolucion posterior. |
| `7d651d52` `fix(prompt)` | C | Cambia `externalAiPromptBuilder` y tres consumidores UI para el contexto termico; no es el fix de guards termicos que aparece en el historial de `dev`. |

## Fusión de prueba y conflictos

Se creo una rama temporal desde `origin/dev`, se ejecuto `git merge --no-commit --no-ff origin/main`, se capturo `git diff --name-only --diff-filter=U` y se ejecuto `git merge --abort`. El resultado real del corte fue **108 archivos sin fusionar**. La rama temporal fue eliminada despues del abort.

### A/B: resolver automaticamente conservando dev

Estos conflictos proceden de artefactos, de la integracion masiva `1850e3f5` o de funcionalidad que `dev` ya evoluciono. La recomendacion es conservar `dev` y luego correr las pruebas visuales y de tipos.

```text
scripts/build-prod.mjs
scripts/diag/auditar-valle-runtime.mjs
scripts/diag/encuadre-mundo.mjs
scripts/tsc-baseline.json
src/components/AgentScreen/ChatHistory.jsx
src/components/ChagraAgentAvatarAngelita.jsx
src/components/dashboard/CriaturasNocturnas.jsx
src/components/dashboard/PortalesMano.jsx
src/components/dashboard/UmbralValle.jsx
src/components/Settings/AgentAvatarSelector.jsx
src/components/Typewriter.jsx
src/config/rutasProdChagraApp.js
src/hooks/__tests__/useAngelitaGuia.test.js
src/hooks/useAngelitaGuia.js
src/mockups/AliadosFinca3D.jsx
src/mockups/AngelitaViva.jsx
src/mockups/CamaraDirectorDemo.jsx
src/mockups/CatalogoInfraDemo.jsx
src/mockups/ColocarInfraestructura.jsx
src/mockups/EntradaValle3D.jsx
src/mockups/GemelosMundos2D.jsx
src/mockups/JuegoMiFincaOdyssey.jsx
src/mockups/metalslug/PlagasSprites.jsx
src/mockups/MomentoVentaMercado3D.jsx
src/mockups/MundoAbejas3D.jsx
src/mockups/MundoBoticaCana3D.jsx
src/mockups/MundoCafe3D.jsx
src/mockups/MundoCompost3D.jsx
src/mockups/MundoFermentos3D.jsx
src/mockups/MundoGallinero3D.jsx
src/mockups/MundoParamo3D.jsx
src/mockups/MundoPiscicultura3D.jsx
src/mockups/MundoSemillero3D.css
src/mockups/MundoSemillero3D.jsx
src/mockups/MundoVergelFrutal3D.jsx
src/mockups/murales/MuralParallax.jsx
src/mockups/MuralesNewDonk.jsx
src/mockups/NewDonk2Den3D.jsx
src/mockups/__tests__/mundoAbejas3D.smoke.test.jsx
src/mockups/__tests__/mundoGallinero3D.test.jsx
src/mockups/ValleLluvia3D.jsx
src/mockups/ValleNoche3D.jsx
src/mockups/valle/siembraValle.js
src/mockups/valle/Valle2DFallback.jsx
src/mockups/valle/Valle3D.jsx
src/mockups/valle/valleData.js
src/mockups/VitrinaMaestraMundos.jsx
src/prodApp/ProdChagraApp.jsx
src/services/angelitaInteligencia.js
src/services/angelitaVariedad.js
src/services/saludoPantalla.js
src/services/__tests__/angelitaInteligencia.test.js
src/store/useAngelitaStore.js
src/visual/agente/angelita-agente.css
src/visual/agente/AngelitaEntrada.jsx
src/visual/agente/angelitaEstados.js
src/visual/agente/Angelita.jsx
src/visual/agente/BurbujaAngelita.jsx
src/visual/agente/index.js
src/visual/confianza/AdvertenciaPeso.jsx
src/visual/confianza/confianzaTokens.js
src/visual/confianza/FichaFuente.jsx
src/visual/confianza/MarcaOrigen.jsx
src/visual/confianza/NoSeHonesto.jsx
src/visual/confianza/SaberTradicion.jsx
src/visual/confianza/TrazoConfianza.jsx
src/visual/creatures/AbejaAngelita.jsx
src/visual/creatures/angelita-missminutes.css
src/visual/creatures/BarbuditoParamo.jsx
src/visual/creatures/creatures.css
src/visual/creatures/index.js
src/visual/creatures/jaguarIdentidad.js
src/visual/creatures/Jaguar.jsx
src/visual/creatures/useVidaIdle.js
src/visual/mundo3d/aguacatal/EscenaAguacatalVivo.jsx
src/visual/mundo3d/aguacatal/floraAguacatal.geom.js
src/visual/mundo3d/bosque/bosqueTakeA.geom.js
src/visual/mundo3d/bosque/EntQuenua.jsx
src/visual/mundo3d/bosque/EscenaBosqueVivo.jsx
src/visual/mundo3d/bosque/FaunaBosque.jsx
src/visual/mundo3d/bosque/floraParamo.geom.js
src/visual/mundo3d/bosque/FloraParamo.jsx
src/visual/mundo3d/bosque/MundoEntBosque.jsx
src/visual/mundo3d/cafetal/EscenaCafetalVivo.jsx
src/visual/mundo3d/cafetal/floraCafetal.geom.js
src/visual/mundo3d/cana/floraCana.geom.js
src/visual/mundo3d/CondorBillboard.jsx
src/visual/mundo3d/escenas/CorralVivo.jsx
src/visual/mundo3d/escenas/EscenaBase3D.jsx
src/visual/mundo3d/finca/fincaRealista.geom.js
src/visual/mundo3d/lecheria/EscenaLecheriaViva.jsx
src/visual/mundo3d/papa/EscenaPapaVivo.jsx
src/visual/mundo3d/papa/floraPapa.geom.js
src/visual/mundo3d/polinizadores/EscenaPolinizadores.jsx
src/visual/mundo3d/polinizadores/ParcelaCultivos.jsx
src/visual/mundo3d/polinizadores/polinizadoresIdentidad.js
src/visual/mundo3d/sierra/SierraCorteVertical.jsx
src/visual/mundo3d/__tests__/bosqueRealismo.test.js
src/visual/mundo3d/__tests__/hiloVidaVista.test.jsx
src/visual/mundo3d/vitrina/vinetasMundos.geom.js
```

### C: necesitan decision humana antes de resolver

Estos 8 conflictos tocan la configuracion de CI, datos offline o comportamiento del agente. No es seguro elegir una rama completa sin portar el cambio concreto y ejecutar sus pruebas.

```text
.github/workflows/codeql.yml
public/grafo-relations.json
src/components/AssetDetailView.jsx
src/components/GuildSuggestions.jsx
src/components/TelemetryAlerts.jsx
src/services/outputGuards.js
src/services/ragRetriever.js
src/services/__tests__/outputGuards.test.js
```

Los siguientes no aparecieron como conflicto, pero tambien deben portarse de forma deliberada porque son commits C: la entrada de Mercado, los scripts de grafo, los fixes de `agentService` y `agentPromptBase`, los cambios de captura, los workflows de CI y bench, el auditor de integraciones, y los cambios de RAG/embeddings.

## Recomendacion

Haga la reconciliacion en dos pasadas. Primero conserve `dev` en el bloque A/B, incluido el conjunto visual, pues ya contiene las variantes recientes de Angelita, rendimiento y escenas 3D. Despues seleccione y porte los commits C uno a uno, en este orden: seguridad y grounding del agente, RAG y datos offline, CI y herramientas, y por ultimo las funcionalidades de interfaz como Mercado y murales.

Antes de fusionar, una persona debe decidir expresamente si activa los workflows adicionales y si se conserva el modo de captura. `public/grafo-relations.json` debe regenerarse desde la fuente que se adopte, nunca resolverse escogiendo un lado del archivo generado. Al final, ejecute pruebas unitarias, lint, build y los gates de CI sobre la rama reconciliada.
