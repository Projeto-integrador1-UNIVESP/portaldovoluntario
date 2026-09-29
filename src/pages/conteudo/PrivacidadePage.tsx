import { Link } from "react-router-dom";
import { PaginaDeConteudo } from "./PaginaDeConteudo";
import { formatDate } from "@/lib/format";

/** Versão do texto registrada junto com o aceite do usuário no cadastro. */
export const VERSAO_PRIVACIDADE = "2026-09-29";

export default function PrivacidadePage() {
  return (
    <PaginaDeConteudo
      eyebrow="Legal"
      titulo="Política de Privacidade"
      descricao={`Como tratamos seus dados pessoais. Versão de ${formatDate(VERSAO_PRIVACIDADE)}.`}
      tipo="website"
    >
      <h2>1. Quais dados coletamos</h2>
      <p>
        No cadastro pedimos apenas <strong>nome, e-mail e senha</strong>. Telefone e endereço
        a gente pede só quando são necessários para uma ação específica, como agendar a coleta
        de uma doação de itens.
      </p>
      <p>
        Para ONGs, coletamos também os dados da organização (CNPJ, endereço, contatos e chave
        Pix para receber doações). Esses dados são públicos por natureza: servem para que o
        doador confie e consiga contribuir.
      </p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Manter sua conta e permitir que você doe ou se inscreva como voluntário.</li>
        <li>Enviar confirmações e avisos sobre as suas doações e inscrições.</li>
        <li>Permitir que a ONG entre em contato sobre a doação ou o turno de voluntariado.</li>
      </ul>
      <p>Não vendemos seus dados e não os usamos para publicidade de terceiros.</p>

      <h2>3. Quem pode ver seus dados</h2>
      <p>
        Uma ONG vê os seus dados de contato apenas se você se inscreveu como voluntário em
        um projeto dela ou fez uma doação para ela. Ao doar, você pode marcar a opção de
        <strong> doação anônima</strong>: seu nome não aparece em nenhuma tela pública.
      </p>

      <h2>4. Seus direitos (LGPD)</h2>
      <p>
        Você pode pedir, a qualquer momento, para acessar, corrigir ou apagar seus dados.
        Escreva para o contato indicado abaixo, usando o e-mail da sua conta. Registros de
        doação já confirmados ficam guardados de forma anonimizada, para a prestação de
        contas da ONG.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Os dados ficam em um banco com controle de acesso por linha: cada pessoa só alcança
        os registros a que tem direito. O acesso é sempre por conexão criptografada.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para exercer esses direitos ou tirar dúvidas sobre o tratamento dos seus dados,
        escreva para a equipe da Voluntá pelo canal indicado em{" "}
        <Link to="/sobre#contato">Fale com a gente</Link>, na página Sobre.
      </p>
    </PaginaDeConteudo>
  );
}
