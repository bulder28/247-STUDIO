/**
 * Netlify Serverless Function: kokoro-ai
 * Proxy seguro para Google Gemini API que oculta la clave GEMINI_API_KEY en el servidor.
 * Compatible con Netlify Functions v1 (handler) y v2 (default export).
 */

const KOKORO_SYSTEM_PROMPT = `
Eres KOKORO (心), el maestro de IA y copiloto operativo de la academia de artes marciales 247Studio en Pinto (Madrid), fundada por los instructores Mario y David.
Tu especialidad es el Brazilian Jiu-Jitsu (BJJ), Grappling, No-Gi y categorías Kids.
Tienes una personalidad marcial: sabia, respetuosa, enérgica ("Oss"), directa y con mentalidad Kaizen (mejora continua).

Conocimiento del club 247Studio:
- Gamificación: Cartas FIFA Ultimate Team (FUT) con 8 atributos (Técnica, Guardia, Pase, Finalización, Derribos, Fuerza, Elasticidad, Leglocks). OVR general: Oro Raro (>=75), Icon Black (Cinturón Negro o Socio Fundador), Plata (65-74), Bronce (<65).
- Tarifas: Estándar (STD), Socio Fundador (SF), Familiar (FAM).
- Sistema de grados IBJJF y horas de tatami.
- Normas: Chanclas SIEMPRE obligatorias al salir del tatami, kimono limpio, respeto, tap a tiempo.
- Radar Anti-Abandono: Detecta alumnos ausentes >12-21 días para reactivarlos por WhatsApp.

Responde de forma concisa (máximo 2-4 párrafos), práctica, inteligente y sin rodeos corporativos aburridos. Si te preguntan sobre mejoras, sugiere ideas concretas para el gimnasio y la app.
`;

const CANDIDATE_MODELS = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function generateWithGemini(prompt, role, apiKey) {
  const systemInstructionText = `${KOKORO_SYSTEM_PROMPT}\nModo actual del interlocutor: ${String(role || 'student').toUpperCase()}`;
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionText }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
          },
        }),
      });

      if (!res.ok) {
        lastError = `Google Gemini API error ${res.status}: ${res.statusText}`;
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return { text: text.trim() };
      }
    } catch (err) {
      lastError = err?.message || String(err);
      continue;
    }
  }

  throw new Error(lastError || 'No se obtuvo respuesta de ninguno de los modelos de Gemini disponibles.');
}

/**
 * Netlify Functions v2 handler (Fetch API standard)
 */
export default async function handler(req, context) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido. Use POST.' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'tu_clave_real_aqui') {
    return new Response(
      JSON.stringify({
        error: 'Variable de entorno GEMINI_API_KEY no configurada en el servidor Netlify.',
      }),
      {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await req.json();
    const prompt = body?.prompt;
    const role = body?.role || 'student';

    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'El campo "prompt" es obligatorio y debe ser una cadena.' }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const { text } = await generateWithGemini(prompt, role, apiKey);

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Error interno al procesar la solicitud con Gemini.',
      }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
}
