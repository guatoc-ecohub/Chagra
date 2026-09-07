#!/usr/bin/env bash
# Control de la tarea #100 (esclavos no mandan capturas / fallo silencioso).
# Prueba tg-send con un curl STUB (sin red): toda llamada real a curl se registra
# y responde ok:true con msg_id fijo. Así se miden las DOS direcciones del gotcha
# sin tocar Telegram y sin depender del token real.
#
# Uso: tg100-control.sh
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
STUB="$DIR/.tg100-stub"
mkdir -p "$STUB"
rm -f "$STUB/calls" "$STUB/token" 2>/dev/null
echo "TOKEN_STUB_1234567890:abcdefghijklmnopqrstuvwxyzABCDEFGHIJ" > "$STUB/token"
printf 'export TG100_STUB_DIR=%q\n' "$STUB" > "$STUB/env.sh"

cat > "$STUB/curl" <<EOF
#!/usr/bin/env bash
echo "\$(date +%s) :: \$*" >> "$STUB/calls"
printf '%s' '{"ok":true,"result":{"message_id":77777,"chat":{"id":208512105}}}'
EOF
chmod +x "$STUB/curl"

export PATH="$STUB:$PATH"
if [ ! -f "$HOME/.config/.tg-send-token" ]; then
  cp "$STUB/token" "$HOME/.config/.tg-send-token"; chmod 600 "$HOME/.config/.tg-send-token"
fi

run() { # $1 = etiqueta ; resto = comando
  local label="$1"; shift
  local out rc
  out=$("$@" 2>&1); rc=$?
  printf '=== %s ===\nrc=%s\n%s\n' "$label" "$rc" "$out"
}

OLD=/home/kortux/.local/bin/tg-send.bak-20260905-100-harden
NEW=/home/kortux/.local/bin/tg-send

# Solo método del endpoint en el registro (el URL lleva el token en la query).
show_calls() {
  local f="$STUB/calls" n
  [ -f "$f" ] || { echo "(sin llamadas a curl)"; return 0; }
  n=$(wc -l < "$f"); echo "$n llamada(s) a curl"
  grep -oE '/(sendPhoto|sendVideo|sendDocument|sendMessage|sendChatAction)' "$f" | tail -n 8
}

echo "────────────── A. COMPORTAMIENTO VIEJO (control que debe FALLAR hoy) ──────────────"
run "A1. OLD tg-send con PNG inexistente (gotcha: ruta como texto ok:true)" "$OLD" "$DIR/NO-EXISTE.png" "cap de prueba"
show_calls

rm -f "$STUB/calls"
echo "────────────── B. VERSIÓN NUEVA: el gotcha ahora FALLA ruidoso, sin red ──────────────"
run "B1. NEW tg-send con PNG inexistente (debe rc!=0 y 0 llamadas a curl)" "$NEW" "$DIR/NO-EXISTE.png" "cap de prueba"
show_calls
run "B2. NEW --doc con archivo inexistente (debe rc!=0)" "$NEW" --doc "$DIR/NO-EXISTE.pdf" "cap"
show_calls
run "B3. NEW texto plano normal (debe seguir funcionando, msg_id impreso)" "$NEW" "control texto de la tarea 100"
show_calls
run "B4. NEW PNG existente (debe entrar a sendPhoto y devolver msg_id)" "$NEW" "$DIR/avatar-tinta5-zariguya.png" "cap control 100"
show_calls
