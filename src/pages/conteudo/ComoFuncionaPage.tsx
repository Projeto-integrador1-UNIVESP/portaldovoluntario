import { PaginaDeConteudo } from "./PaginaDeConteudo";
import { Callout } from "@/components/common/Callout";
import { FOTOS } from "@/lib/fotos";

const momentos = [
  {
    titulo: "Você vê o que está faltando",
    texto:
      "Cada ONG lista o que precisa, com quanto já chegou e quanto falta. O número em destaque é sempre o que falta, com prazo quando houver.",
  },
  {
    titulo: "Você doa direto para a ONG",
    texto:
      "Dinheiro vai por Pix para a conta da organização. Itens você entrega ou combina a coleta. Tempo vira inscrição em um turno de voluntariado.",
  },
  {
    titulo: "A ONG confirma que recebeu",
    texto:
      "Só depois dessa confirmação a barra do projeto anda, e a sua doação passa a aparecer como recebida. A barra aqui funciona como recibo.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <PaginaDeConteudo
      eyebrow="Como funciona"
      titulo="Do primeiro clique à confirmação da ONG"
      descricao="Três momentos separam a vontade de ajudar do item na prateleira da organização. Nenhum deles pede que você confie no escuro."
      foto={FOTOS.comoFunciona}
    >
      <ol className="not-prose m-0 list-none divide-y divide-border p-0">
        {momentos.map((momento, i) => (
          <li key={momento.titulo} className="grid grid-cols-[3rem_1fr] gap-x-4 py-8 first:pt-0 sm:grid-cols-[4.5rem_1fr] sm:gap-x-6">
            <span
              className="numero font-display text-3xl font-semibold leading-none text-primary texto-display"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold leading-tight">
                <span className="sr-only">{i + 1}. </span>
                {momento.titulo}
              </h2>
              <p className="mt-2 text-base text-muted-foreground">{momento.texto}</p>
            </div>
          </li>
        ))}
      </ol>

      <Callout tom="confianca" titulo="Sem intermediário no dinheiro" className="not-prose my-10">
        O Pix cai direto na conta da ONG. A Voluntá não retém valor e não cobra taxa de
        ninguém. Confira sempre o nome do recebedor no aplicativo do seu banco antes de
        concluir.
      </Callout>

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
          projeto subir. É o que quem doou fica esperando ver.
        </li>
      </ol>
    </PaginaDeConteudo>
  );
}
