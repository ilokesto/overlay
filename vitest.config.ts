import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/fixtures/setup.ts"],
    // The standalone repository also carries node --test suites under
    // tests/tooling; they run through their own script.
    include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
  },
});
