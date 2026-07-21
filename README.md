# Rama de firmas del CLA

Rama de infraestructura que usa `.github/workflows/cla.yml`.

`signatures/cla.json` arranca con la lista de firmantes **vacía**: nadie ha firmado.
La rama existe únicamente para que el `checkout` del workflow tenga un ref válido.
Sin ella el job se cae antes de poder evaluar la allowlist, y marca en rojo a
contribuyentes que sí están autorizados.

El CLA Assistant escribe acá por su cuenta cuando alguien firma de verdad.
No editar a mano.
