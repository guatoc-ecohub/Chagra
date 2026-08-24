# Mercado federado David, auditoría y estado operativo

Fecha de captura: 2026-08-24

## Resultado honesto

La fuente indicada fue revisada directamente:

`https://milpa-test.milpachoachi.co/es/#productos`

La página no es un SPA con API de productos en el cliente. Es HTML renderizado por Astro, con dos hojas CSS, sin `script src`, sin `fetch`, sin XHR y sin una ruta pública de catálogo descubierta en el bundle. Por eso el nodo MILPA conserva un snapshot explícito de la sección `#productos`, incluyendo solo valores que aparecen en esa fuente.

La comprobación contra el endpoint federado configurado como `/api/productos` no pasa todavía. El endpoint operativo consultado por el mantenedor devuelve seis productos de `mercado=milpa` que no coinciden con los ocho de la sección `#productos`: cambian nombres y precios. El código bloquea esa mezcla y mantiene el snapshot de David en el nodo; el central agrega los productos de otros nodos del API y el snapshot MILPA mientras no haya reconciliación.

Esto significa que la implementación está lista para verificación y revisión, pero no debe declararse como catálogo final reconciliado hasta que se corrija el feed o se confirme que la sección fuente a importar es otra.

## Productos reales encontrados

### Sección `#productos`, importada al nodo MILPA

Los ocho registros visibles son los siguientes. La fuente entrega nombre, precio, foto y descripción. No entrega unidad, productor por artículo ni tags, por lo que el snapshot conserva `unidad: null`, `productor: null` y `tags: []`.

| Nombre | Precio visible | Foto real | Unidad | Productor | Tags |
| --- | ---: | --- | --- | --- | --- |
| Rúcula | $4.000 | sí | no informado | no informado | no informados |
| Brócoli | $5.000 | sí | no informado | no informado | no informados |
| Calabacín redondo | $5.000 | sí | no informado | no informado | no informados |
| Calabacín redondo amarillo | $5.000 | sí | no informado | no informado | no informados |
| Calabacín redondo verde | $5.000 | sí | no informado | no informado | no informados |
| Cebolla cabezona roja | $3.500 | sí | no informado | no informado | no informados |
| Cebolla larga | $3.000 | sí | no informado | no informado | no informados |
| Cebolla puerro | $3.500 | sí | no informado | no informado | no informados |

La sección `Oferta de la semana` también contiene 21 tarjetas reales, separadas de `#productos`: Acelga amarilla $5.000, Acelga blanca $5.000, Albahaca $4.000, Acelga morada $5.000, Anís $4.000, Apio $3.500, Kale crespo morado $5.000, Cebollín $3.000, Kale crespo verde $5.000, Hinojo $4.000, Espinaca $4.500, Kale toscano $5.000, Lechuga crespa morada $3.500, Lechuga crespa verde $3.500, Lechuga hoja de roble verde $3.500, Lechuga hoja de roble morada $3.500, Lechuga romana verde $3.500, Limonaria $3.500, Repollo crespo verde $5.000, Tomate cherry $8.000 y Tomate san marzano $7.000. Esas tarjetas muestran stock, pero no unidad, productor ni tags. No se mezclaron en el snapshot porque la solicitud señaló `#productos` como fuente de verdad.

## Estructura implementada

- `src/data/davidMarketReference.js` contiene los ocho registros capturados de `#productos`, sus precios, fotos y descripciones, con campos ausentes explícitos.
- `src/services/federatedMarketService.js` normaliza `/api/productos`, conserva nombre, precio, unidad, foto, productor y tags, y compara nombres y precios contra el snapshot.
- `src/components/FederatedMarket.jsx` monta el mercado público con el lenguaje visual del sitio de David: portada editorial, fotografía real, tarjetas, búsqueda, filtros por nodo y detalle de procedencia.
- `mercado.html` ya no monta la galería de muestra anterior.
- `VITE_MARKET_NODE_ID=milpa` configura el nodo MILPA. `VITE_MARKET_NODE_ID=central` configura el agregador. El endpoint se consume por la ruta relativa `/api/productos`, sin URLs internas ni credenciales.

El nodo MILPA intenta consultar el feed para comprobarlo, pero no sustituye el snapshot si la comparación falla. El central consulta el feed completo; cuando detecta que la rama MILPA no coincide, agrega el snapshot MILPA y omite los seis registros MILPA discrepantes del feed. Los registros de otros nodos del feed se conservan con sus campos reales.

## Gate de coincidencia

Referencia: 8 registros de `#productos`.

Feed API observado: 10 registros en la vitrina central, seis con `mercado=milpa`.

Registros MILPA observados en el feed: Tomate San Marzano $9.000/libra, Tomate Cherry Mix $11.000/libra, Kale (col rizada) $6.000/atado, Espárragos verdes $14.000/atado, Acelgas de colores $5.000/atado y Aromáticas frescas $4.000/atado.

Resultado: **NO PASA**. Faltan los ocho nombres de la referencia y sobran seis nombres del feed. No hay coincidencias de nombre sobre las que validar precio. No se inventó ninguna unidad, productor o tag para hacer pasar el gate.

## Eliminación diferida de mercados viejos

No se ejecutó ninguna eliminación.

Después de recibir OK explícito y de verificar el nuevo nodo y el central en producción:

1. Congelar y respaldar la configuración, contenido y métricas de `demo.guatoc.co/mercado` y `mercado.guatoc.co`.
2. Confirmar que `milpa.guatoc.co` y `mercado.chagra.bio` responden, que el gate de nombres y precios pasa, y que carrito, fotos, filtros y degradación sin API funcionan.
3. Retirar las rutas y virtual hosts antiguos de los archivos de despliegue autorizados. Retirar sus entradas DNS solo después de confirmar que no queda tráfico válido.
4. Mantener una redirección temporal documentada si el operador la solicita. No borrar respaldos hasta cerrar el periodo de verificación.
5. Ejecutar smoke test de los dos dominios nuevos y comprobar que no quedan referencias públicas a los mercados antiguos.

Este plan queda como documentación operativa. La destrucción de `demo.guatoc.co/mercado` y `mercado.guatoc.co` queda fuera de este commit.
