import { NextResponse } from 'next/server';

// Nunca pre-generar: necesita la API key de Anthropic en vivo, del lado del servidor.
export const dynamic = 'force-dynamic';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-haiku-4-5-20251001';

const PROMPT = `Esta es una foto de una etiqueta o guía de un paquete de entrega en Perú.
Extrae exactamente estos datos, tal como aparecen impresos (no los traduzcas ni los completes si no están):
- recipient: nombre completo del destinatario.
- phone: número de teléfono/celular del destinatario (solo dígitos y +, sin espacios raros).
- address: dirección completa de entrega, incluyendo calle, número, manzana/lote, urbanización/asentamiento, referencia y distrito si aparecen.
- trackingCode: el código de rastreo o número de guía impreso (el que suele estar junto o debajo del código de barras).

Si algún dato no aparece en la imagen o no se puede leer con certeza, usa "" (cadena vacía) para ese campo — no inventes información.

Responde ÚNICAMENTE con un objeto JSON válido, sin texto antes ni después, con exactamente estas claves:
{"recipient": "", "phone": "", "address": "", "trackingCode": ""}`;

function parseDataUrl(dataUrl) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function extractJson(text) {
  const cleaned = (text || '').trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch (e) { return null; }
}

export async function POST(request) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Falta ANTHROPIC_API_KEY en las variables de entorno del servidor.' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = parseDataUrl(body.image);
  if (!parsed) {
    return NextResponse.json({ error: 'Imagen inválida.' }, { status: 400 });
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: parsed.mediaType, data: parsed.base64 } },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    });
  } catch (e) {
    return NextResponse.json({ error: 'No se pudo conectar con Claude: ' + e.message }, { status: 502 });
  }

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    return NextResponse.json({ error: 'Claude respondió con error: ' + response.status + ' ' + errBody.slice(0, 300) }, { status: 502 });
  }

  const data = await response.json();
  const text = data?.content?.find(c => c.type === 'text')?.text || '';
  const fields = extractJson(text);
  if (!fields) {
    return NextResponse.json({ error: 'No se pudo leer la etiqueta en esa foto.' }, { status: 422 });
  }

  return NextResponse.json({
    recipient: fields.recipient || '',
    phone: fields.phone || '',
    address: fields.address || '',
    trackingCode: fields.trackingCode || '',
  });
}
