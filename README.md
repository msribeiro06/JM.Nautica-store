# ⚓ JM Náutica Store

Loja de peças náuticas novas e seminovas com catálogo online, painel administrativo e integração com WhatsApp.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat&logo=express&logoColor=white)
![Deploy](https://img.shields.io/badge/Deploy-Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

---

## Funcionalidades

- Catálogo de produtos com filtros por categoria e busca
- Página de detalhes com galeria de imagens
- Botão de WhatsApp com mensagem pré-preenchida
- Painel administrativo com CRUD completo de produtos
- Autenticação JWT para o painel
- API REST com PostgreSQL

## Stack

| Camada     | Tecnologia                        |
|------------|-----------------------------------|
| Backend    | Node.js + Express                 |
| Banco      | PostgreSQL (SQL puro — sem ORM)   |
| Auth       | JWT + bcryptjs                    |
| Segurança  | Helmet + Rate Limit + CORS        |
| Frontend   | HTML + CSS + JS vanilla           |
| Deploy     | Railway                           |

## Estrutura do projeto

```
nautica-store/
├── server.js               # Ponto de entrada
├── railway.toml            # Configuração de deploy
├── .env.example            # Modelo de variáveis
├── public/
│   └── index.html          # Frontend da loja
└── src/
    ├── config/db.js        # Pool de conexão PostgreSQL
    ├── db/
    │   ├── schema.sql      # Criação das tabelas
    │   └── seed.js         # Migração de dados iniciais
    ├── middleware/
    │   └── auth.js         # Verificação JWT
    └── routes/
        ├── auth.js         # Login / logout / me
        └── produtos.js     # CRUD de produtos
```

## Rodando localmente

**Pré-requisitos:** Node.js 18+, PostgreSQL 14+

```bash
# 1. Clonar o repositório
git clone https://github.com/msribeiro06/JM.Nautica-store.git
cd JM.Nautica-store

# 2. Instalar dependências
npm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais

# 4. Criar banco de dados
createdb nautica_store

# 5. Executar o schema (cria as tabelas)
psql -d nautica_store -f src/db/schema.sql

# 6. Migrar dados iniciais
node src/db/seed.js

# 7. Iniciar em modo desenvolvimento
npm run dev
```

Acesse: http://localhost:3000

## API — Endpoints

### Público
| Método | Rota | Descrição |
|--------|------|-----------|
| `GET`  | `/api/produtos` | Lista produtos (filtros: `?categoria=`, `?busca=`, `?pagina=`, `?limite=`) |
| `GET`  | `/api/produtos/:id` | Detalhe de um produto |
| `POST` | `/api/produtos/:id/click` | Registra clique no WhatsApp |
| `POST` | `/api/auth/login` | Autenticação |

### Privado (requer Bearer Token)
| Método   | Rota | Descrição |
|----------|------|-----------|
| `GET`    | `/api/auth/me` | Dados do usuário logado |
| `POST`   | `/api/produtos` | Criar produto |
| `PUT`    | `/api/produtos/:id` | Atualizar produto |
| `DELETE` | `/api/produtos/:id` | Remover produto (soft delete) |

## Variáveis de ambiente

Veja o arquivo `.env.example` para a lista completa.

## Deploy no Railway

1. Conecte o repositório no [Railway](https://railway.app)
2. Adicione um serviço PostgreSQL
3. Configure as variáveis de ambiente (copie do `.env.example`)
4. O deploy é automático a cada push na `main`

---

Desenvolvido por [@msribeiro06](https://github.com/msribeiro06)
