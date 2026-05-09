// src/routes/auth.js
// POST /api/auth/login   — faz login e retorna JWT
// POST /api/auth/logout  — invalida o token (client-side)
// GET  /api/auth/me      — retorna dados do usuário logado

const express  = require('express');
const bcrypt   = require('bcryptjs');
const { query }          = require('../config/db');
const { autenticar, gerarToken } = require('../middleware/auth');

const router = express.Router();

// ─── POST /api/auth/login ────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validação básica de input
    if (!email || !senha) {
      return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });
    }

    // Busca o usuário no banco pelo e-mail
    const { rows } = await query(
      'SELECT id, nome, email, senha_hash, role, ativo FROM usuarios WHERE email = $1',
      [email.trim().toLowerCase()]
    );

    const usuario = rows[0];

    // Não revela se o e-mail existe ou não (segurança)
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    // Compara a senha com o hash armazenado
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    // Gera e retorna o token
    const token = gerarToken(usuario);

    return res.json({
      token,
      usuario: {
        id:    usuario.id,
        nome:  usuario.nome,
        email: usuario.email,
        role:  usuario.role,
      },
    });
  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// ─── POST /api/auth/logout ───────────────────────────────────────
// Com JWT stateless, o logout é feito no cliente (descarta o token).
// Esta rota existe apenas para padronizar o fluxo no frontend.
router.post('/logout', autenticar, (req, res) => {
  return res.json({ mensagem: 'Logout realizado com sucesso.' });
});

// ─── GET /api/auth/me ────────────────────────────────────────────
router.get('/me', autenticar, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, nome, email, role, criado_em FROM usuarios WHERE id = $1',
      [req.usuario.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ erro: 'Usuário não encontrado.' });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error('[AUTH] Erro no /me:', err.message);
    return res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
