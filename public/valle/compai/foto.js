// ── compai/foto.js — LA FOTO DEL COMPAÑERO (visión local, qwen3-vl @ M6000) ──
// El campesino le muestra una mata al compai: cámara → foto → qwen3-vl (local,
// gratis, por el proxy /api/ollama del _server.py) → el compai la comenta.
// GROUNDED: el prompt le prohíbe inventar diagnóstico; si no está seguro, lo dice.
// Portable ESM, sin dependencias. Lo monta portales.js pasándole `decir`.

const MODELO = 'qwen3-vl:4b';   // liviano y rápido en la M6000; sube a :8b si se quiere fino
const PROMPT = [
  'Usted es el compañero agroecológico de una finca campesina andina en Colombia.',
  'Mire la foto de una planta o del campo. En 1 o 2 frases cortas, en español sencillo y de usted,',
  'diga qué ve y UNA observación útil (una hoja, una plaga, el estado de la mata).',
  'Si no está seguro de qué es, dígalo con honestidad — NUNCA invente un diagnóstico ni un nombre.',
  'No dé consejos médicos. Hable como un vecino que sabe del campo, cálido y directo.',
].join(' ');

export function montarBotonFoto(decir, opts = {}) {
  const estilo = (el, css) => { el.style.cssText = css; return el; };

  // el botón vive abajo, discreto; aparece siempre (el compai puede o no estar)
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'compaiFotoBtn';
  btn.innerHTML = '📷 mostrarle una mata';
  estilo(btn,
    'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:40;'
    + 'background:#14110f;color:#f3efe4;border:2px solid #ffc46a;border-radius:22px;'
    + 'padding:8px 16px;font:600 14px system-ui,-apple-system,sans-serif;cursor:pointer;'
    + 'box-shadow:0 6px 18px rgba(0,0,0,.4);opacity:.92');
  document.body.appendChild(btn);

  let stream = null;
  function cerrar(cap) {
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (cap && cap.parentNode) cap.parentNode.removeChild(cap);
  }

  async function abrir() {
    // overlay de cámara a pantalla completa
    const cap = document.createElement('div');
    estilo(cap, 'position:fixed;inset:0;z-index:60;background:#000;display:flex;'
      + 'flex-direction:column;align-items:center;justify-content:center;gap:14px');
    const video = document.createElement('video');
    video.autoplay = true; video.playsInline = true; video.muted = true;
    estilo(video, 'max-width:100vw;max-height:74vh;object-fit:contain;background:#111');
    const barra = document.createElement('div');
    estilo(barra, 'display:flex;gap:14px;align-items:center');
    const foto = document.createElement('button');
    foto.textContent = '📸 tomar';
    estilo(foto, 'background:#ffc46a;color:#14110f;border:none;border-radius:26px;'
      + 'padding:12px 26px;font:700 17px system-ui;cursor:pointer');
    const cancelar = document.createElement('button');
    cancelar.textContent = 'cancelar';
    estilo(cancelar, 'background:#333;color:#eee;border:none;border-radius:26px;'
      + 'padding:12px 20px;font:600 15px system-ui;cursor:pointer');
    const aviso = document.createElement('p');
    estilo(aviso, 'color:#f3efe4;font:14px system-ui;text-align:center;max-width:80vw;margin:0');
    aviso.textContent = 'Apunte a la mata y tome la foto. El compai la mira aquí mismo, en la finca.';
    barra.append(foto, cancelar);
    cap.append(video, aviso, barra);
    document.body.appendChild(cap);

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, audio: false,
      });
      video.srcObject = stream;
    } catch (e) {
      cerrar(cap);
      decir('No pude abrir la cámara — déle permiso al navegador y probamos de nuevo.');
      return;
    }

    cancelar.onclick = () => cerrar(cap);
    foto.onclick = async () => {
      // capturar el cuadro actual
      const w = video.videoWidth || 720, h = video.videoHeight || 960;
      const cv = document.createElement('canvas');
      const lado = Math.min(1024, Math.max(w, h));
      const esc = lado / Math.max(w, h);
      cv.width = Math.round(w * esc); cv.height = Math.round(h * esc);
      cv.getContext('2d').drawImage(video, 0, 0, cv.width, cv.height);
      const b64 = cv.toDataURL('image/jpeg', 0.7).split(',')[1];
      cerrar(cap);
      decir('Déjeme mirarla bien…');
      try {
        const r = await fetch('/api/ollama/api/generate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: MODELO, prompt: PROMPT, images: [b64],
            stream: false, options: { temperature: 0.4, num_predict: 160 },
          }),
        });
        const j = await r.json();
        const texto = (j.response || '').trim();
        decir(texto || 'La vi, pero no me quedó claro qué es. Tomémosle otra más de cerca y con luz.');
      } catch (e) {
        decir('Vi la foto pero se me cayó la conexión con mis ojos. Probemos otra vez en un momento.');
      }
    };
  }

  btn.addEventListener('click', abrir);
  return { destruir: () => { cerrar(); if (btn.parentNode) btn.remove(); } };
}
