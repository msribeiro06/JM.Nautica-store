// src/middleware/validacao.js
// Validação de dados das rotas usando schemas simples (sem dependência externa)
// Valida tipo, tamanho e formato dos campos antes de chegar no controller

function validarCriarProduto(req, res, next) {
  const erros = [];
  const { nome, preco, estoque, categoria_id, imagem_principal } = req.body;

  if (!nome || typeof nome !== 'string' || nome.trim().length < 2)
    erros.push('Nome é obrigatório e deve ter ao menos 2 caracteres.');

  if (nome && nome.trim().length > 200)
    erros.push('Nome deve ter no máximo 200 caracteres.');

  if (preco !== undefined && (isNaN(parseFloat(preco)) || parseFloat(preco) < 0))
    erros.push('Preço deve ser um número positivo.');

  if (estoque !== undefined && (isNaN(parseInt(estoque)) || parseInt(estoque) < 0))
    erros.push('Estoque deve ser um número inteiro positivo.');

  if (!categoria_id || isNaN(parseInt(categoria_id)))
    erros.push('Categoria é obrigatória.');

  if (imagem_principal && typeof imagem_principal === 'string') {
    const url = imagem_principal.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
      erros.push('URL da imagem inválida.');
  }

  if (erros.length > 0)
    return res.status(400).json({ erro: erros[0], erros });

  next();
}

function validarAtualizarProduto(req, res, next) {
  const erros = [];
  const { nome, preco, estoque, imagem_principal } = req.body;

  if (nome !== undefined) {
    if (typeof nome !== 'string' || nome.trim().length < 2)
      erros.push('Nome deve ter ao menos 2 caracteres.');
    if (nome.trim().length > 200)
      erros.push('Nome deve ter no máximo 200 caracteres.');
  }

  if (preco !== undefined && (isNaN(parseFloat(preco)) || parseFloat(preco) < 0))
    erros.push('Preço deve ser um número positivo.');

  if (estoque !== undefined && (isNaN(parseInt(estoque)) || parseInt(estoque) < 0))
    erros.push('Estoque deve ser um número inteiro positivo.');

  if (imagem_principal && typeof imagem_principal === 'string') {
    const url = imagem_principal.trim();
    if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/'))
      erros.push('URL da imagem inválida.');
  }

  if (erros.length > 0)
    return res.status(400).json({ erro: erros[0], erros });

  next();
}

function validarLogin(req, res, next) {
  const erros = [];
  const { email, senha } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@'))
    erros.push('E-mail inválido.');

  if (!senha || typeof senha !== 'string' || senha.length < 4)
    erros.push('Senha inválida.');

  if (erros.length > 0)
    return res.status(400).json({ erro: erros[0], erros });

  // Sanitiza o email
  req.body.email = email.trim().toLowerCase();
  next();
}

// Middleware para validar IDs numéricos nas rotas
function validarId(req, res, next) {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0)
    return res.status(400).json({ erro: 'ID inválido.' });
  req.params.id = id;
  next();
}

module.exports = { validarCriarProduto, validarAtualizarProduto, validarLogin, validarId };
