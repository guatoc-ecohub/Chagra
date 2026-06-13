# Módulo IoT — ojo barato, no cerebro

> Fuente: DR-IOT-1 (3/3 DeepSeek+Gemini+Meta, 2026-06-11).

## Datos

`src/data/iot-*.json`: hardware BOM con precios COP, sensores a evitar, lógica "¿vale la pena?", pipeline visión cloud, alertas umbrales, AGE schema.

## Principio

El IoT no es el cerebro — es un OJO BARATO. Solo alertar, NUNCA automatizar.

## Servicios

- `iotCostCalculator.js`: estima costo total kit IoT
- `iotValeLaPena.js`: lógica honesta sí/no
