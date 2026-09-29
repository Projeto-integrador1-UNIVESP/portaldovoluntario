import { Link } from "react-router-dom";
import { PaginaDeConteudo } from "./PaginaDeConteudo";
import { formatDate } from "@/lib/format";

/** Versão do texto registrada junto com o aceite do usuário no cadastro. */
export const VERSAO_TERMOS = "2026-09-29";

export default function TermosPage() {
  return (
    <PaginaDeConteudo
      eyebrow="Legal"
      titulo="Termos de Uso"
      descricao={`Regras de uso da plataforma. Versão de ${formatDate(VERSAO_TERMOS)}.`}
      tipo="website"
    >
      <h2>1. O que a plataforma é</h2>
      <p>
        A Voluntá conecta organizações a doadores e voluntários. Nós{" "}
        <strong>não processamos pagamentos</strong>: quando você doa em dinheiro, a
        transferência acontece direto entre você e a ONG, por Pix, usando a chave que a
        organização cadastrou.
      </p>

      <h2>2. Responsabilidade pelas informações</h2>
      <p>
        Cada ONG responde pelas informações que publica (necessidades, metas, fotos e dados
        de recebimento) e pela confirmação das doações que recebe. A plataforma verifica o
        cadastro das organizações, mas não garante o destino dado aos recursos.
      </p>
      <p>
        Confira sempre o nome do recebedor no aplicativo do seu banco antes de concluir uma
        transferência.
      </p>

      <h2>3. Uso da conta</h2>
      <ul>
        <li>Você é responsável por manter sua senha em sigilo.</li>
        <li>Informações cadastrais devem ser verdadeiras e atualizadas.</li>
        <li>É proibido usar a plataforma para fraude, spam ou qualquer finalidade ilícita.</li>
      </ul>

      <h2>4. Doações e voluntariado</h2>
      <p>
        Uma doação registrada fica como <em>aguardando confirmação</em> até que a ONG confirme
        o recebimento. Inscrições em turnos de voluntariado podem ser canceladas por você ou
        pela organização, com aviso prévio sempre que possível.
      </p>

      <h2>5. Encerramento</h2>
      <p>
        Para encerrar sua conta, escreva para a equipe pelo contato indicado na{" "}
        <Link to="/privacidade">Política de Privacidade</Link>. Podemos suspender contas que
        violem estes termos, em especial nos casos de fraude contra doadores ou organizações.
      </p>

      <h2>6. Mudanças nestes termos</h2>
      <p>
        Se estes termos mudarem de forma relevante, avisaremos na plataforma e pediremos um
        novo aceite. A versão vigente é sempre a indicada no topo desta página.
      </p>
    </PaginaDeConteudo>
  );
}
