/**
 * Cliente de Inteligencia Artificial para KOKORO (247Studio)
 * Conexión directa con Google Gemini API para razonamiento natural y abierto.
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

export async function askGeminiKokoro(
  prompt: string,
  apiKey?: string,
  role: 'admin' | 'student' = 'admin'
): Promise<string | null> {
  // 1. Intentar llamar al proxy serverless de Netlify (mantiene la API Key segura en el servidor)
  try {
    const serverlessRes = await fetch('/.netlify/functions/kokoro-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, role }),
    });

    if (serverlessRes.ok) {
      const data = await serverlessRes.json();
      if (data?.text && typeof data.text === 'string') {
        return data.text.trim();
      }
    }
  } catch {
    // Si la función serverless no está alcanzable (ej. servidor Vite standalone en local dev),
    // se recurre al fallback local controlado.
  }

  // 2. Fallback seguro para desarrollo local (solo admin o env local)
  const key =
    apiKey ||
    (role === 'admin' && typeof localStorage !== 'undefined' ? localStorage.getItem('kokoro_gemini_key') : null) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
    '';

  if (!key || key === 'tu_clave_real_aqui') {
    return null;
  }

  // Modelos candidatos en orden de preferencia
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: `${KOKORO_SYSTEM_PROMPT}\nModo actual del interlocutor: ${role.toUpperCase()}` }],
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

      if (!res.ok) continue;

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        return text.trim();
      }
    } catch {
      // Intentar con el siguiente modelo si falla la red
      continue;
    }
  }

  return null;
}

