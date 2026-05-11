# modules/ai/kokoro-tts.nix
{ config, pkgs, lib, ... }:

let
  cfg = config.guatoc.ai.kokoro-tts;
  aiCfg = config.guatoc.ai;
  pythonScript = pkgs.writeScript "kokoro-tts-server.py" /* python */ ''
#!/usr/bin/env python3
import os, sys, json, logging, io
import wave as wave_module
from http.server import HTTPServer, BaseHTTPRequestHandler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("kokoro-tts")

PORT = int(os.environ.get("KOKORO_PORT", "8088"))
DEFAULT_VOICE = os.environ.get("KOKORO_DEFAULT_VOICE", "ef_dora")
DEFAULT_FORMAT = os.environ.get("KOKORO_DEFAULT_FORMAT", "opus")
MODEL_CACHE = os.environ.get("KOKORO_MODEL_CACHE", "/mnt/fast/appdata/kokoro-tts/models")
MODEL_PATH = os.path.join(MODEL_CACHE, "kokoro-v1.0.onnx")
VOICES_PATH = os.path.join(MODEL_CACHE, "voices")

model = None
model_voices = []

def load_model():
    global model, model_venues
    if model is not None:
        return
    try:
        from kokoro_onnx import KokoroOnnx
    except ImportError:
        log.error("kokoro-onnx no instalado. Ejecutar: pip install --break-system-packages kokoro-onnx")
        raise
    log.info(f"Cargando modelo Kokoro desde {MODEL_PATH}...")
    if not os.path.exists(MODEL_PATH):
        os.makedirs(MODEL_CACHE, exist_ok=True)
        log.info("Modelo no encontrado. Descargando...")
        KokoroOnnx.download(model_path=MODEL_PATH, voices_path=VOICES_PATH)
        log.info(f"Modelo descargado a {MODEL_PATH}")
    model = KokoroOnnx(model_path=MODEL_PATH, voices_path=VOICES_PATH)
    model_voices = list(model.available_voices) if hasattr(model, 'available_voices') else [DEFAULT_VOICE]
    log.info(f"Kokoro ONNX cargado. Voces: {model_voices}")

def synthesize(text, voice, output_format):
    global model
    if model is None:
        load_model()
    if voice not in model_venues:
        log.warning(f"Voz '{voice}' no disponible. Usando '{DEFAULT_VOICE}'.")
        voice = DEFAULT_VOICE
    log.info(f"Synthesizing: text={text[:50]}... voice={voice} format={output_format}")
    return model.create(text, voice=voice)

class TTSHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        log.info(fmt % args)
    def do_POST(self):
        if self.path != "/tts":
            self.send_error(404, "Not Found")
            return
        try:
            body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
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
                buf = io.BytesIO()
                w = wave_module.open(buf, "wb")
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000)
                w.writeframes(audio); w.close()
                body_out = buf.getvalue(); mime = "audio/wav"
            elif output_format == "mp3":
                body_out = audio; mime = "audio/mpeg"
            else:
                body_out = audio; mime = "audio/opus"
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
                "status": "ok", "model": "kokoro-82m-onnx",
                "voices": model_venues if model_venues else [DEFAULT_VOICE]
            }).encode())
        else:
            self.send_error(404, "Not Found")

if __name__ == "__main__":
    load_model()
    HTTPServer(("0.0.0.0", PORT), TTSHandler).serve_forever()
  '';
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
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        Type = "exec";
        RuntimeDirectory = "kokoro-tts";
        ExecStartPre = [
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/kokoro-tts"
          "${pkgs.coreutils}/bin/install -d -m 0755 /mnt/fast/appdata/kokoro-tts/models"
          "${pkgs.bash}/bin/bash -c 'pip install --no-cache-dir --break-system-packages kokoro-onnx 2>/dev/null || pip3 install --no-cache-dir --break-system-packages kokoro-onnx 2>/dev/null || true'"
          "${pkgs.bash}/bin/cp ${pythonScript} /run/kokoro-tts/server.py && ${pkgs.coreutils}/bin/chmod +x /run/kokoro-tts/server.py"
        ];
        ExecStart = "${pkgs.python3Packages.python}/bin/python3 /run/kokoro-tts/server.py";
        Environment = {
          KOKORO_PORT = toString cfg.port;
          KOKORO_DEFAULT_VOICE = cfg.defaultVoice;
          KOKORO_DEFAULT_FORMAT = cfg.defaultFormat;
          KOKORO_MODEL_CACHE = "/mnt/fast/appdata/kokoro-tts/models";
        };
        Restart = "always"; RestartSec = "10s";
        MemoryMax = "300M";
        NoNewPrivileges = true;
      };
    };
  };
}