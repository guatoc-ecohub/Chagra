# fotos-cc — pipeline curado de fotos con licencia abierta

Herramienta **independiente y reutilizable** para ponerle fotos reales (CC / dominio
público) a cualquier catálogo de Chagra, **sin re-introducir desinformación**.

## Por qué existe

El 2026-07-09 una auditoría de visión encontró que **8 fotos de biopreparados
mostraban lo que NO era** (un espécimen mineral de barita en vez del caldo
sulfocálcico; compost inglés en vez de estiércol). Se retiraron con el criterio
**"mejor sin foto (cae al ícono, patrón `FotoAgua`) que con desinformación"**.

Este pipeline es la forma correcta de conseguir esas fotos "más adelante": la
**compuerta de visión** es obligatoria — una foto solo entra si un ojo (modelo de
visión o humano/Claude) confirma que **muestra de verdad el sujeto**.

## Diseño (4 pasos desacoplados)

```
manifiesto.json ─▶ buscar ─▶ candidatas.json ─▶ bajar ─▶ staging/*.jpg
                                                             │
                                          verificar (COMPUERTA DE VISIÓN)
                                                             │
                                               veredictos.json (aprobado: true/false)
                                                             │
                                        commitear ─▶ public/<catálogo>/<slug>.jpg + créditos.json
```

- **buscar** — API oficial de Wikimedia Commons (sin scraping, sin cuenta premium).
  Filtra a licencias **abiertas** (CC0 / CC-BY / CC-BY-SA / dominio público) y
  **descarta** fair-use / non-free / con restricciones.
- **bajar** — miniaturas de 800px al `staging/`.
- **verificar** — el corazón. Dos modos:
  - `--modo ollama --host http://alpha:11434 --model qwen2.5vl:7b` → pregunta a un
    modelo de visión local "¿esta foto muestra `<descripción_visual>`? SÍ/NO"
    (respuesta en texto plano, **sin `format:json`** — evita el bug conocido de
    qwen3-vl con imágenes).
  - `--modo manual` (default) → deja `veredictos.json` con `aprobado: null` para
    que un revisor (humano o Claude con visión) marque `true/false` mirando cada
    `archivo`. **Máxima integridad** para lotes críticos.
- **commitear** — solo las `aprobado: true` pasan a `public/<catálogo>/`. Las que
  no consiguieron foto verificada **se quedan con ícono** (honesto). Emite
  `créditos.json` (autor, licencia, url) para pegar en el array de créditos del
  data file.

## Uso

```bash
cd ops/fotos-cc
python3 foto_cc.py buscar    -m manifests/biopreparados.json -o work/candidatas.json
python3 foto_cc.py bajar     -c work/candidatas.json          -d work/staging
# compuerta de visión — automática (alpha) o manual:
python3 foto_cc.py verificar -c work/candidatas.json -d work/staging \
                             --modo ollama --host http://alpha:11434 --model qwen2.5vl:7b \
                             -o work/veredictos.json
#   (o) --modo manual  y llenar aprobado=true/false a mano/visión
python3 foto_cc.py commitear -v work/veredictos.json -m manifests/biopreparados.json
```

Solo **stdlib de Python** (urllib, json, base64). Cero dependencias, cero cuentas
premium, offline salvo las dos llamadas de red (Commons API + descarga; visión
local). `work/` es scratch — no se commitea.

## Reusar en otro catálogo

Copie `manifests/biopreparados.json` a `manifests/<lo-suyo>.json`, cambie
`catalogo`, `destino` y la lista de `sujetos` (cada uno con `slug`, `nombre`,
`descripcion_visual` **precisa** — es el criterio de la compuerta — y `busquedas`).
Nada más cambia.
