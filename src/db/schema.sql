-- ============================================================
-- NAUTICA STORE — Schema do banco de dados
-- Execute: psql -d nautica_store -f schema.sql
-- ============================================================

-- Extensão para gerar UUIDs (caso queira migrar de int para uuid futuramente)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100)        NOT NULL,
  email       VARCHAR(150)        UNIQUE NOT NULL,
  senha_hash  TEXT                NOT NULL,
  role        VARCHAR(20)         NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  ativo       BOOLEAN             NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABELA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id    SERIAL PRIMARY KEY,
  slug  VARCHAR(50) UNIQUE NOT NULL,  -- ex: "seminovo", "novo"
  nome  VARCHAR(100)        NOT NULL   -- ex: "Seminovo", "Novo"
);

INSERT INTO categorias (slug, nome) VALUES
  ('novo',     'Novo'),
  ('seminovo', 'Seminovo')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- TABELA: produtos
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id                SERIAL PRIMARY KEY,
  nome              VARCHAR(200)       NOT NULL,
  descricao         TEXT               DEFAULT '',
  preco             NUMERIC(10, 2)     DEFAULT 0,          -- 0 = "Consultar preço"
  consultar_preco   BOOLEAN            NOT NULL DEFAULT FALSE,
  estoque           INTEGER            NOT NULL DEFAULT 1 CHECK (estoque >= 0),
  categoria_id      INTEGER            REFERENCES categorias(id) ON DELETE SET NULL,
  imagem_principal  TEXT               DEFAULT '',
  whatsapp_clicks   INTEGER            NOT NULL DEFAULT 0,
  ativo             BOOLEAN            NOT NULL DEFAULT TRUE,
  criado_em         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_produtos_categoria  ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo       ON produtos(ativo);
CREATE INDEX IF NOT EXISTS idx_produtos_nome        ON produtos USING GIN (to_tsvector('portuguese', nome));

-- ============================================================
-- TABELA: produto_imagens (galeria de fotos por produto)
-- ============================================================
CREATE TABLE IF NOT EXISTS produto_imagens (
  id          SERIAL PRIMARY KEY,
  produto_id  INTEGER NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  url         TEXT    NOT NULL,
  ordem       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_produto_imagens_produto ON produto_imagens(produto_id);

-- ============================================================
-- FUNÇÃO: atualiza campo "atualizado_em" automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_produtos_updated
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE OR REPLACE TRIGGER trg_usuarios_updated
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
