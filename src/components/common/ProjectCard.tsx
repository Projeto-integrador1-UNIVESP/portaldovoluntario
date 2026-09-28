import { Link } from "react-router-dom";
import { Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrazo } from "@/lib/format";

export type ProjetoCardData = {
  id: string;
  slug?: string | null;
  nome_projeto: string;
  descricao: string | null;
  img_url: string | null;
  data_fim: string | null;
  /** Nome da ONG responsável, quando já resolvido pela página. */
  ongNome?: string | null;
  cidade?: string | null;
};

/** Card de projeto usado na home e na listagem. */
export function ProjectCard({ projeto }: { projeto: ProjetoCardData }) {
  const prazo = formatPrazo(projeto.data_fim);
  const encerrado = prazo === "encerrado";

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      {projeto.img_url ? (
        <img
          src={projeto.img_url}
          alt={`Foto do projeto ${projeto.nome_projeto}`}
          className="h-40 w-full object-cover"
          loading="lazy"
          decoding="async"
          width={400}
          height={160}
        />
      ) : (
        <div className="h-40 w-full bg-muted" aria-hidden="true" />
      )}

      <CardContent className="flex-1 pt-4">
        {projeto.ongNome && (
          <p className="text-xs font-medium text-primary">{projeto.ongNome}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-base font-semibold">{projeto.nome_projeto}</h3>
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {projeto.descricao || "Sem descrição disponível."}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {projeto.cidade && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {projeto.cidade}
            </span>
          )}
          {prazo && (
            <Badge variant={encerrado ? "secondary" : "outline"} className="gap-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              {prazo}
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link to={`/projetos/${projeto.slug ?? projeto.id}`}>Ver projeto</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
