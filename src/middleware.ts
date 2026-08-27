import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const publicPaths = [
    "/login",
    "/auth/callback",
    "/_next",
    "/favicon.ico",
    "/presentation/display",
  ];

  const isPublicPath = publicPaths.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  const isLocalhost = request.headers.get("host")?.includes("localhost") || request.headers.get("host")?.includes("127.0.0.1");
  const bypassAuth = isLocalhost && request.nextUrl.searchParams.has("dev_bypass");

  if (isPublicPath || bypassAuth) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
      set(name: string, value: string, options: any) {
        supabaseResponse = NextResponse.next({
          request,
        });
        supabaseResponse.cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        supabaseResponse = NextResponse.next({
          request,
        });
        supabaseResponse.cookies.set(name, "", options);
      },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    if (request.nextUrl.searchParams.has("dev_bypass")) {
      redirectUrl.searchParams.set("dev_bypass", "1");
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|auth/callback|api).*)"],
};
