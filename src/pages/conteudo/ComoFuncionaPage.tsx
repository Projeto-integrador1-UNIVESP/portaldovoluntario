import { PaginaDeConteudo } from "./PaginaDeConteudo";

export default function ComoFuncionaPage() {
  return (
    <PaginaDeConteudo
      titulo="Como funciona"
      descricao="Em três passos, para quem quer doar e para quem precisa de ajuda."
    >
      <h2>Se você quer ajudar</h2>
      <ol>
        <li>
          <strong>Encontre um projeto.</strong> Navegue pelos projetos e veja exatamente do
          que cada ONG precisa, com quanto já foi arrecadado e quanto falta.
        </li>
        <li>
          <strong>Escolha como contribuir.</strong> Você pode doar dinheiro via PIX ou
          itens da lista de necessidades — e também se inscrever como voluntário.
        </li>
        <li>
          <strong>Acompanhe o resultado.</strong> A ONG confirma o recebimento e publica
          atualizações sobre o que foi feito com a sua contribuição.
        </li>
      </ol>

      <h2>Se você é uma ONG</h2>
      <ol>
        <li>
          <strong>Cadastre a organização.</strong> O cadastro é feito com uma chave de
          acesso, emitida após a verificação dos seus dados.
        </li>
        <li>
          <strong>Publique seus projetos e necessidades.</strong> Diga o que falta, quanto
          falta e até quando.
        </li>
        <li>
          <strong>Confirme o que chegar.</strong> Ao confirmar cada doação recebida, você
          mantém o progresso do projeto atualizado e mostra transparência a quem doou.
        </li>
      </ol>
    </PaginaDeConteudo>
  );
}
