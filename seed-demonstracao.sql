-- ============================================================================
-- seed-demonstracao.sql. Dados FICTÍCIOS para demonstração acadêmica
-- Projeto Integrador Univesp · Portal do Voluntário
-- ============================================================================
--
-- Para que serve: com 1 ONG e 1 projeto no banco, a home, a listagem de
-- projetos e o painel da ONG ficam vazios e nenhum mecanismo do produto fica
-- visível. Este arquivo popula 7 ONGs, 14 projetos, 35 necessidades e 126
-- doações em todos os estados possíveis, para que a banca veja a plataforma
-- funcionando: barra de progresso, faixa de pendentes, selo de verificada,
-- fila de confirmação da ONG, taxa de confirmação e metas batidas.
--
-- Nada aqui é real. Os nomes de ONG, de pessoas e de empresas são inventados,
-- os CNPJs têm dígitos verificadores válidos mas não pertencem a ninguém, e os
-- e-mails usam o domínio reservado `exemplo.com.br`. Não use estes dados fora
-- de ambiente de demonstração.
--
-- ─── O QUE ESTE ARQUIVO NÃO TOCA ────────────────────────────────────────────
-- A ONG real que já existe no banco (Sítio Agar, slug `sitio-agar`), os
-- projetos dela, as doações dela e qualquer usuário de `auth.users` ficam
-- INTACTOS. Todo registro criado aqui tem id com prefixo reconhecível:
--
--   ONGs         de000001-…    projetos      de000002-…
--   necessidades de000003-…    doações       de000004-…
--
-- Todo DELETE deste arquivo é filtrado por esse prefixo. Nenhum UPDATE é feito
-- em linha que o arquivo não tenha criado.
--
-- ─── REEXECUTÁVEL ───────────────────────────────────────────────────────────
-- Rodar duas vezes dá o mesmo resultado: o bloco de limpeza abaixo apaga as
-- ONGs de demonstração (e, em cascata, projetos, necessidades, doações e
-- inscrições de voluntariado ligados a elas) antes de inserir de novo.
-- Atenção: isso apaga também doações que alguém tenha feito às ONGs de
-- demonstração durante um teste. É de propósito. São dados de vitrine.
--
-- ─── COMO REMOVER DEPOIS ────────────────────────────────────────────────────
-- Uma linha, dentro de uma transação, apaga tudo que este seed criou:
--
--   BEGIN;
--   DELETE FROM public.ongs WHERE id::text LIKE 'de000001-%';
--   COMMIT;
--
-- O CASCADE de `projetos.id_ong`, `necessidades.id_projeto`,
-- `doacoes.id_ong` e `voluntariado.id_projeto` leva o resto embora.
--
-- ─── PARA DEMONSTRAR O PAINEL DA ONG ────────────────────────────────────────
-- As ONGs de demonstração não têm gestor: `usuarios_ong` fica vazio porque
-- este arquivo não cria contas de autenticação. Para entrar no painel de uma
-- delas com uma conta que você já tenha, rode à mão (fora deste seed):
--
--   INSERT INTO public.usuarios_ong (id_usuario, id_ong)
--   VALUES ('<uuid do seu usuário>', 'de000001-0000-4000-8000-000000000006');
--
-- Cada ONG de demonstração tem de 2 a 4 doações pendentes esperando
-- confirmação. A 06 (Movimento Rua Viva) é a sugestão: é a campanha com o
-- prazo mais curto e tem doação de item e de dinheiro na fila.
--
-- ─── COMO RODAR ─────────────────────────────────────────────────────────────
--   psql "$DATABASE_URL" -f seed-demonstracao.sql
-- ou cole o conteúdo no SQL Editor do Supabase.
-- ============================================================================

BEGIN;

-- ─── 1. Limpeza do que este mesmo arquivo criou ─────────────────────────────
-- Só ids com o prefixo de demonstração. O `sitio-agar` não é alcançado.
DELETE FROM public.ongs WHERE id::text LIKE 'de000001-%';


-- ─── 2. ONGs ────────────────────────────────────────────────────────────────
-- Portes e causas variados de propósito. Cinco verificadas e duas não: sem
-- contraste, o selo não significa nada na tela.
-- Logo e capa ficam NULL: o componente `Capa` gera um padrão estável a partir
-- do id, e a especificação proíbe hotlink de imagem de terceiros (achado 16).
INSERT INTO public.ongs (
  id, nome, slug, cnpj, cidade, estado, logradouro, cep, telefone,
  descricao, missao, area_atuacao, causas, fundada_em,
  endereco_entrega, horarios_recebimento,
  pix, pix_nome_recebedor, banco, agencia, conta,
  site, instagram, verificada_em, status
) VALUES

('de000001-0000-4000-8000-000000000001',
 'Casa de Acolhimento Nova Esperança', 'casa-de-acolhimento-nova-esperanca',
 '05.412.783/0001-34', 'Sorocaba', 'SP',
 'Rua Padre Luiz Gonzaga, 412, Vila Barão', '18025-330', '(15) 3221-4088',
 'Acolhimento de crianças e adolescentes afastados da família por decisão judicial, em Sorocaba.',
 'Acolhemos crianças e adolescentes de 0 a 17 anos encaminhados pela Vara da Infância de Sorocaba. Hoje são 28 acolhidos em duas casas, com equipe de educadores, psicóloga e assistente social. Trabalhamos para que cada um volte à família de origem quando é possível, e para que tenha escola, saúde e afeto enquanto está com a gente.',
 'Acolhimento institucional de crianças e adolescentes',
 ARRAY['Crianças e adolescentes','Assistência social','Educação'],
 DATE '2004-03-11',
 'Rua Padre Luiz Gonzaga, 412, Vila Barão, Sorocaba/SP (portão azul, tocar o interfone 2)',
 'Segunda a sexta, das 9h às 17h. Sábado, das 9h às 12h.',
 '05.412.783/0001-34', 'Casa de Acolhimento Nova Esperanca', 'Banco do Brasil', 1234, 45678901,
 'https://novaesperancasorocaba.org.br', '@casanovaesperanca.sorocaba',
 now() - INTERVAL '90 days', true),

('de000001-0000-4000-8000-000000000002',
 'Instituto Mãos de Vó', 'instituto-maos-de-vo',
 '12.894.560/0001-16', 'Ribeirão Preto', 'SP',
 'Avenida Independência, 2870, Jardim América', '14026-160', '(16) 3610-7722',
 'Apoio domiciliar e cestas mensais para idosos que moram sozinhos em Ribeirão Preto.',
 'Visitamos 40 idosos que moram sozinhos na zona norte de Ribeirão Preto. Levamos cesta de alimentos, fralda geriátrica e medicamento de uso contínuo, e ficamos para conversar. Na maioria das casas somos a única visita da semana. Também acompanhamos consultas no SUS quando não há familiar disponível.',
 'Apoio a pessoas idosas em situação de vulnerabilidade',
 ARRAY['Pessoas idosas','Saúde','Assistência social'],
 DATE '2011-08-22',
 'Avenida Independência, 2870, Jardim América, Ribeirão Preto/SP',
 'Terça a sábado, das 8h às 16h.',
 'contato@maosdevo.org.br', 'Instituto Maos de Vo', 'Caixa Econômica', 3210, 87654321,
 'https://maosdevo.org.br', '@institutomaosdevo',
 now() - INTERVAL '150 days', true),

('de000001-0000-4000-8000-000000000003',
 'Banco de Alimentos Prato Cheio', 'banco-de-alimentos-prato-cheio',
 '31.745.092/0001-62', 'São Paulo', 'SP',
 'Rua Coronel Xavier de Toledo, 98, Centro', '01048-000', '(11) 3104-5561',
 'Recebe doação de alimento, monta cestas e abastece 22 organizações da zona leste de São Paulo.',
 'Recolhemos alimento excedente de feiras livres, distribuidoras e supermercados da capital, separamos o que está bom para consumo e montamos cestas. No último mês entregamos 1.140 cestas para 22 organizações da zona leste. Também doamos hortifruti três vezes por semana para cozinhas comunitárias, que não têm como estocar.',
 'Segurança alimentar e combate ao desperdício',
 ARRAY['Alimentação','Assistência social'],
 DATE '2009-05-04',
 'Galpão da central: Rua Silva Pinto, 77, Belenzinho, São Paulo/SP (entrada de carga pela lateral)',
 'Segunda a sexta, das 7h às 18h. Alimento perecível só até as 15h.',
 '31.745.092/0001-62', 'Banco de Alimentos Prato Cheio', 'Itaú', 7043, 12300456,
 'https://pratocheio.org.br', '@pratocheiosp',
 now() - INTERVAL '35 days', true),

-- Não verificada: cadastro recente, documentação em análise pela administração.
('de000001-0000-4000-8000-000000000004',
 'Associação Amigos de Quatro Patas', 'associacao-amigos-de-quatro-patas',
 '08.623.417/0001-12', 'Piracicaba', 'SP',
 'Rua do Rosário, 655, Bairro Alto', '13419-090', '(19) 3434-8190',
 'Castração, tratamento e adoção responsável de cães e gatos resgatados em Piracicaba.',
 'Cuidamos de 180 cães e gatos resgatados da rua, a maioria em lar temporário de voluntários. Nossa aposta é a castração: em 2026 já castramos 430 animais em bairros onde o abandono é maior, porque tratar caso a caso não dá conta do problema. Fazemos feira de adoção um sábado por mês na Praça José Bonifácio.',
 'Proteção e bem-estar animal',
 ARRAY['Animais','Saúde'],
 DATE '2016-11-02',
 'Rua do Rosário, 655, Bairro Alto, Piracicaba/SP (falar com a Cida)',
 'Quarta a domingo, das 10h às 18h.',
 'amigos4patas@exemplo.com.br', 'Associacao Amigos de Quatro Patas', 'Sicredi', 0710, 33445566,
 NULL, '@amigos4patas.piracicaba',
 NULL, true),

('de000001-0000-4000-8000-000000000005',
 'Projeto Ler e Crescer', 'projeto-ler-e-crescer',
 '24.509.831/0001-51', 'Osasco', 'SP',
 'Rua das Acácias, 130, Jardim Aliança', '06253-120', '(11) 3681-2044',
 'Reforço escolar no contraturno para 90 crianças do 2º ao 5º ano, no Jardim Aliança.',
 'Damos reforço de leitura e matemática no contraturno para 90 crianças do 2º ao 5º ano do Jardim Aliança. Começamos em 2018 porque a escola do bairro relatou que metade da turma do 3º ano não lia um parágrafo inteiro. Trabalhamos com monitores pagos e uma professora coordenadora, em grupos de no máximo 12 crianças.',
 'Educação complementar e alfabetização',
 ARRAY['Educação','Crianças e adolescentes','Cultura'],
 DATE '2018-02-19',
 'Rua das Acácias, 130, Jardim Aliança, Osasco/SP',
 'Segunda a quinta, das 13h às 19h.',
 '24.509.831/0001-51', 'Projeto Ler e Crescer', 'Bradesco', 0288, 99887766,
 'https://lerecrescer.org.br', '@projetolerecrescer',
 now() - INTERVAL '210 days', true),

-- Não verificada: é a ONG com a fila de pendentes mais movimentada, boa para
-- mostrar o painel de confirmação sem o selo para apoiar a decisão do doador.
('de000001-0000-4000-8000-000000000006',
 'Movimento Rua Viva', 'movimento-rua-viva',
 '19.376.204/0001-50', 'São Paulo', 'SP',
 'Rua Guaianases, 1204, Campos Elíseos', '01204-001', '(11) 3361-9087',
 'Abordagem de rua, café da madrugada e apoio para documento e endereço em São Paulo.',
 'Saímos quatro noites por semana pela região da Luz e dos Campos Elíseos com café, pão e cobertor. O que sustenta o resto do trabalho é a conversa: a partir dela ajudamos a tirar segunda via de documento, marcar atendimento no Centro de Referência e recuperar contato com a família. Em 2026 acompanhamos 312 pessoas.',
 'Atenção a pessoas em situação de rua',
 ARRAY['População em situação de rua','Assistência social','Alimentação'],
 DATE '2013-06-30',
 'Rua Guaianases, 1204, Campos Elíseos, São Paulo/SP (sede, recebimento na portaria)',
 'Todos os dias, das 14h às 22h.',
 'ruaviva@exemplo.com.br', 'Movimento Rua Viva', 'Nubank', 0001, 55667788,
 NULL, '@movimentoruaviva',
 NULL, true),

('de000001-0000-4000-8000-000000000007',
 'Casa de Apoio Estrela Guia', 'casa-de-apoio-estrela-guia',
 '40.182.653/0001-53', 'Barretos', 'SP',
 'Rua 20, 1447, Centro', '14780-120', '(17) 3322-6015',
 'Hospedagem e alimentação para pacientes em tratamento oncológico e seus acompanhantes, em Barretos.',
 'Hospedamos gratuitamente pacientes em tratamento oncológico e um acompanhante cada, enquanto fazem quimioterapia e radioterapia em Barretos. A maioria vem de outros estados e o tratamento dura de três a seis meses. Oferecemos cama, as três refeições e transporte até o hospital nos dias de sessão.',
 'Apoio a pacientes em tratamento de saúde',
 ARRAY['Saúde','Assistência social'],
 DATE '2007-09-14',
 'Rua 20, 1447, Centro, Barretos/SP (recepção 24h)',
 'Todos os dias, das 7h às 21h.',
 '40.182.653/0001-53', 'Casa de Apoio Estrela Guia', 'Banco do Brasil', 6610, 22113344,
 'https://estrelaguiabarretos.org.br', '@casaestrelaguia',
 now() - INTERVAL '60 days', true);


-- ─── 3. Projetos ────────────────────────────────────────────────────────────
-- Datas relativas a CURRENT_DATE para a demonstração não envelhecer: sempre há
-- projeto terminando em poucos dias e projeto com meses pela frente.
INSERT INTO public.projetos (
  id, id_ong, nome_projeto, slug, descricao, cidade, causa,
  data_inicio, data_fim, status
) VALUES

('de000002-0000-4000-8000-000000000001', 'de000001-0000-4000-8000-000000000001',
 'Enxoval da Casa 2, 12 novas vagas de acolhimento',
 'enxoval-da-casa-2-12-novas-vagas-de-acolhimento',
 'A Vara da Infância autorizou a abertura da nossa segunda casa, com 12 vagas. O imóvel está pronto e a equipe contratada, mas os quartos estão vazios: precisamos de colchão, roupa de cama e armário antes de receber as crianças. Quem doar pode acompanhar a montagem pelas atualizações do projeto.',
 'Sorocaba', 'Crianças e adolescentes',
 CURRENT_DATE - 40, CURRENT_DATE + 45, true),

('de000002-0000-4000-8000-000000000002', 'de000001-0000-4000-8000-000000000001',
 'Volta às aulas 2027',
 'volta-as-aulas-2027',
 'Em fevereiro, 28 crianças e adolescentes da casa voltam para a escola. Cada um precisa de mochila, material e tênis do próprio número. Material usado de irmão mais velho não resolve, porque a maioria chegou sem nada. Começamos a arrecadar agora para entregar tudo antes do primeiro dia de aula.',
 'Sorocaba', 'Educação',
 CURRENT_DATE - 20, CURRENT_DATE + 120, true),

('de000002-0000-4000-8000-000000000003', 'de000001-0000-4000-8000-000000000002',
 'Cuidar de quem cuidou: cestas para 40 idosos',
 'cuidar-de-quem-cuidou-cestas-para-40-idosos',
 'São 40 idosos que recebem cesta nossa todo mês. Trinta e um deles vivem só do BPC, e depois do aluguel e da luz sobra menos de R$ 200 para comer. A cesta cobre o mês inteiro e é entregue em casa pelos voluntários, que aproveitam a visita para ver como a pessoa está.',
 'Ribeirão Preto', 'Pessoas idosas',
 CURRENT_DATE - 60, CURRENT_DATE + 30, true),

('de000002-0000-4000-8000-000000000004', 'de000001-0000-4000-8000-000000000002',
 'Fralda não é luxo: estoque do trimestre',
 'fralda-nao-e-luxo-estoque-do-trimestre',
 'Quatorze dos idosos que acompanhamos usam fralda geriátrica todos os dias. Um pacote de oito unidades dura dois dias e custa mais que a cesta básica de arroz e feijão da família. Nosso estoque acaba na semana que vem e o SUS da região não distribui para uso domiciliar.',
 'Ribeirão Preto', 'Pessoas idosas',
 CURRENT_DATE - 25, CURRENT_DATE + 7, true),

('de000002-0000-4000-8000-000000000005', 'de000001-0000-4000-8000-000000000003',
 'Cestas de outubro para 300 famílias',
 'cestas-de-outubro-para-300-familias',
 'Montamos as cestas do mês na primeira semana de outubro, com as organizações parceiras vindo buscar no galpão. Faltam arroz, feijão e óleo para fechar as 300 cestas. O que chegar depois do dia da montagem entra no mês seguinte, por isso o prazo aqui é curto de verdade.',
 'São Paulo', 'Alimentação',
 CURRENT_DATE - 18, CURRENT_DATE + 3, true),

('de000002-0000-4000-8000-000000000006', 'de000001-0000-4000-8000-000000000003',
 'Câmara fria para a central de doações',
 'camara-fria-para-a-central-de-doacoes',
 'Hoje recusamos doação de hortifruti nas quintas e sextas porque não temos onde guardar até a distribuição de segunda. Com uma câmara fria de 4 m³ conseguiríamos aceitar cerca de 3 toneladas por mês que hoje viram lixo na feira. É o projeto mais caro que já tentamos e vai levar alguns meses.',
 'São Paulo', 'Alimentação',
 CURRENT_DATE - 75, CURRENT_DATE + 150, true),

('de000002-0000-4000-8000-000000000007', 'de000001-0000-4000-8000-000000000004',
 'Castramóvel no Jardim Oriente',
 'castramovel-no-jardim-oriente',
 'O Jardim Oriente é de onde vem um terço dos nossos resgates. Alugamos o castramóvel por três dias e a clínica parceira cobra R$ 150 por animal, com fila de 60 inscritos entre cães e gatos de tutores que não têm como pagar. Castrar lá agora é o que evita a próxima ninhada na rua.',
 'Piracicaba', 'Animais',
 CURRENT_DATE - 30, CURRENT_DATE + 21, true),

('de000002-0000-4000-8000-000000000008', 'de000001-0000-4000-8000-000000000004',
 'Ração para 180 animais sob nossos cuidados',
 'racao-para-180-animais-sob-nossos-cuidados',
 'São 180 animais entre o abrigo e os lares temporários, e o consumo é de cerca de 600 kg de ração por mês. Quando o estoque aperta, os voluntários pagam do próprio bolso. O que já aconteceu nos últimos dois meses. Doação de ração é o que mais nos ajuda a continuar aceitando resgate.',
 'Piracicaba', 'Animais',
 CURRENT_DATE - 50, CURRENT_DATE + 9, true),

('de000002-0000-4000-8000-000000000009', 'de000001-0000-4000-8000-000000000005',
 'Reforço escolar no Jardim Aliança',
 'reforco-escolar-no-jardim-alianca',
 'Noventa crianças do 2º ao 5º ano em grupos de doze, quatro tardes por semana. Dois monitores que hoje são voluntários vão virar contratados no próximo semestre, porque rotatividade de monitor atrapalha justamente a criança que mais precisa de vínculo. Também faltam material de uso coletivo e cadeiras.',
 'Osasco', 'Educação',
 CURRENT_DATE - 120, CURRENT_DATE + 60, true),

('de000002-0000-4000-8000-000000000010', 'de000001-0000-4000-8000-000000000005',
 'Biblioteca da Esquina',
 'biblioteca-da-esquina',
 'Estamos montando uma biblioteca aberta na sala da frente da sede, para as crianças do reforço e para a vizinhança levar livro emprestado. Já temos 182 títulos doados e catalogados; queremos chegar a 500 e ter estante para todos eles. Aceitamos livro infantil usado, desde que esteja inteiro e legível.',
 'Osasco', 'Cultura',
 CURRENT_DATE - 35, CURRENT_DATE + 90, true),

('de000002-0000-4000-8000-000000000011', 'de000001-0000-4000-8000-000000000006',
 'Campanha do Agasalho 2026',
 'campanha-do-agasalho-2026',
 'A frente fria da próxima semana deve derrubar a mínima para 9°C na capital. Distribuímos cobertor, agasalho e meia nas quatro noites de abordagem, e o que sobra fica na sede para quem procura durante o dia. Cobertor novo ou usado em bom estado, lavado: na rua não há como lavar depois.',
 'São Paulo', 'População em situação de rua',
 CURRENT_DATE - 70, CURRENT_DATE + 6, true),

('de000002-0000-4000-8000-000000000012', 'de000001-0000-4000-8000-000000000006',
 'Café da madrugada',
 'cafe-da-madrugada',
 'Quatro noites por semana, das 22h às 2h, servimos café com leite e pão para cerca de 120 pessoas por noite na região da Luz. É o que abre a conversa: quase todo encaminhamento para documento ou abrigo começou numa fila de café. O projeto é contínuo e o gás da cozinha é a despesa fixa que mais aperta.',
 'São Paulo', 'Alimentação',
 CURRENT_DATE - 200, CURRENT_DATE + 25, true),

('de000002-0000-4000-8000-000000000013', 'de000001-0000-4000-8000-000000000007',
 'Casa cheia: 20 leitos para acompanhantes',
 'casa-cheia-20-leitos-para-acompanhantes',
 'Com a ampliação do ambulatório do hospital, passamos de 12 para 20 leitos de acompanhante. São pessoas que ficam de três a seis meses com a gente, e cada uma chega com uma mala pequena. Precisamos de kit de higiene, roupa de cama e ajuda com a conta de energia, que subiu junto com a ocupação.',
 'Barretos', 'Saúde',
 CURRENT_DATE - 45, CURRENT_DATE + 35, true),

('de000002-0000-4000-8000-000000000014', 'de000001-0000-4000-8000-000000000007',
 'Van da quimioterapia em dia',
 'van-da-quimioterapia-em-dia',
 'A van faz quatro viagens por dia até o hospital levando quem tem sessão marcada. Ela tem 11 anos, 320 mil km e está parada esperando reparo na suspensão e no ar-condicionado. Sem ar, paciente em quimioterapia não pode viajar. Enquanto isso pagamos transporte por aplicativo, que custa o triplo.',
 'Barretos', 'Saúde',
 CURRENT_DATE - 28, CURRENT_DATE + 14, true);


-- ─── 4. Necessidades ────────────────────────────────────────────────────────
-- `arrecadado` NÃO é preenchido aqui. A coluna é mantida pelo trigger
-- `doacao_atualiza_necessidade` (migration 20260928120200), que soma apenas as
-- doações com status = 'confirmada'. Escrever à mão seria apagado no primeiro
-- INSERT em `doacoes` e esconderia justamente o mecanismo que a demonstração
-- precisa provar. O valor de cada barra vem das doações da seção 5.
-- Urgência: 1 = baixa, 2 = média, 3 = alta.
INSERT INTO public.necessidades (
  id, id_projeto, tipo, nome, categoria, unidade, meta, urgencia, prazo, status
) VALUES
-- Projeto 01, Enxoval da Casa 2
('de000003-0000-4000-8000-000000000001','de000002-0000-4000-8000-000000000001','item','Colchão de solteiro com capa impermeável','Móveis e utensílios','un',12,3,CURRENT_DATE + 20,true),
('de000003-0000-4000-8000-000000000002','de000002-0000-4000-8000-000000000001','item','Jogo de lençol de solteiro','Móveis e utensílios','un',24,2,CURRENT_DATE + 30,true),
('de000003-0000-4000-8000-000000000003','de000002-0000-4000-8000-000000000001','dinheiro','Armário de quarto para os seis dormitórios',NULL,NULL,4800,2,CURRENT_DATE + 45,true),
-- Projeto 02, Volta às aulas 2027
('de000003-0000-4000-8000-000000000004','de000002-0000-4000-8000-000000000002','item','Mochila escolar reforçada','Material escolar','un',30,2,CURRENT_DATE + 25,true),
('de000003-0000-4000-8000-000000000005','de000002-0000-4000-8000-000000000002','item','Caderno de 10 matérias','Material escolar','un',60,1,NULL,true),
('de000003-0000-4000-8000-000000000006','de000002-0000-4000-8000-000000000002','item','Tênis infantil (tamanhos 28 a 34)','Roupas e calçados','par',25,2,CURRENT_DATE + 25,true),
-- Projeto 03, Cestas para idosos
('de000003-0000-4000-8000-000000000007','de000002-0000-4000-8000-000000000003','dinheiro','Cesta de alimentos do mês para 40 idosos',NULL,NULL,6000,3,CURRENT_DATE + 10,true),
('de000003-0000-4000-8000-000000000008','de000002-0000-4000-8000-000000000003','item','Leite em pó integral','Alimentos','kg',40,2,CURRENT_DATE + 40,true),
-- Projeto 04, Fraldas
('de000003-0000-4000-8000-000000000009','de000002-0000-4000-8000-000000000004','item','Fralda geriátrica tamanho G','Higiene e limpeza','pacote',120,3,CURRENT_DATE + 7,true),
('de000003-0000-4000-8000-000000000010','de000002-0000-4000-8000-000000000004','item','Lenço umedecido adulto','Higiene e limpeza','pacote',60,2,NULL,true),
-- Projeto 05, Cestas de outubro
('de000003-0000-4000-8000-000000000011','de000002-0000-4000-8000-000000000005','item','Arroz tipo 1','Alimentos','kg',900,3,CURRENT_DATE + 3,true),
('de000003-0000-4000-8000-000000000012','de000002-0000-4000-8000-000000000005','item','Feijão carioca','Alimentos','kg',450,3,CURRENT_DATE + 3,true),
('de000003-0000-4000-8000-000000000013','de000002-0000-4000-8000-000000000005','item','Óleo de soja','Alimentos','L',300,2,CURRENT_DATE + 3,true),
('de000003-0000-4000-8000-000000000014','de000002-0000-4000-8000-000000000005','dinheiro','Combustível das rotas de coleta',NULL,NULL,3500,2,CURRENT_DATE + 15,true),
-- Projeto 06, Câmara fria
('de000003-0000-4000-8000-000000000015','de000002-0000-4000-8000-000000000006','dinheiro','Câmara fria de 4 m³ instalada',NULL,NULL,28000,1,CURRENT_DATE + 150,true),
('de000003-0000-4000-8000-000000000016','de000002-0000-4000-8000-000000000006','item','Caixa plástica vazada de 50 L','Móveis e utensílios','un',80,1,NULL,true),
-- Projeto 07, Castramóvel
('de000003-0000-4000-8000-000000000017','de000002-0000-4000-8000-000000000007','dinheiro','Castração de 60 cães e gatos',NULL,NULL,9000,3,CURRENT_DATE + 21,true),
('de000003-0000-4000-8000-000000000018','de000002-0000-4000-8000-000000000007','item','Coleira antipulgas','Outros','un',60,2,NULL,true),
-- Projeto 08, Ração
('de000003-0000-4000-8000-000000000019','de000002-0000-4000-8000-000000000008','item','Ração seca para cães adultos','Alimentos','kg',600,3,CURRENT_DATE + 9,true),
('de000003-0000-4000-8000-000000000020','de000002-0000-4000-8000-000000000008','item','Ração seca para gatos','Alimentos','kg',200,2,CURRENT_DATE + 9,true),
-- Projeto 09, Reforço escolar
('de000003-0000-4000-8000-000000000022','de000002-0000-4000-8000-000000000009','item','Caixa de lápis de cor de 24 cores','Material escolar','caixa',40,2,CURRENT_DATE + 18,true),
('de000003-0000-4000-8000-000000000023','de000002-0000-4000-8000-000000000009','dinheiro','Bolsa de dois monitores por seis meses',NULL,NULL,12000,2,CURRENT_DATE + 60,true),
-- Projeto 10, Biblioteca
('de000003-0000-4000-8000-000000000025','de000002-0000-4000-8000-000000000010','item','Livro infantil em bom estado','Outros','un',300,1,CURRENT_DATE + 90,true),
('de000003-0000-4000-8000-000000000026','de000002-0000-4000-8000-000000000010','item','Estante de madeira de 5 prateleiras','Móveis e utensílios','un',6,2,CURRENT_DATE + 30,true),
-- Projeto 11, Agasalho
('de000003-0000-4000-8000-000000000027','de000002-0000-4000-8000-000000000011','item','Cobertor de solteiro','Inverno','un',250,3,CURRENT_DATE + 6,true),
('de000003-0000-4000-8000-000000000028','de000002-0000-4000-8000-000000000011','item','Meia de lã adulto','Inverno','par',200,3,CURRENT_DATE + 6,true),
('de000003-0000-4000-8000-000000000029','de000002-0000-4000-8000-000000000011','item','Agasalho adulto (P ao GG)','Roupas e calçados','un',300,2,CURRENT_DATE + 6,true),
-- Projeto 12, Café da madrugada
('de000003-0000-4000-8000-000000000030','de000002-0000-4000-8000-000000000012','item','Leite longa vida','Alimentos','L',400,2,NULL,true),
('de000003-0000-4000-8000-000000000031','de000002-0000-4000-8000-000000000012','item','Pão francês','Alimentos','kg',120,3,CURRENT_DATE + 2,true),
('de000003-0000-4000-8000-000000000032','de000002-0000-4000-8000-000000000012','dinheiro','Gás e insumos da cozinha',NULL,NULL,2400,2,CURRENT_DATE + 25,true),
-- Projeto 13, Casa cheia
('de000003-0000-4000-8000-000000000033','de000002-0000-4000-8000-000000000013','item','Kit de higiene pessoal','Higiene e limpeza','un',150,2,CURRENT_DATE + 35,true),
('de000003-0000-4000-8000-000000000035','de000002-0000-4000-8000-000000000013','dinheiro','Conta de energia da casa de apoio',NULL,NULL,4200,3,CURRENT_DATE + 12,true),
-- Projeto 14, Van
('de000003-0000-4000-8000-000000000036','de000002-0000-4000-8000-000000000014','dinheiro','Reparo da suspensão e do ar-condicionado da van',NULL,NULL,7500,3,CURRENT_DATE + 14,true),
('de000003-0000-4000-8000-000000000037','de000002-0000-4000-8000-000000000014','item','Cesta de frutas para os pacientes','Alimentos','caixa',30,1,NULL,true),
-- Necessidade desativada: a ONG já resolveu por outra via. Some da vitrine
-- pública (a policy filtra status = true) e continua visível no painel dela.
('de000003-0000-4000-8000-000000000038','de000002-0000-4000-8000-000000000013','item','Ventilador de teto','Móveis e utensílios','un',8,1,NULL,false);


-- ─── 5. Doações vinculadas a necessidade ────────────────────────────────────
-- Exercita a regra central do produto: a barra só sobe com doação
-- 'confirmada'. As 'pendente' aparecem na faixa listrada da barra e na fila de
-- confirmação da ONG; as 'cancelada' não contam em lugar nenhum.
--
-- Convenções que seguem o que a Edge Function `registrar-doacao` grava:
--   • doação de item   → quantidade preenchida, valor = 0, tipo_doacao 'item'
--   • doação em dinheiro → valor preenchido, quantidade NULL
--   • `id_usuario` sempre NULL (este arquivo não cria conta em auth.users);
--     nome e e-mail do doador ficam na própria linha, como no fluxo sem login
--   • `anonima = true` mantém nome e e-mail gravados (a ONG precisa saber quem
--     entregou) e só esconde o nome nas exibições públicas
--
-- `created_at` fica com o default now() de propósito: a migration
-- 20260928120200 reclassifica como 'confirmada' toda doação pendente com
-- created_at anterior a 28/09/2026, e datar o created_at no passado faria as
-- pendentes desta demonstração desaparecerem se as migrations fossem
-- reaplicadas depois do seed.
INSERT INTO public.doacoes (
  id, id_usuario, id_ong, id_projeto, id_necessidade,
  valor, quantidade, status, tipo_doacao,
  data_doacao, confirmada_em, doador_nome, doador_email, anonima, forma_entrega
)
SELECT
  ('de000004-0000-4000-8000-' || lpad(v.n::text, 12, '0'))::uuid,
  NULL,
  p.id_ong,
  n.id_projeto,
  n.id,
  COALESCE(v.valor, 0),
  v.quantidade,
  v.situacao,
  CASE WHEN v.quantidade IS NOT NULL THEN 'item' ELSE v.forma_pagamento END,
  now() - make_interval(days => v.dias_atras, hours => (v.n % 12)),
  CASE WHEN v.situacao = 'confirmada'
       THEN now() - make_interval(days => v.dias_atras - v.dias_para_confirmar, hours => (v.n % 7))
  END,
  v.doador_nome,
  v.doador_email,
  v.anonima,
  CASE WHEN v.quantidade IS NOT NULL THEN v.entrega END
FROM (VALUES
  --  n, nec, valor, qtd, situacao, dias_atras, dias_p/confirmar, anônima, nome, e-mail, entrega, forma
  --- Necessidade 01, colchão (meta 12): pouco arrecadado
  (  1,  1, NULL,  2, 'confirmada', 38, 3, false, 'Mariana Alves',              'mariana.alves@exemplo.com.br',      'levar',  'pix'),
  (  2,  1, NULL,  2, 'confirmada', 21, 2, false, 'Thiago Nogueira',            'thiago.nogueira@exemplo.com.br',    'coleta', 'pix'),
  (  3,  1, NULL,  1, 'pendente',    2, 0, false, 'Rafaela Prado',              'rafaela.prado@exemplo.com.br',      'levar',  'pix'),
  --- Necessidade 02, lençol (meta 24): metade
  (  4,  2, NULL,  6, 'confirmada', 30, 4, false, 'Mercado São Judas',          'contato@mercadosaojudas.exemplo.com.br','coleta','pix'),
  (  5,  2, NULL,  4, 'confirmada', 17, 2, true,  'Juliana Sato',               'juliana.sato@exemplo.com.br',       'levar',  'pix'),
  (  6,  2, NULL,  2, 'confirmada',  9, 1, false, 'Carlos Eduardo Lima',        'carlos.lima@exemplo.com.br',        'levar',  'pix'),
  (  7,  2, NULL,  4, 'pendente',    1, 0, false, 'Beatriz Camargo',            'beatriz.camargo@exemplo.com.br',    'coleta', 'pix'),
  --- Necessidade 03, armários, dinheiro (meta 4.800)
  (  8,  3,  500, NULL,'confirmada', 33, 2, false, 'Fernando Kuroda',           'fernando.kuroda@exemplo.com.br',    NULL, 'pix'),
  (  9,  3,  250, NULL,'confirmada', 20, 3, true,  'Patrícia Nunes',            'patricia.nunes@exemplo.com.br',     NULL, 'pix'),
  ( 10,  3,  500, NULL,'confirmada', 12, 1, false, 'Daniel Ferraz',             'daniel.ferraz@exemplo.com.br',      NULL, 'transferencia'),
  ( 11,  3,  300, NULL,'pendente',    3, 0, false, 'Larissa Monteiro',          'larissa.monteiro@exemplo.com.br',   NULL, 'pix'),
  ( 12,  3,  150, NULL,'cancelada',  25, 0, false, 'Eduardo Bastos',            'eduardo.bastos@exemplo.com.br',     NULL, 'boleto'),
  --- Necessidade 04, mochilas (meta 30): META BATIDA
  ( 13,  4, NULL, 20, 'confirmada', 26, 5, false, 'Papelaria Lápis Azul',       'vendas@lapisazul.exemplo.com.br',   'coleta', 'pix'),
  ( 14,  4, NULL,  6, 'confirmada', 14, 2, false, 'Simone Delgado',             'simone.delgado@exemplo.com.br',     'levar',  'pix'),
  ( 15,  4, NULL,  4, 'confirmada',  8, 1, true,  'Marcos Vinícius Rocha',      'marcos.rocha@exemplo.com.br',       'levar',  'pix'),
  --- Necessidade 05, cadernos (meta 60)
  ( 16,  5, NULL, 12, 'confirmada', 19, 3, false, 'Ana Lúcia Peixoto',          'ana.peixoto@exemplo.com.br',        'levar',  'pix'),
  ( 17,  5, NULL,  6, 'confirmada', 11, 2, false, 'Renato Quirino',             'renato.quirino@exemplo.com.br',     'levar',  'pix'),
  ( 18,  5, NULL, 24, 'pendente',    4, 0, false, 'Papelaria Lápis Azul',       'vendas@lapisazul.exemplo.com.br',   'coleta', 'pix'),
  --- Necessidade 06, tênis (meta 25 pares)
  ( 19,  6, NULL,  4, 'confirmada', 22, 6, false, 'Vanessa Tavares',            'vanessa.tavares@exemplo.com.br',    'levar',  'pix'),
  ( 20,  6, NULL,  3, 'confirmada', 10, 2, true,  'Gustavo Penha',              'gustavo.penha@exemplo.com.br',      'coleta', 'pix'),
  --- Necessidade 07, cestas de idosos, dinheiro (meta 6.000)
  ( 21,  7, 2000, NULL,'confirmada', 40, 2, false, 'Condomínio Villa Rica',     'sindico@villarica.exemplo.com.br',  NULL, 'transferencia'),
  ( 22,  7, 1200, NULL,'confirmada', 24, 3, true,  'Heloísa Brandão',           'heloisa.brandao@exemplo.com.br',    NULL, 'pix'),
  ( 23,  7,  700, NULL,'confirmada',  9, 1, false, 'Otávio Bertolini',          'otavio.bertolini@exemplo.com.br',   NULL, 'pix'),
  ( 24,  7,  500, NULL,'pendente',    2, 0, false, 'Mariana Alves',             'mariana.alves@exemplo.com.br',      NULL, 'pix'),
  --- Necessidade 08, leite em pó (meta 40 kg)
  ( 25,  8, NULL, 12, 'confirmada', 28, 4, false, 'Mercado São Judas',          'contato@mercadosaojudas.exemplo.com.br','coleta','pix'),
  ( 26,  8, NULL, 10, 'confirmada', 13, 2, false, 'Juliana Sato',               'juliana.sato@exemplo.com.br',       'levar',  'pix'),
  ( 27,  8, NULL,  5, 'cancelada',  18, 0, false, 'Thiago Nogueira',            'thiago.nogueira@exemplo.com.br',    'coleta', 'pix'),
  --- Necessidade 09, fralda G (meta 120 pacotes)
  ( 28,  9, NULL, 20, 'confirmada', 16, 3, false, 'Farmácia Bem Viver',         'gerencia@bemviver.exemplo.com.br',  'coleta', 'pix'),
  ( 29,  9, NULL, 15, 'confirmada',  7, 2, true,  'Patrícia Nunes',             'patricia.nunes@exemplo.com.br',     'levar',  'pix'),
  ( 30,  9, NULL,  6, 'confirmada',  4, 1, false, 'Daniel Ferraz',              'daniel.ferraz@exemplo.com.br',      'levar',  'pix'),
  ( 31,  9, NULL, 24, 'pendente',    1, 0, false, 'Farmácia Bem Viver',         'gerencia@bemviver.exemplo.com.br',  'coleta', 'pix'),
  --- Necessidade 10, lenço umedecido (meta 60): META BATIDA
  ( 32, 10, NULL, 36, 'confirmada', 21, 4, false, 'Farmácia Bem Viver',         'gerencia@bemviver.exemplo.com.br',  'coleta', 'pix'),
  ( 33, 10, NULL, 24, 'confirmada',  6, 2, false, 'Larissa Monteiro',           'larissa.monteiro@exemplo.com.br',   'levar',  'pix'),
  --- Necessidade 11, arroz (meta 900 kg)
  ( 34, 11, NULL,300, 'confirmada', 35, 3, false, 'Supermercado Boa Safra',     'doacoes@boasafra.exemplo.com.br',   'coleta', 'pix'),
  ( 35, 11, NULL,200, 'confirmada', 18, 2, false, 'Paróquia São Roque',        'secretaria@saoroque.exemplo.com.br','coleta', 'pix'),
  ( 36, 11, NULL, 62, 'confirmada',  9, 1, true,  'Ana Lúcia Peixoto',          'ana.peixoto@exemplo.com.br',        'levar',  'pix'),
  ( 37, 11, NULL, 50, 'confirmada',  3, 1, false, 'Vanessa Tavares',            'vanessa.tavares@exemplo.com.br',    'levar',  'pix'),
  ( 38, 11, NULL,120, 'pendente',    1, 0, false, 'Supermercado Boa Safra',     'doacoes@boasafra.exemplo.com.br',   'coleta', 'pix'),
  ( 39, 11, NULL, 80, 'cancelada',  12, 0, false, 'Renato Quirino',             'renato.quirino@exemplo.com.br',     'coleta', 'pix'),
  --- Necessidade 12, feijão (meta 450 kg)
  ( 40, 12, NULL,120, 'confirmada', 22, 2, false, 'Supermercado Boa Safra',     'doacoes@boasafra.exemplo.com.br',   'coleta', 'pix'),
  ( 41, 12, NULL, 60, 'confirmada',  8, 3, false, 'Eduardo Bastos',             'eduardo.bastos@exemplo.com.br',     'levar',  'pix'),
  ( 42, 12, NULL, 90, 'pendente',    2, 0, true,  'Simone Delgado',             'simone.delgado@exemplo.com.br',     'coleta', 'pix'),
  --- Necessidade 13, óleo (meta 300 L)
  ( 43, 13, NULL, 60, 'confirmada', 20, 2, false, 'Paróquia São Roque',        'secretaria@saoroque.exemplo.com.br','coleta', 'pix'),
  ( 44, 13, NULL, 36, 'confirmada',  5, 1, false, 'Gustavo Penha',              'gustavo.penha@exemplo.com.br',      'levar',  'pix'),
  --- Necessidade 14, combustível, dinheiro (meta 3.500)
  ( 45, 14,  300, NULL,'confirmada', 27, 2, false, 'Fernando Kuroda',           'fernando.kuroda@exemplo.com.br',    NULL, 'pix'),
  ( 46, 14,  220, NULL,'confirmada', 15, 4, true,  'Heloísa Brandão',           'heloisa.brandao@exemplo.com.br',    NULL, 'pix'),
  ( 47, 14,  300, NULL,'confirmada',  6, 1, false, 'Marcos Vinícius Rocha',     'marcos.rocha@exemplo.com.br',       NULL, 'pix'),
  ( 48, 14,  100, NULL,'pendente',    1, 0, false, 'Beatriz Camargo',           'beatriz.camargo@exemplo.com.br',    NULL, 'pix'),
  --- Necessidade 15, câmara fria, dinheiro (meta 28.000): projeto longo, começo de caminhada
  ( 49, 15, 5000, NULL,'confirmada', 45, 5, false, 'Metalúrgica Campo Alto',    'financeiro@campoalto.exemplo.com.br',NULL,'transferencia'),
  ( 50, 15,  900, NULL,'confirmada', 23, 2, true,  'Carlos Eduardo Lima',       'carlos.lima@exemplo.com.br',        NULL, 'pix'),
  ( 51, 15,  500, NULL,'confirmada', 10, 2, false, 'Mariana Alves',             'mariana.alves@exemplo.com.br',      NULL, 'pix'),
  ( 52, 15, 1000, NULL,'pendente',    4, 0, false, 'Metalúrgica Campo Alto',    'financeiro@campoalto.exemplo.com.br',NULL,'transferencia'),
  --- Necessidade 16, caixa plástica (meta 80)
  ( 53, 16, NULL, 24, 'confirmada', 19, 3, false, 'Metalúrgica Campo Alto',     'financeiro@campoalto.exemplo.com.br','coleta','pix'),
  ( 54, 16, NULL,  7, 'confirmada',  6, 2, true,  'Simone Delgado',             'simone.delgado@exemplo.com.br',     'levar',  'pix'),
  --- Necessidade 17, castração, dinheiro (meta 9.000): exatamente metade.
  --- ONG não verificada: confirmação mais lenta e fila de pendentes mais antiga.
  ( 55, 17, 2500, NULL,'confirmada', 32, 6, false, 'Clínica Veterinária Pata Firme','contato@patafirme.exemplo.com.br',NULL,'transferencia'),
  ( 56, 17, 1200, NULL,'confirmada', 19, 8, true,  'Larissa Monteiro',          'larissa.monteiro@exemplo.com.br',   NULL, 'pix'),
  ( 57, 17,  800, NULL,'confirmada', 11, 5, false, 'Otávio Bertolini',          'otavio.bertolini@exemplo.com.br',   NULL, 'pix'),
  ( 58, 17,  400, NULL,'pendente',    9, 0, false, 'Vanessa Tavares',           'vanessa.tavares@exemplo.com.br',    NULL, 'pix'),
  ( 59, 17,  250, NULL,'pendente',    3, 0, true,  'Gustavo Penha',             'gustavo.penha@exemplo.com.br',      NULL, 'pix'),
  ( 60, 17,  300, NULL,'cancelada',  15, 0, false, 'Renato Quirino',            'renato.quirino@exemplo.com.br',     NULL, 'boleto'),
  --- Necessidade 18, coleira (meta 60)
  ( 61, 18, NULL,  6, 'confirmada', 13, 6, false, 'Clínica Veterinária Pata Firme','contato@patafirme.exemplo.com.br','coleta','pix'),
  ( 62, 18, NULL,  3, 'confirmada',  4, 3, false, 'Patrícia Nunes',             'patricia.nunes@exemplo.com.br',     'levar',  'pix'),
  ( 63, 18, NULL, 12, 'pendente',    7, 0, false, 'Agropecuária Dois Irmãos',   'loja@doisirmaos.exemplo.com.br',    'coleta', 'pix'),
  --- Necessidade 19, ração cães (meta 600 kg)
  ( 64, 19, NULL,150, 'confirmada', 26, 7, false, 'Agropecuária Dois Irmãos',   'loja@doisirmaos.exemplo.com.br',    'coleta', 'pix'),
  ( 65, 19, NULL, 60, 'confirmada', 14, 4, false, 'Simone Delgado',             'simone.delgado@exemplo.com.br',     'levar',  'pix'),
  ( 66, 19, NULL, 25, 'confirmada',  5, 3, true,  'Ana Lúcia Peixoto',          'ana.peixoto@exemplo.com.br',        'levar',  'pix'),
  ( 67, 19, NULL,100, 'pendente',    6, 0, false, 'Agropecuária Dois Irmãos',   'loja@doisirmaos.exemplo.com.br',    'coleta', 'pix'),
  --- Necessidade 20, ração gatos (meta 200 kg)
  ( 68, 20, NULL, 40, 'confirmada', 17, 5, false, 'Daniel Ferraz',              'daniel.ferraz@exemplo.com.br',      'levar',  'pix'),
  ( 69, 20, NULL, 24, 'confirmada',  7, 4, false, 'Patrícia Nunes',             'patricia.nunes@exemplo.com.br',     'coleta', 'pix'),
  --- Necessidade 22, lápis de cor (meta 40 caixas): META BATIDA
  ( 70, 22, NULL, 24, 'confirmada', 24, 3, false, 'Papelaria Lápis Azul',       'vendas@lapisazul.exemplo.com.br',   'coleta', 'pix'),
  ( 71, 22, NULL, 10, 'confirmada', 12, 2, true,  'Beatriz Camargo',            'beatriz.camargo@exemplo.com.br',    'levar',  'pix'),
  ( 72, 22, NULL,  6, 'confirmada',  5, 1, false, 'Thiago Nogueira',            'thiago.nogueira@exemplo.com.br',    'levar',  'pix'),
  --- Necessidade 23, bolsa de monitores, dinheiro (meta 12.000)
  ( 73, 23, 1500, NULL,'confirmada', 41, 2, false, 'Escritório Andrade & Prado','contato@andradeprado.exemplo.com.br',NULL,'transferencia'),
  ( 74, 23,  900, NULL,'confirmada', 25, 3, true,  'Juliana Sato',              'juliana.sato@exemplo.com.br',       NULL, 'pix'),
  ( 75, 23,  450, NULL,'confirmada', 13, 1, false, 'Eduardo Bastos',            'eduardo.bastos@exemplo.com.br',     NULL, 'pix'),
  ( 76, 23,  300, NULL,'confirmada',  4, 1, false, 'Mariana Alves',             'mariana.alves@exemplo.com.br',      NULL, 'pix'),
  ( 77, 23,  600, NULL,'pendente',    2, 0, false, 'Escritório Andrade & Prado','contato@andradeprado.exemplo.com.br',NULL,'transferencia'),
  --- Necessidade 25, livro infantil (meta 300)
  ( 78, 25, NULL, 60, 'confirmada', 36, 4, false, 'Colégio Vila dos Ipês',      'coordenacao@viladosipes.exemplo.com.br','coleta','pix'),
  ( 79, 25, NULL, 40, 'confirmada', 18, 3, false, 'Heloísa Brandão',            'heloisa.brandao@exemplo.com.br',    'levar',  'pix'),
  ( 80, 25, NULL, 18, 'confirmada',  6, 2, true,  'Carlos Eduardo Lima',        'carlos.lima@exemplo.com.br',        'levar',  'pix'),
  ( 81, 25, NULL, 25, 'pendente',    3, 0, false, 'Otávio Bertolini',           'otavio.bertolini@exemplo.com.br',   'coleta', 'pix'),
  --- Necessidade 26, estante (meta 6)
  ( 82, 26, NULL,  1, 'confirmada', 22, 4, false, 'Marcenaria Bom Corte',       'orcamento@bomcorte.exemplo.com.br', 'coleta', 'pix'),
  ( 83, 26, NULL,  1, 'confirmada',  9, 2, true,  'Otávio Bertolini',           'otavio.bertolini@exemplo.com.br',   'coleta', 'pix'),
  ( 84, 26, NULL,  1, 'pendente',    2, 0, false, 'Larissa Monteiro',           'larissa.monteiro@exemplo.com.br',   'coleta', 'pix'),
  --- Necessidade 27, cobertor (meta 250): reta final, prazo em poucos dias
  ( 85, 27, NULL, 80, 'confirmada', 29, 2, false, 'Loja Casa & Cama',           'sac@casaecama.exemplo.com.br',      'coleta', 'pix'),
  ( 86, 27, NULL, 50, 'confirmada', 16, 2, true,  'Fernando Kuroda',            'fernando.kuroda@exemplo.com.br',    'levar',  'pix'),
  ( 87, 27, NULL, 36, 'confirmada',  8, 1, false, 'Marcos Vinícius Rocha',      'marcos.rocha@exemplo.com.br',       'levar',  'pix'),
  ( 88, 27, NULL, 20, 'confirmada',  2, 1, false, 'Vanessa Tavares',            'vanessa.tavares@exemplo.com.br',    'levar',  'pix'),
  ( 89, 27, NULL, 40, 'pendente',    1, 0, false, 'Loja Casa & Cama',           'sac@casaecama.exemplo.com.br',      'coleta', 'pix'),
  ( 90, 27, NULL, 15, 'cancelada',  11, 0, false, 'Renato Quirino',             'renato.quirino@exemplo.com.br',     'coleta', 'pix'),
  --- Necessidade 28, meia de lã (meta 200 pares)
  ( 91, 28, NULL, 40, 'confirmada', 15, 3, false, 'Loja Casa & Cama',           'sac@casaecama.exemplo.com.br',      'coleta', 'pix'),
  ( 92, 28, NULL, 18, 'confirmada',  4, 1, true,  'Simone Delgado',             'simone.delgado@exemplo.com.br',     'levar',  'pix'),
  --- Necessidade 29, agasalho (meta 300)
  ( 93, 29, NULL, 90, 'confirmada', 23, 2, false, 'Academia Corpo em Movimento','contato@corpoemmovimento.exemplo.com.br','coleta','pix'),
  ( 94, 29, NULL, 30, 'confirmada', 12, 2, false, 'Ana Lúcia Peixoto',          'ana.peixoto@exemplo.com.br',        'levar',  'pix'),
  ( 95, 29, NULL, 21, 'confirmada',  5, 1, true,  'Gustavo Penha',              'gustavo.penha@exemplo.com.br',      'levar',  'pix'),
  ( 96, 29, NULL, 60, 'pendente',    2, 0, false, 'Academia Corpo em Movimento','contato@corpoemmovimento.exemplo.com.br','coleta','pix'),
  --- Necessidade 30, leite longa vida (meta 400 L)
  ( 97, 30, NULL, 72, 'confirmada', 21, 3, false, 'Padaria Estrela d''Alva',    'padaria@estreladalva.exemplo.com.br','coleta','pix'),
  ( 98, 30, NULL, 36, 'confirmada',  9, 2, false, 'Patrícia Nunes',             'patricia.nunes@exemplo.com.br',     'levar',  'pix'),
  ( 99, 30, NULL, 19, 'confirmada',  3, 1, true,  'Daniel Ferraz',              'daniel.ferraz@exemplo.com.br',      'levar',  'pix'),
  --- Necessidade 31, pão francês (meta 120 kg), prazo em 2 dias
  (100, 31, NULL, 30, 'confirmada', 13, 2, false, 'Padaria Estrela d''Alva',    'padaria@estreladalva.exemplo.com.br','coleta','pix'),
  (101, 31, NULL, 13, 'confirmada',  4, 1, false, 'Larissa Monteiro',           'larissa.monteiro@exemplo.com.br',   'levar',  'pix'),
  (102, 31, NULL, 20, 'pendente',    1, 0, false, 'Padaria Estrela d''Alva',    'padaria@estreladalva.exemplo.com.br','coleta','pix'),
  --- Necessidade 32, gás da cozinha, dinheiro (meta 2.400)
  (103, 32,  800, NULL,'confirmada', 30, 2, false, 'Beatriz Camargo',           'beatriz.camargo@exemplo.com.br',    NULL, 'pix'),
  (104, 32,  600, NULL,'confirmada', 14, 3, true,  'Eduardo Bastos',            'eduardo.bastos@exemplo.com.br',     NULL, 'pix'),
  (105, 32,  350, NULL,'confirmada',  6, 1, false, 'Mariana Alves',             'mariana.alves@exemplo.com.br',      NULL, 'pix'),
  --- Necessidade 33, kit de higiene (meta 150)
  (106, 33, NULL, 40, 'confirmada', 25, 4, false, 'Distribuidora Bem Estar',    'comercial@bemestar.exemplo.com.br', 'coleta', 'pix'),
  (107, 33, NULL, 15, 'confirmada', 11, 2, true,  'Heloísa Brandão',            'heloisa.brandao@exemplo.com.br',    'levar',  'pix'),
  (108, 33, NULL,  9, 'confirmada',  3, 1, false, 'Otávio Bertolini',           'otavio.bertolini@exemplo.com.br',   'levar',  'pix'),
  (109, 33, NULL, 30, 'pendente',    2, 0, false, 'Distribuidora Bem Estar',    'comercial@bemestar.exemplo.com.br', 'coleta', 'pix'),
  --- Necessidade 35, conta de energia, dinheiro (meta 4.200): metade
  (112, 35, 1200, NULL,'confirmada', 28, 2, false, 'Associação Comercial de Barretos','contato@acbarretos.exemplo.com.br',NULL,'transferencia'),
  (113, 35,  600, NULL,'confirmada', 15, 3, true,  'Vanessa Tavares',           'vanessa.tavares@exemplo.com.br',    NULL, 'pix'),
  (114, 35,  300, NULL,'confirmada',  7, 1, false, 'Thiago Nogueira',           'thiago.nogueira@exemplo.com.br',    NULL, 'pix'),
  (115, 35,  250, NULL,'pendente',    1, 0, false, 'Juliana Sato',              'juliana.sato@exemplo.com.br',       NULL, 'pix'),
  --- Necessidade 36, reparo da van, dinheiro (meta 7.500)
  (116, 36, 1500, NULL,'confirmada', 34, 3, false, 'Auto Peças Barretos Diesel','vendas@barretosdiesel.exemplo.com.br',NULL,'transferencia'),
  (117, 36,  500, NULL,'confirmada', 19, 2, true,  'Carlos Eduardo Lima',       'carlos.lima@exemplo.com.br',        NULL, 'pix'),
  (118, 36,  300, NULL,'confirmada',  8, 2, false, 'Simone Delgado',            'simone.delgado@exemplo.com.br',     NULL, 'pix'),
  (119, 36,  400, NULL,'pendente',    5, 0, false, 'Gustavo Penha',             'gustavo.penha@exemplo.com.br',      NULL, 'pix'),
  --- Necessidade 37, cesta de frutas (meta 30): nada confirmado ainda,
  --- para a tela mostrar também o estado inicial de uma necessidade nova.
  (120, 37, NULL,  6, 'pendente',    2, 0, false, 'Hortifruti Vale Verde',      'pedidos@valeverde.exemplo.com.br',  'coleta', 'pix'),
  (121, 37, NULL,  4, 'cancelada',   9, 0, false, 'Renato Quirino',             'renato.quirino@exemplo.com.br',     'coleta', 'pix')
) AS v(n, nec, valor, quantidade, situacao, dias_atras, dias_para_confirmar,
       anonima, doador_nome, doador_email, entrega, forma_pagamento)
JOIN public.necessidades n
  ON n.id = ('de000003-0000-4000-8000-' || lpad(v.nec::text, 12, '0'))::uuid
JOIN public.projetos p ON p.id = n.id_projeto;


-- ─── 6. Doações em dinheiro direto para a ONG ───────────────────────────────
-- Caminho de `/doar/:ong`: sem projeto e sem necessidade. Não movem barra
-- nenhuma, mas entram no total arrecadado da ONG e na taxa de confirmação.
INSERT INTO public.doacoes (
  id, id_usuario, id_ong, id_projeto, id_necessidade,
  valor, quantidade, status, tipo_doacao,
  data_doacao, confirmada_em, doador_nome, doador_email, anonima
)
SELECT
  ('de000004-0000-4000-8000-' || lpad((900 + v.n)::text, 12, '0'))::uuid,
  NULL,
  ('de000001-0000-4000-8000-' || lpad(v.ong::text, 12, '0'))::uuid,
  NULL, NULL,
  v.valor, NULL, v.situacao, v.forma_pagamento,
  now() - make_interval(days => v.dias_atras, hours => (v.n % 9)),
  CASE WHEN v.situacao = 'confirmada'
       THEN now() - make_interval(days => v.dias_atras - v.dias_para_confirmar)
  END,
  v.doador_nome, v.doador_email, v.anonima
FROM (VALUES
  (1, 1,  200, 'confirmada',  9, 2, false, 'Mariana Alves',          'mariana.alves@exemplo.com.br',       'pix'),
  (2, 2,   80, 'confirmada',  6, 1, false, 'Gustavo Penha',          'gustavo.penha@exemplo.com.br',       'pix'),
  (3, 3, 1000, 'confirmada', 21, 1, true,  'Metalúrgica Campo Alto', 'financeiro@campoalto.exemplo.com.br','transferencia'),
  (4, 4,   60, 'cancelada',  10, 0, false, 'Eduardo Bastos',         'eduardo.bastos@exemplo.com.br',      'pix'),
  (5, 5,   50, 'confirmada',  4, 1, false, 'Renato Quirino',         'renato.quirino@exemplo.com.br',      'pix'),
  (6, 6,  120, 'pendente',    2, 0, false, 'Otávio Bertolini',       'otavio.bertolini@exemplo.com.br',    'pix'),
  (7, 7,  300, 'confirmada', 13, 2, true,  'Heloísa Brandão',        'heloisa.brandao@exemplo.com.br',     'boleto')
) AS v(n, ong, valor, situacao, dias_atras, dias_para_confirmar,
       anonima, doador_nome, doador_email, forma_pagamento);


-- ─── 7. Voluntariado ────────────────────────────────────────────────────────
-- `voluntariado.id_usuario` é NOT NULL e referencia `auth.users`. Este arquivo
-- não cria conta de autenticação, então não há como inventar voluntário: as
-- inscrições abaixo reaproveitam contas que JÁ existem no banco, distribuindo
-- cada uma pelos projetos de demonstração com status variado. Se o banco não
-- tiver nenhum usuário, o bloco não faz nada e avisa. Nunca falha.
-- Nenhum dado das contas é alterado: só se cria a linha de inscrição.
DO $$
DECLARE
  usuarios UUID[];
  projetos UUID[];
  inseridas INT := 0;
  i INT;
  j INT;
  situacao TEXT;
BEGIN
  SELECT array_agg(id) INTO usuarios
    FROM (SELECT id FROM auth.users ORDER BY created_at, id LIMIT 6) u;

  IF usuarios IS NULL OR array_length(usuarios, 1) = 0 THEN
    RAISE NOTICE 'Voluntariado: nenhum usuário em auth.users, nenhuma inscrição criada. Crie uma conta pelo app e rode o seed de novo.';
    RETURN;
  END IF;

  SELECT array_agg(id ORDER BY id) INTO projetos
    FROM public.projetos WHERE id::text LIKE 'de000002-%';

  FOR i IN 1..array_length(usuarios, 1) LOOP
    -- Cada usuário entra em 3 projetos diferentes, começando em pontos
    -- distintos da lista, para as telas de voluntários não ficarem iguais.
    FOR j IN 0..2 LOOP
      situacao := CASE (i + j) % 5
                    WHEN 0 THEN 'pendente'
                    WHEN 4 THEN 'rejeitado'
                    ELSE 'aprovado'
                  END;

      INSERT INTO public.voluntariado (id_projeto, id_usuario, data_inscricao, status)
      VALUES (
        projetos[1 + ((i * 3 + j) % array_length(projetos, 1))],
        usuarios[i],
        now() - make_interval(days => 5 * j + i),
        situacao
      )
      ON CONFLICT (id_projeto, id_usuario) DO NOTHING;

      inseridas := inseridas + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Voluntariado: % inscrições processadas para % usuário(s) existente(s).',
    inseridas, array_length(usuarios, 1);
END $$;


-- ─── 8. Conferência ─────────────────────────────────────────────────────────
-- Falha a transação inteira se a demonstração não tiver o que precisa mostrar.
-- Serve de teste do próprio seed: se o trigger de progresso parar de funcionar,
-- este bloco acusa antes de alguém abrir a tela.
DO $$
DECLARE
  qtd_ongs INT;
  qtd_projetos INT;
  qtd_necessidades INT;
  qtd_doacoes INT;
  metas_batidas INT;
  sem_progresso INT;
  agar_intacta BOOLEAN;
BEGIN
  SELECT count(*) INTO qtd_ongs FROM public.ongs WHERE id::text LIKE 'de000001-%';
  SELECT count(*) INTO qtd_projetos FROM public.projetos WHERE id::text LIKE 'de000002-%';
  SELECT count(*) INTO qtd_necessidades FROM public.necessidades WHERE id::text LIKE 'de000003-%';
  SELECT count(*) INTO qtd_doacoes FROM public.doacoes WHERE id::text LIKE 'de000004-%';

  SELECT count(*) INTO metas_batidas
    FROM public.necessidades WHERE id::text LIKE 'de000003-%' AND arrecadado >= meta;

  SELECT count(*) INTO sem_progresso
    FROM public.necessidades n
   WHERE n.id::text LIKE 'de000003-%'
     AND n.arrecadado = 0
     AND EXISTS (SELECT 1 FROM public.doacoes d
                  WHERE d.id_necessidade = n.id AND d.status = 'confirmada');

  IF qtd_ongs < 6 OR qtd_projetos < 10 OR qtd_necessidades < 25 THEN
    RAISE EXCEPTION 'Seed incompleto: % ONGs, % projetos, % necessidades.',
      qtd_ongs, qtd_projetos, qtd_necessidades;
  END IF;

  IF metas_batidas < 2 THEN
    RAISE EXCEPTION 'A demonstração precisa de pelo menos 2 metas batidas, encontrou %.', metas_batidas;
  END IF;

  IF sem_progresso > 0 THEN
    RAISE EXCEPTION 'O trigger de progresso não somou % necessidade(s) com doação confirmada.', sem_progresso;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.ongs WHERE slug = 'sitio-agar') INTO agar_intacta;

  RAISE NOTICE 'Demonstração: % ONGs, % projetos, % necessidades, % doações, % metas batidas.',
    qtd_ongs, qtd_projetos, qtd_necessidades, qtd_doacoes, metas_batidas;
  RAISE NOTICE 'ONG real (sitio-agar) presente no banco: %.', agar_intacta;
END $$;

COMMIT;
