"""
Voice NLU Partial Extraction
Extracts intent/entities from partial voice transcripts for task queue.

Supports both English keywords (original opencode impl) and Spanish (Colombian
operator voice via Whisper). Spanish→English alias preprocessing runs before
the existing intent detection logic.
"""

import re, datetime

# Aliases español colombiano → palabra-llave inglesa que el detector ya entiende.
# Aplicado como reemplazo whole-word antes del intent matching.
_ES_ALIASES = {
    # task_create triggers
    "crear": "create", "crea": "create", "creame": "create",
    "agendar": "create", "agenda": "create",
    "agregar": "add", "agrega": "add", "añadir": "add", "anadir": "add",
    "nueva": "new", "nuevo": "new",
    "tarea": "task", "issue": "task",
    # task_list triggers
    "lista": "list", "listame": "list", "listar": "list",
    "muestra": "show", "muestrame": "show", "ver": "show",
    # task_complete triggers
    "completar": "complete", "completa": "complete", "completo": "complete",
    "cerrar": "complete", "cierra": "complete",
    "terminar": "finish", "termina": "finish", "termine": "finish",
    "listo": "done", "lista": "done",  # ojo: "lista" puede ser list o done según contexto
    # priority_adjust triggers
    "prioridad": "priority",
    "subir": "up", "sube": "up", "incrementar": "up", "aumenta": "up",
    "bajar": "down", "baja": "down", "decrementar": "down",
    # priority levels
    "alta": "high", "alto": "high", "urgente": "high", "urgent": "high",
    "media": "medium", "medio": "medium",
    "baja": "low", "bajo": "low",
    "inmediata": "immediate", "inmediato": "immediate", "ya": "immediate",
    # bug_report triggers
    "error": "bug", "falla": "bug", "rompio": "bug", "rompió": "bug",
    "corregir": "bug", "corrige": "bug", "arreglar": "bug", "arregla": "bug",
    "reportar": "report", "reporta": "report",
}


def _apply_es_aliases(text):
    """Reemplaza palabras español por sus equivalentes inglés que el detector entiende."""
    def repl(m):
        w = m.group(0).lower()
        return _ES_ALIASES.get(w, w)
    return re.sub(r"\b\w+\b", repl, text, flags=re.IGNORECASE)


def extract_voice_nlu(t):
    if not t:
        return _e(t)
    x = _apply_es_aliases(t).lower().strip()

    def L(a, b):
        m, n = len(a), len(b)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for j in range(n + 1):
            dp[0][j] = j
        for i in range(m + 1):
            dp[i][0] = i
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                dp[i][j] = (
                    dp[i - 1][j - 1]
                    if a[i - 1] == b[j - 1]
                    else 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                )
        return dp[m][n]

    def F(kw):
        for w in re.findall(r"\w+", x):
            if w in kw or (len(w) > 3 and any(L(w, k) <= 2 for k in kw)):
                return True
        return False

    def fuzzy_match(w, kw):
        for k in kw:
            if w == k or (len(w) > 3 and L(w, k) <= 2):
                return True
        return False

    def get_desc():
        words = x.split()
        for i, w in enumerate(words):
            if (
                fuzzy_match(w, ["create", "add", "new"])
                and i + 1 < len(words)
                and fuzzy_match(words[i + 1], ["task"])
            ):
                desc = " ".join(words[i + 2 :])
                desc = re.sub(
                    r"\b(p0|p1|p2|p3|immediate|high|medium|low|priority)\b",
                    "",
                    desc,
                    flags=re.I,
                )
                return re.sub(r"\s+", " ", desc).strip()
        return None

    i = "unknown"
    if F(["create", "add", "new"]):
        i = "task_create"
    elif F(["list", "show"]):
        i = "task_list"
    elif F(["complete", "finish", "done"]):
        i = "task_complete"
    elif "priority" in x:
        i = "priority_adjust"
    elif F(["bug", "report"]):
        i = "bug_report"

    e, m, P = (
        {},
        [],
        {"p0": "P0-Immediate", "p1": "P1-High", "p2": "P2-Medium", "p3": "P3-Low"},
    )
    pp = lambda v: P.get(v.lower(), v.upper())

    if i == "task_create":
        desc = get_desc()
        if desc and len(desc) >= 3:
            e["description"] = desc
        else:
            m.append("description")
        p = re.search(r"\b(p0|p1|p2|p3|immediate|high|medium|low)\b", x, re.I)
        if p:
            e["priority"] = pp(p.group(1))
        else:
            m.append("priority")
    elif i == "task_list":
        p = re.search(r"\b(p0|p1|p2|p3|immediate|high|medium|low)\b", x, re.I)
        if p:
            e["priority_filter"] = pp(p.group(1))
    elif i == "task_complete" or i == "priority_adjust":
        tid = re.search(r"\b[0-9a-z]{15,30}\b", x)
        if tid:
            e["task_id"] = tid.group(0)
        else:
            m.append("task_id")
        if i == "priority_adjust":
            e["direction"] = (
                "up"
                if "up" in x
                else ("down" if "down" in x else (m.append("direction") or None))
            )
    elif i == "bug_report":
        m2 = re.search(r"(?:bug|report)\s+(.+)", x)
        desc = m2.group(1).strip() if m2 else x
        desc = re.sub(
            r"\b(attach|screenshot|photo|pic)\b.*", "", desc, flags=re.I
        ).strip()
        if len(desc) >= 3:
            e["description"] = desc
        else:
            m.append("description")

    n = len(e) + len(m)
    conf = round(
        ((0.9 if i != "unknown" else 0.0) + (len(e) / n if n > 0 else 0.0)) / 2, 2
    )
    return {
        "intent": i,
        "description": e.get("description"),
        "priority": e.get("priority"),
        "task_id": e.get("task_id"),
        "confidence": conf,
        "missing_fields": m,
        "raw_transcript": t,
        "timestamp": datetime.datetime.now().isoformat(),
    }


def _e(t):
    return {
        "intent": "unknown",
        "description": None,
        "priority": None,
        "task_id": None,
        "confidence": 0.0,
        "missing_fields": ["description"],
        "raw_transcript": t,
        "timestamp": datetime.datetime.now().isoformat(),
    }
