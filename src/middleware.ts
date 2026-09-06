import NextAuth from "next-auth";
import { edgeAuthConfig } from "@/lib/auth/edge";

export const { auth: middleware } = NextAuth(edgeAuthConfig);

export const config = {
  matcher: ["/studio/:path*", "/brand-kit/:path*", "/workspace/:path*", "/onboarding/:path*"],
};
