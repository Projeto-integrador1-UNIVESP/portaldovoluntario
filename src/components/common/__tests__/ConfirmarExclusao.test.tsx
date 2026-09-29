import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmarExclusao } from "@/components/common/ConfirmarExclusao";
import { Button } from "@/components/ui/button";

function montar(onConfirmar: () => Promise<unknown>) {
  render(
    <ConfirmarExclusao titulo="Excluir o projeto Van?" rotuloConfirmar="Excluir projeto" onConfirmar={onConfirmar}>
      <Button>Abrir</Button>
    </ConfirmarExclusao>,
  );
}

describe("ConfirmarExclusao", () => {
  it("fecha depois que a ação termina bem", async () => {
    const onConfirmar = vi.fn().mockResolvedValue(undefined);
    montar(onConfirmar);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir projeto" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onConfirmar).toHaveBeenCalledOnce();
  });

  it("continua aberto quando a ação falha, para tentar de novo", async () => {
    const onConfirmar = vi.fn().mockRejectedValue(new Error("falhou"));
    montar(onConfirmar);
    await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
    await userEvent.click(screen.getByRole("button", { name: "Excluir projeto" }));
    await waitFor(() => expect(onConfirmar).toHaveBeenCalledOnce());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir projeto" })).toBeEnabled();
  });
});
