// src/routes/upload.js
// POST /api/upload/imagem — faz upload de uma imagem e retorna a URL do Cloudinary
// Requer autenticação JWT

const express  = require('express');
const { upload }     = require('../middleware/upload');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// POST /api/upload/imagem
router.post('/imagem', autenticar, upload.single('imagem'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ erro: 'Nenhuma imagem enviada.' });
    }

    // O Cloudinary retorna a URL pública em req.file.path
    return res.json({
      url:       req.file.path,
      public_id: req.file.filename,
      mensagem:  'Imagem enviada com sucesso.',
    });
  } catch (err) {
    console.error('[UPLOAD] Erro:', err.message);
    return res.status(500).json({ erro: err.message || 'Erro ao fazer upload.' });
  }
});

module.exports = router;
