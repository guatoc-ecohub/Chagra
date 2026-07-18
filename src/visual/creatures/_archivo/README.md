# _archivo

Componentes retirados del elenco activo. NO se importan desde `src/visual/creatures/index.js`
ni desde ningún otro módulo del repo — quedan aquí solo como referencia histórica.

## OsoAndino.jsx + Borugo.jsx (+ borugoIdentidad.js)

Retirados el 2026-07 por decisión del operador: el diseño rubber-hose de ambos
personajes no convenció visualmente ("feos") y se sacaron del juego, del avatar
selector, del valle vivo y de cualquier registro (`CREATURES`, `AURA_POR_BICHO`,
`VIDA_REPERTORIO`, `ROPA_PERFIL_POR_BICHO`, `creatureIdle`, `creatures.css`, etc.).

El oso NEGRO biopunk (`AvatarOso` en `src/components/dashboard/GuardianEspiritu.jsx`)
es un personaje DISTINTO y sigue intacto — no confundir los dos.

Si algún día se rediseña el oso de anteojos o el borugo desde cero, este código
sirve de punto de partida (kit `_rubberhose`, lip-sync, modo poder, ropa por
clima, prop por mundo ya cableados), pero el dibujo/paleta habría que rehacerlos.
