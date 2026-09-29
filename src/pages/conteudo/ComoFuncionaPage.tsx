import { PaginaDeConteudo } from "./PaginaDeConteudo";

export default function ComoFuncionaPage() {
  return (
    <PaginaDeConteudo
      titulo="Como funciona"
      descricao="O caminho de quem doa e o caminho de quem precisa de ajuda."
    >
      <h2>Se você quer ajudar</h2>
      <ol>
        <li>
          <strong>Encontre um projeto.</strong> Cada ONG lista do que precisa, com quanto
          já chegou e quanto falta.
        </li>
        <li>
          <strong>Escolha como contribuir.</strong> Dá para doar dinheiro por Pix, doar
          itens da lista ou se inscrever como voluntário.
        </li>
        <li>
          <strong>Acompanhe o resultado.</strong> A ONG confirma o recebimento, e é essa
          confirmação que faz a barra do projeto andar.
        </li>
      </ol>

      <h2>Se você é uma ONG</h2>
      <ol>
        <li>
          <strong>Cadastre a organização.</strong> O cadastro pede uma chave de acesso,
          emitida depois que a administração confere seus dados.
        </li>
        <li>
          <strong>Publique seus projetos e necessidades.</strong> Diga o que falta, quanto
          falta e até quando.
        </li>
        <li>
          <strong>Confirme o que chegar.</strong> Cada confirmação sua faz o progresso do
          projeto subir, e é o que quem doou fica esperando ver.
        </li>
      </ol>
    </PaginaDeConteudo>
  );
}
