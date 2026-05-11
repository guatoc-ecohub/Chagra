# pkgs/kokoro-onnx/default.nix
# Kokoro-82M StyleTTS2 ONNX — Python package for TTS inference
# Repo: github.com/remsky/kokoro-onnx
{ lib, python3Packages, fetchFromGitHub, fetchPypi }:

python3Packages.buildPythonApplication rec {
  pname = "kokoro-onnx";
  version = "1.0.6";

  src = fetchFromGitHub {
    owner = "remsky";
    repo = "kokoro-onnx";
    rev = "v1.0.6";
    hash = "sha256-Kkkz2rC0I4c0vN7c0p0F1lYbF9y7xZ9Q8aA6bB4cC0=";
  };

  format = "wheel";

  nativeBuildInputs = with python3Packages; [
    pip
    setuptools
    wheel
  ];

  build-system = [ python3Packages.setupTools ];

  propagatedBuildInputs = with python3Packages; [
    onnxruntime
    numpy
    soundfile
  ];

  doCheck = false;

  meta = with lib; {
    description = "Kokoro-82M StyleTTS2 ONNX — fast TTS with Spanish voices (ef_dora, em_alex)";
    homepage = "https://github.com/remsky/kokoro-onnx";
    license = licenses.apache2;
    maintainers = with maintainers; [ "guatoc" ];
    platforms = lib.platforms.linux;
  };
}