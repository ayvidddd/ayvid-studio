import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/studio", "/brand-kit", "/workspace", "/onboarding"];

/**
 * Edge-safe subset of the NextAuth config: no Prisma adapter, no bcrypt, no
 * nodemailer transport. This is what runs in middleware; `./config.ts` adds
 * the Node-only providers/adapter on top of this for the route handler.
 */
export const edgeAuthConfig = {
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/check-email",
  },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      if (!isProtected) return true;
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
