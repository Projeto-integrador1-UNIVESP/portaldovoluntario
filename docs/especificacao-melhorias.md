# Especificação de Melhorias — Plataforma de ONGs (Univesp)

Sep 28, 2026 · @Beatriz

## Resumo executivo

A plataforma funciona, mas hoje ela ainda não resolve a necessidade central de uma ONG: mostrar **o que falta** (itens, valores, voluntários) e deixar o doador contribuir em poucos cliques. O teste navegado em 28/09/2026 (visitante não logado, desktop e mobile) encontrou 25 pontos de melhoria, sendo 7 de severidade alta.

**As 5 prioridades:**

1. **Necessidades por projeto** — cada projeto passa a ter metas de arrecadação (dinheiro e itens físicos) com barra de progresso. Hoje só existe doação em dinheiro e o botão "Doar" do projeto leva à doação genérica da ONG.
2. **Fluxo de doação sem atrito** — permitir iniciar a doação sem login, PIX com QR Code e botão "copiar", valores sugeridos e tela de agradecimento com comprovante.
3. **Páginas de ONG e de projeto completas** — perfil público da ONG (hoje o card não abre nada) e projeto com foto, descrição, local, necessidades e compartilhamento.
4. **Cadastro mais curto e acessível** — cadastro de doador cai de 9 para 3 campos obrigatórios, com máscara, busca de CEP e labels ligados aos campos.
5. **Base técnica** — code splitting por rota (hoje o visitante baixa todas as telas de admin), SEO/metadados em pt-BR, imagens otimizadas e menu mobile.

**Escopo do teste:** foram testadas as áreas públicas. As áreas logadas (Admin e ONG) foram avaliadas pelas rotas e pela estrutura do código; um teste logado fica como próximo passo (seção 3).

## Contexto, personas e jornadas

A plataforma conecta quatro perfis. Cada melhoria desta especificação foi pensada para uma pergunta concreta de um deles.

| Persona | Pergunta que precisa ser respondida em segundos | Jornada principal | Onde falha hoje |
| --- | --- | --- | --- |
| **Doador eventual** (chega por link no WhatsApp/Instagram) | "Essa ONG é séria? Do que ela precisa agora? Como doo rápido?" | Link do projeto → ver necessidade → doar → receber confirmação | Projeto sem descrição/foto, login obrigatório, PIX sem QR Code |
| **Voluntário** | "Onde, quando e quanto tempo? Serve para mim?" | Home → projeto → inscrição → lembrete | Projeto sem local, horário ou vagas; cadastro com 9 campos |
| **Gestor(a) de ONG** (pouco tempo, pouca familiaridade técnica) | "Como publico uma necessidade e mostro o resultado?" | Cadastro com chave → criar projeto → publicar necessidades → acompanhar doações e voluntários | Sem campo para itens/metas; perfil público inexistente |
| **Admin da plataforma** | "Quais ONGs aprovar? Algo suspeito?" | Aprovar ONG → moderar projetos → auditar | Sem fluxo de solicitação de acesso pela ONG |

**Princípios de UX para o contexto de ONGs:**

- **Necessidade primeiro:** o que está faltando, quanto falta e até quando — antes de qualquer texto institucional.
- **Confiança explícita:** CNPJ, tempo de atuação, transparência de uso dos recursos e prestação de contas.
- **Atrito mínimo:** pedir dados só quando forem necessários para aquela ação.
- **Mobile first:** a maior parte do tráfego virá de links compartilhados no celular.
- **Feedback de impacto:** o doador precisa ver o que sua contribuição gerou.

## Diagnóstico do teste navegado

25 achados em 8 telas públicas: 7 altos, 13 médios, 5 baixos. Teste feito em http://localhost:8080 como visitante, em 1366×800 e 375×812 (mobile). Nenhuma conta foi criada e nenhuma doação foi gravada, porque o cadastro grava direto no Supabase Cloud.

| # | Severidade | Tela / jornada | Achado | Impacto no usuário |
| --- | --- | --- | --- | --- |
| 1 | Alta | Doar | Só existe doação em dinheiro (PIX, transferência, boleto). Não há doação de itens nem lista de necessidades. | A ONG não consegue pedir alimentos, roupas, cobertores — o principal uso esperado. |
| 2 | Alta | Home / Projeto | "Doar" no card do projeto leva para `/doar/<id da ONG>`, não para o projeto. | A doação não fica vinculada ao projeto; impossível medir meta por projeto. |
| 3 | Alta | Doar | Formulário aparece aberto para visitante, mas só um aviso no topo diz que é preciso login. PIX é texto puro (sem QR Code nem "copiar"). Não há tela de confirmação ou comprovante. | Abandono no último passo; doador não sabe se a doação foi registrada. |
| 4 | Alta | Navegação | Link "Projetos" do menu aponta para `/`. Não existe página de listagem de projetos. | Usuário clica e "nada acontece". |
| 5 | Alta | Mobile | Abaixo de 768 px, os links Projetos e ONGs somem e não há menu hambúrguer. | No celular só dá para navegar rolando a home. |
| 6 | Alta | ONGs | O card da ONG não abre um perfil; não existe página pública da ONG. | Sem espaço para missão, projetos, transparência e contato — base de confiança. |
| 7 | Alta | Performance | O visitante anônimo baixa todas as 22 páginas, incluindo as 9 de Admin e as 6 de ONG (sem `React.lazy`). | Primeiro carregamento lento, principalmente em 4G. |
| 8 | Média | Projeto | Detalhe do projeto só mostra título, datas e contagem de voluntários; exibe "Sem descrição disponível". Sem foto, local, horário, vagas, necessidades, botão voltar ou compartilhar. | Página não convence nem informa. |
| 9 | Média | Cadastro doador | 9 campos obrigatórios, incluindo data de nascimento, CEP e logradouro. | Alto abandono; dados coletados sem finalidade clara (LGPD). |
| 10 | Média | Acessibilidade | `<label>` sem `htmlFor`; inputs sem `id`, `name` ou `autocomplete`. | Leitor de tela não anuncia o campo; autopreenchimento não funciona. |
| 11 | Média | Cadastro | CEP sem máscara e sem busca de endereço; Estado é texto livre. | Erros de digitação e dados inconsistentes. |
| 12 | Média | Formulários | Validação só pelo balão nativo do navegador ("Preencha este campo"), sem mensagens inline do zod. | Erros pouco claros, visual inconsistente. |
| 13 | Média | Login | Sem "Esqueci minha senha". | Usuário perde o acesso sem saída. |
| 14 | Média | Visual | Botão "Entrar" é vermelho; o resto da marca é azul-petróleo. | Vermelho sugere erro/perigo; quebra a identidade. |
| 15 | Média | Cadastro ONG | Exige chave do admin, mas não há como solicitá-la. Não pede CNPJ. Pede data de nascimento do responsável. | ONG interessada trava no cadastro. |
| 16 | Média | Visual / confiança | Capa da ONG é miniatura de 225 px do Google Imagens (hotlink), pixelada. | Aspecto amador; imagem pode sumir a qualquer momento. |
| 17 | Média | SEO | Título "Lovable App", `lang="en"`, descrição "Lovable Generated Project", imagem de compartilhamento do Lovable. | Link compartilhado no WhatsApp aparece genérico; leitor de tela pronuncia em inglês. |
| 18 | Média | Home | Contadores exibem "1 ONG ativa / 1 projeto". | Com base pequena, o número enfraquece a prova social. |
| 19 | Média | Performance | Consultas `select=*` sem paginação nem seleção de colunas. | Tráfego e tempo de resposta crescem com a base. |
| 20 | Média | Doar | Campo valor com placeholder "50.00" (padrão americano) e sem valores sugeridos. | Confusão de vírgula/ponto; decisão mais lenta. |
| 21 | Baixa | Home | Seção "Seja voluntário" diz "escolha um projeto abaixo", mas é a última seção. | Texto contradiz a tela. |
| 22 | Baixa | Home | Carrossel "Notícias" com 7 imagens de 1280 px sem `loading="lazy"` e conteúdo fixo, sem link. | Peso extra; "notícias" que não levam a lugar nenhum. |
| 23 | Baixa | Acessibilidade | Logo e cards "Doador e projetos" / "ONG com chave" do login são links sem nome acessível. | Navegação por teclado/leitor de tela confusa. |
| 24 | Baixa | Login | Estatística "Mais de 60% das ONGs…" sem fonte. | Reduz credibilidade. |
| 25 | Baixa | Rodapé | Rodapé só com copyright: sem Sobre, Contato, Política de Privacidade, Termos. | Exigência de LGPD e de confiança. |

**Próximo passo do diagnóstico:** repetir o teste logado com uma conta de doador, uma de ONG e uma de admin de teste, cobrindo Dashboard, Projetos, Doações, Voluntários e Auditoria.

## Melhorias de UX/UI e identidade visual

O objetivo visual é sair do "template genérico" para uma plataforma calorosa, confiável e orientada a necessidades.

### 4.1 Design system (tokens no Tailwind + shadcn)

- **Paleta:** manter o azul-petróleo como `primary` e adicionar um `accent` quente (laranja/âmbar) para chamadas de doação. Vermelho fica restrito a `destructive` (corrige o botão "Entrar", achado 14).
- **Tipografia:** uma família para títulos com mais personalidade (ex.: Nunito ou Poppins) e Inter para texto; escala fixa (12/14/16/20/24/32/48).
- **Componentes padrão novos:** `ProjectCard`, `OngCard`, `NeedItem` (item + barra de progresso), `ProgressBar`, `EmptyState`, `Skeleton`, `ShareButton`, `CopyField`.
- **Estados obrigatórios em toda lista:** carregando (skeleton), vazio (ilustração + ação sugerida), erro (mensagem + tentar novamente).
- **Animações:** respeitar `prefers-reduced-motion`; o fade de entrada da página de projeto hoje deixa o conteúdo apagado por \~1 s.

### 4.2 Navegação e layout

- Header: `Projetos` → `/projetos` (nova página), `ONGs`, `Como funciona`, botão de destaque **Doar**.
- Mobile: menu em `Sheet` (shadcn) com os mesmos itens + barra fixa inferior com "Doar" nas páginas de projeto.
- Breadcrumb e botão voltar nas páginas de detalhe.
- Rodapé completo: Sobre, Como funciona, Para ONGs, Contato, Política de Privacidade, Termos de Uso, redes sociais.

### 4.3 Home

- **Hero orientado à ação:** título sobre impacto ("Veja do que as ONGs perto de você precisam hoje") + busca por cidade/causa + 2 CTAs (Doar / Ser voluntário).
- **"Necessidades urgentes":** carrossel de itens com meta quase não atingida ou prazo próximo — substitui o carrossel de "Notícias" estático.
- **Contadores:** trocar por métricas de impacto somadas (itens arrecadados, horas de voluntariado, R$ doados) e só exibir quando passarem de um mínimo configurável.
- **Como funciona** em 3 passos e seção **Para ONGs** com CTA "Cadastre sua ONG".
- Corrigir o texto "escolha um projeto abaixo" (achado 21).

### 4.4 Card e página de projeto

- Card: imagem de capa, ONG, cidade, causa (tag), barra de progresso da meta principal, prazo ("faltam 7 dias"), CTA único e claro.
- Página: galeria, descrição rica, **lista de necessidades** (item, quantidade meta, arrecadado, botão "Quero doar"), vagas de voluntariado (data, horário, local, vagas restantes), mapa/endereço de entrega, atualizações da ONG, botão compartilhar (WhatsApp, copiar link).
- Se não houver descrição, a ONG não consegue publicar: campo obrigatório com mínimo de caracteres.

### 4.5 Fluxo de doação (redesenho)

1. Escolher o que doar: **dinheiro** ou **itens** da lista de necessidades.
2. Dinheiro: valores sugeridos (R$ 20 / 50 / 100 / outro) com máscara `R$ 0,00`; itens: quantidade por item e forma de entrega (levar no local / agendar coleta).
3. Identificação mínima: nome + e-mail (ou login social), com opção de doação anônima para exibição pública.
4. Pagamento: QR Code PIX + chave com botão **Copiar** (`CopyField`); upload opcional do comprovante.
5. Tela de agradecimento com resumo, status ("aguardando confirmação da ONG"), compartilhamento e sugestão de criar conta para acompanhar.
6. E-mail de confirmação e, depois, notificação quando a ONG confirmar o recebimento.

### 4.6 Formulários

- Todos com `react-hook-form` + `zod` + `<FormMessage>` do shadcn (mensagem inline em pt-BR), `noValidate` no `<form>`.
- Máscaras: telefone, CEP, CNPJ, moeda. Estado como `Select` com as 27 UFs. CEP preenche cidade/UF/logradouro via ViaCEP.
- Cadastro do doador: só nome, e-mail e senha; endereço e telefone pedidos apenas quando forem necessários (ex.: agendar coleta).
- Login: "Esqueci minha senha" (`supabase.auth.resetPasswordForEmail`) e mensagem explicando por que o login é necessário quando vier de um redirect.

## Novas funcionalidades

A funcionalidade que mais agrega valor é o **catálogo de necessidades por projeto**; as demais se apoiam nela.

| ID | Funcionalidade | Para quem | Descrição | Impacto no banco (Supabase) |
| --- | --- | --- | --- | --- |
| F1 | Necessidades por projeto | ONG, doador | ONG cadastra itens (nome, categoria, unidade, meta, prazo, urgência) e metas em R$. Público vê progresso em tempo real. | Tabela `necessidades` (projeto\_id, tipo `item`/`dinheiro`, meta, arrecadado, unidade, urgencia, prazo) + RLS |
| F2 | Doação de itens com agendamento | Doador, ONG | Doador compromete quantidades; escolhe entregar no local (endereço/horários da ONG) ou pedir coleta. ONG confirma o recebimento, e só então o progresso sobe. | `doacoes` ganha `projeto_id`, `necessidade_id`, `quantidade`, `status` (pendente/confirmada/cancelada), `comprovante_url` |
| F3 | Perfil público da ONG | Todos | `/ongs/:slug` com capa, logo, missão, CNPJ, cidade, causas, projetos ativos, necessidades, contatos e transparência. | Coluna `slug`, `cnpj`, `logo_url`, `capa_url`, `causas[]`; imagens no Supabase Storage |
| F4 | Listagem e busca de projetos | Doador, voluntário | `/projetos` com filtros por cidade, causa, tipo de ajuda (itens, dinheiro, voluntariado) e ordenação (urgente, perto de mim, novo). | Índices + busca textual (`tsvector` em pt) |
| F5 | Vagas de voluntariado | Voluntário, ONG | Turnos com data, horário, local, vagas e habilidades; inscrição com 1 clique; lembrete por e-mail 24 h antes; ONG marca presença e gera certificado de horas (útil para horas complementares de estudantes). | Tabelas `turnos` e `inscricoes` (status, presença, horas) |
| F6 | Atualizações e prestação de contas | ONG, doador | ONG publica posts com fotos ("chegaram 120 cobertores"). Doadores do projeto recebem notificação. | Tabela `atualizacoes` + Storage |
| F7 | Área do doador | Doador | "Minhas doações" (status, comprovante), "Minhas inscrições", projetos seguidos, impacto acumulado. | Views filtradas por `auth.uid()` |
| F8 | Solicitação de cadastro de ONG | ONG, admin | Formulário público "Quero cadastrar minha ONG" (CNPJ, responsável, documentos). Admin aprova e a chave é enviada por e-mail. | Tabela `solicitacoes_ong` + Edge Function `ong-signup` ajustada |
| F9 | Compartilhamento | Todos | Botões WhatsApp/copiar link; imagem Open Graph gerada por projeto (título + progresso). | Edge Function de OG image ou imagem padrão por projeto |
| F10 | Notificações | Todos | E-mails transacionais: boas-vindas, doação registrada/confirmada, lembrete de turno, meta atingida. | Edge Function + provedor de e-mail (ex.: Resend) |
| F11 | Painel de impacto da ONG | ONG | Gráficos (recharts) de arrecadação por necessidade, voluntários ativos, doadores recorrentes; exportação CSV para prestação de contas. | RPCs agregadas |
| F12 | Selo de ONG verificada | Doador | Selo exibido quando o admin validar CNPJ e documentos. | Coluna `verificada_em` |

**Fora de escopo nesta fase:** pagamento integrado com gateway (PIX dinâmico, cartão) e doação recorrente. Ambos exigem contrato com provedor e tratamento financeiro; ficam como evolução futura.

## Performance e qualidade técnica

O maior ganho de performance vem de carregar só o código da rota visitada. Medições devem ser feitas no build de produção (`vite build && vite preview`), não no servidor de desenvolvimento.

| ID | Melhoria | Como implementar | Resultado esperado |
| --- | --- | --- | --- |
| P1 | Code splitting por rota | `React.lazy` + `<Suspense fallback={<PageSkeleton/>}>` em `App.tsx`; áreas Admin e ONG em chunks separados; `manualChunks` no Vite para `recharts` e Radix. | Bundle inicial do visitante sem código de Admin/ONG nem recharts |
| P2 | Imagens otimizadas | Converter `src/assets/*.jpg` para WebP/AVIF em 3 larguras com `srcset`; `loading="lazy"` e `decoding="async"` fora da primeira dobra; `width`/`height` para evitar layout shift. Uploads das ONGs no Supabase Storage com transformação de imagem. | Menos peso e LCP menor |
| P3 | Consultas enxutas | Trocar `select=*` por colunas usadas; paginação com `.range()`; RPC agregada para a home (projetos + ONGs + estatísticas em 1 chamada). | Menos bytes e menos requisições na home |
| P4 | Cache do React Query | `staleTime` de 1–5 min para dados públicos, `prefetchQuery` ao passar o mouse no card, invalidação após doar/inscrever. Chaves padronizadas (`['projeto', id]`). | Navegação instantânea entre páginas já vistas |
| P5 | Banco | Índices em `projetos(status, ong_id)`, `doacoes(projeto_id, status)`, `necessidades(projeto_id)`; revisar RLS para evitar subconsultas caras; `supabase gen types` no CI. | Consultas estáveis com crescimento da base |
| P6 | SEO e metadados | `index.html` com `lang="pt-BR"`, título e descrição reais, favicon e OG image próprios; `react-helmet-async` para título/descrição por página; `sitemap.xml` e `robots.txt`. | Links bonitos no WhatsApp; indexação no Google |
| P7 | URLs amigáveis | `/projetos/:slug` e `/ongs/:slug` em vez de UUID; UUID continua como chave interna. | Links legíveis e compartilháveis |
| P8 | Resiliência | Error Boundary global com tela amigável; página 404 com links úteis; tratamento de erro do Supabase com toast em pt-BR. | Nenhuma tela branca |
| P9 | Limpeza Lovable | Remover dependências não usadas (auditar com `depcheck`); ativar flags `v7_startTransition` e `v7_relativeSplatPath` do React Router (hoje geram avisos no console). | Bundle menor, console limpo |
| P10 | Testes | Playwright E2E para as 4 jornadas críticas (doar dinheiro, doar item, inscrever voluntário, ONG publicar necessidade); Vitest nos schemas zod e hooks; Lighthouse CI com orçamento. | Regressões detectadas antes do deploy |
| P11 | Monitoramento | Sentry (erros) e analytics sem cookies (ex.: Plausible/Umami) com eventos do funil de doação. | Saber onde o usuário abandona |

**Metas de performance (build de produção, mobile 4G, Lighthouse):** Performance ≥ 85, LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms, JS inicial ≤ 250 KB gzip.

## Acessibilidade, confiança, segurança e LGPD

Meta: WCAG 2.1 nível AA nas telas públicas e nos fluxos de doação e cadastro.

### Acessibilidade

- Todo campo com `<Label htmlFor>` + `id`, `name` e `autocomplete` corretos (`name`, `email`, `tel`, `postal-code`, `new-password`). O componente `<FormField>` do shadcn já faz isso quando usado.
- Links só com ícone ganham `aria-label` (logo, cards do login, redes sociais).
- Contraste mínimo 4,5:1 em textos — revisar cinzas claros dos cards e o texto do hero.
- Foco visível em todos os elementos interativos; ordem de tabulação lógica; carrossel pausável e operável por teclado.
- Imagens com `alt` descritivo (fotos de projetos: campo "descrição da imagem" no upload da ONG).
- Teste automatizado com `@axe-core/playwright` nas jornadas E2E.

### Confiança (decisiva para doação)

- CNPJ visível e validado, selo "ONG verificada" (F12), tempo de atuação, endereço e contatos.
- Prestação de contas pública: atualizações com fotos (F6) e total arrecadado confirmado pela ONG.
- Chave PIX exibida com o **nome do recebedor** esperado, para o doador conferir no app do banco.
- Estatísticas institucionais sempre com fonte (achado 24).
- Imagens hospedadas no Storage da plataforma, nunca hotlink (achado 16).

### Segurança

- Revisar RLS de todas as tabelas: público lê só projetos/ONGs ativos; ONG escreve só nos próprios registros; admin via `has_role()` com `security definer`.
- Chaves de acesso de ONG: uso único, expiração e hash no banco; registrar uso em Auditoria.
- Edge Functions `admin-users` e `ong-signup`: validar JWT e papel no servidor, validar entrada com zod, limitar taxa por IP.
- Upload: limitar tipo (JPG/PNG/WebP/PDF) e tamanho (ex.: 5 MB); buckets com políticas por ONG.
- Ativar proteção contra senhas vazadas e confirmação de e-mail no Supabase Auth.

### LGPD

- Coletar só o necessário (minimização): remover data de nascimento e endereço do cadastro inicial.
- Política de Privacidade e Termos de Uso no rodapé e aceite registrado no cadastro (data e versão).
- Opção de doação anônima na exibição pública.
- "Excluir minha conta" e "Baixar meus dados" na área do usuário.
- Dados de voluntários visíveis para a ONG só após inscrição no projeto dela.

## Priorização e roadmap

A ordem é: primeiro corrigir o que quebra a navegação e pesa no carregamento, depois entregar o núcleo de valor (necessidades e doação por projeto), e só então engajamento. A fase 2 depende da 1 porque a nova página de projeto e o fluxo de doação usam o design system, os formulários padronizados e o code splitting.

&#91;embedded content: roadmap · 3 fases com critério de saída\]

Cada fase só termina quando o critério de saída no rodapé da caixa é atingido. Os códigos (F, P e achados) remetem às seções 3, 5 e 6.

**Won't (agora):** gateway de pagamento com PIX dinâmico ou cartão, doação recorrente, app nativo e chat em tempo real entre doador e ONG.

**Sugestão de execução com Claude Code:** um branch por item, começando por migrações SQL (`supabase/migrations/`) e tipos gerados, depois componentes, e fechando com o teste E2E da jornada correspondente.

## Critérios de aceite e métricas de sucesso

### Critérios de aceite (principais)

- [ ] Um visitante no celular chega de um link de projeto, vê as necessidades e conclui uma doação via PIX em até **5 telas/passos**, sem criar senha.
- [ ] A doação feita a partir de um projeto fica gravada com `projeto_id` e, se for item, com `necessidade_id` e quantidade.
- [ ] A barra de progresso só aumenta quando a ONG confirma o recebimento.
- [ ] O menu Projetos abre `/projetos`, com filtros por cidade, causa e tipo de ajuda.
- [ ] Em 375 px, todas as páginas têm menu acessível e nenhuma rolagem horizontal.
- [ ] O card da ONG abre `/ongs/:slug` com CNPJ, missão, projetos e contatos.
- [ ] Um visitante anônimo não baixa nenhum chunk de `pages/admin` ou `pages/ong`.
- [ ] Todos os formulários mostram erros inline em pt-BR; nenhum balão nativo do navegador.
- [ ] Cadastro de doador com no máximo 3 campos obrigatórios; "Esqueci minha senha" funcionando.
- [ ] `@axe-core/playwright` sem violações críticas ou sérias nas telas públicas.
- [ ] Link de projeto colado no WhatsApp mostra título, descrição e imagem do projeto.
- [ ] Lighthouse mobile (build de produção) ≥ 85 em Performance e ≥ 95 em Acessibilidade.

### Métricas de sucesso

| Métrica | Como medir | Meta inicial |
| --- | --- | --- |
| Conversão do funil de doação (visita ao projeto → doação registrada) | Eventos de analytics (P11) | Definir a linha de base no 1º mês e subir 30% |
| Taxa de doações confirmadas pela ONG | `doacoes.status` | ≥ 70% em até 7 dias |
| Projetos com necessidades cadastradas | Consulta no banco | 100% dos projetos ativos |
| Tempo para a ONG publicar um projeto | Teste de usabilidade com 3–5 gestores | ≤ 10 minutos |
| Comparecimento de voluntários inscritos | Presença marcada (F5) | ≥ 60% |
| Abandono do cadastro | Eventos início/fim do formulário | Reduzir em 50% |

**Validação com usuários reais:** antes da fase 2, testar o protótipo com o Sítio Agar (gestor) e 5 potenciais doadores/voluntários, usando as tarefas "doar 2 cobertores" e "inscrever-se em um turno de sábado".
