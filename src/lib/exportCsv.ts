import { toast } from "sonner";
import { SUCESSO } from "@/lib/copy";

/**
 * Baixa um CSV e avisa que baixou. O aviso mora aqui porque três telas
 * exportavam em silêncio e outras três avisavam por conta própria: agora é
 * uma vez, sempre, e a tela que chama não precisa de toast nenhum.
 */
export function exportToCsv(
  filename: string,
  rows: Record<string, any>[],
  opcoes: { silencioso?: boolean } = {},
) {
  const headers = rows.length ? Object.keys(rows[0]) : ["sem_dados"];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const csvRows = rows.length
    ? rows.map((r) => headers.map((h) => escape(r[h])).join(";"))
    : ["Nenhum registro encontrado"];
  const csv = [headers.join(";"), ...csvRows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (!opcoes.silencioso) toast.success(SUCESSO.csv(filename));
}
