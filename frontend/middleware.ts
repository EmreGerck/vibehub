import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/profile', '/orders', '/cart', '/checkout', '/messages', '/dashboard'];
const AUTH_ONLY_PATHS = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage = AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p));

  // The refresh_token cookie is set by the backend on its own domain (cross-site),
  // so it isn't readable here. The frontend sets a `vh_session` marker cookie on
  // this domain in auth.store.ts whenever the user logs in/out. Real token
  // validation still happens server-side via the API.
  const hasSession = request.cookies.has('vh_session');

  if (isProtected && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/auth/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|fonts|icons|api).*)',
  ],
};
