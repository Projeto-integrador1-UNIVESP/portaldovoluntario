import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, Landmark } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyField } from "@/components/common/CopyField";
import { gerarPayloadPix } from "@/lib/pix";
import { formatCurrency } from "@/lib/format";

type PixQrCodeProps = {
  chave: string | null | undefined;
  nomeRecebedor: string;
  cidade: string | null | undefined;
  valor?: number;
  identificador?: string;
  /** Dados bancários, usados quando não há chave Pix cadastrada. */
  dadosBancarios?: { banco?: string | null; agencia?: number | null; conta?: number | null };
};

/**
 * QR Code e "copia e cola" do Pix.
 *
 * O nome do recebedor aparece em destaque de propósito: é o que o doador
 * confere no app do banco antes de confirmar a transferência.
 */
export function PixQrCode({
  chave,
  nomeRecebedor,
  cidade,
  valor,
  identificador,
  dadosBancarios,
}: PixQrCodeProps) {
  const [imagem, setImagem] = useState<string | null>(null);
  const [payload, setPayload] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!chave?.trim()) {
      setErro("sem-chave");
      return;
    }

    try {
      const codigo = gerarPayloadPix({
        chave,
        nomeRecebedor,
        cidade: cidade || "BRASIL",
        valor,
        identificador,
      });
      setPayload(codigo);
      setErro(null);

      QRCode.toDataURL(codigo, { width: 320, margin: 1, errorCorrectionLevel: "M" })
        .then(setImagem)
        .catch(() => setErro("qr"));
    } catch {
      setErro("sem-chave");
    }
  }, [chave, nomeRecebedor, cidade, valor, identificador]);

  // Sem chave Pix, cair para os dados bancários é melhor do que mostrar um QR
  // quebrado que o banco vai recusar.
  if (erro === "sem-chave") {
    const temDados = dadosBancarios?.banco || dadosBancarios?.conta;
    return (
      <Alert>
        <Landmark className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>Esta ONG ainda não cadastrou uma chave Pix</AlertTitle>
        <AlertDescription>
          {temDados ? (
            <>
              Você pode transferir para: <strong>{dadosBancarios?.banco}</strong>, agência{" "}
              <strong>{dadosBancarios?.agencia}</strong>, conta{" "}
              <strong>{dadosBancarios?.conta}</strong>. Confirme o nome{" "}
              <strong>{nomeRecebedor}</strong> antes de concluir.
            </>
          ) : (
            <>
              Entre em contato com a organização para combinar a forma de doação. Ainda
              assim você pode registrar sua intenção de doar abaixo.
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-5">
        {imagem ? (
          <img
            src={imagem}
            alt="QR Code do Pix para esta doação"
            className="h-56 w-56"
            width={224}
            height={224}
          />
        ) : erro === "qr" ? (
          <div className="flex h-56 w-56 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            Não foi possível desenhar o QR Code. Use o código abaixo.
          </div>
        ) : (
          <div className="h-56 w-56 animate-pulse rounded bg-muted" />
        )}

        <div className="text-center">
          <p className="text-sm text-muted-foreground">Confira no app do seu banco:</p>
          <p className="font-semibold">{nomeRecebedor}</p>
          {typeof valor === "number" && valor > 0 && (
            <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(valor)}</p>
          )}
        </div>
      </div>

      {payload && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pix Copia e Cola</p>
          <CopyField valor={payload} rotulo="Copiar o código Pix" />
        </div>
      )}
    </div>
  );
}
