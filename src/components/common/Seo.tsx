import { Helmet } from "react-helmet-async";

const NOME_DA_PLATAFORMA = "Voluntá";
const DESCRICAO_PADRAO =
  "Veja do que as ONGs perto de você precisam hoje e ajude com doações ou voluntariado.";

type SeoProps = {
  /** Título da página, sem o nome da plataforma. Ele é acrescentado aqui. */
  title?: string;
  description?: string;
  /** URL absoluta da imagem de compartilhamento. */
  image?: string;
  /** `true` em páginas que não devem ser indexadas (áreas logadas, confirmações). */
  noIndex?: boolean;
};

/**
 * Título e metadados por página.
 *
 * Atenção: crawlers de preview de link (WhatsApp, Facebook) NÃO executam
 * JavaScript, então estas tags não afetam o card compartilhado. Elas servem
 * para o Google, que executa. O card usa as tags estáticas do index.html.
 */
export function Seo({ title, description = DESCRICAO_PADRAO, image, noIndex }: SeoProps) {
  const tituloCompleto = title ? `${title} | ${NOME_DA_PLATAFORMA}` : NOME_DA_PLATAFORMA;

  return (
    <Helmet>
      <html lang="pt-BR" />
      <title>{tituloCompleto}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex" />}
      <meta property="og:title" content={tituloCompleto} />
      <meta property="og:description" content={description} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:title" content={tituloCompleto} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
