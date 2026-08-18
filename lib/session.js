// Firma/verificación de sesión con HMAC-SHA256 usando Web Crypto,
// compatible con Vercel Edge Runtime (usado por middleware.js y api/login.js).

const encoder = new TextEncoder();

function toBase64Url(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const pad = (4 - (str.length % 4)) % 4;
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSession(payload, secret) {
  const key = await getKey(secret);
  const payloadB64 = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const sigB64 = toBase64Url(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return null;

  const key = await getKey(secret);
  const expected = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64));
  const expectedB64 = toBase64Url(new Uint8Array(expected));
  if (expectedB64 !== sigB64) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
