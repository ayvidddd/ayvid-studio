/**
 * Single source of truth for which route prefixes require a signed-in
 * session. `src/middleware.ts`'s `matcher` (which requests even reach
 * middleware) and `edgeAuthConfig`'s `authorized` callback (whether the
 * request is let through) used to keep two separately-maintained lists in
 * sync by hand — they drifted once already (a route present in `matcher` but
 * missing here rendered straight through to a server crash instead of a
 * sign-in redirect). Both now derive from this one array.
 */
export const PROTECTED_ROUTE_PREFIXES = ["/studio", "/brand-kit", "/workspace", "/onboarding", "/billing"] as const;
