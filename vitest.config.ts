import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    // Default to Node so server-only code (Prisma, "server-only" imports) works
    // without special-casing. Component tests opt into jsdom per-file via a
    // `// @vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    // Playwright owns everything under e2e/ — keep Vitest from trying to run
    // *.spec.ts files that import from @playwright/test.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
});
