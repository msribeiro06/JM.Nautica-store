// src/db/seed.js
// Migra os dados do produtos.json para o PostgreSQL
// Execute: node src/db/seed.js
//
// Pré-requisito: banco criado e schema.sql já executado
// Pré-requisito: .env configurado com as variáveis do banco

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/db');

// Caminho do arquivo legado
const PRODUTOS_JSON = path.join(__dirname, '../../produtos.json');

async function seed() {
  console.log('🌱 Iniciando migração...\n');

  // ─── 1. Cria usuário admin padrão ──────────────────────────────
  const senhaHash = await bcrypt.hash(
    process.env.ADMIN_SENHA_INICIAL || 'admin123',
    12
  );

  await query(`
    INSERT INTO usuarios (nome, email, senha_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (email) DO NOTHING
  `, ['Administrador', process.env.ADMIN_EMAIL || 'admin@nautica.com', senhaHash, 'super_admin']);

  console.log('✅ Usuário admin criado (ou já existia)');

  // ─── 2. Migra produtos do JSON ─────────────────────────────────
  if (!fs.existsSync(PRODUTOS_JSON)) {
    console.log('⚠️  produtos.json não encontrado. Pulando migração de produtos.');
    return;
  }

  const produtos = JSON.parse(fs.readFileSync(PRODUTOS_JSON, 'utf-8'));
  console.log(`📦 Migrando ${produtos.length} produtos...\n`);

  // Busca ids das categorias
  const { rows: categorias } = await query('SELECT id, slug FROM categorias');
  const catMap = Object.fromEntries(categorias.map(c => [c.slug, c.id]));

  let sucesso = 0;
  let falha   = 0;

  for (const p of produtos) {
    try {
      await transaction(async (client) => {
        const categoriaId = catMap[p.categoria] ?? catMap['seminovo'];
        const consultarPreco = !p.preco || p.preco === 0;

        // Insere o produto
        const { rows } = await client.query(`
          INSERT INTO produtos
            (nome, descricao, preco, consultar_preco, estoque, categoria_id, imagem_principal, whatsapp_clicks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          p.nome,
          p.descricao || '',
          p.preco || 0,
          consultarPreco,
          p.estoque ?? 1,
          categoriaId,
          p.imagem || '',
          p.whatsappClicks || 0,
        ]);

        const produtoId = rows[0].id;

        // Insere imagens extras (galeria)
        if (Array.isArray(p.imagens) && p.imagens.length > 0) {
          for (let i = 0; i < p.imagens.length; i++) {
            await client.query(`
              INSERT INTO produto_imagens (produto_id, url, ordem)
              VALUES ($1, $2, $3)
            `, [produtoId, p.imagens[i], i]);
          }
        }
      });

      console.log(`  ✅ [${p.id}] ${p.nome}`);
      sucesso++;
    } catch (err) {
      console.error(`  ❌ [${p.id}] ${p.nome} — ${err.message}`);
      falha++;
    }
  }

  console.log(`\n🎉 Migração concluída! ${sucesso} produtos migrados, ${falha} falhas.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
