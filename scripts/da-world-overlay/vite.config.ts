import { defineConfig } from "vite";
import { resolve } from "node:path";

// ECYR rebuild: two games from one build — Da World (index.html) and Taxi Rush
// (taxi.html) share the engine, the city, the people and the surfaces.
export default defineConfig({
  base: "./",
  server: { host: true, port: 5173 },
  build: {
    target: "es2022",
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        taxi: resolve(__dirname, "taxi.html"),
      },
    },
  },
});
