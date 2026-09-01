// ── compai/escuchar.js — micrófono local → Whisper local → compAI ─────────
// Sin SpeechRecognition: captura del navegador y transcripción de alpha.

export function montarEntradaCompai({ decir, alTexto, alProbarVoz }) {
  const GAP_ENTRE_PANELES = 12;
  const estilo = (el, css) => { el.style.cssText = css; return el; };
  const caja = document.createElement('div');
  caja.id = 'compaiEntrada';
  estilo(caja, 'position:fixed;right:14px;bottom:18px;z-index:41;display:flex;gap:7px;align-items:center;font:600 13px system-ui,-apple-system,sans-serif');
  const oir = document.createElement('button');
  oir.type = 'button'; oir.textContent = '🎙 hablarle'; oir.title = 'Grabar una pregunta para el compañero';
  const saber = document.createElement('button');
  saber.type = 'button'; saber.textContent = '🧠 dato'; saber.title = 'Preguntar un dato del grafo local';
  const voz = document.createElement('button');
  voz.type = 'button'; voz.textContent = '🔊 oír'; voz.title = 'Probar la voz local del compañero';
  for (const b of [oir, saber, voz]) estilo(b, 'background:#14110f;color:#f3efe4;border:1.5px solid #a9d5cb;border-radius:18px;padding:8px 11px;cursor:pointer;box-shadow:0 4px 13px rgba(0,0,0,.32)');
  caja.append(oir, saber, voz); document.body.appendChild(caja);

  let climaVivo = null;
  let guiaSel = null;
  let climaResizeObserver = null;
  let guiaResizeObserver = null;
  const posicionarRespectoAlClima = () => {
    const rect = climaVivo?.getBoundingClientRect();
    if (!rect) { caja.style.bottom = '18px'; return; }
    const distanciaAlBordeInferior = window.innerHeight - rect.bottom;
    caja.style.bottom = `${distanciaAlBordeInferior + rect.height + GAP_ENTRE_PANELES}px`;
  };
  const posicionarRespectoAlGuia = () => {
    if (!climaVivo) return;
    const rect = guiaSel?.getBoundingClientRect();
    if (!rect) { climaVivo.style.removeProperty('bottom'); return; }
    const distanciaAlBordeInferior = window.innerHeight - rect.bottom;
    climaVivo.style.bottom = `${distanciaAlBordeInferior + rect.height + GAP_ENTRE_PANELES}px`;
  };
  const reposicionarPaneles = () => {
    posicionarRespectoAlGuia(); posicionarRespectoAlClima();
  };
  const observarClimaVivo = () => {
    const siguienteClima = document.getElementById('climaVivo');
    const siguienteGuia = document.getElementById('guiaSel');
    if (siguienteClima === climaVivo && siguienteGuia === guiaSel) {
      reposicionarPaneles(); return;
    }
    climaResizeObserver?.disconnect();
    guiaResizeObserver?.disconnect();
    climaVivo = siguienteClima;
    guiaSel = siguienteGuia;
    if (climaVivo) {
      climaResizeObserver = new ResizeObserver(posicionarRespectoAlClima);
      climaResizeObserver.observe(climaVivo);
    }
    if (guiaSel) {
      guiaResizeObserver = new ResizeObserver(reposicionarPaneles);
      guiaResizeObserver.observe(guiaSel);
    }
    reposicionarPaneles();
  };
  const climaMutationObserver = new MutationObserver(observarClimaVivo);
  climaMutationObserver.observe(document.body, { childList: true, subtree: true });
  addEventListener('resize', reposicionarPaneles);
  observarClimaVivo();

  let grabador = null, stream = null, partes = [];
  const parar = () => { if (grabador && grabador.state !== 'inactive') grabador.stop(); };
  async function enviar(audio) {
    oir.disabled = true; oir.textContent = '… escuchando';
    try {
      const r = await fetch('/api/compai/escuchar', { method: 'POST', headers: { 'Content-Type': audio.type || 'audio/webm' }, body: audio });
      const j = await r.json();
      const texto = String(j.text || '').trim();
      if (!r.ok) throw new Error(j.error || `Whisper ${r.status}`);
      if (!texto) return decir('No oí palabras en esa grabación. Probemos de nuevo, más cerca del micrófono.', { sinVoz: true });
      decir(`Le escuché: “${texto}”.`, { sinVoz: true });
      await alTexto(texto);
    } catch (e) {
      decir('No pude escucharle ahora mismo: mi oído local no respondió. Probemos de nuevo en un momento.', { sinVoz: true });
    } finally { oir.disabled = false; oir.textContent = '🎙 hablarle'; }
  }
  oir.onclick = async () => {
    if (grabador && grabador.state === 'recording') { parar(); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      partes = []; grabador = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '' });
      grabador.ondataavailable = (e) => { if (e.data.size) partes.push(e.data); };
      grabador.onstop = () => { const audio = new Blob(partes, { type: grabador.mimeType || 'audio/webm' }); stream.getTracks().forEach((t) => t.stop()); enviar(audio); };
      grabador.start(); oir.textContent = '■ terminar';
    } catch (e) { decir('No pude abrir el micrófono. Déle permiso al navegador y probamos otra vez.', { sinVoz: true }); }
  };
  saber.onclick = () => {
    const pregunta = window.prompt('Pregúntele al grafo local. Ejemplo: ¿a qué altitud va la acelga roja?');
    if (pregunta && pregunta.trim()) alTexto(pregunta.trim());
  };
  voz.onclick = () => { if (typeof alProbarVoz === 'function') alProbarVoz(); };
  return { destruir: () => {
    parar(); if (stream) stream.getTracks().forEach((t) => t.stop());
    climaResizeObserver?.disconnect(); guiaResizeObserver?.disconnect(); climaMutationObserver.disconnect(); removeEventListener('resize', reposicionarPaneles);
    caja.remove();
  } };
}
