import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * As páginas entram com `animate-fade-in`, que parte de opacity 0. Medir
 * contraste no meio da animação acusa cores translúcidas que ninguém vê no
 * estado final — o que interessa é a interface já estabilizada.
 */
async function aguardarAnimacoes(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState === "finished" || a.playState === "idle"),
  );
}

const PAGINAS_PUBLICAS = [
  { rota: "/", nome: "Home" },
  { rota: "/projetos", nome: "Projetos" },
  { rota: "/ongs", nome: "ONGs" },
  { rota: "/login", nome: "Login" },
  { rota: "/cadastro", nome: "Cadastro" },
  { rota: "/como-funciona", nome: "Como funciona" },
];

test.describe("Navegação pública", () => {
  test("o menu Projetos abre a listagem, em vez de recarregar a home", async ({ page }) => {
    await page.goto("/");

    // Em telas estreitas a navegação vive dentro do Sheet; no desktop, no header.
    const hamburguer = page.getByRole("button", { name: "Abrir menu" });
    if (await hamburguer.isVisible()) await hamburguer.click();

    await page.getByRole("link", { name: "Projetos", exact: true }).first().click();

    await expect(page).toHaveURL("/projetos");
    await expect(page.getByRole("heading", { name: "Projetos", level: 1 })).toBeVisible();
  });

  test("uma rota inexistente mostra o 404 em português com saídas úteis", async ({ page }) => {
    await page.goto("/rota-que-nao-existe");
    await expect(page.getByRole("heading", { name: "Esta página não existe" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
  });

  test("um projeto inexistente não fica carregando para sempre", async ({ page }) => {
    await page.goto("/projeto/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Projeto não encontrado")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("o menu é alcançável e não há rolagem horizontal", async ({ page }) => {
    for (const { rota, nome } of PAGINAS_PUBLICAS) {
      await page.goto(rota);

      const temRolagemHorizontal = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      expect(temRolagemHorizontal, `${nome} tem rolagem horizontal em 375px`).toBe(false);
    }

    await page.goto("/");
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("link", { name: "ONGs" })).toBeVisible();
  });
});

test.describe("Acessibilidade", () => {
  for (const { rota, nome } of PAGINAS_PUBLICAS) {
    test(`${nome} sem violações sérias ou críticas`, async ({ page }) => {
      await page.goto(rota);
      await aguardarAnimacoes(page);

      const resultado = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const graves = resultado.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      );

      expect(
        graves,
        graves.map((v) => `${v.id}: ${v.help} (${v.nodes.length}x)`).join("\n"),
      ).toEqual([]);
    });
  }
});
