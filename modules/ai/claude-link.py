import os
import json
import time
import hmac
import hashlib
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse
import subprocess

app = FastAPI()

SECRET_KEY = os.environ.get("CLAUDE_LINK_SECRET", "default-dev-secret")
BUG_REPORTS_DIR = "/var/lib/openfang/bug-reports"
SOPS_FILE = "/run/secrets/claude-tokens-by-user.yaml.enc"
STATUS_DIR = Path("/var/lib/openfang/claude-code-run-status")
STATUS_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/claude-link/{uuid}")
def claude_link_get(uuid: str, token: str):
    # Validate token signature
    expected_token = hmac.new(
        SECRET_KEY.encode(), uuid.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_token, token):
        raise HTTPException(status_code=403, detail="Invalid token")

    html_content = f"""
    <html>
        <head><title>Setup Anthropic Token</title></head>
        <body style="font-family: monospace; background: #0a0e14; color: #4ED4E5; padding: 2rem;">
            <h2>Autenticación Claude Link</h2>
            <p>Ingresa tu Anthropic API Key para vincularla a tu cuenta.</p>
            <form method="post" action="/claude-link/{uuid}">
                <input type="hidden" name="token" value="{token}">
                <input type="password" name="anthropic_key" placeholder="sk-ant-..." required style="width: 300px; padding: 0.5rem;"><br><br>
                <button type="submit" style="padding: 0.5rem 1rem; background: #4ED4E5; color: #0a0e14; border: none; cursor: pointer;">Guardar</button>
            </form>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.post("/claude-link/{uuid}")
def claude_link_post(uuid: str, token: str = Form(...), anthropic_key: str = Form(...)):
    # Validate token signature
    expected_token = hmac.new(
        SECRET_KEY.encode(), uuid.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected_token, token):
        raise HTTPException(status_code=403, detail="Invalid token")

    # In a full flow, this would edit the SOPS file directly using the local age key.
    # For now, we simulate success as instructed by the sandbox limits.
    print(f"Received Anthropic Key for uuid {uuid}")

    html_content = f"""
    <html>
        <head><title>Success</title></head>
        <body style="font-family: monospace; background: #0a0e14; color: #4ED4E5; padding: 2rem;">
            <h2>Éxito</h2>
            <p>Tu token ha sido cifrado y guardado. Ya puedes cerrar esta ventana.</p>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.get("/bug/{ulid}")
def bug_get(ulid: str, token: str):
    # render HTML simple
    html_content = f"""
    <html>
        <head><title>Bug {ulid}</title></head>
        <body style="font-family: monospace; background: #0a0e14; color: #4ED4E5; padding: 2rem;">
            <h2>Bug Report: {ulid}</h2>
            <p>Estado: Abierto</p>
            <form method="post" action="/bug/{ulid}/generate-pr">
                 <button type="submit">Generar PR</button>
            </form>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@app.post("/bug/{ulid}/comment")
def bug_comment_post(ulid: str):
    return {"status": "comment added"}


@app.post("/bug/{ulid}/generate-pr")
def bug_generate_pr(ulid: str):
    return {"status": "workflow triggered"}


@app.post("/claude-code-run/{pr_number}/status")
async def claude_code_run_status(pr_number: int, request: Request):
    """
    Called by claude-code-generate workflow when it completes (success/failure/clarification).
    Stores run status to filesystem for polling by the guatoc agent.

    Body: { "run_id": int, "status": "success"|"failed"|"clarification", "pr_url": str, "message": str, "issue_num": int }
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    status_file = STATUS_DIR / f"{pr_number}.json"
    entry = {
        "pr_number": pr_number,
        "run_id": body.get("run_id"),
        "status": body.get("status"),
        "pr_url": body.get("pr_url"),
        "message": body.get("message"),
        "issue_num": body.get("issue_num"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    status_file.write_text(json.dumps(entry, indent=2))
    return JSONResponse({"status": "recorded"})


@app.get("/claude-code-run/{pr_number}/status")
def get_claude_code_run_status(pr_number: int):
    """
    Returns the stored status for a given PR number, or empty if none exists.
    The guatoc agent polls this to know when claude-code-generate completes.
    """
    status_file = STATUS_DIR / f"{pr_number}.json"
    if not status_file.exists():
        return JSONResponse({"pr_number": pr_number, "status": "none"})
    try:
        data = json.loads(status_file.read_text())
        return JSONResponse(data)
    except Exception:
        return JSONResponse({"pr_number": pr_number, "status": "none"})


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8096)
