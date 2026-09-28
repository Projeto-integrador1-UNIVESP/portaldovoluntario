import { defineConfig, devices } from "@playwright/test";

/**
 * A configuração anterior importava `lovable-agent-playwright-config`, pacote
 * que não está no package.json nem no bun.lock — só existe no sandbox do
 * Lovable, então nenhum teste E2E rodava localmente nem em CI.
 *
 * Os testes rodam contra o build de produção (`vite preview`), não contra o
 * servidor de desenvolvimento: é onde as medidas de performance e o code
 * splitting valem alguma coisa.
 */
const PORTA = 4173;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "on-first-retry",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],

  webServer: {
    command: `bun run build && bunx vite preview --port ${PORTA} --strictPort`,
    port: PORTA,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
