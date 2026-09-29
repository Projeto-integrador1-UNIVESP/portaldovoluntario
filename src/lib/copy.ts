/**
 * Glossário e padrões de texto da interface.
 *
 * Existe porque a mesma coisa recebia nomes diferentes de uma tela para outra
 * ("Pendente" na ONG, "Aguardando" no admin; "chave" no cadastro, "código" no
 * painel) e porque cada formulário inventava o próprio tom de mensagem. Tudo
 * que é texto repetido, ou que precisa ser igual em duas telas, mora aqui.
 *
 * Tom: você, direto, sem jargão. Verbo + objeto, sem ponto final em mensagem
 * de campo. O botão diz o que vai acontecer.
 */

export const MARCA = "Voluntá";

/** A tese do produto, dita uma vez por tela, no máximo. */
export const TESE = "A barra só sobe quando a ONG confirma que recebeu.";

/** Nomes fixos de estados e objetos. Nunca sinônimos. */
export const TERMOS = {
  /* Estados de inscrição de voluntário */
  aguardando: "Aguardando",
  aprovado: "Aprovado",
  recusado: "Recusado",
  /* Estados de doação */
  pendente: "Aguardando confirmação",
  confirmada: "Recebimento confirmado",
  naoRecebida: "Marcada como não recebida",
  /* Visibilidade */
  visivel: "Visível",
  oculto: "Oculto",
  /* Acesso da ONG */
  chave: "chave de acesso",
  /* Doador sem cadastro */
  semIdentificacao: "Doador sem cadastro",
  /* Verificação */
  verificada: "ONG verificada",
  aguardandoVerificacao: "Aguardando verificação",
} as const;

/** Placeholder de célula vazia em tabela. Texto, não travessão: lê melhor. */
export const VAZIO = {
  naoInformado: "Não informado",
  semData: "Sem data",
  semOng: "Sem ONG",
  semProjeto: "Sem projeto",
  semPrazo: "Sem prazo",
} as const;

/** Mensagens de validação. Verbo + objeto, sem ponto final. */
export const MENSAGENS = {
  obrigatorio: (campo: string) => `Informe ${campo}`,
  escolha: (campo: string) => `Escolha ${campo}`,
  minimo: (n: number) => `Use pelo menos ${n} caracteres`,
  maximo: (n: number) => `No máximo ${n} caracteres`,
  email: "Informe um e-mail válido",
  telefone: "Informe o telefone com DDD",
  cep: "Informe um CEP com 8 números",
  cnpj: "Informe um CNPJ válido",
  url: "Cole um endereço que comece com https://",
  dataFimAntesDoInicio: "O término não pode ser antes do início",
  dataNoFuturo: "A data não pode ser no futuro",
  valorPositivo: "O valor precisa ser maior que zero",
  quantidadePositiva: "A quantidade precisa ser maior que zero",
  pix: "Essa chave Pix não parece válida (CPF, CNPJ, e-mail, telefone ou chave aleatória)",
} as const;

/** Rótulos de botão. Sempre nomeiam o objeto. */
export const CTA = {
  salvar: (objeto: string) => `Salvar ${objeto}`,
  criar: (objeto: string) => `Criar ${objeto}`,
  publicar: (objeto: string) => `Publicar ${objeto}`,
  excluir: (objeto: string) => `Excluir ${objeto}`,
  remover: (objeto: string) => `Remover ${objeto}`,
  cancelar: "Cancelar",
  salvando: "Salvando…",
  criando: "Criando…",
  excluindo: "Excluindo…",
  enviando: "Enviando…",
  registrando: "Registrando…",
  tentarDeNovo: "Tentar novamente",
  exportarCsv: "Exportar CSV",
} as const;

/** Feedbacks de sucesso. Passado, com o objeto. */
export const SUCESSO = {
  salvo: (objeto: string) => `${objeto} salvo`,
  salva: (objeto: string) => `${objeto} salva`,
  criado: (objeto: string) => `${objeto} criado`,
  criada: (objeto: string) => `${objeto} criada`,
  excluido: (objeto: string) => `${objeto} excluído`,
  excluida: (objeto: string) => `${objeto} excluída`,
  copiado: "Copiado",
  linkCopiado: "Link copiado",
  csv: (arquivo: string) => `Arquivo ${arquivo} baixado`,
} as const;

/**
 * Nome da plataforma no meio de frase. Artigo feminino, sempre: "a Voluntá",
 * como "a plataforma". Antes alternava com "o Voluntá".
 */
export const A_MARCA = `a ${MARCA}`;
