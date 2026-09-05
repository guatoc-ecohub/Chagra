#!/usr/bin/env bash
# medir-regiones.sh <etiqueta> [ref=antes] — colores únicos y RMSE contra la referencia por región
# (ROIs en px de la captura de 600: coronilla · bigotes izq · lomo · vientre · cola) sobre <etiqueta>-idle.png
E="$1"; R="${2:-antes}"; D="$(cd "$(dirname "$0")" && pwd)"
declare -A ROI=( [coronilla]=150x60+205+62 [bigotes]=113x62+92+161 [lomo]=103x113+318+223 [vientre]=103x134+215+264 [cola]=103x164+441+295 )
printf "%-8s" "$E"
for r in coronilla bigotes lomo vientre cola; do c=$(magick "$D/$E-idle.png" -crop ${ROI[$r]} +repage -format '%k' info:); m=$(magick compare -metric RMSE \( "$D/$R-idle.png" -crop ${ROI[$r]} +repage \) \( "$D/$E-idle.png" -crop ${ROI[$r]} +repage \) null: 2>&1 | sed 's/.*(//;s/)//'); printf " %s=%s/%s" $r $c "${m:0:5}"; done
printf " figura_rmse=%s\n" "$(magick compare -metric RMSE "$D/$R-idle.png" "$D/$E-idle.png" null: 2>&1 | sed 's/.*(//;s/)//')"
