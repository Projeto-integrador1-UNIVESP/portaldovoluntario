import { PaginaDeConteudo } from "./PaginaDeConteudo";

export default function SobrePage() {
  return (
    <PaginaDeConteudo
      titulo="Sobre a plataforma"
      descricao="Quem somos e por que esta plataforma existe."
    >
      <p>
        A Solidariedade nasceu como Projeto Integrador da Univesp com um objetivo simples:
        encurtar a distância entre uma ONG que precisa de ajuda concreta e uma pessoa
        disposta a ajudar.
      </p>
      <h2>O problema que atacamos</h2>
      <p>
        Boa parte das organizações não tem onde publicar, de forma clara, o que está
        faltando agora — tantos cobertores, tantos quilos de alimento, tantos voluntários
        para o sábado. Sem isso, quem quer ajudar não sabe por onde começar, e a ajuda que
        chega nem sempre é a de que se precisa.
      </p>
      <h2>Como resolvemos</h2>
      <p>
        Cada projeto publica suas necessidades com meta e progresso visíveis. O doador
        escolhe o que doar, contribui em poucos passos e acompanha o resultado. A própria
        ONG confirma o recebimento, e só então o progresso avança — é o que mantém a
        informação honesta.
      </p>
      <h2>Transparência</h2>
      <p>
        Exibimos CNPJ, tempo de atuação e contatos das organizações, e as ONGs publicam
        atualizações sobre o destino do que foi arrecadado.
      </p>
    </PaginaDeConteudo>
  );
}
