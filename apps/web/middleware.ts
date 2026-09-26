import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  
  if (pathname.startsWith("/orders") || pathname.startsWith("/profile") || pathname.startsWith("/checkout")) {
    const sessionCookie = request.cookies.get("sb-session");
    
    if (!sessionCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname + search);
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/orders/:path*", "/profile/:path*", "/checkout/:path*"],
};
