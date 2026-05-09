// src/routes/produtos.js
//
// Rotas públicas (sem login):
//   GET  /api/produtos          — lista produtos com filtros e paginação
//   GET  /api/produtos/:id      — detalhe de um produto
//   POST /api/produtos/:id/click — registra clique no WhatsApp
//
// Rotas privadas (requer token JWT):
//   POST   /api/produtos         — cria produto
//   PUT    /api/produtos/:id     — atualiza produto
//   DELETE /api/produtos/:id     — remove produto

const express = require('express');
const { query, transaction } = require('../config/db');
const { autenticar }         = require('../middleware/auth');
const { validarCriarProduto, validarAtualizarProduto, validarId } = require('../middleware/validacao');
const router = express.Router();

// ─── GET /api/produtos ───────────────────────────────────────────
// Query params opcionais:
//   ?categoria=novo|seminovo
//   ?busca=yamaha
//   ?pagina=1&limite=12
//   ?ativo=true (admin)
router.get('/', async (req, res) => {
  try {
    const pagina  = Math.max(1, parseInt(req.query.pagina)  || 1);
    const limite  = Math.min(50, parseInt(req.query.limite) || 12);
    const offset  = (pagina - 1) * limite;

    // Monta o WHERE dinamicamente com parâmetros
    const condicoes = ['p.ativo = TRUE'];
    const params    = [];

    if (req.query.categoria) {
      params.push(req.query.categoria);
      condicoes.push(`c.slug = $${params.length}`);
    }

    if (req.query.busca) {
      params.push(`%${req.query.busca}%`);
      condicoes.push(`p.nome ILIKE $${params.length}`);
    }

    const where = condicoes.length ? 'WHERE ' + condicoes.join(' AND ') : '';

    // Query principal com JOIN na tabela de categorias
    const sql = `
      SELECT
        p.id,
        p.nome,
        p.descricao,
        p.preco,
        p.consultar_preco,
        p.estoque,
        p.imagem_principal,
        p.whatsapp_clicks,
        p.criado_em,
        c.slug  AS categoria_slug,
        c.nome  AS categoria_nome,
        -- Array de imagens da galeria
        COALESCE(
          json_agg(pi.url ORDER BY pi.ordem) FILTER (WHERE pi.url IS NOT NULL),
          '[]'
        ) AS imagens
      FROM produtos p
      LEFT JOIN categorias c        ON c.id = p.categoria_id
      LEFT JOIN produto_imagens pi  ON pi.produto_id = p.id
      ${where}
      GROUP BY p.id, c.slug, c.nome
      ORDER BY p.criado_em DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limite, offset);
    const { rows: produtos } = await query(sql, params);

    // Conta o total para paginação (mesma query sem LIMIT)
    const sqlTotal = `
      SELECT COUNT(DISTINCT p.id) AS total
      FROM produtos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      ${where}
    `;
    const { rows: totais } = await query(sqlTotal, params.slice(0, -2));
    const total   = parseInt(totais[0].total);
    const paginas = Math.ceil(total / limite);

    return res.json({
      dados: produtos,
      paginacao: { pagina, limite, total, paginas },
    });
  } catch (err) {
    console.error('[PRODUTOS] Erro ao listar:', err.message);
    return res.status(500).json({ erro: 'Erro ao buscar produtos.' });
  }
});

// ─── GET /api/produtos/:id ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(`
      SELECT
        p.*,
        c.slug AS categoria_slug,
        c.nome AS categoria_nome,
        COALESCE(
          json_agg(
            json_build_object('url', pi.url, 'ordem', pi.ordem)
            ORDER BY pi.ordem
          ) FILTER (WHERE pi.url IS NOT NULL),
          '[]'
        ) AS imagens
      FROM produtos p
      LEFT JOIN categorias c       ON c.id = p.categoria_id
      LEFT JOIN produto_imagens pi ON pi.produto_id = p.id
      WHERE p.id = $1 AND p.ativo = TRUE
      GROUP BY p.id, c.slug, c.nome
    `, [id]);

    if (!rows[0]) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('[PRODUTOS] Erro ao buscar produto:', err.message);
    return res.status(500).json({ erro: 'Erro ao buscar produto.' });
  }
});

// ─── POST /api/produtos/:id/click ────────────────────────────────
// Rota pública — registra clique no botão de WhatsApp
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      'UPDATE produtos SET whatsapp_clicks = whatsapp_clicks + 1 WHERE id = $1',
      [id]
    );
    return res.json({ mensagem: 'Clique registrado.' });
  } catch (err) {
    console.error('[PRODUTOS] Erro ao registrar clique:', err.message);
    return res.status(500).json({ erro: 'Erro ao registrar clique.' });
  }
});

// ─── POST /api/produtos ──────────────────────────────────────────
// Rota privada — cria um novo produto
router.post('/', autenticar, validarCriarProduto, async (req, res) => {
  try {
    const {
      nome,
      descricao     = '',
      preco         = 0,
      consultar_preco = true,
      estoque       = 1,
      categoria_id,
      imagem_principal = '',
      imagens       = [],
    } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: 'O nome do produto é obrigatório.' });
    }

    if (!categoria_id) {
      return res.status(400).json({ erro: 'A categoria é obrigatória.' });
    }

    const produto = await transaction(async (client) => {
      // Insere o produto
      const { rows } = await client.query(`
        INSERT INTO produtos
          (nome, descricao, preco, consultar_preco, estoque, categoria_id, imagem_principal)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        nome.trim(),
        descricao,
        parseFloat(preco) || 0,
        Boolean(consultar_preco),
        parseInt(estoque) || 1,
        categoria_id,
        imagem_principal,
      ]);

      const novoProduto = rows[0];

      // Insere as imagens da galeria
      for (let i = 0; i < imagens.length; i++) {
        if (imagens[i]) {
          await client.query(
            'INSERT INTO produto_imagens (produto_id, url, ordem) VALUES ($1, $2, $3)',
            [novoProduto.id, imagens[i], i]
          );
        }
      }

      return novoProduto;
    });

    return res.status(201).json(produto);
  } catch (err) {
    console.error('[PRODUTOS] Erro ao criar:', err.message);
    return res.status(500).json({ erro: 'Erro ao criar produto.' });
  }
});

// ─── PUT /api/produtos/:id ───────────────────────────────────────
// Rota privada — atualiza um produto existente
router.put('/:id', autenticar, validarAtualizarProduto, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      descricao,
      preco,
      consultar_preco,
      estoque,
      categoria_id,
      imagem_principal,
      imagens,
    } = req.body;

    const produto = await transaction(async (client) => {
      // Verifica se existe
      const { rows: check } = await client.query(
        'SELECT id FROM produtos WHERE id = $1 AND ativo = TRUE',
        [id]
      );
      if (!check[0]) return null;

      // Atualiza (só os campos enviados)
      const { rows } = await client.query(`
        UPDATE produtos SET
          nome             = COALESCE($1, nome),
          descricao        = COALESCE($2, descricao),
          preco            = COALESCE($3, preco),
          consultar_preco  = COALESCE($4, consultar_preco),
          estoque          = COALESCE($5, estoque),
          categoria_id     = COALESCE($6, categoria_id),
          imagem_principal = COALESCE($7, imagem_principal)
        WHERE id = $8
        RETURNING *
      `, [
        nome?.trim()         ?? null,
        descricao            ?? null,
        preco != null ? parseFloat(preco) : null,
        consultar_preco != null ? Boolean(consultar_preco) : null,
        estoque != null ? parseInt(estoque) : null,
        categoria_id         ?? null,
        imagem_principal     ?? null,
        id,
      ]);

      // Se enviou novas imagens, substitui a galeria
      if (Array.isArray(imagens)) {
        await client.query('DELETE FROM produto_imagens WHERE produto_id = $1', [id]);
        for (let i = 0; i < imagens.length; i++) {
          if (imagens[i]) {
            await client.query(
              'INSERT INTO produto_imagens (produto_id, url, ordem) VALUES ($1, $2, $3)',
              [id, imagens[i], i]
            );
          }
        }
      }

      return rows[0];
    });

    if (!produto) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.json(produto);
  } catch (err) {
    console.error('[PRODUTOS] Erro ao atualizar:', err.message);
    return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
  }
});

// ─── DELETE /api/produtos/:id ────────────────────────────────────
// Rota privada — soft delete (não apaga do banco, só marca como inativo)
router.delete('/:id', autenticar, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'UPDATE produtos SET ativo = FALSE WHERE id = $1 AND ativo = TRUE RETURNING id',
      [id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.json({ mensagem: 'Produto removido com sucesso.' });
  } catch (err) {
    console.error('[PRODUTOS] Erro ao deletar:', err.message);
    return res.status(500).json({ erro: 'Erro ao remover produto.' });
  }
});

module.exports = router;
