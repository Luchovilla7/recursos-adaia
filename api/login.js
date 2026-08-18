import { signSession } from '../lib/session.js';

export const config = { runtime: 'edge' };

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ ok: false, message: 'Método no permitido' }, 405);
  }

  let email;
  try {
    const body = await request.json();
    email = String(body.email || '').trim().toLowerCase();
  } catch {
    return json({ ok: false, message: 'Solicitud inválida' }, 400);
  }

  if (!isValidEmail(email)) {
    return json({ ok: false, message: 'Ingresá un correo válido' }, 400);
  }

  const apiKey = process.env.GHL_API_KEY;
  const locationId = process.env.GHL_LOCATION_ID;
  const requiredTag = (process.env.GHL_ACCESS_TAG || '').toLowerCase();
  const sessionSecret = process.env.SESSION_SECRET;

  if (!apiKey || !locationId || !requiredTag || !sessionSecret) {
    return json({ ok: false, message: 'El acceso no está configurado todavía' }, 500);
  }

  const searchUrl = `${GHL_API_BASE}/contacts/?locationId=${encodeURIComponent(locationId)}&query=${encodeURIComponent(email)}&limit=10`;

  let ghlResponse;
  try {
    ghlResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_VERSION,
        Accept: 'application/json',
      },
    });
  } catch {
    return json({ ok: false, message: 'No se pudo verificar el correo, intentá de nuevo' }, 502);
  }

  if (!ghlResponse.ok) {
    return json({ ok: false, message: 'No se pudo verificar el correo, intentá de nuevo' }, 502);
  }

  const data = await ghlResponse.json();
  const contacts = Array.isArray(data.contacts) ? data.contacts : [];

  const authorized = contacts.some((contact) => {
    const contactEmail = String(contact.email || '').toLowerCase();
    const tags = Array.isArray(contact.tags) ? contact.tags.map((t) => String(t).toLowerCase()) : [];
    return contactEmail === email && tags.includes(requiredTag);
  });

  if (!authorized) {
    return json({ ok: false, message: 'Este correo no tiene acceso al contenido' }, 403);
  }

  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const token = await signSession({ email, exp }, sessionSecret);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    },
  });
}
