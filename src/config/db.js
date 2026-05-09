// src/config/db.js
// Conexão com PostgreSQL via pool — reutiliza conexões abertas
// para não abrir uma nova a cada requisição.

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'nautica_store',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:      10,           // máximo de conexões simultâneas no pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

// Testa a conexão ao iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('[DB] Erro ao conectar ao PostgreSQL:', err.message);
    process.exit(1);
  }
  release();
  console.log('[DB] PostgreSQL conectado com sucesso!');
});

// Helper: executa uma query e retorna as linhas
// Uso: const rows = await query('SELECT * FROM produtos WHERE id = $1', [id])
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] query(${duration}ms):`, text.substring(0, 80));
    return result;
  } catch (error) {
    console.error('[DB] Erro na query:', error.message);
    throw error;
  }
}

// Helper: executa múltiplas queries em uma transação
// Uso: await transaction(async (client) => { await client.query(...) })
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { query, transaction, pool };
