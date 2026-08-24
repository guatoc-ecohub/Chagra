---
name: agent-change-guardrails
description: Guía cambios asistidos por agentes en Chagra con límites de permisos, protección anti-leak, revisión humana y evidencia reproducible para PRs.
license: AGPL-3.0
---

# Guardrails para cambios asistidos por agentes

Aplica esta guía a cualquier cambio creado, editado o revisado por un agente.
Un agente puede acelerar el trabajo, pero no sustituye la revisión humana ni
los gates del repositorio.

## Flujo seguro

1. Lee `AGENTS.md`, `CONTRIBUTING.md` y el `CLA.md` aplicables al cambio.
2. Sincroniza `origin/main` y crea una rama nueva desde ese punto.
3. Declara el alcance antes de editar. No borres archivos sin autorización
   explícita.
4. Cambia solo los archivos necesarios y conserva modificaciones preexistentes
   que no sean de tu tarea.
5. Ejecuta validaciones proporcionales al riesgo y revisa el diff completo.
6. Abre el PR hacia la rama solicitada y reporta la URL real junto con la
   evidencia de git y de los tests.

Nunca empujes directamente a `main`. Si el punto de partida tiene diferencias
no explicadas frente a `origin/main`, detén el trabajo y consulta.

## Límites de ejecución

Prioriza comandos de inspección y validación: `git status`, `git diff`, `git
log`, `rg`, `npm run lint`, `npm test`, `npm run test:e2e`, `npm run tsc:check`,
`npm run audit:bundle` y los scripts específicos de la superficie tocada.

No ejecutes comandos destructivos, no publiques paquetes, no cambies reglas de
protección, no accedas a credenciales y no instales dependencias sin hacer
explícito el motivo y el impacto.

## Anti-leak antes del commit

- No agregues URLs, nombres de host o IPs privadas.
- No agregues credenciales, claves, cookies ni datos personales.
- Usa `import.meta.env.VITE_*` para configuración del cliente y rutas relativas
  para APIs.
- Nunca registres credenciales OAuth ni las envíes a telemetría.
- No cruces por import estático el boundary de la extensión opcional.
- Revisa especialmente ejemplos, fixtures, comentarios y mensajes de error.

Antes de cada commit, inspecciona archivos eliminados:

```bash
git diff --diff-filter=D --name-only HEAD
git diff --diff-filter=D --name-only origin/main..HEAD
```

Si aparece un archivo fuera del alcance declarado, detén el commit y consulta.

## Modelo de datos

- La IA no muta un Asset directamente.
- Las inferencias entran como `log--observation` con `metadata.ai` y revisión
  humana cuando `needs_human_review` es verdadero.
- Las vistas derivadas se calculan desde Logs, no se persisten como campos del
  Asset.
- Surcos, camas y zonas son Assets `bundle:land`; no son padres estructurales y
  su eliminación no debe borrar plantas.

## Evidencia mínima del PR

Incluye comandos y resultados resumidos para:

```bash
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
git diff --diff-filter=D --name-only origin/main..HEAD
```

Añade los comandos de test ejecutados y su resultado. No afirmes que un gate o
un PR existe si no puedes mostrar su salida o URL.
