# pkgs/streamrip/default.nix
# Custom streamrip with Tidal credentials
{ lib, python3Packages, fetchFromGitHub }:

let
  # Custom Tidal credentials
  TIDAL_CLIENT_ID = "ZlgySnhkbW50WldLMGl4VA==";
  TIDAL_CLIENT_SECRET = "MU5tNUFmREFqeHJnSkZKYktOV0xlQXlLR1ZHbUlOdVhQUExIVlhBdnhBZz0=";
in

python3Packages.buildPythonApplication rec {
  pname = "streamrip";
  version = "2.1.0-custom";

  src = fetchFromGitHub {
    owner = "streamrip";
    repo = "streamrip";
    rev = "refs/tags/v2.1";
    hash = "sha256-xxxxx";  # Will be computed on build
  };

  format = "pyproject";

  build-system = [
    python3Packages.hatchling
  ];

  dependencies = with python3Packages; [
    aiohttp
    requests
    mutagen
    colourama
    tidalapi
  ];

  postPatch = ''
    # Patch tidal.py with custom credentials
    substituteInPlace rip/client/tidal.py \
      --replace "CLIENT_ID = ''" "CLIENT_ID = ''${TIDAL_CLIENT_ID}''" \
      --replace "CLIENT_SECRET = ''" "CLIENT_SECRET = ''${TIDAL_CLIENT_SECRET}''"
  '';

  meta = with lib; {
    description = "A music downloader for Qobuz, Tidal, and Deezer";
    homepage = "https://github.com/streamrip/streamrip";
    license = licenses.gpl3;
    maintainers = with maintainers; [ ];
  };
}
