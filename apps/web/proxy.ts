import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  const isProtected = 
    path === "/profile" || 
    path === "/checkout" || 
    path.startsWith("/orders") || 
    path.startsWith("/account");
    
  if (isProtected) {
    const cookies = request.cookies.getAll();
    const hasAuth = cookies.some(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
    
    if (!hasAuth) {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/profile",
    "/checkout",
    "/orders/:path*",
    "/account/:path*"
  ],
};
