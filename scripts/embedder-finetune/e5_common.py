"""Utilidades compartidas para cargar/encodear con modelos estilo E5
(mean pooling + normalize + prefijos 'query:'/'passage:').
Sin sentence-transformers: solo transformers+torch puro para no arriesgar
el torch CUDA del venv qlora-dpo (ver CLAUDE.md: nunca pip install sin --no-deps).
"""
import torch
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel


def load_model(name_or_path, device="cuda", dtype=torch.bfloat16):
    tok = AutoTokenizer.from_pretrained(name_or_path)
    model = AutoModel.from_pretrained(name_or_path, torch_dtype=dtype)
    model.to(device)
    return tok, model


def average_pool(last_hidden_states, attention_mask):
    mask = attention_mask[..., None].bool()
    last_hidden = last_hidden_states.masked_fill(~mask, 0.0)
    return last_hidden.sum(dim=1) / attention_mask.sum(dim=1)[..., None].clamp(min=1)


def encode_texts(texts, tok, model, device, prefix, max_length=128, batch_size=32, grad=False):
    """texts: list[str] SIN prefijo. prefix: 'query: ' o 'passage: '."""
    all_emb = []
    ctx = torch.enable_grad() if grad else torch.no_grad()
    with ctx:
        for i in range(0, len(texts), batch_size):
            chunk = [prefix + (t if t else "") for t in texts[i:i + batch_size]]
            enc = tok(chunk, max_length=max_length, padding=True, truncation=True, return_tensors="pt").to(device)
            out = model(**enc)
            emb = average_pool(out.last_hidden_state, enc["attention_mask"])
            emb = F.normalize(emb, p=2, dim=1)
            all_emb.append(emb if grad else emb.detach())
    return torch.cat(all_emb, dim=0)
