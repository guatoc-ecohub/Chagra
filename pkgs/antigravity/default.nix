{ lib
, stdenv
, fetchurl
, autoPatchelfHook
, makeWrapper
, wrapGAppsHook3   # renombrado de wrapGAppsHook en nixpkgs-unstable
, alsa-lib
, at-spi2-atk
, at-spi2-core
, atk
, cairo
, cups
, dbus
, expat
, fontconfig
, freetype
, gdk-pixbuf
, glib
, gtk3
, libdrm
, libGL
, libsecret        # requerido por libmsalruntime.so (Microsoft Auth)
, libsoup_3        # requerido por libmsalruntime.so
, libX11
, libXScrnSaver
, libXcomposite
, libXcursor
, libXdamage
, libXext
, libXfixes
, libXi
, libXrandr
, libXrender
, libXtst
, libxcb
, libxkbcommon
, libxkbfile        # requerido por keymapping.node (native-keymap)
, libxshmfence     # renombrado de xorg.libxshmfence en nixpkgs-unstable
, mesa
, nspr
, nss
, pango
, udev
, webkitgtk_4_1    # requerido por libmsalruntime.so (webkit2gtk 4.1)
, xdg-utils
}:

stdenv.mkDerivation rec {
  pname   = "antigravity";
  version = "1.19.6";

  src = fetchurl {
    url    = "https://edgedl.me.gvt1.com/edgedl/release2/j0qc3/antigravity/stable/1.19.6-6514342219874304/linux-x64/Antigravity.tar.gz";
    sha256 = "1q999kdmdi4wn9g0dfbbyf1xr16i05k17yj07nqlph5wc2fjqll0";
  };

  # No hay fase de compilación — solo desempaquetar y parchear
  dontBuild    = true;
  dontConfigure = true;

  nativeBuildInputs = [
    autoPatchelfHook  # Parchea los ELF binaries para usar las librerías del Nix store
    makeWrapper
    wrapGAppsHook3
  ];

  # Librerías dinámicas que necesita el binario Electron
  buildInputs = [
    alsa-lib
    at-spi2-atk
    at-spi2-core
    atk
    cairo
    cups
    dbus
    expat
    fontconfig
    freetype
    gdk-pixbuf
    glib
    gtk3
    libdrm
    libGL
    libsecret
    libsoup_3
    libX11
    libXScrnSaver
    libXcomposite
    libXcursor
    libXdamage
    libXext
    libXfixes
    libXi
    libXrandr
    libXrender
    libXtst
    libxcb
    libxkbcommon
    libxkbfile
    libxshmfence
    mesa
    nspr
    nss
    pango
    udev
    webkitgtk_4_1
  ];

  installPhase = ''
    runHook preInstall

    # Crear estructura de directorios
    mkdir -p $out/opt/antigravity
    mkdir -p $out/bin
    mkdir -p $out/share/applications
    mkdir -p $out/share/pixmaps

    # Copiar todos los archivos al directorio de instalación
    cp -r . $out/opt/antigravity/

    # Hacer ejecutable el binario principal
    chmod +x $out/opt/antigravity/antigravity

    # NOTA: chrome-sandbox requiere setuid (4755) para el modo sandbox de Chromium.
    # El sandbox de Nix impide chmod 4755 durante el build, por lo que usamos
    # --no-sandbox en el wrapper. Esto es equivalente a cómo funciona Cursor/VS Code
    # en NixOS. Para entornos de producción con mayor seguridad, considera usar
    # bubblewrap (bwrap) como sandbox alternativo.

    # Crear wrapper que lanza el binario con las flags correctas
    makeWrapper $out/opt/antigravity/antigravity $out/bin/antigravity \
      --add-flags "--no-sandbox" \
      --prefix LD_LIBRARY_PATH : "${lib.makeLibraryPath buildInputs}" \
      --set ELECTRON_OZONE_PLATFORM_HINT "auto"

    # Crear entrada .desktop para el lanzador de aplicaciones
    cat > $out/share/applications/antigravity.desktop << EOF
    [Desktop Entry]
    Name=Antigravity
    Comment=AI-powered code editor by Google
    Exec=$out/bin/antigravity %F
    Icon=antigravity
    Type=Application
    Categories=Development;TextEditor;IDE;
    MimeType=text/plain;inode/directory;
    StartupWMClass=Antigravity
    EOF

    runHook postInstall
  '';

  meta = with lib; {
    description  = "AI-powered code editor by Google (Antigravity)";
    homepage     = "https://antigravity.dev";
    license      = licenses.unfree;
    platforms    = [ "x86_64-linux" ];
    maintainers  = [];
    # Paquete no disponible en nixpkgs — derivación local
    # Versión: 1.19.6 (build 6514342219874304)
  };
}

