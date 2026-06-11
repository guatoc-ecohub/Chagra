# IoT en Chagra — ojo barato, no cerebro

> Fuente: DR-IOT-1 (3/3 DeepSeek+Gemini+Meta, 2026-06-11).

## Principio

El IoT no es el cerebro de la finca — es un OJO BARATO. Solo al ACIERTA en:
invernadero alejado + cultivo de alto valor + 1 cámara + 2-3 sensores + SOLO ALERTAR (no automatizar).

NUNCA automatizar riego/ventilación: una válvula pegada = encharcado = más riesgo que beneficio.

## Hardware que no se oxida

- **Cámara**: ESP32-CAM OV2640 2MP (~$50-110k) o Tapo C210 ($133k)
- **Humedad suelo**: Capacitivo v1.2 ($12-18k) — NO resistivo
- **Temp/humedad**: SHT30 ($100k) — NO DHT11 ni DHT22 en invernadero húmedo
- **Luz**: BH1750 ($8-22k) — NO fotorresistencia
- **Energía**: Panel policristalino + LiFePO4 (caro, durable) o 18650 (barato, cambiar cada 2 años)

## Visión en cloud (M6000 NO sirve para VLMs)

Pipeline: foto ESP32 → SD (buffer 7d) → hotspot celular → Gemini Flash ($0.002/foto) → grounding AGE → alerta.
Costo: API ~$1/mes; plan de datos ~$15-21k/mes (lo que domina).

## Proyecto de bajo costo total

Hardware único ~$200-560k + $21k/mes plan datos. Menor que un pluviómetro digital de marca.
