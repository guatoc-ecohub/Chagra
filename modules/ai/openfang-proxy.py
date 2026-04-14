#!/usr/bin/env python3
"""
OpenFang LLM Proxy — Fallback de OpenRouter a Ollama local.
Escucha en 127.0.0.1:11435, intenta OpenRouter primero,
si falla (timeout/402/5xx) cae a Ollama en localhost:11434.
Protocolo: OpenAI-compatible /v1/chat/completions
"""
import http.server
import json
import os
import urllib.request
import urllib.error
import sys

LISTEN_PORT = 11435
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "google/gemini-2.0-flash-001"
OLLAMA_URL = "http://127.0.0.1:11434/v1/chat/completions"
OLLAMA_MODEL = "qwen3.5:4b"
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
TIMEOUT_REMOTE = 15  # seconds


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        req = json.loads(body) if body else {}

        # Try OpenRouter first
        if OPENROUTER_KEY:
            result = self._try_provider(
                OPENROUTER_URL,
                {**req, "model": OPENROUTER_MODEL},
                {"Authorization": f"Bearer {OPENROUTER_KEY}", "Content-Type": "application/json"},
                TIMEOUT_REMOTE,
                "OpenRouter",
            )
            if result:
                self._respond(200, result)
                return

        # Fallback to Ollama
        result = self._try_provider(
            OLLAMA_URL,
            {**req, "model": OLLAMA_MODEL},
            {"Content-Type": "application/json"},
            120,
            "Ollama",
        )
        if result:
            self._respond(200, result)
        else:
            self._respond(502, json.dumps({"error": "All providers failed"}).encode())

    def _try_provider(self, url, payload, headers, timeout, name):
        try:
            data = json.dumps(payload).encode()
            r = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(r, timeout=timeout) as resp:
                if resp.status == 200:
                    body = resp.read()
                    print(f"[Proxy] {name} OK", file=sys.stderr, flush=True)
                    return body
                print(f"[Proxy] {name} HTTP {resp.status}", file=sys.stderr, flush=True)
        except urllib.error.HTTPError as e:
            print(f"[Proxy] {name} HTTP {e.code}: {e.reason}", file=sys.stderr, flush=True)
        except Exception as e:
            print(f"[Proxy] {name} failed: {e}", file=sys.stderr, flush=True)
        return None

    def _respond(self, code, body):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body if isinstance(body, bytes) else body.encode())

    def log_message(self, fmt, *args):
        pass  # Silence per-request logging


if __name__ == "__main__":
    server = http.server.HTTPServer(("127.0.0.1", LISTEN_PORT), ProxyHandler)
    print(f"[Proxy] LLM Fallback Proxy on :{LISTEN_PORT} (OpenRouter → Ollama)", file=sys.stderr, flush=True)
    server.serve_forever()
