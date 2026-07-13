#!/usr/bin/env bash
# Fusiona un adapter QLoRA-DPO de Granite, lo convierte a GGUF Q4_K_M y lo registra en Ollama.
#
# Uso en ALPHA, desde el repositorio chagra-e2e-nightly:
#   /ruta/a/Chagra/scripts/serve-finetuned.sh data/qlora-out-g41-def chagra-g41-def
#
# Variables opcionales:
#   LLAMA_CPP_DIR   Ruta de llama.cpp (predeterminado: $HOME/Workspace/llama.cpp)
#   FINETUNED_DIR   Directorio para GGUF finales (predeterminado: ./data/finetuned)
#   BASE_MODEL      Modelo base HF (predeterminado: ibm-granite/granite-4.1-8b)
#   PYTHON_BIN      Python con transformers, peft y torch (predeterminado: python3)
#
# Bench posterior, desde chagra-e2e-nightly:
#   node scripts/bench-contaminacion.mjs --local --model <nombre>

set -euo pipefail

usage() {
  echo "Uso: $0 <ruta-adapter> <nombre-ollama>" >&2
}

if [ "$#" -ne 2 ]; then
  usage
  exit 2
fi

ADAPTER_PATH="$1"
OLLAMA_MODEL="$2"
LLAMA_CPP_DIR="${LLAMA_CPP_DIR:-$HOME/Workspace/llama.cpp}"
CONVERTER="${LLAMA_CPP_DIR}/convert_hf_to_gguf.py"
QUANTIZER="${LLAMA_CPP_DIR}/llama-quantize"
PYTHON_BIN="${PYTHON_BIN:-python3}"
BASE_MODEL="${BASE_MODEL:-ibm-granite/granite-4.1-8b}"
FINETUNED_DIR="${FINETUNED_DIR:-$PWD/data/finetuned}"

missing=()
[ -f "$CONVERTER" ] || missing+=("convert_hf_to_gguf.py en $CONVERTER")
[ -x "$QUANTIZER" ] || missing+=("llama-quantize ejecutable en $QUANTIZER")
command -v ollama >/dev/null 2>&1 || missing+=("ollama en PATH")
command -v "$PYTHON_BIN" >/dev/null 2>&1 || missing+=("$PYTHON_BIN en PATH")

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Faltan herramientas requeridas:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo "Instale y compile llama.cpp, instale Ollama y configure LLAMA_CPP_DIR si usa otra ruta." >&2
  echo "Prepare también un entorno Python con: pip install transformers peft torch sentencepiece" >&2
  exit 1
fi

if [ ! -d "$ADAPTER_PATH" ]; then
  echo "No existe el directorio del adapter: $ADAPTER_PATH" >&2
  exit 1
fi

if [[ ! "$OLLAMA_MODEL" =~ ^[A-Za-z0-9._:-]+$ ]]; then
  echo "Nombre de Ollama inválido: $OLLAMA_MODEL" >&2
  exit 1
fi

mkdir -p "$FINETUNED_DIR"
safe_name="${OLLAMA_MODEL//[:\/]/-}"
FINAL_GGUF="$FINETUNED_DIR/${safe_name}-Q4_K_M.gguf"
WORK_DIR="$(mktemp -d "$FINETUNED_DIR/.serve-finetuned.XXXXXX")"
MERGED_DIR="$WORK_DIR/merged-hf"
F16_GGUF="$WORK_DIR/${safe_name}-F16.gguf"
Q4_GGUF="$WORK_DIR/${safe_name}-Q4_K_M.gguf"
MODELFILE="$WORK_DIR/Modelfile"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT INT TERM

echo "Fusionando adapter con $BASE_MODEL..."
"$PYTHON_BIN" - "$BASE_MODEL" "$ADAPTER_PATH" "$MERGED_DIR" <<'PY'
import sys

from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

base_model, adapter_path, output_path = sys.argv[1:]
model = AutoModelForCausalLM.from_pretrained(
    base_model,
    torch_dtype="auto",
    device_map="cpu",
    low_cpu_mem_usage=True,
)
merged = PeftModel.from_pretrained(model, adapter_path).merge_and_unload()
merged.save_pretrained(output_path, safe_serialization=True)
AutoTokenizer.from_pretrained(base_model).save_pretrained(output_path)
PY

echo "Convirtiendo modelo fusionado a GGUF F16..."
"$PYTHON_BIN" "$CONVERTER" "$MERGED_DIR" --outfile "$F16_GGUF" --outtype f16

echo "Cuantizando GGUF a Q4_K_M..."
"$QUANTIZER" "$F16_GGUF" "$Q4_GGUF" Q4_K_M
mv -f "$Q4_GGUF" "$FINAL_GGUF"

cat >"$MODELFILE" <<EOF
FROM $FINAL_GGUF

SYSTEM """Eres el agente agroecológico Chagra para Colombia. Responde con claridad y prudencia. No inventes datos, fuentes, contactos ni entidades. Si falta información necesaria, pide aclaración."""

TEMPLATE """{{- range .Messages }}
{{- if eq .Role "system" }}<|start_of_role|>system<|end_of_role|>{{ .Content }}<|end_of_text|>
{{- else if eq .Role "user" }}<|start_of_role|>user<|end_of_role|>{{ .Content }}<|end_of_text|>
{{- else if eq .Role "assistant" }}<|start_of_role|>assistant<|end_of_role|>{{ .Content }}<|end_of_text|>
{{- end }}
{{- end }}<|start_of_role|>assistant<|end_of_role|>"""
EOF

echo "Registrando $OLLAMA_MODEL en Ollama..."
ollama create "$OLLAMA_MODEL" -f "$MODELFILE"

echo "Modelo listo: $OLLAMA_MODEL"
echo "GGUF: $FINAL_GGUF"
echo "Bench: node scripts/bench-contaminacion.mjs --local --model $OLLAMA_MODEL"
