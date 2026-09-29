import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Landmark } from "lucide-react";
import { Callout } from "@/components/common/Callout";
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
 * O QR ocupa a largura que o celular der (até 288px): é para apontar a câmera
 * de outro aparelho, e um QR pequeno é o que mais falha na leitura. O nome do
 * recebedor e o valor ficam grandes embaixo: é o que a pessoa confere no app
 * do banco antes de confirmar.
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

      // Gerado em 512px e exibido menor: fica nítido em tela de alta densidade.
      QRCode.toDataURL(codigo, { width: 512, margin: 1, errorCorrectionLevel: "M" })
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
      <Callout tom="atencao" icone={Landmark} titulo="Esta ONG ainda não cadastrou uma chave Pix">
        {temDados ? (
          <>
            Você pode transferir para{" "}
            <strong className="font-medium text-foreground">{dadosBancarios?.banco}</strong>, agência{" "}
            <strong className="numero font-medium text-foreground">{dadosBancarios?.agencia}</strong>, conta{" "}
            <strong className="numero font-medium text-foreground">{dadosBancarios?.conta}</strong>. Confira o nome{" "}
            <strong className="font-medium text-foreground">{nomeRecebedor}</strong> antes de concluir.
          </>
        ) : (
          <>
            Fale com a organização para combinar a forma de doação. Ainda assim você pode
            registrar aqui a intenção de doar.
          </>
        )}
      </Callout>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-4 sm:p-6">
        {imagem ? (
          <img
            src={imagem}
            alt="QR Code do Pix para esta doação"
            className="aspect-square h-auto w-full max-w-[288px] rounded-lg"
            width={288}
            height={288}
          />
        ) : erro === "qr" ? (
          <div className="flex aspect-square w-full max-w-[288px] flex-col items-center justify-center rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">
            Não foi possível desenhar o QR Code. Use o código abaixo.
          </div>
        ) : (
          <div className="brilho-papel aspect-square w-full max-w-[288px] rounded-lg bg-muted" />
        )}

        <div className="text-center">
          <p className="rotulo-caps">Confira no app do seu banco</p>
          <p className="mt-1 font-semibold">{nomeRecebedor}</p>
          {typeof valor === "number" && valor > 0 && (
            <p className="numero mt-1 font-display text-2xl font-semibold text-primary">
              {formatCurrency(valor)}
            </p>
          )}
        </div>
      </div>

      {payload && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Pix Copia e Cola</p>
          <CopyField valor={payload} rotulo="Copiar o código Pix" objeto="Código Pix" />
        </div>
      )}
    </div>
  );
}
