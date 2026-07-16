import{Xt as e,_n as t,t as n}from"./index--xjsk3Zp.js";var r=.1,i=`/api/ollama/api/chat`,a=`granite3.3:8b`,o=6e4,s=`Eres un extractor de entidades agricolas. Recibes una transcripcion en espanol de un operador registrando siembras. Devuelves EXCLUSIVAMENTE un array JSON valido, sin texto adicional, sin markdown.

Schema:
[
  {
    "crop": "<cultivo en minusculas>",
    "quantity": <entero positivo>,
    "location": "<lugar tal como lo dice el operador, o cadena vacia '' si no se menciona>"
  }
]

Reglas:
- Convierte numerales en palabra a entero: "dos"=2, "tres"=3, "diez"=10, "veinte"=20, "cien"=100.
- Si la cantidad no se menciona, omite la entrada completa.
- Si el lugar no se menciona, usa "" como location (NO omitas la entrada por eso).
- VERBOS: "sembré", "planté", "puse" se interpretan como registro de planta nueva.
- MULTI-ESPECIE: si el operador menciona varios cultivos separados por "y" o "luego", devuelve UN OBJETO POR CADA CULTIVO. Hereda la location si aplica a todos.
- Nombres de cultivos son LITERALES (no traducir ni sustituir).
- Nunca inventes datos que no estan en la transcripcion.
- Si no puedes extraer ninguna entidad valida, devuelve [].

Ejemplos:
Input: "Sembre cinco tomates en el invernadero"
Output: [{"crop":"tomate","quantity":5,"location":"invernadero"}]

Input: "Sembre tres bananos"
Output: [{"crop":"banano","quantity":3,"location":""}]

Input: "Plante dos guayabos en la entrada y cinco mangos"
Output: [{"crop":"guayabo","quantity":2,"location":"entrada"},{"crop":"mango","quantity":5,"location":"entrada"}]`,c=null;async function l(){if(c!==null)return c;let e=n.byCapability(`voice-entity-extractor-prompt`);if(e.length>0)try{let t=(await e[0].mount())?.default;if(t&&typeof t.systemPrompt==`string`&&t.systemPrompt.length>0)return c=t.systemPrompt,c}catch{}return c=s,c}var u=e=>e&&typeof e.crop==`string`&&e.crop.trim().length>0&&Number.isInteger(e.quantity)&&e.quantity>0&&typeof e.location==`string`,d=t=>{if(typeof t!=`string`)return null;let n=e(t);return n.ok?(n.repaired&&console.debug(`[entityExtractor] NLU JSON reparado vía`,n.strategy),n.value):null};async function f(e,{onToken:n}={}){if(!e||typeof e!=`string`)return[];let s=new AbortController,c=setTimeout(()=>s.abort(),o);try{let o=d(await t(i,{model:a,messages:[{role:`system`,content:await l()},{role:`user`,content:e}],options:{temperature:r,num_predict:2048}},n,{signal:s.signal}));if(o===null)throw Error(`Respuesta del modelo no parseable como JSON`);return Array.isArray(o)||(o=Array.isArray(o?.entities)?o.entities:Array.isArray(o?.data)?o.data:o&&typeof o==`object`&&`crop`in o?[o]:[]),o.filter(u).map(e=>({crop:e.crop.toLowerCase().trim(),quantity:Math.floor(e.quantity),location:(e.location||``).trim()}))}catch(e){throw e.name===`AbortError`?Error(`Tiempo agotado al extraer entidades`):e}finally{clearTimeout(c)}}export{f as t};