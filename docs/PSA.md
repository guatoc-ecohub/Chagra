# Módulo PSA — Pago por Servicios Ambientales

> Fuente: Decreto 1007/2018, Decreto 870/2017, DR-RESTAURACION-1.

## Datos

`src/data/psa.json`: 4 modalidades (hídrico, biodiversidad, GEI/carbono, cultural), requisitos del campesino, qué exige y qué habilita, monto $300-700k/ha/año, autoridad CAR.

## Servicio

`src/services/psaElegibilidad.js`:
- `evaluarPSA({altitud, enCuenca, enParamo, interes})` → elegibilidad + modalidades

## Guarda

- NO confundir con bonos de carbono privados. PSA es del Estado colombiano.
