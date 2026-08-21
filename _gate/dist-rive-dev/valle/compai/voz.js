// ── compai/voz.js — voz local del compañero, sin dependencias ──────────────
// Adaptador del valle: Kokoro queda detrás de /api/compai/tts; el navegador
// jamás conoce ni llama un host de alpha. No pertenece al núcleo portable.

export function crearVozCompai() {
  let audioActual = null;

  // Una pulsación explícita habilita audio en navegadores que bloquean la
  // reproducción automática. Es un WAV PCM silencioso de 10 ms, creado en
  // memoria: no sale de la finca ni descarga nada.
  function activar() {
    const wav = new Uint8Array([
      82,73,70,70,56,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,
      64,31,0,0,128,62,0,0,2,0,16,0,100,97,116,97,20,0,0,0,
      0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
    ]);
    const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
    const prueba = new Audio(url);
    prueba.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    return prueba.play().catch(() => {});
  }

  async function hablar(texto) {
    const frase = String(texto || '').trim().slice(0, 500);
    if (!frase) return;
    if (audioActual) { audioActual.pause(); URL.revokeObjectURL(audioActual.src); }
    const r = await fetch('/api/compai/tts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: frase }),
    });
    if (!r.ok) throw new Error(`TTS ${r.status}`);
    const blob = await r.blob();
    if (!blob.size) throw new Error('TTS vacío');
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioActual = audio;
    audio.addEventListener('ended', () => { URL.revokeObjectURL(url); if (audioActual === audio) audioActual = null; }, { once: true });
    await audio.play();
  }

  return { hablar, activar, parar: () => { if (audioActual) audioActual.pause(); } };
}
