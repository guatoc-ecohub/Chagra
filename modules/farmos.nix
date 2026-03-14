{ config, pkgs, ... }: {

  # Exclusivo para la lógica del backend agroecológico de FarmOS.
  # Esta separación aísla los dominios de la infraestructura general.

  # Habilitamos el dominio de agricultura en el sistema
  guatoc.agriculture = {
    enable = true;
    postgresFarm.enable = true;
    farmos.enable = true;
  };
  
  # Si en el futuro FarmOS demanda dependencias exclusivas para el host
  # tales como plugins espaciales GIS nativos o configuraciones de proxy exclusivas
  # se declararán en este sub-módulo.
}
