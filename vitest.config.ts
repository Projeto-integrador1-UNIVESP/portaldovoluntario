import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // Render de página em jsdom leva ~2s; com 20 arquivos em paralelo o teto
    // padrão de 5s falhava por lentidão da máquina, não por defeito do código.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
