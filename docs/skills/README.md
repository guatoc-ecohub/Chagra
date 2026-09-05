# docs/skills — skills de agente del repo Chagra

Skills de agente VERSIONADAS en el repo (`.claude/` está en `.gitignore`, así que
las skills committeadas viven acá). La flota (Claude Code / Codex / OpenCode) las
consume symlinkeando cada carpeta a su directorio de skills local:

```sh
ln -s "$PWD/docs/skills/valle-graphics-router"        .claude/skills/valle-graphics-router
ln -s "$PWD/docs/skills/modelo-procedural-desde-imagen" .claude/skills/modelo-procedural-desde-imagen
```
 Son guías de método destiladas de robos externos y adaptadas al valle
3D y a los seres vivos de Chagra. **Son método, no código vendorizado** salvo que
un SKILL lo diga explícito y respete la licencia de origen.

## Índice

| Skill | Qué hace | Robo de origen | Licencia origen |
|---|---|---|---|
| `valle-graphics-router/` | Orden de ejecución del trabajo gráfico + protocolo de validación visual (VisualContract) del valle. | Threejs-Awesome-Graphics-Agent-Skills v0.9.1 | `MIT AND GPL-3.0-only` (solo se roban patrones/ideas, no código) |
| `modelo-procedural-desde-imagen/` | Reconstrucción de un ser/objeto como modelo procedural (solo código) desde una imagen, con escultura por etapas y anti-sobre-afirmación. | img2threejs v1.4.4 | Apache-2.0 (permisiva) |

## Reglas de esta carpeta

- Cada skill **defiere** a la ley propia de Chagra donde exista: paleta/material
  → `LEY-VISUAL-VALLE.md`; datos de seres → `CONTRATO-GENERADOR-SERES.md` + grafo
  AGE. No se duplica lo que Chagra ya tiene mejor (verify-before-claim).
- Atribución y licencia de origen citadas en cada `SKILL.md`.
- Nada de vendorizar ejemplos GPL-3.0 al código del valle sin verificar la traza
  de licencia por ejemplo en el upstream.

Ledger completo de robos: `Chagra-strategy/ops/steals/INDEX-STEALS.md`.
