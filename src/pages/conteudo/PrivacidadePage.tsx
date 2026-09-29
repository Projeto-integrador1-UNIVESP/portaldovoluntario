import { PaginaDeConteudo } from "./PaginaDeConteudo";

/** Versão do texto registrada junto com o aceite do usuário no cadastro. */
export const VERSAO_PRIVACIDADE = "2026-09-28";

export default function PrivacidadePage() {
  return (
    <PaginaDeConteudo
      titulo="Política de Privacidade"
      descricao={`Como tratamos seus dados pessoais, na versão de ${new Date(VERSAO_PRIVACIDADE).toLocaleDateString("pt-BR")}.`}
    >
      <h2>1. Quais dados coletamos</h2>
      <p>
        No cadastro pedimos apenas <strong>nome, e-mail e senha</strong>. Telefone e endereço
        a gente pede só quando são necessários para uma ação específica, como agendar a coleta
        de uma doação de itens.
      </p>
      <p>
        Para ONGs, coletamos também os dados da organização (CNPJ, endereço, contatos e
        dados bancários para recebimento de doações), que são de exibição pública por
        natureza, já que servem para que o doador confie e consiga contribuir.
      </p>

      <h2>2. Para que usamos</h2>
      <ul>
        <li>Manter sua conta e permitir que você doe ou se inscreva como voluntário.</li>
        <li>Enviar confirmações e avisos relacionados às suas doações e inscrições.</li>
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
        Você pode, a qualquer momento, acessar, corrigir, baixar ou excluir seus dados.
        As opções de <em>baixar meus dados</em> e <em>excluir minha conta</em> ficam na área
        da sua conta. A exclusão remove seus dados pessoais; registros de doação já
        confirmados são mantidos de forma anonimizada, para a prestação de contas da ONG.
      </p>

      <h2>5. Segurança</h2>
      <p>
        Os dados ficam armazenados em serviço de banco de dados com controle de acesso por
        linha, de modo que cada usuário só alcança os registros a que tem direito. O acesso
        é sempre por conexão criptografada.
      </p>

      <h2>6. Contato</h2>
      <p>
        Para exercer qualquer um desses direitos ou tirar dúvidas sobre o tratamento dos
        seus dados, fale com a equipe responsável pela plataforma pelos canais indicados na
        página <a href="/sobre">Sobre</a>.
      </p>
    </PaginaDeConteudo>
  );
}
