import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_TOKEN_COOKIE_NAME = 'authToken'; // Use the same name as in AuthContext
const PUBLIC_PATHS = ['/login', '/register']; // Paths accessible without login

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value;

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  // If trying to access a protected route without a token, redirect to login
  if (!isPublicPath && !token) {
    console.log(`[Middleware] No token found for path: ${pathname}. Redirecting to /login.`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: Pass redirect origin
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access login/register, redirect to home
  if (isPublicPath && token) {
     console.log(`[Middleware] Token found for public path: ${pathname}. Redirecting to /.`);
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Allow the request to proceed
   console.log(`[Middleware] Allowing access to path: ${pathname}. Token present: ${!!token}`);
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (public images folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
};
