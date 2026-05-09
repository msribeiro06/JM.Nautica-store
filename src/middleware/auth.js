// src/middleware/auth.js
// Verifica o JWT enviado no header Authorization: Bearer <token>
// e injeta os dados do usuário em req.usuario

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('[AUTH] JWT_SECRET não definido no .env — abortando.');
  process.exit(1);
}

// Middleware principal — protege rotas privadas
function autenticar(req, res, next) {
  const header = req.headers['authorization'];

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.usuario = payload;   // { id, nome, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ erro: 'Token inválido.' });
  }
}

// Middleware extra — garante que só super_admin acessa
function apenasAdmin(req, res, next) {
  if (!req.usuario || req.usuario.role !== 'super_admin') {
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  }
  next();
}

// Gera um token JWT com validade de 8 horas
function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

module.exports = { autenticar, apenasAdmin, gerarToken };
