import { verifySession } from './lib/session.js';

// Protege la página estática protegida: sin cookie de sesión válida, redirige al login.
export const config = {
  matcher: '/contenido-redes-ia.html',
};

function getCookie(request, name) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default async function middleware(request) {
  const secret = process.env.SESSION_SECRET;
  const token = getCookie(request, 'session');
  const payload = token ? await verifySession(token, secret) : null;

  if (payload && payload.email) {
    return; // sesión válida: deja pasar a la página estática
  }

  const url = new URL(request.url);
  const loginUrl = new URL('/login.html', url);
  loginUrl.searchParams.set('next', url.pathname);
  return Response.redirect(loginUrl, 302);
}
