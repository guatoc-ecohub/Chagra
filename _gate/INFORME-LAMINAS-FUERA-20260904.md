# Informe: láminas fuera, solo tintas

Fecha: 2026-09-04

## Galería publicada

La fuente de la galería no apareció tras una búsqueda honesta. Se buscaron, fuera de
`node_modules` y `.git`, el título `Galería de compai`, `galeria-compais`,
`zariguya-gemini-hero` y `compai/laminas` en `Workspace`, `worktrees` y `demos`;
también se revisó el historial Git accesible y el bundle. Solo apareció el artefacto
publicado `/home/kortux/demos/jaguares-catalogo/galeria-compais/assets/index-Cw7eJlNk.js`.
No hay source map, `package.json` ni configuración Vite junto a ese artefacto. El
propio bundle dice que su proyecto hermano usaba un clon aislado de Chagra en el
commit `23a6b7f29`, pero ese clon/fuente no está presente.

Por esa razón no se reconstruyó la galería desde cero, no se editó el bundle, no se
modificó la copia publicada y no se desplegó nada. Para publicar una galería sin
`compai/laminas` hace falta recuperar la fuente original y construir desde ella.

| Medición | Resultado |
| --- | --- |
| Antes informado | HTTP 200, 161 errores de consola por láminas 404 |
| Intento headed posterior, 2026-09-04 | HTTP 200, 166 errores de consola por `compai/laminas/*`; el remoto permanece sin desplegar |
| Captura | No válida: `shot3d` terminó con errores de página y no creó el PNG |
| `identify` | Falló con `unable to open image`, pues el PNG no existe |

La salida cruda está en `shot3d-galeria-compais-despues-no-desplegado.txt` e
`identify-galeria-compais-despues-no-desplegado.txt`.

## Limpieza reversible en Chagra

No se tocó `ChagraAgentAvatar.jsx`, Angelita, la rubber-hose archivada ni ninguna
ruta de `public/valle/compai/rigs/`. Se desmontaron los dos consumidores vivos de
raster que aún quedaban: el registro de `oso-baston` ahora usa `OsoBaston`, y
`ZariguyaCompaiEscena` usa `ZariguyaTrazado`.

Las seis `*LaminaViva` se sacaron del árbol de build. Sus bytes viven en
`/mnt/data/coldstore/chagra-laminas-fuera-20260904/src/visual/creatures/_archivo/`;
cada lugar equivalente bajo `src/visual/creatures/_archivo/` quedó como symlink
absoluto y reversible. También se movió el test histórico del jaguar. No se ejecutó
`rm` ni se borró ningún archivo.

El guardia `tests/unit/laminas-solo-tinta.test.js` exige que no haya una
`*LaminaViva.jsx` en el árbol vivo y que el oso del registro sea la tinta.

## Tanda 1: sujetos compai y láminas

Se ejecutó `npm run audit:huerfanos` antes y después. El control es regex sobre
fuente, por lo que cada caso se contrastó con `rg` sobre todo `src/`; no se usaron
los tres avatares que ya cubre el PR #3120.

| Cubo | Sujetos | Razón |
| --- | --- | --- |
| Vivo | `ChivitoTrazado`, `JaguarTrazado`, `LuciernagaTrazado`, `ZariguyaTrazado` | Los montan rutas alcanzables y los adaptadores canónicos correspondientes. |
| Vivo | `OsoBaston` | Lo monta el adaptador canónico y, después de este cambio, `CREATURES['oso-baston']`. |
| Vivo | `GuacamayaCompai` | `ChagraAgentAvatarGuacamaya` lo monta desde la vista del agente. |
| Declarado | Ninguno nuevo | No se agregó una excepción: esta tanda no halló una vitrina, demo o andamiaje que justificara dejar una lámina en el árbol vivo. |
| Propuesto para archivar, archivado reversiblemente | `ChivitoPunkLaminaViva` | Sin importador alcanzable; reemplazada por `ChivitoTrazado`. |
| Propuesto para archivar, archivado reversiblemente | `JaguarLaminaViva` | Solo la importaban pruebas; reemplazada por `JaguarTrazado`. |
| Propuesto para archivar, archivado reversiblemente | `LuciernagaLaminaViva` | Sin importador alcanzable; reemplazada por `LuciernagaTrazado`. |
| Propuesto para archivar, archivado reversiblemente | `ZariguyaLaminaViva` | Sin importador alcanzable; reemplazada por `ZariguyaTrazado`. |
| Propuesto para archivar, archivado reversiblemente | `OsoBastonLaminaViva` | Era el último raster del registro; se reemplazó por `OsoBaston`. |
| Propuesto para archivar, archivado reversiblemente | `ZariguyaGeminiLaminaViva` | Era el último raster de `ZariguyaCompaiEscena`; se reemplazó por `ZariguyaTrazado`. |

Cobertura: 12 sujetos de compai/láminas clasificados en esta tanda. Quedan 53 archivos
`.jsx` del directorio de criaturas fuera de esta clasificación inicial, principalmente
fauna y superficies no compai; no se les atribuyó una decisión por semejanza de nombre.

## Gates locales

- `npx vitest run scripts/__tests__/audit-componente-huerfano.test.mjs tests/unit/laminas-solo-tinta.test.js`: 2 archivos, 29 pruebas, pasa.
- `npm run audit:huerfanos`: sale 0. Su salida está en `audit-huerfanos-despues.txt`.
- `npx tsc --noEmit`: sale 1 porque este repositorio no tiene `tsconfig.json`; TypeScript imprimió ayuda, sin chequear archivos. Salida cruda: `tsc-no-emit.txt`.
- `npm run test`: ejecución final en curso al redactar este informe. Su salida cruda se guarda en `npm-run-test-final.txt` y debe leerse junto con su archivo `.exit`.
