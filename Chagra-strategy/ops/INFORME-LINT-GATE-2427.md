el gate se saltó.

La ruta de integración de PR #2427 no ejecutó ESLint: el commit que llegó a dev fue generado por GitHub y el rollup de CI no tenía un job de lint. El hook local sí cubría src/components/SeedingLog.jsx. No hay evidencia pública suficiente para atribuir un --no-verify concreto a alguno de los ocho commits de la rama.

## 1. Hook saltado, autoría y forma de commit

Comando:

~~~text
git log --format='%H %G? %an %s' 61f5b2a22 -1
~~~

Salida cruda:

~~~text
61f5b2a226a7845035400000c21c516ca479a2f2 N guatoc-ecohub fix(tsc): corregir ~600 errores tsc no-3D — 0 errores residuales fuera de visual/3D (#2427)
~~~

En este clon, git show también informó que no pudo ejecutar gpg. La verificación remota de GitHub sí da el commit como firmado y válido:

~~~text
gh api repos/guatoc-ecohub/Chagra/commits/61f5b2a226a7845035400000c21c516ca479a2f2 --jq '{author: .author.login, committer: .committer.login, verification: .commit.verification, parents: [.parents[].sha]}'
~~~

~~~json
{"author":"guatoc-ecohub","committer":"web-flow","parents":["2783c2b7300a6bc65020a9fc8c682864591ea5f9"],"verification":{"reason":"valid","verified":true,"verified_at":"2026-07-13T13:22:08Z"}}
~~~

Metadatos del PR:

~~~text
gh api repos/guatoc-ecohub/Chagra/pulls/2427 --jq '{user: .user.login,merged_by: .merged_by.login,merge_commit_sha,commits,maintainer_can_modify,auto_merge}'
{"auto_merge":null,"commits":8,"maintainer_can_modify":false,"merge_commit_sha":"61f5b2a226a7845035400000c21c516ca479a2f2","merged_by":"guatoc-ecohub","user":"guatoc-ecohub"}
~~~

gh pr view 2427 --json author devolvió author guatoc-ecohub e is_bot false. Los ocho commits de la rama fueron creados con autor y committer guatoc, no con una cuenta bot. Eso identifica una cuenta humana de GitHub, pero no permite saber si el proceso local fue manual o automatizado. No queda una marca --no-verify en Git.

El commit de la rama que introdujo el defecto fue 91593ff110a53451d7152cd1eca62a1f5b095c81. La API de GitHub muestra:

~~~text
fix(tsc): 0 errores no-3D — 222 errores residuales corregidos (~110 archivos: JSDoc, casts, react-leaflet types, vitest stub, em-dash fixes)
{"additions":2,"changes":38,"deletions":36,"status":"modified"}
@@ -1,43 +1,8 @@
- import React, { useState, useEffect, useRef, useMemo } from 'react';
- import { ArrowLeft, AlertCircle, MapPin, CheckCircle } from 'lucide-react';
- import { savePayload } from '../services/payloadService';
- import { savePhoto } from '../services/photoService';
- import { createFarmProcess } from '../services/farmEventService';
- import { buildDraftFromSeeding } from '../services/buildDraftFromSeeding';
- import { newUlid } from '../utils/id';
+ // @ts-nocheck
~~~

El commit final tiene un solo padre y committer GitHub, con ocho commits incorporados en el PR. Por tanto, el squash/integración del servidor no ejecutó el pre-commit local. No pude demostrar si 91593ff se hizo con --no-verify, con el hook no instalado, o por otra ruta de automatización. El hallazgo demostrable es que el último paso que introdujo el defecto no tuvo un gate CI equivalente.

## 2. Alcance real del hook

Comando:

~~~text
git show 61f5b2a22^:lefthook.yml | rg -n -C 4 'eslint|staged_files|glob'
git show 61f5b2a22:lefthook.yml | rg -n -C 4 'eslint|staged_files|glob'
~~~

Salida cruda relevante, idéntica en padre y commit:

~~~text
127:    eslint:
128:      glob: "*.{js,jsx,ts,tsx}"
134:      exclude: '\.d\.ts$|^public/vendor/'
135:      run: npx eslint {staged_files} --max-warnings=0
~~~

SeedingLog.jsx coincide con *.jsx y no coincide con ninguna exclusión. Si se hubiese invocado ese comando en el commit que tocó el archivo, el archivo habría sido linteado.

Control actual:

~~~text
printf '%s\n' 'src/components/SeedingLog.jsx' | grep -E '\.(js|jsx|ts|tsx)$'
src/components/SeedingLog.jsx
grep_exit=0

npx eslint src/components/SeedingLog.jsx --max-warnings=0
...
✖ 59 problems (51 errors, 8 warnings)
ESLINT_EXIT=1
~~~

Esto confirma el fallo que el hook habría visto. No es un hueco de glob ni de staged files.

## 3. CI de #2427

Comando:

~~~text
gh pr view 2427 --json statusCheckRollup
~~~

Rollup crudo resumido por GitHub:

~~~text
CLAAssistant FAILURE
CLAAssistant FAILURE
Check bundle sizes FAILURE
Analyze (javascript-typescript) SUCCESS
tsc:check vs baseline SUCCESS
CodeQL SUCCESS
~~~

No aparece eslint, Lint ni npm run lint.

Comando solicitado sobre el commit integrado:

~~~text
gh run list --commit 61f5b2a226a7845035400000c21c516ca479a2f2 --all --limit 50
29253504839  Deploy Chagra PWA (DEV)  completed failure push dev 61f5b2a226a7845035400000c21c516ca479a2f2
~~~

La ejecución de dev tampoco contiene un job de lint:

~~~text
gh run view 29253504839 --json name,workflowName,conclusion,jobs
Deploy Chagra PWA (DEV) ... jobs: build-and-deploy failure
~~~

La ejecución de TSC del último SHA de la rama del PR:

~~~text
gh run view 29253216817 --json name,workflowName,status,conclusion,jobs
{"name":"TSC Gate (anti-regresión)","workflowName":"TSC Gate (anti-regresión)","status":"completed","conclusion":"success","jobs":[{"name":"tsc:check vs baseline","status":"completed","conclusion":"success"}]}
~~~

El workflow tampoco hace lint. El propio deploy workflow en el commit 61 contiene:

~~~text
59: # 2026-06-24 — RAÍZ del "prod vieja N días": el step Lint corría eslint con
60: # NODE_OPTIONS=--max-old-space-size=16384 (16GB de heap) en una caja de 16GB.
61: # Con ollama (~7GB @ num_ctx 8192) + el build cargados, eslint OOM-mata al
65: # ... El lint NO pertenece al deploy: ya lo enforza lefthook
66: # pre-commit (eslint max-warnings=0, no se puede commitear sucio) y el branch
68: # Gate de calidad = donde debe estar: el commit/PR.
~~~

Historia que retiró ese step:

~~~text
git log --all --date=iso-strict --format='%H %ad %an %s' -S'eslint' -- .github/workflows/deploy.yml .github/workflows/dev-deploy.yml
f1b2eaf5ed369fccc11281f48d974b2ccddbb3bd 2026-06-24T16:08:01-05:00 guatoc-ecohub ci: quitar step Lint del deploy (eslint 16GB heap OOM-mata el runner → prod congelada) (#1844)
0607e35d3b0c4ec6c4e703e046f26e5be7b6282e 2026-06-15T03:29:47-05:00 guatoc-ecohub fix(ci): lint no bloquea deploy (OOM/thrash consumia el job timeout, prod no actualizaba) (#1575)
~~~

Conclusión: TSC pasó porque su gate compara tsc:check con el baseline. CodeQL pasó porque es SAST. Ninguno valida no-undef o react-hooks/rules-of-hooks de ESLint. El gate que debía existir en PR no estaba implementado como check CI en #2427.

## 4. Configuración de ESLint alrededor del 13 de julio

Comandos y salidas:

~~~text
git diff --exit-code 61f5b2a22^ 61f5b2a22 -- eslint.config.js
ESLINT_CONFIG_DIFF_EXIT=0

git log --all -S'no-undef' --date=iso-strict --format='%H %ad %an %s' -- eslint.config.js
(sin salida)

git show 61f5b2a22^:eslint.config.js | rg -n 'no-undef|rules-of-hooks|recommended|plugins'
107:      plugins:
111:      js.configs.recommended,
112:      reactHooks.configs.flat.recommended,

git show 61f5b2a22:eslint.config.js | rg -n 'no-undef|rules-of-hooks|recommended|plugins'
107:      plugins:
111:      js.configs.recommended,
112:      reactHooks.configs.flat.recommended,
~~~

La regla no estaba escrita literalmente como no-undef; venía activada por js.configs.recommended. rules-of-hooks venía activada por reactHooks.configs.flat.recommended. La configuración no cambió en 61f5b2a22 y no hay un commit posterior que haya activado explícitamente no-undef.

Control de resolución efectiva:

~~~text
npx eslint --print-config src/components/SeedingLog.jsx | ...
{
  "noUndef": [2, {"typeof": false}],
  "rulesOfHooks": [2],
  "maxWarnings": "CLI --max-warnings=0"
}
~~~

Veredicto del punto 4: no-undef ya estaba activo el 2026-07-13. No fue una regla que apareciera después del PR.

## 5. Barrido de src hoy

Contexto:

~~~text
git rev-parse HEAD
26128d4fab20540459e65c2d082e191e4ecde72a
node --version
v22.23.2
npx eslint --version
v9.39.4
rg --files src -g '*.js' -g '*.jsx' -g '*.ts' -g '*.tsx' | wc -l
2294
~~~

Usé --format json y lotes de 24 archivos. Cada lote preservó el exit code de ESLint y luego parseó el JSON.

~~~text
BATCH_EXIT_CODES=
01:0 02:134 03:1 04:0 05:1 06:0 07:0 08:0 09:1 10:0 11:1 12:1
13:1 14:1 15:1 16:1 17:0 18:1 19:1 20:1 21:0 22:0 23:0 24:0
25:1 26:1 27:0 28:0 29:0 30:0 31:1 32:1 33:1 34:1 35:1 36:1
37:0 38:1 39:0 40:1 41:1 42:0 43:0 44:0 45:0 46:0 47:0 48:0
49:0 50:1 51:0 52:1 53:1 54:0 55:0 56:1 57:0 58:0 59:0 60:0
61:0 62:0 63:0 64:0 65:0 66:0 67:1 68:0 69:0 70:0 71:1 72:0
73:0 74:0 75:1 76:1 77:0 78:1 79:1 80:1 81:1 82:1 83:0 84:1
85:1 86:1 87:1 88:0 89:1 90:1 91:1 92:1 93:1 94:0 95:1 96:0
~~~

Salida de resumen:

~~~text
BATCH=02 FILES=24 ESLINT_EXIT=134 JSON=FAIL ... Last few GCs ... allocation failure
BATCH=48 FILES=24 ESLINT_EXIT=0 JSON=FAIL ... [BABEL] Note ... outputGuards.js ... exceeds the max of 500KB
MEASUREMENT_FILES=2294 BATCHES=96 PARSED_BATCHES=94 FAILED_BATCHES=2 TOTAL_ERRORS=212 TOTAL_WARNINGS=441
~~~

Recuperación del lote 48 separando stderr:

~~~text
RECOVERY_TOTAL=BABEL_BATCH48 FILES=24 GROUPS=1 PARSED=1 FAILED=0 ERRORS=0 WARNINGS=4
~~~

Recuperación del lote 2 en sublotes de cuatro:

~~~text
RECOVERY_GROUP_START=24 FILES=4 ESLINT_EXIT=0 JSON=ok ERRORS=0 WARNINGS=1
RECOVERY_GROUP_START=28 FILES=4 ESLINT_EXIT=0 JSON=ok ERRORS=0 WARNINGS=0
RECOVERY_GROUP_START=32 FILES=4 ESLINT_EXIT=134 JSON=FAIL FILE=src/components/AgentScreen/agentEntrance.js
RECOVERY_GROUP_START=36 FILES=4 ESLINT_EXIT=0 JSON=ok ERRORS=0 WARNINGS=2
RECOVERY_GROUP_START=40 FILES=4 ESLINT_EXIT=0 JSON=ok ERRORS=0 WARNINGS=0
RECOVERY_GROUP_START=44 FILES=4 ESLINT_EXIT=0 JSON=ok ERRORS=0 WARNINGS=0
RECOVERY_TOTAL=OOM_BATCH2 FILES=24 GROUPS=6 PARSED=5 FAILED=1 ERRORS=0 WARNINGS=3
~~~

Aislamiento de tres archivos del sublote fallido:

~~~text
FILE=src/components/AgentScreen/agentEntrance.js ESLINT_EXIT=0 JSON_PARSE_EXIT=0 ... 0 0
FILE=src/components/AgentScreen/AgentMarkdown.jsx ESLINT_EXIT=0 JSON_PARSE_EXIT=0 ... 0 0
FILE=src/components/AgentScreen/AgentOfflineGuard.jsx ESLINT_EXIT=0 JSON_PARSE_EXIT=0 ... 0 1
~~~

AgentScreen.jsx sigue sin ser medible: el intento aislado con NODE_OPTIONS=--max-old-space-size=8192 terminó en ESLINT_EXIT=134 JSON_PARSE_EXIT=2, sin JSON de resultados.

Resultado honesto: hay 212 errores contados en los lotes parseables, con 87 archivos rojos adicionales a SeedingLog.jsx identificados. AgentScreen.jsx queda fuera del conteo por OOM; por eso el total repo-wide exacto es no determinable con este instrumento, y el número de archivos rojos es al menos 88 contando SeedingLog.jsx, o al menos 87 adicionales. No reporto 0 ni un total completo ficticio.

## Qué NO pude verificar

- No pude probar si una persona ejecutó git commit --no-verify, si el hook no estaba instalado en la máquina que creó 91593ff, o si una automatización usó la identidad humana guatoc. Git no conserva esa causa.
- No pude obtener un lint completo de los 2.294 archivos con un único proceso: el intento por lotes produjo OOM en 134; incluso AgentScreen.jsx aislado agotó el heap de 8 GB. El conteo final debe citarse como parcial, no como un total repo-wide exacto.
- No pude verificar un log de ESLint de CI para #2427 porque no existe un job de ESLint en el rollup ni en los jobs de las ejecuciones asociadas. Lo que sí se verificó es la ausencia del job y el éxito exclusivo de TSC/CodeQL entre los gates de código.
