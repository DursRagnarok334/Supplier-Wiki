/**
 * groq-proxy-worker.js
 * ─────────────────────────────────────────────────────────────────────────
 * Proxy gratuito (Cloudflare Workers) que oculta tu API key de Groq.
 * El HTML de la wiki llama a ESTA URL, nunca a Groq directamente.
 *
 * CÓMO DESPLEGARLO (gratis, ~5 minutos):
 * 1. Crea una cuenta en https://dash.cloudflare.com (plan Free)
 * 2. Ve a "Workers & Pages" → "Create" → "Create Worker"
 * 3. Ponle un nombre, ej: wiki-suppliers-groq
 * 4. Pega TODO este archivo en el editor, reemplazando el código de ejemplo
 * 5. Antes de "Deploy": Settings → Variables and Secrets → añade:
 *      GROQ_API_KEY = tu clave de https://console.groq.com/keys
 *      ALLOWED_ORIGIN = https://TU-USUARIO.github.io   (tu dominio de GitHub Pages)
 * 6. Deploy. Copia la URL pública (https://wiki-suppliers-groq.TUUSUARIO.workers.dev)
 * 7. Pégala en CONFIG.groqProxyUrl dentro de index.html
 *
 * La API key vive SOLO en Cloudflare (como "secret"), nunca en el HTML ni
 * en el repositorio de GitHub.
 * ─────────────────────────────────────────────────────────────────────────
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigin = env.ALLOWED_ORIGIN || '*';

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405, headers: corsHeaders });
    }

    // Verificación simple de origen (defensa adicional, no sustituye CORS)
    if (allowedOrigin !== '*' && !origin.startsWith(allowedOrigin)) {
      return new Response(JSON.stringify({ error: 'Origen no autorizado' }), { status: 403, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const messages = body.messages || [];

      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile', // revisa modelos vigentes en https://console.groq.com/docs/models
          messages,
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!groqRes.ok) {
        const errText = await groqRes.text();
        return new Response(JSON.stringify({ error: 'Error de Groq', detail: errText }), { status: 502, headers: corsHeaders });
      }

      const data = await groqRes.json();
      const reply = data.choices?.[0]?.message?.content || '';

      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Error interno', detail: String(err) }), { status: 500, headers: corsHeaders });
    }
  },
};
