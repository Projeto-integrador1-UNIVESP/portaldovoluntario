import { PaginaDeConteudo } from "./PaginaDeConteudo";
import { FOTOS } from "@/lib/fotos";

/**
 * Canal público do projeto. Não existe e-mail de contato definido: enquanto
 * não houver, o repositório é o único lugar real para falar com a equipe.
 */
export const REPOSITORIO_DO_PROJETO = "https://github.com/Projeto-integrador1-UNIVESP/portaldovoluntario";

export default function SobrePage() {
  return (
    <PaginaDeConteudo
      eyebrow="Quem somos"
      titulo="Sobre a Voluntá"
      descricao="A Voluntá nasceu como Projeto Integrador da Univesp com um objetivo simples: encurtar a distância entre uma ONG que precisa de algo concreto e uma pessoa disposta a ajudar."
      foto={FOTOS.sobre}
    >
      <h2>O que a gente viu</h2>
      <p>
        Boa parte das organizações não tem onde publicar, de forma clara, o que está
        faltando agora: tantos cobertores, tantos quilos de alimento, tantas pessoas para o
        sábado. Sem isso, quem quer ajudar não sabe por onde começar, e o que chega nem
        sempre é o que faltava.
      </p>

      <h2>O que muda aqui</h2>
      <p>
        Cada projeto publica o que precisa, com meta e progresso visíveis. Você escolhe o
        que doar, contribui em poucos passos e acompanha o resultado. A própria ONG confirma
        o recebimento, e só então a barra de progresso avança. É essa ordem que mantém a
        informação honesta.
      </p>

      <h2>Transparência</h2>
      <p>
        Mostramos CNPJ, tempo de atuação e contatos de cada organização. Doação em dinheiro
        vai por Pix, direto para a conta da ONG: a plataforma não retém valor nem cobra taxa
        de ninguém.
      </p>

      <h2>Quem faz</h2>
      <p>
        A Voluntá é feita por estudantes da Univesp como Projeto Integrador. O código é
        aberto e fica em um{" "}
        <a href={REPOSITORIO_DO_PROJETO} target="_blank" rel="noreferrer">
          repositório público no GitHub
        </a>
        .
      </p>

      <h2 id="contato">Fale com a gente</h2>
      <p>
        Dúvidas sobre uma doação ou um projeto? Fale direto com a ONG, pelos contatos da
        página dela.
      </p>
      <p>
        Assuntos da plataforma, inclusive pedidos sobre seus dados pessoais, chegam à equipe
        pelo{" "}
        <a href={`${REPOSITORIO_DO_PROJETO}/issues`} target="_blank" rel="noreferrer">
          canal de chamados do repositório
        </a>
        . Não escreva dados pessoais no chamado: a equipe responde por lá e combina um canal
        privado para seguir.
      </p>
    </PaginaDeConteudo>
  );
}
