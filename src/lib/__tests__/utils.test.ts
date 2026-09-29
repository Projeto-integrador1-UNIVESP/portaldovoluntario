import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("mantém o tamanho fluido junto de uma cor de texto", () => {
    expect(cn("text-2xl-fluido font-bold", "text-primary")).toBe("text-2xl-fluido font-bold text-primary");
  });
  it("troca raio e sombra pelos tokens do projeto", () => {
    expect(cn("rounded-md", "rounded-controle")).toBe("rounded-controle");
    expect(cn("shadow-sutil", "shadow-media")).toBe("shadow-media");
  });
});
