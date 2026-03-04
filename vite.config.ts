/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import geminiQaPlugin from "./gemini-qa-plugin.ts";

export default defineConfig({
  base: "/shogi-web/",
  plugins: [geminiQaPlugin(), react(), tailwindcss()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
