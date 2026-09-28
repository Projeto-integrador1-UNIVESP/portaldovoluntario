-- P5: nenhuma das 10 migrations anteriores criou um único índice. Tudo que
-- existe hoje são os implícitos de PK e UNIQUE, e toda consulta do app filtra
-- por colunas sem índice.

CREATE INDEX IF NOT EXISTS projetos_status_ong_idx ON public.projetos (status, id_ong);
CREATE INDEX IF NOT EXISTS projetos_cidade_idx     ON public.projetos (cidade) WHERE cidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS projetos_causa_idx      ON public.projetos (causa) WHERE causa IS NOT NULL;

CREATE INDEX IF NOT EXISTS ongs_status_idx ON public.ongs (status);

CREATE INDEX IF NOT EXISTS necessidades_projeto_idx  ON public.necessidades (id_projeto, status);
CREATE INDEX IF NOT EXISTS necessidades_urgencia_idx ON public.necessidades (urgencia DESC, prazo)
  WHERE status = true;

CREATE INDEX IF NOT EXISTS doacoes_projeto_status_idx ON public.doacoes (id_projeto, status);
CREATE INDEX IF NOT EXISTS doacoes_necessidade_idx    ON public.doacoes (id_necessidade)
  WHERE id_necessidade IS NOT NULL;
CREATE INDEX IF NOT EXISTS doacoes_ong_data_idx       ON public.doacoes (id_ong, data_doacao DESC);
CREATE INDEX IF NOT EXISTS doacoes_usuario_idx        ON public.doacoes (id_usuario)
  WHERE id_usuario IS NOT NULL;

-- Usados pelas policies que checam vínculo de voluntariado e de membro.
CREATE INDEX IF NOT EXISTS voluntariado_usuario_idx       ON public.voluntariado (id_usuario);
CREATE INDEX IF NOT EXISTS voluntariado_projeto_status_idx ON public.voluntariado (id_projeto, status);
CREATE INDEX IF NOT EXISTS usuarios_ong_usuario_idx       ON public.usuarios_ong (id_usuario, status);
CREATE INDEX IF NOT EXISTS usuarios_ong_ong_idx           ON public.usuarios_ong (id_ong, status);

CREATE INDEX IF NOT EXISTS user_roles_user_idx ON public.user_roles (user_id);
