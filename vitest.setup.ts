import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// The "server-only" marker package throws unconditionally outside of Next's
// bundler (it relies on webpack's "react-server" export condition to become
// a no-op). Under Vitest it should just be inert.
vi.mock("server-only", () => ({}));
