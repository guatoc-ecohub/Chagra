# modules/ai/kokoro-tts.nix
# =============================================================================
# KOKORO-82M StyleTTS2 ONNX — Text-to-Speech en español Latam
# Puerto: 8088 (HTTP API)
# Voces: ef_dora (femenina cálida), em_alex (masculina)
# RTF 0.2 (~5x real-time CPU), MOS 4.2, footprint ~150 MiB
#
# Reemplaza Piper para confirmaciones + viable podcasts (queue/061).
# Piper se mantiene para confirmaciones triviales.
# =============================================================================

{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.kokoro-tts;
  aiCfg = config.guatoc.ai;
  registry = import ../../lib/registry.nix { inherit lib; };
in
{
  options.guatoc.ai.kokoro-tts = {
    enable = lib.mkEnableOption "Kokoro-82M ONNX TTS — voces español Latam" // {
      default = false;
    };

    port = lib.mkOption {
      type = lib.types.port;
      default = 8088;
      description = "Puerto HTTP del servicio Kokoro TTS.";
    };

    defaultVoice = lib.mkOption {
      type = lib.types.str;
      default = "ef_dora";
      description = "Voz por defecto: ef_dora (femenina) o em_alex (masculina).";
    };

    defaultFormat = lib.mkOption {
      type = lib.types.str;
      default = "opus";
      description = "Formato de audio por defecto: opus, mp3, wav.";
    };
  };

  config = lib.mkIf (aiCfg.enable && cfg.enable) {
    systemd.services.kokoro-tts = {
      description = "Kokoro-82M StyleTTS2 ONNX TTS service";
      after = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/kokoro-tts"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/kokoro-tts/models"
        ];
        ExecStart = "${pkgs.python3.interpreter} /run/kokoro-tts/server.py";
        Restart = "always";
        RestartSec = "10s";
        MemoryMax = "300M";
        PrivateTmp = true;
        NoNewPrivileges = true;
      };
      environment = {
        KOKORO_PORT = toString cfg.port;
        KOKORO_DEFAULT_VOICE = cfg.defaultVoice;
        KOKORO_DEFAULT_FORMAT = cfg.defaultFormat;
        KOKORO_MODEL_CACHE = "/mnt/fast/appdata/kokoro-tts/models";
      };
    };

    environment.etc."kokoro-tts/server.py".text = ''
      #!/usr/bin/env python3
      """
      Kokoro-82M ONNX TTS HTTP server.
      Sirve /tts POST: {"text":"...","voice":"ef_dora|em_alex","format":"opus|mp3|wav"}
      Retorna audio binario.
      """
      import os, sys, json, logging, asyncio
      from http.server import HTTPServer, BaseHTTPRequestHandler
      from urllib.parse import parse_qs

      logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
      log = logging.getLogger("kokoro-tts")

      PORT = int(os.environ.get("KOKORO_PORT", "8088"))
      DEFAULT_VOICE = os.environ.get("KOKORO_DEFAULT_VOICE", "ef_dora")
      DEFAULT_FORMAT = os.environ.get("KOKORO_DEFAULT_FORMAT", "opus")
      MODEL_CACHE = os.environ.get("KOKORO_MODEL_CACHE", "/mnt/fast/appdata/kokoro-tts/models")
      MODEL_PATH = os.path.join(MODEL_CACHE, "kokoro-v1.0.onnx")

      model = None
      model_voices = {}

      def load_model():
          global model, model_voices
          if model is not None:
              return

          try:
              from kokoro_onnx import KokoroOnnx
              log.info(f"Cargando modelo Kokoro desde {MODEL_PATH}...")

              if not os.path.exists(MODEL_PATH):
                  os.makedirs(MODEL_CACHE, exist_ok=True)
                  log.info("Modelo no encontrado. Descargando (lazy)...")
                  kokoro = KokoroOnnx()
                  kokoro.download(model_path=MODEL_PATH)
                  log.info(f"Modelo descargado a {MODEL_PATH}")

              model = KokoroOnnx(model_path=MODEL_PATH)
              model_voices = model.available_voices
              log.info(f"Kokoro ONNX cargado. Voces disponibles: {list(model_voices.keys())}")
          except ImportError:
              log.error("kokoro-onnx no instalado. Instalar: pip install kokoro-onnx")
              log.error("Alternativa: usar kokoro-http-server Docker (ver docs)")
              raise

      def synthesize(text, voice, output_format):
          global model
          if model is None:
              load_model()

          if voice not in model_voices:
              log.warning(f"Voz '{voice}' no disponible. Usando '{DEFAULT_VOICE}'.")
              voice = DEFAULT_VOICE

          log.info(f"Synthesizing: text={text[:50]}... voice={voice} format={output_format}")
          audio_data = model.create(text, voice=voice)
          return audio_data

      class TTSHandler(BaseHTTPRequestHandler):
          def log_message(self, fmt, *args):
              log.info(fmt % args)

          def do_POST(self):
              if self.path != "/tts":
                  self.send_error(404, "Not Found")
                  return

              try:
                  content_length = int(self.headers.get("Content-Length", 0))
                  body = self.rfile.read(content_length)
                  payload = json.loads(body)

                  text = payload.get("text", "").strip()
                  voice = payload.get("voice", DEFAULT_VOICE)
                  output_format = payload.get("format", DEFAULT_FORMAT)

                  if not text:
                      self.send_response(400)
                      self.send_header("Content-Type", "application/json")
                      self.end_headers()
                      self.wfile.write(json.dumps({"error": "text field required"}).encode())
                      return

                  audio = synthesize(text, voice, output_format)

                  if output_format == "wav":
                      mime = "audio/wav"
                      import io
                      import wave as wave_module
                      buf = io.BytesIO()
                      w = wave_module.open(buf, "wb")
                      w.setnchannels(1)
                      w.setsampwidth(2)
                      w.setframerate(24000)
                      w.writeframes(audio)
                      w.close()
                      body_out = buf.getvalue()
                  elif output_format == "mp3":
                      mime = "audio/mpeg"
                      body_out = audio
                  else:
                      mime = "audio/opus"
                      body_out = audio

                  self.send_response(200)
                  self.send_header("Content-Type", mime)
                  self.send_header("Content-Length", str(len(body_out)))
                  self.end_headers()
                  self.wfile.write(body_out)
                  log.info(f"TTS ok: {len(body_out)} bytes ({output_format})")

              except Exception as e:
                  log.error(f"TTS error: {e}")
                  self.send_response(500)
                  self.send_header("Content-Type", "application/json")
                  self.end_headers()
                  self.wfile.write(json.dumps({"error": str(e)}).encode())

          def do_GET(self):
              if self.path == "/health":
                  self.send_response(200)
                  self.send_header("Content-Type", "application/json")
                  self.end_headers()
                  self.wfile.write(json.dumps({
                      "status": "ok",
                      "model": "kokoro-82m-onnx",
                      "voices": list(model_voices.keys()) if model_voices else [DEFAULT_VOICE]
                  }).encode())
              else:
                  self.send_error(404, "Not Found")

      if __name__ == "__main__":
          load_model()
          server = HTTPServer(("0.0.0.0", PORT), TTSHandler)
          log.info(f"Kokoro TTS server listening on 0.0.0.0:{PORT}")
          server.serve_forever()
    '';
  };
}