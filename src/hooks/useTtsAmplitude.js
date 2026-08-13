import { useEffect, useRef, useState } from 'react';
import { getActiveAudio, onSpeakingChange } from '../services/ttsService';

const AUDIO_GRAPHS = new WeakMap();
let sharedAudioContext = null;

/** @param {Uint8Array|Float32Array} samples @returns {number} */
export function rmsFromSamples(samples) {
  if (!samples || samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples instanceof Uint8Array ? (samples[i] - 128) / 128 : samples[i];
    sum += value * value;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 2.4);
}

/** @param {number} level @returns {'V1'|'V2'|'V3'|'V4'|null} */
export function visemaFromAmplitude(level) {
  const n = Number.isFinite(level) ? level : 0;
  if (n < 0.035) return null;
  if (n < 0.12) return 'V1';
  if (n < 0.28) return 'V2';
  if (n < 0.55) return 'V3';
  return 'V4';
}

function getAudioGraph(audio) {
  if (!audio || typeof window === 'undefined') return null;
  const cached = AUDIO_GRAPHS.get(audio);
  if (cached) return cached;
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextCtor();
    }
    const context = sharedAudioContext;
    const source = context.createMediaElementSource(audio);
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.72;
    source.connect(analyser);
    // createMediaElementSource takes over the element output. Keep Kokoro
    // audible while the analyser reads the same signal.
    analyser.connect(context.destination);
    const graph = { context, analyser, samples: new Uint8Array(analyser.fftSize) };
    AUDIO_GRAPHS.set(audio, graph);
    return graph;
  } catch (_) {
    // A browser may reject a second graph for the same element. TTS remains
    // usable and the character falls back to its idle animation.
    return null;
  }
}

/** Reads the active Kokoro element and publishes a lightly throttled level. */
export default function useTtsAmplitude() {
  const levelRef = useRef(0);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let raf = 0;
    let lastPublish = 0;
    let speaking = false;

    const publish = (value, now) => {
      levelRef.current = value;
      if (now - lastPublish < 80) return;
      lastPublish = now;
      setLevel((previous) => Math.abs(previous - value) > 0.025 ? value : previous);
    };

    const tick = (now) => {
      if (!speaking) {
        publish(0, now);
        raf = 0;
        return;
      }
      const graph = getAudioGraph(getActiveAudio());
      if (!graph) {
        publish(0, now);
      } else {
        if (graph.context.state === 'suspended') graph.context.resume().catch(() => {});
        graph.analyser.getByteTimeDomainData(graph.samples);
        publish(rmsFromSamples(graph.samples), now);
      }
      raf = window.requestAnimationFrame(tick);
    };

    const onSpeaking = (active) => {
      speaking = Boolean(active);
      if (speaking && !raf) raf = window.requestAnimationFrame(tick);
      if (!speaking) publish(0, performance.now());
    };

    const unsubscribe = onSpeakingChange(onSpeaking);
    onSpeaking(Boolean(getActiveAudio()?.paused === false));
    return () => {
      unsubscribe?.();
      if (raf) window.cancelAnimationFrame(raf);
      levelRef.current = 0;
    };
  }, []);

  return { level, getLevel: () => levelRef.current };
}
