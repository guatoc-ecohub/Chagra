# Task #robos-skills - Investigación de fuentes faltantes

## Estado del task
**ESCALATE_TO_OPUS**: Fuentes no disponibles en el worktree

## Skills requeridos
1. DevOps-Security-Skills
2. Threejs-Awesome-Graphics

## Fuentes mencionadas en task
- Ubicación esperada: `ops/steals/robos-2026-08-23`
- Estado: NO EXISTE en el worktree actual

## Búsqueda realizada
```bash
find . -type f -iname "*devops*"       # Sin resultados
find . -type f -iname "*threejs*"     # Sin resultados  
find ops -name "*2026-08-23*"         # Directorio no existe
find . -name "*robos*"                # Sin resultados
```

## Patrones identificados
Una vez disponibles las fuentes, la implementación seguiría este patrón:

### Estructura de skill existente (ej: accessibility)
```
.agents/skills/accessibility/
├── SKILL.md              # Frontmatter + contenido markdown
└── references/
    ├── WCAG.md
    └── A11Y-PATTERNS.md
```

### Frontmatter esperado
```yaml
---
name: skill-name
description: Trigger description
license: MIT
metadata:
  author: source-repo
  version: "1.0"
---
```

### skills-lock.json
```json
{
  "version": 1,
  "skills": {
    "skill-slug": {
      "source": "org/repo",
      "sourceType": "github",
      "computedHash": "sha256..."
    }
  }
}
```

## Información necesaria para continuar
1. Ubicación exacta de las fuentes de DevOps-Security-Skills
2. Ubicación exacta de las fuentes de Threejs-Awesome-Graphics
3. Confirmación del contenido esperado para cada skill
4. Confirmación de la estructura de referencias
5. Verificación de si son repositorios externos que deben descargarse

## Siguiente acción
Esperar resolución del operador sobre disponibilidad de fuentes.
