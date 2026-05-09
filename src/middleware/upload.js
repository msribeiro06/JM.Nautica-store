// src/middleware/upload.js
// Upload de imagens para o Cloudinary
// Instale: npm install cloudinary multer multer-storage-cloudinary

const multer     = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configura o Cloudinary com as variáveis do .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage: envia direto para o Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'nautica-store',          // pasta no Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },  // máx 1200x900
      { quality: 'auto:good' },                      // comprime automaticamente
      { fetch_format: 'auto' },                      // WebP quando suportado
    ],
    public_id: `produto_${Date.now()}`,
  }),
});

// Filtro: só imagens
const fileFilter = (req, file, cb) => {
  const tipos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (tipos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato inválido. Use JPG, PNG ou WebP.'), false);
  }
};

// Exporta o middleware de upload
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
});

// Função helper para deletar imagem do Cloudinary
async function deletarImagem(url) {
  try {
    if (!url || !url.includes('cloudinary')) return;
    // Extrai o public_id da URL
    const partes   = url.split('/');
    const arquivo  = partes[partes.length - 1].split('.')[0];
    const pasta    = partes[partes.length - 2];
    const publicId = `${pasta}/${arquivo}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('[UPLOAD] Erro ao deletar imagem:', err.message);
  }
}

module.exports = { upload, deletarImagem };
