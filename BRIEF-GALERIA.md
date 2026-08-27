Crear una GALERÍA de todas las variantes de la ZARIGÜEYA, EXACTAMENTE como se hizo jaguar.guatoc.co (galería comparativa con todas las variantes rotuladas, componentes REALES animados). El operador la usará para DECIDIR cuál es la aprobada (como con el jaguar).

Repo: /home/kortux/Workspace/chagra (worktree propio off origin/dev). Las variantes viven en src/visual/creatures/:
- Zariguya.jsx (vector/rubber-hose base)
- ZariguyaLaminaViva.jsx (lámina rubber-hose viva)
- ZariguyaGeminiLaminaViva.jsx (lámina Gemini raster — la del avatar 2D actual)
- ZariguyaTrazado.jsx (trazado-riggeado — la de CREATURES actual)
+ ramas: fable/zariguya-huesos, fable/zariguya-trazado-riggeado, fable/zariguya-tinta-fina-20260825, feat/zariguya-compai-gestos. Traé de esas ramas los componentes que aporten variantes distintas (huesos, tinta) si se pueden montar.

Referencia de cómo se hizo: el agente de jaguar.guatoc.co montó los componentes reales con un harness Vite (galería HTML), rotuló cada uno (nombre + estado) + animó. Publicá en ~/demos/zariguya/ (docroot) para deploy a zarigueya.guatoc.co.
Cada tarjeta: la variante animada en sus estados (idle/caminando/hablando) + nombre + una nota (rubber-hose/gemini-raster/trazado/huesos/tinta). Que se vea si CAMINA (patas moviéndose) o es estático/frames.
Serví local (puerto libre). Reportá qué variantes montaste y cuáles no. NO tg-send — yo GPU-verifico + deploy zarigueya.guatoc.co.
