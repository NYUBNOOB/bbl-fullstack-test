import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Testing Library only auto-cleans when vitest globals are enabled. They are
// not (see vite.config.ts), so unmount explicitly — otherwise every render
// stacks up in the same jsdom document and queries start matching the
// leftovers from the previous test.
afterEach(() => {
  cleanup();
});
