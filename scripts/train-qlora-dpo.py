#!/usr/bin/env python3
"""Entrena un adaptador QLoRA con DPO para el chat de Chagra.

El modo ``--dry-run`` valida la configuracion y los archivos JSONL sin cargar
el modelo ni reservar memoria CUDA. El entrenamiento solo comienza cuando se
invoca el script sin esa bandera.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable


BASE_MODEL = "ibm-granite/granite-3.3-8b-instruct"
ROOT_DIR = Path(__file__).resolve().parents[1]
TRAIN_FILE = ROOT_DIR / "data" / "dpo" / "train.jsonl"
HELDOUT_FILE = ROOT_DIR / "data" / "dpo" / "heldout.jsonl"
OUTPUT_DIR = ROOT_DIR / "data" / "qlora-out"
TARGET_MODULES = [
    "q_proj",
    "k_proj",
    "v_proj",
    "o_proj",
    "gate_proj",
    "up_proj",
    "down_proj",
]


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Lee y valida los parametros que se permiten variar en el experimento."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=float, default=1.0)
    parser.add_argument("--lr", type=float, default=5e-6)
    parser.add_argument("--beta", type=float, default=0.25)
    parser.add_argument("--base-model", default=BASE_MODEL)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)
    if not 1.0 <= args.epochs <= 2.0:
        parser.error("--epochs debe estar entre 1 y 2")
    if args.lr <= 0:
        parser.error("--lr debe ser mayor que cero")
    if args.beta <= 0:
        parser.error("--beta debe ser mayor que cero")
    return args


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Lee un JSONL y reporta la linea exacta cuando un registro es invalido."""
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"{path}:{line_number}: JSON invalido") from error
            validate_row(row, path, line_number)
            rows.append(row)
    if not rows:
        raise ValueError(f"{path}: el dataset esta vacio")
    return rows


def validate_messages(messages: Any, roles: Iterable[str], field: str) -> None:
    """Valida el subconjunto de mensajes aceptado por el dataset DPO."""
    allowed_roles = set(roles)
    if not isinstance(messages, list) or not messages:
        raise ValueError(f"{field} debe ser una lista no vacia")
    for message in messages:
        if not isinstance(message, dict):
            raise ValueError(f"{field} contiene un mensaje invalido")
        if message.get("role") not in allowed_roles:
            raise ValueError(f"{field} contiene un rol invalido")
        if not isinstance(message.get("content"), str) or not message["content"].strip():
            raise ValueError(f"{field} contiene contenido vacio")


def validate_row(row: Any, path: Path, line_number: int) -> None:
    """Valida el contrato producido por build-dpo-dataset.mjs."""
    try:
        if not isinstance(row, dict):
            raise ValueError("el registro debe ser un objeto")
        validate_messages(row.get("prompt"), ("system", "user"), "prompt")
        validate_messages(row.get("chosen"), ("assistant",), "chosen")
        validate_messages(row.get("rejected"), ("assistant",), "rejected")
    except ValueError as error:
        raise ValueError(f"{path}:{line_number}: {error}") from error


def completion_from_template(tokenizer: Any, prompt: list[dict[str, str]], completion: list[dict[str, str]]) -> str:
    """Obtiene solo la continuacion, usando el chat template real de Granite."""
    prompt_text = tokenizer.apply_chat_template(
        prompt, tokenize=False, add_generation_prompt=True
    )
    full_text = tokenizer.apply_chat_template(
        prompt + completion, tokenize=False, add_generation_prompt=False
    )
    if not full_text.startswith(prompt_text):
        raise ValueError("el chat template no produjo un prefijo DPO consistente")
    return full_text[len(prompt_text) :]


def flatten_rows(rows: list[dict[str, Any]], tokenizer: Any) -> list[dict[str, str]]:
    """Convierte los mensajes conversacionales al formato explicito de TRL."""
    flattened = []
    for row in rows:
        prompt_text = tokenizer.apply_chat_template(
            row["prompt"], tokenize=False, add_generation_prompt=True
        )
        flattened.append(
            {
                "prompt": prompt_text,
                "chosen": completion_from_template(tokenizer, row["prompt"], row["chosen"]),
                "rejected": completion_from_template(tokenizer, row["prompt"], row["rejected"]),
            }
        )
    return flattened


def dry_run(args: argparse.Namespace) -> None:
    """Muestra el plan y valida datos disponibles sin importar dependencias CUDA."""
    counts: dict[str, int | str] = {}
    for name, path in (("train", TRAIN_FILE), ("heldout", HELDOUT_FILE)):
        counts[name] = len(read_jsonl(path)) if path.exists() else "archivo pendiente"
    plan = {
        "base_model": args.base_model,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "beta": args.beta,
        "train_rows": counts["train"],
        "heldout_rows": counts["heldout"],
        "output_dir": str(OUTPUT_DIR),
        "target_modules": TARGET_MODULES,
    }
    print(json.dumps(plan, ensure_ascii=False, indent=2))


def train(args: argparse.Namespace) -> None:
    """Carga Granite en 4 bits, entrena el adaptador y evalua el heldout."""
    import torch
    from datasets import Dataset
    from peft import LoraConfig, prepare_model_for_kbit_training
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from transformers.models.auto import modeling_auto

    if not hasattr(modeling_auto, "MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES"):
        modeling_auto.MODEL_FOR_VISION_2_SEQ_MAPPING_NAMES = {}

    from trl import DPOConfig, DPOTrainer

    if not torch.cuda.is_available():
        raise RuntimeError("QLoRA-DPO requiere una GPU CUDA")
    if not torch.cuda.is_bf16_supported():
        raise RuntimeError("la GPU CUDA debe soportar bfloat16")

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    train_dataset = Dataset.from_list(flatten_rows(read_jsonl(TRAIN_FILE), tokenizer))
    eval_dataset = Dataset.from_list(flatten_rows(read_jsonl(HELDOUT_FILE), tokenizer))

    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        quantization_config=quantization,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    peft_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=TARGET_MODULES,
    )
    training_args = DPOConfig(
        output_dir=str(OUTPUT_DIR),
        num_train_epochs=args.epochs,
        learning_rate=args.lr,
        beta=args.beta,
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=8,
        gradient_checkpointing=True,
        max_length=1024,
        max_prompt_length=512,
        bf16=True,
        optim="paged_adamw_8bit",
        eval_strategy="epoch",
        save_strategy="epoch",
        logging_steps=5,
        report_to="none",
        remove_unused_columns=False,
    )
    trainer = DPOTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        processing_class=tokenizer,
        peft_config=peft_config,
    )
    trainer.train()
    metrics = trainer.evaluate()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    trainer.save_model(str(OUTPUT_DIR))
    tokenizer.save_pretrained(str(OUTPUT_DIR))
    trainer.log_metrics("heldout", metrics)
    trainer.save_metrics("heldout", metrics)
    print(
        json.dumps(
            {
                "heldout_reward_margin": metrics.get("eval_rewards/margins"),
                "heldout_reward_accuracy": metrics.get("eval_rewards/accuracies"),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def main() -> None:
    """Punto de entrada de linea de comandos."""
    args = parse_args()
    if args.dry_run:
        dry_run(args)
        return
    train(args)


if __name__ == "__main__":
    main()
