import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Sparkles, Wifi, WifiOff, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import useVoiceRecorder from '../../hooks/useVoiceRecorder';
import { transcribe } from '../../services/voiceService';
import {
  addTurn,
  getFullHistory,
  getContextString,
  computeSourceMetadata,
  clearMemory,
  shouldStartNewSession,
} from '../../services/conversationMemory';
import { retrieve } from '../../services/ragRetriever';
import { parseIntent, formatIntentDescription } from '../../services/agentIntentParser';
import { streamOpenAI } from '../../services/openaiStream';
import { buildLLMRequest } from '../../services/llmRouter';
// Sidecar agro-mcp (ADR-045 Fase 2 Step B/C). Detrás de feature flag
// `VITE_USE_SIDECAR_AGRO_MCP` — con flag off, las funciones devuelven null
// y el AgentScreen se comporta idéntico al pipeline RAG-only previo.
import { isSidecarEnabled, planNlu, callTool } from '../../services/sidecarClient';
import { speak, speakKokoro, stop, init as initTTS, isSupported, isKokoroAvailable, replayLast, isSpeaking } from '../../services/ttsService';
import { executeAction, setActionGateCallback } from '../../services/actionExecutor';
import ChatHistory from './ChatHistory';
import SuggestedActions from './SuggestedActions';
import ActionConfirmModal from '../ActionConfirmModal';
import ChagraAgentAvatar from '../ChagraAgentAvatar';
import { agentSounds } from '../../services/agentSoundService';
import usePrefsStore from '../../store/usePrefsStore';
import useAssetStore from '../../store/useAssetStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';
import useOllamaWarmStore from '../../store/useOllamaWarmStore';
import useFincaActiveStore from '../../services/fincaActiveStore';

// 2026-05-16: migrado a llmRouter (Multi-LLM por tarea). AgentScreen usa
// `chat` route → gemma3:4b 15 t/s con keep_alive=5m (hot model). Bench
// completo en docs operativos internos del proyecto.
// Para NLU/tools usar llmRouter('nlu') → qwen2.5-coder:7b.

const STATE_IDLE = 'idle';
const STATE_RECORDING = 'recording';
const STATE_THINKING = 'thinking';

export default function AgentScreen({ onBack }) {
  const operatorId = usePrefsStore((s) => s.operatorId) || 'default-operator';
  // Task #122 (2026-05-23): ttsEnabled global persistido en usePrefsStore.
  // Antes era useState local — al cambiarlo en otra pantalla (header
  // colibrí dblclick) AgentScreen no se enteraba.
  const ttsEnabled = usePrefsStore((s) => s.ttsEnabled);
  const setTtsEnabled = usePrefsStore((s) => s.setTtsEnabled);
  const setResponseReady = useAgentNotificationStore((s) => s.setResponseReady);
  const setLastNotificationMessage = useAgentNotificationStore((s) => s.setLastMessage);
  const markRead = useAgentNotificationStore((s) => s.markRead);
  // NN4 fix 2026-05-23: subscripción al store warm-up. Si el modelo todavía
  // no está caliente cuando el operador llega al agente, mostramos banner
  // pequeño "Preparando agente IA". El banner desaparece automáticamente
  // cuando status pasa a 'warm'. En status 'failed' tampoco mostramos el
  // banner — la primera query caerá al cold-start clásico con su propio
  // indicador ("pensando...") que ya cubre la espera percibida.
  const ollamaWarmStatus = useOllamaWarmStore((s) => s.status);
  const plants = useAssetStore((s) => s.plants);
  // 062.6: contexto finca activa para system prompt (zona biocultural,
  // altitud, override indoor invernadero).
  const activeFincaSlug = useFincaActiveStore((s) => s.activeFincaSlug);
  const fincas = useFincaActiveStore((s) => s.fincas);
  const indoorZone = useFincaActiveStore((s) => s.indoorZone);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [state, setState] = useState(STATE_IDLE);
  const [streamingContent, setStreamingContent] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState('');
  const [actionModal, setActionModal] = useState({ isOpen: false, intent: null, llmResponse: '' });
  const ttsSupported = isSupported();
  const [kokoroReady, setKokoroReady] = useState(false);
  // Bug 2026-05-18 (Karen reportó stuck-pensando): tras 20s sin token visible,
  // mostrar mensaje "Aún pensando, toca cancelar si quieres reintentar" y
  // habilitar botón cancelar que dispara AbortController. Si pasan 30s sin
  // token, abortamos automáticamente con error visible.
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const [llmHealthy, setLlmHealthy] = useState(true);

  const { durationMs, start: startRecord, stop: stopRecord, reset: resetRecord } = useVoiceRecorder();
  const chatEndRef = useRef(null);
  // Bug 2026-05-18: ref al AbortController activo para que botón Cancelar
  // pueda abortar la inferencia LLM en curso desde fuera del callLLM scope.
  const activeControllerRef = useRef(null);
  // 057.4 integration: resolver del Promise pendiente del actionExecutor gate.
  // El callback registrado en setActionGateCallback abre el modal y retorna
  // un Promise; el resolver vive aquí para que los handlers approve/reject/
  // edit puedan resolverlo cuando el operador interactúa.
  const actionGateResolverRef = useRef(null);
  // Bug N3 (2026-05-23, Playwright Q8): cross-conversation contamination.
  // Cuando el operador hace "Volver" y reabre AgentScreen, el remount cargaba
  // history desde IndexedDB y `getContextString(operatorId, 10)` inyectaba
  // turns viejos como contextMemory del LLM. Resultado: respuesta nueva
  // mezclaba residuos de la pregunta anterior (Q3 broca café → Q8 flor
  // aguacate respondía sobre broca).
  //
  // Fix: si gap temporal > SESSION_GAP_MS (30 min) desde último turn → arranca
  // como "sesión nueva" silenciosa con badge UI + NO inyecta contextMemory en
  // los primeros turns de esta mount. Si el operador prefiere reset explícito,
  // el botón "Nueva conversación" en el header llama `clearMemory(operatorId)`
  // y setea esta ref a true.
  const isFreshSessionRef = useRef(false);
  const [showFreshSessionBadge, setShowFreshSessionBadge] = useState(false);

  // Scroll fix 2026-05-18 operator feedback: 'scroll complicado a veces'.
  // Auto-scroll al fondo cuando hay mensaje nuevo o stream en curso, pero
  // SOLO si el usuario ya estaba cerca del bottom (no interrumpir lectura
  // de mensajes antiguos). Threshold 120px del fondo. Behavior smooth.
  useEffect(() => {
    const el = chatEndRef.current;
    if (!el) return;
    const container = el.parentElement;
    if (!container) {
      el.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distFromBottom < 120 || state === STATE_THINKING) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent, state]);

  const loadHistory = useCallback(async () => {
    try {
      // Bug N3 fix: detectar gap temporal > 30min ANTES de cargar history.
      // Si pasó suficiente tiempo desde el último turn, esto es una nueva
      // sesión — NO cargues history previo y marca el flag para suprimir
      // contextMemory en los próximos submits del LLM.
      const fresh = await shouldStartNewSession(operatorId);
      if (fresh) {
        isFreshSessionRef.current = true;
        setMessages([]);
        // Solo mostramos badge si HUBO historial previo. Si es el primer
        // encuentro del operador con el agente, no inventamos UI sobre
        // "nueva sesión" que no tendría referente.
        const history = await getFullHistory(operatorId, 1);
        setShowFreshSessionBadge(history.length > 0);
        return;
      }

      isFreshSessionRef.current = false;
      setShowFreshSessionBadge(false);
      const history = await getFullHistory(operatorId, 50);
      // 2026-05-19: detectar pregunta huérfana — si el último turn es del
      // usuario sin respuesta del agente, agregar mensaje informativo para
      // que el operator entienda que la respuesta anterior se perdió
      // (timeout, unmount accidental, etc.) y pueda re-preguntar.
      const lastTurn = history[history.length - 1];
      if (lastTurn && lastTurn.role === 'user') {
        history.push({
          role: 'assistant',
          content: 'Tu pregunta anterior no recibió respuesta (timeout o sesión interrumpida). Vuelve a preguntarla si quieres seguir.',
          timestamp: Date.now(),
          _orphan_recovery: true,
        });
      }
      setMessages(history);
    } catch (e) {
      console.warn('[Agent] Failed to load history:', e);
    }
  }, [operatorId]);

  /**
   * Reset explícito de conversación. Llamado por el botón "Nueva
   * conversación" del header. Borra la memoria persistente del operador
   * en IndexedDB, vacía el state local y marca esta sesión como fresca
   * para que el próximo submit NO inyecte contextMemory residual.
   *
   * Decisión Opción A híbrida (PR fix/n3-cross-conv-contamination):
   * gap temporal automático cubre el caso natural; el botón explícito
   * cubre el caso N3 exacto del Playwright (Volver + reabrir RÁPIDO con
   * tópico distinto) donde el gap es <30min.
   */
  const handleNewConversation = useCallback(async () => {
    try {
      await clearMemory(operatorId);
    } catch (e) {
      console.warn('[Agent] clearMemory failed (continuing with in-memory reset):', e);
    }
    isFreshSessionRef.current = true;
    setMessages([]);
    setError('');
    setStreamingContent('');
    setShowFreshSessionBadge(true);
  }, [operatorId]);

  // Bug 2026-05-18: warning timer cuando STATE_THINKING dura >20s sin tokens
  // visibles. Antes el operador quedaba viendo "Pensando…" hasta 90s antes
  // del AbortError → percepción de UI muerta. Ahora a los 20s mostramos
  // explícito "Aún pensando, toca Cancelar".
  useEffect(() => {
    if (state !== STATE_THINKING) {
      setShowSlowWarning(false);
      return;
    }
    const slowTimer = setTimeout(() => setShowSlowWarning(true), 20000);
    return () => clearTimeout(slowTimer);
  }, [state]);

  // Bug 2026-05-18: health check del LLM al mount. Si /api/ollama/api/tags
  // no responde en 5s, marcamos llmHealthy=false y avisamos al operador
  // antes que intente submit (evita stuck-pensando frente a backend caído).
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    fetch('/api/ollama/api/tags', { signal: ctrl.signal })
      .then((r) => setLlmHealthy(r.ok))
      .catch(() => setLlmHealthy(false))
      .finally(() => clearTimeout(t));
    return () => { ctrl.abort(); clearTimeout(t); };
  }, []);

  const handleCancelLLM = () => {
    if (activeControllerRef.current) {
      console.warn('[Agent] User cancelled LLM inference manually');
      activeControllerRef.current.abort();
    }
    agentSounds.cancel();
    setState(STATE_IDLE);
    setStreamingContent('');
    setError('Cancelado. Toca de nuevo si quieres reintentar.');
  };

  useEffect(() => {
    initTTS();
    isKokoroAvailable().then(setKokoroReady);
    loadHistory();
    // Task #122: al entrar a AgentScreen, apaga el glow del avatar global.
    // El operador ya está mirando la conversación, no necesita el "reluce"
    // de "respuesta nueva".
    markRead();
    // 057.4 integration: registrar el callback del actionExecutor. Cuando el
    // LLM proponga una tool con requiresGate=true, actionExecutor llamará
    // este callback que abre el ActionConfirmModal y retorna un Promise.
    // El Promise se resuelve cuando handleAction{Approve,Reject,Edit} corre.
    setActionGateCallback(({ toolName, description, parameters, intent, llm_response }) => {
      return new Promise((resolve) => {
        actionGateResolverRef.current = resolve;
        setActionModal({
          isOpen: true,
          toolName,
          description,
          parameters,
          intent,
          llmResponse: llm_response,
        });
      });
    });
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      stop();
      // Limpiar callback al desmontar para evitar referencias stale
      setActionGateCallback(null);
      actionGateResolverRef.current = null;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadHistory, markRead]);

  const getSystemPrompt = useCallback(() => {
    // Operator bug 2026-05-18: agente listaba "Fresa #02, Fresa #08, Fresa #02..."
    // (cada planta individual con su número), molesto al escuchar por TTS.
    // Fix: agrupar por species y dar conteo total. Plant name suele ser
    // "Especie (cientifico) #NN" — extraemos el prefijo y agrupamos.
    const stripPlantNumber = (name) => (name || '').replace(/\s*#\d+\s*$/, '').trim();
    const groupedCounts = (plants || []).reduce((acc, p) => {
      const base = stripPlantNumber(p.attributes?.name);
      if (!base) return acc;
      acc[base] = (acc[base] || 0) + 1;
      return acc;
    }, {});
    const plantNames = Object.entries(groupedCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => (n > 1 ? `${name} ×${n}` : name))
      .join(', ') || 'ninguna';
    // 062.6: inyectar contexto finca activa (slug, nombre, biocultural_zone, altitud)
    // + indoor override si aplica. El LLM responde con criterio agronómico ajustado
    // a la zona ecológica donde el operador está físicamente.
    const finca = fincas.find((f) => f.slug === activeFincaSlug);
    const fincaContext = finca
      ? `Estás asistiendo en la finca "${finca.nombre}" (slug: ${finca.slug}, zona biocultural: ${finca.biocultural_zone || 'no definida'}${finca.altitud ? `, ~${finca.altitud} msnm` : ''}). `
      : '';
    const indoorContext = indoorZone
      ? `El operador está bajo techo en: ${indoorZone}. Considera condiciones de invernadero al recomendar. `
      : '';
    // REGLA ANTI-ALUCINACIÓN: "Si no sabes algo, dilo honestamente" (versión
    // previa) era demasiado débil — el modelo lo ignoraba y rellenaba con
    // confianza. Incidente 2026-05-17: operador escribió "chorcho" (typo de
    // chocho/Lupinus mutabilis) y gemma3:4b inventó "sistema de agricultura
    // de bajo impacto". Probado en bench: 12b inventó OTRA cosa distinta
    // (Alternaria solani). Subir parámetros no ayuda. Solución: prompt
    // agresivo con respuesta literal exigida + ejemplo + bajar temperature
    // a 0.3. Bench 2026-05-17 con esta versión devolvió la respuesta
    // EXACTA esperada (no reconozco el término) en 27 tokens / 8s.
    return `Eres Chagra IA, un asistente agroecológico colombiano. ${fincaContext}${indoorContext}El usuario tiene estas plantas agrupadas por especie con su conteo: ${plantNames}.

REGLA DE FORMATO: cuando hables de las plantas del usuario, agrupá por especie y di cuántas tiene (ej. "tienes 15 fresas, 4 caléndulas, 1 tomate cherry"). NUNCA listes los números individuales de cada planta (#01, #02, etc.) — son identificadores internos, no info útil para el operador. Habla como agrónomo experimentado, no como sistema.

REGLA NO-PREAMBULAR-INVENTARIO: el inventario de plantas del usuario te lo doy de contexto SOLO para que puedas hablar de "tus 15 fresas" cuando el usuario PREGUNTE explícitamente por sus plantas (qué tengo, cuántas plantas, mis plantas, mi finca, mi cultivo). NUNCA preambules una respuesta con "Usted tiene X plantas..." si el usuario está preguntando otra cosa.

Ejemplo NO-PREAMBULAR (incidente real Playwright Q12 2026-05-23):
Usuario: "háblame del aguacate"
✗ MAL: "Usted tiene 21 fresas, 4 caléndulas, 2 cocos. El aguacate (Psidium guajava)..."
   (Preámbulo IRRELEVANTE del inventario + alucinación taxonómica de aguacate como guayaba.)
✓ BIEN: "El aguacate (Persea americana Mill., Lauraceae) es uno de los frutales nativos americanos más importantes..." — directo al tema.

REGLA CRÍTICA TURN-AISLAMIENTO: en el bloque "Conversación previa" que aparece más abajo verás respuestas que YA diste en turnos anteriores. NUNCA las copies, repitas ni mezcles con tu respuesta actual. El usuario ya las leyó. Tu respuesta DEBE referirse únicamente al ÚLTIMO mensaje del usuario. Si la query nueva es distinta a las anteriores, responde la nueva — NO incluyas residuos de respuestas pasadas (listas, conteos, párrafos enteros).

Ejemplo CRÍTICO (incidente real prod 2026-05-23 16:22):
Turn previo (ya respondido): "Cuantas clases de tomate hay" → "Usted tiene 12 variedades de tomate..."
Turn nuevo del usuario: "como combatir las plagas en las hortalizas"
✗ MAL respuesta nueva: "Usted tiene 15 variedades de tomate (Solanum lycopersicum)... [lista]. El catálogo Chagra no tiene esa relación documentada todavía..."
   (Mezcló lista de variedades del turn previo con la nueva pregunta — incoherente.)
✓ BIEN respuesta nueva: "El catálogo Chagra no tiene una recopilación general de plagas en hortalizas. ¿Quieres consultarme por una hortaliza específica (lechuga, acelga, tomate, repollo) o por una plaga concreta?"

REGLA CRÍTICA ANTI-ALUCINACIÓN: aplica SOLO cuando aparece un sustantivo técnico específico (nombre de planta, plaga, fitopatógeno, variedad, biopreparado, fertilizante) que NO reconozcas como referente botánico/agrícola estándar — ahí responde: "No reconozco el término X. ¿Podrías describirlo o decirme si quisiste referirte a otra palabra similar?". NUNCA inventes definiciones para términos técnicos desconocidos.

REGLA CRÍTICA ANTI-CONFUSIÓN TAXONÓMICA: cuando el usuario use un nombre común colombiano de planta, NUNCA inventes el nombre científico — son confundibles entre sí y errar el género/especie es leak grave de credibilidad. Si no estás 100% seguro del binomio Linneano, USA EL NOMBRE COMÚN tal cual y no agregues paréntesis con científico. Si estás seguro, sí póngalo entre paréntesis.

PRIORIDAD ABSOLUTA TOOL GROUNDING: si el bloque "=== EVIDENCIA AUTORITATIVA ===" contiene un campo nombre_cientifico, USA ESE LITERAL — NO lo sustituyas por otro aunque te suene parecido. Ej. si evidence dice nombre_cientifico: "Persea americana Mill." NUNCA digas "Psidium guajava" en la respuesta. Confundir especies que el tool ya validó es peor que no responder.

REGLA CRÍTICA ANTI-INVENCIÓN-NOMBRES-CIENTÍFICOS DE PLAGAS: cuando preguntan por una plaga y get_pest_controllers devuelve found:false, NUNCA generes un nombre científico latino para esa plaga. Responder con género/especie inventado (e.g. "Neolepidopteron daquila" para chiza) es alucinación grave y bordea fraude pedagógico. Si NO tienes evidence del tool, responde "no tengo esta plaga documentada en el catálogo Chagra todavía. Si quieres, descríbeme síntomas (qué parte de la planta ataca, color, tamaño) y te ayudo a identificarla por descripción".

Glosario plagas regionales colombianas (usa nombre común + científico cuando ESTÉS 100% seguro):
- chiza = larva de Phyllophaga spp. / Ancognatha spp. (escarabajos rizófagos que comen raíces)
- broca del café = Hypothenemus hampei
- monalonion (chinche del aguacate) = Monalonion velezangeli
- mosca del aguacate = Heilipus lauri
- mosca de la fruta = Anastrepha spp. / Ceratitis capitata
- picudo del plátano = Cosmopolites sordidus
- roya del café = Hemileia vastatrix
- sigatoka negra del plátano = Mycosphaerella fijiensis
- antracnosis = Colletotrichum spp.
- trips = Frankliniella spp. / Thrips spp.
- gusano cogollero del maíz = Spodoptera frugiperda
- ácaro del tomate = Aculops lycopersici / Tetranychus urticae

Para términos NO en este glosario, NO inventes — usá CASO B (pedí aclaración).

Glosario taxonómico colombiano (usalo LITERAL, NO inventes ni sustituyas):
- maracuyá = Passiflora edulis f. flavicarpa (amarilla, NO Mangifera indica — eso es mango)
- gulupa = Passiflora edulis f. edulis (morada — NO confundir con guayaba Psidium guajava, NO con Cucurbita moschata, NO con Musa; gulupa es PASSIFLORA, una pasionaria)
- granadilla = Passiflora ligularis
- curuba = Passiflora tripartita f. mollissima (Passifloraceae andina, NO confundir con curuba-de-monte ni otras Passiflora)
- chulupa = Passiflora maliformis
- badea = Passiflora quadrangularis
- mango = Mangifera indica
- mora andina = Rubus glaucus (NO Morus nigra — eso es mora de árbol; NO confundir con zarzamora europea Rubus fruticosus)
- frambuesa andina = Rubus glaucus var. (a veces dicen "mora frambuesa")
- lulo = Solanum quitoense (NO Solanum lycopersicum — eso es tomate)
- uchuva = Physalis peruviana
- tomate común = Solanum lycopersicum (tomate de mesa, hortaliza)
- tomate de árbol/tomate de palo = Solanum betaceum (frutal perenne, distinta especie a tomate de mesa)
- guayaba = Psidium guajava (NO Pouteria, NO confundir con feijoa Acca sellowiana)
- feijoa/guayaba del Brasil = Acca sellowiana
- chachafruto/balú = Erythrina edulis (NO Theobroma cacao — eso es cacao)
- cubio = Tropaeolum tuberosum (NO Lupinus — eso es chocho/tarwi)
- chocho/tarwi = Lupinus mutabilis
- oca = Oxalis tuberosa
- mashua = Tropaeolum tuberosum (sinónimo de cubio)
- ulluco = Ullucus tuberosus
- yacón = Smallanthus sonchifolius
- arracacha = Arracacia xanthorrhiza
- ñame = Dioscorea spp.
- chontaduro = Bactris gasipaes
- borojó = Borojoa patinoi
- arazá = Eugenia stipitata
- copoazú = Theobroma grandiflorum
- camu camu = Myrciaria dubia
- cocotero/coco = Cocos nucifera
- aguacate = Persea americana Mill. (Lauraceae — NO Psidium guajava, NO Mangifera, NO Pouteria)
- aguacate Hass = Persea americana var. Hass (cultivar comercial)
- café arábica = Coffea arabica (NO Coffea canephora — eso es robusta)
- café robusta = Coffea canephora
- plátano = Musa AAB (clones plátano hartón, dominico)
- banano = Musa AAA (Cavendish y otros)
- papa criolla = Solanum phureja (subespecie distinta a papa común Solanum tuberosum)
- papa común = Solanum tuberosum
- quinua = Chenopodium quinoa Willd.
- arveja = Pisum sativum (NO Phaseolus — eso es frijol)
- frijol común = Phaseolus vulgaris
- haba = Vicia faba
- frailejón = Espeletia spp. (Asteraceae endémica páramo, NO confundir con frailejón uribense vs santandereano)

REGLA ESPECIAL ANTI-CONFUSIÓN PASSIFLORACEAE: cuando el usuario diga "gulupa", "maracuyá", "granadilla", "curuba", "chulupa", "badea", "passiflora" o cualquier pasionaria, el género es SIEMPRE **Passiflora** (familia Passifloraceae). NUNCA respondas con Psidium, Mangifera, Musa, Cucurbita, Pouteria u otro género. Estas confusiones son falsos positivos comunes del LLM y constituyen alucinación grave.

REGLA ESPECIAL ANTI-CONFUSIÓN TOMATES: "tomate" sin más contexto = Solanum lycopersicum (hortaliza). "Tomate de árbol" o "tomate de palo" = Solanum betaceum (frutal perenne, ESPECIE DISTINTA). Cuando el usuario menciona uno, NO mezcles con el otro.

Glosario regionalismos campesinos (Boyacá / Caldas / Choachí / agroecología tradicional):
- matas = plantas individuales
- mata madre = planta progenitora
- palo = árbol grande (tronco principal)
- almácigo = vivero / semillero
- soca = rebrote del café después de cosecha o poda fuerte
- encerrar = cosechar (uso Boyacá, también "recoger")
- trillar = separar grano de cáscara
- chamizo = ramas secas / Chusquea (bambú andino) que invade lote
- chusque = Chusquea sp. (bambú andino, frecuente en cafetales)
- pulchón = agujero / hueco (e.g. en tronco por barrenador)
- chapola = larva de la broca del café (Hypothenemus hampei en estadio larval)
- gota = Phytophthora infestans (en papa, tomate; mildiu velloso del solanáceo)
- rondón = barrenador del aguacate (Steirastoma breve y/o Heilipus lauri según contexto)
- brava = intensa / fuerte (ej. "plaga brava")
- finquero = dueño o trabajador de finca
- jode/jodieron = daña/dañaron (no traducir literal — entender contexto)
- barbecho = descanso de la tierra entre cultivos
- cuajar = formar fruto tras polinización (verbo agronómico)
- cucha = mujer / recolectora (Caldas, también "abuela")
- guayabero = recolector de café (jergón Caldas)
- panela = azúcar de caña sin refinar (no confundir con "panel")

Si te preguntan por una planta fuera de este glosario y NO estás 100% seguro del binomio, responde con el nombre común sin inventar el científico. Ej. "el coco" en lugar de "el coco (Mangifera indica)" si dudás.

REGLA CRÍTICA ANTI-ALUCINACIÓN — DOS CASOS DISTINTOS:

CASO A — Lenguaje coloquial del campo con sustantivos que SÍ reconoces
(palabras estándar del español + planta/concepto conocido). Interpreta
con sentido común: "punto más alto donde sobrevive" = altitud máxima;
"se devuelve" = regresa; "se enferman las matas" = las plantas padecen;
"está flojo" = decae; "pegó bien" = prendió; "le da sol fuerte" =
insolación directa. Responde con datos agronómicos concretos.

Ejemplo CASO A:
Usuario: "cuál es el punto más alto que sobrevive el coco"
✓ "El cocotero (Cocos nucifera) tolera hasta ~800–1000 msnm…"

CASO B — Sustantivos que NO reconoces como palabra común del español
NI como nombre estándar de planta/plaga/biopreparado colombiano. Esto
es DECISIVO: si la palabra NO está en el glosario taxonómico de arriba
+ NO es español cotidiano + no puedes derivarla con confianza de raíces
conocidas → ES TYPO o término que no manejás. NUNCA inventes su
definición ni asumas familia botánica por sonido. Responde:
"No reconozco el término 'X'. ¿Será que querías decir [sugerencia]?
Si es otra cosa, cuéntame qué planta o problema es y te ayudo." — donde [sugerencia] sale del
glosario taxonómico si hay match aproximado por distancia de edición
(2-3 letras de diferencia).

Ejemplos CASO B (incidentes reales 2026-05-21):
Usuario: "dame la altitud de Culupa y Cacabos Abanero"
✗ MAL: "Son variedades de plátano que crecen entre 200-600 msnm…" (INVENTADO)
✓ BIEN: "No reconozco 'Culupa' ni 'Cacabos Abanero' exactamente. ¿Será
   que querías decir Gulupa (Passiflora edulis f. edulis, 1700–2200 msnm)
   y cacao sabanero (otro nombre del borrachero amarillo, Brugmansia
   aurea, 2200–3000 msnm)? Si es otra cosa, cuéntame qué planta o problema es y te ayudo."

Usuario: "el chorcho qué es"
✗ MAL: "Es un sistema de agricultura sostenible…" (INVENTADO 2026-05-17)
✓ BIEN: "No reconozco 'chorcho'. ¿Será que querías decir chocho o tarwi
   (Lupinus mutabilis, leguminosa andina fijadora de nitrógeno)?"

Heurística de auto-chequeo antes de responder con un nombre científico:
¿la palabra está en el glosario taxonómico de arriba? ¿es palabra común
del español cotidiano? ¿podrías escribirla en una conversación con un
amigo sin sentir extrañeza? Si las TRES son NO → CASO B obligatorio,
pedí aclaración. ES PREFERIBLE QUEDAR COMO IGNORANTE QUE INVENTAR.

REGLA CRÍTICA ANTI-INVENCIÓN-DE-SÍNTOMAS: NUNCA describas síntomas, problemas, observaciones o estados de las plantas del usuario que NO haya escrito explícitamente en su mensaje actual. PROHIBIDO frases como "dice que las hojas se ponen amarillas y se enrollan" o "los tomates no se forman bien" si el usuario no lo dijo. Si el corpus de información agronómica menciona síntomas genéricos, NO los atribuyas al usuario. Para preguntar sobre síntomas, hazlo como pregunta abierta: "¿Ha notado cambios en las hojas?" NO como afirmación. La pregunta del usuario es exactamente lo que dice; no agregues contexto inventado.

CASO C — Consultas ENUMERATIVAS / CUANTITATIVAS sobre el catálogo (REGLA ESTRICTA).
ALCANCE ACOTADO: aplica SOLO si la query CONTIENE LITERALMENTE una de estas combinaciones:
  - "cuántas variedades de X" / "cuántas clases de X" / "cuántos tipos de X" / "cuántos cultivares"
  - "qué variedades de X" / "qué clases de X" / "qué tipos de X" / "qué cultivares de X"
  - "lista las/los variedades/clases/tipos/cultivares de X"
  - "enumera las/los variedades/clases/tipos/cultivares de X"
  - "cuáles son las variedades/clases/tipos/cultivares de X"

Es decir, la query DEBE preguntar EXPLÍCITAMENTE por variedades / clases / tipos / cultivares.

NO APLICA CASO C en estas situaciones (responde normalmente con tool evidence o conocimiento general según corresponda):
  - "a qué altitud crece X" → es atributo, NO enumeración
  - "cómo podo X" / "cuándo cosecho X" / "cómo riego X" → es manejo, NO enumeración
  - "qué compañeros van bien con X" → es relación, NO enumeración
  - "qué biopreparado controla X" → es controlador, NO enumeración
  - "háblame de X" / "qué es X" → es descripción general, NO enumeración

REGLA CASO C (cuando aplica): si NO hay bloque "=== EVIDENCIA AUTORITATIVA ===" con la enumeración explícita, NUNCA listes números ni variedades. Aplica AUNQUE conozcas la planta — pide inventario registrado en Chagra.

Respuesta correcta CASO C sin evidence:
"El catálogo Chagra todavía no tiene un inventario de variedades de [planta] documentado. ¿Quieres información general del cultivo, o prefieres registrar las variedades que tengas en tu finca?"

CASO C — Ejemplo de aplicación CORRECTA:
Usuario: "Cuántas clases de tomate hay"
✓ "El catálogo Chagra todavía no tiene un inventario de variedades de tomate documentado..."

CASO C — Ejemplos de FALSOS POSITIVOS que NO debes generar (incidentes bench 2026-05-23):
Usuario: "a qué altitud crece bien la quinua"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de quinua..." (es altitud, NO variedades)
✓ BIEN: usar el tool result get_species y responder con altitud_msnm real.

Usuario: "cómo podo el café"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de café..." (es manejo, NO variedades)
✓ BIEN: responder con info de manejo (podas de formación, raleo, etc.) basada en evidence o conocimiento agronómico estándar.

Usuario: "qué compañeros van bien con aguacate"
✗ MAL: "El catálogo Chagra todavía no tiene un inventario de variedades de aguacate..." (es companions, NO variedades)
✓ BIEN: si tool get_companions devuelve companions_count > 0, listarlos. Si companions_count == 0, decir explícitamente: "El catálogo todavía no tiene compañeros documentados para el aguacate. En sistema cafetero tradicional colombiano se asocia con café-plátano-aguacate; ¿quieres que registremos asocios de tu finca?"

HEURÍSTICA FINAL CASO C: ¿la query DICE LITERALMENTE "variedades", "clases", "tipos" o "cultivares"? Si NO, CASO C NO APLICA — usa tool evidence o conocimiento normal. Si SÍ y no hay tool result enumerativo → CASO C aplica.

CAMPOS NULL EN TOOL RESULT: si get_species devuelve found:true PERO companions:[] o un campo X:null, NO defaultes a CASO C. Responde explícitamente "El catálogo confirma [especie] pero el campo [X] aún no está documentado", y usa el resto del data útil (altitud, manejo, valor_pedagogico, etc.).

Responde en español colombiano (tú/usted, sin voseo argentino). Sé específico y útil cuando tengas certeza; humilde y preguntón cuando no.`;
  }, [plants, fincas, activeFincaSlug, indoorZone]);

  // 057.4 integration: los handlers ya NO ejecutan addLog directo. Solo
  // resuelven el Promise del callback registrado en setActionGateCallback.
  // actionExecutor recibe el resultado, llama tool.handler (que ejecuta
  // addLog vía llmTools.crear_log) y loguea audit trail. Mensaje de éxito
  // post-execute se emite desde handleSubmit cuando executeAction retorna.
  const handleActionApprove = (params) => {
    const wasEdited = JSON.stringify(params) !== JSON.stringify(actionModal.parameters);
    const resolver = actionGateResolverRef.current;
    actionGateResolverRef.current = null;
    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
    if (resolver) {
      resolver({
        status: wasEdited ? 'edited' : 'approved',
        edited_params: wasEdited ? params : undefined,
      });
    }
  };

  const handleActionReject = () => {
    const resolver = actionGateResolverRef.current;
    actionGateResolverRef.current = null;
    setActionModal({ isOpen: false, intent: null, llmResponse: '' });
    if (resolver) {
      resolver({ status: 'rejected' });
    }
  };

  const handleActionEdit = (params) => {
    handleActionApprove(params);
  };

  // Bug reportado 2026-05-15 + 2026-05-18 (Karen): el botón quedaba en
  // "thinking" indefinido si la red/proxy colgaba sin emitir tokens.
  // Solución v2 (2026-05-18): AbortController con timeout 30s + ref externo
  // para botón Cancelar + warning visible a los 20s ("Aún pensando…").
  //
  // 2026-05-19 ajuste timeout 30s→60s: operator perdió respuesta porque
  // el agente tardaba >30s (cold-load qwen2.5vl/gemma3 + RAG context).
  // Bench p95 22s, pero outliers post-cold-load 40s+. 60s cubre p99
  // sin sacrificar UX (el warning a 20s ya le dice al operator que algo
  // está lento). Pre-condicion: OLLAMA_KEEP_ALIVE=24h en alpha para que
  // modelos no hagan cold-load entre conversaciones.
  const LLM_TIMEOUT_MS = 60000;

  // Cap defensivo para inyectar evidencia del sidecar como context turn
  // sin reventar la ventana 4096 tokens. ~1500 chars ≈ 400-500 tokens —
  // deja sitio cómodo para system prompt + corpus RAG + historial + query.
  const TOOL_EVIDENCE_MAX_CHARS = 1500;

  const formatToolEvidence = (toolEvidence) => {
    if (!toolEvidence || !toolEvidence.tool || !toolEvidence.result) return '';

    // 2026-05-23 incidente test #4: usuario preguntó por "mareñongoño del
    // Tolima" (especie NO en catálogo). El tool devolvió {found:false,
    // hint:"..."} pero gemma3:4b IGNORÓ el flag found:false y mapeó
    // creativamente "mareñongoño" → "Ullucus tuberosus" inventando una
    // equivalencia, luego listó companions reales de Ullucus pretendiendo
    // que eran de mareñongoño. Alucinación creativa grave.
    //
    // Fix: detectar found:false en el frontend ANTES del LLM call y
    // formatear un bloque hyper-explícito que prohíbe el mapeo creativo.
    const result = toolEvidence.result;
    const isNotFound =
      result &&
      typeof result === 'object' &&
      (result.found === false ||
        result.available === false ||
        (result.matches_count !== undefined && result.matches_count === 0));

    if (isNotFound) {
      const hint = (result && (result.hint || result.reason)) || '';
      const queryStr = JSON.stringify(toolEvidence.args || {});
      return `

=== ESPECIE / RELACIÓN NO ENCONTRADA EN CATÁLOGO ===
El usuario preguntó por algo que NO existe en el catálogo Chagra. El tool ${toolEvidence.tool} fue invocado con args ${queryStr} y devolvió found:false.

INSTRUCCIÓN OBLIGATORIA — anti-alucinación creativa:

1. NO mapees el nombre que preguntó el usuario a otra especie "parecida" que sí exista en el catálogo (eso es ALUCINACIÓN CREATIVA grave).
2. NO listes companions/biopreparados/relaciones de OTRA especie pretendiendo que son de la que preguntó.
3. NO inventes nombres científicos como sinónimos del término del usuario.
4. RESPONDE textualmente algo como: "El catálogo Chagra no tiene esa especie o relación documentada todavía. ¿Puedes describir la planta o decir su nombre científico? Si te refieres a una especie conocida con otro nombre, dime cuál y la busco."
5. Si quieres sugerir, SOLO puedes decir: "Si te refieres a [especie real del catálogo], avísame y consulto sus compañeros". Pero NUNCA afirmar la equivalencia.

Hint del tool: ${hint}
=== FIN ===
`;
    }

    let payload;
    try {
      payload = JSON.stringify(result);
    } catch (_) {
      return '';
    }
    let truncated = false;
    if (payload.length > TOOL_EVIDENCE_MAX_CHARS) {
      payload = payload.slice(0, TOOL_EVIDENCE_MAX_CHARS);
      truncated = true;
    }
    // 2026-05-23 incidente Test B (tomate de árbol temp/altitud) + Test A
    // (aguacate Hass companions): el tool devolvió found:true pero con
    // CAMPOS NULL (temp_min:null, altitud_min:null, companions:null). El
    // LLM ignoró los null y RELLENÓ DE MEMORIA con valores inventados
    // (tomate árbol "0-1200 msnm" cuando es 1500-2800 msnm).
    //
    // Detección de campos críticos vacíos. Si el record viene con null
    // en data que el usuario claramente pidió, agregar warning explícito
    // al system prompt para que el LLM NO invente esos valores.
    const criticalEmptyFields = [];
    if (result && typeof result === 'object') {
      const sp = result.species || result;
      if (sp && typeof sp === 'object') {
        if (sp.temp_min === null && sp.temp_max === null) {
          criticalEmptyFields.push('temperatura (temp_min y temp_max son null)');
        }
        if (sp.altitud_min === null && sp.altitud_max === null) {
          criticalEmptyFields.push('altitud (altitud_min y altitud_max son null)');
        }
        if (sp.companions === null || (Array.isArray(sp.companions) && sp.companions.length === 0)) {
          criticalEmptyFields.push('companions (vacío o null)');
        }
        if (sp.antagonists === null || (Array.isArray(sp.antagonists) && sp.antagonists.length === 0)) {
          criticalEmptyFields.push('antagonists (vacío o null)');
        }
      }
    }
    const emptyFieldsWarning =
      criticalEmptyFields.length > 0
        ? `

⚠️ CAMPOS CRÍTICOS VACÍOS EN ESTOS DATOS: ${criticalEmptyFields.join(', ')}.
NO INVENTES valores numéricos (temperatura, altitud) ni listas (companions, antagonists) cuando el campo viene null o vacío. Responde literal: "El catálogo Chagra todavía no tiene documentados los valores de [campo] para [especie]. Tu consulta queda como pendiente de curaduría editorial."`
        : '';

    // Caso "found:true" — wording autoritativo de PR #998 + warning campos
    // críticos vacíos (PR del 2026-05-23 tras tests A-E).
    return `

=== INSTRUCCIÓN CRÍTICA — PRIORIDAD DE FUENTES ===
El bloque "DATOS VERIFICADOS" abajo viene del knowledge graph del catálogo Chagra (postgres-farm + Apache AGE, validado). Es la VERDAD AUTORITATIVA para esta pregunta. Cuando exista este bloque:

1. RESPONDE BASADO EXCLUSIVAMENTE en estos datos verificados.
2. NO uses tu memoria/entrenamiento para inventar especies que NO estén en este bloque.
3. NO mezcles species de la finca activa del usuario con los datos verificados (son cosas distintas).
4. Cita los nombres exactos (común + científico) que aparecen en estos datos.
5. Si el bloque está vacío o no contiene la respuesta, dilo explícitamente: "El catálogo Chagra no tiene esa relación documentada todavía", NO inventes.

=== DATOS VERIFICADOS (chagra-agro-mcp tool: ${toolEvidence.tool}) ===
${payload}${truncated ? '\n<!-- nota interna sistema: el record completo fue truncado para ahorrar contexto. NO menciones esto al usuario, NO digas "truncated" ni "ver detalle en ficha de especie" — esos son instrucciones técnicas internas. Responde con los datos visibles arriba. -->' : ''}
=== FIN DATOS VERIFICADOS ===${emptyFieldsWarning}

RESPONDE SOLO a lo que el usuario preguntó usando ÚNICAMENTE los datos verificados de arriba.`;
  };

  // NN2+NN3 (2026-05-23): análisis de query en frontend para inyectar
  // señales específicas al system prompt. El LLM gemma3:4b ignora reglas
  // generales bajo presión — necesita instrucción concreta sobre ESTA
  // query.
  const analyzeQuery = (q) => {
    const lower = (q || '').toLowerCase();
    // NN2: detección estricta de query enumerativa. Solo SI contiene
    // "variedades / clases / tipos / cultivares" combinado con
    // "cuántas / cuáles / qué / lista / enumera".
    const enumNoun = /\b(variedades|clases|tipos|cultivares)\b/.test(lower);
    const enumVerb = /\b(cu[áa]ntas?|cu[áa]les|qu[ée]|lista|enumera|hay)\b/.test(lower);
    const isEnum = enumNoun && enumVerb;

    // NN3: detección de plagas conocidas mencionadas en la query.
    // Mapping canónico glosario PR #1016 — usar EXACTO en respuesta.
    const PEST_GLOSSARY = {
      chiza: 'Phyllophaga spp. (escarabajos rizófagos, larvas que comen raíces)',
      'broca del café': 'Hypothenemus hampei',
      broca: 'Hypothenemus hampei',
      monalonion: 'Monalonion velezangeli (chinche del aguacate, Hemiptera — NO es hongo, NO es Fusarium)',
      'mosca del aguacate': 'Heilipus lauri',
      'mosca de la fruta': 'Anastrepha spp. / Ceratitis capitata',
      'picudo del plátano': 'Cosmopolites sordidus',
      'roya del café': 'Hemileia vastatrix (hongo, royas)',
      roya: 'Hemileia vastatrix',
      'sigatoka negra': 'Mycosphaerella fijiensis (hongo, plátano/banano)',
      sigatoka: 'Mycosphaerella fijiensis',
      antracnosis: 'Colletotrichum spp.',
      trips: 'Frankliniella spp. / Thrips spp.',
      'gusano cogollero': 'Spodoptera frugiperda (lepidóptero, maíz)',
      'ácaro del tomate': 'Aculops lycopersici / Tetranychus urticae',
    };
    const pestsMentioned = [];
    for (const [name, canonical] of Object.entries(PEST_GLOSSARY)) {
      if (lower.includes(name)) pestsMentioned.push({ name, canonical });
    }

    // Tema principal (heurística simple): manejo, atributo, descripción.
    let topic = 'general';
    if (/c[óo]mo\s+(podo|cosecho|riego|abono|fertilizo|controlo|combato|preparo|hago|manejo)/.test(lower)) topic = 'manejo';
    else if (/c[áa]nd?o\s+(podo|cosecho|riego|abono|siembro)/.test(lower)) topic = 'manejo';
    else if (/a\s+qu[ée]\s+altitud|qu[ée]\s+(temperatura|altitud|luz|drenaje|suelo)/.test(lower)) topic = 'atributo';
    else if (/qu[ée]\s+compa[ñn]eros|qu[ée]\s+biopreparado|asocia|companions/.test(lower)) topic = 'relación';
    else if (/h[áa]blame|qu[ée]\s+es|c[óo]ntame/.test(lower)) topic = 'descripción';
    else if (pestsMentioned.length > 0) topic = 'plaga/enfermedad';

    return { isEnum, pestsMentioned, topic };
  };

  const callLLM = async (query, contextMemory, contextCorpus, toolEvidence) => {
    const systemPrompt = getSystemPrompt();
    const analysis = analyzeQuery(query);

    // NN2+NN3 bloque dinámico de análisis. Va al final del system prompt
    // para que sea lo último que el LLM lee antes de la query — máxima
    // proximidad. Le dice EXACTAMENTE qué tipo de query es y qué plagas
    // canónicas usar.
    const queryAnalysisBlock = `

=== ANÁLISIS DE LA QUERY ACTUAL (frontend) ===
- Tipo: ${analysis.topic}
- Es enumerativa (CASO C aplica): ${analysis.isEnum ? 'SÍ — usa respuesta CASO C' : 'NO — IGNORA CASO C completamente, responde normal con tool evidence o conocimiento'}
${analysis.pestsMentioned.length > 0 ? `- Plagas mencionadas (USA NOMBRE CIENTÍFICO EXACTO de abajo, NO inventes):
${analysis.pestsMentioned.map((p) => `  · "${p.name}" → ${p.canonical}`).join('\n')}` : '- Plagas mencionadas: ninguna'}

REGLA CRÍTICA SOBRE ESTE BLOQUE: este análisis es autoritativo para ESTA query. Si dice "Es enumerativa: NO", el CASO C del system prompt NO aplica aunque tu instinto te diga lo contrario. Si lista plagas, usa ESOS nombres científicos exactos (jamás otros, jamás "Fusarium spp" para chinches, jamás géneros inventados).
=== FIN ANÁLISIS ===`;
    // 2026-05-19: incidente alucinación tomate — gemma3:4b confundía el
    // corpus RAG con lo que el usuario dijo (atribuía síntomas "hojas
    // amarillas" del documento de referencia al operador). Fix: delimitar
    // EXPLÍCITAMENTE el corpus + instrucción literal de no citarlo como
    // si fuera del usuario.
    const corpusContext = contextCorpus.length > 0
      ? `

=== INFORMACIÓN DE REFERENCIA AGRONÓMICA (NO viene del usuario, NO citarla como si el usuario te lo hubiera contado) ===
${contextCorpus.map((c) => c.text).join('\n\n---\n\n')}
=== FIN REFERENCIA ===

Usa esta referencia para informar tu respuesta, pero RESPONDE SOLO a lo que el usuario te preguntó. NO menciones síntomas ni observaciones que no estén explícitamente en el mensaje del usuario.`
      : '';

    const evidenceContext = formatToolEvidence(toolEvidence);

    const messages = [
      { role: 'system', content: systemPrompt + corpusContext + evidenceContext + queryAnalysisBlock },
      ...(contextMemory ? [{ role: 'user', content: contextMemory }] : []),
      { role: 'user', content: query },
    ];

    const controller = new AbortController();
    activeControllerRef.current = controller;
    const timer = setTimeout(() => {
      console.warn(`[Agent] LLM timeout ${LLM_TIMEOUT_MS}ms — aborting`);
      controller.abort();
    }, LLM_TIMEOUT_MS);

    try {
      const { url, body } = buildLLMRequest('chat', messages);
      console.warn('[Agent] LLM call start', { url, queryLen: query.length });
      const result = await streamOpenAI(
        url,
        body,
        (_chunk, fullText) => setStreamingContent(fullText),
        { signal: controller.signal },
      );
      console.warn('[Agent] LLM call complete', { responseLen: result?.length || 0 });
      return result;
    } catch (e) {
      if (e.name === 'AbortError') {
        throw new Error('Tiempo agotado o cancelado. Toca de nuevo.');
      }
      const match = e.message.match(/^LLM (\d+)/);
      if (match) {
        const status = parseInt(match[1], 10);
        if (status === 401 || status === 403) {
          throw new Error('Sesion expirada, recarga la app');
        }
        if (status >= 500 && status <= 503) {
          throw new Error('IA no disponible, intenta de nuevo en un momento');
        }
        throw new Error(`Error al consultar IA (codigo: ${status})`);
      }
      throw new Error('IA no disponible, intenta de nuevo en un momento');
    } finally {
      clearTimeout(timer);
      activeControllerRef.current = null;
    }
  };

  const handleSubmit = async (text, { fromVoice = false } = {}) => {
    if (!text.trim()) return;
    // Re-entry guard: rechaza submits concurrentes. Permitimos `fromVoice`
    // como excepción porque `handleVoiceRecord` ya seteó STATE_THINKING
    // antes de await transcribe(blob), por lo que cuando llega acá `state`
    // NO es IDLE (closure capturó STATE_RECORDING). Bug previo: el guard
    // `state !== STATE_IDLE` rechazaba la llamada → UI quedaba en pensando
    // sin disparar el LLM (race de closure + async state).
    if (!fromVoice && state !== STATE_IDLE) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setStreamingContent('');
    setState(STATE_THINKING);
    setError('');
    agentSounds.start();

    try {
      // Bug N3 fix: en sesión fresca (gap >30min o reset explícito) NO
      // inyectamos history previo como contextMemory del LLM. Tomamos
      // snapshot del flag ANTES de addTurn para que la condición no
      // dependa del orden de writes a IndexedDB. Tras este submit, los
      // turns subsiguientes en esta mount sí incluyen contextMemory
      // (que en ese punto sólo contiene los turns nuevos de la sesión).
      const wasFreshSession = isFreshSessionRef.current;
      isFreshSessionRef.current = false;
      setShowFreshSessionBadge(false);

      await addTurn(operatorId, { role: 'user', content: text.trim() });

      const contextMemory = wasFreshSession ? '' : await getContextString(operatorId, 10);
      const contextCorpus = await retrieve(text, 3, 'agente');

      // ADR-045 Fase 2 Step B/C — sidecar NLU + MCP tool grounding.
      // Solo si flag VITE_USE_SIDECAR_AGRO_MCP=true Y estamos online.
      // Si sidecar falla / no aplica, sigue al chat con RAG-only (no
      // degrada UX). El planNlu/callTool wrappers son no-throw: devuelven
      // null en error/timeout. La evidencia se inyecta como bloque
      // delimitado en el system prompt para grounding citable.
      let toolEvidence = null;
      if (isOnline && isSidecarEnabled()) {
        try {
          const tNlu0 = performance.now();
          const plan = await planNlu(text, contextMemory);
          const tNlu1 = performance.now();
          if (plan?.useTool && plan.tool && plan.args) {
            const tTool0 = performance.now();
            const result = await callTool(plan.tool, plan.args);
            const tTool1 = performance.now();
            if (result) {
              toolEvidence = { tool: plan.tool, args: plan.args, result };
              const evidenceBytes = (() => {
                try { return JSON.stringify(result).length; } catch (_) { return 0; }
              })();
              console.debug('[sidecar]', {
                tool: plan.tool,
                latencyNlu: Math.round(tNlu1 - tNlu0),
                latencyTool: Math.round(tTool1 - tTool0),
                toolEvidenceBytes: evidenceBytes,
              });
            }
          } else if (plan) {
            console.debug('[sidecar]', {
              tool: null,
              latencyNlu: Math.round(tNlu1 - tNlu0),
              reason: plan.reason || 'no_tool',
            });
          }
        } catch (sidecarErr) {
          // Defensa extra: planNlu/callTool ya son no-throw, pero si algo
          // raro pasa NO bloqueamos el chat.
          console.debug('[sidecar] inesperado, sigo con RAG-only:', sidecarErr?.message);
        }
      }

      const response = await callLLM(text, contextMemory, contextCorpus, toolEvidence);
      agentSounds.chime();

      const { intent } = parseIntent(text);

      // 2026-05-23: badge de "fuente" — persistimos en metadata si el turno
      // del assistant fue grounded contra el catálogo (tool MCP devolvió
      // match) o fue solo generativo del LLM. ChatBubble lee este metadata
      // para renderizar el badge verde/amber/gris (ver computeSourceMetadata).
      const sourceMetadata = computeSourceMetadata(toolEvidence);

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        metadata: sourceMetadata,
      };

      await addTurn(operatorId, {
        role: 'assistant',
        content: response,
        metadata: sourceMetadata,
      });
      setMessages((prev) => [...prev, assistantMessage]);

      // Task #122: cachear el último mensaje del agente en el store global
      // para que el doble-click del avatar (cualquier pantalla) pueda re-
      // reproducirlo via replayLast(). responseReady NO se setea acá porque
      // el usuario ESTÁ en AgentScreen — el glow se activa cuando alguien
      // sale a otra pantalla mid-stream y vuelve a recibir respuesta tarde.
      // Para cubrir ese caso, también lo seteamos pero igualmente markRead
      // se dispara al ver el componente activo (efecto cancelado al volver).
      if (response) {
        setLastNotificationMessage(response);
        setResponseReady(true);
      }

      if (ttsEnabled && response) {
        stop();
        if (kokoroReady) {
          speakKokoro(response, { rate: 0.9, pitch: 1.0 });
        } else {
          speak(response, { rate: 0.9, pitch: 1.0 });
        }
      }

      // 057.4 integration: en lugar de abrir el modal directo, delegamos a
      // executeAction que dispara el callback registrado (que abre el modal),
      // espera resolución del operador, ejecuta el tool.handler de llmTools
      // (que internamente llama store.addLog) y loguea audit trail.
      if (intent && intent.toolName === 'crear_log') {
        setState(STATE_IDLE); // libera UI mientras se muestra el modal
        const assetId = plants?.[0]?.id;
        const proposal = {
          tool_name: 'crear_log',
          parameters: {
            asset_id: assetId || '',
            log_type: intent.logType,
            notes: formatIntentDescription(intent),
            timestamp: new Date().toISOString(),
            ...(intent.quantity && intent.unit && { quantity: intent.quantity, unit: intent.unit }),
          },
          intent: text,
          llm_response: response,
          timestamp: new Date().toISOString(),
        };
        const result = await executeAction(proposal, operatorId);
        if (result.status === 'executed' && result.result?.success) {
          const successMsg = {
            role: 'assistant',
            content: `Listo. He registrado la ${intent.logType.replace('log--', '')} en tu bitácora.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, successMsg]);
        }
        return;
      }
    } catch (e) {
      console.error('[Agent] Error:', e);
      setError(e.message || 'No pude conectarme al asistente. Intenta de nuevo.');
    } finally {
      setState(STATE_IDLE);
      setStreamingContent('');
    }
  };

  const handleVoiceRecord = async () => {
    if (state === STATE_RECORDING) {
      // stopRecord retorna { blob, durationMs, mimeType } — NO el Blob directo.
      // Si pasas el wrapper a transcribe(), `blob.type.includes(...)` falla con
      // "Cannot read properties of undefined (reading 'includes')". Mismo bug
      // patrón que queue/021 ya fixeado en VoiceCapture, pero AgentScreen
      // quedó sin el destructure cuando se migró.
      const result = await stopRecord();
      if (!result || !result.blob) {
        setState(STATE_IDLE);
        setError('No se capturó audio. Intenta de nuevo.');
        return;
      }
      const { blob } = result;
      setState(STATE_THINKING);

      try {
        const text = await transcribe(blob);
        if (text) {
          // Auto-activar TTS cuando el input fue voz: si hablas, esperas
          // respuesta hablada. Si el operador silenció TTS manualmente y
          // habla, respetamos su preferencia (sólo activamos si estaba
          // ya en true por default, o si nunca lo tocó).
          if (!ttsEnabled) setTtsEnabled(true);
          // bypass del guard porque state !== IDLE (está THINKING). Sin
          // este flag, handleSubmit retorna early y la UI queda colgada.
          await handleSubmit(text, { fromVoice: true });
        } else {
          setState(STATE_IDLE);
          setError('No entendí el audio. Prueba de nuevo.');
        }
        } catch (err) {
          setState(STATE_IDLE);
          setError(`Error al transcribir audio: ${err.message || 'Habla más claro'}`);
      }
    } else {
      resetRecord();
      startRecord();
      setState(STATE_RECORDING);
      setError('');
      agentSounds.listen();
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSubmit(inputText);
    setInputText('');
  };

  const handleSuggestion = (text) => {
    handleSubmit(text);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header con avatar colibrí Chagra IA (operator bug #920 no aplicó el avatar al header) */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg active:bg-slate-800"
          aria-label="Volver"
        >
          <ArrowLeft size={20} className="text-amber-400" />
        </button>
        <ChagraAgentAvatar
          state={state === STATE_RECORDING ? 'listening' : state === STATE_THINKING ? 'thinking' : 'idle'}
          size={40}
          onDoubleClick={async () => {
            // Task #122: doble-click avatar header silencia/reactiva audio.
            // Espejo del comportamiento del AgentFab global, pero acá ya
            // estamos en AgentScreen así que solo tocamos TTS.
            if (isSpeaking() || ttsEnabled) {
              stop();
              setTtsEnabled(false);
              agentSounds.cancel();
              return;
            }
            // Reactivar + replay último mensaje
            setTtsEnabled(true);
            const ok = await replayLast({ useKokoro: kokoroReady });
            if (ok) agentSounds.chime();
          }}
          ariaLabel="Avatar Chagra IA, doble click para silenciar o reactivar la voz"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white leading-tight">Chagra IA</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            {state === STATE_THINKING && 'pensando…'}
            {state === STATE_RECORDING && 'escuchando…'}
            {state === STATE_IDLE && 'agente agroecológico'}
          </p>
        </div>
        {/* Bug N3 fix (PR fix/n3-cross-conv-contamination 2026-05-23):
            botón explícito "Nueva conversación". Llama clearMemory(operatorId)
            + reset state + marca sesión fresca. Cubre el caso N3 exacto donde
            el operador hace Volver + reabre rápido (<30min) con tópico distinto
            y el gap temporal automático NO se dispararía. Sólo habilitado en
            STATE_IDLE para no interrumpir streaming en curso. */}
        <button
          type="button"
          onClick={handleNewConversation}
          disabled={state !== STATE_IDLE || messages.length === 0}
          className={`p-2 rounded-full transition-colors ${
            state !== STATE_IDLE || messages.length === 0
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700 active:scale-95'
          }`}
          title="Nueva conversación (borra historial)"
          aria-label="Iniciar nueva conversación"
          data-testid="new-conversation-btn"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          disabled={!ttsSupported}
          onClick={() => {
            if (ttsEnabled) {
              stop();
            }
            setTtsEnabled(!ttsEnabled);
          }}
          className={`p-2 rounded-full transition-colors ${
            !ttsSupported
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
              : ttsEnabled
                ? 'bg-violet-900/40 text-violet-400'
                : 'bg-slate-800 text-slate-500'
          }`}
          title={!ttsSupported ? 'Tu navegador no soporta sintesis de voz' : ttsEnabled ? 'Silenciar voz' : 'Activar voz'}
        >
          {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] ${
          isOnline ? 'bg-emerald-900/40 text-emerald-400' : 'bg-red-900/40 text-red-400'
        }`}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Bug N3 fix: badge "nueva sesión" cuando reseteamos por gap temporal
          o por botón explícito. Sin esto el operador no entendería por qué su
          history desapareció. Ephemeral — se borra al primer submit. */}
      {showFreshSessionBadge && (
        <div className="px-4 py-2 mx-4 mt-2 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center gap-2">
          <Sparkles size={14} className="text-violet-400 shrink-0" />
          <p className="text-xs text-slate-300" data-testid="fresh-session-badge">
            Nueva conversación. El historial anterior queda guardado pero no se
            incluye en el contexto.
          </p>
        </div>
      )}

      {/* NN4 fix 2026-05-23: banner pequeño cuando el modelo Ollama todavía
          se está calentando (warm-up disparado en login pero aún no completó).
          Aparece solo en status 'unknown' o 'warming' — en 'warm' o 'failed'
          queda oculto. Se mostraría típicamente si el operador navega al
          agente MUY rápido tras login antes que termine el warm-up (~25-40s
          en GPU M6000). Spinner CSS con animación spin de Tailwind. */}
      {(ollamaWarmStatus === 'warming' || ollamaWarmStatus === 'unknown') && (
        <div
          className="px-4 py-2 mx-4 mt-2 rounded-lg bg-amber-900/30 border border-amber-800/50 flex items-center gap-2"
          data-testid="ollama-warming-banner"
          role="status"
          aria-live="polite"
        >
          <span
            className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-300">
            Preparando agente IA (~20s)…
          </p>
        </div>
      )}

      {/* Chat */}
      <ChatHistory
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={state === STATE_THINKING}
      />

      {/* Error */}
      {error && (
        <div className="px-4 py-2 mx-4 mb-2 rounded-lg bg-red-900/30 border border-red-800/50">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Suggestions */}
      {state === STATE_IDLE && messages.length < 3 && (
        <SuggestedActions onSelect={handleSuggestion} />
      )}

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80 shrink-0">
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleVoiceRecord}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              state === STATE_RECORDING
                ? 'bg-red-600 animate-pulse'
                : 'bg-violet-700 hover:bg-violet-600'
            }`}
          >
            {state === STATE_RECORDING ? (
              <MicOff size={20} className="text-white" />
            ) : (
              <Mic size={20} className="text-white" />
            )}
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={state !== STATE_IDLE}
            className="flex-1 px-4 py-3 rounded-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || state !== STATE_IDLE}
            className="shrink-0 w-12 h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            <Send size={18} className="text-white" />
          </button>
        </form>

        {state === STATE_RECORDING && (
          <p className="text-center text-xs text-red-400 mt-2 animate-pulse">
            Grabando... {Math.floor(durationMs / 1000)}s
          </p>
        )}

        {state === STATE_THINKING && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <p className={`text-center text-xs ${showSlowWarning ? 'text-amber-400' : 'text-violet-400'}`}>
              {showSlowWarning ? 'Chagra IA sigue pensando — toca Cancelar si quieres reintentar' : 'Chagra IA está pensando…'}
            </p>
            <button
              type="button"
              onClick={handleCancelLLM}
              className="text-[10px] px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition-all"
            >
              Cancelar
            </button>
          </div>
        )}

        {!llmHealthy && state === STATE_IDLE && (
          <p className="text-center text-xs text-amber-400 mt-2 px-3">
            IA offline o lenta — las respuestas pueden tardar más de lo normal.
          </p>
        )}
      </div>

      <div ref={chatEndRef} />

      {/* Action Confirmation Modal — alimentado por actionExecutor gate callback (057.4) */}
      <ActionConfirmModal
        isOpen={actionModal.isOpen}
        toolName={actionModal.toolName || ''}
        description={actionModal.description || ''}
        parameters={actionModal.parameters || {}}
        intent={actionModal.intent}
        llm_response={actionModal.llmResponse}
        onApprove={handleActionApprove}
        onReject={handleActionReject}
        onEdit={handleActionEdit}
      />
    </div>
  );
}