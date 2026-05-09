// server.js — ponto de entrada da aplicação

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const compression  = require('compression');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

// Rotas da API
const rotasProdutos = require('./src/routes/produtos');
const rotasAuth     = require('./src/routes/auth');
const rotasUpload = require('./src/routes/upload');
const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Segurança ───────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc:        ["'self'", 'data:', 'https:'],
      connectSrc:    ["'self'"],
    },
  },
}));

// ─── Performance ─────────────────────────────────────────────────
app.use(compression());

// ─── Logs ────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── Body parsing ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate limiting ───────────────────────────────────────────────
// Limite global
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { erro: 'Muitas requisições. Tente novamente em alguns minutos.' },
}));

// Limite mais rígido para login (anti força-bruta)
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' },
}));

// ─── Arquivos estáticos ──────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/painel', express.static(path.join(__dirname, 'painel')));

// Rota de entrada do painel
app.get('/painel', (req, res) => {
  res.sendFile(path.join(__dirname, 'painel', 'login.html'));
});

// ─── Rotas da API ────────────────────────────────────────────────
app.use('/api/auth',     rotasAuth);
app.use('/api/produtos', rotasProdutos);
app.use('/api/upload',   rotasUpload);

// ─── Config pública (WhatsApp, nome da loja) ─────────────────────
app.get('/api/config', (req, res) => {
  res.json({
    whatsapp:  process.env.WHATSAPP_NUMERO || '5592999999999',
    nome_loja: 'JM Náutica Store',
  });
});

// ─── Healthcheck ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Página individual de produto ────────────────────────────────
app.get('/produto/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'produto.html'));
});

// ─── 404 personalizado ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// ─── Error handler global ────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[SERVER] Erro não tratado:', err.message);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

// ─── Inicia o servidor ───────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Nautica Store rodando em http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}\n`);
});
