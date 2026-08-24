# Skills operativos para agentes

Estas guías son el punto de entrada versionado para agentes y contributors que
trabajan en superficies de seguridad, observabilidad o evaluación en Chagra.
Son patrones de diseño y checklists, no una autorización para desplegar
infraestructura ni para modificar estado de producción.

## Catálogo

| Skill | Usar cuando |
|---|---|
| [mcp-security](./mcp-security/SKILL.md) | Se agrega o conecta un servidor MCP que expone herramientas o datos |
| [agent-observability](./agent-observability/SKILL.md) | Se instrumenta un agente, una llamada de modelo o una herramienta |
| [agent-change-guardrails](./agent-change-guardrails/SKILL.md) | Un agente propone cambios en el repositorio o abre un PR |
| [agent-evals](./agent-evals/SKILL.md) | Se cambia comportamiento, prompts, recuperación o selección de herramientas |

## Límites públicos

- No incluir URLs, IPs, nombres de hosts, rutas de despliegue ni identificadores
  de infraestructura privada.
- No incluir credenciales, datos de usuarios ni prompts reales.
- Configurar integraciones mediante variables de entorno y rutas relativas.
- Mantener las mutaciones de datos sujetas al modelo Asset + Log y a revisión
  humana cuando una inferencia de IA todavía no sea confiable.
- Validar los cambios con los scripts y workflows existentes antes de abrir el
  PR.

Estas guías adaptan patrones públicos del repositorio
[DevOps-Security-Agent-Skills](https://github.com/bagelhole/DevOps-Security-Agent-Skills),
publicado bajo MIT. Se incorporan de forma deliberadamente portable para no
arrastrar configuraciones de un entorno concreto.
