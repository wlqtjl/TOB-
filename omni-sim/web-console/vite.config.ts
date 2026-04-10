import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
