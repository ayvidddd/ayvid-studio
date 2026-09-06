import NextAuth from "next-auth";
import { edgeAuthConfig } from "@/lib/auth/edge";
import { PROTECTED_ROUTE_PREFIXES } from "@/lib/auth/protected-routes";

export const { auth: middleware } = NextAuth(edgeAuthConfig);

export const config = {
  matcher: PROTECTED_ROUTE_PREFIXES.map((prefix) => `${prefix}/:path*`),
};
