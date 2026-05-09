// reset-admin.js — rode com: node reset-admin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/db');

async function resetar() {
  const novaSenha = process.env.ADMIN_SENHA_INICIAL || 'admin123';
  const hash = await bcrypt.hash(novaSenha, 12);

  const { rowCount } = await query(
    `UPDATE usuarios SET senha_hash = $1 WHERE email = $2`,
    [hash, process.env.ADMIN_EMAIL || 'admin@nautica.com']
  );

  if (rowCount > 0) {
    console.log(`✅ Senha atualizada com sucesso!`);
    console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
    console.log(`   Senha: ${novaSenha}`);
  } else {
    console.log('❌ Usuário não encontrado.');
  }
  process.exit(0);
}

resetar().catch(err => { console.error(err.message); process.exit(1); });
