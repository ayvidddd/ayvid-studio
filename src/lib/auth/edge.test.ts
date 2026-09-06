import { describe, expect, it } from "vitest";
import { edgeAuthConfig } from "./edge";
import { PROTECTED_ROUTE_PREFIXES } from "./protected-routes";

function authorized(pathname: string, isSignedIn: boolean) {
  const request = { nextUrl: { pathname } } as Parameters<
    NonNullable<typeof edgeAuthConfig.callbacks.authorized>
  >[0]["request"];
  const auth = isSignedIn ? ({ user: { id: "u1" } } as never) : null;
  return edgeAuthConfig.callbacks.authorized({ auth, request } as never);
}

describe("edgeAuthConfig.authorized", () => {
  it("blocks every protected prefix when signed out", () => {
    // src/middleware.ts's `matcher` (which requests even reach this callback)
    // is generated from the same PROTECTED_ROUTE_PREFIXES array, so there's
    // only one list to keep in sync — see that module's comment for the
    // regression this replaced (a route matcher-routed here but not gated,
    // rendering straight through to a server-side crash instead of redirecting).
    for (const prefix of PROTECTED_ROUTE_PREFIXES) {
      expect(authorized(prefix, false)).toBe(false);
      expect(authorized(`${prefix}/sub-path`, false)).toBe(false);
    }
  });

  it("allows the same prefixes through once signed in", () => {
    for (const prefix of PROTECTED_ROUTE_PREFIXES) {
      expect(authorized(prefix, true)).toBe(true);
    }
  });

  it("leaves public routes unauthenticated-accessible", () => {
    expect(authorized("/", false)).toBe(true);
    expect(authorized("/sign-in", false)).toBe(true);
  });
});
